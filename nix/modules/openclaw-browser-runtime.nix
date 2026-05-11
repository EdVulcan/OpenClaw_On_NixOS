{ config, lib, ... }:
{
  imports = [ ./openclaw-body.nix ];

  options.services.openclaw-browser-runtime.enable = lib.mkEnableOption "OpenClaw browser runtime";

  config = lib.mkIf config.services.openclaw-browser-runtime.enable {
    services.openclaw.enable = true;
    services.openclaw.components = lib.mkAfter [ "browserRuntime" ];
  };
}
