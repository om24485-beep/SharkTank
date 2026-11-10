// Shared avatar renderer. Pure functions that return SVG strings, so the
// live room (browser) and the report builder (Node) draw identical sharks.
// Every shark is an original cartoon, not a likeness of any real person.

const BELLY = "#f4f1ea";
const INK = "#14213d";

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function eyes(blink, mood) {
  const brows = {
    neutral: ["M58 82 Q72 76 86 82", "M114 82 Q128 76 142 82"],
    skeptical: ["M58 84 Q72 80 86 86", "M114 76 Q128 70 142 78"],
    happy: ["M58 80 Q72 72 86 80", "M114 80 Q128 72 142 80"],
    stern: ["M58 78 Q72 84 88 86", "M112 86 Q128 84 142 78"],
  }[mood] || ["M58 82 Q72 76 86 82", "M114 82 Q128 76 142 82"];
  const browSvg = brows.map((d) => `<path d="${d}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join("");
  if (blink) {
    return browSvg + `<path d="M60 100 Q72 106 84 100" stroke="#f4f1ea" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M116 100 Q128 106 140 100" stroke="#f4f1ea" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  }
  const one = (cx) => `<circle cx="${cx}" cy="100" r="13" fill="#fff"/><circle cx="${cx + 2}" cy="102" r="6.5" fill="${INK}"/><circle cx="${cx + 4.5}" cy="99" r="2.2" fill="#fff"/>`;
  return browSvg + one(72) + one(128);
}

function mouth(open, mood) {
  if (open) {
    const teeth = [0, 1, 2, 3, 4, 5].map((i) => { const x = 74 + i * 9; return `<path d="M${x} 134 L${x + 4.5} 142 L${x + 9} 134 Z" fill="#fff"/>`; }).join("");
    const low = [0, 1, 2, 3, 4].map((i) => { const x = 79 + i * 9; return `<path d="M${x} 160 L${x + 4.5} 153 L${x + 9} 160 Z" fill="#fff"/>`; }).join("");
    return `<path d="M70 134 Q100 128 130 134 Q128 166 100 166 Q72 166 70 134 Z" fill="#7a1d2b"/><ellipse cx="100" cy="156" rx="14" ry="5" fill="#e76f51"/>${teeth}${low}`;
  }
  const curve = mood === "stern" ? "M72 144 Q100 140 128 144" : mood === "skeptical" ? "M72 146 Q100 140 128 138" : "M70 138 Q100 158 130 138";
  const teeth = mood === "stern" || mood === "skeptical" ? "" : [0, 1, 2, 3].map((i) => { const x = 82 + i * 9; return `<path d="M${x} ${142 + (i === 0 || i === 3 ? 0 : 3)} l4.5 6 l4.5 -6 Z" fill="#fff"/>`; }).join("");
  return `<path d="${curve}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>${teeth}`;
}

function clothes(s) {
  const a = s.accent || "#222";
  const base = `<path d="M24 200 C 30 178, 60 168, 100 168 C 140 168, 170 178, 176 200 Z" fill="${a}"/>`;
  switch (s.accessory) {
    case "suit": return base + `<path d="M76 170 L100 200 L124 170 L112 168 L100 186 L88 168 Z" fill="#fff"/><path d="M96 178 L104 178 L106 200 L94 200 Z" fill="#e9c46a"/>`;
    case "tie": return base + `<path d="M82 168 L100 182 L118 168 Z" fill="#fff"/><path d="M96 176 L104 176 L108 200 L92 200 Z" fill="#ef476f"/>`;
    case "bowtie": return base + `<path d="M84 170 L100 178 L84 186 Z M116 170 L100 178 L116 186 Z" fill="#d00000"/><circle cx="100" cy="178" r="4" fill="#9d0208"/>`;
    case "hoodie": return `<path d="M20 200 C 26 170, 60 160, 100 162 C 140 160, 174 170, 180 200 Z" fill="${a}"/><path d="M60 166 Q100 188 140 166" stroke="${shade(a, 40)}" stroke-width="6" fill="none"/><line x1="90" y1="178" x2="88" y2="198" stroke="#fff" stroke-width="3"/><line x1="110" y1="178" x2="112" y2="198" stroke="#fff" stroke-width="3"/>`;
    case "tshirt": return base + `<path d="M80 168 Q100 180 120 168" stroke="${shade(a, 50)}" stroke-width="5" fill="none"/>`;
    case "chain": return base + `<path d="M76 170 Q100 196 124 170" stroke="#ffd60a" stroke-width="4" fill="none" stroke-dasharray="4 2"/><circle cx="100" cy="190" r="6" fill="#ffd60a"/>`;
    case "pearls": return base + [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => { const t = i / 8; const x = 74 + t * 52; const y = 172 + Math.sin(t * Math.PI) * 14; return `<circle cx="${x}" cy="${y}" r="3.6" fill="#fff" stroke="#ddd"/>`; }).join("");
    case "leaf": return base + `<path d="M76 170 L100 200 L124 170 L112 168 L100 186 L88 168 Z" fill="#fff"/><path d="M132 182 q10 -10 18 -2 q-8 10 -18 2 Z" fill="#90be6d"/>`;
    default: return base;
  }
}

function accessory(s) {
  const c = s.color;
  switch (s.accessory) {
    case "headphones": return `<path d="M34 112 C 30 40, 170 40, 166 112" stroke="${INK}" stroke-width="9" fill="none"/><rect x="22" y="98" width="22" height="36" rx="9" fill="${s.accent === "#1b1b1b" ? "#ff006e" : INK}"/><rect x="156" y="98" width="22" height="36" rx="9" fill="${s.accent === "#1b1b1b" ? "#ff006e" : INK}"/>`;
    case "glasses": return `<rect x="54" y="86" width="36" height="28" rx="10" fill="none" stroke="${s.accent}" stroke-width="4.5"/><rect x="110" y="86" width="36" height="28" rx="10" fill="none" stroke="${s.accent}" stroke-width="4.5"/><path d="M90 98 Q100 92 110 98" stroke="${s.accent}" stroke-width="4" fill="none"/>`;
    case "cap": return `<path d="M48 74 C 52 40, 148 40, 152 74 Z" fill="${s.accent === "#ffffff" ? "#e76f51" : s.accent}"/><path d="M120 72 Q170 70 176 80 L 120 80 Z" fill="${shade(s.accent === "#ffffff" ? "#e76f51" : s.accent, -30)}"/><circle cx="100" cy="46" r="4" fill="#fff"/>`;
    case "crown": return `<path d="M76 58 L80 36 L92 50 L100 30 L108 50 L120 36 L124 58 Z" fill="#ffd60a" stroke="#e85d04" stroke-width="2"/><circle cx="100" cy="44" r="3.5" fill="#d00000"/>`;
    case "earrings": return `<circle cx="34" cy="132" r="7" fill="none" stroke="#ffd166" stroke-width="3.5"/><circle cx="166" cy="132" r="7" fill="none" stroke="#ffd166" stroke-width="3.5"/>`;
    case "watch": return `<rect x="20" y="168" width="18" height="14" rx="4" fill="${INK}"/><rect x="23" y="171" width="12" height="8" rx="2" fill="#80ffdb"/>`;
    default: return "";
  }
  void c;
}

export function sharkSVG(s, opts = {}) {
  const { mouth: m = "closed", blink = false, mood = "neutral", size = 200, id = s.key } = opts;
  const body = s.color, dark = shade(body, -35), light = shade(body, 30);
  const gid = `g-${id}-${Math.random().toString(36).slice(2, 7)}`;
  const finUnderCap = s.accessory === "cap";
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${s.name}">
  <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>
  ${finUnderCap ? "" : `<path d="M100 10 Q106 12 128 66 L72 66 Q92 20 100 10 Z" fill="${dark}"/>`}
  <path d="M30 178 C 22 110, 52 56, 100 54 C 148 56, 178 110, 170 178 Z" fill="url(#${gid})"/>
  ${finUnderCap ? `<path d="M100 18 Q106 20 120 56 L80 56 Q94 26 100 18 Z" fill="${dark}"/>` : ""}
  <path d="M60 178 C 62 140, 80 122, 100 122 C 120 122, 138 140, 140 178 Z" fill="${BELLY}"/>
  <path d="M40 118 q6 8 0 16 M46 116 q6 9 0 18 M52 116 q5 8 0 16" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M160 118 q-6 8 0 16 M154 116 q-6 9 0 18 M148 116 q-5 8 0 16" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M26 176 q-16 4 -18 20 q16 -2 30 -10 Z" fill="${dark}"/><path d="M174 176 q16 4 18 20 q-16 -2 -30 -10 Z" fill="${dark}"/>
  ${clothes(s)}
  ${eyes(blink, mood)}
  ${mouth(m === "open", mood)}
  ${accessory(s)}
</svg>`;
}

export function founderSVG(opts = {}) {
  const { mouth: m = "closed", human = false, size = 160, blink = false } = opts;
  const body = human ? "#4361ee" : "#ff7f11";
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Founder">
  <path d="M150 100 L196 64 L188 100 L196 136 Z" fill="${shade(body, -30)}"/>
  <ellipse cx="96" cy="100" rx="68" ry="54" fill="${body}"/>
  <path d="M70 48 Q62 100 70 152" stroke="#fff" stroke-width="16" fill="none"/>
  <path d="M120 52 Q128 100 120 148" stroke="#fff" stroke-width="14" fill="none"/>
  <path d="M70 48 Q62 100 70 152" stroke="${INK}" stroke-width="2" fill="none" transform="translate(-8 0)"/>
  <path d="M84 46 Q100 20 118 50 Z" fill="${shade(body, -25)}"/>
  ${blink ? `<path d="M44 92 q8 6 16 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>` : `<circle cx="52" cy="90" r="12" fill="#fff"/><circle cx="50" cy="92" r="6" fill="${INK}"/><circle cx="48" cy="89" r="2" fill="#fff"/>`}
  ${m === "open" ? `<ellipse cx="44" cy="122" rx="10" ry="9" fill="#7a1d2b"/>` : `<path d="M36 118 Q46 128 56 118" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`}
  <rect x="8" y="128" width="8" height="40" rx="3" fill="#333"/><circle cx="12" cy="124" r="9" fill="#555"/>
  ${human ? `<rect x="66" y="160" width="60" height="26" rx="13" fill="#ffd60a"/><text x="96" y="178" font-family="Arial, sans-serif" font-weight="800" font-size="15" text-anchor="middle" fill="${INK}">YOU</text>` : `<rect x="46" y="160" width="100" height="26" rx="13" fill="#ffffff" opacity=".92"/><text x="96" y="178" font-family="Arial, sans-serif" font-weight="800" font-size="13" text-anchor="middle" fill="${INK}">FOUNDER AI</text>`}
</svg>`;
}
