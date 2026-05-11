{ config, lib, ... }:
{
  imports = [ ./openclaw-body.nix ];

  options.services.openclaw-core.enable = lib.mkEnableOption "OpenClaw core service";

  config = lib.mkIf config.services.openclaw-core.enable {
    services.openclaw.enable = true;
    services.openclaw.components = lib.mkAfter [ "core" ];
  };
}
