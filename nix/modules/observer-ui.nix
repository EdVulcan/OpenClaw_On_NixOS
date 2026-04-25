{ config, lib, pkgs, ... }:
{
  options.services.observer-ui.enable = lib.mkEnableOption "Observer UI";

  config = lib.mkIf config.services.observer-ui.enable {
    systemd.services.observer-ui = {
      description = "OpenClaw Observer UI";
      wantedBy = [ "multi-user.target" ];
      serviceConfig.ExecStart = "${pkgs.bash}/bin/bash -lc 'echo observer-ui placeholder'";
    };
  };
}

