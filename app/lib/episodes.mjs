// Reads an episode folder and turns its files into one ordered timeline the
// room can play. The Host (Claude Code) writes the files; this never writes
// anything except answers.json for manual mode.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const EPISODES = path.resolve(process.env.SHARKTANK_EPISODES || path.join(ROOT, "episodes"));
export const SKILL_DIR = fs.existsSync(path.join(ROOT, "panels.json")) ? ROOT : path.join(ROOT, "skills", "shark-tank");
export const PANELS = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, "panels.json"), "utf8"));

function readJson(dir, name) {
  const f = path.join(dir, name);
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; }
}

export function weightedTotal(v) {
  const s = PANELS.sharks.find((x) => x.key === v.shark);
  const w = (s && s.weights) || {};
  let num = 0, den = 0;
  for (const [k, val] of Object.entries(v.scores || {})) { const ww = w[k] ?? 1; num += val * ww; den += ww; }
  return den ? Math.round((num / den) * 10) / 10 : 0;
}

export function listEpisodes() {
  if (!fs.existsSync(EPISODES)) return [];
  return fs.readdirSync(EPISODES, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const dir = path.join(EPISODES, d.name);
      const ep = readJson(dir, "episode.json");
      if (!ep) return null;
      const deal = readJson(dir, "deal.json");
      const mtime = Math.max(...fs.readdirSync(dir).map((f) => fs.statSync(path.join(dir, f)).mtimeMs));
      return {
        id: d.name, title: ep.title, panel: ep.panel, mode: ep.mode,
        status: deal ? deal.status : "LIVE", hasReport: fs.existsSync(path.join(dir, "outcome.html")), mtime,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime);
}

export function episodeDir(id) {
  const dir = path.join(EPISODES, path.basename(id));
  return fs.existsSync(dir) ? dir : null;
}

// Build the playable timeline. Each event has a stable id so the client can
// play only what is new when files grow during a live episode.
export function timeline(id) {
  const dir = episodeDir(id);
  if (!dir) return null;
  const ev = [];
  const push = (e) => ev.push(e);
  const ep = readJson(dir, "episode.json");
  if (!ep) return { events: [], episode: null };
  push({ id: "setup", type: "setup", episode: ep });

  const pitch = readJson(dir, "pitch.json");
  if (pitch) {
    push({ id: "pitch-intro", type: "phase", title: "The Pitch", sub: pitch.tagline || "" });
    (pitch.slides || []).forEach((sl, i) => push({ id: `pitch-${i}`, type: "slide", index: i, slide: sl, who: "founder", text: sl.say || sl.body || sl.title }));
    if (pitch.ask) push({ id: "pitch-ask", type: "ask", ask: pitch.ask, who: "founder", text: pitch.ask.line || `We are asking for ${pitch.ask.amount_label} for ${pitch.ask.equity}% equity.` });
  }

  const qa = readJson(dir, "qa.json");
  const answers = readJson(dir, "answers.json");
  if (qa) {
    (qa.rounds || []).forEach((r, ri) => {
      push({ id: `round-${ri}`, type: "phase", title: r.title || `Round ${ri + 1}`, sub: r.sub || "" });
      (r.exchanges || []).forEach((x, xi) => {
        const xid = x.id || `r${ri}x${xi}`;
        if (x.banter) { push({ id: `${xid}-b`, type: "say", who: x.shark, kind: "banter", to: x.to, text: x.banter }); return; }
        push({ id: `${xid}-q`, type: "say", who: x.shark, kind: "question", text: x.q });
        const a = x.a || (answers && answers[xid]);
        if (a) push({ id: `${xid}-a`, type: "say", who: "founder", kind: "answer", by: x.by || (answers && answers[xid] ? "human" : "agent"), text: a });
        if (x.react) push({ id: `${xid}-r`, type: "say", who: x.shark, kind: "react", text: x.react });
      });
    });
  }

  const pending = readJson(dir, "pending.json");
  if (pending && pending.questions && pending.questions.some((q) => !(answers && answers[q.id]))) {
    push({ id: `pending-${pending.round || 0}`, type: "pending", questions: pending.questions, answers: answers || {} });
  }

  const verdicts = readJson(dir, "verdicts.json");
  if (verdicts) {
    push({ id: "verdicts", type: "phase", title: "The Verdicts", sub: "Score, feedback, in or out" });
    (verdicts.verdicts || []).forEach((v) => push({ id: `v-${v.shark}`, type: "verdict", who: v.shark, verdict: { ...v, total: v.total ?? weightedTotal(v) }, text: v.line }));
  }

  const offers = readJson(dir, "offers.json");
  if (offers) {
    if ((offers.offers || []).length) push({ id: "offers", type: "phase", title: "Offers on the Table", sub: `${offers.offers.length} offer${offers.offers.length > 1 ? "s" : ""}` });
    (offers.offers || []).forEach((o, i) => push({ id: `o-${i}`, type: "offer", who: o.sharks?.[0] || o.shark, offer: o, text: o.line }));
    (offers.negotiation || []).forEach((n, i) => push({ id: `n-${i}`, type: n.offer ? "counter" : "say", kind: n.kind || "negotiation", who: n.who, by: n.by, offer: n.offer, text: n.text }));
  }

  const deal = readJson(dir, "deal.json");
  if (deal) push({ id: "deal", type: "deal", deal, who: "founder", text: deal.founderLine || "" });
  if (fs.existsSync(path.join(dir, "outcome.html"))) push({ id: "report", type: "report", url: `/episodes/${path.basename(dir)}/outcome.html` });
  return { episode: ep, events: ev };
}

export function writeAnswers(id, answers) {
  const dir = episodeDir(id);
  if (!dir) throw new Error("no such episode");
  const f = path.join(dir, "answers.json");
  const prev = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
  const next = { ...prev };
  for (const [k, v] of Object.entries(answers || {})) if (typeof v === "string" && v.trim()) next[k] = v.trim().slice(0, 2000);
  fs.writeFileSync(f, JSON.stringify(next, null, 2));
  return next;
}
