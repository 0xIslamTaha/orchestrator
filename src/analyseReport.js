import { checkFileIsExisting, orderBasedOnBrowserDuration, millisToMinutesAndSeconds } from "./helper.js";

const browsers = ["chrome", "firefox"];
const defaultBrowser = "chrome"; // I will use it in case of there is no browser in the title.
const specs = [];

function getBrowserFromTitle(title) {
  return browsers.find((browser) => title.toLowerCase().includes(browser));
}

function intiateSpecData(specName) {
  if (!specs.find((spec) => spec.specName === specName)) {
    specs.push({
      specName: specName,
      data: browsers.map((browser) => {
        return { browser: browser, duration: 0 };
      }),
    });
  }
}

function updateSpecData(suites, specName) {
  suites.forEach((suite) => {
    let browser = getBrowserFromTitle(suite["title"]) || defaultBrowser;
    let duration = parseInt(suite["duration"]);

    let spec = specs.find((spec) => spec.specName === specName);
    if (spec)
      spec.data.find((item) => item.browser === browser).duration += duration;
    if (suite.hasOwnProperty("suites")) {
      updateSpecData(suite.suites, specName);
    }
  });
}

export function analyseReport(reportPath) {
  console.log("analyse the json report .... ");

  if (checkFileIsExisting(reportPath)) {
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
        orderBasedOnBrowserDuration(specs, browser).map((spec) => {
          return {
            specName: spec.specName,
            duration: millisToMinutesAndSeconds(
              spec.data.find((item) => item.browser === browser).duration
            ),
          };
        })
      );
    }
  }
}
