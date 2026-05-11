{
  imports = [
    ./dev-body.nix
  ];

  services.openclaw = {
    profile = "desktop-body";
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
