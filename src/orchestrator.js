import sh from 'shelljs';
import marge from 'mochawesome-report-generator';
import { merge }from 'mochawesome-merge';
import fs from 'fs'
import arg from 'arg';
import path from 'path';

function execa(command) {
    return new Promise((resolve, reject) => sh.exec(command, function(code, stdout, error) {
        if (code != 0) {
            return reject(error);
        }
        return resolve(code);
    }))
}

function parseArgumentsIntoConfig(rawArgs) {
    const args = arg(
      {
        '--config': String,
        '-c': '--config',
      },
      {
        argv: rawArgs.slice(2),
        permissive: true
      }
    );
    let result = {};
    for (let i = 0; i < args['_'].length; i += 2 ){
        let key = args['_'][i].replace('--','')
        let variable = args['_'][i+1]; 
        if (variable.includes("{")) {
            variable = JSON.parse(variable);}
        else if (variable.includes("[")){
            variable = variable.replace('[','')
            .replace(']','')
            .replace(', ', ',')
            .split(",")
        } 
        result[key] = variable;
    }
    return result;
  }

function overWriteConfig(args){
    let configFile = args['--config'] || path.resolve(__dirname, 'config.json');
    let config = JSON.parse(fs.readFileSync(configFile));
    return {...config, ...args};
}

function setEnvVars(config){
    Object.keys(config.environment).forEach( key => {
        sh.env[key] = config.environment[key];
    })
}

function execPreCommands(config){
    config.preCommands.forEach( command => {
        sh.exec(command);
    })
}

function genearateSpecsForMachines(config){
    let specs = sh.ls(config.specsHomePath);
    let [start, end] = [0, 0];
    let specsForMachines = [];

    if (config.parallelizm > specs.length){ 
        config.parallelizm = specs.length;
    }
    
    let index = specs.length / config.parallelizm;
    for(let i = 0; i < config.parallelizm; i++) {
        let result = "";
        end = start + index;
        specs.slice(start, end).forEach(spec => {
            spec = config.specsDockerPath + spec;
            result = result + "," + spec;
        })
        specsForMachines.push(result.slice(1));
        start = end;
    }
    return specsForMachines;
}

function upConrainters(config) {
    let promises = [];
    let [container_name, command] = ['', ''];
    let specsForMachines = genearateSpecsForMachines(config);
    config.browsers.forEach(browser => {
        specsForMachines.forEach(specPerMachine => {
            container_name = `container_${browser}_${specsForMachines.indexOf(specPerMachine)}`
            command = `timeout --preserve-status ${config.timeout} docker-compose -f ${config.dockerComposePath} run --name ${container_name} cypress_chrome npx cypress run -b ${browser} --headless --spec ${specPerMachine}`;

            promises.push(execa(command));
        })
    })
    return promises;
}

function downContainers(config){
    let dockerComposeDown = `docker-compose -f ${config.dockerComposePath} down`
    sh.exec(dockerComposeDown);
}

function generateReport(config) {
    return merge({files: [config.mochawesomeJSONPath]})
    .then(report => marge.create(report, {reportDir: config.reportPath}));
  }

export function orchestrator(rawArgs){
    let config = overWriteConfig(parseArgumentsIntoConfig(rawArgs));
    setEnvVars(config)
    execPreCommands(config)
    Promise.all(upConrainters(config)).then( () => {
        downContainers(config);
        generateReport(config);
    }).catch( (error) => {
        console.log(error);
        downContainers(config);
        generateReport(config);
    })
}
