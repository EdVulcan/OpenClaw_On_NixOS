import dbus from "@homebridge/dbus-native";

const SYSTEMD_DESTINATION = "org.freedesktop.systemd1";
const SYSTEMD_MANAGER_PATH = "/org/freedesktop/systemd1";
const SYSTEMD_MANAGER_INTERFACE = "org.freedesktop.systemd1.Manager";
const DBUS_PROPERTIES_INTERFACE = "org.freedesktop.DBus.Properties";
const SYSTEMD_UNIT_INTERFACE = "org.freedesktop.systemd1.Unit";
const SYSTEMD_SERVICE_INTERFACE = "org.freedesktop.systemd1.Service";
const SERVICE_UNIT_PATTERN = /^[A-Za-z0-9_.@:-]+\.service$/u;
const UNIT_PROPERTY_NAMES = [
  "Description",
  "LoadState",
  "ActiveState",
  "SubState",
  "UnitFileState",
  "FragmentPath",
];
const SERVICE_PROPERTY_NAMES = ["MainPID", "ExecMainStatus"];

function decodeProperties(entries) {
  if (!Array.isArray(entries)) return {};
  return Object.fromEntries(entries.map(([name, variant]) => [name, variant?.[1]?.[0]]));
}

function selectProperties(properties, names) {
  return Object.fromEntries(names.filter((name) => name in properties).map((name) => [name, properties[name]]));
}

function closeBus(bus) {
  const stream = bus?.connection?.stream;
  if (typeof stream?.end === "function") stream.end();
  else if (typeof stream?.destroy === "function") stream.destroy();
}

function invoke(bus, message, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`D-Bus ${message.member} timed out.`)), timeoutMs);
    bus.invoke(message, (error, value) => {
      clearTimeout(timeout);
      if (error) {
        const failure = new Error(error.message ?? `D-Bus ${message.member} failed.`);
        failure.code = error.name ?? "dbus_method_failed";
        reject(failure);
        return;
      }
      resolve(value);
    });
  });
}

function propertiesMessage(path, interfaceName) {
  return {
    destination: SYSTEMD_DESTINATION,
    path,
    interface: DBUS_PROPERTIES_INTERFACE,
    member: "GetAll",
    signature: "s",
    body: [interfaceName],
  };
}

export function createSystemdDbusAdapter({
  createSystemBus = dbus.systemBus,
  timeoutMs = 1500,
} = {}) {
  async function inspectUnit(bus, unitName) {
    if (!SERVICE_UNIT_PATTERN.test(unitName)) {
      throw new Error(`Native systemd inventory rejects invalid service unit: ${unitName}`);
    }
    try {
      const path = await invoke(bus, {
        destination: SYSTEMD_DESTINATION,
        path: SYSTEMD_MANAGER_PATH,
        interface: SYSTEMD_MANAGER_INTERFACE,
        member: "GetUnit",
        signature: "s",
        body: [unitName],
      }, timeoutMs);
      const [unitEntries, serviceEntries] = await Promise.all([
        invoke(bus, propertiesMessage(path, SYSTEMD_UNIT_INTERFACE), timeoutMs),
        invoke(bus, propertiesMessage(path, SYSTEMD_SERVICE_INTERFACE), timeoutMs),
      ]);
      const unitProperties = decodeProperties(unitEntries);
      const serviceProperties = decodeProperties(serviceEntries);
      return {
        unitName,
        found: true,
        properties: {
          ...selectProperties(unitProperties, UNIT_PROPERTY_NAMES),
          ...selectProperties(serviceProperties, SERVICE_PROPERTY_NAMES),
        },
      };
    } catch (error) {
      return {
        unitName,
        found: false,
        error: error instanceof Error ? error.message : "Native systemd unit inspection failed.",
        errorCode: error?.code ?? null,
      };
    }
  }

  async function inspectUnits(unitNames) {
    const names = [...new Set(unitNames)];
    for (const unitName of names) {
      if (!SERVICE_UNIT_PATTERN.test(unitName)) {
        throw new Error(`Native systemd inventory rejects invalid service unit: ${unitName}`);
      }
    }
    const bus = createSystemBus();
    try {
      const managerEntries = await invoke(
        bus,
        propertiesMessage(SYSTEMD_MANAGER_PATH, SYSTEMD_MANAGER_INTERFACE),
        timeoutMs,
      );
      const manager = decodeProperties(managerEntries);
      const units = await Promise.all(names.map((unitName) => inspectUnit(bus, unitName)));
      return {
        available: true,
        transport: "dbus_native",
        version: manager.Version ? `systemd ${manager.Version}` : "systemd D-Bus",
        units: new Map(units.map((unit) => [unit.unitName, unit])),
        readOnlyMethods: [
          "org.freedesktop.systemd1.Manager.GetUnit",
          "org.freedesktop.DBus.Properties.GetAll",
        ],
      };
    } finally {
      closeBus(bus);
    }
  }

  return { inspectUnits };
}
