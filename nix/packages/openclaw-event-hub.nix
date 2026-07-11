{ lib, stdenvNoCC }:

stdenvNoCC.mkDerivation {
  pname = "openclaw-event-hub";
  version = "0.1.0";

  src = lib.fileset.toSource {
    root = ../..;
    fileset = lib.fileset.unions [
      ../../services/openclaw-event-hub/package.json
      ../../services/openclaw-event-hub/src/server.mjs
      ../../packages/shared-utils/package.json
      ../../packages/shared-utils/src/http.mjs
    ];
  };

  dontBuild = true;

  installPhase = ''
    runHook preInstall
    mkdir -p "$out/share/openclaw"
    cp -R services packages "$out/share/openclaw/"
    runHook postInstall
  '';
}
