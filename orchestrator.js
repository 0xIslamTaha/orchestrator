const sh = require('shelljs')
const marge = require('mochawesome-report-generator');
const { merge } = require('mochawesome-merge');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));

const config = "c" in Object.keys(argv) ? JSON.parse(fs.readFileSync(argv['c'])) : JSON.parse(fs.readFileSync('orchestratorConfig.json'));

function execa(command) {
    return new Promise((resolve, reject) => sh.exec(command, function(code, stdout, error) {
        if (code != 0) {
            return reject(error);
        }
        return resolve(code);
    }))
}

function setEnvVars(){
    Object.keys(config.environment).forEach( key => {
        sh.env[key] = config.environment[key];
    })
}

function execPreCommands(){
    config.preCommands.forEach( command => {
        sh.exec(command);
    })
}

function genearateSpecsForMachines(){
    let specs = sh.ls(config.specsHomePath);
    let start = end = 0;
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

function upConrainters() {
    let promises = [];
    let container_name = command = '';
    let specsForMachines = genearateSpecsForMachines();
    config.browsers.forEach(browser => {
        specsForMachines.forEach(specPerMachine => {
            container_name = `container_${browser}_${specsForMachines.indexOf(specPerMachine)}`
            command = `timeout --preserve-status ${config.timeout} docker-compose -f ${config.dockerComposePath} run --name ${container_name} cypress_chrome npx cypress run -b ${browser} --headless --spec ${specPerMachine}`;

            promises.push(execa(command));
        })
    })
    return promises;
}

function downContainers(){
    let dockerComposeDown = `docker-compose -f ${config.dockerComposePath} down`
    sh.exec(dockerComposeDown);
}

function generateReport() {
    const jsonReports = {
      files: [config.mochawesomeReportPath],
    };
    return merge(jsonReports).then(report => marge.create(report, jsonReports));
  }


setEnvVars()
execPreCommands()
Promise.all(upConrainters()).then( () => {
    downContainers();
    generateReport();
}).catch( (error) => {
    console.log(error);
    downContainers();
    generateReport();
})
