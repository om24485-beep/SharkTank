#!/usr/bin/env node
// Quick self-check: panels are valid, every agent exists, example episodes
// build a timeline and a report. Run: npm run smoke
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { ROOT, SKILL_DIR, EPISODES, PANELS, listEpisodes, timeline } from "../lib/episodes.mjs";

let fail = 0;
const ok = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) fail++; };
const keys = new Set(PANELS.sharks.map((s) => s.key));
for (const [id, p] of Object.entries(PANELS.panels)) ok([...p.default, ...p.onCall].every((k) => keys.has(k)), `panel ${id} seats exist`);
for (const s of PANELS.sharks) {
  ok(fs.existsSync(path.join(ROOT, "agents", `shark-${s.key}.md`)), `agent shark-${s.key}`);
  ok(fs.existsSync(path.join(SKILL_DIR, "sharks", `${s.key}.md`)), `dossier ${s.key}`);
}
ok(fs.existsSync(path.join(ROOT, "agents", "founder-agent.md")), "founder agent");
for (const e of listEpisodes()) {
  const t = timeline(e.id);
  ok(t.events.length > 5, `${e.id}: ${t.events.length} timeline events`);
  const out = path.join(os.tmpdir(), `${e.id}.html`);
  execFileSync(process.execPath, [path.join(ROOT, "app", "scripts", "build-report.mjs"), path.join(EPISODES, e.id), "--out", out]);
  ok(fs.statSync(out).size > 20000, `${e.id}: report builds`);
}
console.log(fail ? `\n${fail} check(s) failed` : "\nall good 🦈");
process.exit(fail ? 1 : 0);
