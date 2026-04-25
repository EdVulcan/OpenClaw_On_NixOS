{ config, lib, pkgs, ... }:
{
  options.services.openclaw-system-sense.enable = lib.mkEnableOption "OpenClaw system sensing";

  config = lib.mkIf config.services.openclaw-system-sense.enable {
    systemd.services.openclaw-system-sense = {
      description = "OpenClaw System Sense";
      wantedBy = [ "multi-user.target" ];
      serviceConfig.ExecStart = "${pkgs.bash}/bin/bash -lc 'echo openclaw-system-sense placeholder'";
    };
  };
}

