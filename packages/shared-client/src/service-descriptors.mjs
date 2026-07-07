export const openClawServiceDescriptors = Object.freeze({
  core: Object.freeze({
    service: "openclaw-core",
    defaultPort: 4100,
    portEnv: "OPENCLAW_CORE_PORT",
    urlEnv: "OPENCLAW_CORE_URL",
  }),
  eventHub: Object.freeze({
    service: "openclaw-event-hub",
    defaultPort: 4101,
    portEnv: "OPENCLAW_EVENT_HUB_PORT",
    urlEnv: "OPENCLAW_EVENT_HUB_URL",
  }),
  sessionManager: Object.freeze({
    service: "openclaw-session-manager",
    defaultPort: 4102,
    portEnv: "OPENCLAW_SESSION_MANAGER_PORT",
    urlEnv: "OPENCLAW_SESSION_MANAGER_URL",
  }),
  browserRuntime: Object.freeze({
    service: "openclaw-browser-runtime",
    defaultPort: 4103,
    portEnv: "OPENCLAW_BROWSER_RUNTIME_PORT",
    urlEnv: "OPENCLAW_BROWSER_RUNTIME_URL",
  }),
  screenSense: Object.freeze({
    service: "openclaw-screen-sense",
    defaultPort: 4104,
    portEnv: "OPENCLAW_SCREEN_SENSE_PORT",
    urlEnv: "OPENCLAW_SCREEN_SENSE_URL",
  }),
  screenAct: Object.freeze({
    service: "openclaw-screen-act",
    defaultPort: 4105,
    portEnv: "OPENCLAW_SCREEN_ACT_PORT",
    urlEnv: "OPENCLAW_SCREEN_ACT_URL",
  }),
  systemSense: Object.freeze({
    service: "openclaw-system-sense",
    defaultPort: 4106,
    portEnv: "OPENCLAW_SYSTEM_SENSE_PORT",
    urlEnv: "OPENCLAW_SYSTEM_SENSE_URL",
  }),
  systemHeal: Object.freeze({
    service: "openclaw-system-heal",
    defaultPort: 4107,
    portEnv: "OPENCLAW_SYSTEM_HEAL_PORT",
    urlEnv: "OPENCLAW_SYSTEM_HEAL_URL",
  }),
  observerUi: Object.freeze({
    service: "observer-ui",
    defaultPort: 4170,
    portEnv: "OBSERVER_UI_PORT",
    urlEnv: "OBSERVER_UI_URL",
  }),
});

export function getOpenClawServiceDescriptor(key) {
  const descriptor = openClawServiceDescriptors[key];
  if (!descriptor) {
    throw new Error(`Unknown OpenClaw service descriptor: ${String(key)}`);
  }
  return descriptor;
}

export function getOpenClawServicePort(key, env = process.env) {
  const descriptor = getOpenClawServiceDescriptor(key);
  const rawPort = env[descriptor.portEnv] ?? String(descriptor.defaultPort);
  const port = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid ${descriptor.portEnv}: ${rawPort}`);
  }
  return port;
}

export function getOpenClawServiceUrl(key, env = process.env) {
  const descriptor = getOpenClawServiceDescriptor(key);
  const configuredUrl = env[descriptor.urlEnv];
  if (typeof configuredUrl === "string" && configuredUrl.trim()) {
    return configuredUrl.trim();
  }
  return `http://127.0.0.1:${getOpenClawServicePort(key, env)}`;
}
