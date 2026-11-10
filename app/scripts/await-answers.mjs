#!/usr/bin/env node
// Manual mode: block until the human answers every pending question in the
// live room (or the Host writes answers.json from chat), then print them.
//   node app/scripts/await-answers.mjs episodes/<id> [--timeout 900]
// Exit 0 = all answered, 2 = timed out (partial answers printed).
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.argv[2] || ".");
const ti = process.argv.indexOf("--timeout");
const timeout = (ti > 0 ? Number(process.argv[ti + 1]) : 900) * 1000;
const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { return null; } };

const pending = read("pending.json");
if (!pending?.questions?.length) { console.log(JSON.stringify({ answers: {}, note: "no pending.json" })); process.exit(0); }
const ids = pending.questions.map((q) => q.id);
const start = Date.now();
console.error(`waiting for ${ids.length} answer(s) in ${path.join(dir, "answers.json")} …`);

const timer = setInterval(() => {
  const a = read("answers.json") || {};
  const got = ids.filter((id) => typeof a[id] === "string" && a[id].trim());
  if (got.length === ids.length || Date.now() - start > timeout) {
    clearInterval(timer);
    const out = Object.fromEntries(ids.map((id) => [id, a[id] || null]));
    console.log(JSON.stringify({ answers: out, complete: got.length === ids.length }, null, 2));
    process.exit(got.length === ids.length ? 0 : 2);
  }
}, 1000);
