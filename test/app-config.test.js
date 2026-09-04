const test = require("node:test");
const assert = require("node:assert/strict");

const packageJson = require("../package.json");
const xsApp = require("../xs-app.json");
const defaultEnv = require("../default-env.json");
const manifest = require("../webapp/manifest.json");

test("package exposes approuter start script", function() {
  assert.equal(packageJson.scripts.start, "node index.js");
  assert.equal(packageJson.dependencies["@sap/approuter"], "^23.0.0");
});

test("approuter proxies SAP paths through the on-prem destination", function() {
  const sapRoute = xsApp.routes.find(function(route) {
    return route.source === "^/sap/(.*)$";
  });

  assert.ok(sapRoute);
  assert.equal(sapRoute.destination, "onprem-sap");
  assert.equal(sapRoute.authenticationType, "none");
  assert.equal(defaultEnv.destinations[0].name, sapRoute.destination);
});

test("UI5 app boots the tester view", function() {
  assert.equal(manifest["sap.ui5"].rootView.viewName, "sap.btpfioriodatatest.view.App");
  assert.ok(manifest["sap.ui5"].dependencies.libs["sap.m"]);
});
