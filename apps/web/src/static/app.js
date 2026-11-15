// The engine runs in a dedicated worker, so scanning a large project never blocks input here.
// The build replaces both asset paths below with content-hashed URLs.
const WORKER_URL = "/assets/engine-worker.js";
const FIXTURES_URL = "/assets/fixtures.json";
const LOCAL_PROJECT = "local-project";
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const fixturesRequest = fetch(FIXTURES_URL).then((response) => { if (!response.ok) throw new Error("fixtures"); return response.json(); });
// Worker source is a build-time constant. Trusted Types prevents any future dynamic string from
// reaching this script URL sink, while the fallback keeps older browsers functional.
const trustedScriptUrl = window.trustedTypes?.createPolicy("gravescan", { createScriptURL: (url) => url });
const worker = new Worker(trustedScriptUrl ? trustedScriptUrl.createScriptURL(WORKER_URL) : WORKER_URL);
const pending = new Map();
let nextRequestId = 1;
let sources = [];
let engineReady = false;

function send(type, body = {}) {
  return new Promise((resolve, reject) => {
    const id = nextRequestId++;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, type, ...body });
  });
}
worker.addEventListener("message", (event) => {
  const reply = event.data;
  const waiter = pending.get(reply?.id);
  if (!waiter) return;
  pending.delete(reply.id);
  if (reply.ok) waiter.resolve(reply.value);
  else waiter.reject(new Error(reply.message));
});
worker.addEventListener("error", (event) => {
  event.preventDefault();
  for (const waiter of pending.values()) waiter.reject(new Error("The scanner stopped unexpectedly. Reload the page to try again."));
  pending.clear();
});

const state = { fixture: null, report: null, selected: null, lastFinding: null, replay: null, patch: null, verification: null, busy: false, error: null };
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
const board = $(".evidence-board");
const caseFile = $(".case-file");
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
const themeColor = $('meta[name="theme-color"]');
let localLabel = "";

// DOM builders keep untrusted config text out of HTML parser sinks. The CSP can therefore require
// Trusted Types without relying on manual escaping at every new render path.
function node(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.id) element.id = options.id;
  if (options.text !== undefined) element.textContent = String(options.text);
  for (const [name, value] of Object.entries(options.attrs || {})) element.setAttribute(name, String(value));
  return element;
}
function append(parent, ...children) {
  for (const child of children.flat()) if (child !== undefined && child !== null && child !== false) parent.append(child);
  return parent;
}
function text(tag, value, options = {}) { return node(tag, { ...options, text: value }); }
function button(label, className, onClick, attrs = {}) {
  const control = text("button", label, { className, attrs: { type: "button", ...attrs } });
  control.addEventListener("click", onClick);
  return control;
}
function section(children) { return append(node("section", { className: "detail-section" }), children); }
function evidence(content, className = "evidence") { return append(node("pre", { className }), node("code", { text: content })); }
function severityTag(finding) { return text("span", finding.severity, { className: `severity ${finding.severity}` }); }
// Results land below the action that produced them, so bring the region into view unless its top
// is already in the upper half of the screen.
function reveal(element) {
  const top = element.getBoundingClientRect().top;
  if (top < 0 || top > window.innerHeight / 2) element.scrollIntoView({ block: "start" });
}

function setStatus(message, kind = "") {
  statusLine.textContent = message;
  statusLine.dataset.kind = kind;
}
// A failed action is also reported next to the button that started it, not only in the header.
function fail(error) { state.error = error.message; setStatus(error.message, "error"); }
function setBusy(busy, message) {
  state.busy = busy;
  if (busy) state.error = null;
  workbench.setAttribute("aria-busy", String(busy));
  if (message) setStatus(message);
  renderControls();
}
// Every scan, replay, and patch runs in this visitor's own worker and never leaves the tab.
async function request(route, payload) {
  if (!engineReady) throw new Error("The scanner is still loading.");
  return send("call", { route, payload });
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
  scanSummary.replaceChildren();
  if (!state.report) { scanSummary.hidden = true; return; }
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of state.report.findings) counts[finding.severity] += 1;
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  const diagnostics = state.report.diagnostics.length;
  const label = `${state.report.findings.length} finding${state.report.findings.length === 1 ? "" : "s"}${diagnostics === 0 ? "" : `, ${diagnostics} parse diagnostic${diagnostics === 1 ? "" : "s"}`}`;
  const heading = append(node("div"), text("h3", "Current signal"), text("p", label));
  const list = node("ul", { className: "severity-counts", attrs: { "aria-label": "Findings by severity" } });
  if (entries.length === 0) append(list, append(node("li"), text("strong", "0"), text("span", "findings")));
  for (const [severity, count] of entries) append(list, append(node("li", { className: severity }), text("strong", count), text("span", severity)));
  append(scanSummary, heading, list);
  scanSummary.hidden = false;
}
function selectedFinding() {
  return state.report?.findings.find((finding) => finding.id === state.selected) || state.lastFinding || null;
}
// The findings list is rebuilt with DOM nodes, so keep keyboard focus on the same item.
function focusedKey(container, attribute) {
  const active = document.activeElement;
  return active && container.contains(active) ? active.getAttribute(attribute) : null;
}
function restoreFocus(container, attribute, key) {
  if (key === null) return;
  const target = [...container.querySelectorAll(`[${attribute}]`)].find((element) => element.getAttribute(attribute) === key);
  if (target) target.focus();
}
// The bundled cases live in the static markup and are only updated in place, so their descriptions
// and keyboard focus survive. A loaded project is added once as one more case.
function renderFixtures(fixtures) {
  for (const fixture of fixtures) {
    let control = [...fixtureList.children].find((element) => element.dataset.fixture === fixture);
    if (!control) {
      control = node("button", { className: "fixture-button", attrs: { type: "button", "data-fixture": fixture } });
      append(fixtureList, append(control, text("strong", fixtureNames[fixture] || fixture), text("span", "", { className: "fixture-note" })));
    }
    if (fixture === LOCAL_PROJECT) control.querySelector(".fixture-note").textContent = localLabel;
    control.disabled = !engineReady;
    control.setAttribute("aria-pressed", String(fixture === state.fixture));
  }
}
function renderControls() {
  const enabled = state.fixture !== null && !state.busy;
  scanButton.disabled = !enabled;
  resetButton.disabled = !enabled;
  exportButton.disabled = !state.report || state.busy;
  severityFilter.disabled = !state.report || state.busy;
  ruleFilter.disabled = !state.report || state.busy;
  folderButton.disabled = !engineReady || state.busy;
  pasteButton.disabled = !engineReady || state.busy;
}
// Highest risk first; the engine's file and line order breaks ties, so the list stays stable.
function byRisk(findings) {
  return findings.map((finding, index) => ({ finding, index })).sort((a, b) => (SEVERITY_RANK[a.finding.severity] - SEVERITY_RANK[b.finding.severity]) || (a.index - b.index)).map((item) => item.finding);
}
function filteredFindings() {
  if (!state.report) return [];
  return byRisk(state.report.findings).filter((finding) => (severityFilter.value === "all" || finding.severity === severityFilter.value) && (ruleFilter.value === "all" || finding.ruleId === ruleFilter.value));
}
function renderRules() {
  const current = ruleFilter.value;
  const rules = [...new Set((state.report?.findings || []).map((finding) => finding.ruleId))];
  ruleFilter.replaceChildren(node("option", { text: "All rules", attrs: { value: "all" } }));
  for (const rule of rules) append(ruleFilter, node("option", { text: rule, attrs: { value: rule } }));
  ruleFilter.value = rules.includes(current) ? current : "all";
}
function showFindingState(message) { findingState.hidden = false; findingState.textContent = message; }
function renderFindings() {
  const focused = focusedKey(findingList, "data-finding");
  findingList.replaceChildren();
  if (!state.report) { showFindingState("Choose a case, then run a scan."); return; }
  // A clean scan only means no rule matched, so the empty state says that and nothing more.
  if (state.report.findings.length === 0) { showFindingState("No rule matched these files. A clean scan is not proof that the project is secure."); return; }
  const findings = filteredFindings();
  if (findings.length === 0) { showFindingState("No findings match the selected filters."); return; }
  findingState.hidden = true;
  for (const finding of findings) {
    const control = node("button", { className: "finding-button", attrs: { type: "button", "data-finding": finding.id, "aria-current": finding.id === state.selected } });
    const meta = append(node("span", { className: "finding-meta" }), text("code", `${finding.file}:${finding.line}`), text("span", finding.attackScenarioId ? "Replay available" : "Static evidence"));
    append(control, append(node("span", { className: "finding-top" }), severityTag(finding), text("code", finding.ruleId)), text("strong", finding.title), meta);
    control.addEventListener("click", () => selectFinding(finding, control));
    append(findingList, append(node("li"), control));
  }
  restoreFocus(findingList, "data-finding", focused);
}
// Selecting only moves the marker, so the list does not replay its entrance or lose focus.
function selectFinding(finding, control) {
  state.selected = finding.id; state.lastFinding = finding; state.replay = null; state.patch = null; state.verification = null; state.error = null;
  for (const item of findingList.querySelectorAll(".finding-button")) item.setAttribute("aria-current", String(item === control));
  renderDetail();
  reveal(caseFile);
}
function diffEvidence(diff) {
  const code = node("code");
  for (const line of diff.split("\n")) {
    const className = line.startsWith("+") ? "added" : line.startsWith("-") ? "removed" : line.startsWith("@") ? "header" : "";
    append(code, text("span", line, { className }), document.createTextNode("\n"));
  }
  return append(node("pre", { className: "evidence diff" }), code);
}
function comparisonList(label, findings) {
  const list = node("ul");
  if (findings.length === 0) append(list, text("li", "None"));
  for (const finding of findings) append(list, text("li", `${finding.ruleId}: ${finding.title}`));
  return append(node("div", { className: "comparison-group" }), text("h4", `${label} (${findings.length})`), list);
}
function comparisonView(comparison) {
  if (!comparison) return undefined;
  return append(node("div", { className: "comparison", attrs: { "aria-label": "Findings compared with the first scan" } }), comparisonList("Resolved since first scan", comparison.resolved), comparisonList("Introduced since first scan", comparison.introduced));
}
function passed(verification) { return verification?.status === "Simulation blocked" || verification?.status === "Verified"; }
// The evidence trail for the selected finding: each stage names its state in words, not color alone.
function trail(finding) {
  const { replay, patch, verification } = state;
  const ok = passed(verification);
  const stages = [
    ["Scan", "done", "done"],
    ["Replay", replay ? `done ${replay.result}` : finding.attackScenarioId ? "" : "skip", replay ? replay.result : finding.attackScenarioId ? "not run" : "no scenario"],
    ["Patch", patch ? "done" : "", patch ? (verification ? "applied" : "ready to apply") : "not generated"],
    ["Verify", verification ? `done ${ok ? "pass" : "fail"}` : "", verification ? (ok ? "passed" : verification.status === "Regression detected" ? "regression" : "needs review") : "not run"],
  ];
  return append(node("ol", { className: "trail", attrs: { "aria-label": "Evidence trail" } }), stages.map(([label, status, note]) => append(node("li", { className: status }), text("strong", label), text("span", note))));
}
function renderDetail() {
  const finding = selectedFinding();
  detail.replaceChildren();
  detailState.hidden = Boolean(finding);
  if (!finding) return;
  const replay = state.replay;
  const patch = state.patch;
  const verification = state.verification;
  append(detail,
    section([
      append(node("p", { className: "case-meta" }), severityTag(finding), text("code", finding.ruleId), text("span", `${finding.file}:${finding.line}`), text("span", `Confidence: ${finding.confidence}`)),
      text("h3", finding.title, { className: "case-title" }),
      text("p", finding.description),
      trail(finding),
      evidence(finding.evidence),
    ]),
    section([
      text("h3", "Recommended boundary"),
      text("p", finding.remediation),
      append(node("div", { className: "detail-actions" }), ...(finding.attackScenarioId ? [button("Run safe replay", "quiet-button", runReplay, { id: "replay-button" })] : []), button("Generate patch", "primary-button", generatePatch, { id: "patch-button" })),
    ]),
  );
  if (replay) {
    const trace = node("ol", { className: "trace" });
    replay.steps.forEach((step, index) => append(trace, append(node("li", index === replay.steps.length - 1 ? { className: replay.result } : {}), text("strong", step.label), text("span", step.detail))));
    append(detail, section([text("h3", replay.scenarioName), text("p", `Capability request: ${replay.capabilityRequest}. Policy decision: ${replay.policyDecision}. Result: ${replay.result}.`, { className: "muted" }), trace, text("p", replay.safetyNotice, { className: "boundary-note" })]));
  }
  if (patch) append(detail, section([text("h3", "Proposed patch"), text("p", patch.reason), text("p", `Review note: ${patch.riskNote}`, { className: "muted" }), diffEvidence(patch.diff), append(node("div", { className: "detail-actions" }), button("Apply to isolated copy", "primary-button", applyPatch, { id: "apply-button" }))]));
  if (verification) append(detail, section([
    text("span", verification.status, { className: `verification-status ${passed(verification) ? "success" : "review"}` }),
    text("h3", "Verification report"),
    text("p", `Target finding present after patch: ${verification.targetFindingPresent ? "Yes" : "No"}. High/Critical findings: ${verification.highCriticalBefore} before, ${verification.highCriticalAfter} after.`),
    verification.replay ? text("p", `Replay result after patch: ${verification.replay.result}.`) : undefined,
    comparisonView(verification.comparison),
  ]));
  if (state.error) append(detail.lastElementChild, text("p", state.error, { className: "inline-error" }));
}
async function chooseFixture(fixture) {
  state.fixture = fixture; state.report = null; state.selected = null; state.lastFinding = null; state.replay = null; state.patch = null; state.verification = null;
  setStatus(`${fixtureNames[fixture]} selected. Run a scan when ready.`); renderSourceContext(); renderScanSummary(); renderFixtures(sources); renderControls(); renderFindings(); renderDetail();
}
async function runScan(reset = false) {
  if (!state.fixture) return;
  let scanned = false;
  try {
    setBusy(true, reset ? "Resetting the isolated copy and scanning it." : "Scanning the selected case.");
    const value = await request(reset ? "/api/reset" : "/api/scan", { fixture: state.fixture });
    const count = value.report.findings.length;
    state.report = value.report; const first = byRisk(value.report.findings)[0]; state.selected = first?.id || null; state.lastFinding = first || null; state.replay = null; state.patch = null; state.verification = null;
    renderRules(); renderScanSummary(); scanned = true;
    setStatus(`Scan complete. ${count} evidence-based finding${count === 1 ? " is" : "s are"} available.`, "success");
  }
  catch (error) { setStatus(error.message, "error"); }
  finally { setBusy(false); renderFindings(); renderDetail(); if (scanned) reveal(board); }
}
// Replay, patch, and verify each add a section to the case file; show the newest one.
function revealLatest(done) { if (done && detail.lastElementChild) reveal(detail.lastElementChild); }
async function runReplay() {
  const finding = selectedFinding(); if (!finding?.attackScenarioId || !state.fixture) return;
  let done = false;
  try { setBusy(true, "Replaying the bounded attack scenario."); const value = await request("/api/replay", { fixture: state.fixture, scenarioId: finding.attackScenarioId }); state.replay = value.replay; done = true; setStatus(`Replay complete: ${value.replay.result}.`, value.replay.result === "blocked" ? "success" : "error"); }
  catch (error) { fail(error); }
  finally { setBusy(false); renderDetail(); revealLatest(done); }
}
async function generatePatch() {
  const finding = selectedFinding(); if (!finding || !state.fixture) return;
  let done = false;
  try { setBusy(true, "Generating a minimal allowlisted patch."); const value = await request("/api/patch/generate", { fixture: state.fixture, findingId: finding.id }); state.patch = value.patch; state.verification = null; done = true; setStatus("Patch generated. Review the diff before applying it.", "success"); }
  catch (error) { fail(error); }
  finally { setBusy(false); renderDetail(); revealLatest(done); }
}
async function applyPatch() {
  if (!state.patch || !state.fixture) return;
  let done = false;
  try { setBusy(true, "Applying the patch to the isolated copy and verifying it."); const value = await request("/api/patch/apply", { fixture: state.fixture, patchId: state.patch.id }); state.report = value.report; state.verification = { ...value.verification, comparison: value.comparison }; state.replay = value.verification.replay || null; renderRules(); renderScanSummary(); done = true; setStatus(`Verification complete: ${value.verification.status}.`, value.verification.status === "Needs review" || value.verification.status === "Regression detected" ? "error" : "success"); }
  catch (error) { fail(error); }
  finally { setBusy(false); renderFindings(); renderDetail(); revealLatest(done); }
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
// Local load results also appear under the controls that caused them, not only in the header.
function localNote(message, kind = "") {
  localSummary.hidden = false;
  localSummary.textContent = message;
  localSummary.dataset.kind = kind;
}
// The visitor's own files: read and validated in the worker, and never sent anywhere.
async function loadLocalProject(type, body, label) {
  setBusy(true, "Reading your .kiro files in this tab.");
  try {
    const value = await send(type, body);
    sources = value.fixtures;
    localLabel = typeof label === "function" ? label(value) : label;
    localNote(`${value.files} file${value.files === 1 ? "" : "s"} loaded from .kiro/. Reload the page to clear them.`);
  } catch (error) {
    const message = error.message || "Your files could not be loaded.";
    setStatus(message, "error");
    localNote(message, "error");
    return;
  } finally {
    setBusy(false);
  }
  await chooseFixture(LOCAL_PROJECT);
  await runScan(false);
}
async function loadChosenFolder() {
  // File handles are passed to the worker, which picks the .kiro text files and reads them there.
  const entries = [...folderInput.files].map((file) => ({ path: file.webkitRelativePath || file.name, file }));
  folderInput.value = "";
  if (entries.length === 0) return;
  await loadLocalProject("loadFolder", { entries }, (value) => {
    const skipped = value.tooLarge === 0 ? "" : `, ${value.tooLarge} skipped as larger than 1 MB`;
    return `${value.files} .kiro file${value.files === 1 ? "" : "s"}${skipped}`;
  });
}
async function loadPastedConfig() {
  const content = pasteInput.value;
  if (content.trim() === "") { setStatus("Paste the contents of an mcp.json file first.", "error"); localNote("Paste the contents of an mcp.json file first.", "error"); pasteInput.focus(); return; }
  await loadLocalProject("loadFiles", { files: [{ path: ".kiro/settings/mcp.json", content }] }, "Pasted mcp.json");
}
function setTheme(theme) {
  const next = theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  $(".theme-label").textContent = next === "light" ? "Light theme" : "Dark theme";
  $("#theme-toggle").setAttribute("aria-label", `Switch to ${next} theme`);
  themeColor?.setAttribute("content", theme === "dark" ? "#0d0c13" : "#f3f1ec");
  try { localStorage.setItem("gravescan-theme", theme); } catch {
    // Storage can be blocked (private mode); the theme still applies to this page.
  }
}
$("#theme-toggle").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
fixtureList.addEventListener("click", (event) => { const control = event.target.closest("[data-fixture]"); if (control && !control.disabled) chooseFixture(control.dataset.fixture); });
scanButton.addEventListener("click", () => runScan(false));
resetButton.addEventListener("click", () => runScan(true));
exportButton.addEventListener("click", exportMarkdown);
folderButton.addEventListener("click", () => folderInput.click());
folderInput.addEventListener("change", loadChosenFolder);
pasteButton.addEventListener("click", loadPastedConfig);
severityFilter.addEventListener("change", renderFindings);
ruleFilter.addEventListener("change", renderFindings);
try { setTheme(localStorage.getItem("gravescan-theme") || "dark"); } catch { setTheme("dark"); }
fixturesRequest
  .then((bundle) => send("init", { bundle }))
  .then((value) => { engineReady = true; sources = value.fixtures; renderSourceContext(); renderScanSummary(); renderFixtures(sources); renderControls(); setStatus("Choose a case or your own project to begin."); })
  .catch(() => { fixtureList.replaceChildren(document.createTextNode("Fixtures could not be loaded.")); setStatus("Fixtures could not be loaded.", "error"); });
