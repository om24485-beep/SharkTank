// The Tank: a zero-dependency local web app that plays Shark Tank episodes
// live as Claude Code writes them into episodes/<id>/. No AI calls here.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { ROOT, EPISODES, PANELS, listEpisodes, timeline, episodeDir, writeAnswers } from "./lib/episodes.mjs";

const PORT = Number(process.env.PORT) || 4740;
const PUBLIC = path.join(ROOT, "app", "public");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json; charset=utf-8", ".ico": "image/x-icon" };

function send(res, code, body, type = "application/json; charset=utf-8") {
  res.writeHead(code, { "content-type": type, "cache-control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function serveFile(res, file) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, "Not found", "text/plain");
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
}
async function readBody(req) {
  let raw = "";
  for await (const c of req) { raw += c; if (raw.length > 2e5) throw new Error("body too large"); }
  return raw ? JSON.parse(raw) : {};
}
function stamp(dir) {
  try { return fs.readdirSync(dir).map((f) => { const s = fs.statSync(path.join(dir, f)); return `${f}:${s.size}:${s.mtimeMs}`; }).join("|"); } catch { return ""; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = decodeURIComponent(url.pathname);
  try {
    if (p === "/api/panels") return send(res, 200, PANELS);
    if (p === "/api/episodes") return send(res, 200, { episodes: listEpisodes() });
    if (p.startsWith("/api/episodes/")) {
      const t = timeline(p.split("/").pop());
      return t ? send(res, 200, t) : send(res, 404, { error: "no such episode" });
    }
    if (p === "/api/answer" && req.method === "POST") {
      const { episode, answers } = await readBody(req);
      return send(res, 200, { ok: true, answers: writeAnswers(episode, answers) });
    }
    if (p.startsWith("/api/stream/")) {
      const id = p.split("/").pop();
      const dir = episodeDir(id);
      if (!dir) return send(res, 404, { error: "no such episode" });
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      let last = "";
      const tick = () => {
        const s = stamp(dir);
        if (s !== last) { last = s; res.write(`data: ${JSON.stringify(timeline(id))}\n\n`); }
      };
      tick();
      const t = setInterval(tick, 700);
      const ping = setInterval(() => res.write(": ping\n\n"), 15000);
      res.on("close", () => { clearInterval(t); clearInterval(ping); });
      return;
    }
    if (p === "/api/latest") {
      const l = listEpisodes()[0];
      return send(res, 200, { id: l ? l.id : null, live: l ? l.status === "LIVE" : false });
    }
    if (p.startsWith("/episodes/")) {
      const file = path.normalize(path.join(EPISODES, p.slice("/episodes/".length)));
      if (!file.startsWith(EPISODES)) return send(res, 403, "Forbidden", "text/plain");
      return serveFile(res, file);
    }
    const file = path.normalize(path.join(PUBLIC, p === "/" ? "index.html" : p));
    if (!file.startsWith(PUBLIC)) return send(res, 403, "Forbidden", "text/plain");
    return serveFile(res, file);
  } catch (e) {
    send(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, () => {
  console.log(`\n  🦈  The Tank is open: http://localhost:${PORT}\n      Run /shark-tank in Claude Code and watch the episode play here.\n`);
});
