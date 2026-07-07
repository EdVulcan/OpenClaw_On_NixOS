import { observerClientConfigDomScript } from "./client-script-config-dom.mjs";
import { observerClientRenderersScript } from "./client-script-renderers.mjs";
import { observerClientAppRefreshersScript } from "./client-script-refreshers-app.mjs";
import { observerClientCloudRefreshersScript } from "./client-script-refreshers-cloud.mjs";
import { observerClientRuntimeActionsScript } from "./client-script-runtime-actions.mjs";
import { observerClientStartupScript } from "./client-script-startup.mjs";

const OBSERVER_CLIENT_SCRIPT_CHUNKS = [
  observerClientConfigDomScript,
  observerClientRenderersScript,
  observerClientAppRefreshersScript,
  observerClientCloudRefreshersScript,
  observerClientRuntimeActionsScript,
  observerClientStartupScript,
];

export function clientScript() {
  return OBSERVER_CLIENT_SCRIPT_CHUNKS.join("");
}
