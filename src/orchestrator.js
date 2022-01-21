//@ts-check
import sh from "shelljs";
import marge from "mochawesome-report-generator";
import { merge } from "mochawesome-merge";
import fs from "fs";
import arg from "arg";
import path from "path";
import { analyseReport } from "./analyseReport";
import {
  checkFileIsExisting,
  parseJsonFile,
  orderBasedOnBrowserDuration,
} from "./helper.js";
import * as lg from "./logger";
import { checkRequirements  } from "./checker";


const executionTimeReportDir = "executionTimeReprot";
const executionTimeReportDirPath = path.resolve(process.cwd(), executionTimeReportDir)
const executiontimeReportJson = "specsExecutionTime.json"
const executiontimeReportJsonPath = path.join(executionTimeReportDirPath, executiontimeReportJson)

function execa(command, flag = true) {
  return new Promise((resolve, reject) =>
    sh.exec(command, function (code, stdout, stderr) {
      if (code != 0) {
        if (
          flag &&
          stdout
            .concat(stderr)
            .toLowerCase()
            .includes("cypress failed to make a connection to firefox")
        ) {
          let oldContName = command.split("--name ")[1].split(" ")[0];
          let newContName = `${oldContName}_${Math.floor(
            Math.random() * 100000
          )}`;
          let cmd = command.replace(oldContName, newContName);
          setTimeout(() => execa(cmd, false), 1000);
        } else {
          return reject(code);
        }
      } else {
        return resolve(code);
      }
    })
  );
}

function parseArgumentsIntoConfig(rawArgs) {
  const args = arg(
    {
      "--config": String,
      "-c": "--config",
    },
    {
      argv: rawArgs.slice(2),
      permissive: true,
    }
  );
  let result = {};
  for (let i = 0; i < args["_"].length; i += 2) {
    let key = args["_"][i].replace("--", "");
    let variable = args["_"][i + 1];
    if (variable.includes("{")) {
      variable = JSON.parse(variable);
    } else if (variable.includes("[")) {
      variable = variable
        .replace("[", "")
        .replace("]", "")
        .replace(", ", ",")
        .replace(/"|'/g, "")
        .split(",");
    }
    result[key] = variable;
  }
  return { ...result, ...args };
}

function overWriteConfig(args) {
  lg.step('Overwrite the config file with the arguments if there is any', true);
  const configFile = args["--config"] || path.resolve(__dirname, "config.json");
  const defaultConfig = JSON.parse(fs.readFileSync(configFile, "utf-8"));
  const config = { ...defaultConfig, ...args };
  return config;
}

function setEnvVars(config) {
  lg.step("Export the environment variables");
  Object.keys(config.environment).forEach((key) => {
    let value = config.environment[key];
    sh.env[key] = value;
    lg.subStep(`${key}=${value}`);
  });
}

function execPreCommands(config) {
  lg.step("Execute the pre commands", true);
  config.preCommands.forEach((command) => {
    lg.subStep(`~$ ${command}`);
    sh.exec(command);
  });
}

function getListOfSpecs(config, browser) {
  let existingSpecs = [];

  if (config.specs.length > 0) {
    existingSpecs = [...config.specs];
  } else {
    existingSpecs = sh.ls('-R', config.specsHomePath).filter((val) => val.match(/.*ts|js/));
  }

  if (checkFileIsExisting(executiontimeReportJsonPath)) {
    let specsExecutionTime = parseJsonFile(executiontimeReportJsonPath);
    let browserSpecs = orderBasedOnBrowserDuration(
      specsExecutionTime,
      browser
    ).map((item) => item.specName);

    let specs = browserSpecs.filter((spec) => existingSpecs.includes(spec));
    specs = [
      ...specs,
      ...existingSpecs.filter((item) => !specs.includes(item)),
    ];

    return specs;
  } else {
    return existingSpecs;
  }
}

function removeEmpty(arrays) {
  let results = [];
  arrays.forEach((array) => {
    if (array.length > 0) results.push(array.filter((item) => item !== ""));
  });
  return results;
}

function splitSpecsOverMachines(specs, config) {
  let noOfMachines = config.parallelizm * config.browsers.length;
  let specsForMachines = [];

  for (let i = 0; i < noOfMachines; i++) {
    specsForMachines.push([]); // [ [], [], [] ..]
  }

  let _cycles = 0;
  while (specs.length > 0) {
    for (let i = 0; i < noOfMachines; i++) {
      if (specs.length == 0) break;
      _cycles % 2
        ? specsForMachines[i].push(specs.pop())
        : specsForMachines[i].push(specs.shift());
    }
    _cycles++;
  }

  return removeEmpty(specsForMachines);
}

function genearateSpecsCommandsForMachines(config, browser) {
  let specsCommandsOverMachines = [];

  let specs = getListOfSpecs(config, browser);
  let listOfSpecsOverMachines = splitSpecsOverMachines(specs, config);

  listOfSpecsOverMachines.forEach((listOfspecsPerMachine) => {
    let result = "";
    listOfspecsPerMachine.forEach((spec) => {
      let specPath = path.join(config.specsDockerPath, spec);
      result = `${result},${specPath}`;
    });
    specsCommandsOverMachines.push(result.slice(1));
  });

  return specsCommandsOverMachines;
}

function generateSpecsCommandsOverMachinesOrederedByBrowsers(config) {
  let specsCommandsOverMachinesOrederedByBrowsers = {}; // {'chrome': [ [] , [] , []], 'firefox': [[], [], []]}

  config.browsers.forEach((browser) => {
    specsCommandsOverMachinesOrederedByBrowsers[browser] =
      genearateSpecsCommandsForMachines(config, browser);
  });

  return specsCommandsOverMachinesOrederedByBrowsers;
}

function _constructCypressCommands(config) {
  let bashCommands = [];
  let specsCommandsOverMachinesOrederedByBrowsers =
    generateSpecsCommandsOverMachinesOrederedByBrowsers(config);
  let _noOfMachines =
    specsCommandsOverMachinesOrederedByBrowsers[config.browsers[0]].length;

  for (let i = 0; i < _noOfMachines; i++) {
    let bashCommand = "exit_code=0";

    let _browsers = i % 2 ? config.browsers : config.browsers.reverse();
    _browsers.forEach((browser) => {
      bashCommand = `${bashCommand}; npx cypress run -b ${browser} --headless --spec ${specsCommandsOverMachinesOrederedByBrowsers[browser][i]} || exit_code=$? ; pkill -9 cypress`;
    });

    bashCommand = `${bashCommand} ; exit $exit_code`;
    bashCommands.push(bashCommand);
  }
  return bashCommands;
}

function upConrainters(config) {
  lg.step("Start the cypress containers", true);
  let promises = [];
  let commands = [];
  let [container_name, command] = ["", ""];
  let bashCommands = _constructCypressCommands(config);

  bashCommands.forEach((cmd) => {
    container_name = `container_${Math.floor(
      Math.random() * 100000
    )}__${bashCommands.indexOf(cmd)}`;

    command = `timeout --preserve-status ${config.timeout} docker-compose -f ${config.dockerComposePath} run --name ${container_name} ${config.cypressContainerName} bash -c '${cmd}'`;
    commands.push(command);
    lg.subStep(`~$ ${command}`);
    promises.push(execa(command));
  });

  return promises;
}

function downContainers(config) {
  lg.step("Stop the cypress containers", true);
  let dockerComposeDown = `docker-compose -f ${config.dockerComposePath} down`;
  sh.exec(dockerComposeDown);
}

function generateReport(config) {
  lg.step("Generate the reports", true);
  return merge({ files: [config.mochawesomeJSONPath] })
    .then((report) =>{
      lg.subStep(`HTML report: ${config.reportPath}/mochawsome.html`);
      marge.create(report, {
        reportDir: config.reportPath,
        charts: true,
        saveJson: true,
      })

    })
    .then(() => {
      if (config.analyseReport) {
        if (!fs.existsSync(executionTimeReportDirPath)){
          sh.mkdir(executionTimeReportDirPath);
        }
        lg.subStep(`Execution time report: ${executionTimeReportDir}/${executiontimeReportJson}`);
        _analyseReport(config);
      }
    });
}

function _analyseReport(config) {
  let mergedMochawesomeJSONPath = "";
  if (config.reportPath.includes(process.cwd())) {
    mergedMochawesomeJSONPath = path.resolve(
      process.cwd(),
      config.reportPath,
      "mochawesome.json"
    );
  } else {
    mergedMochawesomeJSONPath = path.resolve(
      config.reportPath,
      "mochawesome.json"
    );
  }

  analyseReport(mergedMochawesomeJSONPath, executiontimeReportJsonPath);
}

function afterPromises(config, timer) {
  downContainers(config);
  generateReport(config).then(() => {
    console.timeEnd(timer);
  });
}

export async function orchestrator(rawArgs) {
  lg.banner();
  checkRequirements();

  let orchestratorTime = "\n[*] Total execution time";
  let config = overWriteConfig(parseArgumentsIntoConfig(rawArgs));

  console.time(orchestratorTime);
  setEnvVars(config);
  execPreCommands(config);

  Promise.allSettled(upConrainters(config))
    .then(promises => {
      afterPromises(config, orchestratorTime);
      const failedPromises = promises.filter(promise => promise.status === 'rejected');
      if(failedPromises.length){
          setTimeout(() => {
            lg.step('Exit code: 1');
            sh.exit(1);
          }, 5000);
      }
    });
}
