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
let engineError = "";
let localLabel = "";
let busyTimer = 0;

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
  actionError: null,
  busy: false,
};

const fixtureNames = {
  "unsafe-mcp": "Unsafe MCP",
  "unbounded-hook": "Unbounded hook",
  "steering-injection": "Steering injection",
  [LOCAL_PROJECT]: "Your project",
};

// Stage markers pair each state with a shape, so the trail never depends on color alone.
// Done and success markers draw their check mark in CSS, because not every system font has one.
const MARKS = { done: "", success: "", danger: "!", skip: "−" };

const $ = (selector) => document.querySelector(selector);
const topbar = $(".topbar");
const workbench = $("#workbench");
const statusLine = $("#status-line");
const fixtureList = $("#fixture-list");
const loadedProjectSource = $("#loaded-project-source");
const localProjectButton = $("#local-project-button");
const sourceStageSummary = $("#source-stage-summary");
const sourceActionStatus = $("#source-action-status");
const evidenceHeading = $("#evidence-heading");
const triageContext = $("#triage-context");
const findingList = $("#finding-list");
const findingState = $("#finding-state");
const detailState = $("#detail-state");
const detailEmptyLead = $("#detail-empty-lead");
const detailEmptyNote = $("#detail-empty-note");
const detail = $("#finding-detail");
const caseFile = $(".case-file");
const board = $(".evidence-board");
const backButton = $("#back-button");
const reportActionStatus = $("#report-action-status");
const scanButton = $("#scan-button");
const resetButton = $("#reset-button");
const exportButton = $("#export-button");
const filterPanel = $("#filter-panel");
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
const pasteError = $("#paste-error");
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
  for (const child of children.flat(Infinity)) if (child !== undefined && child !== null && child !== false) parent.append(child);
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

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function note(value) {
  return text("p", value, { className: "stage-note" });
}

// Long machine text scrolls inside its own region. The region is focusable so keyboard users can scroll it.
function codeBlock(label, className, code) {
  return append(node("pre", { className, attrs: { tabindex: 0, role: "region", "aria-label": label } }), code);
}

function severityTag(finding) {
  return text("span", finding.severity, { className: `severity ${finding.severity}` });
}

function messageOf(error) {
  return error instanceof Error && error.message !== "" ? error.message : "The request could not be completed.";
}

function headerOffset() {
  return window.getComputedStyle(topbar).position === "sticky" ? topbar.offsetHeight : 0;
}

// Scroll padding and the sticky queue use the header's real height, which grows with enlarged text.
function measureHeader() {
  document.documentElement.style.setProperty("--header", `${headerOffset()}px`);
}

// A scroll still in motion, such as the browser bringing a just-focused control into view, would carry
// the target away after the position check, so a moving page always gets an explicit scroll.
let lastScroll = 0;
window.addEventListener("scroll", () => { lastScroll = window.performance.now(); }, { passive: true });

// A new result scrolls near the top of the view. A control the visitor returns to only scrolls when hidden.
function reveal(element, nearest = false) {
  const box = element.getBoundingClientRect();
  const moving = window.performance.now() - lastScroll < 150;
  const away = nearest ? box.top < headerOffset() || box.bottom > window.innerHeight : box.top < headerOffset() || box.top > window.innerHeight * 0.6;
  if (moving || away) element.scrollIntoView({ block: nearest ? "nearest" : "start" });
  return moving || away;
}

// Focus follows the result the visitor just caused, so a keyboard or screen-reader user is never left
// on a control that was replaced or on content that moved out of view. A scroll the browser starts for the
// activated control (assistive technology can focus and click in one step) may not have moved yet, so a
// target that looked in place is checked once more.
let guidedFocus = false;
function focusTarget(element, { show = element, nearest = false } = {}) {
  if (!element) return;
  if (!reveal(show, nearest)) window.setTimeout(() => { if (document.activeElement === element) reveal(show, nearest); }, 150);
  guidedFocus = true;
  element.focus({ preventScroll: true });
  guidedFocus = false;
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

function localNote(message, kind = "") {
  setNotice(localSummary, message, kind);
}

// Paste problems appear beside the field and mark it invalid; folder results appear beside the folder button.
function pasteNote(message) {
  setNotice(pasteError, message, message ? "error" : "");
  if (message) pasteInput.setAttribute("aria-invalid", "true");
  else pasteInput.removeAttribute("aria-invalid");
}

// Work is serialized in the Worker. While a request runs, handlers ignore new actions instead of
// disabling every control, so fast actions do not make the page flicker. Slow work relabels its control.
function setBusy(busy, message, control, label) {
  state.busy = busy;
  workbench.setAttribute("aria-busy", String(busy));
  window.clearTimeout(busyTimer);
  if (busy && control && label) busyTimer = window.setTimeout(() => { control.textContent = label; }, 250);
  if (message) setStatus(message);
  if (!busy) renderControls();
}

function handleWorkerFailure(message) {
  rejectPending(message);
  engineReady = false;
  engineError = message;
  setBusy(false);
  setStatus(message, "error");
  setNotice(sourceActionStatus, message, "error");
  renderFixtures(sources);
}

function request(route, payload) {
  if (!engineReady) return Promise.reject(new Error(engineError || "The scanner is still loading."));
  return send("call", { route, payload });
}

function sourceDetails() {
  if (state.fixture === LOCAL_PROJECT) {
    return { name: "Your project", boundary: "Local .kiro files stay in this tab. No upload or external service." };
  }
  if (state.fixture) {
    return { name: fixtureNames[state.fixture] || state.fixture, boundary: "Controlled example data with fake tokens only." };
  }
  return null;
}

function renderSourceContext() {
  const source = sourceDetails();
  triageContext.hidden = !state.report || !source;
  if (!source) {
    sourceStageSummary.textContent = "None yet. Choose a project folder or a controlled example.";
    return;
  }
  sourceName.textContent = source.name;
  sourceBoundary.textContent = source.boundary;
  sourceStageSummary.replaceChildren(text("strong", `${source.name}.`), ` ${source.boundary}${state.report ? " Scanned. Review the findings below." : ""}`);
}

function renderScanSummary() {
  scanSummary.replaceChildren();
  scanSummary.hidden = !state.report;
  if (!state.report) return;
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of state.report.findings) counts[finding.severity] += 1;
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  const diagnostics = state.report.diagnostics.length;
  const list = node("ul", { className: "severity-counts", attrs: { "aria-label": "Findings by severity" } });
  if (entries.length === 0) append(list, append(node("li"), text("strong", "0"), text("span", "findings")));
  for (const [severity, count] of entries) append(list, append(node("li", { className: severity }), text("strong", count), text("span", severity)));
  append(
    scanSummary,
    text("h3", "Current scan"),
    text("p", `${plural(state.report.findings.length, "finding")}. ${diagnostics === 0 ? "No parse diagnostics." : `${plural(diagnostics, "parse diagnostic")} below.`}`),
    list,
  );
}

function renderDiagnostics() {
  diagnosticsList.replaceChildren();
  const diagnostics = state.report?.diagnostics || [];
  diagnosticsDisclosure.hidden = diagnostics.length === 0;
  if (diagnostics.length === 0) {
    diagnosticsDisclosure.open = false;
    return;
  }
  diagnosticsSummary.textContent = plural(diagnostics.length, "parse diagnostic");
  for (const diagnostic of diagnostics) {
    append(
      diagnosticsList,
      append(
        node("li", { className: "diagnostic-item" }),
        append(node("p", { className: "diagnostic-meta" }), text("code", diagnostic.code), text("code", `${diagnostic.file}:${diagnostic.line}`)),
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
      control = node("button", { className: "source-option fixture-button", attrs: { type: "button", "data-fixture": fixture } });
      append(control, node("span", { className: "option-marker", attrs: { "aria-hidden": "true" } }), append(node("span", { className: "option-body" }), text("strong", fixtureNames[fixture] || fixture), text("code", fixture)));
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

function emphasize(control, primary) {
  control.classList.toggle("primary-button", primary);
  control.classList.toggle("quiet-button", !primary);
}

function renderControls() {
  const selected = state.fixture !== null;
  const scanned = Boolean(state.report);
  scanButton.disabled = !engineReady || !selected;
  scanButton.textContent = state.fixture === LOCAL_PROJECT ? "Scan current project" : selected ? "Run example scan" : "Scan selected source";
  resetButton.disabled = !engineReady || !scanned;
  resetButton.textContent = state.fixture === LOCAL_PROJECT ? "Reset local copy" : "Reset isolated copy";
  // One primary action per stage: the folder picker until a source is chosen, then that source's scan.
  emphasize(folderButton, !selected);
  emphasize(scanButton, selected && !scanned);
  folderButton.textContent = "Choose project folder";
  pasteButton.textContent = "Scan pasted mcp.json";
  folderButton.disabled = !engineReady;
  pasteButton.disabled = !engineReady;
  exportButton.disabled = !scanned;
  severityFilter.disabled = !scanned;
  ruleFilter.disabled = !scanned;
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
  const total = state.report?.findings.length || 0;
  filterPanel.hidden = total === 0;
  if (total === 0) return;
  const visible = filteredFindings().length;
  filterSummary.textContent = visible === 0
    ? "No findings match these filters. Clear filters to review all current findings."
    : `${visible} of ${plural(total, "finding")} shown`;
  clearFiltersButton.hidden = !filtersActive();
}

function renderRules() {
  const current = ruleFilter.value;
  const rules = [...new Set((state.report?.findings || []).map((finding) => finding.ruleId))];
  ruleFilter.replaceChildren(node("option", { text: "All rules", attrs: { value: "all" } }));
  for (const rule of rules) append(ruleFilter, node("option", { text: rule, attrs: { value: rule } }));
  ruleFilter.value = rules.includes(current) ? current : "all";
}

function showFindingState(message) {
  findingState.hidden = false;
  findingState.textContent = message;
}

function renderFindings() {
  const focused = focusedKey(findingList, "data-finding");
  findingList.replaceChildren();
  renderFilterSummary();
  findingState.hidden = true;
  const source = sourceDetails();
  if (!state.report) {
    showFindingState(source ? `${source.name} is selected. Run the scan to list its findings.` : "Choose a project folder or example, then run a scan.");
    return;
  }
  if (state.report.findings.length === 0) {
    showFindingState("No rule matched these files. A clean scan is not proof that the project is secure.");
    return;
  }
  for (const finding of filteredFindings()) {
    const control = node("button", { className: "finding-button", attrs: { type: "button", "data-finding": finding.id, "aria-current": String(finding.id === state.selected) } });
    append(
      control,
      append(node("span", { className: "finding-top" }), severityTag(finding), text("code", finding.ruleId)),
      text("strong", finding.title),
      append(node("span", { className: "finding-meta" }), text("code", `${finding.file}:${finding.line}`), text("span", finding.attackScenarioId ? "Replay available" : "Static evidence")),
    );
    control.addEventListener("click", () => selectFinding(finding));
    append(findingList, append(node("li"), control));
  }
  restoreFocus(findingList, "data-finding", focused);
}

function resetFindingWorkflow() {
  state.replay = null;
  state.patch = null;
  state.verification = null;
  state.actionError = null;
}

function selectFinding(finding) {
  if (state.busy) return;
  state.selected = finding.id;
  state.lastFinding = finding;
  resetFindingWorkflow();
  for (const item of findingList.querySelectorAll(".finding-button")) item.setAttribute("aria-current", String(item.dataset.finding === finding.id));
  renderDetail();
  // Bring the whole case file into view, then put focus on its title so the new detail is announced.
  focusTarget($("#case-title"), { show: caseFile });
}

function diffBlock(patch) {
  const code = node("code");
  for (const line of patch.diff.split("\n")) {
    const className = /^(?:\+\+\+|---|@@)/.test(line) ? "header" : line.startsWith("+") ? "added" : line.startsWith("-") ? "removed" : "";
    append(code, text("span", line, { className }));
  }
  return codeBlock(`Proposed diff for ${patch.file}`, "evidence diff", code);
}

function facts(rows) {
  return append(node("dl", { className: "facts" }), rows.filter(Boolean).map(([term, value]) => append(node("div"), text("dt", term), text("dd", value))));
}

function traceList(replay, label) {
  return append(node("ol", { className: "trace", attrs: { "aria-label": label } }), replay.steps.map((step) => append(node("li"), text("strong", step.label), text("span", step.detail))));
}

function comparisonList(label, findings) {
  const list = node("ul");
  if (findings.length === 0) append(list, text("li", "None"));
  for (const finding of findings) append(list, text("li", `${finding.ruleId}: ${finding.title}`));
  return append(node("div", { className: "comparison-group" }), text("h5", `${label} (${findings.length})`), list);
}

function comparisonView(comparison) {
  if (!comparison) return undefined;
  return append(
    node("div", { className: "comparison", attrs: { role: "group", "aria-label": "Findings compared with the first scan" } }),
    comparisonList("Resolved since first scan", comparison.resolved),
    comparisonList("Introduced since first scan", comparison.introduced),
  );
}

function passed(verification) {
  return verification?.status === "Simulation blocked" || verification?.status === "Verified";
}

function stage(key, index, name, tone, status, body) {
  return append(
    node("li", { className: "stage", attrs: { "data-tone": tone } }),
    text("span", MARKS[tone] ?? index, { className: "stage-marker", attrs: { "aria-hidden": "true" } }),
    append(
      node("div", { className: "stage-content" }),
      append(node("h4", { className: "stage-heading", id: `stage-${key}`, attrs: { tabindex: -1 } }), text("span", name), text("span", ": ", { className: "sr-only" }), text("span", status, { className: "stage-state" })),
      body,
      state.actionError?.stage === key ? text("p", state.actionError.message, { className: "notice", id: "stage-error", attrs: { tabindex: -1, "data-kind": "error" } }) : undefined,
    ),
  );
}

function actions(...controls) {
  // After an unexpected Worker failure no action can succeed, so case actions wait for a reload.
  for (const control of controls) if (control?.tagName === "BUTTON") control.disabled = !engineReady;
  return append(node("div", { className: "stage-actions" }), controls);
}

// The recommended next step gets the only primary button: a proposed patch waits to be applied,
// otherwise replay comes first when it exists, then the patch proposal.
function nextStage(finding, current) {
  if (!current) return "";
  if (state.patch && !state.verification) return "patch";
  if (finding.attackScenarioId && !state.replay) return "replay";
  return PATCHABLE_RULES.has(finding.ruleId) && !state.verification ? "patch" : "";
}

function caseHeader(finding, current) {
  return append(
    node("header", { className: "case-head" }),
    append(
      node("p", { className: "case-meta" }),
      severityTag(finding),
      text("code", finding.ruleId),
      text("code", `${finding.file}:${finding.line}`),
      text("span", `Confidence: ${finding.confidence}`),
      text("span", current ? "Current scan" : "Baseline scan", { className: "scan-state" }),
    ),
    text("h3", finding.title, { className: "case-title", id: "case-title", attrs: { tabindex: -1 } }),
    text("p", finding.description, { className: "case-description" }),
  );
}

function scanStage(finding, current) {
  return stage("scan", 1, "Scan", "done", current ? "current evidence" : "baseline evidence", [
    current ? undefined : note("This is baseline evidence. The current scan no longer reports this rule at this file and line."),
    codeBlock(`Evidence at ${finding.file} line ${finding.line}`, "evidence", node("code", { text: finding.evidence })),
    text("h5", "Recommended boundary"),
    text("p", finding.remediation),
  ]);
}

function replayStage(finding, current, next) {
  const replay = state.replay;
  if (!finding.attackScenarioId) return stage("replay", 2, "Replay", "skip", "unavailable", note("Static evidence only. A safe replay is not available for this rule."));
  const tone = replay ? (replay.result === "blocked" ? "success" : "danger") : next === "replay" ? "active" : "pending";
  return stage("replay", 2, "Replay", tone, replay ? replay.result : "not run", [
    replay && state.verification ? note("This result is from before the patch. The replay after the patch appears under Verify.") : undefined,
    replay
      ? [text("h5", replay.scenarioName), facts([["Capability request", replay.capabilityRequest], ["Policy decision", replay.policyDecision], ["Result", replay.result]]), traceList(replay, "Replay steps"), text("p", replay.safetyNotice, { className: "boundary-note" })]
      : note(current ? "Test whether this capability would be allowed in a bounded simulation. No project code or network request runs." : "The replay was not run before the patch."),
    current ? actions(button(replay ? "Run safe replay again" : "Run safe replay", next === "replay" ? "primary-button" : "quiet-button", runReplay, { id: "replay-button" })) : undefined,
  ]);
}

function patchStage(finding, current, next) {
  const { patch, verification } = state;
  if (!PATCHABLE_RULES.has(finding.ruleId)) {
    return stage("patch", 3, "Patch", "skip", "manual remediation", note("No safe automatic patch is available for this finding. Apply the recommended boundary manually."));
  }
  const tone = patch && verification ? "done" : next === "patch" ? "active" : patch ? "done" : "pending";
  const status = patch ? (verification ? "applied to isolated copy" : "ready to review") : "not generated";
  // Before the replay result is known, the patch action stays secondary so it does not compete with replay.
  const proposeClass = next === "patch" && !verification ? "primary-button" : "quiet-button";
  return stage("patch", 3, "Patch", tone, status, [
    patch
      ? [text("h5", "Proposed patch"), text("p", patch.reason), text("p", `Review note: ${patch.riskNote}`, { className: "stage-note" }), diffBlock(patch)]
      : note(current ? "The allowlisted patcher proposes a minimal edit as a diff. Nothing changes until you apply it to the isolated copy." : "No patch was generated for this finding."),
    current && patch && !verification
      ? actions(button("Apply to isolated copy", "primary-button", applyPatch, { id: "apply-button" }), text("p", "Changes only the copy in this tab. Your repository is not modified."))
      : undefined,
    current && (!patch || verification) ? actions(button("Propose safe patch", proposeClass, generatePatch, { id: "patch-button" })) : undefined,
  ]);
}

function verificationSummary(verification) {
  if (verification.status === "Regression detected") return "The patched copy has more High or Critical findings than before. Review the introduced findings below.";
  if (verification.targetFindingPresent) return "The target finding is still present in the isolated copy. Review the patch before you rely on it.";
  if (verification.replay && verification.replay.result !== "blocked") return "The replay was not blocked after the patch. Review the patch before you rely on it.";
  return verification.replay
    ? "The target finding is gone from the isolated copy, and the replay is now blocked."
    : "The target finding is gone from the isolated copy, and the High or Critical count did not rise.";
}

function verifyStage(finding) {
  const verification = state.verification;
  if (!verification) {
    if (!PATCHABLE_RULES.has(finding.ruleId)) return stage("verify", 4, "Verify", "skip", "unavailable", note("Verification runs after an automatic patch. After you change the file yourself, load it again and rescan."));
    return stage("verify", 4, "Verify", "pending", "not run", note(state.patch ? "Apply the patch to scan and replay the isolated copy again." : "After you apply a patch, the isolated copy is scanned and replayed again."));
  }
  const ok = passed(verification);
  const { replay } = verification;
  return stage("verify", 4, "Verify", ok ? "success" : "danger", ok ? "passed" : verification.status === "Regression detected" ? "regression" : "needs review", [
    append(node("p", { className: `verification-status ${ok ? "success" : "review"}` }), text("span", ok ? "" : "!", { className: "status-glyph", attrs: { "aria-hidden": "true" } }), text("span", verification.status)),
    text("p", verificationSummary(verification)),
    facts([
      ["Target finding after patch", verification.targetFindingPresent ? "Still present" : "Not present"],
      ["High or Critical findings", `${verification.highCriticalBefore} before, ${verification.highCriticalAfter} after`],
      replay && ["Replay after patch", replay.result],
    ]),
    // The replay steps after the patch repeat the shape of the replay stage, so they open on request.
    replay
      ? [append(node("details", { className: "trace-details" }), text("summary", "Show replay steps after the patch"), traceList(replay, "Replay steps after the patch")), text("p", replay.safetyNotice, { className: "boundary-note" })]
      : undefined,
    comparisonView(verification.comparison),
  ]);
}

function renderDetail() {
  const selection = selectedFinding();
  detail.replaceChildren();
  detailState.hidden = Boolean(selection);
  backButton.hidden = !selection;
  if (!selection) {
    const clean = state.report?.findings.length === 0;
    detailEmptyLead.textContent = clean ? "No finding to review." : "No finding selected yet.";
    detailEmptyNote.textContent = clean ? "No rule matched these files." : "Scan a source, then choose a finding to follow it through each stage.";
    return;
  }
  const { finding, current } = selection;
  const next = nextStage(finding, current);
  append(
    detail,
    caseHeader(finding, current),
    append(node("ol", { className: "trail", attrs: { "aria-label": "Evidence trail" } }), scanStage(finding, current), replayStage(finding, current, next), patchStage(finding, current, next), verifyStage(finding)),
  );
}

function renderAll() {
  renderSourceContext();
  renderScanSummary();
  renderDiagnostics();
  renderFixtures(sources);
  renderControls();
  renderFindings();
  renderDetail();
}

function chooseFixture(fixture, message) {
  if (state.busy) return;
  state.fixture = fixture;
  state.report = null;
  state.selected = null;
  state.lastFinding = null;
  resetFindingWorkflow();
  setNotice(sourceActionStatus, "");
  setNotice(reportActionStatus, "");
  if (fixture !== LOCAL_PROJECT) {
    if (localSummary.dataset.kind === "error") localNote("");
    pasteNote("");
  }
  setStatus(message || `${fixtureNames[fixture] || fixture} selected. ${fixture === LOCAL_PROJECT ? "Scan the current project" : "Run the example scan"} when ready.`);
  renderAll();
}

async function runScan(reset, event) {
  if (!state.fixture || state.busy) return;
  const name = fixtureNames[state.fixture] || state.fixture;
  let scanned = false;
  setNotice(sourceActionStatus, "");
  setNotice(reportActionStatus, "");
  try {
    setBusy(true, reset ? "Resetting the isolated copy and scanning it again." : `Scanning ${name} in this tab.`, event?.currentTarget, reset ? "Resetting…" : "Scanning…");
    if (!state.report) showFindingState(`Scanning ${name} in this tab.`);
    const value = await request(reset ? "/api/reset" : "/api/scan", { fixture: state.fixture });
    const count = value.report.findings.length;
    state.report = value.report;
    const first = byRisk(value.report.findings)[0] || null;
    state.selected = first?.id || null;
    state.lastFinding = first;
    resetFindingWorkflow();
    renderRules();
    scanned = true;
    const result = count === 0 ? "No rule matched these files." : `${plural(count, "finding")} ${count === 1 ? "is" : "are"} available.`;
    setStatus(`${reset ? "Isolated copy reset." : "Scan complete."} ${result}`, "success");
  } catch (error) {
    const message = messageOf(error);
    setStatus(message, "error");
    setNotice(sourceActionStatus, `The scan did not complete. ${message}`, "error");
  } finally {
    setBusy(false);
    renderAll();
    if (scanned) focusTarget(evidenceHeading);
  }
}

// Runs one case-file action, then moves focus to its new result, or to the error beside the control.
async function caseAction(event, key, message, label, task) {
  let target = `#stage-${key}`;
  state.actionError = null;
  try {
    setBusy(true, message, event.currentTarget, label);
    const [done, kind] = await task();
    setStatus(done, kind);
  } catch (error) {
    const reason = messageOf(error);
    state.actionError = { stage: key === "verify" ? "patch" : key, message: reason };
    setStatus(reason, "error");
    target = "#stage-error";
  } finally {
    setBusy(false);
    renderSourceContext();
    renderScanSummary();
    renderDiagnostics();
    renderFindings();
    renderDetail();
    focusTarget($(target));
  }
}

function runReplay(event) {
  const selection = selectedFinding();
  if (state.busy || !selection?.current || !selection.finding.attackScenarioId) return;
  return caseAction(event, "replay", "Replaying the bounded attack scenario.", "Running replay…", async () => {
    const value = await request("/api/replay", { fixture: state.fixture, scenarioId: selection.finding.attackScenarioId });
    state.replay = value.replay;
    return [`Replay complete: ${value.replay.result}.`, value.replay.result === "blocked" ? "success" : ""];
  });
}

function generatePatch(event) {
  const selection = selectedFinding();
  if (state.busy || !selection?.current || !PATCHABLE_RULES.has(selection.finding.ruleId)) return;
  return caseAction(event, "patch", "Generating a minimal allowlisted patch.", "Generating patch…", async () => {
    const value = await request("/api/patch/generate", { fixture: state.fixture, findingId: selection.finding.id });
    state.patch = value.patch;
    state.verification = null;
    return ["Patch generated. Review the diff before applying it.", "success"];
  });
}

function applyPatch(event) {
  if (state.busy || !state.patch) return;
  return caseAction(event, "verify", "Applying the patch to the isolated copy and verifying it.", "Applying and verifying…", async () => {
    const value = await request("/api/patch/apply", { fixture: state.fixture, patchId: state.patch.id });
    state.report = value.report;
    // The replay stage keeps the result from before the patch; the verify stage shows the replay after it.
    state.verification = { ...value.verification, comparison: value.comparison };
    renderRules();
    return [`Verification complete: ${value.verification.status}.`, passed(value.verification) ? "success" : "error"];
  });
}

async function exportMarkdown() {
  if (state.busy || !state.report || !state.fixture) return;
  setNotice(reportActionStatus, "");
  try {
    setBusy(true, "Building the before and after report.");
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
    setNotice(reportActionStatus, `The report was not exported. ${message}`, "error");
  } finally {
    setBusy(false);
  }
}

// Loading a folder only reads and validates it. The visitor starts the scan, so nothing runs unannounced.
// A pasted mcp.json is scanned at once because its button says so.
async function loadLocalProject(type, body, label, control) {
  if (state.busy) return;
  const pasted = type === "loadFiles";
  let value = null;
  setNotice(sourceActionStatus, "");
  setNotice(reportActionStatus, "");
  pasteNote("");
  try {
    setBusy(true, "Reading supported .kiro files in this tab.", control, "Reading files…");
    if (!pasted) localNote("Reading supported .kiro files in this tab.", "busy");
    value = await send(type, body);
  } catch (error) {
    const message = messageOf(error);
    setStatus(message, "error");
    if (pasted) pasteNote(`The pasted file was not loaded. ${message}`);
    else localNote(`Files were not loaded. ${message}`, "error");
  } finally {
    setBusy(false);
  }
  if (!value) return;
  sources = value.fixtures;
  localLabel = typeof label === "function" ? label(value) : label;
  const loaded = `${plural(value.files, "supported file")} loaded from .kiro/.`;
  if (pasted) {
    pasteInput.value = "";
    localNote("Pasted mcp.json accepted. It stays in this tab. Paste again to replace it.", "success");
    chooseFixture(LOCAL_PROJECT);
    await runScan(false);
    return;
  }
  const skipped = value.tooLarge === 0 ? "" : ` ${plural(value.tooLarge, "file")} over 1 MiB skipped.`;
  localNote(`${loaded}${skipped} Files stay in this tab. Choose another folder to replace them.`, "success");
  chooseFixture(LOCAL_PROJECT, `${loaded} Scan the current project when ready.`);
  scanButton.focus();
}

async function loadChosenFolder() {
  const entries = [...folderInput.files].map((file) => ({ path: file.webkitRelativePath || file.name, file }));
  folderInput.value = "";
  if (entries.length === 0) return;
  await loadLocalProject("loadFolder", { entries }, (value) => {
    const skipped = value.tooLarge === 0 ? "" : `, ${value.tooLarge} skipped over 1 MiB`;
    return `${plural(value.files, ".kiro file")}${skipped}`;
  }, folderButton);
}

async function loadPastedConfig() {
  if (state.busy) return;
  if (pasteInput.value.trim() === "") {
    const message = "Paste the contents of an mcp.json file first.";
    setStatus(message, "error");
    pasteNote(message);
    pasteInput.focus();
    return;
  }
  await loadLocalProject("loadFiles", { files: [{ path: ".kiro/settings/mcp.json", content: pasteInput.value }] }, "Pasted mcp.json", pasteButton);
}

function clearFilters() {
  severityFilter.value = "all";
  ruleFilter.value = "all";
  renderFindings();
  severityFilter.focus();
}

function setTheme(theme) {
  const next = theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  $(".theme-label").textContent = next === "light" ? "Light theme" : "Dark theme";
  $("#theme-toggle").setAttribute("aria-label", `Switch to ${next} theme`);
  themeColor?.setAttribute("content", theme === "dark" ? "#10100f" : "#f8f1eb");
  try {
    localStorage.setItem("gravescan-theme", theme);
  } catch {
    // Theme preference is optional when browser storage is unavailable.
  }
}

$("#theme-toggle").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
fixtureList.addEventListener("click", (event) => {
  const control = event.target.closest("[data-fixture]");
  if (control && !control.disabled && control.dataset.fixture !== state.fixture) chooseFixture(control.dataset.fixture);
});
localProjectButton.addEventListener("click", () => {
  if (!localProjectButton.disabled && state.fixture !== LOCAL_PROJECT) chooseFixture(LOCAL_PROJECT);
});
scanButton.addEventListener("click", (event) => runScan(false, event));
resetButton.addEventListener("click", (event) => runScan(true, event));
exportButton.addEventListener("click", exportMarkdown);
clearFiltersButton.addEventListener("click", clearFilters);
folderButton.addEventListener("click", () => {
  if (!state.busy) folderInput.click();
});
folderInput.addEventListener("change", loadChosenFolder);
pasteButton.addEventListener("click", loadPastedConfig);
severityFilter.addEventListener("change", renderFindings);
ruleFilter.addEventListener("change", renderFindings);
backButton.addEventListener("click", () => focusTarget(findingList.querySelector('[aria-current="true"]') || findingList.querySelector("button") || evidenceHeading, { nearest: true }));
// A control that receives focus under the sticky header scrolls just enough to show it.
document.addEventListener("focusin", (event) => {
  const target = event.target;
  if (!guidedFocus && !topbar.contains(target) && target.getBoundingClientRect().top < headerOffset()) target.scrollIntoView({ block: "nearest" });
});
// Escape closes an open disclosure and returns focus to its summary. Typed text stays in the field.
document.addEventListener("keydown", (event) => {
  const open = event.key === "Escape" && !event.isComposing ? event.target.closest?.("details[open]") : null;
  if (!open) return;
  open.open = false;
  open.querySelector("summary").focus();
});
new window.ResizeObserver(measureHeader).observe(topbar);
// When the sticky queue rests at the end of the review grid, content it gains grows it upward, which can
// slide a focused control (Export Markdown, the filters) under the header. Bring that control back.
new window.ResizeObserver(() => {
  const active = document.activeElement;
  if (board.contains(active) && active.getBoundingClientRect().top < headerOffset()) active.scrollIntoView({ block: "nearest" });
}).observe(board);
window.addEventListener("resize", measureHeader);

try {
  setTheme(localStorage.getItem("gravescan-theme") || "dark");
} catch {
  setTheme("dark");
}

renderSourceContext();
fixturesRequest
  .then((bundle) => send("init", { bundle }))
  .then((value) => {
    engineReady = true;
    sources = value.fixtures;
    renderAll();
    setStatus("Choose a project folder or controlled example to begin.");
  })
  .catch(() => {
    fixtureList.replaceChildren(document.createTextNode("Fixtures could not be loaded."));
    setStatus("Fixtures could not be loaded.", "error");
    setNotice(sourceActionStatus, "Fixtures could not be loaded. Reload the page to try again.", "error");
  });
