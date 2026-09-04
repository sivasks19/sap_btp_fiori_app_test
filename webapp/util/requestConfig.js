(function(factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  sap.ui.define([], factory);
}(function() {
  "use strict";

  function buildRequestHeaders(proxyUser, proxyPassword) {
    const headers = {
      Accept: "application/json, application/xml, text/xml, */*"
    };
    const trimmedUser = (proxyUser || "").trim();
    const suppliedPassword = proxyPassword || "";

    if (!trimmedUser && !suppliedPassword) {
      return headers;
    }

    if (!trimmedUser) {
      throw new Error("Enter Proxy user before sending the request.");
    }

    headers.Authorization = `Basic ${encodeBase64(`${trimmedUser}:${suppliedPassword}`)}`;

    return headers;
  }

  function formatResponseBody(responseText, contentType) {
    if (!responseText) {
      return "";
    }

    if ((contentType || "").includes("json")) {
      try {
        return JSON.stringify(JSON.parse(responseText), null, 2);
      } catch (error) {
        return responseText;
      }
    }

    return responseText;
  }

  function buildResponseState(response, responseText) {
    return {
      responseText: formatResponseBody(responseText, response.headers.get("content-type")),
      statusText: `${response.status} ${response.statusText}`,
      statusState: response.ok ? "Success" : "Error"
    };
  }

  function buildErrorState(error) {
    return {
      responseText: error.message,
      statusText: "Request failed",
      statusState: "Error"
    };
  }

  function encodeBase64(value) {
    if (typeof btoa === "function") {
      const bytes = new TextEncoder().encode(value);
      const binaryValue = Array.from(bytes, function(byte) {
        return String.fromCharCode(byte);
      }).join("");

      return btoa(binaryValue);
    }

    if (typeof Buffer !== "undefined") {
      return Buffer.from(value, "utf8").toString("base64");
    }

    throw new Error("No base64 encoder is available in this runtime.");
  }

  return {
    buildErrorState: buildErrorState,
    buildRequestHeaders: buildRequestHeaders,
    buildResponseState: buildResponseState,
    encodeBase64: encodeBase64,
    formatResponseBody: formatResponseBody
  };
}));
