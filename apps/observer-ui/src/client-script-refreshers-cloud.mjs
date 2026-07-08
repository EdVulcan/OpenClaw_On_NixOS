import { observerClientCloudContextRefreshersScript } from "./client-script-refreshers-cloud-context.mjs";
import { observerClientCloudLiveRunbookRefreshersScript } from "./client-script-refreshers-cloud-live-runbook.mjs";
import { observerClientCloudLiveLaunchRefreshersScript } from "./client-script-refreshers-cloud-live-launch.mjs";
import { observerClientCloudLiveLocalReadRefreshersScript } from "./client-script-refreshers-cloud-live-local-read.mjs";
import { observerClientCloudLiveResultEnvelopeRefreshersScript } from "./client-script-refreshers-cloud-live-result-envelope.mjs";

export const observerClientCloudRefreshersScript = [
  observerClientCloudContextRefreshersScript,
  observerClientCloudLiveRunbookRefreshersScript,
  observerClientCloudLiveLaunchRefreshersScript,
  observerClientCloudLiveLocalReadRefreshersScript,
  observerClientCloudLiveResultEnvelopeRefreshersScript,
].join("");
