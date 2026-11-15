import { createEngine, EngineError, LOCAL_PROJECT, planLocalImport } from "./engine.js";

const state = { fixture: null, report: null, selected: null, lastFinding: null, replay: null, patch: null, verification: null, busy: false };
const fixtureNames = {
  "unsafe-mcp": "Unsafe MCP",
  "unbounded-hook": "Unbounded hook",
  "steering-injection": "Steering injection",
  [LOCAL_PROJECT]: "Your project",
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
const folderButton = $("#folder-button");
const folderInput = $("#folder-input");
const pasteInput = $("#paste-input");
const pasteButton = $("#paste-button");
const localSummary = $("#local-summary");
const sourceName = $("#source-name");
const sourceBoundary = $("#source-boundary");
const scanSummary = $("#scan-summary");
let localLabel = "";

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
// The engine runs in this page, so every scan, replay, and patch stays in this visitor's browser.
let engine = null;
async function request(route, payload) {
  if (!engine) throw new Error("The scanner is still loading.");
  try {
    return engine.call(route, payload);
  } catch (error) {
    throw new Error(error instanceof EngineError ? error.message : "The request could not be completed.");
  }
}
function sourceDetails() {
  if (state.fixture === LOCAL_PROJECT) return { name: "Your project", boundary: "Local .kiro files in this tab. No upload." };
  if (state.fixture) return { name: fixtureNames[state.fixture] || state.fixture, boundary: "Controlled demo data with fake tokens." };
  return { name: "Choose a case", boundary: "Browser-local analysis. No upload." };
}
function renderSourceContext() {
  const source = sourceDetails();
  sourceName.textContent = source.name;
  sourceBoundary.textContent = source.boundary;
}
function renderScanSummary() {
  if (!state.report) { scanSummary.hidden = true; scanSummary.innerHTML = ""; return; }
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of state.report.findings) counts[finding.severity] += 1;
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  const diagnostics = state.report.diagnostics.length;
  scanSummary.hidden = false;
  scanSummary.innerHTML = `<div><h3>Current signal</h3><p>${state.report.findings.length} finding${state.report.findings.length === 1 ? "" : "s"}${diagnostics === 0 ? "" : `, ${diagnostics} parse diagnostic${diagnostics === 1 ? "" : "s"}`}</p></div><ul class="severity-counts" aria-label="Findings by severity">${entries.map(([severity, count]) => `<li class="${severity}"><strong>${count}</strong><span>${severity}</span></li>`).join("") || "<li><strong>0</strong><span>findings</span></li>"}</ul>`;
}
function selectedFinding() {
  return state.report?.findings.find((finding) => finding.id === state.selected) || state.lastFinding || null;
}
function severityClass(severity) { return severity === "critical" || severity === "high" ? severity : "medium"; }
// Lists are rebuilt with innerHTML, so keep keyboard focus on the same item instead of dropping it to <body>.
function focusedKey(container, attribute) {
  const active = document.activeElement;
  return active && container.contains(active) ? active.getAttribute(attribute) : null;
}
function restoreFocus(container, attribute, key) {
  if (key === null) return;
  const target = [...container.querySelectorAll(`[${attribute}]`)].find((element) => element.getAttribute(attribute) === key);
  if (target) target.focus();
}
function renderFixtures(fixtures) {
  const focused = focusedKey(fixtureList, "data-fixture");
  fixtureList.innerHTML = fixtures.map((fixture) => `<button class="fixture-button" type="button" data-fixture="${escapeHtml(fixture)}" aria-pressed="${fixture === state.fixture}"><strong>${escapeHtml(fixtureNames[fixture] || fixture)}</strong><span>${escapeHtml(fixture === LOCAL_PROJECT ? localLabel : fixture)}</span></button>`).join("");
  fixtureList.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => chooseFixture(button.dataset.fixture)));
  restoreFocus(fixtureList, "data-fixture", focused);
}
function renderControls() {
  const enabled = state.fixture !== null && !state.busy;
  scanButton.disabled = !enabled;
  resetButton.disabled = !enabled;
  exportButton.disabled = !state.report || state.busy;
  severityFilter.disabled = !state.report || state.busy;
  ruleFilter.disabled = !state.report || state.busy;
  folderButton.disabled = !engine || state.busy;
  pasteButton.disabled = !engine || state.busy;
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
  const focused = focusedKey(findingList, "data-finding");
  findingList.innerHTML = "";
  if (!state.report) { findingState.hidden = false; findingState.textContent = "Select a fixture, then run a scan."; return; }
  const findings = filteredFindings();
  if (findings.length === 0) { findingState.hidden = false; findingState.textContent = "No findings match the selected filters."; return; }
  findingState.hidden = true;
  findingList.innerHTML = findings.map((finding) => `<li><button class="finding-button" type="button" data-finding="${escapeHtml(finding.id)}" aria-current="${finding.id === state.selected}"><span class="severity ${severityClass(finding.severity)}">${escapeHtml(finding.severity)}</span><span><strong>${escapeHtml(finding.ruleId)}: ${escapeHtml(finding.title)}</strong><span class="finding-meta"><span>${escapeHtml(finding.file)}:${finding.line}</span><span>${finding.attackScenarioId ? "Replay available" : "Static evidence"}</span></span></span></button></li>`).join("");
  findingList.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => { state.selected = button.dataset.finding; state.lastFinding = selectedFinding(); state.replay = null; state.patch = null; state.verification = null; renderFindings(); renderDetail(); }));
  restoreFocus(findingList, "data-finding", focused);
}
function diffMarkup(diff) {
  return escapeHtml(diff).split("\n").map((line) => `<span class="${line.startsWith("+") ? "added" : line.startsWith("-") ? "removed" : line.startsWith("@") ? "header" : ""}">${line}</span>`).join("\n");
}
function comparisonList(label, findings) {
  const items = findings.length === 0 ? "<li>None</li>" : findings.map((finding) => `<li>${escapeHtml(finding.ruleId)}: ${escapeHtml(finding.title)}</li>`).join("");
  return `<div class="comparison-group"><h4>${label} (${findings.length})</h4><ul>${items}</ul></div>`;
}
function comparisonMarkup(comparison) {
  if (!comparison) return "";
  return `<div class="comparison" aria-label="Findings compared with the first scan">${comparisonList("Resolved since first scan", comparison.resolved)}${comparisonList("Introduced since first scan", comparison.introduced)}</div>`;
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
    ${verification ? `<section class="detail-section"><span class="verification-status ${verification.status === "Simulation blocked" || verification.status === "Verified" ? "success" : "review"}">${escapeHtml(verification.status)}</span><h3>Verification report</h3><p>Target finding present after patch: ${verification.targetFindingPresent ? "Yes" : "No"}. High/Critical findings: ${verification.highCriticalBefore} before, ${verification.highCriticalAfter} after.</p>${verification.replay ? `<p>Replay result after patch: ${escapeHtml(verification.replay.result)}.</p>` : ""}${comparisonMarkup(verification.comparison)}</section>` : ""}`;
  $("#replay-button")?.addEventListener("click", runReplay);
  $("#patch-button")?.addEventListener("click", generatePatch);
  $("#apply-button")?.addEventListener("click", applyPatch);
}
async function chooseFixture(fixture) {
  state.fixture = fixture; state.report = null; state.selected = null; state.lastFinding = null; state.replay = null; state.patch = null; state.verification = null;
  setStatus(`${fixtureNames[fixture]} selected. Run a scan when ready.`); renderSourceContext(); renderScanSummary(); renderFixtures(engine.fixtures()); renderControls(); renderFindings(); renderDetail();
}
async function runScan(reset = false) {
  if (!state.fixture) return;
  try { setBusy(true, reset ? "Resetting the isolated copy and scanning it." : "Scanning the controlled fixture."); const value = await request(reset ? "/api/reset" : "/api/scan", { fixture: state.fixture }); state.report = value.report; state.selected = value.report.findings[0]?.id || null; state.lastFinding = value.report.findings[0] || null; state.replay = null; state.patch = null; state.verification = null; renderRules(); renderScanSummary(); setStatus(`Scan complete. ${value.report.findings.length} evidence-based findings are available.`, "success"); }
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
  try { setBusy(true, "Applying the patch to the isolated copy and verifying it."); const value = await request("/api/patch/apply", { fixture: state.fixture, patchId: state.patch.id }); state.report = value.report; state.verification = { ...value.verification, comparison: value.comparison }; state.replay = value.verification.replay || null; renderRules(); renderScanSummary(); setStatus(`Verification complete: ${value.verification.status}.`, value.verification.status === "Needs review" || value.verification.status === "Regression detected" ? "error" : "success"); }
  catch (error) { setStatus(error.message, "error"); }
  finally { setBusy(false); renderFindings(); renderDetail(); }
}
async function exportMarkdown() {
  if (!state.report || !state.fixture) return;
  try {
    setBusy(true, "Building the before/after report.");
    const value = await request("/api/report", { fixture: state.fixture });
    const blob = new Blob([value.markdown], { type: "text/markdown" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = value.filename; link.click(); URL.revokeObjectURL(link.href);
    setStatus("Markdown report exported with before and after findings.", "success");
  } catch (error) { setStatus(error.message, "error"); }
  finally { setBusy(false); }
}
// The visitor's own files: read here, validated again by the engine, and never sent anywhere.
async function loadLocalProject(files, label) {
  setBusy(true, "Reading your .kiro files in this tab.");
  try {
    const value = engine.loadLocal(files);
    localLabel = label;
    localSummary.hidden = false;
    localSummary.textContent = `${value.files} file${value.files === 1 ? "" : "s"} loaded from .kiro/. Reload the page to clear them.`;
  } catch (error) {
    setStatus(error instanceof EngineError ? error.message : "Your files could not be loaded.", "error");
    return;
  } finally {
    setBusy(false);
  }
  await chooseFixture(LOCAL_PROJECT);
  await runScan(false);
}
async function loadChosenFolder() {
  const files = [...folderInput.files];
  folderInput.value = "";
  if (files.length === 0) return;
  const plan = planLocalImport(files.map((file) => ({ path: file.webkitRelativePath || file.name, size: file.size })));
  if (!plan.ok) { setStatus(plan.message, "error"); return; }
  let contents;
  try {
    contents = await Promise.all(plan.accepted.map(async (item) => ({ path: item.path, content: await files[item.index].text() })));
  } catch {
    setStatus("Your files could not be read.", "error");
    return;
  }
  const skipped = plan.tooLarge.length === 0 ? "" : `, ${plan.tooLarge.length} skipped as larger than 1 MB`;
  await loadLocalProject(contents, `${contents.length} .kiro file${contents.length === 1 ? "" : "s"}${skipped}`);
}
async function loadPastedConfig() {
  const content = pasteInput.value;
  if (content.trim() === "") { setStatus("Paste the contents of an mcp.json file first.", "error"); pasteInput.focus(); return; }
  await loadLocalProject([{ path: ".kiro/settings/mcp.json", content }], "Pasted mcp.json");
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
folderButton.addEventListener("click", () => folderInput.click());
folderInput.addEventListener("change", loadChosenFolder);
pasteButton.addEventListener("click", loadPastedConfig);
severityFilter.addEventListener("change", renderFindings);
ruleFilter.addEventListener("change", renderFindings);
try { setTheme(localStorage.getItem("gravescan-theme") || "dark"); } catch { setTheme("dark"); }
fetch("/assets/fixtures.json")
  .then((response) => { if (!response.ok) throw new Error("fixtures"); return response.json(); })
  .then((bundle) => { engine = createEngine(bundle); renderSourceContext(); renderScanSummary(); renderFixtures(engine.fixtures()); renderControls(); })
  .catch(() => { fixtureList.textContent = "Fixtures could not be loaded."; setStatus("Fixtures could not be loaded.", "error"); });
