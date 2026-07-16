export const observerClientRuntimeScreenObservationScript = `async function refreshScreenNow() {
  const response = await fetchJson(\`\${observerConfig.coreUrl}/capabilities/invoke\`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      capabilityId: "sense.screen.observe",
      intent: "screen.observe",
    }),
  });
  if (response.invoked !== true) {
    throw new Error("Screen observation capability was not invoked.");
  }
  setControlMessage(\`Screen refreshed: \${response.result?.observation?.readiness ?? "unknown"}\`);
  await refreshScreen();
}
`;
