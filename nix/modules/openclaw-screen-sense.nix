{ config, lib, pkgs, ... }:
{
  options.services.openclaw-screen-sense.enable = lib.mkEnableOption "OpenClaw screen sensing";

  config = lib.mkIf config.services.openclaw-screen-sense.enable {
    systemd.services.openclaw-screen-sense = {
      description = "OpenClaw Screen Sense";
      wantedBy = [ "multi-user.target" ];
      serviceConfig.ExecStart = "${pkgs.bash}/bin/bash -lc 'echo openclaw-screen-sense placeholder'";
    };
  };
}

