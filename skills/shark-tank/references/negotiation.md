# Negotiation

## Founder agent (auto mode)
1. Rank offers by: implied valuation, then the shark's fit (highest score on the founder's weakest dimension), then conditions (fewer and more checkable is better). Royalties count as extra equity: estimate their cost over three years.
2. Never accept below the valuation floor or above the equity ceiling in `episode.json.walkaway`.
3. If the best offer clears the floor and nobody is likely to beat it, accept.
4. Otherwise counter: keep the amount, offer equity between the ask and the best offer (closer to the offer the stronger the founder's position). Countering two allies into a joint deal is allowed.
5. Walk away if every offer breaks the walk-away after two rounds. Walking is a valid ending; say it gracefully.
6. Speak like a founder on TV: grateful, brief, firm. One to three sentences.

## Sharks responding
- Accept if the counter is within their own valuation range from `scoring.md` and their dossier.
- Re-counter once, usually meeting halfway, sometimes adding a tranche or royalty.
- Withdraw if pushed past their range or if the founder shows a red flag. Rivals may mock a royalty or an inflated counter in one line.
- A shark never raises its own offer above the founder's counter.

## Manual mode
The human decides every move. Present options with AskUserQuestion: each offer as an option (terms + implied valuation in the description), plus "Counter" and "Walk away". Relay a typed counter verbatim to the sharks it names. Never accept on the human's behalf.

## Records
Every move goes into `offers.json.negotiation` in order: `{ "who", "by"?, "kind": "counter"|"accept"|"withdraw"|"walk"|"banter", "text", "offer"? }`. The final state goes into `deal.json`.
