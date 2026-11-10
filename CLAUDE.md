# SharkTank

This project runs Shark Tank episodes: a founder agent pitches an idea or a project to a panel of AI sharks, who grill it, score it, make offers and negotiate. Claude Code is the Host.

- When the user wants an idea, startup, product or project pitched, judged or "shark tanked", run `/shark-tank` (protocol in `skills/shark-tank/SKILL.md`). Ask once for the thing to pitch if they gave nothing.
- `--mode manual` means the human answers every question and makes every deal decision. Never answer for them.
- If the user asks to open the room, run `npm start` in the background and point them to http://localhost:4740 (Node 20+, nothing to install).
- Episodes live in `episodes/<date>-<slug>/`. Write files exactly as `skills/shark-tank/references/live-files.md` describes so the room can play them.
- Sharks are fictional archetypes informed by research in `skills/shark-tank/research/RESEARCH.md`. Never use a real investor's name or likeness in an episode, and never present a line as something a real person said.
- To add or change a shark, edit `skills/shark-tank/panels.json` and run `npm run agents`.
- After changing the app, run `npm run smoke`.
- Write the Host's own text in plain English: short sentences, no hype.
