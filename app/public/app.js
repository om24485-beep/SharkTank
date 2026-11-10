import { sharkSVG, founderSVG } from "/avatars.js";

const $ = (s) => document.querySelector(s);
const qs = new URLSearchParams(location.search);
const S = {
  panels: null, sharks: {}, ep: null, epId: null, events: [], played: new Set(), queue: [],
  speed: Number(qs.get("speed")) || 1, running: false, token: 0, svg: {}, inCount: 0, best: null, es: null, askOpen: false, stats: [], tagline: "",
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms / S.speed));
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- money ----------
function money(n, cur) {
  if (n == null || isNaN(n)) return "—";
  if (cur === "INR") {
    if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `₹${+(n / 1e5).toFixed(1)} L`;
    return `₹${Math.round(n).toLocaleString("en-IN")}`;
  }
  if (n >= 1e6) return `$${+(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${+(n / 1e3).toFixed(0)}k`;
  return `$${Math.round(n)}`;
}
const cur = () => S.ep?.currency || "INR";
function termStr(o) {
  if (!o) return "—";
  let s = `${money(o.amount, cur())} for ${o.equity}%`;
  if (o.royalty) s += ` + ${o.royalty}`;
  if (o.debt) s += ` + ${o.debt}`;
  return s;
}

function readable(hex) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (L > 0.42) return hex;
  const mix = (c) => Math.round(c + (255 - c) * 0.55);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

// ---------- avatars ----------
function svgFor(who, v) {
  const key = `${who}:${v}`;
  if (S.svg[key]) return S.svg[key];
  let out;
  if (who === "founder") out = founderSVG({ mouth: v === "open" ? "open" : "closed", blink: v === "blink", human: S.ep?.mode === "manual" });
  else {
    const s = S.sharks[who]; if (!s) return "";
    const [m, mood] = v.split("|");
    out = sharkSVG(s, { mouth: m === "open" ? "open" : "closed", blink: m === "blink", mood: mood || "neutral" });
  }
  return (S.svg[key] = out);
}
function setFace(who, m = "closed", mood) {
  if (who === "founder") { $("#founderAv").innerHTML = svgFor("founder", m); return; }
  const el = document.querySelector(`.seat[data-k="${who}"] .av`);
  if (!el) return;
  const md = mood || el.dataset.mood || "neutral";
  el.dataset.mood = md;
  el.innerHTML = svgFor(who, `${m}|${md}`);
}

// ---------- stage ----------
function renderSeats() {
  const box = $("#sharks"); box.innerHTML = "";
  (S.ep.sharks || []).forEach((k) => {
    const s = S.sharks[k]; if (!s) return;
    const d = document.createElement("div");
    d.className = "seat"; d.dataset.k = k;
    d.innerHTML = `<div class="chair"></div><div class="av" data-mood="neutral"></div><div class="score" style="--p:0"><span>0</span></div><div class="stamp o">I'M OUT</div><div class="stamp i">IN</div><div class="plate"><div class="nm" style="color:${readable(s.color)}">${esc(s.name)}</div><div class="ar">${esc(s.archetype)}</div></div>`;
    box.appendChild(d);
    setFace(k);
  });
  setFace("founder");
}
function blinker() {
  setInterval(() => {
    const seats = [...document.querySelectorAll(".seat:not(.speaking)")];
    if (!seats.length) return;
    const s = seats[Math.floor(Math.random() * seats.length)];
    setFace(s.dataset.k, "blink");
    setTimeout(() => !s.classList.contains("speaking") && setFace(s.dataset.k, "closed"), 160);
  }, 1300);
}

async function speak(who, text, kind = "say", by) {
  if (!text) return;
  const my = S.token;
  const isF = who === "founder";
  let bubble;
  if (isF) {
    bubble = $("#founderBubble");
    bubble.className = `bubble founder-bubble${by === "human" ? " human" : ""}`;
    bubble.hidden = false;
  } else {
    const seat = document.querySelector(`.seat[data-k="${who}"]`);
    if (!seat) return;
    document.querySelectorAll(".seat").forEach((x) => x.classList.remove("speaking"));
    seat.classList.add("speaking");
    bubble = document.createElement("div");
    bubble.className = `bubble shark-bubble kind-${kind}`;
    const st = $("#stage").getBoundingClientRect(), r = seat.getBoundingClientRect();
    const w = Math.min(380, st.width - 30);
    const cx = r.left - st.left + r.width / 2;
    const left = Math.max(12, Math.min(st.width - w - 12, cx - w / 2));
    bubble.style.cssText = `top:${r.bottom - st.top + 8}px;left:${left}px;width:${w}px;--tail:${cx - left}px`;
    $("#stage").appendChild(bubble);
  }
  const s = S.sharks[who];
  const name = isF ? (by === "human" ? `${S.ep?.founder?.name || "You"} · live` : (S.ep?.founder?.name || "Founder")) : `${s.short} · ${s.archetype}`;
  const color = isF ? (by === "human" ? "#4361ee" : "#e85d04") : s.color;
  bubble.innerHTML = `<span class="who" style="color:${color}">${esc(name)}</span><span class="tx"></span><span class="caret"></span>`;
  const tx = bubble.querySelector(".tx");
  let open = false;
  const mouth = setInterval(() => { open = !open; setFace(who, open ? "open" : "closed"); }, 130);
  const per = Math.max(10, Math.min(26, 3200 / text.length));
  for (let i = 0; i < text.length; i += 2) {
    if (my !== S.token) break;
    tx.textContent = text.slice(0, i + 2);
    await sleep(per);
  }
  tx.textContent = text;
  clearInterval(mouth); setFace(who, "closed");
  bubble.querySelector(".caret")?.remove();
  await sleep(Math.min(2600, 900 + text.length * 12));
  if (isF) bubble.hidden = true; else { bubble.remove(); document.querySelector(`.seat[data-k="${who}"]`)?.classList.remove("speaking"); }
}

function feed(who, text, tag, by) {
  const box = $("#feed");
  box.querySelector(".empty")?.remove();
  const m = document.createElement("div");
  if (who === "sys") { m.className = "msg sys"; m.innerHTML = `<div class="mb">${esc(text)}</div>`; }
  else {
    const isF = who === "founder", s = S.sharks[who];
    m.className = `msg ${isF ? "founder" : ""} ${by === "human" ? "human" : ""}`;
    const nm = isF ? (by === "human" ? `${S.ep?.founder?.name || "You"} (human)` : `${S.ep?.founder?.name || "Founder"} (AI)`) : s?.name;
    m.innerHTML = `<div class="mav">${isF ? founderSVG({ human: by === "human", size: 38 }) : sharkSVG(s, { size: 38 })}</div><div class="mb"><div class="mn" style="color:${isF ? "#ff9f1c" : readable(s?.color || "#ffffff")}">${esc(nm)}${tag ? `<span class="tag">${esc(tag)}</span>` : ""}</div>${esc(text)}</div>`;
  }
  box.appendChild(m);
  box.scrollTop = box.scrollHeight;
}

function showSlide(sl, i) {
  const stats = (sl.stats || []).map((x) => `<div><b>${esc(x.value)}</b><span>${esc(x.label)}</span></div>`).join("");
  const bullets = (sl.bullets || []).length ? `<ul>${sl.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "";
  $("#screen").innerHTML = `<div class="screen-inner"><div class="slide-kicker">${esc(sl.kicker || `Slide ${i + 1}`)}</div><div class="slide-title">${esc(sl.title)}</div><div class="slide-body">${esc(sl.body || "")}${bullets}</div>${stats ? `<div class="slide-stat">${stats}</div>` : ""}</div>`;
}
async function phase(t, s) {
  const p = $("#phase"); $("#phaseT").textContent = t; $("#phaseS").textContent = s || "";
  p.hidden = false; p.style.animation = "none"; void p.offsetWidth; p.style.animation = "";
  feed("sys", t);
  await sleep(2300); p.hidden = true;
}
function meter(id, v) { const b = $(id); b.textContent = v; b.classList.remove("flash"); void b.offsetWidth; b.classList.add("flash"); }

function scoreCard(v) {
  const box = $("#score"); box.querySelector(".empty")?.remove();
  const s = S.sharks[v.shark];
  const dims = S.panels.dimensions.map((d) => `<div><span>${esc(d.label)}</span><i style="--v:${v.scores?.[d.key] ?? 0}"></i><b>${v.scores?.[d.key] ?? "-"}</b></div>`).join("");
  const c = document.createElement("div"); c.className = "sc";
  c.innerHTML = `<div class="sc-h">${sharkSVG(s, { size: 40 })}<b style="color:${s.color}">${esc(s.name)}<br><small style="color:var(--muted)">${v.status === "out" ? "OUT" : "IN"}</small></b><span class="sc-tot">${v.total?.toFixed ? v.total.toFixed(1) : v.total}</span></div><div class="bars">${dims}</div><p class="muted" style="margin:8px 0 0">${esc(v.feedback || "")}</p>`;
  box.appendChild(c);
}
function offerCard(o, counter) {
  const box = $("#offers"); box.querySelector(".empty")?.remove();
  const names = (o.sharks || [o.shark || o.who]).map((k) => S.sharks[k]?.short || (k === "founder" ? "Founder" : k)).join(" + ");
  const c = document.createElement("div"); c.className = `oc${counter ? " counter" : ""}`;
  c.innerHTML = `<div class="who">${counter ? "↔ Counter · " : "🦈 "}${esc(names)}</div><div class="terms">${esc(termStr(o))}</div><div class="cond">Valuation ${money(o.amount / (o.equity / 100), cur())}${o.conditions ? ` · ${esc(Array.isArray(o.conditions) ? o.conditions.join("; ") : o.conditions)}` : ""}</div>`;
  box.appendChild(c);
}
function confetti() {
  const c = document.createElement("div"); c.className = "confetti";
  const cols = ["#ffc53d", "#ff9f1c", "#2dd4a0", "#4cc9f0", "#ff4d6d", "#fff"];
  for (let i = 0; i < 140; i++) {
    const p = document.createElement("i");
    p.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % cols.length]};--dx:${(Math.random() - .5) * 300}px;animation-duration:${2.5 + Math.random() * 2.5}s;animation-delay:${Math.random() * 1.2}s`;
    c.appendChild(p);
  }
  $("#overlay").appendChild(c);
}

// ---------- events ----------
async function play(e) {
  switch (e.type) {
    case "setup": {
      S.ep = e.episode;
      $("#epTitle").textContent = S.ep.title;
      $("#epPanel").textContent = S.panels.panels[S.ep.panel]?.label || S.ep.panel;
      $("#epMode").textContent = S.ep.mode === "manual" ? "Manual · you answer" : "Auto · founder agent";
      $("#founderName").textContent = S.ep.founder?.company || S.ep.founder?.name || "Founder";
      S.svg = {}; renderSeats();
      const a = S.ep.ask; if (a) { meter("#mAsk", `${money(a.amount, cur())} · ${a.equity}%`); meter("#mVal", money(a.amount / (a.equity / 100), cur())); }
      S.inCount = (S.ep.sharks || []).length; meter("#mIn", `${S.inCount} / ${S.inCount}`);
      feed("sys", `Tonight in the Tank`);
      await sleep(600); break;
    }
    case "phase": {
      if (/^Round|Verdict|Offer/i.test(e.title) && S.stats.length) showSlide({ kicker: e.title, title: S.tagline || S.ep?.title, stats: S.stats.slice(0, 4) }, 0);
      await phase(e.title, e.sub); break;
    }
    case "slide": if ((e.slide.stats || []).length > S.stats.length) S.stats = e.slide.stats; if (e.index === 0) S.tagline = e.slide.title; showSlide(e.slide, e.index); feed("founder", e.text, "pitch"); await speak("founder", e.text); break;
    case "ask": feed("founder", e.text, "the ask"); await speak("founder", e.text); break;
    case "say": feed(e.who, e.text, e.kind === "answer" ? (e.by === "human" ? "you" : "founder agent") : e.kind, e.by); await speak(e.who, e.text, e.kind, e.by); break;
    case "pending": openAsk(e); break;
    case "verdict": {
      const v = e.verdict, seat = document.querySelector(`.seat[data-k="${v.shark}"]`);
      if (seat) {
        seat.classList.add("scored");
        const sc = seat.querySelector(".score"); sc.style.setProperty("--p", (v.total || 0) * 10); sc.querySelector("span").textContent = (+v.total).toFixed(1);
        setFace(v.shark, "closed", v.status === "out" ? "stern" : "happy");
      }
      scoreCard(v); feed(v.shark, e.text, v.status === "out" ? "I'm out" : "interested");
      await speak(v.shark, e.text, "verdict");
      if (seat) seat.classList.add(v.status === "out" ? "out" : "in");
      if (v.status === "out") { S.inCount--; meter("#mIn", `${S.inCount} / ${(S.ep.sharks || []).length}`); }
      await sleep(400); break;
    }
    case "offer": {
      offerCard(e.offer); feed(e.who, `${e.text} [${termStr(e.offer)}]`, "offer");
      const val = e.offer.amount / (e.offer.equity / 100);
      if (!S.best || val > S.best) { S.best = val; meter("#mBest", termStr(e.offer)); }
      await speak(e.who, `${e.text}`, "offer"); break;
    }
    case "counter": offerCard(e.offer, true); if (e.who !== "founder") meter("#mBest", termStr(e.offer)); feed(e.who, `${e.text} [${termStr(e.offer)}]`, "counter", e.by); await speak(e.who, e.text, "negotiation", e.by); break;
    case "deal": await showDeal(e.deal); break;
    case "report": { const b = $("#btnReport"); b.href = e.url; b.hidden = false; feed("sys", "Outcome report ready"); break; }
  }
}
async function showDeal(d) {
  const ov = $("#overlay"); ov.hidden = false;
  const yes = d.status === "DEAL";
  const faces = (d.sharks || []).map((k) => S.sharks[k] ? sharkSVG(S.sharks[k], { mood: "happy", size: 110 }) : "").join("") + founderSVG({ human: S.ep?.mode === "manual", size: 110 });
  ov.innerHTML = `<div class="deal-card"><div class="deal-word ${yes ? "" : "no"}">${yes ? "DEAL!" : "NO DEAL"}</div><div class="deal-terms">${yes ? esc(termStr(d)) + ` · valuation ${money(d.amount / (d.equity / 100), cur())}` : esc(d.headline || "The founder walks away")}</div><div class="deal-faces">${faces}</div><div class="deal-sum">${esc(d.summary || "")}</div>${d.report !== false ? `<p><a class="btn gold" href="/episodes/${S.epId}/outcome.html" target="_blank">Open the pitch-ready outcome report →</a></p>` : ""}</div>`;
  if (yes) confetti();
  feed("sys", yes ? `DEAL · ${termStr(d)}` : "NO DEAL");
  if (d.founderLine) feed("founder", d.founderLine, "final", S.ep?.mode === "manual" ? "human" : "agent");
  await sleep(4000);
}

// ---------- manual-mode answers ----------
function openAsk(e) {
  if (S.askOpen) return;
  S.askOpen = true;
  $("#askList").innerHTML = e.questions.map((q) => `<div class="aq">${S.sharks[q.shark] ? sharkSVG(S.sharks[q.shark], { size: 46 }) : ""}<div><p><span style="color:${S.sharks[q.shark]?.color}">${esc(S.sharks[q.shark]?.short || q.shark)}:</span> ${esc(q.q)}</p><textarea name="${esc(q.id)}" placeholder="Your answer…">${esc(e.answers?.[q.id] || "")}</textarea></div></div>`).join("");
  const dlg = $("#ask"); dlg.showModal();
  $("#askForm").onsubmit = async (ev) => {
    ev.preventDefault();
    const answers = Object.fromEntries([...$("#askForm").querySelectorAll("textarea")].map((t) => [t.name, t.value]));
    await fetch("/api/answer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ episode: S.epId, answers }) });
    dlg.close(); S.askOpen = false; feed("sys", "Answers sent to the Tank");
  };
}

// ---------- engine ----------
async function pump() {
  if (S.running) return;
  S.running = true;
  const my = S.token;
  while (my === S.token) {
    const next = S.events.find((e) => !S.played.has(e.id));
    if (!next) break;
    S.played.add(next.id);
    try { await play(next); } catch (err) { console.error(err); }
  }
  S.running = false;
}
function ingest(t) {
  if (!t) return;
  S.events = t.events || [];
  const live = !S.events.some((e) => e.type === "deal");
  $("#epLive").hidden = !live;
  pump();
}
function resetStage() {
  S.token++; S.played = new Set(); S.stats = []; S.tagline = ""; S.running = false; S.best = null; S.askOpen = false;
  document.querySelectorAll(".bubble.shark-bubble").forEach((b) => b.remove());
  $("#founderBubble").hidden = true; $("#overlay").hidden = true; $("#overlay").innerHTML = ""; $("#btnReport").hidden = true;
  $("#feed").innerHTML = ""; $("#score").innerHTML = `<div class="empty">Scores land after the grilling.</div>`; $("#offers").innerHTML = `<div class="empty">No offers yet.</div>`;
  ["#mAsk", "#mVal", "#mIn", "#mBest"].forEach((x) => ($(x).textContent = "—"));
}
function load(id) {
  resetStage(); S.epId = id;
  history.replaceState(null, "", `?ep=${encodeURIComponent(id)}${S.speed !== 1 ? `&speed=${S.speed}` : ""}`);
  if (S.es) S.es.close();
  S.es = new EventSource(`/api/stream/${encodeURIComponent(id)}`);
  S.es.onmessage = (m) => ingest(JSON.parse(m.data));
}
async function refreshList(selectId) {
  const { episodes } = await (await fetch("/api/episodes")).json();
  const sel = $("#epPick");
  sel.innerHTML = episodes.map((e) => `<option value="${esc(e.id)}">${e.status === "LIVE" ? "● " : e.status === "DEAL" ? "✅ " : "✖ "}${esc(e.title)}</option>`).join("") || `<option>No episodes yet</option>`;
  if (selectId) sel.value = selectId;
  return episodes;
}

async function boot() {
  S.panels = await (await fetch("/api/panels")).json();
  S.panels.sharks.forEach((s) => (S.sharks[s.key] = s));
  $("#btnSpeed").textContent = `${S.speed}×`;
  const eps = await refreshList();
  const want = qs.get("ep") || eps[0]?.id;
  if (want) { $("#epPick").value = want; load(want); }
  $("#epPick").onchange = (e) => load(e.target.value);
  $("#btnReplay").onclick = () => S.epId && load(S.epId);
  $("#btnSpeed").onclick = () => { S.speed = S.speed >= 4 ? 1 : S.speed * 2; $("#btnSpeed").textContent = `${S.speed}×`; };
  document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => {
    document.querySelectorAll(".tab,.pane").forEach((x) => x.classList.remove("on"));
    t.classList.add("on"); $(`#${t.dataset.tab}`).classList.add("on");
  }));
  blinker();
  // a new episode started in Claude Code? jump to it
  setInterval(async () => {
    const l = await (await fetch("/api/latest")).json();
    if (l.id && l.live && l.id !== S.epId && !qs.get("ep")) { await refreshList(l.id); load(l.id); }
  }, 4000);
}
boot();
