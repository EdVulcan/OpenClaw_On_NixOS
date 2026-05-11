{ lib, ... }:
{
  imports = [
    ../modules/openclaw-body.nix
  ];

  services.openclaw = {
    enable = true;
    profile = lib.mkDefault "dev-body";
    repoRoot = "/opt/openclaw";
    components = [
      "eventHub"
      "core"
      "sessionManager"
      "browserRuntime"
      "observerUi"
    ];
  };
}
