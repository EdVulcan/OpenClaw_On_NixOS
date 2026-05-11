{ config, lib, ... }:
{
  imports = [ ./openclaw-body.nix ];

  options.services.openclaw-screen-sense.enable = lib.mkEnableOption "OpenClaw screen sensing";

  config = lib.mkIf config.services.openclaw-screen-sense.enable {
    services.openclaw.enable = true;
    services.openclaw.components = lib.mkAfter [ "screenSense" ];
  };
}
