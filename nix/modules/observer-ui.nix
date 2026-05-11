{ config, lib, ... }:
{
  imports = [ ./openclaw-body.nix ];

  options.services.observer-ui.enable = lib.mkEnableOption "Observer UI";

  config = lib.mkIf config.services.observer-ui.enable {
    services.openclaw.enable = true;
    services.openclaw.components = lib.mkAfter [ "observerUi" ];
  };
}
