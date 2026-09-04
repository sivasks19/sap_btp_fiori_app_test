const crypto = require("node:crypto");

function createProxyAuthMiddleware(options) {
  const user = options.user;
  const password = options.password;

  return function requireProxyAuthentication(req, res, next) {
    if (req.url !== "/sap" && !req.url.startsWith("/sap/")) {
      next();
      return;
    }

    if (user == null || password == null) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        error: "Configure APP_BASIC_AUTH_USER and APP_BASIC_AUTH_PASSWORD before using the /sap proxy."
      }));
      return;
    }

    const authorizationHeader = req.headers.authorization || "";

    if (!authorizationHeader.startsWith("Basic ")) {
      challenge(res);
      return;
    }

    const encodedCredentials = authorizationHeader.slice(6).trim();

    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encodedCredentials) || encodedCredentials.length % 4 !== 0) {
      challenge(res);
      return;
    }

    let credentials;

    try {
      credentials = Buffer.from(encodedCredentials, "base64").toString("utf8");
    } catch (error) {
      challenge(res);
      return;
    }

    if (Buffer.from(credentials, "utf8").toString("base64") !== encodedCredentials) {
      challenge(res);
      return;
    }

    const separatorIndex = credentials.indexOf(":");

    if (separatorIndex < 0) {
      challenge(res);
      return;
    }

    const userName = credentials.slice(0, separatorIndex);
    const suppliedPassword = credentials.slice(separatorIndex + 1);

    if (!safeEqual(userName, user) || !safeEqual(suppliedPassword, password)) {
      challenge(res);
      return;
    }

    next();
  };
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function challenge(res) {
  res.statusCode = 401;
  res.setHeader("WWW-Authenticate", "Basic realm=\"onprem-sap-proxy\"");
  res.end("Authentication required.");
}

module.exports = {
  challenge,
  createProxyAuthMiddleware,
  safeEqual
};
