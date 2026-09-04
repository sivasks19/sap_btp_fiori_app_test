sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageBox"
], function(Controller, MessageBox) {
  "use strict";

  return Controller.extend("sap.btpfioriodatatest.controller.App", {
    onSendRequest: async function() {
      const oModel = this.getOwnerComponent().getModel("app");
      const sServicePath = this._normalizeServicePath(oModel.getProperty("/servicePath"));
      const sResourcePath = this._normalizeResourcePath(oModel.getProperty("/resourcePath"));

      if (!sServicePath) {
        MessageBox.error("Enter an on-prem OData service path that starts with /sap.");
        return;
      }

      const sRequestUrl = sResourcePath ? `${sServicePath}/${sResourcePath}` : sServicePath;

      this.getView().setBusy(true);
      oModel.setProperty("/statusText", `Requesting ${sRequestUrl}`);
      oModel.setProperty("/statusState", "Information");

      try {
        const oResponse = await fetch(sRequestUrl, {
          method: "GET",
          headers: {
            Accept: "application/json, application/xml, text/xml, */*"
          }
        });
        const sResponseText = await oResponse.text();

        oModel.setProperty("/responseText", this._formatResponseBody(sResponseText, oResponse.headers.get("content-type")));
        oModel.setProperty("/statusText", `${oResponse.status} ${oResponse.statusText}`);
        oModel.setProperty("/statusState", oResponse.ok ? "Success" : "Error");
      } catch (oError) {
        oModel.setProperty("/responseText", oError.message);
        oModel.setProperty("/statusText", "Request failed");
        oModel.setProperty("/statusState", "Error");
      } finally {
        this.getView().setBusy(false);
      }
    },

    _normalizeServicePath: function(sServicePath) {
      const sTrimmed = (sServicePath || "").trim();

      if (!sTrimmed) {
        return "";
      }

      const sPrefixed = sTrimmed.startsWith("/") ? sTrimmed : `/${sTrimmed}`;

      return sPrefixed.replace(/\/+$/, "");
    },

    _normalizeResourcePath: function(sResourcePath) {
      return (sResourcePath || "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
    },

    _formatResponseBody: function(sResponseText, sContentType) {
      if (!sResponseText) {
        return "";
      }

      if ((sContentType || "").includes("json")) {
        try {
          return JSON.stringify(JSON.parse(sResponseText), null, 2);
        } catch (oError) {
          return sResponseText;
        }
      }

      return sResponseText;
    }
  });
});
