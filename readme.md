# orchestrator
Orchestrator package to run split all cypress specs across n parallel docker containers based on a configuration file.


## Installation:

```bash
npm -g install 0xislamtaha/orchestrator
```

## Usage:

simple with a configuration file, execute the following commands
```bash
orchestrator --config ./src/config.json
```

If you need to overwrite any configuration, simplly path the new configuration as a prameter.
```bash
orchestrator --config ./src/config.json --parallelizm 2 --environment '{"DOCKER_TAG":"master_283"}' --browsers "[chrome, firefox]"
```
