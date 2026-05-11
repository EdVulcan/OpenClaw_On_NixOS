{ config, lib, ... }:
{
  imports = [ ./openclaw-body.nix ];

  options.services.openclaw-session-manager.enable = lib.mkEnableOption "OpenClaw session manager";

  config = lib.mkIf config.services.openclaw-session-manager.enable {
    services.openclaw.enable = true;
    services.openclaw.components = lib.mkAfter [ "sessionManager" ];
  };
}
