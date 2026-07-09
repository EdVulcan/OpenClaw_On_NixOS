prepare_engineering_verification_evidence_fixture() {
  local workspace_dir="$1"
  local prompt_secret="$2"
  local tool_secret="$3"

  local plugin_sdk_dir="$workspace_dir/packages/plugin-sdk"
  local tools_dir="$workspace_dir/src/agents/tools"
  local docs_tools_dir="$workspace_dir/docs/tools"

  mkdir -p "$workspace_dir/.git" "$workspace_dir/.openclaw" "$plugin_sdk_dir/src" "$plugin_sdk_dir/types" "$tools_dir" "$docs_tools_dir"

  cat > "$workspace_dir/package.json" <<'JSON'
{
  "name": "openclaw",
  "private": true,
  "scripts": {
    "typecheck": "printf engineering-verification-evidence-ok"
  }
}
JSON
  cat > "$workspace_dir/package-lock.json" <<'JSON'
{
  "name": "openclaw",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "openclaw"
    }
  }
}
JSON
  cat > "$workspace_dir/TOOLS.md" <<EOF
# Tools
Verification evidence must remain attached to approved command tasks.
$prompt_secret
EOF
  cat > "$docs_tools_dir/verify-runner.md" <<'MD'
# Verify Runner
Use existing approval-gated command tasks before recording verification evidence.
MD
  cat > "$tools_dir/verify-tool.ts" <<TS
export function verifyTool() {
  const secret = "$tool_secret";
  return { capabilityId: "engineering-verification-evidence", secret };
}
TS
  cat > "$plugin_sdk_dir/package.json" <<'JSON'
{"name":"@openclaw/plugin-sdk","private":false,"types":"./types/index.d.ts","exports":{".":"./dist/index.js"}}
JSON
  cat > "$plugin_sdk_dir/src/index.ts" <<'TS'
export function createVerificationEvidenceContract() {
  return { capabilityId: "engineering-verification-evidence" };
}
TS
  cat > "$plugin_sdk_dir/types/index.d.ts" <<'TS'
export type VerificationEvidenceManifest = { pluginId: string };
TS
}
