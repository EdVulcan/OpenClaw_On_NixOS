export type OpenClawServiceDescriptor = {
  readonly service: string;
  readonly defaultPort: number;
  readonly portEnv: string;
  readonly urlEnv: string;
};

export type OpenClawServiceKey =
  | "core"
  | "eventHub"
  | "sessionManager"
  | "browserRuntime"
  | "screenSense"
  | "screenAct"
  | "systemSense"
  | "systemHeal"
  | "observerUi";

export type OpenClawServiceId = OpenClawServiceDescriptor["service"];

export const openClawServiceDescriptors: Readonly<Record<OpenClawServiceKey, OpenClawServiceDescriptor>>;

export function getOpenClawServiceDescriptor(key: OpenClawServiceKey): OpenClawServiceDescriptor;

export function getOpenClawServicePort(key: OpenClawServiceKey, env?: Record<string, string | undefined>): number;

export function getOpenClawServiceUrl(key: OpenClawServiceKey, env?: Record<string, string | undefined>): string;
