# Live files

The room (`npm start`, http://localhost:4740) polls `episodes/<id>/` and plays each file as it appears. Plain JSON, no comments, no trailing commas. Money is a number in base units (rupees or dollars), never a string. Shark ids are keys from `panels.json`. Write in this order.

| Step | File | Room shows |
|---|---|---|
| 1 | `episode.json` | Title, panel, seats the sharks, the ask meter |
| 2 | `pitch.json` | Slides on the screen, founder narrates each `say` line, then the ask |
| 3 | `qa.json` (rewrite as each round lands) | Questions, answers, reactions, banter in speech bubbles |
| 3m | `pending.json` (manual only) | A dialog asking the human to answer; answers post to `answers.json` |
| 4 | `verdicts.json` | Score rings, IN stamps or I'M OUT stamps, verdict lines |
| 5 | `offers.json` (rewrite as negotiation moves land) | Offer cards, counters, best-offer meter |
| 6 | `deal.json` | DEAL or NO DEAL overlay with confetti |
| 6 | `doctor.json` | (report only) |
| 6 | `outcome.html` | "Outcome report" button |

## episode.json
```json
{
  "id": "2026-11-10-creditpilot-ai-underwriting",
  "title": "CreditPilot: AI underwriting co-pilot for NBFCs",
  "panel": "india", "currency": "INR", "mode": "auto",
  "created": "2026-11-10T22:40:00+05:30",
  "source": { "type": "idea|project", "ref": "free text, path or URL" },
  "founder": { "name": "Neha & Arjun", "company": "CreditPilot", "role": "Co-founders" },
  "sharks": ["kabir", "meera", "rohan", "vikram", "ananya"],
  "ask": { "amount": 15000000, "equity": 2, "amount_label": "₹1.5 crore" },
  "walkaway": { "min_valuation": 30000000, "max_equity": 6, "note": "priorities in one line" },
  "brief": "Under 200 words.",
  "assumptions": ["Anything not given by the user (assumed)"]
}
```

## pitch.json
```json
{
  "tagline": "One line.", "one_liner": "What it is in one sentence.",
  "slides": [ { "kicker": "The hook", "title": "", "body": "", "bullets": [""], "stats": [{ "value": "₹2.4 Cr", "label": "ARR" }], "say": "Spoken line." } ],
  "ask": { "amount": 15000000, "equity": 2, "amount_label": "₹1.5 crore", "use_of_funds": [{ "label": "", "pct": 40 }], "line": "Spoken ask." },
  "elevator_60s": "One paragraph."
}
```

## qa.json
```json
{ "rounds": [ { "title": "Round 1 · The Grilling", "sub": "", "exchanges": [
  { "id": "r1x1", "shark": "vikram", "q": "", "a": "", "by": "agent|human", "react": "" },
  { "id": "r1x4", "shark": "kabir", "to": "vikram", "banter": "" }
] } ] }
```
In manual mode leave `a` out until the human answers; the room reads `answers.json` meanwhile.

## pending.json (manual)
```json
{ "round": 1, "questions": [ { "id": "r1x1", "shark": "vikram", "q": "" } ] }
```
`answers.json` (written by the room, or by the Host from chat): `{ "r1x1": "answer text" }`. Delete `pending.json` once answers are copied into `qa.json`.

## verdicts.json
```json
{ "verdicts": [ { "shark": "kabir", "status": "out|in", "scores": { "team": 8, "market": 8, "product": 7, "traction": 6, "economics": 7, "moat": 6 },
  "line": "", "feedback": "", "strengths": ["", ""], "concerns": ["", ""] } ] }
```
`total` is optional; the room and report compute the weighted score.

## offers.json
```json
{ "offers": [ { "sharks": ["rohan"], "amount": 15000000, "equity": 6, "royalty": "optional text", "debt": "optional text", "conditions": [""], "line": "" } ],
  "negotiation": [ { "who": "founder", "by": "agent|human", "kind": "counter", "text": "", "offer": { "sharks": ["rohan"], "amount": 15000000, "equity": 4.5 } } ] }
```

## deal.json
```json
{ "status": "DEAL|NO DEAL", "sharks": ["rohan", "meera"], "amount": 15000000, "equity": 5, "royalty": "", "conditions": [""],
  "headline": "", "summary": "Two plain sentences.", "founderLine": "" }
```

## doctor.json
See `scoring.md` → Pitch Doctor.
