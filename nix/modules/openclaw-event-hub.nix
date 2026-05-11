{ config, lib, ... }:
{
  imports = [ ./openclaw-body.nix ];

  options.services.openclaw-event-hub.enable = lib.mkEnableOption "OpenClaw event hub";

  config = lib.mkIf config.services.openclaw-event-hub.enable {
    services.openclaw.enable = true;
    services.openclaw.components = lib.mkAfter [ "eventHub" ];
  };
}
