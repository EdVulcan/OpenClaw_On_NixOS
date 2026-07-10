{
  imports = [
    ./dev-body.nix
  ];

  services.openclaw = {
    profile = "desktop-body";
    trustedSidecarUserUnit.enable = true;
    componentOwnership.user = [
      "sessionManager"
      "browserRuntime"
    ];
    browserEngine.mode = "firefox";
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
