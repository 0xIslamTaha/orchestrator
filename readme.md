# 🔥 orchestrator 🔥
Orchestrator exeutes all cypress specs across n parallel docker containers based on a configuration file.

## ♟️ Orchestrator features:

* Pares a config file 
* Execute n containers machines  in parallel
* Split all specs across all those machines 
* Collect all the execution results from those containers 
* Down all the running containers
* Generate one HTML report that has all specs execution results. 

## 👌 Installation:

```bash
npm -g install 0xislamtaha/orchestrator
```

## 🎮 Usage:

With the defualt configuration file i.e, "src/config.json"
```bash
orchestrator
```

With your own configuration file
```bash
orchestrator --config "/path/to/config.json"
```

If you need to overwrite any configuration on the fly, simplly path the new configuration as a prameter.
```bash
orchestrator --config ./src/config.json --parallelizm 2 --environment '{"DOCKER_TAG":"master_283"}' --browsers "[chrome, firefox]"
```

## 🎬 To-Do:

* Write full details readme.
* Export it to npm registry.
* Provide --help option.
* Demo it to the team.
