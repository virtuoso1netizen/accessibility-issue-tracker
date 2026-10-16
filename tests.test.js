const test = require("node:test");
const assert = require("node:assert/strict");
const { app, db } = require("./server");
const http = require("http");

let server;
let baseUrl;
test.before(async () => {
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  db.prepare("DELETE FROM status_history").run();
  db.prepare("DELETE FROM issues").run();
});
test.after(async () => {
  await new Promise(resolve => server.close(resolve));
});
async function request(path, userId, options = {}) {
  return fetch(baseUrl + path, {
    ...options,
    headers: { "x-demo-user": String(userId), "Content-Type": "application/json", ...(options.headers || {}) }
  });
}
test("backend rejects an invalid Open -> Resolved transition", async () => {
  const create = await request("/api/issues", 1, { method:"POST", body:JSON.stringify({ title:"Test issue", description:"", page_url:"https://example.com", wcag_criterion:"1.1.1", severity:"Critical" }) });
  assert.equal(create.status, 201);
  const { issue } = await create.json();
  const update = await request(`/api/issues/${issue.id}/status`, 1, { method:"PATCH", body:JSON.stringify({status:"Resolved"}) });
  assert.equal(update.status, 409);
  const detail = await request(`/api/issues/${issue.id}`, 1);
  assert.equal((await detail.json()).issue.status, "Open");
});
test("a user cannot read another user's issue", async () => {
  const create = await request("/api/issues", 1, { method:"POST", body:JSON.stringify({ title:"Alice private issue", description:"", page_url:"https://example.com", wcag_criterion:"", severity:"Minor" }) });
  const { issue } = await create.json();
  const bobRead = await request(`/api/issues/${issue.id}`, 2);
  assert.equal(bobRead.status, 404);
});
test("backend rejects invalid page URLs", async () => {
  const response = await request("/api/issues", 1, { method:"POST", body:JSON.stringify({ title:"Bad URL", page_url:"javascript:alert(1)", severity:"Minor" }) });
  assert.equal(response.status, 422);
});
