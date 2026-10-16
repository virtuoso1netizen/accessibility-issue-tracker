const express = require("express");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "tracker.sqlite"));
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    page_url TEXT NOT NULL,
    wcag_criterion TEXT NOT NULL DEFAULT '',
    severity TEXT NOT NULL CHECK (severity IN ('Minor','Moderate','Serious','Critical')),
    status TEXT NOT NULL CHECK (status IN ('Open','In Progress','Resolved')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    changed_by INTEGER NOT NULL REFERENCES users(id),
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_issues_owner_created ON issues(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_issues_owner_status ON issues(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_issues_owner_severity ON issues(user_id, severity);
  CREATE INDEX IF NOT EXISTS idx_history_issue_time ON status_history(issue_id, changed_at);
`);

const insertUser = db.prepare("INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)");
insertUser.run(1, "alice");
insertUser.run(2, "bob");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const STATUSES = ["Open", "In Progress", "Resolved"];
const SEVERITIES = ["Minor", "Moderate", "Serious", "Critical"];
const transitions = {
  "Open": ["In Progress"],
  "In Progress": ["Open", "Resolved"],
  "Resolved": ["Open"]
};

function currentUser(req, res, next) {
  const raw = req.header("x-demo-user");
  const userId = Number(raw);
  if (![1, 2].includes(userId)) {
    return res.status(401).json({ error: "Please sign in with a demo account." });
  }
  req.user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(userId);
  next();
}
function validUrl(value) {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}
function validateIssue(body) {
  const errors = {};
  if (typeof body.title !== "string" || !body.title.trim()) errors.title = "Enter an issue title.";
  else if (body.title.trim().length > 160) errors.title = "Title must be 160 characters or fewer.";
  if (typeof body.page_url !== "string" || !validUrl(body.page_url.trim())) {
    errors.page_url = "Enter a valid URL beginning with http:// or https://.";
  }
  if (!SEVERITIES.includes(body.severity)) errors.severity = "Choose a valid severity.";
  if (body.description != null && typeof body.description !== "string") errors.description = "Description must be text.";
  if (body.wcag_criterion != null && typeof body.wcag_criterion !== "string") errors.wcag_criterion = "WCAG criterion must be text.";
  return errors;
}
function ownedIssue(issueId, userId) {
  return db.prepare("SELECT * FROM issues WHERE id = ? AND user_id = ?").get(issueId, userId);
}

app.get("/api/me", currentUser, (req, res) => res.json({ user: req.user }));
app.get("/api/issues", currentUser, (req, res) => {
  const clauses = ["user_id = ?"];
  const params = [req.user.id];
  if (req.query.status && STATUSES.includes(req.query.status)) {
    clauses.push("status = ?"); params.push(req.query.status);
  }
  if (req.query.severity && SEVERITIES.includes(req.query.severity)) {
    clauses.push("severity = ?"); params.push(req.query.severity);
  }
  const rows = db.prepare(`SELECT * FROM issues WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC`).all(...params);
  res.json({ issues: rows });
});
app.post("/api/issues", currentUser, (req, res) => {
  const errors = validateIssue(req.body || {});
  if (Object.keys(errors).length) return res.status(422).json({ error: "Please correct the highlighted fields.", fields: errors });
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO issues (user_id, title, description, page_url, wcag_criterion, severity, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'Open', ?, ?)
  `).run(req.user.id, req.body.title.trim(), (req.body.description || "").trim(),
    req.body.page_url.trim(), (req.body.wcag_criterion || "").trim(), req.body.severity, now, now);
  const issue = db.prepare("SELECT * FROM issues WHERE id = ?").get(result.lastInsertRowid);
  db.prepare("INSERT INTO status_history (issue_id, changed_by, old_status, new_status, changed_at) VALUES (?, ?, NULL, 'Open', ?)")
    .run(issue.id, req.user.id, now);
  res.status(201).json({ issue, message: "Issue created successfully." });
});
app.get("/api/issues/:id", currentUser, (req, res) => {
  const issue = ownedIssue(Number(req.params.id), req.user.id);
  if (!issue) return res.status(404).json({ error: "Issue not found." });
  const history = db.prepare(`
    SELECT h.*, u.username AS changed_by_name
    FROM status_history h JOIN users u ON u.id = h.changed_by
    WHERE h.issue_id = ? ORDER BY h.changed_at ASC, h.id ASC
  `).all(issue.id);
  res.json({ issue, history });
});
app.put("/api/issues/:id", currentUser, (req, res) => {
  const issue = ownedIssue(Number(req.params.id), req.user.id);
  if (!issue) return res.status(404).json({ error: "Issue not found." });
  const errors = validateIssue(req.body || {});
  if (Object.keys(errors).length) return res.status(422).json({ error: "Please correct the highlighted fields.", fields: errors });
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE issues SET title = ?, description = ?, page_url = ?, wcag_criterion = ?, severity = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(req.body.title.trim(), (req.body.description || "").trim(), req.body.page_url.trim(),
    (req.body.wcag_criterion || "").trim(), req.body.severity, now, issue.id, req.user.id);
  res.json({ issue: ownedIssue(issue.id, req.user.id), message: "Issue updated successfully." });
});
app.patch("/api/issues/:id/status", currentUser, (req, res) => {
  const issue = ownedIssue(Number(req.params.id), req.user.id);
  if (!issue) return res.status(404).json({ error: "Issue not found." });
  const nextStatus = req.body && req.body.status;
  if (!STATUSES.includes(nextStatus)) return res.status(422).json({ error: "Choose a valid status." });
  if (!transitions[issue.status].includes(nextStatus)) {
    return res.status(409).json({ error: `This status change is not allowed: ${issue.status} → ${nextStatus}.` });
  }
  const now = new Date().toISOString();
  const update = db.transaction(() => {
    db.prepare("UPDATE issues SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .run(nextStatus, now, issue.id, req.user.id);
    db.prepare("INSERT INTO status_history (issue_id, changed_by, old_status, new_status, changed_at) VALUES (?, ?, ?, ?, ?)")
      .run(issue.id, req.user.id, issue.status, nextStatus, now);
  });
  update();
  res.json({ issue: ownedIssue(issue.id, req.user.id), message: `Status changed to ${nextStatus}.` });
});
app.use("/api", (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "An unexpected server error occurred." });
});
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

if (require.main === module) {
  app.listen(PORT, () => console.log(`Accessibility Issue Tracker running at http://localhost:${PORT}`));
}
module.exports = { app, db, transitions, validateIssue, ownedIssue };
