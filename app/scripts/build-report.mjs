#!/usr/bin/env node
// Builds episodes/<id>/outcome.html: a self-contained, pitch-ready report
// (deck with present mode, scorecards, grilling transcript, offers, term
// sheet summary and the Pitch Doctor's fixes). No network, no dependencies.
//   node app/scripts/build-report.mjs episodes/<id> [--out path/to/file.html]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sharkSVG, founderSVG } from "../public/avatars.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = process.argv[2];
if (!arg) { console.error("usage: build-report.mjs episodes/<id> [--out file.html]"); process.exit(1); }
const dir = path.resolve(arg.includes("/") || arg.includes("\\") ? arg : path.join(ROOT, "episodes", arg));
const outIdx = process.argv.indexOf("--out");
const OUT = outIdx > 0 ? path.resolve(process.argv[outIdx + 1]) : path.join(dir, "outcome.html");

const P = JSON.parse(fs.readFileSync(path.join(ROOT, "skills", "shark-tank", "panels.json"), "utf8"));
const SH = Object.fromEntries(P.sharks.map((s) => [s.key, s]));
const rd = (f) => { const p = path.join(dir, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };
const ep = rd("episode.json");
if (!ep) { console.error(`no episode.json in ${dir}`); process.exit(1); }
const pitch = rd("pitch.json") || { slides: [] };
const qa = rd("qa.json") || { rounds: [] };
const verdicts = (rd("verdicts.json") || { verdicts: [] }).verdicts;
const offersF = rd("offers.json") || { offers: [], negotiation: [] };
const deal = rd("deal.json") || { status: "IN PROGRESS" };
const doc = rd("doctor.json") || {};

const CUR = ep.currency || "INR";
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function money(n, cur = CUR) {
  if (n == null || isNaN(n)) return "—";
  if (cur === "INR") { if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Cr`; if (n >= 1e5) return `₹${+(n / 1e5).toFixed(1)} L`; return `₹${Math.round(n).toLocaleString("en-IN")}`; }
  if (n >= 1e6) return `$${+(n / 1e6).toFixed(2)}M`; if (n >= 1e3) return `$${+(n / 1e3).toFixed(0)}k`; return `$${Math.round(n)}`;
}
const val = (o) => (o && o.amount && o.equity ? o.amount / (o.equity / 100) : null);
const terms = (o) => `${money(o.amount)} for ${o.equity}%${o.royalty ? ` + ${o.royalty}` : ""}${o.debt ? ` + ${o.debt}` : ""}`;
const nm = (k) => (k === "founder" ? (ep.founder?.name || "Founder") : SH[k]?.name || k);
const face = (k, size = 56, mood) => (k === "founder" ? founderSVG({ size, human: ep.mode === "manual" }) : SH[k] ? sharkSVG(SH[k], { size, mood }) : "");
function total(v) { if (v.total != null) return v.total; const w = SH[v.shark]?.weights || {}; let a = 0, b = 0; for (const [k, x] of Object.entries(v.scores || {})) { a += x * (w[k] ?? 1); b += w[k] ?? 1; } return b ? Math.round((a / b) * 10) / 10 : 0; }
verdicts.forEach((v) => (v.total = total(v)));

const askVal = val(ep.ask || pitch.ask);
const dealVal = deal.status === "DEAL" ? val(deal) : null;
const avg = verdicts.length ? verdicts.reduce((a, v) => a + v.total, 0) / verdicts.length : 0;
const inCount = verdicts.filter((v) => v.status !== "out").length;
const dims = P.dimensions;
const dimAvg = Object.fromEntries(dims.map((d) => [d.key, verdicts.length ? verdicts.reduce((a, v) => a + (v.scores?.[d.key] || 0), 0) / verdicts.length : 0]));
const panelLabel = P.panels[ep.panel]?.label || ep.panel;

// ---------- radar ----------
function radar() {
  const cx = 170, cy = 160, R = 120, n = dims.length;
  const pt = (i, r) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  let g = "";
  for (const lvl of [2, 4, 6, 8, 10]) g += `<polygon points="${dims.map((_, i) => pt(i, (R * lvl) / 10).join(",")).join(" ")}" fill="none" stroke="#d9e2ef" stroke-width="1"/>`;
  dims.forEach((d, i) => { const [x, y] = pt(i, R); const [lx, ly] = pt(i, R + 22); g += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#d9e2ef"/><text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="#4a5b75">${esc(d.label)}</text>`; });
  const poly = (sc, color, op) => `<polygon points="${dims.map((d, i) => pt(i, (R * (sc[d.key] || 0)) / 10).join(",")).join(" ")}" fill="${color}" fill-opacity="${op}" stroke="${color}" stroke-width="2"/>`;
  verdicts.forEach((v) => (g += poly(v.scores || {}, SH[v.shark]?.color || "#888", 0.06)));
  g += poly(dimAvg, "#e8a400", 0.28);
  dims.forEach((d, i) => { const [x, y] = pt(i, (R * dimAvg[d.key]) / 10); g += `<circle cx="${x}" cy="${y}" r="4" fill="#e8a400"/>`; });
  return `<svg viewBox="-50 -6 440 340" class="radar">${g}</svg>`;
}
function heat(v) { const t = Math.max(0, Math.min(1, (v - 3) / 7)); const h = 0 + t * 130; return `hsl(${h} 70% ${92 - t * 14}%)`; }

// ---------- sections ----------
function slideHTML(sl, i) {
  const stats = (sl.stats || []).map((x) => `<div class="st"><b>${esc(x.value)}</b><span>${esc(x.label)}</span></div>`).join("");
  const bul = (sl.bullets || []).length ? `<ul>${sl.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "";
  return `<div class="slide"><div class="sk">${esc(sl.kicker || `Slide ${i + 1}`)}</div><div class="stt">${esc(sl.title)}</div>${sl.body ? `<p>${esc(sl.body)}</p>` : ""}${bul}${stats ? `<div class="sts">${stats}</div>` : ""}<div class="sn">${i + 1}</div></div>`;
}
const ask = pitch.ask || ep.ask || {};
const funds = (ask.use_of_funds || []);
const fundColors = ["#e8a400", "#2a6fdb", "#2dbd8f", "#e0517a", "#7b5cd6"];
const askSlide = `<div class="slide ask"><div class="sk">The ask</div><div class="stt">${esc(ask.amount_label || money(ask.amount))} for ${esc(ask.equity)}%</div><p>Implied valuation ${money(askVal)}</p>${funds.length ? `<div class="fund">${funds.map((f, i) => `<i style="flex:${f.pct};background:${fundColors[i % 5]}" title="${esc(f.label)}"></i>`).join("")}</div><ul class="legend">${funds.map((f, i) => `<li><b style="background:${fundColors[i % 5]}"></b>${esc(f.label)} · ${f.pct}%</li>`).join("")}</ul>` : ""}<div class="sn">${(pitch.slides || []).length + 1}</div></div>`;
const deck = (pitch.slides || []).map(slideHTML).join("") + askSlide;

const scoreRows = verdicts.map((v) => `<tr><td class="who">${face(v.shark, 34)}<span><b>${esc(SH[v.shark]?.name)}</b><small>${esc(SH[v.shark]?.archetype)}</small></span></td>${dims.map((d) => `<td style="background:${heat(v.scores?.[d.key] || 0)}">${v.scores?.[d.key] ?? "–"}</td>`).join("")}<td class="tot">${v.total.toFixed(1)}</td><td><span class="chip ${v.status === "out" ? "out" : "in"}">${v.status === "out" ? "OUT" : "IN"}</span></td></tr>`).join("");
const fbCards = verdicts.map((v) => `<div class="fb"><div class="fbh">${face(v.shark, 52, v.status === "out" ? "stern" : "happy")}<div><b style="color:${SH[v.shark]?.color}">${esc(SH[v.shark]?.name)}</b><small>${esc(SH[v.shark]?.archetype)} · ${v.total.toFixed(1)}/10</small></div><span class="chip ${v.status === "out" ? "out" : "in"}">${v.status === "out" ? "OUT" : "IN"}</span></div><blockquote>${esc(v.line)}</blockquote><p>${esc(v.feedback || "")}</p><div class="sc2"><div><h5>Liked</h5><ul>${(v.strengths || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div><div><h5>Worried about</h5><ul>${(v.concerns || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div></div></div>`).join("");

const qaHTML = (qa.rounds || []).map((r) => `<h3 class="rt">${esc(r.title)}</h3>${(r.exchanges || []).map((x) => x.banter
  ? `<div class="ln banter">${face(x.shark, 36)}<div><b>${esc(nm(x.shark))}</b><span class="tg">banter${x.to ? ` → ${esc(SH[x.to]?.short || x.to)}` : ""}</span><p>${esc(x.banter)}</p></div></div>`
  : `<div class="ln q">${face(x.shark, 36)}<div><b>${esc(nm(x.shark))}</b><span class="tg">question</span><p>${esc(x.q)}</p></div></div>${x.a ? `<div class="ln a ${x.by === "human" ? "human" : ""}">${face("founder", 36)}<div><b>${esc(ep.founder?.name || "Founder")}</b><span class="tg">${x.by === "human" ? "answered live" : "founder agent"}</span><p>${esc(x.a)}</p></div></div>` : ""}${x.react ? `<div class="ln r">${face(x.shark, 28)}<div><p>${esc(x.react)}</p></div></div>` : ""}`).join("")}`).join("");

const allOffers = [...(offersF.offers || []).map((o) => ({ ...o, kind: "offer" })), ...(offersF.negotiation || []).filter((n) => n.offer).map((n) => ({ ...n.offer, kind: n.who === "founder" ? "founder counter" : "shark counter", line: n.text }))];
const maxV = Math.max(askVal || 0, ...allOffers.map(val).filter(Boolean), dealVal || 0) || 1;
const bars = [{ label: "Founder's ask", v: askVal, c: "#9aa9bf" }, ...allOffers.map((o) => ({ label: `${(o.sharks || [o.shark]).map((k) => SH[k]?.short || k).join(" + ")} · ${o.kind}`, v: val(o), c: o.kind === "offer" ? "#2a6fdb" : o.kind === "founder counter" ? "#ff8a1f" : "#2dbd8f" })), ...(dealVal ? [{ label: "Final deal", v: dealVal, c: "#e8a400" }] : [])];
const barsHTML = bars.map((b) => `<div class="bar"><span>${esc(b.label)}</span><i><em style="width:${((b.v || 0) / maxV) * 100}%;background:${b.c}"></em></i><b>${money(b.v)}</b></div>`).join("");
const offersRows = (offersF.offers || []).map((o) => `<tr><td>${(o.sharks || [o.shark]).map((k) => face(k, 30)).join("")} ${esc((o.sharks || [o.shark]).map((k) => SH[k]?.short).join(" + "))}</td><td><b>${esc(terms(o))}</b></td><td>${money(val(o))}</td><td>${esc((o.conditions || []).join("; ") || "—")}</td></tr>`).join("");
const negoHTML = (offersF.negotiation || []).map((n) => `<li>${face(n.who, 30)}<div><b>${esc(nm(n.who))}</b> <span class="tg">${esc(n.kind || "")}</span><p>${esc(n.text)}${n.offer ? ` <em class="ot">${esc(terms(n.offer))}</em>` : ""}</p></div></li>`).join("");

const isDeal = deal.status === "DEAL";
const termSheet = isDeal ? `<div class="ts"><div class="tsh"><b>Summary of terms</b><span>Non-binding · simulated</span></div><table>
<tr><th>Company</th><td>${esc(ep.founder?.company || ep.title)}</td></tr>
<tr><th>Investors</th><td>${(deal.sharks || []).map((k) => esc(SH[k]?.name)).join(", ")}</td></tr>
<tr><th>Investment</th><td>${money(deal.amount)}</td></tr>
<tr><th>Equity</th><td>${deal.equity}%${deal.royalty ? ` + royalty: ${esc(deal.royalty)}` : ""}${deal.debt ? ` + ${esc(deal.debt)}` : ""}</td></tr>
<tr><th>Post-money valuation</th><td>${money(dealVal)}</td></tr>
<tr><th>Versus the ask</th><td>${money(askVal)} asked · ${askVal ? `${dealVal >= askVal ? "+" : ""}${Math.round(((dealVal - askVal) / askVal) * 100)}%` : "—"}</td></tr>
<tr><th>Conditions</th><td><ul>${(deal.conditions || []).map((c) => `<li>${esc(c)}</li>`).join("")}</ul></td></tr>
</table></div>` : `<div class="ts no"><div class="tsh"><b>No deal</b><span>${esc(deal.headline || "")}</span></div><p>${esc(deal.summary || "")}</p></div>`;

const fixes = (doc.fixes || []).map((f, i) => `<div class="fix"><div class="fn">${i + 1}</div><div><h4>${esc(f.title)}</h4><p><b>Why:</b> ${esc(f.why)}</p><p><b>How:</b> ${esc(f.how)}</p></div></div>`).join("");
const objs = (doc.objections || []).map((o) => `<div class="obj"><div class="oq">${face(o.shark, 34)}<b>${esc(o.q)}</b></div><div class="ow"><div class="weak"><h5>What you said</h5><p>${esc(o.weak)}</p></div><div class="strong"><h5>Say this instead</h5><p>${esc(o.strong)}</p></div></div></div>`).join("");
const list = (a) => (a || []).map((x) => `<li>${esc(x)}</li>`).join("");
const steps = (doc.next_steps || []).map((s) => `<li><b>${esc(s.when)}</b>${esc(s.action)}</li>`).join("");

const date = (ep.created || "").slice(0, 10);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(ep.title)} · Shark Tank outcome</title>
<style>
:root{--navy:#0a2540;--ink:#14213d;--mut:#5d6f8a;--gold:#e8a400;--gold2:#ffc53d;--line:#e3e9f2;--bg:#f6f8fc;--card:#fff;--red:#d7263d;--green:#14946a}
*{box-sizing:border-box}body{margin:0;font-family:Inter,"Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif;color:var(--ink);background:var(--bg);line-height:1.5}
.head{font-family:"Bebas Neue",Impact,"Arial Narrow Bold","Arial Black",sans-serif;letter-spacing:1px}
header.hero{background:radial-gradient(900px 400px at 80% -20%,#1e5aa0,transparent),linear-gradient(160deg,#0a2540,#04111f);color:#fff;padding:28px 6vw 40px;position:relative;overflow:hidden}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.logo{font-family:"Bebas Neue",Impact,"Arial Black",sans-serif;font-size:28px;letter-spacing:3px;color:var(--gold2)}
.meta{display:flex;gap:6px;flex-wrap:wrap}.meta span{font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;background:rgba(255,255,255,.1);padding:3px 9px;border-radius:99px}
.hgrid{display:grid;grid-template-columns:1.3fr 1fr;gap:30px;align-items:center;margin-top:26px}
h1{font-size:clamp(28px,4vw,46px);line-height:1.08;margin:0 0 10px}
.tag{color:#c9d8ee;font-size:18px;margin:0 0 18px}
.stamp{display:inline-block;font-family:"Bebas Neue",Impact,"Arial Black",sans-serif;font-size:64px;line-height:1;letter-spacing:4px;padding:4px 18px;border:5px solid var(--gold2);color:var(--gold2);border-radius:12px;transform:rotate(-4deg);margin:4px 0 12px}
.stamp.no{border-color:#ff6b81;color:#ff6b81}
.dterms{font-size:22px;font-weight:800}.dsum{color:#c9d8ee;max-width:640px}
.faces{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}.faces svg{width:120px;height:120px;filter:drop-shadow(0 10px 18px rgba(0,0,0,.4))}
.quote{margin-top:12px;font-style:italic;color:#fff;border-left:3px solid var(--gold2);padding-left:12px}
.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin:-22px 6vw 0;position:relative}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px;box-shadow:0 10px 30px rgba(10,37,64,.08)}
.kpi label{display:block;font-size:10.5px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--mut)}.kpi b{font-size:22px}
nav.toc{position:sticky;top:0;z-index:5;background:rgba(246,248,252,.92);backdrop-filter:blur(6px);border-bottom:1px solid var(--line);display:flex;gap:4px;padding:8px 6vw;overflow-x:auto;margin-top:22px}
nav.toc a{font-size:13px;font-weight:700;color:var(--mut);text-decoration:none;padding:6px 10px;border-radius:8px;white-space:nowrap}nav.toc a:hover{background:#e9eef7;color:var(--ink)}
main{padding:10px 6vw 60px}section{margin-top:44px}
h2{font-family:"Bebas Neue",Impact,"Arial Black",sans-serif;font-size:36px;letter-spacing:1.5px;margin:0 0 4px;color:var(--navy)}
.sub{color:var(--mut);margin:0 0 18px}
.btn{display:inline-flex;align-items:center;gap:6px;font:inherit;font-weight:800;font-size:14px;border:0;border-radius:10px;padding:9px 14px;background:linear-gradient(180deg,var(--gold2),var(--gold));color:#2b1600;cursor:pointer;text-decoration:none}
.btn.ghost{background:#e9eef7;color:var(--ink)}
.deck{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.slide{position:relative;aspect-ratio:16/9;border-radius:14px;padding:22px 24px;color:#fff;overflow:hidden;background:radial-gradient(420px 200px at 85% 0%,rgba(255,197,61,.22),transparent),linear-gradient(135deg,#0f2d52,#081a30);box-shadow:0 14px 30px rgba(10,37,64,.18);display:flex;flex-direction:column;justify-content:center}
.slide .sk{font-size:10.5px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:var(--gold2)}
.slide .stt{font-family:"Bebas Neue",Impact,"Arial Black",sans-serif;font-size:30px;line-height:1.02;letter-spacing:.6px;margin:6px 0 8px}
.slide p,.slide li{font-size:13px;color:#cfe0f5;margin:0}.slide ul{margin:4px 0 0;padding-left:18px}
.sts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.st{background:rgba(255,255,255,.08);border-radius:8px;padding:5px 9px}.st b{display:block;font-family:"Bebas Neue",Impact,"Arial Black",sans-serif;font-size:22px;color:var(--gold2)}.st span{font-size:10px;text-transform:uppercase;color:#9fb5d3}
.deck .slide{aspect-ratio:auto;min-height:210px}.sn{position:absolute;right:14px;bottom:10px;font-size:11px;color:#6f89ab}
.fund{display:flex;height:14px;border-radius:7px;overflow:hidden;margin-top:12px}.legend{list-style:none;padding:0!important;margin-top:8px!important}.legend li{display:flex;gap:6px;align-items:center}.legend b{width:10px;height:10px;border-radius:3px;display:inline-block}
.twocol{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px;box-shadow:0 6px 20px rgba(10,37,64,.05)}
.card h3{margin:0 0 8px;font-size:15px;text-transform:uppercase;letter-spacing:.8px;color:var(--mut)}
.card.v2{border:2px solid var(--gold);background:linear-gradient(180deg,#fffaf0,#fff)}
.big{font-size:16.5px;line-height:1.6}
.scoregrid{display:grid;grid-template-columns:360px 1fr;gap:18px;align-items:start}.radar{width:100%}
table{width:100%;border-collapse:collapse}th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:center;font-size:14px}th{font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--mut)}
td.who{display:flex;gap:8px;align-items:center;text-align:left}td.who small{display:block;color:var(--mut);font-size:11px}td.tot{font-weight:900;font-size:16px}
.chip{font-size:11px;font-weight:900;letter-spacing:.8px;padding:3px 9px;border-radius:99px}.chip.in{background:#d9f6ea;color:var(--green)}.chip.out{background:#fde2e6;color:var(--red)}
.fbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:14px;margin-top:16px}
.fb{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px}.fbh{display:flex;gap:10px;align-items:center}.fbh div{flex:1}.fbh small{display:block;color:var(--mut)}
blockquote{margin:10px 0;padding:10px 12px;background:#f3f6fb;border-radius:10px;font-style:italic}
.sc2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sc2 h5{margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--mut)}.sc2 ul{margin:4px 0 0;padding-left:16px;font-size:13px}
.rt{font-family:"Bebas Neue",Impact,"Arial Black",sans-serif;font-size:24px;letter-spacing:1px;color:var(--navy);margin:22px 0 8px}
.ln{display:grid;grid-template-columns:40px 1fr;gap:10px;margin:8px 0;max-width:860px}.ln p{margin:2px 0 0}.ln>div{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px 12px}
.ln.a{margin-left:46px}.ln.a>div{background:#fff5ea;border-color:#ffd6ad}.ln.a.human>div{background:#eef1ff;border-color:#c3ccff}
.ln.r{grid-template-columns:30px 1fr;margin-left:46px}.ln.r>div{background:transparent;border:0;color:var(--mut);font-style:italic;padding:2px 0}
.ln.banter>div{background:#fff9e0;border-color:#f4e3a1}
.tg{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;margin-left:8px;padding:1px 7px;border-radius:99px;background:#eef2f8;color:var(--mut)}
.bar{display:grid;grid-template-columns:240px 1fr 100px;gap:10px;align-items:center;margin:8px 0;font-size:13.5px}.bar i{height:16px;border-radius:8px;background:#edf1f7;overflow:hidden}.bar em{display:block;height:100%;border-radius:8px}.bar b{text-align:right}
.nego{list-style:none;padding:0;margin:0}.nego li{display:grid;grid-template-columns:34px 1fr;gap:10px;margin:10px 0}.nego p{margin:2px 0 0}.ot{font-style:normal;font-weight:800;background:#fff2cc;padding:1px 7px;border-radius:6px}
.ts{background:var(--card);border:2px solid var(--navy);border-radius:16px;overflow:hidden}.ts.no{border-color:var(--red);padding-bottom:12px}.ts.no p{padding:0 18px}
.tsh{display:flex;justify-content:space-between;background:var(--navy);color:#fff;padding:12px 18px}.ts.no .tsh{background:var(--red)}.tsh span{font-size:12px;opacity:.8}
.ts th{text-align:left;width:220px}.ts td{text-align:left}.ts ul{margin:0;padding-left:18px}
.verdict{font-size:19px;font-weight:700;background:var(--navy);color:#fff;border-radius:16px;padding:18px 22px}
.fixes{display:grid;gap:12px;margin-top:16px}.fix{display:grid;grid-template-columns:44px 1fr;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px}.fix h4{margin:0 0 4px;font-size:17px}.fix p{margin:2px 0;font-size:14px}
.fn{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:900;background:linear-gradient(180deg,var(--gold2),var(--gold));color:#2b1600}
.obj{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin-top:12px}.oq{display:flex;gap:10px;align-items:center}
.ow{display:grid;grid-template-columns:1fr 1.3fr;gap:12px;margin-top:10px}.ow h5{margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.6px}.ow p{margin:4px 0 0;font-size:14px}
.weak{background:#fdf0f2;border-radius:10px;padding:10px 12px}.weak h5{color:var(--red)}.strong{background:#e9f8f1;border-radius:10px;padding:10px 12px}.strong h5{color:var(--green)}
.three{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:16px}.three ul,.three ol{margin:0;padding-left:18px;font-size:14px}
.steps{list-style:none;padding:0;margin:0}.steps li{margin:8px 0;font-size:14px}.steps b{display:inline-block;min-width:88px;color:var(--gold)}
footer{padding:26px 6vw;color:var(--mut);font-size:12.5px;border-top:1px solid var(--line);background:#fff}
#present{position:fixed;inset:0;z-index:50;background:#020b16;display:none;align-items:center;justify-content:center}
#present.on{display:flex}#present .slide{width:min(92vw,calc(88vh*16/9));border-radius:18px;padding:5vh 5vw}
#present .slide .stt{font-size:clamp(36px,6vh,72px)}#present .slide p,#present .slide li{font-size:clamp(16px,2.4vh,26px)}#present .st b{font-size:clamp(28px,5vh,56px)}#present .st span{font-size:clamp(11px,1.5vh,16px)}#present .slide .sk{font-size:clamp(12px,1.6vh,16px)}
#present .pc{position:fixed;bottom:16px;left:0;right:0;text-align:center;color:#6f89ab;font-size:13px}
@media(max-width:900px){.hgrid,.twocol,.scoregrid,.three,.ow,.sc2{grid-template-columns:1fr}.kpis{grid-template-columns:repeat(2,1fr)}.bar{grid-template-columns:120px 1fr 80px}.faces svg{width:90px;height:90px}}
@media print{nav.toc,.noprint,#present{display:none!important}body{background:#fff}.kpis{margin-top:10px}section{break-inside:avoid-page}.slide{break-inside:avoid}}
</style></head><body>
<header class="hero">
  <div class="top"><div class="logo">🦈 THE TANK · EPISODE OUTCOME</div><div class="meta"><span>${esc(panelLabel)}</span><span>${ep.mode === "manual" ? "Manual · founder answered live" : "Auto · founder agent"}</span><span>${esc(date)}</span></div></div>
  <div class="hgrid">
    <div>
      <h1>${esc(ep.title)}</h1>
      <p class="tag">${esc(pitch.tagline || pitch.one_liner || "")}</p>
      <div class="stamp ${isDeal ? "" : "no"}">${isDeal ? "DEAL" : esc(deal.status === "NO DEAL" ? "NO DEAL" : deal.status)}</div>
      <div class="dterms">${isDeal ? `${esc(terms(deal))} · valuation ${money(dealVal)}` : esc(deal.headline || "")}</div>
      <p class="dsum">${esc(deal.summary || "")}</p>
      ${deal.founderLine ? `<div class="quote">“${esc(deal.founderLine)}” — ${esc(ep.founder?.name || "Founder")}</div>` : ""}
    </div>
    <div class="faces">${isDeal ? (deal.sharks || []).map((k) => face(k, 120, "happy")).join("") : (ep.sharks || []).map((k) => face(k, 90, "stern")).join("")}${face("founder", 120)}</div>
  </div>
</header>
<div class="kpis">
  <div class="kpi"><label>The ask</label><b>${money(ask.amount)} · ${esc(ask.equity)}%</b></div>
  <div class="kpi"><label>Ask valuation</label><b>${money(askVal)}</b></div>
  <div class="kpi"><label>Deal valuation</label><b>${dealVal ? money(dealVal) : "—"}</b></div>
  <div class="kpi"><label>Equity given</label><b>${isDeal ? `${deal.equity}%` : "0%"}</b></div>
  <div class="kpi"><label>Sharks in</label><b>${inCount} / ${verdicts.length || (ep.sharks || []).length}</b></div>
  <div class="kpi"><label>Avg shark score</label><b>${avg.toFixed(1)} / 10</b></div>
</div>
<nav class="toc"><a href="#deck">Pitch deck</a><a href="#pitch">60-sec pitch</a><a href="#scores">Scorecard</a><a href="#grill">The grilling</a><a href="#offers">Offers</a><a href="#terms">Terms</a><a href="#doctor">Pitch Doctor</a><a href="#" onclick="window.print();return false">Print / PDF</a></nav>
<main>
<section id="deck"><h2>The pitch deck</h2><p class="sub">The deck the founder walked in with. Press <b>Present</b> for full-screen slides (← → to move, Esc to exit).</p>
<p class="noprint"><button class="btn" onclick="present(0)">▶ Present</button></p><div class="deck">${deck}</div></section>

<section id="pitch"><h2>The 60-second pitch</h2><p class="sub">What was said in the Tank, and the Pitch Doctor's rewrite built from every shark's objections.</p>
<div class="twocol"><div class="card"><h3>As pitched</h3><p class="big">${esc(pitch.elevator_60s || pitch.one_liner || "")}</p></div><div class="card v2"><h3>Pitch v2 · investor-ready</h3><p class="big">${esc(doc.pitch_v2 || "")}</p></div></div></section>

<section id="scores"><h2>Investor scorecard</h2><p class="sub">Each shark scored six dimensions out of 10, weighted by what that shark cares about most. Gold is the panel average.</p>
<div class="scoregrid"><div class="card">${radar()}</div><div class="card" style="overflow-x:auto"><table><tr><th style="text-align:left">Shark</th>${dims.map((d) => `<th>${esc(d.label)}</th>`).join("")}<th>Score</th><th></th></tr>${scoreRows}</table></div></div>
<div class="fbs">${fbCards}</div></section>

<section id="grill"><h2>The grilling</h2><p class="sub">Every question, every answer, every aside.</p>${qaHTML}</section>

<section id="offers"><h2>Offers &amp; negotiation</h2><p class="sub">Every number on the table, as an implied valuation.</p>
<div class="card">${barsHTML}</div>
${offersRows ? `<div class="card" style="margin-top:14px;overflow-x:auto"><table><tr><th style="text-align:left">Shark</th><th>Terms</th><th>Valuation</th><th>Conditions</th></tr>${offersRows}</table></div>` : ""}
${negoHTML ? `<div class="card" style="margin-top:14px"><h3>How it was negotiated</h3><ul class="nego">${negoHTML}</ul></div>` : ""}</section>

<section id="terms"><h2>${isDeal ? "The deal" : "The outcome"}</h2><p class="sub">${isDeal ? "A plain summary of what was agreed in the Tank. On the show, as here, this is where due diligence begins." : "Why the founder left without a cheque."}</p>${termSheet}</section>

<section id="doctor"><h2>The Pitch Doctor</h2><p class="sub">What to change before you pitch a real investor.</p>
${doc.verdict_line ? `<div class="verdict">${esc(doc.verdict_line)}</div>` : ""}
<div class="fixes">${fixes}</div>
${objs ? `<h3 class="rt">Objection bank</h3>${doc.note ? `<p class="sub">${esc(doc.note)}</p>` : ""}${objs}` : ""}
<div class="three"><div class="card"><h3>Bring these numbers</h3><ul>${list(doc.metrics_to_bring)}</ul></div><div class="card"><h3>Due-diligence checklist</h3><ul>${list(doc.dd_checklist)}</ul></div><div class="card"><h3>Next steps</h3><ul class="steps">${steps}</ul></div></div></section>
</main>
<footer>Generated by <b>SharkTank</b> for Claude Code. The sharks are fictional characters whose investing styles were researched from public reporting on Shark Tank India and Shark Tank USA (see the repo's research notes). They are not the real investors, do not speak for them, and nothing here is investment, legal or financial advice. Scores and offers are simulations to stress-test a pitch.</footer>
<div id="present" onclick="next(1)"><div id="pslide"></div><div class="pc">← → to move · Esc to exit</div></div>
<script>
const S=[...document.querySelectorAll('.deck .slide')].map(s=>s.outerHTML);let i=0;
function present(n){i=n;document.getElementById('present').classList.add('on');show();document.documentElement.requestFullscreen?.().catch(()=>{});}
function show(){document.getElementById('pslide').innerHTML=S[i];}
function next(d){i=Math.max(0,Math.min(S.length-1,i+d));show();}
addEventListener('keydown',e=>{const p=document.getElementById('present');if(!p.classList.contains('on'))return;if(e.key==='ArrowRight'||e.key===' ')next(1);if(e.key==='ArrowLeft')next(-1);if(e.key==='Escape'){p.classList.remove('on');document.fullscreenElement&&document.exitFullscreen();}});
document.querySelectorAll('.deck .slide').forEach((s,k)=>s.addEventListener('click',()=>present(k)));
</script>
</body></html>`;
fs.writeFileSync(OUT, html);
console.log(`outcome report → ${path.relative(process.cwd(), OUT)} (${(html.length / 1024).toFixed(0)} KB)`);
