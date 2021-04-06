import sh from "shelljs";
import marge from "mochawesome-report-generator";
import { merge } from "mochawesome-merge";
import fs from "fs";
import arg from "arg";
import path from "path";

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
          oldContName = command.split("--name ")[1].split(" ")[0];
          newContName = `${oldContName}_${Math.floor(Math.random() * 100000)}`;
          cmd = command.replace(oldContName, newContName);
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
        .split(",");
    }
    result[key] = variable;
  }
  return { ...result, ...args };
}

function overWriteConfig(args) {
  let configFile = args["--config"] || path.resolve(__dirname, "config.json");
  let config = JSON.parse(fs.readFileSync(configFile));
  return { ...config, ...args };
}

function setEnvVars(config) {
  Object.keys(config.environment).forEach((key) => {
    sh.env[key] = config.environment[key];
  });
}

function execPreCommands(config) {
  config.preCommands.forEach((command) => {
    sh.exec(command);
  });
}

function genearateSpecsForMachines(config) {
  let specs = sh.ls(config.specsHomePath);
  let [start, end] = [0, 0];
  let specsForMachines = [];

  if (config.parallelizm > specs.length) {
    config.parallelizm = specs.length;
  }

  let index = specs.length / config.parallelizm;
  for (let i = 0; i < config.parallelizm; i++) {
    let result = "";
    end = start + index;
    specs.slice(start, end).forEach((spec) => {
      spec = config.specsDockerPath + spec;
      result = result + "," + spec;
    });
    specsForMachines.push(result.slice(1));
    start = end;
  }
  return specsForMachines;
}

function upConrainters(config) {
  let promises = [];
  let [container_name, command] = ["", ""];
  let specsForMachines = genearateSpecsForMachines(config);
  config.browsers.forEach((browser) => {
    specsForMachines.forEach((specPerMachine) => {
      container_name = `container_${Math.floor(
        Math.random() * 100000
      )}_${browser}_${specsForMachines.indexOf(specPerMachine)}`;
      command = `timeout --preserve-status ${config.timeout} docker-compose -f ${config.dockerComposePath} run --name ${container_name} ${config.cypressContainerName} npx cypress run -b ${browser} --headless --spec ${specPerMachine}`;
      console.log(command);
      promises.push(execa(command));
    });
  });
  return promises;
}

function downContainers(config) {
  let dockerComposeDown = `docker-compose -f ${config.dockerComposePath} down`;
  sh.exec(dockerComposeDown);
}

function generateReport(config) {
  return merge({ files: [config.mochawesomeJSONPath] }).then((report) =>
    marge.create(report, { reportDir: config.reportPath })
  );
}

export function orchestrator(rawArgs) {
  let config = overWriteConfig(parseArgumentsIntoConfig(rawArgs));
  setEnvVars(config);
  execPreCommands(config);
  Promise.all(upConrainters(config))
    .then(() => {
      downContainers(config);
      generateReport(config);
    })
    .catch((exitCode) => {
      downContainers(config);
      generateReport(config);
      setTimeout(() => sh.exit(exitCode), 5000);
    });
}
