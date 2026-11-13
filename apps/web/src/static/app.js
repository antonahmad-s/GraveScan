const state = { fixture: null, report: null, selected: null, lastFinding: null, replay: null, patch: null, verification: null, busy: false };
const fixtureNames = {
  "unsafe-mcp": "Unsafe MCP",
  "unbounded-hook": "Unbounded hook",
  "steering-injection": "Steering injection",
};
const $ = (selector) => document.querySelector(selector);
const workbench = $("#workbench");
const statusLine = $("#status-line");
const fixtureList = $("#fixture-list");
const findingList = $("#finding-list");
const findingState = $("#finding-state");
const detailState = $("#detail-state");
const detail = $("#finding-detail");
const scanButton = $("#scan-button");
const resetButton = $("#reset-button");
const exportButton = $("#export-button");
const severityFilter = $("#severity-filter");
const ruleFilter = $("#rule-filter");

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}
function setStatus(message, kind = "") {
  statusLine.textContent = message;
  findingState.className = `state-panel ${kind}`.trim();
}
function setBusy(busy, message) {
  state.busy = busy;
  workbench.setAttribute("aria-busy", String(busy));
  if (message) setStatus(message);
  renderControls();
}
async function request(route, payload) {
  const response = await fetch(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error?.message || "The request could not be completed.");
  return value;
}
function selectedFinding() {
  return state.report?.findings.find((finding) => finding.id === state.selected) || state.lastFinding || null;
}
function severityClass(severity) { return severity === "critical" || severity === "high" ? severity : "medium"; }
function renderFixtures(fixtures) {
  fixtureList.innerHTML = fixtures.map((fixture) => `<button class="fixture-button" type="button" data-fixture="${escapeHtml(fixture)}" aria-pressed="${fixture === state.fixture}"><strong>${escapeHtml(fixtureNames[fixture] || fixture)}</strong><span>${escapeHtml(fixture)}</span></button>`).join("");
  fixtureList.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => chooseFixture(button.dataset.fixture)));
}
function renderControls() {
  const enabled = state.fixture !== null && !state.busy;
  scanButton.disabled = !enabled;
  resetButton.disabled = !enabled;
  exportButton.disabled = !state.report || state.busy;
  severityFilter.disabled = !state.report || state.busy;
  ruleFilter.disabled = !state.report || state.busy;
}
function filteredFindings() {
  if (!state.report) return [];
  return state.report.findings.filter((finding) => (severityFilter.value === "all" || finding.severity === severityFilter.value) && (ruleFilter.value === "all" || finding.ruleId === ruleFilter.value));
}
function renderRules() {
  const current = ruleFilter.value;
  const rules = [...new Set((state.report?.findings || []).map((finding) => finding.ruleId))];
  ruleFilter.innerHTML = `<option value="all">All rules</option>${rules.map((rule) => `<option value="${escapeHtml(rule)}">${escapeHtml(rule)}</option>`).join("")}`;
  ruleFilter.value = rules.includes(current) ? current : "all";
}
function renderFindings() {
  findingList.innerHTML = "";
  if (!state.report) { findingState.hidden = false; findingState.textContent = "Select a fixture, then run a scan."; return; }
  const findings = filteredFindings();
  if (findings.length === 0) { findingState.hidden = false; findingState.textContent = "No findings match the selected filters."; return; }
  findingState.hidden = true;
  findingList.innerHTML = findings.map((finding) => `<li><button class="finding-button" type="button" data-finding="${escapeHtml(finding.id)}" aria-current="${finding.id === state.selected}"><span class="severity ${severityClass(finding.severity)}">${escapeHtml(finding.severity)}</span><span><strong>${escapeHtml(finding.ruleId)}: ${escapeHtml(finding.title)}</strong><span class="finding-meta"><span>${escapeHtml(finding.file)}:${finding.line}</span><span>${finding.attackScenarioId ? "Replay available" : "Static evidence"}</span></span></span></button></li>`).join("");
  findingList.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => { state.selected = button.dataset.finding; state.lastFinding = selectedFinding(); state.replay = null; state.patch = null; state.verification = null; renderFindings(); renderDetail(); }));
}
function diffMarkup(diff) {
  return escapeHtml(diff).split("\n").map((line) => `<span class="${line.startsWith("+") ? "added" : line.startsWith("-") ? "removed" : line.startsWith("@") ? "header" : ""}">${line}</span>`).join("\n");
}
function renderDetail() {
  const finding = selectedFinding();
  detail.innerHTML = "";
  if (!finding) { detailState.hidden = false; detailState.textContent = "Choose a finding to inspect its evidence trail."; return; }
  detailState.hidden = true;
  const replay = state.replay;
  const patch = state.patch;
  const verification = state.verification;
  detail.innerHTML = `
    <section class="detail-section"><span class="severity ${severityClass(finding.severity)}">${escapeHtml(finding.severity)}</span><h3>${escapeHtml(finding.ruleId)}: ${escapeHtml(finding.title)}</h3><p>${escapeHtml(finding.description)}</p><p class="muted">${escapeHtml(finding.file)}:${finding.line} · Confidence: ${escapeHtml(finding.confidence)}</p><pre class="evidence"><code>${escapeHtml(finding.evidence)}</code></pre></section>
    <section class="detail-section"><h3>Recommended boundary</h3><p>${escapeHtml(finding.remediation)}</p><div class="detail-actions">${finding.attackScenarioId ? '<button id="replay-button" class="quiet-button" type="button">Run safe replay</button>' : ""}<button id="patch-button" class="primary-button" type="button">Generate patch</button></div></section>
    ${replay ? `<section class="detail-section"><h3>${escapeHtml(replay.scenarioName)}</h3><p class="muted">Capability request: ${escapeHtml(replay.capabilityRequest)}. Policy decision: ${escapeHtml(replay.policyDecision)}. Result: ${escapeHtml(replay.result)}.</p><ol class="trace">${replay.steps.map((step) => `<li><strong>${escapeHtml(step.label)}</strong><span>${escapeHtml(step.detail)}</span></li>`).join("")}</ol><p class="boundary-note">${escapeHtml(replay.safetyNotice)}</p></section>` : ""}
    ${patch ? `<section class="detail-section"><h3>Proposed patch</h3><p>${escapeHtml(patch.reason)}</p><p class="muted">Review note: ${escapeHtml(patch.riskNote)}</p><pre class="evidence diff"><code>${diffMarkup(patch.diff)}</code></pre><div class="detail-actions"><button id="apply-button" class="primary-button" type="button">Apply to isolated copy</button></div></section>` : ""}
    ${verification ? `<section class="detail-section"><span class="verification-status ${verification.status === "Simulation blocked" || verification.status === "Verified" ? "success" : "review"}">${escapeHtml(verification.status)}</span><h3>Verification report</h3><p>Target finding present after patch: ${verification.targetFindingPresent ? "Yes" : "No"}. High/Critical findings: ${verification.highCriticalBefore} before, ${verification.highCriticalAfter} after.</p>${verification.replay ? `<p>Replay result after patch: ${escapeHtml(verification.replay.result)}.</p>` : ""}</section>` : ""}`;
  $("#replay-button")?.addEventListener("click", runReplay);
  $("#patch-button")?.addEventListener("click", generatePatch);
  $("#apply-button")?.addEventListener("click", applyPatch);
}
async function chooseFixture(fixture) {
  state.fixture = fixture; state.report = null; state.selected = null; state.lastFinding = null; state.replay = null; state.patch = null; state.verification = null;
  setStatus(`${fixtureNames[fixture]} selected. Run a scan when ready.`); renderFixtures(Object.keys(fixtureNames)); renderControls(); renderFindings(); renderDetail();
}
async function runScan(reset = false) {
  if (!state.fixture) return;
  try { setBusy(true, reset ? "Resetting the isolated copy and scanning it." : "Scanning the controlled fixture."); const value = await request(reset ? "/api/reset" : "/api/scan", { fixture: state.fixture }); state.report = value.report; state.selected = value.report.findings[0]?.id || null; state.lastFinding = value.report.findings[0] || null; state.replay = null; state.patch = null; state.verification = null; renderRules(); setStatus(`Scan complete. ${value.report.findings.length} evidence-based findings are available.`, "success"); }
  catch (error) { setStatus(error.message, "error"); }
  finally { setBusy(false); renderFindings(); renderDetail(); }
}
async function runReplay() {
  const finding = selectedFinding(); if (!finding?.attackScenarioId || !state.fixture) return;
  try { setBusy(true, "Replaying the bounded attack scenario."); const value = await request("/api/replay", { fixture: state.fixture, scenarioId: finding.attackScenarioId }); state.replay = value.replay; setStatus(`Replay complete: ${value.replay.result}.`, value.replay.result === "blocked" ? "success" : "error"); }
  catch (error) { setStatus(error.message, "error"); }
  finally { setBusy(false); renderDetail(); }
}
async function generatePatch() {
  const finding = selectedFinding(); if (!finding || !state.fixture) return;
  try { setBusy(true, "Generating a minimal allowlisted patch."); const value = await request("/api/patch/generate", { fixture: state.fixture, findingId: finding.id }); state.patch = value.patch; state.verification = null; setStatus("Patch generated. Review the diff before applying it.", "success"); }
  catch (error) { setStatus(error.message, "error"); }
  finally { setBusy(false); renderDetail(); }
}
async function applyPatch() {
  if (!state.patch || !state.fixture) return;
  try { setBusy(true, "Applying the patch to the isolated copy and verifying it."); const value = await request("/api/patch/apply", { fixture: state.fixture, patchId: state.patch.id }); state.report = value.report; state.verification = value.verification; state.replay = value.verification.replay || null; renderRules(); setStatus(`Verification complete: ${value.verification.status}.`, value.verification.status === "Needs review" || value.verification.status === "Regression detected" ? "error" : "success"); }
  catch (error) { setStatus(error.message, "error"); }
  finally { setBusy(false); renderFindings(); renderDetail(); }
}
function exportMarkdown() {
  if (!state.report || !state.fixture) return;
  const lines = [`# GraveScan report: ${state.fixture}`, "", "Safe simulation. No arbitrary code or network request was executed.", "", "## Findings", ""];
  for (const finding of state.report.findings) lines.push(`- **${finding.ruleId} (${finding.severity})** ${finding.title}: ${finding.file}:${finding.line}. ${finding.remediation}`);
  if (state.verification) lines.push("", "## Latest verification", "", `- Status: ${state.verification.status}`, `- Target finding remains: ${state.verification.targetFindingPresent ? "yes" : "no"}`);
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/markdown" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `gravescan-${state.fixture}.md`; link.click(); URL.revokeObjectURL(link.href);
  setStatus("Markdown report exported.", "success");
}
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("#theme-toggle").textContent = theme === "dark" ? "Light theme" : "Dark theme";
  $("#theme-toggle").setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  try { localStorage.setItem("gravescan-theme", theme); } catch {
    // Storage can be blocked (private mode); the theme still applies to this page.
  }
}
$("#theme-toggle").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
scanButton.addEventListener("click", () => runScan(false));
resetButton.addEventListener("click", () => runScan(true));
exportButton.addEventListener("click", exportMarkdown);
severityFilter.addEventListener("change", renderFindings);
ruleFilter.addEventListener("change", renderFindings);
try { setTheme(localStorage.getItem("gravescan-theme") || "dark"); } catch { setTheme("dark"); }
fetch("/api/fixtures").then((response) => response.json()).then((value) => { renderFixtures(value.fixtures); renderControls(); }).catch(() => { fixtureList.textContent = "Fixtures could not be loaded."; setStatus("Fixtures could not be loaded.", "error"); });
