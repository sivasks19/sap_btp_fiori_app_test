# sap_btp_fiori_app_test

Minimal SAP BTP Cloud Foundry Fiori app for testing an on-prem SAP OData service through an SAP BTP destination that uses Basic Authentication.

## What this app does

- serves a small SAPUI5/Fiori-style UI through SAP Application Router
- proxies `/sap/*` requests to an SAP BTP destination named `onprem-sap`
- lets you enter an OData service path and send a GET request such as `$metadata`

> Basic authentication is expected to be configured in the SAP BTP destination, not in the application source code.

## Project structure

- `index.js` - starts SAP Application Router
- `xs-app.json` - serves the UI and proxies `/sap/*` to the `onprem-sap` destination
- `webapp/` - SAPUI5 app used to test the OData endpoint
- `manifest.yml` - minimal Cloud Foundry deployment manifest

## Run locally

```bash
npm install
npm start
```

Then open `http://localhost:5000`.

`default-env.json` contains a local placeholder destination so the application router can start without a bound SAP BTP destination service. Replace that URL only if you want local proxy testing against a reachable backend.

## Deploy to SAP BTP Cloud Foundry

```bash
cf push
```

After the app is deployed, bind the required platform services to the app and restage it:

```bash
cf bind-service sap-btp-fiori-odata-tester <destination-service-instance>
cf bind-service sap-btp-fiori-odata-tester <connectivity-service-instance>
cf restage sap-btp-fiori-odata-tester
```

## Required SAP BTP destination

Create a destination named `onprem-sap` with values similar to:

- `Type`: `HTTP`
- `Proxy Type`: `OnPremise`
- `Authentication`: `BasicAuthentication`
- `URL`: your on-prem SAP host URL
- `User`: technical user for the target SAP system
- `Password`: technical user password

Optional additional properties:

- `sap-client`: your SAP client, for example `100`

If your on-prem system is exposed through SAP Cloud Connector, ensure the backend host and path are allowed there as well.

## How to use

1. Open the app.
2. Enter the on-prem OData service path, for example `/sap/opu/odata/sap/Z_SAMPLE_ODATA_SRV`.
3. Keep the default resource path `$metadata` or replace it with an entity set or query.
4. Choose **Send GET request**.
5. Review the raw response in the text area.