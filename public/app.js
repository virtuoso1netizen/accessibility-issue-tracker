const $ = (id) => document.getElementById(id);
let user = null;
let currentIssueId = null;
const statusOptions = ["Open", "In Progress", "Resolved"];
const severityOptions = ["Minor", "Moderate", "Serious", "Critical"];

async function api(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (user) headers["x-demo-user"] = String(user.id);
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Something went wrong.");
    error.status = response.status; error.fields = data.fields || {};
    throw error;
  }
  return data;
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}
function showToast(message, isError = false) {
  $("toast").textContent = message;
  $("toast").classList.toggle("error", isError);
}
function setLoggedInUI() {
  $("login-view").hidden = true; $("app-view").hidden = false;
  $("session-area").replaceChildren();
  const label = document.createElement("span"); label.textContent = `${user.username} (demo)`;
  const logout = document.createElement("button"); logout.className = "secondary"; logout.textContent = "Sign out";
  logout.addEventListener("click", () => { user = null; $("session-area").textContent = ""; $("app-view").hidden = true; $("login-view").hidden = false; $("demo-user").focus(); });
  $("session-area").append(label, logout);
}
async function login() {
  const id = Number($("demo-user").value);
  user = { id, username: id === 1 ? "alice" : "bob" };
  try { await api("/api/me"); setLoggedInUI(); await loadIssues(); $("page-heading").focus?.(); }
  catch (e) { user = null; showLoginError(e.message); }
}
function showLoginError(message) { alert(message); }
function renderStats(issues) {
  $("total-count").textContent = issues.length;
  $("open-count").textContent = issues.filter(i => i.status === "Open").length;
  $("progress-count").textContent = issues.filter(i => i.status === "In Progress").length;
  $("resolved-count").textContent = issues.filter(i => i.status === "Resolved").length;
}
async function loadIssues() {
  $("detail-panel").hidden = true; $("form-panel").hidden = true;
  $("issue-table-wrap").innerHTML = "<p>Loading issues…</p>";
  try {
    const all = await api("/api/issues");
    renderStats(all.issues);
    const params = new URLSearchParams();
    if ($("status-filter").value) params.set("status", $("status-filter").value);
    if ($("severity-filter").value) params.set("severity", $("severity-filter").value);
    const filtered = await api(`/api/issues?${params.toString()}`);
    renderTable(filtered.issues);
  } catch (e) { $("issue-table-wrap").textContent = e.message; }
}
function renderTable(issues) {
  if (!issues.length) { $("issue-table-wrap").innerHTML = "<p>No issues found. Create an issue or change your filters.</p>"; return; }
  const rows = issues.map(i => `<tr>
    <td><a href="#issue-${i.id}" data-open-issue="${i.id}">${escapeHtml(i.title)}</a></td>
    <td><span class="badge ${escapeHtml(i.severity)}">${escapeHtml(i.severity)}</span></td>
    <td>${escapeHtml(i.status)}</td>
    <td>${escapeHtml(new Date(i.created_at).toLocaleDateString())}</td>
    <td><button class="secondary" data-edit-issue="${i.id}">Edit</button></td>
  </tr>`).join("");
  $("issue-table-wrap").innerHTML = `<div class="table-scroll"><table><caption class="visually-hidden">Your accessibility issues</caption><thead><tr><th scope="col">Issue title</th><th scope="col">Severity</th><th scope="col">Status</th><th scope="col">Created</th><th scope="col">Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function clearErrors() {
  ["title-error","url-error","severity-error"].forEach(id => $(id).textContent = "");
  $("form-error-summary").hidden = true; $("form-error-summary").textContent = "";
  ["title","page-url","severity"].forEach(id => $(id).removeAttribute("aria-invalid"));
}
function showErrors(fields, general) {
  clearErrors();
  const mapping = { title: ["title", "title-error"], page_url: ["page-url", "url-error"], severity: ["severity", "severity-error"] };
  Object.entries(fields).forEach(([key, message]) => {
    if (mapping[key]) {
      const [inputId, errorId] = mapping[key]; $(errorId).textContent = message; $(inputId).setAttribute("aria-invalid", "true");
    }
  });
  const messages = Object.values(fields);
  if (general || messages.length) {
    const summary = $("form-error-summary"); summary.hidden = false;
    summary.innerHTML = `<h3>There is a problem with your form</h3><p>${escapeHtml(general || "Please correct the fields below.")}</p>${messages.length ? `<ul>${messages.map(m=>`<li>${escapeHtml(m)}</li>`).join("")}</ul>` : ""}`;
    summary.focus();
  }
}
function openForm(issue = null) {
  $("detail-panel").hidden = true; $("form-panel").hidden = false;
  $("form-heading").textContent = issue ? "Edit issue" : "Create an issue";
  $("issue-id").value = issue ? issue.id : "";
  $("title").value = issue ? issue.title : "";
  $("description").value = issue ? issue.description : "";
  $("page-url").value = issue ? issue.page_url : "";
  $("wcag").value = issue ? issue.wcag_criterion : "";
  $("severity").value = issue ? issue.severity : "";
  clearErrors(); $("title").focus();
}
async function editIssue(id) {
  try { const data = await api(`/api/issues/${id}`); openForm(data.issue); }
  catch (e) { showToast(e.message, true); }
}
async function viewIssue(id) {
  try {
    const { issue, history } = await api(`/api/issues/${id}`);
    currentIssueId = issue.id; $("form-panel").hidden = true; $("detail-panel").hidden = false;
    const historyHtml = history.map(h => `<li>${escapeHtml(h.changed_by_name)} · ${escapeHtml(new Date(h.changed_at).toLocaleString())}: ${h.old_status ? `${escapeHtml(h.old_status)} → ` : "Created as "}${escapeHtml(h.new_status)}</li>`).join("");
    $("issue-detail").innerHTML = `
      <h2>${escapeHtml(issue.title)}</h2>
      <div class="detail-grid">
        <div class="detail-item"><strong>Description</strong>${escapeHtml(issue.description || "No description provided.")}</div>
        <div class="detail-item"><strong>Page URL</strong><a href="${escapeHtml(issue.page_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(issue.page_url)}</a></div>
        <div class="detail-item"><strong>WCAG criterion</strong>${escapeHtml(issue.wcag_criterion || "Not specified")}</div>
        <div class="detail-item"><strong>Severity</strong>${escapeHtml(issue.severity)}</div>
        <div class="detail-item"><strong>Status</strong>${escapeHtml(issue.status)}</div>
        <div class="detail-item"><strong>Created</strong>${escapeHtml(new Date(issue.created_at).toLocaleString())}</div>
      </div>
      <div class="actions"><button class="primary" id="detail-edit">Edit issue</button></div>
      <h3>Change status</h3>
      <form id="status-form"><label for="new-status">New status</label><select id="new-status">${statusOptions.filter(s=>s!==issue.status).map(s=>`<option>${escapeHtml(s)}</option>`).join("")}</select><button class="primary" type="submit">Update status</button></form>
      <h3>Status history</h3><ol class="history">${historyHtml || "<li>No status changes recorded.</li>"}</ol>`;
    $("detail-edit").addEventListener("click", () => openForm(issue));
    $("status-form").addEventListener("submit", async event => {
      event.preventDefault();
      try { const result = await api(`/api/issues/${issue.id}/status`, { method:"PATCH", body:JSON.stringify({status:$("new-status").value}) }); showToast(result.message); await viewIssue(issue.id); }
      catch (e) { showToast(e.message, true); }
    });
    $("back-button").focus();
  } catch (e) { showToast(e.message, true); }
}
$("login-button").addEventListener("click", login);
$("new-issue-button").addEventListener("click", () => openForm());
$("cancel-form").addEventListener("click", () => { $("form-panel").hidden = true; clearErrors(); $("new-issue-button").focus(); });
$("back-button").addEventListener("click", loadIssues);
$("status-filter").addEventListener("change", loadIssues);
$("severity-filter").addEventListener("change", loadIssues);
$("clear-filters").addEventListener("click", () => { $("status-filter").value = ""; $("severity-filter").value = ""; loadIssues(); });
$("issue-table-wrap").addEventListener("click", event => {
  const open = event.target.closest("[data-open-issue]"); const edit = event.target.closest("[data-edit-issue]");
  if (open) { event.preventDefault(); viewIssue(Number(open.dataset.openIssue)); }
  if (edit) editIssue(Number(edit.dataset.editIssue));
});
$("issue-form").addEventListener("submit", async event => {
  event.preventDefault(); clearErrors();
  const id = $("issue-id").value;
  const payload = { title:$("title").value, description:$("description").value, page_url:$("page-url").value, wcag_criterion:$("wcag").value, severity:$("severity").value };
  const localErrors = {};
  if (!payload.title.trim()) localErrors.title = "Enter an issue title.";
  try { const url = new URL(payload.page_url); if (!["http:","https:"].includes(url.protocol)) throw new Error(); }
  catch { localErrors.page_url = "Enter a valid URL beginning with http:// or https://."; }
  if (!payload.severity) localErrors.severity = "Choose a severity.";
  if (Object.keys(localErrors).length) return showErrors(localErrors);
  try {
    const result = await api(id ? `/api/issues/${id}` : "/api/issues", { method:id ? "PUT" : "POST", body:JSON.stringify(payload) });
    $("form-panel").hidden = true; showToast(result.message); await loadIssues();
  } catch (e) { showErrors(e.fields || {}, e.message); }
});
