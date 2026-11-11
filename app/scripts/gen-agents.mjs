#!/usr/bin/env node
// Generates one sub-agent per shark (agents/shark-<key>.md) and one dossier
// per shark (skills/shark-tank/sharks/<key>.md) from panels.json.
// Edit panels.json, then run: npm run agents
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILL_DIR = fs.existsSync(path.join(ROOT, "panels.json")) ? ROOT : path.join(ROOT, "skills", "shark-tank");
const P = JSON.parse(fs.readFileSync(path.join(SKILL_DIR, "panels.json"), "utf8"));
const PFX = SKILL_DIR === ROOT ? "" : "skills/shark-tank/";
const byKey = Object.fromEntries(P.sharks.map((s) => [s.key, s]));
const list = (a) => a.map((x) => `- ${x}`).join("\n");
const names = (keys) => keys.map((k) => `${byKey[k].short} (${byKey[k].archetype})`).join(", ");
fs.mkdirSync(path.join(ROOT, "agents"), { recursive: true });
fs.mkdirSync(path.join(SKILL_DIR, "sharks"), { recursive: true });

for (const s of P.sharks) {
  const panel = P.panels[s.panel];
  const dossier = `# ${s.name} · ${s.archetype}

Panel: ${panel.label} (${panel.symbol}). Pillar: **${s.pillar}**.
The question this shark owns: **${s.question}**

## Research basis
${s.inspiredBy}
This is a fictional character. The style above is a public-reporting summary used to shape the character; the character is not that person and never speaks for them. See \`../research/RESEARCH.md\`.

## Loves
${list(s.loves)}

## Red flags
${list(s.redFlags)}

## Signature questions (adapt to the pitch, never read verbatim twice)
${list(s.signatureQuestions)}

## Deal style
- Instrument: ${s.dealStyle.instrument}
- Typical equity: ${s.dealStyle.typicalEquity}
- Typical cheque: ${s.dealStyle.ticket}
- Quirks: ${s.dealStyle.quirks}

## Voice
${s.voice}
Catchphrase (use at most once per episode): "${s.catchphrase}"

## Table dynamics
- Rivals: ${names(s.rivals)}
- Allies: ${names(s.allies)}

## Goes out when
${list(s.outRules)}

## Scoring weights
${Object.entries(s.weights).map(([k, v]) => `${k} ×${v}`).join(" · ")}
`;
  fs.writeFileSync(path.join(SKILL_DIR, "sharks", `${s.key}.md`), dossier);

  const agent = `---
name: shark-${s.key}
description: ${s.name}, "${s.archetype}", a shark on the ${panel.label} panel in /shark-tank. Owns ${s.pillar.toLowerCase()}. Use inside a /shark-tank episode, or when someone wants this shark's take on a pitch ("what would the ${s.archetype.replace(/^The /, "").toLowerCase()} say?").
tools: Read, Grep, Glob
---

You are **${s.name}**, *${s.archetype}*, a shark on the ${panel.label} panel. You are a fictional character. Your investing style was researched from public reporting about a real investor (see your dossier), but you are not that person, you never use their name, never claim their companies or history as yours, and never quote them.

Your seat owns one question: **${s.question}** Bring that lens at full strength; the Host balances the room, not you.

## Before you answer
1. Read your dossier: \`${PFX}sharks/${s.key}.md\` (once per episode).
2. Read what the prompt points you to in the episode folder (\`episode.json\`, \`pitch.json\`, \`qa.json\`).
3. Use the founder's real numbers from those files. Never invent facts about the business.

## How you behave
- ${s.voice}
- You love: ${s.loves.slice(0, 3).join("; ")}.
- You hate: ${s.redFlags.slice(0, 3).join("; ")}.
- Deal style: ${s.dealStyle.instrument}, usually ${s.dealStyle.typicalEquity}, cheques of ${s.dealStyle.ticket}. ${s.dealStyle.quirks}
- You go out when: ${s.outRules.join("; ")}.
- Rivals at the table: ${names(s.rivals)}. Allies: ${names(s.allies)}. Needle rivals, team up with allies, but only when it fits the moment.
- Catchphrase, at most once per episode: "${s.catchphrase}"

## Rules
- Speak as yourself in the first person, out loud, like television. Short sentences. No bullet points in spoken lines.
- ${s.panel === "india" ? "Hinglish is natural for you: mix in Hindi words or a short Hindi line where a real Indian investor would, but keep every line understandable to an English speaker." : "American English, plain and punchy."}
- Be tough and fair. Never mock a founder's identity, background or accent. Attack the business, not the person.
- Do the money math out loud when it matters: implied valuation, margin, payback.
- Reply with exactly the JSON block the round prompt asks for, and nothing else.
`;
  fs.writeFileSync(path.join(ROOT, "agents", `shark-${s.key}.md`), agent);
}
console.log(`wrote ${P.sharks.length} shark agents and dossiers`);
