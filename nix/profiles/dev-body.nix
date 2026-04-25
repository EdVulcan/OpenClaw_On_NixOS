{
  imports = [
    ../modules/openclaw-core.nix
    ../modules/openclaw-event-hub.nix
    ../modules/openclaw-session-manager.nix
    ../modules/openclaw-browser-runtime.nix
    ../modules/observer-ui.nix
  ];

  services.openclaw-core.enable = true;
  services.openclaw-event-hub.enable = true;
  services.openclaw-session-manager.enable = true;
  services.openclaw-browser-runtime.enable = true;
  services.observer-ui.enable = true;
}

