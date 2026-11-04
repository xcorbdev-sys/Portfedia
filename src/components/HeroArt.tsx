/**
 * Home page illustration: glass office towers inside a network globe (pure SVG, no image request).
 * If public/brand/hero.webp exists, the home page shows that image instead.
 */

// Deterministic "random" so server and client render the same windows
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const NODES: [number, number][] = [
  [240, 40], [114, 80], [364, 79], [175, 125], [72, 182], [405, 181], [240, 193], [112, 275], [368, 273],
];
const LINKS: [number, number][] = [
  [0, 3], [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [3, 4], [3, 6], [3, 7], [6, 2], [4, 7], [5, 8], [2, 3], [4, 5],
];

const TOWERS = [
  { x: 127, w: 30, side: 8, top: 222 },
  { x: 165, w: 46, side: 12, top: 148 },
  { x: 218, w: 36, side: 10, top: 199 },
  { x: 264, w: 52, side: 14, top: 84 },
  { x: 332, w: 28, side: 9, top: 209 },
];
const BASE = 336;

function Tower({ x, w, side, top, i }: { x: number; w: number; side: number; top: number; i: number }) {
  const h = BASE - top;
  const rows = Math.floor(h / 6.5);
  const cols = Math.max(3, Math.round(w / 6));
  const sideCols = Math.max(2, Math.round(side / 5));
  const lit: { x: number; y: number; w: number }[] = [];
  for (let r = 0; r < rows; r++) {
    if (rand(i * 100 + r) < 0.45) {
      const start = Math.floor(rand(i * 200 + r) * cols);
      const len = 1 + Math.floor(rand(i * 300 + r) * 3);
      lit.push({ x: x + 1 + (start * (w - 2)) / cols, y: top + 4 + r * 6.5, w: Math.min(len, cols - start) * ((w - 2) / cols) });
    }
  }
  return (
    <g>
      {/* front face */}
      <rect x={x} y={top} width={w} height={h} fill="url(#hg-front)" />
      <rect x={x} y={top} width={w} height={h} fill="url(#hg-sky)" opacity="0.55" />
      {/* side face */}
      <path d={`M${x + w} ${top} l${side} ${side * 0.45} V${BASE} H${x + w} Z`} fill="url(#hg-side)" />
      {/* roof edge */}
      <path d={`M${x} ${top} H${x + w} l${side} ${side * 0.45}`} fill="none" stroke="#e9eef7" strokeWidth="1.4" />
      {lit.map((l, k) => (
        <rect key={k} x={l.x} y={l.y} width={l.w} height="3" fill="#ffe3a3" opacity="0.75" />
      ))}
      <g stroke="#dfe7f5" strokeOpacity="0.55" strokeWidth="0.6">
        {Array.from({ length: rows }, (_, r) => (
          <line key={`r${r}`} x1={x} x2={x + w} y1={top + 3 + r * 6.5} y2={top + 3 + r * 6.5} />
        ))}
        {Array.from({ length: cols - 1 }, (_, c) => (
          <line key={`c${c}`} x1={x + ((c + 1) * w) / cols} x2={x + ((c + 1) * w) / cols} y1={top} y2={BASE} />
        ))}
        {Array.from({ length: sideCols - 1 }, (_, c) => {
          const sx = x + w + ((c + 1) * side) / sideCols;
          return <line key={`s${c}`} x1={sx} x2={sx} y1={top + ((c + 1) * side * 0.45) / sideCols} y2={BASE} strokeOpacity="0.3" />;
        })}
      </g>
      <line x1={x} x2={x} y1={top} y2={BASE} stroke="#eef2f9" strokeWidth="1.2" />
      <line x1={x + w} x2={x + w} y1={top} y2={BASE} stroke="#eef2f9" strokeWidth="1" />
    </g>
  );
}

function Tree({ x, s = 1 }: { x: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${BASE}) scale(${s})`}>
      <rect x="-0.8" y="-8" width="1.6" height="8" fill="#5a4630" />
      <circle cx="-4" cy="-11" r="5" fill="#5f8f2f" />
      <circle cx="4" cy="-11" r="5" fill="#6fa037" />
      <circle cx="0" cy="-17" r="5.5" fill="#7cb342" />
      <circle cx="0" cy="-10" r="4.5" fill="#4f7d26" opacity="0.6" />
    </g>
  );
}

export function HeroArt() {
  return (
    <svg className="globe" viewBox="0 0 480 390" role="img" aria-label="Office towers inside a connected globe">
      <defs>
        <linearGradient id="hg-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5d7fb8" />
          <stop offset="0.5" stopColor="#3e5f97" />
          <stop offset="1" stopColor="#2d4777" />
        </linearGradient>
        <linearGradient id="hg-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dbe7fb" stopOpacity="0.9" />
          <stop offset="0.35" stopColor="#9db8e6" stopOpacity="0.2" />
          <stop offset="0.6" stopColor="#c9d9f5" stopOpacity="0.6" />
          <stop offset="1" stopColor="#24406f" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hg-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a5687" />
          <stop offset="1" stopColor="#1f3358" />
        </linearGradient>
        <linearGradient id="hg-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d93b8" />
          <stop offset="0.5" stopColor="#b9c8de" />
          <stop offset="1" stopColor="#e6ecf5" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hg-lobby" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fa6c9" />
          <stop offset="1" stopColor="#f3d79a" />
        </linearGradient>
      </defs>

      {/* network globe */}
      <g fill="none" stroke="#2f6df5" strokeWidth="1.1" strokeOpacity="0.85">
        <ellipse cx="240" cy="190" rx="168" ry="152" />
        <ellipse cx="240" cy="190" rx="168" ry="60" />
        <path d="M80 140 Q240 95 400 140" />
        <path d="M78 235 Q240 290 402 235" />
        <ellipse cx="240" cy="190" rx="70" ry="152" />
        <ellipse cx="240" cy="190" rx="125" ry="152" />
        {LINKS.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} />
        ))}
      </g>
      <g fill="#1463f3">
        {NODES.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="6" />
        ))}
      </g>

      {/* reflecting pool */}
      <ellipse cx="240" cy="346" rx="152" ry="18" fill="url(#hg-water)" />
      <ellipse cx="240" cy="337" rx="148" ry="4" fill="#d7e0ee" />

      {/* towers, back to front */}
      {[1, 3, 0, 2, 4].map((i) => (
        <Tower key={i} i={i} {...TOWERS[i]} />
      ))}

      {/* lobbies */}
      <g>
        <rect x="149" y="312" width="70" height="24" fill="url(#hg-lobby)" stroke="#eef2f9" strokeWidth="1" />
        <rect x="252" y="306" width="54" height="30" fill="url(#hg-lobby)" stroke="#eef2f9" strokeWidth="1" />
        <g stroke="#eef2f9" strokeOpacity="0.7" strokeWidth="0.7">
          {Array.from({ length: 9 }, (_, k) => <line key={`a${k}`} x1={157 + k * 7.5} x2={157 + k * 7.5} y1="312" y2="336" />)}
          {Array.from({ length: 7 }, (_, k) => <line key={`b${k}`} x1={259 + k * 7.5} x2={259 + k * 7.5} y1="306" y2="336" />)}
        </g>
      </g>

      {/* trees */}
      <Tree x={108} s={1.1} />
      <Tree x={120} s={0.85} />
      <Tree x={158} s={0.75} />
      <Tree x={210} s={0.95} />
      <Tree x={258} s={0.7} />
      <Tree x={325} s={1.05} />
      <Tree x={340} s={0.8} />
      <Tree x={378} s={1} />
      <rect x="100" y="333" width="285" height="4" rx="2" fill="#5f8f2f" opacity="0.7" />
    </svg>
  );
}
