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
APP_BASIC_AUTH_USER=<user> APP_BASIC_AUTH_PASSWORD=<password> npm start
```

Then open `http://localhost:5000`.

`default-env.json` contains a local placeholder destination so the application router can start without a bound SAP BTP destination service. Replace that URL only if you want local proxy testing against a reachable backend. If you want your local destination to mirror the deployed setup more closely, add local-only destination properties such as `authentication=BasicAuthentication`, `proxyType=OnPremise`, and your own credentials in an uncommitted copy before testing.

The app now protects `/sap/*` proxy calls with application-level basic authentication. Configure:

- `APP_BASIC_AUTH_USER`
- `APP_BASIC_AUTH_PASSWORD`

When you use the UI, enter the same values in the **Proxy user** and **Proxy password** fields so the browser sends the required `Authorization` header on `/sap/*` requests.

## Deploy to SAP BTP Cloud Foundry

Create the SAP BTP service instances and the `onprem-sap` destination before you expect the proxy route to work. The initial `cf push` below deploys the app shell, but `/sap/*` will only resolve after the destination exists, the service bindings are in place, and `APP_BASIC_AUTH_USER` plus `APP_BASIC_AUTH_PASSWORD` are configured for the app.

```bash
cf push
```

Before the proxy route can resolve `onprem-sap`, make sure SAP BTP has:

- a Destination service instance bound to the app
- a destination named `onprem-sap` defined in that Destination service or exposed to it at subaccount level
- a Connectivity service instance bound to the app when the destination reaches the on-prem system through SAP Cloud Connector

After the app is deployed, bind the required platform services to the app and restage it:

```bash
cf bind-service sap-btp-fiori-odata-tester <destination-service-instance>
cf bind-service sap-btp-fiori-odata-tester <connectivity-service-instance>
cf restage sap-btp-fiori-odata-tester
```

The destination service binding is required so Application Router can resolve the `onprem-sap` destination, and the connectivity service binding is required when the destination reaches an on-prem system through SAP Cloud Connector.

Also set the application-level proxy credentials:

```bash
cf set-env sap-btp-fiori-odata-tester APP_BASIC_AUTH_USER <user>
cf set-env sap-btp-fiori-odata-tester APP_BASIC_AUTH_PASSWORD <password>
cf restage sap-btp-fiori-odata-tester
```

Until those environment variables are set and the app is restaged, proxied `/sap/*` requests intentionally return `503`.

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