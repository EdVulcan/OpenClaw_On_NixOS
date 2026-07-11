{ lib, stdenvNoCC }:

let
  mkOpenClawSourceClosure = import ../lib/mk-openclaw-source-closure.nix {
    inherit lib stdenvNoCC;
  };
in
mkOpenClawSourceClosure {
  pname = "openclaw-system-sense";
  files = [
    ../../services/openclaw-system-sense/package.json
    ../../services/openclaw-system-sense/src/server.mjs
    ../../services/openclaw-system-sense/src/system-body-evidence-routes.mjs
    ../../services/openclaw-system-sense/src/system-body-evidence.mjs
    ../../services/openclaw-system-sense/src/system-command-operations.mjs
    ../../services/openclaw-system-sense/src/system-command-routes.mjs
    ../../services/openclaw-system-sense/src/system-file-operations.mjs
    ../../services/openclaw-system-sense/src/system-file-routes.mjs
    ../../services/openclaw-system-sense/src/system-health-governance.mjs
    ../../services/openclaw-system-sense/src/system-health-routes.mjs
    ../../services/openclaw-system-sense/src/systemd-inspection.mjs
    ../../services/openclaw-system-sense/src/systemd-next-repair-planning.mjs
    ../../services/openclaw-system-sense/src/systemd-repair-candidate-planning.mjs
    ../../services/openclaw-system-sense/src/systemd-repair-proposals.mjs
    ../../services/openclaw-system-sense/src/systemd-routes.mjs
    ../../packages/shared-events/src/event-factory.mjs
    ../../packages/shared-events/src/event-names.mjs
    ../../packages/shared-utils/package.json
    ../../packages/shared-utils/src/http.mjs
  ];
}
