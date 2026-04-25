{ config, lib, pkgs, ... }:
{
  options.services.openclaw-session-manager.enable = lib.mkEnableOption "OpenClaw session manager";

  config = lib.mkIf config.services.openclaw-session-manager.enable {
    systemd.services.openclaw-session-manager = {
      description = "OpenClaw Session Manager";
      wantedBy = [ "multi-user.target" ];
      serviceConfig.ExecStart = "${pkgs.bash}/bin/bash -lc 'echo openclaw-session-manager placeholder'";
    };
  };
}

