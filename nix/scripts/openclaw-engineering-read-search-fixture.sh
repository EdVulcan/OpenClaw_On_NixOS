prepare_engineering_read_search_fixture() {
  local workspace_dir="$1"
  local secret_prefix="$2"

  mkdir -p \
    "$workspace_dir/.git" \
    "$workspace_dir/.openclaw" \
    "$workspace_dir/src/nested" \
    "$workspace_dir/node_modules/pkg" \
    "$workspace_dir/.cache" \
    "$workspace_dir/generated" \
    "$workspace_dir/assets"

  cat > "$workspace_dir/package.json" <<JSON
{
  "name": "openclaw-engineering-read-search-fixture",
  "version": "0.0.0-${secret_prefix}-secret-version",
  "private": true,
  "description": "OpenClawNeedle package metadata"
}
JSON

  cat > "$workspace_dir/src/app.ts" <<TS
export const first = "safe";
export const needle = "OpenClawNeedle";
export const second = "OpenClawNeedle again";
export const done = true;
TS

  cat > "$workspace_dir/src/nested/search-target.ts" <<TS
export const nested = "OpenClawNeedle nested";
TS

  head -c 4096 /dev/zero | tr '\0' 'x' > "$workspace_dir/src/large.txt"
  printf 'A\0B' > "$workspace_dir/assets/binary.bin"

  cat > "$workspace_dir/node_modules/pkg/leak.ts" <<TS
export const nodeModulesLeak = "${secret_prefix}_NODE_MODULES_SECRET OpenClawNeedle";
TS
  cat > "$workspace_dir/.cache/leak.ts" <<TS
export const cacheLeak = "${secret_prefix}_CACHE_SECRET OpenClawNeedle";
TS
  cat > "$workspace_dir/generated/leak.ts" <<TS
export const generatedLeak = "${secret_prefix}_GENERATED_SECRET OpenClawNeedle";
TS
}
