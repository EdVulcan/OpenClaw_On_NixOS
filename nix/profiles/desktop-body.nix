{
  imports = [
    ./dev-body.nix
  ];

  services.openclaw = {
    profile = "desktop-body";
    trustedSidecarUserUnit.enable = true;
    components = [
      "eventHub"
      "core"
      "sessionManager"
      "browserRuntime"
      "screenSense"
      "screenAct"
      "systemSense"
      "systemHeal"
      "observerUi"
    ];
  };
}
