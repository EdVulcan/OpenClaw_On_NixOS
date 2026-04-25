{ config, lib, pkgs, ... }:
{
  options.services.openclaw-screen-act.enable = lib.mkEnableOption "OpenClaw screen actions";

  config = lib.mkIf config.services.openclaw-screen-act.enable {
    systemd.services.openclaw-screen-act = {
      description = "OpenClaw Screen Act";
      wantedBy = [ "multi-user.target" ];
      serviceConfig.ExecStart = "${pkgs.bash}/bin/bash -lc 'echo openclaw-screen-act placeholder'";
    };
  };
}

