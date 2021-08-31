//@ts-check

import fs from "fs";
import path from "path";

export function checkFileIsExisting(filePath) {
  if (fs.existsSync(filePath)) {
    return true;
  } else {
    console.log(
      `report does not exist, are you sure there is a json report in ${filePath} path?`
    );
    return false;
  }
}

export function parseJsonFile(filePath) {
  if (checkFileIsExisting(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }
}

export function writeJsonFile(data, outputDir, fileName) {
  let _path = path.resolve(outputDir, fileName);
  fs.writeFileSync(_path, JSON.stringify(data));
}

export function orderBasedOnBrowserDuration(specs, browser) {
  return specs.sort(function (a, b) {
    let aDuration = a.data.find((item) => item.browser === browser).duration;
    let bDuration = b.data.find((item) => item.browser === browser).duration;
    return aDuration - bDuration;
  });
}

export function millisToMinutesAndSeconds(millis) {
  let minutes = Math.floor(millis / 60000);
  let seconds = ((millis % 60000) / 1000).toFixed(0);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}
