const fs = require("fs");

let specs = [];
const browsers = ["chrome", "firefox"];
const defaultBrowser = "chrome"; // I will use it in case of there is no browser in the title.

function getBrowserFromTitle(title) {
  title = title.toLowerCase();
  for (let browser of browsers) {
    if (title.includes(browser)) {
      return browser;
    }
  }
}

function orderBasedOnBrowserDuration(browser) {
  let aDuration, bDuration;
  return specs.sort(function (a, b) {
    for (let i = 0; i < a.data.length; i++) {
      if (a.data[i].browser === browser) {
        aDuration = a.data[i].duration;
        break;
      }
    }

    for (let i = 0; i < b.data.length; i++) {
      if (b.data[i].browser === browser) {
        bDuration = b.data[i].duration;
        break;
      }
    }

    return aDuration - bDuration;
  });
}

function intiateSpecData(specName) {
  for (let spec of specs) {
    if (spec["specName"] === specName) {
      return;
    }
  }
  specs.push({
    specName: specName,
    data: browsers.map((browser) => {
      return { browser: browser, duration: 0 };
    }),
  });
}

function updateSpecData(suites, specName) {
  for (let suite of suites) {
    let browser = getBrowserFromTitle(suite["title"]) || defaultBrowser;
    let duration = parseInt(suite["duration"]);
    for (let spec of specs) {
      if (spec["specName"] === specName) {
        spec.data.forEach((data) => {
          if (data.browser === browser) {
            data.duration += duration;
          }
        });
      }
    }

    if (suite.hasOwnProperty("suites")) {
      updateSpecData(suite.suites, specName);
    }
  }
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
      console.log(
        JSON.stringify(orderBasedOnBrowserDuration(browser), null, 2)
      );
    }
  }
}
