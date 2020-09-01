# 🔥 orchestrator 🔥
![orchestrator](digram.png)

Orchestrator exeutes all cypress specs across n parallel docker containers based on a configuration file.

## ♟️ Orchestrator features:

* Pares a config file 
* Create n containers machines  in parallel
* Split all specs across all those machines 
* Collect all the execution results from those containers 
* Down all the running containers
* Generate one HTML report that has all specs execution results. 

## Requirements to use orchrestrator:
1- docker-compose file with a cypress service
```yml
version: '3'
services:
  SYSTEM_UNDER_TEST:
    container_name: SYSTEM_UNDER_TEST
    image: SYSTEM_UNDER_TEST_IMAGE
    networks:
      modules_cypress_tests_nw: {}

  cypress_service:
    container_name: cypress__container
    image: cypress/browsers:node13.8.0-chrome81-ff75
    depends_on:
      - SYSTEM_UNDER_TEST
    environment:
      - CYPRESS_baseUrl=http://SYSTEM_UNDER_TEST
    volumes:
      - ./cypress/:/cypress
      - ./mochawesome-report:/cypress/report/mochawesome-report
      - /dev/shm:/dev/shm
    networks:
      modules_cypress_tests_nw: {}

networks:
  modules_cypress_tests_nw:
    driver: bridge

```
2- use mochawsome as a reporter in cypress.json
```json
{
  "reporter": "mochawesome",
  "reporterOptions": {
    "reportDir": "cypress/report/mochawesome-report",
    "overwrite": false,
    "html": false,
    "json": true
  }
}
```


## 👌 Installation:

```bash
npm -g install 0xislamtaha/orchestrator
```

## 🎮 Usage:

* With the defualt configuration file i.e, "src/config.json"
```bash
orchestrator
```

* With your own configuration file
```bash
orchestrator --config "/path/to/config.json"
```

If you need to **overwrite** any configuration on the fly, simplly path the new configuration as a prameter.
```bash
orchestrator --config ./src/config.json --parallelizm 2 --environment '{"DOCKER_TAG":"master_283"}' --browsers "[chrome, firefox]"
```

## 🎬 To-Do:

* Export it to npm registry.
* Provide --help option.
