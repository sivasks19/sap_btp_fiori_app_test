const approuter = require("@sap/approuter");
const { createProxyAuthMiddleware } = require("./lib/proxyAuth");

const appRouter = approuter();
appRouter.beforeRequestHandler.use(createProxyAuthMiddleware({
  user: process.env.APP_BASIC_AUTH_USER,
  password: process.env.APP_BASIC_AUTH_PASSWORD
}));

appRouter.start({
  port: process.env.PORT || 5000
});
