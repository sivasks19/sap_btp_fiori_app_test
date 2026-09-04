sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox",
  "sap/btpfioriodatatest/util/requestConfig",
  "sap/btpfioriodatatest/util/requestPath"
], function(Controller, MessageBox, requestConfig, requestPath) {
  "use strict";

  return Controller.extend("sap.btpfioriodatatest.controller.App", {
    onSendRequest: async function() {
      const oModel = this.getOwnerComponent().getModel("app");
      const sServicePath = requestPath.normalizeServicePath(oModel.getProperty("/servicePath"));
      const sProxyUser = (oModel.getProperty("/proxyUser") || "").trim();
      const sProxyPassword = oModel.getProperty("/proxyPassword") || "";

      if (!sServicePath || !requestPath.isSapProxyPath(sServicePath)) {
        MessageBox.error("Enter an on-prem OData service path that starts with /sap.");
        return;
      }

      const sRequestUrl = requestPath.buildRequestUrl(sServicePath, oModel.getProperty("/resourcePath"));
      let mHeaders;

      try {
        mHeaders = requestConfig.buildRequestHeaders(sProxyUser, sProxyPassword);
      } catch (oError) {
        MessageBox.error(oError.message);
        return;
      }

      this.getView().setBusy(true);
      oModel.setProperty("/statusText", `Requesting ${sRequestUrl}`);
      oModel.setProperty("/statusState", "Information");

      try {
        const oResponse = await fetch(sRequestUrl, {
          method: "GET",
          headers: mHeaders
        });
        const sResponseText = await oResponse.text();
        const oResponseState = requestConfig.buildResponseState(oResponse, sResponseText);

        oModel.setProperty("/responseText", oResponseState.responseText);
        oModel.setProperty("/statusText", oResponseState.statusText);
        oModel.setProperty("/statusState", oResponseState.statusState);
      } catch (oError) {
        const oErrorState = requestConfig.buildErrorState(oError);

        oModel.setProperty("/responseText", oErrorState.responseText);
        oModel.setProperty("/statusText", oErrorState.statusText);
        oModel.setProperty("/statusState", oErrorState.statusState);
      } finally {
        this.getView().setBusy(false);
      }
    }
  });
});
