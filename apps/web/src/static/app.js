const WORKER_URL = "/assets/engine-worker.js";
const FIXTURES_URL = "/assets/fixtures.json";
const LOCAL_PROJECT = "local-project";
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const PATCHABLE_RULES = new Set(["GRAVE-001", "GRAVE-002", "GRAVE-003", "GRAVE-004", "GRAVE-005", "GRAVE-006", "GRAVE-009", "GRAVE-010"]);
const fixturesRequest = fetch(FIXTURES_URL).then((response) => {
  if (!response.ok) throw new Error("fixtures");
  return response.json();
});
const trustedScriptUrl = window.trustedTypes?.createPolicy("gravescan", { createScriptURL: (url) => url });
const worker = new Worker(trustedScriptUrl ? trustedScriptUrl.createScriptURL(WORKER_URL) : WORKER_URL);
const pending = new Map();
let nextRequestId = 1;
let sources = [];
let engineReady = false;
let localLabel = "";

function send(type, body = {}) {
  return new Promise((resolve, reject) => {
    const id = nextRequestId++;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, type, ...body });
  });
}

function rejectPending(message) {
  for (const waiter of pending.values()) waiter.reject(new Error(message));
  pending.clear();
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
  handleWorkerFailure("The scanner stopped unexpectedly. Reload the page to try again.");
});

worker.addEventListener("messageerror", () => {
  handleWorkerFailure("The scanner could not read a response. Reload the page to try again.");
});

const state = {
  fixture: null,
  report: null,
  selected: null,
  lastFinding: null,
  replay: null,
  patch: null,
  verification: null,
  busy: false,
};

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
const loadedProjectSource = $("#loaded-project-source");
const localProjectButton = $("#local-project-button");
const sourceStageSummary = $("#source-stage-summary");
const sourceActionStatus = $("#source-action-status");
const findingList = $("#finding-list");
const findingState = $("#finding-state");
const detailState = $("#detail-state");
const detail = $("#finding-detail");
const detailActionStatus = $("#detail-action-status");
const reportActionStatus = $("#report-action-status");
const board = $(".evidence-board");
const caseFile = $(".case-file");
const scanButton = $("#scan-button");
const resetButton = $("#reset-button");
const exportButton = $("#export-button");
const severityFilter = $("#severity-filter");
const ruleFilter = $("#rule-filter");
const filterSummary = $("#filter-summary");
const clearFiltersButton = $("#clear-filters-button");
const diagnosticsDisclosure = $("#diagnostics-disclosure");
const diagnosticsSummary = $("#diagnostics-summary");
const diagnosticsList = $("#diagnostics-list");
const folderButton = $("#folder-button");
const folderInput = $("#folder-input");
const pasteInput = $("#paste-input");
const pasteButton = $("#paste-button");
const localSummary = $("#local-summary");
const sourceName = $("#source-name");
const sourceBoundary = $("#source-boundary");
const scanSummary = $("#scan-summary");
const themeColor = $('meta[name="theme-color"]');

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

function text(tag, value, options = {}) {
  return node(tag, { ...options, text: value });
}

function button(label, className, onClick, attrs = {}) {
  const control = text("button", label, { className, attrs: { type: "button", ...attrs } });
  control.addEventListener("click", onClick);
  return control;
}

function section(children) {
  return append(node("section", { className: "detail-section" }), children);
}

function evidence(content, className = "evidence") {
  return append(node("pre", { className }), node("code", { text: content }));
}

function severityTag(finding) {
  return text("span", finding.severity, { className: `severity ${finding.severity}` });
}

function messageOf(error) {
  return error instanceof Error && error.message !== "" ? error.message : "The request could not be completed.";
}

function reveal(element) {
  const top = element.getBoundingClientRect().top;
  if (top < 0 || top > window.innerHeight / 2) element.scrollIntoView({ block: "start" });
}

function setStatus(message, kind = "") {
  statusLine.textContent = message;
  if (kind === "") delete statusLine.dataset.kind;
  else statusLine.dataset.kind = kind;
}

function setNotice(element, message, kind = "") {
  element.hidden = message === "";
  element.textContent = message;
  if (kind === "") delete element.dataset.kind;
  else element.dataset.kind = kind;
}

function clearLocalNotice() {
  setNotice(localSummary, "");
}

function setBusy(busy, message) {
  state.busy = busy;
  workbench.setAttribute("aria-busy", String(busy));
  if (message) setStatus(message);
  renderControls();
}

function handleWorkerFailure(message) {
  rejectPending(message);
  engineReady = false;
  state.busy = false;
  workbench.setAttribute("aria-busy", "false");
  setStatus(message, "error");
  setNotice(sourceActionStatus, message, "error");
  renderFixtures(sources);
  renderControls();
}

function request(route, payload) {
  if (!engineReady) return Promise.reject(new Error("The scanner is still loading."));
  return send("call", { route, payload });
}

function sourceDetails() {
  if (state.fixture === LOCAL_PROJECT) {
    return { name: "Your project", boundary: "Local .kiro files stay in this tab. No upload or external service." };
  }
  if (state.fixture) {
    return { name: fixtureNames[state.fixture] || state.fixture, boundary: "Controlled example data with fake tokens only." };
  }
  return { name: "Choose a source", boundary: "Browser-local analysis. No upload." };
}

function renderSourceStageSummary() {
  if (!state.fixture) {
    sourceStageSummary.textContent = "Choose a project folder or controlled example to begin.";
    return;
  }
  if (state.fixture === LOCAL_PROJECT) {
    sourceStageSummary.textContent = state.report
      ? "Your project is active in this tab. Load another folder to replace it. Reload the page to remove local files."
      : "Your project is loaded in this tab. Run a scan when ready.";
    return;
  }
  if (state.report) {
    sourceStageSummary.textContent = `Example active: ${fixtureNames[state.fixture] || state.fixture}. Review the current findings below.`;
    return;
  }
  sourceStageSummary.textContent = `Example selected: ${fixtureNames[state.fixture] || state.fixture}. Run the selected scan to review its evidence.`;
}

function renderSourceContext() {
  const source = sourceDetails();
  sourceName.textContent = source.name;
  sourceBoundary.textContent = source.boundary;
  renderSourceStageSummary();
}

function renderScanSummary() {
  scanSummary.replaceChildren();
  if (!state.report) {
    scanSummary.hidden = true;
    return;
  }
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of state.report.findings) counts[finding.severity] += 1;
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  const diagnostics = state.report.diagnostics.length;
  const findingLabel = `${state.report.findings.length} finding${state.report.findings.length === 1 ? "" : "s"}`;
  const diagnosticLabel = diagnostics === 0 ? "No parse diagnostics." : `${diagnostics} parse diagnostic${diagnostics === 1 ? "" : "s"} available below.`;
  const heading = append(node("div"), text("h3", "Current scan"), text("p", `${findingLabel}. ${diagnosticLabel}`));
  const list = node("ul", { className: "severity-counts", attrs: { "aria-label": "Findings by severity" } });
  if (entries.length === 0) append(list, append(node("li"), text("strong", "0"), text("span", "findings")));
  for (const [severity, count] of entries) append(list, append(node("li", { className: severity }), text("strong", count), text("span", severity)));
  append(scanSummary, heading, list);
  scanSummary.hidden = false;
}

function renderDiagnostics() {
  diagnosticsList.replaceChildren();
  const diagnostics = state.report?.diagnostics || [];
  diagnosticsDisclosure.hidden = diagnostics.length === 0;
  if (diagnostics.length === 0) {
    diagnosticsDisclosure.open = false;
    return;
  }
  diagnosticsSummary.textContent = `${diagnostics.length} parse diagnostic${diagnostics.length === 1 ? "" : "s"}`;
  for (const diagnostic of diagnostics) {
    const location = `${diagnostic.file}:${diagnostic.line}`;
    append(
      diagnosticsList,
      append(
        node("li", { className: "diagnostic-item" }),
        append(node("p", { className: "diagnostic-meta" }), text("code", diagnostic.code), text("code", location)),
        text("p", diagnostic.message),
      ),
    );
  }
}

function selectedFinding() {
  const current = state.report?.findings.find((finding) => finding.id === state.selected) || null;
  if (current) return { finding: current, current: true };
  if (state.lastFinding) return { finding: state.lastFinding, current: false };
  return null;
}

function focusedKey(container, attribute) {
  const active = document.activeElement;
  return active && container.contains(active) ? active.getAttribute(attribute) : null;
}

function restoreFocus(container, attribute, key) {
  if (key === null) return;
  const target = [...container.querySelectorAll(`[${attribute}]`)].find((element) => element.getAttribute(attribute) === key);
  if (target) target.focus();
}

function updateSourceButton(control, fixture) {
  control.disabled = !engineReady;
  control.setAttribute("aria-pressed", String(fixture === state.fixture));
}

function renderFixtures(fixtures) {
  for (const fixture of fixtures.filter((item) => item !== LOCAL_PROJECT)) {
    let control = fixtureList.querySelector(`[data-fixture="${fixture}"]`);
    if (!control) {
      control = node("button", { className: "fixture-button", attrs: { type: "button", "data-fixture": fixture } });
      append(control, text("strong", fixtureNames[fixture] || fixture), text("span", "", { className: "fixture-note" }), text("code", fixture));
      fixtureList.append(control);
    }
    updateSourceButton(control, fixture);
  }

  const localAvailable = fixtures.includes(LOCAL_PROJECT);
  loadedProjectSource.hidden = !localAvailable;
  if (localAvailable) {
    updateSourceButton(localProjectButton, LOCAL_PROJECT);
    localProjectButton.querySelector(".fixture-note").textContent = localLabel || "Validated .kiro files loaded in this tab.";
  }
}

function renderControls() {
  const enabled = engineReady && state.fixture !== null && !state.busy;
  scanButton.disabled = !enabled;
  scanButton.textContent = state.fixture === LOCAL_PROJECT ? "Scan current project" : state.fixture ? "Run example scan" : "Run selected scan";
  resetButton.disabled = !enabled;
  resetButton.textContent = state.fixture === LOCAL_PROJECT ? "Reset local copy" : "Reset isolated copy";
  exportButton.disabled = !state.report || state.busy;
  severityFilter.disabled = !state.report || state.busy;
  ruleFilter.disabled = !state.report || state.busy;
  clearFiltersButton.disabled = !state.report || state.busy;
  folderButton.disabled = !engineReady || state.busy;
  pasteButton.disabled = !engineReady || state.busy;
}

function byRisk(findings) {
  return findings
    .map((finding, index) => ({ finding, index }))
    .sort((a, b) => (SEVERITY_RANK[a.finding.severity] - SEVERITY_RANK[b.finding.severity]) || (a.index - b.index))
    .map((item) => item.finding);
}

function filteredFindings() {
  if (!state.report) return [];
  return byRisk(state.report.findings).filter((finding) => (
    (severityFilter.value === "all" || finding.severity === severityFilter.value)
    && (ruleFilter.value === "all" || finding.ruleId === ruleFilter.value)
  ));
}

function filtersActive() {
  return severityFilter.value !== "all" || ruleFilter.value !== "all";
}

function renderFilterSummary() {
  if (!state.report) {
    filterSummary.hidden = true;
    clearFiltersButton.hidden = true;
    return;
  }
  const visible = filteredFindings().length;
  const total = state.report.findings.length;
  filterSummary.hidden = false;
  filterSummary.textContent = `${visible} of ${total} finding${total === 1 ? "" : "s"} shown.`;
  clearFiltersButton.hidden = !filtersActive();
}

function renderRules() {
  const current = ruleFilter.value;
  const rules = [...new Set((state.report?.findings || []).map((finding) => finding.ruleId))];
  ruleFilter.replaceChildren(node("option", { text: "All rules", attrs: { value: "all" } }));
  for (const rule of rules) append(ruleFilter, node("option", { text: rule, attrs: { value: rule } }));
  ruleFilter.value = rules.includes(current) ? current : "all";
}

function showFindingState(message, kind = "") {
  findingState.hidden = false;
  findingState.textContent = message;
  if (kind === "") delete findingState.dataset.kind;
  else findingState.dataset.kind = kind;
}

function renderFindings() {
  const focused = focusedKey(findingList, "data-finding");
  findingList.replaceChildren();
  renderFilterSummary();
  if (!state.report) {
    showFindingState("Choose a project folder or example, then run a scan.");
    return;
  }
  if (state.report.findings.length === 0) {
    showFindingState("No rule matched these files. A clean scan is not proof that the project is secure.");
    return;
  }
  const findings = filteredFindings();
  if (findings.length === 0) {
    showFindingState("No findings match the selected filters. Clear filters to review all current findings.");
    return;
  }
  findingState.hidden = true;
  delete findingState.dataset.kind;
  for (const finding of findings) {
    const control = node("button", { className: "finding-button", attrs: { type: "button", "data-finding": finding.id, "aria-current": String(finding.id === state.selected) } });
    const capability = finding.attackScenarioId ? "Safe replay available" : "Static evidence";
    const meta = append(
      node("span", { className: "finding-meta" }),
      text("code", `${finding.file}:${finding.line}`),
      text("span", capability),
    );
    append(control, append(node("span", { className: "finding-top" }), severityTag(finding), text("code", finding.ruleId)), text("strong", finding.title), meta);
    control.addEventListener("click", () => selectFinding(finding, control));
    append(findingList, append(node("li"), control));
  }
  restoreFocus(findingList, "data-finding", focused);
}

function resetFindingWorkflow() {
  state.replay = null;
  state.patch = null;
  state.verification = null;
  setNotice(detailActionStatus, "");
}

function selectFinding(finding, control) {
  state.selected = finding.id;
  state.lastFinding = finding;
  resetFindingWorkflow();
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
  return append(
    node("div", { className: "comparison", attrs: { "aria-label": "Findings compared with the first scan" } }),
    comparisonList("Resolved since first scan", comparison.resolved),
    comparisonList("Introduced since first scan", comparison.introduced),
  );
}

function passed(verification) {
  return verification?.status === "Simulation blocked" || verification?.status === "Verified";
}

function trail(finding, current) {
  const { replay, patch, verification } = state;
  const patchable = PATCHABLE_RULES.has(finding.ruleId);
  const verified = passed(verification);
  const stages = [
    ["Scan", "done", current ? "current evidence" : "baseline evidence"],
    ["Replay", replay ? `done ${replay.result}` : finding.attackScenarioId ? "" : "skip", replay ? replay.result : finding.attackScenarioId ? "not run" : "static evidence"],
    ["Patch", patch ? "done" : patchable && current ? "" : "skip", patch ? (verification ? "applied to isolated copy" : "ready to review") : patchable && current ? "not generated" : "manual remediation"],
    ["Verify", verification ? `done ${verified ? "pass" : "fail"}` : "", verification ? (verified ? "passed" : verification.status === "Regression detected" ? "regression" : "needs review") : "not run"],
  ];
  return append(node("ol", { className: "trail", attrs: { "aria-label": "Evidence trail" } }), stages.map(([label, status, note]) => append(node("li", { className: status }), text("strong", label), text("span", note))));
}

function actionAvailability(finding, current) {
  if (!current) return "The finding above is baseline evidence. Its current verification appears below.";
  if (!finding.attackScenarioId && !PATCHABLE_RULES.has(finding.ruleId)) {
    return "Static evidence only. A safe replay is not available for this rule. No safe automatic patch is available for this finding. Apply the recommended boundary manually.";
  }
  if (!PATCHABLE_RULES.has(finding.ruleId)) return "No safe automatic patch is available for this finding. Apply the recommended boundary manually.";
  if (!finding.attackScenarioId) return "Static evidence only. A safe replay is not available for this rule.";
  return "A safe replay is available. A patch can be proposed only through the allowlisted patcher.";
}

function renderDetail() {
  const selection = selectedFinding();
  detail.replaceChildren();
  detailState.hidden = Boolean(selection);
  if (!selection) return;

  const { finding, current } = selection;
  const replay = state.replay;
  const patch = state.patch;
  const verification = state.verification;
  const patchable = PATCHABLE_RULES.has(finding.ruleId);
  const actions = [];
  if (current && finding.attackScenarioId) actions.push(button("Run safe replay", "quiet-button", runReplay, { id: "replay-button" }));
  if (current && patchable) actions.push(button("Propose safe patch", "primary-button", generatePatch, { id: "patch-button" }));

  append(
    detail,
    section([
      append(node("p", { className: "case-meta" }), severityTag(finding), text("code", finding.ruleId), text("span", `${finding.file}:${finding.line}`), text("span", `Confidence: ${finding.confidence}`), text("span", current ? "Current scan" : "Baseline scan")),
      text("h3", finding.title, { className: "case-title" }),
      text("p", finding.description),
      trail(finding, current),
      evidence(finding.evidence),
    ]),
    section([
      text("h3", "Recommended boundary"),
      text("p", finding.remediation),
      text("p", actionAvailability(finding, current), { className: "action-availability" }),
      actions.length > 0 ? append(node("div", { className: "detail-actions" }), actions) : undefined,
    ]),
  );

  if (replay) {
    const trace = node("ol", { className: "trace" });
    replay.steps.forEach((step, index) => append(trace, append(node("li", index === replay.steps.length - 1 ? { className: replay.result } : {}), text("strong", step.label), text("span", step.detail))));
    append(detail, section([text("h3", replay.scenarioName), text("p", `Capability request: ${replay.capabilityRequest}. Policy decision: ${replay.policyDecision}. Result: ${replay.result}.`, { className: "muted" }), trace, text("p", replay.safetyNotice, { className: "boundary-note" })]));
  }

  if (patch) {
    append(detail, section([
      text("h3", "Proposed patch"),
      text("p", patch.reason),
      text("p", `Review note: ${patch.riskNote}`, { className: "muted" }),
      diffEvidence(patch.diff),
      verification ? undefined : append(node("div", { className: "detail-actions" }), button("Apply to isolated copy", "primary-button", applyPatch, { id: "apply-button" })),
    ]));
  }

  if (verification) {
    append(detail, section([
      text("span", verification.status, { className: `verification-status ${passed(verification) ? "success" : "review"}` }),
      text("h3", "Verification report"),
      text("p", `Target finding present after patch: ${verification.targetFindingPresent ? "Yes" : "No"}. High/Critical findings: ${verification.highCriticalBefore} before, ${verification.highCriticalAfter} after.`),
      verification.replay ? text("p", `Replay result after patch: ${verification.replay.result}.`) : undefined,
      comparisonView(verification.comparison),
    ]));
  }
}

async function chooseFixture(fixture) {
  state.fixture = fixture;
  state.report = null;
  state.selected = null;
  state.lastFinding = null;
  resetFindingWorkflow();
  setNotice(sourceActionStatus, "");
  setNotice(reportActionStatus, "");
  if (fixture !== LOCAL_PROJECT && localSummary.dataset.kind === "error") clearLocalNotice();
  setStatus(`${fixtureNames[fixture] || fixture} selected. Run a scan when ready.`);
  renderSourceContext();
  renderScanSummary();
  renderDiagnostics();
  renderFixtures(sources);
  renderControls();
  renderFindings();
  renderDetail();
}

async function runScan(reset = false) {
  if (!state.fixture) return;
  let scanned = false;
  setNotice(sourceActionStatus, "");
  setNotice(reportActionStatus, "");
  setNotice(detailActionStatus, "");
  try {
    setBusy(true, reset ? "Resetting the isolated copy and scanning it." : "Scanning the selected source.");
    const value = await request(reset ? "/api/reset" : "/api/scan", { fixture: state.fixture });
    const count = value.report.findings.length;
    state.report = value.report;
    const first = byRisk(value.report.findings)[0] || null;
    state.selected = first?.id || null;
    state.lastFinding = first;
    resetFindingWorkflow();
    renderRules();
    renderSourceContext();
    renderScanSummary();
    renderDiagnostics();
    scanned = true;
    const message = `Scan complete. ${count} evidence-based finding${count === 1 ? " is" : "s are"} available.`;
    setStatus(message, "success");
    setNotice(sourceActionStatus, `${message} Review the current findings below.`, "success");
  } catch (error) {
    const message = messageOf(error);
    setStatus(message, "error");
    setNotice(sourceActionStatus, message, "error");
  } finally {
    setBusy(false);
    renderFindings();
    renderDetail();
    if (scanned) reveal(board);
  }
}

function revealLatest(done) {
  if (done && detail.lastElementChild) reveal(detail.lastElementChild);
}

async function runReplay() {
  const selection = selectedFinding();
  if (!selection?.current || !selection.finding.attackScenarioId || !state.fixture) return;
  let done = false;
  setNotice(detailActionStatus, "");
  try {
    setBusy(true, "Replaying the bounded attack scenario.");
    const value = await request("/api/replay", { fixture: state.fixture, scenarioId: selection.finding.attackScenarioId });
    state.replay = value.replay;
    done = true;
    const kind = value.replay.result === "blocked" ? "success" : "error";
    const message = `Replay complete: ${value.replay.result}.`;
    setStatus(message, kind);
    setNotice(detailActionStatus, message, kind);
  } catch (error) {
    const message = messageOf(error);
    setStatus(message, "error");
    setNotice(detailActionStatus, message, "error");
  } finally {
    setBusy(false);
    renderDetail();
    revealLatest(done);
  }
}

async function generatePatch() {
  const selection = selectedFinding();
  if (!selection?.current || !PATCHABLE_RULES.has(selection.finding.ruleId) || !state.fixture) return;
  let done = false;
  setNotice(detailActionStatus, "");
  try {
    setBusy(true, "Generating a minimal allowlisted patch.");
    const value = await request("/api/patch/generate", { fixture: state.fixture, findingId: selection.finding.id });
    state.patch = value.patch;
    state.verification = null;
    done = true;
    const message = "Patch generated. Review the diff before applying it.";
    setStatus(message, "success");
    setNotice(detailActionStatus, message, "success");
  } catch (error) {
    const message = messageOf(error);
    setStatus(message, "error");
    setNotice(detailActionStatus, message, "error");
  } finally {
    setBusy(false);
    renderDetail();
    revealLatest(done);
  }
}

async function applyPatch() {
  if (!state.patch || !state.fixture) return;
  let done = false;
  setNotice(detailActionStatus, "");
  try {
    setBusy(true, "Applying the patch to the isolated copy and verifying it.");
    const value = await request("/api/patch/apply", { fixture: state.fixture, patchId: state.patch.id });
    state.report = value.report;
    state.verification = { ...value.verification, comparison: value.comparison };
    state.replay = value.verification.replay || null;
    renderRules();
    renderSourceContext();
    renderScanSummary();
    renderDiagnostics();
    done = true;
    const failed = value.verification.status === "Needs review" || value.verification.status === "Regression detected";
    const message = `Verification complete: ${value.verification.status}.`;
    setStatus(message, failed ? "error" : "success");
    setNotice(detailActionStatus, message, failed ? "error" : "success");
  } catch (error) {
    const message = messageOf(error);
    setStatus(message, "error");
    setNotice(detailActionStatus, message, "error");
  } finally {
    setBusy(false);
    renderFindings();
    renderDetail();
    revealLatest(done);
  }
}

async function exportMarkdown() {
  if (!state.report || !state.fixture) return;
  setNotice(reportActionStatus, "");
  try {
    setBusy(true, "Building the before/after report.");
    const value = await request("/api/report", { fixture: state.fixture });
    const blob = new Blob([value.markdown], { type: "text/markdown" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = value.filename;
    link.click();
    URL.revokeObjectURL(url);
    const message = "Markdown report exported with before and after findings.";
    setStatus(message, "success");
    setNotice(reportActionStatus, message, "success");
  } catch (error) {
    const message = messageOf(error);
    setStatus(message, "error");
    setNotice(reportActionStatus, message, "error");
  } finally {
    setBusy(false);
  }
}

function localNote(message, kind = "") {
  setNotice(localSummary, message, kind);
}

async function loadLocalProject(type, body, label) {
  let loaded = false;
  setNotice(sourceActionStatus, "");
  setNotice(reportActionStatus, "");
  setNotice(detailActionStatus, "");
  try {
    setBusy(true, "Reading your .kiro files in this tab.");
    const value = await send(type, body);
    sources = value.fixtures;
    localLabel = typeof label === "function" ? label(value) : label;
    localNote(`${value.files} file${value.files === 1 ? "" : "s"} loaded from .kiro/. Load another folder to replace them. Reload the page to remove them.`);
    if (type === "loadFiles") pasteInput.value = "";
    loaded = true;
  } catch (error) {
    const message = messageOf(error);
    setStatus(message, "error");
    localNote(message, "error");
  } finally {
    setBusy(false);
  }
  if (!loaded) return;
  await chooseFixture(LOCAL_PROJECT);
  await runScan(false);
}

async function loadChosenFolder() {
  const entries = [...folderInput.files].map((file) => ({ path: file.webkitRelativePath || file.name, file }));
  folderInput.value = "";
  if (entries.length === 0) return;
  await loadLocalProject("loadFolder", { entries }, (value) => {
    const skipped = value.tooLarge === 0 ? "" : `, ${value.tooLarge} skipped because it is larger than 1 MiB`;
    return `${value.files} .kiro file${value.files === 1 ? "" : "s"}${skipped}`;
  });
}

async function loadPastedConfig() {
  const content = pasteInput.value;
  if (content.trim() === "") {
    const message = "Paste the contents of an mcp.json file first.";
    setStatus(message, "error");
    localNote(message, "error");
    pasteInput.focus();
    return;
  }
  await loadLocalProject("loadFiles", { files: [{ path: ".kiro/settings/mcp.json", content }] }, "Pasted mcp.json");
}

function clearFilters() {
  severityFilter.value = "all";
  ruleFilter.value = "all";
  renderFindings();
}

function setTheme(theme) {
  const next = theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  $(".theme-label").textContent = next === "light" ? "Light theme" : "Dark theme";
  $("#theme-toggle").setAttribute("aria-label", `Switch to ${next} theme`);
  themeColor?.setAttribute("content", theme === "dark" ? "#10100f" : "#e3d8cf");
  try {
    localStorage.setItem("gravescan-theme", theme);
  } catch {
    // Theme preference is optional when browser storage is unavailable.
  }
}

$("#theme-toggle").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
fixtureList.addEventListener("click", (event) => {
  const control = event.target.closest("[data-fixture]");
  if (control && !control.disabled) chooseFixture(control.dataset.fixture);
});
localProjectButton.addEventListener("click", () => {
  if (!localProjectButton.disabled) chooseFixture(LOCAL_PROJECT);
});
scanButton.addEventListener("click", () => runScan(false));
resetButton.addEventListener("click", () => runScan(true));
exportButton.addEventListener("click", exportMarkdown);
clearFiltersButton.addEventListener("click", clearFilters);
folderButton.addEventListener("click", () => folderInput.click());
folderInput.addEventListener("change", loadChosenFolder);
pasteButton.addEventListener("click", loadPastedConfig);
severityFilter.addEventListener("change", renderFindings);
ruleFilter.addEventListener("change", renderFindings);

try {
  setTheme(localStorage.getItem("gravescan-theme") || "dark");
} catch {
  setTheme("dark");
}

renderSourceContext();
renderScanSummary();
renderDiagnostics();
renderFilterSummary();
fixturesRequest
  .then((bundle) => send("init", { bundle }))
  .then((value) => {
    engineReady = true;
    sources = value.fixtures;
    renderSourceContext();
    renderScanSummary();
    renderDiagnostics();
    renderFixtures(sources);
    renderControls();
    renderFindings();
    setStatus("Choose a project folder or controlled example to begin.");
  })
  .catch(() => {
    fixtureList.replaceChildren(document.createTextNode("Fixtures could not be loaded."));
    setStatus("Fixtures could not be loaded.", "error");
    setNotice(sourceActionStatus, "Fixtures could not be loaded. Reload the page to try again.", "error");
  });
