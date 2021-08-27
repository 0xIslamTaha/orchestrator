const fs = require("fs");
let specs = [];
const browsers = ["chrome", "firefox"];
const defaultBrowser = "chrome"; // I will use it in case of there is no browser in the title.

function getBrowserFromTitle(title) {
  return browsers.find(browser => title.toLowerCase().includes(browser))
}

function orderBasedOnBrowserDuration(browser) {
  return specs.sort(function (a, b) {
    let aDuration = a.data.find( item => item.browser === browser ).duration
    let bDuration = b.data.find( item => item.browser === browser ).duration
    return aDuration - bDuration;
  });
}

function intiateSpecData(specName) {
  if (!specs.find( spec => spec.specName === specName )) {
    specs.push({
      specName: specName,
      data: browsers.map((browser) => {
        return { browser: browser, duration: 0 };
      }),
    });
  }
}

function updateSpecData(suites, specName) {
  suites.forEach(suite => {
    let browser = getBrowserFromTitle(suite["title"]) || defaultBrowser;
    let duration = parseInt(suite["duration"]);

    let spec = specs.find( spec => spec.specName === specName );
    if (spec) spec.data.find( item => item.browser === browser ).duration += duration;
    if (suite.hasOwnProperty("suites")) {
      updateSpecData(suite.suites, specName);
    }
  })
}

function checkReportIsExisting(reportPath) {
  let path = reportPath;
  if (fs.existsSync(path)) {
    return true;
  } else {
    console.log(
      `report does not exist, are you sure there is a json report in ${path} path?`
    );
    return false;
  }
}

function millisToMinutesAndSeconds(millis) {
  let minutes = Math.floor(millis / 60000);
  let seconds = ((millis % 60000) / 1000).toFixed(0);
  return `${minutes}:${(seconds < 10 ? '0' : '')}${ seconds}`;
}


export function analyseReport(reportPath) {
  console.log("analyse the json report .... ");

  if (checkReportIsExisting(reportPath)) {
    const report = require(reportPath);

    report["results"].forEach(function (result) {
      let specFile = result["file"].split("/").pop();
      let suites = result["suites"];

      intiateSpecData(specFile);
      updateSpecData(suites, specFile);
    });

    for (let browser of browsers) {
      console.log(
        `------------------------- ${browser} -------------------------`
      );
      console.table(
        orderBasedOnBrowserDuration(browser).map(spec => { return {
          specName: spec.specName,
          duration: millisToMinutesAndSeconds(spec.data.find( item => item.browser === browser ).duration)
        } })
      );
    }
  }
}
