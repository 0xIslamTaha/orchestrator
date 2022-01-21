//@ts-check
import sh from "shelljs";
import * as lg from "./logger.js";

const requirements = ["docker", "docker-compose", "timeout"];

function is(requirement) {
  if (sh.exec(`which ${requirement}`, {silent: true}).code) return false;
  return true;
}

function checkRequirements() {
  lg.step("Checking the requirements");
  requirements.forEach((requirement) => {
    if (!is(requirement)) {
      lg.subStep(`${requirement} is not installed ❌`);
      throw new Error(`${requirement} is not installed`);
    }
    lg.subStep(`${requirement} is installed ✔️`);
  });
}

export { checkRequirements };
