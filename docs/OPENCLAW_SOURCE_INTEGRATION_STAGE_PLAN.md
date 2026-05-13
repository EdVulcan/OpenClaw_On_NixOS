# OpenClaw Source Integration Stage Plan

更新时间：2026-05-13 15:42 +08:00

本文档用于跟踪当前阶段：把旁路 `openclaw` 增强源码项目中的能力，受控接入 `OpenClawOnNixOS`。后续每推进一个接入切片，都必须同步更新本文件，避免路线漂移、重复准备层、或忘记阶段边界。

## 1. 阶段定位

当前阶段不是继续做抽象准备，而是进入正式接入的第一段：从增强版 `openclaw` 中吸收插件 SDK、工具体系、提示词规范、Claude Code 风格工程能力，并把它们内化为 `OpenClawOnNixOS` 原生能力。

核心比喻：

- `openclaw` 是增强过的高性能部件库，包含插件 SDK、工具、提示词、会话、沙箱、跨端网关等能力。
- `OpenClawOnNixOS` 是 NixOS 躯体底盘、主权总线、审计系统、Observer 仪表盘和恢复系统。
- 接入方式不是整坨挂载旧项目，而是拆成可治理的能力部件，接到 `OpenClawOnNixOS` 的 policy、approval、audit、executor 链路上。

## 2. 不变量

这些规则不能因为进度压力被绕过：

- `OpenClawOnNixOS` 始终是运行时所有者。
- 旧 `openclaw` 源码是能力来源和设计参考，不是长期运行时依赖。
- 不 wholesale copy 旧仓库，不直接执行旧仓库命令，不隐式 import 旧模块。
- 每个接入能力必须经过 capability contract、policy、approval 边界、audit ledger、Observer 可见性。
- 躯体内部能力可以默认自治，但跨域、高风险、写入、执行、网络、系统级变更必须受用户宗主权约束。
- 不再增加“准备的准备”。任何新准备项都必须直接解锁一个真实实现切片。

## 3. 当前已完成基线

已完成并通过的准备/边界工作：

- NixOS 躯体服务骨架、profiles、systemd service skeleton。
- Core task、planner、operator、policy、approval、capability、event audit、system sense/heal。
- Sovereign command/filesystem/workspace 能力链路。
- Observer 对核心任务、能力、命令、文件系统、workspace、operator 的可见性。
- real OpenClaw workspace profile。
- OpenClaw source migration map。
- OpenClaw source migration plan。
- OpenClaw plugin SDK contract review。
- OpenClaw plugin SDK source review scope。
- Native plugin contract、registry、adapter shell。
- Native plugin invoke plan、task、deferred boundary、runtime preflight、runtime activation plan。

最近提交：

- `cb9ad20 Add plugin SDK source content review`
- `6564d79 Document OpenClaw source integration stage plan`

本地验证：

- `npm run typecheck` 通过。
- `git diff --check` 通过。
- NixOS targeted milestone 已确认通过：`openclaw-plugin-sdk-source-content-review`、`observer-openclaw-plugin-sdk-source-content-review`。

已确认的 NixOS 侧命令：

```bash
cd /home/edvulcan/OpenClaw_On_NixOS && \
git pull origin main && \
OPENCLAW_MILESTONE_CHECKS=openclaw-plugin-sdk-source-content-review,observer-openclaw-plugin-sdk-source-content-review npm run dev:milestone-check:unix
```

## 4. 当前切片

切片名称：Plugin SDK Source Content Review

状态：passed。

确认时间：2026-05-13 12:27:31 +08:00 至 2026-05-13 12:27:41 +08:00。

确认结果：

- `openclaw-plugin-sdk-source-content-review`：PASS，5s。
- `observer-openclaw-plugin-sdk-source-content-review`：PASS，5s。
- 合计：2 passed / 0 failed。

目的：

- 第一次读取旧 `openclaw` 插件 SDK 的真实源码内容。
- 只输出派生信号，不暴露源码文本。
- 为下一步 native contract tests 和原生实现提供依据。

允许输出：

- 文件数量、行数。
- export/import/interface/type/function/class/const 计数。
- capability vocabulary 信号。
- recommended absorption category。

禁止输出或执行：

- 原始源码文本。
- README 正文。
- package scripts body。
- dependency version。
- 旧模块 import。
- 旧插件代码执行。
- runtime activation。
- task/approval 自动创建。

## 5. 下一步计划

### Step 1: 确认 Source Content Review

状态：passed。

目标：确认新增的两个 targeted milestone 在 NixOS 侧通过。

完成条件：

- `openclaw-plugin-sdk-source-content-review` 通过。
- `observer-openclaw-plugin-sdk-source-content-review` 通过。
- Observer 可以看到 derived signals。
- 无源码、脚本、依赖版本、fixture secret 泄漏。

若失败：

- 只修复该切片的实现或检查。
- 不新增额外准备层。

### Step 2: SDK Derived Signals -> Native Contract Tests

状态：passed。

确认时间：2026-05-13 14:47:42 +08:00 至 2026-05-13 14:47:51 +08:00。

确认结果：

- `openclaw-plugin-sdk-native-contract-tests`：PASS，5s。
- `observer-openclaw-plugin-sdk-native-contract-tests`：PASS，4s。
- 合计：2 passed / 0 failed。

目标：把 Step 1 读出的 SDK 派生信号，转成 `OpenClawOnNixOS` 原生合同测试。

计划产物：

- 原生 plugin/capability contract 测试。
- 合同字段最小集合：plugin id、capability id、risk、domains、permissions、approval、audit、runtime owner。
- 对 enhanced `openclaw` 的 SDK 概念做映射表。

完成条件：

- 测试先失败，证明合同缺口真实存在。
- 测试不依赖旧 `openclaw` 仓库作为运行时。
- Observer/summary 能展示合同映射状态。

### Step 3: Native Plugin SDK Contract Implementation

状态：passed。

确认时间：2026-05-13 15:41:53 +08:00 至 2026-05-13 15:42:03 +08:00。

确认结果：

- `openclaw-native-plugin-sdk-contract-implementation`：PASS，5s。
- `observer-openclaw-native-plugin-sdk-contract-implementation`：PASS，4s。
- 合计：2 passed / 0 failed。

目标：实现 Step 2 的原生合同，使 `OpenClawOnNixOS` 具备吸收旧 OpenClaw 工具/提示词/插件的稳定插槽。

计划产物：

- 原生 contract builder。
- 原生 registry validation。
- policy/audit metadata。
- Observer 合同状态展示。

完成条件：

- SDK contract tests 通过。
- 现有 native plugin registry 不倒退。
- 不 import 或执行旧 OpenClaw 代码。

### Step 4: First Real Capability Absorption

状态：planned，下一步执行焦点。

目标：选一个低风险但真实的 enhanced `openclaw` 能力做第一次“部件接入”。

优先候选：

- `sense.openclaw.tool_catalog`：读取并归纳旧 OpenClaw 工具体系的能力目录。
- `sense.openclaw.prompt_pack`：读取并归纳 Claude Code 风格提示词/行为规范目录。
- `sense.openclaw.plugin_manifest`：读取插件 manifest 并映射到 native registry。

选择原则：

- 第一项必须是 read-only。
- 必须能证明我们在吸收增强版 `openclaw` 的真实能力，而不是继续只做空壳。
- 不执行旧工具，不运行旧插件。
- 输出必须是 capability metadata，而不是源码泄漏。

完成条件：

- 一个真实 `openclaw` 能力目录被 native contract 表达。
- Observer 可见。
- milestone targeted check 通过。

### Step 5: First Governed Executable Adapter

目标：从只读能力进入受控执行能力。

优先候选：

- 安全的只读文件/工作区感知工具。
- LSP/语义导航类工具。
- 非破坏性 shell dry-run 工具。

硬性边界：

- 执行必须走 native adapter。
- 高风险或写入能力必须 approval-gated。
- 每次执行必须进入 capability history / event audit。
- 不能绕过 NixOS service、policy、Observer。

完成条件：

- 至少一个来自增强 `openclaw` 设计的能力，在 `OpenClawOnNixOS` 中原生执行。
- 执行链路为 `capability -> policy -> approval if needed -> adapter -> audit -> Observer`。

## 6. 后续吸收顺序

建议顺序：

1. Plugin SDK / capability contract。
2. Tool catalog / prompt pack metadata。
3. Read-only semantic tools。
4. File edit tools behind approval。
5. Shell/process tools behind approval and sandbox rules。
6. Session/subagent orchestration。
7. Cross-channel gateway capabilities。
8. NixOS-native deployment and self-healing integration。

暂不优先：

- 直接运行旧 OpenClaw daemon。
- 直接接入全部跨端渠道。
- 直接开放 mutating tools。
- 直接复制 Claude Code prompt wall 而不接 policy。
- 直接把旧 repo 当 runtime dependency。

## 7. 状态更新协议

每次推进后必须更新：

- `更新时间`
- `当前切片`
- `最近提交`
- `本地验证`
- `待 NixOS 侧确认命令`
- 对应 Step 的状态和完成条件

状态枚举：

- `planned`：已决定但未实现。
- `in_progress`：正在实现。
- `implemented_waiting_check`：已实现，等待 milestone。
- `passed`：targeted milestone 通过。
- `blocked`：存在失败或设计阻塞。
- `superseded`：被后续设计替代，必须写清原因。

## 8. 路线漂移检查

开始任何新工作前，先问四个问题：

- 这一步是否直接推进真实接入？
- 这一步是否吸收了增强 `openclaw` 的真实能力？
- 这一步是否仍保持 `OpenClawOnNixOS` 为运行时所有者？
- 这一步完成后，Observer 和 milestone 是否能证明进度？

如果任一答案是否定，就暂停，不做。

## 9. 当前判断

当前项目方向应从“接入前准备”切换为“受控吸收增强 OpenClaw 能力”。下一步不应再做新的 readiness/checklist 层，而应在当前 source content review 通过后，直接进入：

```text
SDK derived signals -> native contract tests -> native contract implementation -> first real capability absorption
```

## 10. 2026-05-13 Step 4 Update: Tool Catalog Absorption

Status: passed.

Confirmed on NixOS:
- Started: 2026-05-13 19:39:25 +08:00.
- Finished: 2026-05-13 19:39:36 +08:00.
- `openclaw-tool-catalog`: PASS, 6s.
- `observer-openclaw-tool-catalog`: PASS, 5s.
- Total: 2 passed / 0 failed.

Slice: `sense.openclaw.tool_catalog`.

Purpose: this is the first real read-only absorption of the enhanced `openclaw` workspace, using metadata from `openclaw/src/agents/tools`, `openclaw/docs/tools`, and `openclaw/src/plugin-sdk`.

Implemented artifacts:
- Core API: `GET /plugins/openclaw-tool-catalog`.
- Core summary API: `GET /plugins/openclaw-tool-catalog/summary`.
- Registry: `openclaw-tool-catalog-v0`.
- Observer panel: `OpenClaw Tool Catalog`.
- Targeted checks: `openclaw-tool-catalog`, `observer-openclaw-tool-catalog`.

Governance boundaries:
- No old `openclaw` module import.
- No old tool execution.
- No source text exposure.
- No documentation body exposure.
- No script body or dependency version exposure.
- No task or approval creation.
- Runtime owner remains `openclaw_on_nixos`.

Local verification on Windows:
- `npm run typecheck`: passed.
- `git diff --check`: passed.
- Unix milestone scripts could not run locally because Windows shell has no `bash`.
- Equivalent Node smoke test for Core tool catalog: passed.
- Equivalent Node smoke test for Observer visibility: passed.

NixOS targeted milestone command:

```bash
cd /home/edvulcan/OpenClaw_On_NixOS && \
git pull origin main && \
OPENCLAW_MILESTONE_CHECKS=openclaw-tool-catalog,observer-openclaw-tool-catalog npm run dev:milestone-check:unix
```

Next intended slice after this passes:
- Select the first native read-only tool adapter from the catalog.
- Candidate direction: read-only workspace/file semantic inspection or tool metadata lookup.
- Do not add another readiness/checklist layer unless it directly unlocks that adapter.

## 11. 2026-05-13 Step 4 Update: Native Tool Catalog Adapter

Status: passed.

Confirmed on NixOS:
- Started: 2026-05-13 19:53:01 +08:00.
- Finished: 2026-05-13 19:53:23 +08:00.
- `openclaw-native-plugin-adapter`: PASS, 6s.
- `openclaw-native-tool-catalog-adapter`: PASS, 5s.
- `observer-openclaw-native-plugin-adapter`: PASS, 6s.
- `observer-openclaw-native-tool-catalog-adapter`: PASS, 5s.
- Total: 4 passed / 0 failed.

Slice: native adapter invocation for `sense.openclaw.tool_catalog`.

Purpose: promote the absorbed enhanced `openclaw` tool catalog from a passive metadata endpoint into a real OpenClawOnNixOS native adapter capability. This means it now follows the body-owned invocation chain: `capability -> policy -> native adapter -> audit/history -> Observer`.

Implemented artifacts:
- Core native adapter API: `GET /plugins/native-adapter/tool-catalog`.
- Capability registry entry: `sense.openclaw.tool_catalog`.
- Capability invoke support: `POST /capabilities/invoke` with `capabilityId=sense.openclaw.tool_catalog`.
- Invocation history support for `sense.openclaw.tool_catalog`.
- Observer panel: `OpenClaw Tool Catalog Adapter`.
- Targeted checks: `openclaw-native-tool-catalog-adapter`, `observer-openclaw-native-tool-catalog-adapter`.

Governance boundaries:
- Read-only metadata query only.
- No old `openclaw` module import.
- No old tool execution.
- No source text exposure.
- No documentation body exposure.
- No script body or dependency version exposure.
- No runtime activation.
- No task or approval creation.
- Invocation is audit-only and recorded in capability history.

Local verification on Windows:
- `npm run typecheck`: passed.
- `git diff --check`: passed.
- Equivalent Node smoke test for native tool catalog adapter invocation: passed.
- Equivalent Node smoke test for Observer visibility: passed.
- Unix milestone scripts still require NixOS/bash.

NixOS targeted milestone command:

```bash
cd /home/edvulcan/OpenClaw_On_NixOS && \
git pull origin main && \
OPENCLAW_MILESTONE_CHECKS=openclaw-native-tool-catalog-adapter,observer-openclaw-native-tool-catalog-adapter npm run dev:milestone-check:unix
```

Next intended slice after this passes:
- Use the invokable tool catalog to choose and implement one native read-only semantic tool.
- Recommended candidate: a bounded workspace/file semantic inspection adapter inspired by enhanced OpenClaw tooling.
- Do not implement mutating tool execution yet.

这条线是本阶段的主线。

当前执行焦点：Step 4 `First Real Capability Absorption`，`sense.openclaw.tool_catalog` 与 native tool catalog adapter 均已通过 NixOS targeted milestone。下一步进入第一个 native read-only semantic tool，禁止再新增与真实 adapter 无关的 readiness/checklist 层。
