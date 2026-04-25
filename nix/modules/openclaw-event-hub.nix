{ config, lib, pkgs, ... }:
{
  options.services.openclaw-event-hub.enable = lib.mkEnableOption "OpenClaw event hub";

  config = lib.mkIf config.services.openclaw-event-hub.enable {
    systemd.services.openclaw-event-hub = {
      description = "OpenClaw Event Hub";
      wantedBy = [ "multi-user.target" ];
      serviceConfig.ExecStart = "${pkgs.bash}/bin/bash -lc 'echo openclaw-event-hub placeholder'";
    };
  };
}

