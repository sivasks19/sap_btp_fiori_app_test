sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("sap.btpfioriodatatest.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);
      this.setModel(new JSONModel({
        servicePath: "",
        resourcePath: "$metadata",
        responseText: "",
        statusText: "Enter a service path and send a GET request.",
        statusState: "Information"
      }), "app");
    }
  });
});
