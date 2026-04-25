{ config, lib, pkgs, ... }:
{
  options.services.openclaw-core.enable = lib.mkEnableOption "OpenClaw core service";

  config = lib.mkIf config.services.openclaw-core.enable {
    systemd.services.openclaw-core = {
      description = "OpenClaw Core";
      wantedBy = [ "multi-user.target" ];
      serviceConfig.ExecStart = "${pkgs.bash}/bin/bash -lc 'echo openclaw-core placeholder'";
    };
  };
}

