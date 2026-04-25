# OpenClawOnNixOS

OpenClawOnNixOS is the next-generation workspace for building OpenClaw as an AI-native control plane on top of NixOS.

The first milestone focuses on a minimal "body loop":

- persistent local control plane
- observable AI work view
- screen sensing
- screen actions
- browser runtime
- basic system sensing and healing

## Repository Layout

```text
apps/       User-facing applications such as the observer UI
services/   Background services that form the control plane
packages/   Shared types, events, clients, and utilities
nix/        NixOS modules, profiles, hosts, and helper scripts
docs/       Local design notes and implementation references
```

## First-Phase Services

- `openclaw-core`
- `openclaw-event-hub`
- `openclaw-session-manager`
- `openclaw-screen-sense`
- `openclaw-screen-act`
- `openclaw-browser-runtime`
- `openclaw-system-sense`
- `openclaw-system-heal`
- `observer-ui`

## Status

The repository now includes the first runnable service pair:

1. `openclaw-event-hub`
2. `openclaw-core`

## Quick Start

Bring the full local control plane up with ordered startup and health checks:

```bash
npm run dev:up
```

On Linux / NixOS:

```bash
npm run dev:up:unix
```

Verify the current health matrix:

```bash
npm run dev:check
```

On Linux / NixOS:

```bash
npm run dev:check:unix
```

Run a reproducible state-settling check for `warming_up -> ready -> degraded`:

```bash
npm run dev:state-check
```

On Linux / NixOS:

```bash
npm run dev:state-check:unix
```

Run a reproducible external command capture check:

```bash
npm run dev:command-capture-check
```

On Linux / NixOS:

```bash
npm run dev:command-capture-check:unix
```

Stop everything that `dev:up` started:

```bash
npm run dev:down
```

On Linux / NixOS:

```bash
npm run dev:down:unix
```

If you still want to run services manually, the startup order is:

1. `services/openclaw-event-hub`
2. `services/openclaw-core`
3. `services/openclaw-session-manager`
4. `services/openclaw-browser-runtime`
5. `services/openclaw-screen-sense`
6. `services/openclaw-screen-act`
7. `services/openclaw-system-sense`
8. `services/openclaw-system-heal`
9. `apps/observer-ui`

Check health:

```bash
curl http://127.0.0.1:4101/health
curl http://127.0.0.1:4100/health
curl http://127.0.0.1:4102/health
curl http://127.0.0.1:4103/health
curl http://127.0.0.1:4104/health
curl http://127.0.0.1:4105/health
curl http://127.0.0.1:4106/health
curl http://127.0.0.1:4107/health
curl http://127.0.0.1:4170/health
```

Create a task:

```bash
curl -X POST http://127.0.0.1:4100/tasks \
  -H "content-type: application/json" \
  -d "{\"goal\":\"Open the browser work view\",\"type\":\"browser_task\"}"
```

Open the AI browser runtime:

```bash
curl -X POST http://127.0.0.1:4103/browser/open \
  -H "content-type: application/json" \
  -d "{\"url\":\"https://example.com\"}"
```

Refresh placeholder screen state:

```bash
curl -X POST http://127.0.0.1:4104/screen/refresh
```

Inspect the current screen capture provider:

```bash
curl http://127.0.0.1:4104/screen/provider
```

Simulate a screen click:

```bash
curl -X POST http://127.0.0.1:4105/act/mouse/click \
  -H "content-type: application/json" \
  -d "{\"x\":640,\"y\":360,\"button\":\"left\"}"
```

Refresh aggregated system state:

```bash
curl -X POST http://127.0.0.1:4106/system/refresh
```

Simulate a heal action:

```bash
curl -X POST http://127.0.0.1:4107/heal/restart-service \
  -H "content-type: application/json" \
  -d "{\"service\":\"openclaw-browser-runtime\"}"
```

## Screen Capture Adapter Shell

`openclaw-screen-sense` now supports a first capture-adapter shell:

- `OPENCLAW_SCREEN_CAPTURE_MODE=browser`
  uses `openclaw-browser-runtime /browser/capture`
- `OPENCLAW_SCREEN_CAPTURE_MODE=command`
  runs an external command and expects JSON screen payload

Windows-friendly option:

- `OPENCLAW_SCREEN_CAPTURE_POWERSHELL_FILE`
  runs `powershell.exe -ExecutionPolicy Bypass -File <script>`
- `OPENCLAW_SCREEN_CAPTURE_NODE_FILE`
  runs `node <script>`

The external command contract is:

```json
{
  "source": "command",
  "snapshotPath": "D:/captures/frame.txt",
  "snapshotText": "captured text",
  "focusedWindow": { "title": "App", "pid": 1234 },
  "windowList": [{ "title": "App", "pid": 1234 }],
  "ocrBlocks": [{ "text": "captured text", "confidence": 0.95 }]
}
```

Example adapter script:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\nix\scripts\example-screen-capture.ps1
```

File-backed example adapter:

```powershell
node .\nix\scripts\file-screen-capture.mjs
```

Example environment for command mode:

```powershell
$env:OPENCLAW_SCREEN_CAPTURE_MODE="command"
$env:OPENCLAW_SCREEN_CAPTURE_NODE_FILE="$PWD\\nix\\scripts\\file-screen-capture.mjs"
```

The file-backed example reads these environment variables:

- `OPENCLAW_CAPTURE_SNAPSHOT_TEXT_FILE`
- `OPENCLAW_CAPTURE_OCR_TEXT_FILE`
- `OPENCLAW_CAPTURE_WINDOW_TITLE`
- `OPENCLAW_CAPTURE_WINDOW_PID`
- `OPENCLAW_CAPTURE_SNAPSHOT_PATH`

## Migration Reality

Development can continue on Windows with relatively low migration cost, but not
literally zero cost.

What should migrate cleanly:

- control-plane services
- HTTP contracts
- readiness / degraded semantics
- capture adapter contract

What will still change on NixOS/Linux:

- startup scripts
- filesystem paths
- desktop capture commands
- OCR tooling
- window enumeration tooling

That is why the current architecture keeps platform-specific capture logic in
external adapters. The intended Linux starting point is:

```bash
./nix/scripts/linux-screen-capture.sh
```

See:

- [docs/DESKTOP_CAPTURE_CONTRACT_V1.md](D:/OpenclawAndClaudecode/OpenClawOnNixOS/docs/DESKTOP_CAPTURE_CONTRACT_V1.md)
