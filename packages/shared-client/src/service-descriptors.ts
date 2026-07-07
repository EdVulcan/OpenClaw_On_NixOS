export const openClawServiceDescriptors = {
  core: {
    service: "openclaw-core",
    defaultPort: 4100,
    portEnv: "OPENCLAW_CORE_PORT",
    urlEnv: "OPENCLAW_CORE_URL",
  },
  eventHub: {
    service: "openclaw-event-hub",
    defaultPort: 4101,
    portEnv: "OPENCLAW_EVENT_HUB_PORT",
    urlEnv: "OPENCLAW_EVENT_HUB_URL",
  },
  sessionManager: {
    service: "openclaw-session-manager",
    defaultPort: 4102,
    portEnv: "OPENCLAW_SESSION_MANAGER_PORT",
    urlEnv: "OPENCLAW_SESSION_MANAGER_URL",
  },
  browserRuntime: {
    service: "openclaw-browser-runtime",
    defaultPort: 4103,
    portEnv: "OPENCLAW_BROWSER_RUNTIME_PORT",
    urlEnv: "OPENCLAW_BROWSER_RUNTIME_URL",
  },
  screenSense: {
    service: "openclaw-screen-sense",
    defaultPort: 4104,
    portEnv: "OPENCLAW_SCREEN_SENSE_PORT",
    urlEnv: "OPENCLAW_SCREEN_SENSE_URL",
  },
  screenAct: {
    service: "openclaw-screen-act",
    defaultPort: 4105,
    portEnv: "OPENCLAW_SCREEN_ACT_PORT",
    urlEnv: "OPENCLAW_SCREEN_ACT_URL",
  },
  systemSense: {
    service: "openclaw-system-sense",
    defaultPort: 4106,
    portEnv: "OPENCLAW_SYSTEM_SENSE_PORT",
    urlEnv: "OPENCLAW_SYSTEM_SENSE_URL",
  },
  systemHeal: {
    service: "openclaw-system-heal",
    defaultPort: 4107,
    portEnv: "OPENCLAW_SYSTEM_HEAL_PORT",
    urlEnv: "OPENCLAW_SYSTEM_HEAL_URL",
  },
  observerUi: {
    service: "observer-ui",
    defaultPort: 4170,
    portEnv: "OBSERVER_UI_PORT",
    urlEnv: "OBSERVER_UI_URL",
  },
} as const;

export type OpenClawServiceKey = keyof typeof openClawServiceDescriptors;

export type OpenClawServiceId = (typeof openClawServiceDescriptors)[OpenClawServiceKey]["service"];

export type OpenClawServiceDescriptor = (typeof openClawServiceDescriptors)[OpenClawServiceKey];

export function getOpenClawServiceDescriptor(key: OpenClawServiceKey): OpenClawServiceDescriptor {
  return openClawServiceDescriptors[key];
}
