{ lib, buildNpmPackage, fetchNpmDeps }:

let
  mkOpenClawNpmRuntimeClosure = import ../lib/mk-openclaw-npm-runtime-closure.nix {
    inherit lib buildNpmPackage fetchNpmDeps;
  };
  hostdRuntimeModules = lib.fileset.fileFilter
    (file: file.hasExt "mjs")
    ../../services/openclaw-hostd/src;
in
mkOpenClawNpmRuntimeClosure {
  pname = "openclaw-hostd";
  serviceName = "openclaw-hostd";
  servicePath = ../../services/openclaw-hostd;
  npmDepsHash = "sha256-eMT6IhmcIqn9UeeHeN1n7bt0YK9lJ6PgcxLq8oZjUMw=";
  files = [
    ../../services/openclaw-hostd/package.json
    ../../services/openclaw-hostd/package-lock.json
    hostdRuntimeModules
    ../../packages/shared-systemd/src/systemd-dbus-transport.mjs
  ];
}
