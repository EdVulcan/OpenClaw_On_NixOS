import { pathToFileURL } from "node:url";
import dbus from "@homebridge/dbus-native";
import { createSystemdDbusTransport } from "../../../packages/shared-systemd/src/systemd-dbus-transport.mjs";

export const HOSTD_TARGET_UNIT = "openclaw-system-sense.service";
export const HOSTD_RESTART_METHOD = "org.freedesktop.systemd1.Manager.RestartUnit";

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function readState(transport) {
  const path = await transport.getUnitPath(HOSTD_TARGET_UNIT);
  const [unit, service] = await Promise.all([
    transport.getAll(path, "org.freedesktop.systemd1.Unit"),
    transport.getAll(path, "org.freedesktop.systemd1.Service"),
  ]);
  return {
    loadState: unit.LoadState ?? "unknown",
    activeState: unit.ActiveState ?? "unknown",
    subState: unit.SubState ?? "unknown",
    mainPid: Number(service.MainPID) || null,
  };
}

function createDefaultTransport(options = {}) {
  return createSystemdDbusTransport({
    ...options,
    createSystemBus: options.createSystemBus ?? dbus.systemBus,
  });
}

export async function runFixedSystemdRestart({
  args = [],
  createTransport = createDefaultTransport,
  verificationTimeoutMs = 10000,
  pollIntervalMs = 100,
} = {}) {
  if (!Array.isArray(args) || args.length !== 0) {
    throw new Error("OpenClaw hostd restart capability accepts no arguments.");
  }

  const transport = createTransport();
  try {
    const before = await readState(transport);
    const jobPath = await transport.restartUnit(HOSTD_TARGET_UNIT);
    const deadline = Date.now() + verificationTimeoutMs;
    let after = await readState(transport);
    while (
      Date.now() < deadline
      && (after.activeState !== "active" || after.subState !== "running" || after.mainPid === before.mainPid)
    ) {
      await wait(pollIntervalMs);
      after = await readState(transport);
    }
    if (after.activeState !== "active" || after.subState !== "running" || after.mainPid === before.mainPid) {
      throw new Error(`OpenClaw hostd restart verification timed out for ${HOSTD_TARGET_UNIT}.`);
    }
    return {
      ok: true,
      owner: "openclaw-hostd",
      transport: "dbus_native",
      method: HOSTD_RESTART_METHOD,
      unit: HOSTD_TARGET_UNIT,
      jobPath,
      before,
      after,
    };
  } finally {
    transport.close();
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runFixedSystemdRestart({ args: process.argv.slice(2) })
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : "OpenClaw hostd restart failed."}\n`);
      process.exitCode = 1;
    });
}
