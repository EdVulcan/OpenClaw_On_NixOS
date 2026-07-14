{ lib, buildNpmPackage, fetchNpmDeps }:

{
  pname,
  serviceName,
  servicePath,
  files,
  npmDepsHash,
  version ? "0.1.0",
  removeModules ? [ ],
  nativeBuildInputs ? [ ],
  extraPostInstall ? "",
}:

buildNpmPackage {
  inherit pname version;

  src = lib.fileset.toSource {
    root = ../..;
    fileset = lib.fileset.unions files;
  };

  npmDeps = fetchNpmDeps {
    src = servicePath;
    hash = npmDepsHash;
  };
  inherit nativeBuildInputs;
  npmRoot = "services/${serviceName}";
  npmInstallFlags = [ "--ignore-scripts" ];
  dontNpmBuild = true;
  PUPPETEER_SKIP_DOWNLOAD = "true";

  installPhase = ''
    runHook preInstall
    (
      cd "$npmRoot"
      npm prune --omit=dev --no-save --ignore-scripts
    )

    mkdir -p "$out/share/openclaw"
    for sourceRoot in apps services packages; do
      if [ -d "$sourceRoot" ]; then
        cp -R "$sourceRoot" "$out/share/openclaw/"
      fi
    done

    runtimeRoot="$out/share/openclaw/services/${serviceName}"
    rm -f "$runtimeRoot/package-lock.json"
    for moduleName in ${lib.escapeShellArgs removeModules}; do
      rm -rf "$runtimeRoot/node_modules/$moduleName"
    done
    if [ -d "$runtimeRoot/node_modules/.bin" ]; then
      find -L "$runtimeRoot/node_modules/.bin" -type l -delete
    fi
    runHook postInstall
    ${extraPostInstall}
  '';
}
