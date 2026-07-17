import path from "node:path";

export function resolveNativeDeclarativeEvolutionStagingDirectory({ stagingDir } = {}) {
  const fallback = path.join(
    process.env.OPENCLAW_BODY_STATE_DIR ?? path.resolve(process.cwd(), "../../.artifacts"),
    "managed-config-staging",
  );
  const candidate = typeof stagingDir === "string" && stagingDir.trim() ? stagingDir.trim() : fallback;
  const resolved = path.resolve(candidate);
  if (resolved === "/etc/nixos" || resolved.startsWith("/etc/nixos/")) {
    throw new Error("Declarative evolution staging must remain outside /etc/nixos.");
  }
  return resolved;
}

export function isNativeDeclarativeEvolutionPathWithinDirectory(directory, candidatePath) {
  const relative = path.relative(path.resolve(directory), path.resolve(candidatePath));
  return relative !== ""
    && relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}
