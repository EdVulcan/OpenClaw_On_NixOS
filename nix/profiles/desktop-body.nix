{
  imports = [
    ./dev-body.nix
    ../modules/openclaw-screen-sense.nix
    ../modules/openclaw-screen-act.nix
    ../modules/openclaw-system-sense.nix
    ../modules/openclaw-system-heal.nix
  ];

  services.openclaw-screen-sense.enable = true;
  services.openclaw-screen-act.enable = true;
  services.openclaw-system-sense.enable = true;
  services.openclaw-system-heal.enable = true;
}

