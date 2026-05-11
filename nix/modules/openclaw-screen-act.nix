{ config, lib, ... }:
{
  imports = [ ./openclaw-body.nix ];

  options.services.openclaw-screen-act.enable = lib.mkEnableOption "OpenClaw screen actions";

  config = lib.mkIf config.services.openclaw-screen-act.enable {
    services.openclaw.enable = true;
    services.openclaw.components = lib.mkAfter [ "screenAct" ];
  };
}
