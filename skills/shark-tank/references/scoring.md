# Scoring, decisions and the Pitch Doctor

## Dimensions (1-10)

| Key | 3 means | 6 means | 9 means |
|---|---|---|---|
| team | Part-time, no domain edge | Committed, some relevant experience | Lived the problem, rare insight, complete team |
| market | Niche with a low ceiling | Clear market, crowded | Large, growing, timing tailwind |
| product | Me-too, easy to copy | Clearly better on one axis | Step-change, demo makes jaws drop |
| traction | Idea only | Early revenue or strong pilots | Fast, repeatable growth with retention |
| economics | Negative unit economics | Positive margin, unproven payback | High margin, fast payback, efficient growth |
| moat | None | Brand or speed lead | Proprietary data, IP, network effects or licences |

A shark's **weighted score** uses its `weights` in `panels.json` (the room and the report compute it if `total` is omitted).

## In or out
- Any `outRules` line in the shark's dossier that fires → `out`, whatever the score.
- Weighted score below 5.5 → `out`. Between 5.5 and 6.5 → `in` only if the shark names the one thing that would make it work and puts it in `conditions`.
- Sharks go out for their own reasons, in their own voice. Two sharks should not go out for the same reason; if they would, the second names a different reason.
- At least one shark should push back hard even on a great pitch. A panel that is all `in` at full valuation is a red flag for the Host: re-run the most skeptical shark's verdict with "Find the strongest reason not to invest at this valuation."

## Valuation sanity (what sharks offer)
Implied valuation = amount ÷ equity. Sharks anchor on:

| Stage | India panel | USA panel |
|---|---|---|
| Idea, no revenue | ₹2-8 crore | $0.5-2M |
| Early revenue (consumer) | 2-5x annual revenue | 1-3x annual sales |
| Early revenue (SaaS / B2B) | 8-15x ARR | 5-10x ARR |
| Profitable, growing | 3-8x revenue or 15-25x profit | 2-5x sales or 8-15x profit |

The asked valuation rarely survives. A typical shark offer keeps the amount and multiplies the equity by 1.5 to 4. Royalty sharks add a per-unit or percent-of-revenue royalty until 1x to 2x of their money is back. Operator sharks split the cheque into tranches against milestones.

## Pitch Doctor (`doctor.json`)
Written by the Host after the deal. Every item must trace to something a shark said or scored.
- `verdict_line`: one sentence: fundable or not, at what valuation, and the one thing that decided it.
- `fixes` (5): ranked by how much valuation or how many sharks they cost. Each has `title`, `why` (what happened in the Tank), `how` (a concrete change to the pitch or the business).
- `objections` (4): the hardest questions. `weak` = what the founder actually said (shortened), `strong` = a better answer using only episode facts and `[bracketed placeholders]`.
- `pitch_v2`: the 60-second pitch rewritten to pre-empt the top objections.
- `metrics_to_bring` (5-7), `dd_checklist` (5-7), `next_steps` (3, each with `when`).
- `note`: say that `[brackets]` are facts the founder must fill in, when any are used.
