{ config, lib, ... }:
{
  imports = [ ./openclaw-body.nix ];

  options.services.openclaw-system-heal.enable = lib.mkEnableOption "OpenClaw system healing";

  config = lib.mkIf config.services.openclaw-system-heal.enable {
    services.openclaw.enable = true;
    services.openclaw.components = lib.mkAfter [ "systemHeal" ];
  };
}
