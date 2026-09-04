const test = require("node:test");
const assert = require("node:assert/strict");

const packageJson = require("../package.json");
const xsApp = require("../xs-app.json");
const defaultEnv = require("../default-env.json");
const manifest = require("../webapp/manifest.json");
const { createProxyAuthMiddleware, safeEqual } = require("../lib/proxyAuth");
const requestConfig = require("../webapp/util/requestConfig");
const requestPath = require("../webapp/util/requestPath");

test("package exposes approuter start script", function() {
  assert.equal(packageJson.scripts.start, "node index.js");
  assert.equal(packageJson.dependencies["@sap/approuter"], "^23.0.0");
  assert.equal(packageJson.engines.node, "^22.0.0 || ^24.0.0");
});

test("approuter proxies SAP paths through the on-prem destination", function() {
  const sapRoute = xsApp.routes.find(function(route) {
    return route.source === "^/sap/(.*)$";
  });

  assert.ok(sapRoute);
  assert.equal(sapRoute.destination, "onprem-sap");
  assert.equal(sapRoute.authenticationType, "none");
  assert.equal(sapRoute.csrfProtection, false);
  assert.equal(defaultEnv.destinations[0].name, sapRoute.destination);
});

test("UI5 app boots the tester view", function() {
  assert.equal(manifest["sap.ui5"].rootView.viewName, "sap.btpfioriodatatest.view.App");
  assert.ok(manifest["sap.ui5"].dependencies.libs["sap.m"]);
});

test("request path helper normalizes service and resource paths", function() {
  assert.equal(requestPath.normalizeServicePath("sap/opu/odata/sap/Z_TEST_SRV/"), "/sap/opu/odata/sap/Z_TEST_SRV");
  assert.equal(requestPath.normalizeResourcePath("/Entity Set/"), "Entity Set/");
  assert.equal(requestPath.isSapProxyPath("/sap/opu/odata/sap/Z_TEST_SRV"), true);
  assert.equal(requestPath.isSapProxyPath("/saphttps://example.invalid"), false);
  assert.equal(
    requestPath.buildRequestUrl("/sap/opu/odata/sap/Z_TEST_SRV", "/Entity Set/?$top=5#ignored"),
    "/sap/opu/odata/sap/Z_TEST_SRV/Entity%20Set/?$top=5"
  );
  assert.equal(
    requestPath.buildRequestUrl("/sap/opu/odata/sap/Z_TEST_SRV", "?$top=5"),
    "/sap/opu/odata/sap/Z_TEST_SRV?$top=5"
  );
  assert.equal(
    requestPath.buildRequestUrl("/sap/opu/odata/sap/Z_TEST_SRV", "Products('A/B')"),
    "/sap/opu/odata/sap/Z_TEST_SRV/Products('A%2FB')"
  );
  assert.equal(
    requestPath.buildRequestUrl("/sap/opu/odata/sap/Z_TEST_SRV", "Products('A#1')"),
    "/sap/opu/odata/sap/Z_TEST_SRV/Products('A%231')"
  );
  assert.equal(
    requestPath.buildRequestUrl("/sap/opu/odata/sap/Z_TEST_SRV", "Products('A?B')"),
    "/sap/opu/odata/sap/Z_TEST_SRV/Products('A%3FB')"
  );
  assert.equal(
    requestPath.buildRequestUrl("/sap/opu/odata/sap/Z_TEST_SRV", "/"),
    "/sap/opu/odata/sap/Z_TEST_SRV/"
  );
});

test("proxy auth middleware returns 503 when credentials are not configured", function() {
  const middleware = createProxyAuthMiddleware({});
  const response = createResponse();
  let nextCalled = false;

  middleware({ headers: {}, url: "/sap/opu/odata/sap/Z_TEST_SRV" }, response, function() {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 503);
});

test("proxy auth middleware challenges missing or malformed credentials", function() {
  const middleware = createProxyAuthMiddleware({ user: "tester", password: "secret" });
  const missingHeaderResponse = createResponse();
  const malformedHeaderResponse = createResponse();

  middleware({ headers: {}, url: "/sap/opu/odata/sap/Z_TEST_SRV" }, missingHeaderResponse, function() {});
  middleware({ headers: { authorization: "Basic not-base64" }, url: "/sap/opu/odata/sap/Z_TEST_SRV" }, malformedHeaderResponse, function() {});

  assert.equal(missingHeaderResponse.statusCode, 401);
  assert.equal(malformedHeaderResponse.statusCode, 401);
  assert.equal(missingHeaderResponse.headers["WWW-Authenticate"], "Basic realm=\"onprem-sap-proxy\"");
  assert.equal(malformedHeaderResponse.headers["WWW-Authenticate"], "Basic realm=\"onprem-sap-proxy\"");
});

test("proxy auth middleware allows valid credentials", function() {
  const middleware = createProxyAuthMiddleware({ user: "tester", password: "secret" });
  const response = createResponse();
  let nextCalled = false;

  middleware({
    headers: {
      authorization: `Basic ${Buffer.from("tester:secret").toString("base64")}`
    },
    url: "/sap/opu/odata/sap/Z_TEST_SRV"
  }, response, function() {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(response.ended, false);
});

test("proxy auth safeEqual enforces exact matches", function() {
  assert.equal(safeEqual("tester", "tester"), true);
  assert.equal(safeEqual("tester", "test"), false);
});

test("request config builds headers only when both proxy credentials are present", function() {
  const headers = requestConfig.buildRequestHeaders("tester", "secret");
  const emptyPasswordHeaders = requestConfig.buildRequestHeaders("tester", "");

  assert.equal(headers.Accept, "application/json, application/xml, text/xml, */*");
  assert.ok(headers.Authorization.startsWith("Basic "));
  assert.ok(emptyPasswordHeaders.Authorization.startsWith("Basic "));
  assert.throws(function() {
    requestConfig.buildRequestHeaders("", "secret");
  }, /Enter Proxy user/);
});

test("request config formats response and error states", function() {
  const responseState = requestConfig.buildResponseState({
    ok: false,
    status: 401,
    statusText: "Unauthorized",
    headers: {
      get: function() {
        return "application/json";
      }
    }
  }, "{\"error\":\"Authentication required.\"}");
  const errorState = requestConfig.buildErrorState(new Error("Network down"));

  assert.equal(responseState.statusText, "401 Unauthorized");
  assert.equal(responseState.statusState, "Error");
  assert.equal(responseState.responseText, "{\n  \"error\": \"Authentication required.\"\n}");
  assert.equal(errorState.statusText, "Request failed");
  assert.equal(errorState.statusState, "Error");
  assert.equal(errorState.responseText, "Network down");
});

test("request config encodes UTF-8 credentials consistently", function() {
  assert.equal(
    requestConfig.encodeBase64("tést:päss"),
    Buffer.from("tést:päss", "utf8").toString("base64")
  );
});

function createResponse() {
  return {
    ended: false,
    headers: {},
    setHeader: function(name, value) {
      this.headers[name] = value;
    },
    end: function(body) {
      this.body = body;
      this.ended = true;
    }
  };
}
