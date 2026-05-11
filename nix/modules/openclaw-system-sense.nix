{ config, lib, ... }:
{
  imports = [ ./openclaw-body.nix ];

  options.services.openclaw-system-sense.enable = lib.mkEnableOption "OpenClaw system sensing";

  config = lib.mkIf config.services.openclaw-system-sense.enable {
    services.openclaw.enable = true;
    services.openclaw.components = lib.mkAfter [ "systemSense" ];
  };
}
