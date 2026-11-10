# Round prompts

Every agent replies with **one fenced `json` block and nothing else**. If a reply does not parse, send it back once with "Reply with only the JSON block." Fill `<...>` from the episode files. Give each agent the episode folder path so it can read `episode.json`, `pitch.json` and `qa.json` itself.

---

## Founder agent

### Pitch
```
Episode folder: <path>. Read episode.json, then the project sources listed in episode.json.source (if any).
Panel: <panel label>. Currency: <INR|USD>. Mode: <auto|manual>.
Write the Shark Tank pitch per skills/shark-tank/references/pitch-framework.md.
Return JSON: { "tagline", "one_liner", "slides": [ { "kicker", "title", "body"?, "bullets"?, "stats"?: [{ "value", "label" }], "say" } ],
"ask": { "amount" (number, in base currency units), "equity" (number), "amount_label", "use_of_funds": [{ "label", "pct" }], "line" }, "elevator_60s" }
Only facts from the brief, project files and (assumed) items. No invented customers, revenue or logos.
```

### Answer
```
Episode folder: <path>. You are in the Tank. Questions this round, in order:
<id> · <Shark short name> (<archetype>): <question>
...
Answer each in 1 to 3 spoken sentences, in the founder's voice. Lead with the number when one is asked.
Stay consistent with every earlier answer in qa.json. If you do not know, say so and say how you will find out.
Return JSON: { "answers": { "<id>": "<answer>", ... } }
```

### Negotiate
```
Episode folder: <path>. Offers on the table (from offers.json), with implied valuation:
<list>
Your walk-away: valuation floor <x>, equity ceiling <y>%. Your priorities: <from episode.json.walkaway.note>.
Make one move per skills/shark-tank/references/negotiation.md.
Return JSON: { "move": "accept"|"counter"|"walk", "target": ["<shark keys>"], "offer"?: { "sharks", "amount", "equity", "royalty"?, "conditions"? }, "text": "<what you say out loud, 1-3 sentences>" }
```

---

## Sharks

Each shark agent already carries its personality. The prompt only gives it the moment.

### Round 1
```
Episode folder: <path>. Read episode.json and pitch.json. The founder just finished the pitch.
Other sharks seated: <short names + archetypes>.
Return JSON: { "questions": ["<best question>", "<second question>"], "banter": { "to": "<shark key>", "line": "<one line>" } | null, "gut": "<one private sentence: leaning in or out, and why>" }
Questions: one sentence or two, spoken, in your voice, owned by your pillar. Use the founder's actual numbers.
```

### React
```
You asked: <question>. The founder answered: <answer>.
Return JSON: { "react": "<one spoken line, max 20 words>" }
```

### Round 2
```
Episode folder: <path>. Read qa.json: the full grilling so far.
Return JSON: { "followup": "<one sharper question aimed at the weakest answer you heard>" | null, "banter": { "to", "line" } | null }
Return null if nothing worries you any more. Do not repeat a question already asked by anyone.
```

### Verdict
```
Episode folder: <path>. Read pitch.json and qa.json.
Score 1-10 on: team, market, product, traction, economics, moat (see skills/shark-tank/references/scoring.md for anchors).
Return JSON: { "status": "in"|"out", "scores": { "team", "market", "product", "traction", "economics", "moat" },
"line": "<2-3 spoken sentences; if out, end with your own way of saying you're out>", "feedback": "<one plain sentence>",
"strengths": ["", ""], "concerns": ["", ""],
"offer": { "amount", "equity", "royalty"?, "debt"?, "conditions": [""], "line": "<how you pitch your offer, spoken>" } | null }
Your offer must follow your deal style in your dossier and the valuation rules in scoring.md.
```

### Merge (allies only)
```
<Other shark> has offered <terms>. Your offer is <terms>. Would you join forces in one joint offer?
Return JSON: { "join": true|false, "joint_offer"?: { "sharks", "amount", "equity", "conditions" }, "line": "<spoken>" }
```

### Respond to a counter
```
The founder countered: "<text>" with <terms>. Your current offer: <terms>. Your walk-away is your own judgement.
Return JSON: { "move": "accept"|"counter"|"withdraw", "offer"?: { ... }, "text": "<spoken, 1-2 sentences>" }
```

### Banter (optional, rivals only)
```
<Shark> just <what happened>. One line, in your voice, aimed at them. Return JSON: { "line": "" }
```
