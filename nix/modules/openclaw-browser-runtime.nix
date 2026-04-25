{ config, lib, pkgs, ... }:
{
  options.services.openclaw-browser-runtime.enable = lib.mkEnableOption "OpenClaw browser runtime";

  config = lib.mkIf config.services.openclaw-browser-runtime.enable {
    systemd.services.openclaw-browser-runtime = {
      description = "OpenClaw Browser Runtime";
      wantedBy = [ "multi-user.target" ];
      serviceConfig.ExecStart = "${pkgs.bash}/bin/bash -lc 'echo openclaw-browser-runtime placeholder'";
    };
  };
}

