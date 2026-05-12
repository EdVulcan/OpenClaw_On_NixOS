#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BODY_MODULE="$REPO_ROOT/nix/modules/openclaw-body.nix"
DEV_PROFILE="$REPO_ROOT/nix/profiles/dev-body.nix"
DESKTOP_PROFILE="$REPO_ROOT/nix/profiles/desktop-body.nix"
LOCAL_HOST="$REPO_ROOT/nix/hosts/local-dev.nix"
FLAKE="$REPO_ROOT/flake.nix"

required_files=(
  "$BODY_MODULE"
  "$DEV_PROFILE"
  "$DESKTOP_PROFILE"
  "$LOCAL_HOST"
  "$FLAKE"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required body-config file: $file" >&2
    exit 1
  fi
done

if command -v nix-instantiate >/dev/null 2>&1; then
  while IFS= read -r nix_file; do
    nix-instantiate --parse "$nix_file" >/dev/null
  done < <(find "$REPO_ROOT/nix" -name '*.nix' -type f | sort)
fi

node - <<'EOF' "$REPO_ROOT"
const fs = require("node:fs");
const path = require("node:path");

const root = process.argv[2];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const bodyModule = read("nix/modules/openclaw-body.nix");
const devProfile = read("nix/profiles/dev-body.nix");
const desktopProfile = read("nix/profiles/desktop-body.nix");
const localHost = read("nix/hosts/local-dev.nix");
const flake = read("flake.nix");

const serviceNames = [
  "openclaw-event-hub",
  "openclaw-core",
  "openclaw-session-manager",
  "openclaw-browser-runtime",
  "openclaw-screen-sense",
  "openclaw-screen-act",
  "openclaw-system-sense",
  "openclaw-system-heal",
  "observer-ui",
];

const componentKeys = [
  "eventHub",
  "core",
  "sessionManager",
  "browserRuntime",
  "screenSense",
  "screenAct",
  "systemSense",
  "systemHeal",
  "observerUi",
];

const envNames = [
  "OPENCLAW_CORE_URL",
  "OPENCLAW_EVENT_HUB_URL",
  "OPENCLAW_SESSION_MANAGER_URL",
  "OPENCLAW_BROWSER_RUNTIME_URL",
  "OPENCLAW_SCREEN_SENSE_URL",
  "OPENCLAW_SCREEN_ACT_URL",
  "OPENCLAW_SYSTEM_SENSE_URL",
  "OPENCLAW_SYSTEM_HEAL_URL",
  "OPENCLAW_CORE_STATE_FILE",
  "OPENCLAW_SYSTEM_HEAL_STATE_FILE",
  "OPENCLAW_BODY_PROFILE",
];

function requireIncludes(label, content, tokens) {
  const missing = tokens.filter((token) => !content.includes(token));
  if (missing.length > 0) {
    throw new Error(`${label} missing: ${missing.join(", ")}`);
  }
}

requireIncludes("openclaw-body module", bodyModule, [
  "options.services.openclaw",
  "systemd.services",
  "systemd.tmpfiles.rules",
  "StateDirectory = \"openclaw\"",
  "LogsDirectory = \"openclaw\"",
  "ExecStart = \"${cfg.nodePackage}/bin/node src/server.mjs\"",
  ...serviceNames,
  ...componentKeys,
  ...envNames,
]);

for (const legacyPath of [
  "nix/modules/openclaw-core.nix",
  "nix/modules/openclaw-event-hub.nix",
  "nix/modules/openclaw-session-manager.nix",
  "nix/modules/openclaw-browser-runtime.nix",
  "nix/modules/openclaw-screen-sense.nix",
  "nix/modules/openclaw-screen-act.nix",
  "nix/modules/openclaw-system-sense.nix",
  "nix/modules/openclaw-system-heal.nix",
  "nix/modules/observer-ui.nix",
]) {
  const content = read(legacyPath);
  if (content.includes("placeholder")) {
    throw new Error(`${legacyPath} still contains placeholder service config.`);
  }
  requireIncludes(legacyPath, content, ["./openclaw-body.nix", "services.openclaw.components"]);
}

requireIncludes("dev-body profile", devProfile, [
  "../modules/openclaw-body.nix",
  "profile = lib.mkDefault \"dev-body\"",
  "eventHub",
  "core",
  "sessionManager",
  "browserRuntime",
  "observerUi",
]);

requireIncludes("desktop-body profile", desktopProfile, [
  "./dev-body.nix",
  "profile = \"desktop-body\"",
  ...componentKeys,
]);

requireIncludes("local-dev host", localHost, [
  "../profiles/desktop-body.nix",
  "system.stateVersion",
]);

requireIncludes("flake", flake, [
  "nixosModules.openclaw-body",
  "nixosModules.default",
  "nixosConfigurations.openclaw-local-dev",
]);

console.log(JSON.stringify({
  bodyConfig: {
    module: "nix/modules/openclaw-body.nix",
    profiles: ["dev-body", "desktop-body"],
    host: "openclaw-local-dev",
    services: serviceNames.length,
    components: componentKeys,
    governance: {
      stateDirectory: true,
      logDirectory: true,
      dependencyOrdering: true,
      sharedEnvironment: true,
      flakeModuleExport: true,
    },
  },
}, null, 2));
EOF
