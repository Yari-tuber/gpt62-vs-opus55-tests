// scene.js — 寂寞烟火 MV（1:15–1:56 这一段）。全部画面用 canvas 代码画。
// 画风：夜色剪影 + 一抹红（女孩的红围巾是全片唯一的固定颜色）+ 烟火的发光粒子（lighter 叠加）。
// 规矩：画面只由时间决定；随机一律用 hash / rng。
(() => {
'use strict';
const W = 1920, H = 1080, TAU = Math.PI * 2;
let M = null;
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (i, j = 0) => MV.M.hash(i, j);
const noise = (x, y = 0) => MV.M.noise(x, y);
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const eOut = (t) => 1 - (1 - clamp(t)) ** 3;
const eIO = (t) => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
const eExpo = (t) => t >= 1 ? 1 : 1 - 2 ** (-10 * clamp(t));
const eBack = (t, s = 1.7) => { t = clamp(t); return 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2; };

const INK = '#07060d';
const SCARF = '#e0283b';
const T = {};          // 关键时刻（秒），setup 里由 song.json 算出来
const FWL = {};        // 每个场景的烟火表

// ============================================================ 发光精灵 / 烟火
const FC = { gold: [255, 204, 120], rose: [255, 112, 162], cyan: [110, 214, 255], violet: [178, 138, 255], amber: [255, 146, 72],
  white: [255, 246, 232], mint: [150, 255, 205], red: [255, 86, 86], blue: [120, 150, 255], warm: [255, 178, 110], cold: [150, 185, 255] };
function spr(name) {
  const c = FC[name];
  return M.cached('g_' + name, 96, 96, (g) => {
    const gr = g.createRadialGradient(48, 48, 0, 48, 48, 48);
    gr.addColorStop(0, rgba(mix(c, [255, 255, 255], 0.55), 1)); gr.addColorStop(0.12, rgba(c, 0.85));
    gr.addColorStop(0.35, rgba(c, 0.22)); gr.addColorStop(0.7, rgba(c, 0.05)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 96, 96);
  });
}
function soft(name) {   // 大范围柔光（照亮天空用）
  const c = FC[name];
  return M.cached('s_' + name, 128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, rgba(c, 0.9)); gr.addColorStop(0.3, rgba(c, 0.38)); gr.addColorStop(0.65, rgba(c, 0.09)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
}
function glow(ctx, name, x, y, r, a) { if (a < 0.004 || r < 0.3) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(spr(name), x - r, y - r, 2 * r, 2 * r); }
function halo(ctx, name, x, y, r, a, sy = 1) { if (a < 0.004 || r < 1) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(soft(name), x - r, y - r * sy, 2 * r, 2 * r * sy); }

function mkFW(o) {
  const tb = (typeof o.at === 'number' ? o.at : M.ref(o.at)) + (o.dt || 0);
  const r = o.r ?? 150;
  return { tb, t0: tb - (o.rise ?? 0.8), x: o.x, y: o.y, x0: o.x0 ?? (o.x + (o.lean ?? -20)), y0: o.y0 ?? 640, r, col: o.col || 'gold', col2: o.col2 || null,
    kind: o.kind || 'peony', n: o.n ?? Math.round(46 + r * 0.32), life: o.life ?? (o.kind === 'willow' ? 3.0 : 2.1), seed: o.seed ?? (Math.floor(tb * 997) + Math.floor(o.x)), s: o.s ?? Math.max(0.35, r / 170) };
}
// 一朵烟火：升空 → 炸开（球形 / 柳 / 环）→ 下坠、闪烁、熄灭。返回这一刻它的亮度（用来照亮天空和人）
function drawFW(ctx, f, t, k = 1) {
  if (t < f.t0 || t > f.tb + f.life) return 0;
  const s = f.s;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (t < f.tb) {
    const q = (t - f.t0) / (f.tb - f.t0);
    for (let j = 0; j < 12; j++) {
      const qj = q - j * 0.02; if (qj < 0) break;
      const e = 1 - (1 - qj) ** 2.2;
      const px = lerp(f.x0, f.x, e) + Math.sin(qj * 17 + f.seed) * 2.5 * s, py = lerp(f.y0, f.y, e);
      glow(ctx, j ? f.col : 'white', px, py, (j ? 6 : 11) * Math.max(0.6, s), (1 - j / 12) * (j ? 0.45 : 0.95) * k);
    }
    ctx.restore(); return 0.05 * k;
  }
  const dt = t - f.tb, L = f.life, fade = 1 - dt / L;
  halo(ctx, f.col, f.x, f.y, f.r * 1.5, (Math.exp(-dt / 0.3) * 0.5 + 0.06 * fade) * k);
  glow(ctx, 'white', f.x, f.y, f.r * (0.35 + 0.6 * dt), Math.exp(-dt / 0.08) * 0.95 * k);
  const n = f.n, willow = f.kind === 'willow', ring = f.kind === 'ring';
  const g = (willow ? 230 : 90) * s, drag = willow ? 2.0 : 3.3, TT = willow ? 9 : 5, gap = willow ? 0.065 : 0.032;
  const rot = (f.seed % 13) * 0.24;
  for (let i = 0; i < n; i++) {
    const h1 = hash(i, f.seed), h2 = hash(i + 97, f.seed);
    let dx, dy;
    if (ring) { const a = i / n * TAU; const x0 = Math.cos(a), y0 = Math.sin(a) * 0.45; dx = x0 * Math.cos(rot) - y0 * Math.sin(rot); dy = x0 * Math.sin(rot) + y0 * Math.cos(rot); }
    else { const z = 1 - 2 * (i + 0.5) / n, rr = Math.sqrt(Math.max(0, 1 - z * z)), a = i * 2.39996 + h1 * 0.4; dx = rr * Math.cos(a); dy = rr * Math.sin(a); }
    const sp = f.r * (0.88 + 0.24 * h2);
    const col = (f.col2 && i % 3 === 0) ? f.col2 : f.col;
    let tw = 1; if (dt > L * 0.5) tw = hash(i + 7, Math.floor(t * 22) + f.seed) > 0.38 ? 1 : 0.12;
    const rad0 = 5.4 * Math.max(0.55, s) * (1 - 0.45 * dt / L);
    for (let j = 0; j < TT; j++) {
      const tj = dt - j * gap; if (tj < 0) break;
      const d = sp * (1 - Math.exp(-tj * drag));
      const px = f.x + dx * d, py = f.y + dy * d + 0.5 * g * tj * tj;
      const a = fade ** 1.35 * (1 - j / TT) * tw * (j ? 0.5 : 1) * k;
      glow(ctx, (dt < 0.1 && j === 0) ? 'white' : col, px, py, rad0 * (j ? 1.5 : 2.3), a);
    }
  }
  ctx.restore();
  return (Math.exp(-dt / 0.28) * 0.85 + fade * 0.22) * Math.min(1.3, s) * k;
}
function drawFWList(ctx, list, t, k = 1) { let L = 0; for (const f of list) L += drawFW(ctx, f, t, k); return L; }
function skyLight(ctx, list, t, k = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const f of list) {
    if (t < f.tb || t > f.tb + f.life) continue;
    const dt = t - f.tb;
    halo(ctx, f.col, f.x, f.y, f.r * 4.2, (Math.exp(-dt / 0.25) * 0.42 + (1 - dt / f.life) * 0.1) * k);
  }
  ctx.restore();
}
function reflectFW(ctx, list, t, wy, k = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const f of list) {
    if (t < f.tb || t > f.tb + f.life) continue;
    const dt = t - f.tb, a = (Math.exp(-dt / 0.3) * 0.55 + (1 - dt / f.life) * 0.22) * k;
    const my = wy + Math.min(220, (wy - f.y) * 0.3) + 30;
    halo(ctx, f.col, f.x, my, f.r * 0.7, a, 2.4);
  }
  ctx.restore();
}
function lightOf(list, t) {   // 现在烟火有多亮、偏什么颜色
  let a = 0, c = [0, 0, 0];
  for (const f of list) {
    if (t < f.tb || t > f.tb + f.life) continue;
    const dt = t - f.tb, v = (Math.exp(-dt / 0.3) * 0.9 + (1 - dt / f.life) * 0.2) * Math.min(1.3, f.s);
    a += v; c = [c[0] + FC[f.col][0] * v, c[1] + FC[f.col][1] * v, c[2] + FC[f.col][2] * v];
  }
  return { a: Math.min(1.4, a), c: a > 0 ? [c[0] / a, c[1] / a, c[2] / a] : FC.warm };
}

// ============================================================ 天空、星、城市、山、树（静态的都缓存）
function skyGrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  const top = y0 <= 0 ? -80 : y0;   // 只从 y0 往下铺，不盖住上面已经画好的天空
  ctx.fillStyle = g; ctx.fillRect(-80, top, W + 160, H + 80 - top);
}
function starsCanvas(key, n, seed, yMax, milky) {
  return M.cached(key, W, H, (g) => {
    const r = M.rng(seed);
    if (milky) {
      for (let i = 0; i < 26; i++) {
        const k = i / 25, x = lerp(-100, W + 100, k), y = lerp(yMax * 0.95, 40, k) + Math.sin(k * 5) * 40;
        const gr = g.createRadialGradient(x, y, 0, x, y, 210);
        gr.addColorStop(0, `rgba(170,160,230,${0.07 + 0.05 * r()})`); gr.addColorStop(1, 'rgba(170,160,230,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 300, 130, -0.45, 0, TAU); g.fill();
      }
      for (let i = 0; i < 2600; i++) {
        const k = r(), x = lerp(-100, W + 100, k) + (r() - .5) * 160, y = lerp(yMax * 0.95, 40, k) + Math.sin(k * 5) * 40 + (r() - .5) * 170 * (0.4 + r());
        g.fillStyle = `rgba(230,225,255,${0.12 + r() * 0.4})`; g.fillRect(x, y, 1.2, 1.2);
      }
    }
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = (r() ** 1.25) * yMax, s = r() ** 3 * 2.0 + 0.5, a = 0.25 + r() * 0.7;
      const tint = r(); g.fillStyle = tint < 0.2 ? `rgba(255,220,190,${a})` : tint < 0.4 ? `rgba(190,210,255,${a})` : `rgba(255,255,255,${a})`;
      g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    }
  });
}
function twinkle(ctx, seed, n, yMax, t, a = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = hash(i, seed) * W, y = hash(i, seed + 1) ** 1.3 * yMax;
    const v = 0.5 + 0.5 * Math.sin(t * (1.5 + hash(i, seed + 2) * 3) + i * 2.1);
    glow(ctx, 'white', x, y, 3 + 4 * v, (0.25 + 0.6 * v) * a);
  }
  ctx.restore();
}
function cityCanvas(key, o) {
  return M.cached(key, W, H, (g) => {
    const r = M.rng(o.seed);
    let x = -30;
    while (x < W + 30) {
      const w = o.wMin + r() * (o.wMax - o.wMin), hh = o.hMin + (o.hMax - o.hMin) * (r() ** 1.7);
      g.fillStyle = o.col; g.fillRect(x, o.base - hh, w, hh + 4);
      if (r() < 0.25) g.fillRect(x + w * 0.35, o.base - hh - 16, w * 0.3, 16);
      if (r() < 0.1) { g.fillRect(x + w * 0.48, o.base - hh - 70, 3, 70); g.fillStyle = 'rgba(255,80,80,0.9)'; g.fillRect(x + w * 0.48 - 1, o.base - hh - 72, 5, 4); g.fillStyle = o.col; }
      for (let wy = o.base - hh + 7; wy < o.base - 5; wy += o.wy) for (let wx = x + 4; wx < x + w - 5; wx += o.wx) {
        if (r() < o.win) { g.fillStyle = `rgba(255,${(190 + r() * 50) | 0},${(110 + r() * 70) | 0},${0.25 + r() * 0.55})`; g.fillRect(wx, wy, o.wx * 0.45, o.wy * 0.5); }
      }
      x += w + r() * 5;
    }
    if (o.tower) {   // 一座电视塔当地标（全片的城市都是同一座）
      const tx = o.tower, b = o.base;
      g.fillStyle = o.col;
      g.beginPath(); g.moveTo(tx - 22, b); g.lineTo(tx - 5, b - 250); g.lineTo(tx + 5, b - 250); g.lineTo(tx + 22, b); g.fill();
      g.beginPath(); g.ellipse(tx, b - 255, 26, 22, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(tx, b - 330, 14, 12, 0, 0, TAU); g.fill();
      g.fillRect(tx - 4, b - 330, 8, 80); g.fillRect(tx - 2, b - 420, 4, 92);
      g.fillStyle = 'rgba(255,200,140,0.8)';
      for (let k = -2; k <= 2; k++) g.fillRect(tx + k * 8 - 2, b - 258, 4, 4);
    }
  });
}
function cityReflect(key, seed, y0, y1, xMin = 0, xMax = W) {
  return M.cached(key, W, H, (g) => {
    const r = M.rng(seed);
    for (let i = 0; i < 110; i++) {   // 一条条被水波打碎的倒影：一串短横线，越往下越淡、越散
      const x = lerp(xMin, xMax, r()), len = 30 + r() * 150, y = y0 + 4 + r() * 16, w = 3 + r() * 9, a0 = 0.1 + r() * 0.3;
      const gG = (180 + r() * 60) | 0;
      for (let k = 0; k * 5 < len && y + k * 5 < y1; k++) {
        const q = k * 5 / len;
        g.fillStyle = `rgba(255,${gG},120,${a0 * (1 - q) * (0.5 + r() * 0.5)})`;
        g.fillRect(x + (r() - 0.5) * (4 + 14 * q), y + k * 5, w * (0.5 + r() * (0.8 + q)), 2.2);
      }
    }
  });
}
function ridge(key, o) {
  return M.cached(key, W, H, (g) => {
    g.fillStyle = o.col; g.beginPath(); g.moveTo(-10, H + 10);
    for (let x = -10; x <= W + 10; x += 8) {
      const n1 = noise(x * o.f + o.seed, o.seed) * 0.6 + noise(x * o.f * 3.1 + o.seed * 2, 3) * 0.25 + noise(x * o.f * 9 + 5, o.seed) * 0.08;
      g.lineTo(x, o.base - o.amp * (0.5 + n1));
    }
    g.lineTo(W + 10, H + 10); g.closePath(); g.fill();
  });
}
function treeCanvas(key, h, seed, col) {
  const w = Math.ceil(h * 1.0), hh = Math.ceil(h * 1.05);
  return M.cached(key, w, hh, (g) => {
    const r = M.rng(seed);
    g.strokeStyle = col; g.lineCap = 'round';
    const br = (x, y, a, len, wd, d) => {
      const x2 = x + Math.sin(a) * len, y2 = y - Math.cos(a) * len;
      g.lineWidth = wd; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + x2) / 2 + (r() - .5) * len * 0.25, (y + y2) / 2, x2, y2); g.stroke();
      if (d <= 0) return;
      const k = 2 + (r() < 0.35 ? 1 : 0);
      for (let i = 0; i < k; i++) br(x2, y2, a + (r() - 0.5) * 1.25 + (i - (k - 1) / 2) * 0.35, len * (0.64 + r() * 0.16), Math.max(0.7, wd * 0.64), d - 1);
    };
    br(w / 2, hh, (r() - .5) * 0.12, h * 0.27, h * 0.05, 7);
  });
}
function forestLayer(key, o) {
  return M.cached(key, W, H, (g) => {
    const r = M.rng(o.seed);
    for (let i = 0; i < o.n; i++) {
      const h = o.hMin + r() * (o.hMax - o.hMin), x = (i + r() * 0.8) / o.n * (W + 200) - 100;
      const tc = treeCanvas('tree_' + o.seed + '_' + (i % 5), Math.round(h / 40) * 40, o.seed * 31 + (i % 5), o.col);
      g.drawImage(tc, x - tc.width / 2, o.base - tc.height + 4);
    }
    g.fillStyle = o.col; g.fillRect(0, o.base, W, H - o.base);
  });
}

// ============================================================ 人：关节剪影（她：短发 + 红围巾 + A 字大衣；你：短发 + 夹克）
const POSE0 = { lean: 0, head: 0, sF: 0.08, eF: 0.15, sB: -0.06, eB: 0.12, hF: 0.05, kF: 0.03, hB: -0.05, kB: 0.03 };
function walkPose(ph, amp = 1) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return { lean: 0.07 * amp, head: 0.02, hF: 0.42 * s * amp, kF: 0.06 + 0.75 * Math.max(0, c) ** 1.5 * amp, hB: -0.42 * s * amp, kB: 0.06 + 0.75 * Math.max(0, -c) ** 1.5 * amp,
    sF: -0.38 * s * amp, eF: 0.2 + 0.15 * Math.max(0, -s) * amp, sB: 0.38 * s * amp, eB: 0.2 + 0.15 * Math.max(0, s) * amp };
}
const stepPhase = (t, rate = 1) => Math.PI * (M.beat(t).i + M.beat(t).p) * rate + Math.PI / 2;   // 每一拍落一步
function seg(ctx, a, b, w) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
function figSide(ctx, p, fill, scarfCol) {
  const u = p.h / 100, P = Object.assign({}, POSE0, p.pose || {}), her = p.who !== 'him', t = p.t || 0, wind = p.wind ?? 0.35;
  const torso = her ? 29.5 : 31, legL = her ? 23.5 : 25, shinL = her ? 24.5 : 25.5;
  const ax = [Math.sin(P.lean), -Math.cos(P.lean)], pp = [-ax[1], ax[0]];
  const hip = [0, 0], sh = [ax[0] * torso * u, ax[1] * torso * u];
  const ha = P.lean + P.head;
  const nk = [sh[0] + Math.sin(P.lean + P.head * 0.4) * 4.2 * u, sh[1] - Math.cos(P.lean + P.head * 0.4) * 4.2 * u];
  const hc = [nk[0] + Math.sin(ha) * 6.6 * u, nk[1] - Math.cos(ha) * 6.6 * u];
  const leg = (h, k, off) => { const hp = [off * u, 1 * u]; const kn = [hp[0] + Math.sin(h) * legL * u, hp[1] + Math.cos(h) * legL * u]; const sa = h - k; return [hp, kn, [kn[0] + Math.sin(sa) * shinL * u, kn[1] + Math.cos(sa) * shinL * u], sa]; };
  const LF = leg(P.hF, P.kF, 1), LB = leg(P.hB, P.kB, -1);
  const ground = Math.max(LF[2][1], LB[2][1]) + 2.4 * u;
  const arm = (s, e, off) => { const sp = [sh[0] + off * u, sh[1] + 2.2 * u]; const el = [sp[0] + Math.sin(s) * 16.5 * u, sp[1] + Math.cos(s) * 16.5 * u]; return [sp, el, [el[0] + Math.sin(s + e) * 15.5 * u, el[1] + Math.cos(s + e) * 15.5 * u]]; };
  const AF = arm(P.sF, P.eF, 1), AB = arm(P.sB, P.eB, -1.5);
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.dir || 1, 1); ctx.translate(0, -ground);
  ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const foot = (L) => { seg(ctx, L[2], [L[2][0] + 4.8 * u, L[2][1] + 1.6 * u], 3.0 * u); };
  const lw = her ? [6, 4.8] : [7.4, 6];
  seg(ctx, LB[0], LB[1], lw[0] * u); seg(ctx, LB[1], LB[2], lw[1] * u); foot(LB);
  seg(ctx, AB[0], AB[1], 4.6 * u); seg(ctx, AB[1], AB[2], 3.9 * u);
  ctx.beginPath(); ctx.arc(AB[2][0], AB[2][1], 2.3 * u, 0, TAU); ctx.fill();
  // 身体：她是 A 字大衣，你是到腰的夹克
  const S = (k, m) => [sh[0] + pp[0] * k * u + ax[0] * m * u, sh[1] + pp[1] * k * u + ax[1] * m * u];
  const Hh = (k, m) => [pp[0] * k * u + ax[0] * m * u, pp[1] * k * u + ax[1] * m * u];
  const swing = (P.hF - P.hB) * 5;
  ctx.beginPath();
  if (her) {
    const fl = 2.5 + Math.abs(swing) * 0.6 + (P.fl || 0);
    let a = S(4.6, -1.5); ctx.moveTo(a[0], a[1]);
    a = S(5.5, -7); let b = Hh(6.4, 8); ctx.quadraticCurveTo(a[0], a[1], b[0], b[1]);
    a = Hh(8 + fl * 0.5 + swing * 0.3, -17); ctx.lineTo(a[0], a[1]);
    a = Hh(-9 - fl * 0.6 + swing * 0.2, -16.5); ctx.lineTo(a[0], a[1]);
    a = Hh(-6.4, 6); b = S(-5, -1.5); ctx.quadraticCurveTo(a[0], a[1], b[0], b[1]);
    a = S(0, 2.5); b = S(4.6, -1.5); ctx.quadraticCurveTo(a[0], a[1], b[0], b[1]);
  } else {
    let a = S(5.8, -1.5); ctx.moveTo(a[0], a[1]);
    a = Hh(6.6, -3); ctx.lineTo(a[0], a[1]); a = Hh(-6.8, -3); ctx.lineTo(a[0], a[1]);
    a = S(-6.5, -1.5); ctx.lineTo(a[0], a[1]); a = S(0, 3); const b = S(5.8, -1.5); ctx.quadraticCurveTo(a[0], a[1], b[0], b[1]);
  }
  ctx.fill();
  seg(ctx, LF[0], LF[1], lw[0] * u); seg(ctx, LF[1], LF[2], lw[1] * u); foot(LF);
  seg(ctx, AF[0], AF[1], 4.6 * u); seg(ctx, AF[1], AF[2], 3.9 * u);
  ctx.beginPath(); ctx.arc(AF[2][0], AF[2][1], 2.3 * u, 0, TAU); ctx.fill();
  seg(ctx, sh, nk, 4.6 * u);
  // 头
  ctx.save(); ctx.translate(hc[0], hc[1]); ctx.rotate(ha);
  ctx.beginPath(); ctx.ellipse(-0.4 * u, 0, 6.6 * u, 7.3 * u, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(5.4 * u, -2.2 * u); ctx.lineTo(7.7 * u, 1.3 * u); ctx.lineTo(6.2 * u, 2.4 * u); ctx.lineTo(5.8 * u, 5.4 * u); ctx.lineTo(3.2 * u, 7.4 * u); ctx.lineTo(0, 6 * u); ctx.closePath(); ctx.fill();
  if (her) {
    const sw = noise(t * 2.2, 9) * wind * 1.2 * u;
    ctx.beginPath(); ctx.moveTo(3.4 * u, -7.8 * u); ctx.quadraticCurveTo(-5 * u, -10.4 * u, -8.4 * u, -3 * u);
    ctx.lineTo(-9.2 * u + sw, 5.6 * u); ctx.quadraticCurveTo(-5.5 * u + sw, 8.6 * u, -1.6 * u, 7.6 * u); ctx.lineTo(-0.6 * u, 2.6 * u);
    ctx.lineTo(3.4 * u, -2.4 * u); ctx.lineTo(7.4 * u, -3.4 * u); ctx.quadraticCurveTo(7.6 * u, -6.8 * u, 3.4 * u, -7.8 * u); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(6.4 * u, -4.4 * u); ctx.quadraticCurveTo(3 * u, -10.4 * u, -4.6 * u, -8.6 * u); ctx.quadraticCurveTo(-9 * u, -5 * u, -8 * u, 2.4 * u);
    ctx.lineTo(-5.6 * u, 3 * u); ctx.lineTo(-4.4 * u, -2.6 * u); ctx.lineTo(5 * u, -5.4 * u); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // 红围巾：绕脖子一圈 + 一条被风吹起的尾巴
  if (her && scarfCol) {
    const mid = [lerp(sh[0], nk[0], 0.5), lerp(sh[1], nk[1], 0.5)];
    ctx.fillStyle = scarfCol; ctx.strokeStyle = scarfCol;
    ctx.beginPath(); ctx.ellipse(mid[0] + 0.6 * u, mid[1], 5.6 * u, 3.3 * u, P.lean * 0.5, 0, TAU); ctx.fill();
    let prev = [mid[0] - 3.4 * u, mid[1] + 0.8 * u];
    for (let j = 1; j <= 7; j++) {
      const k = j / 7;
      const nx = mid[0] - 3.4 * u - j * (1.7 + 3.4 * wind) * u + noise(t * 2.8 + j * 0.3, 3) * j * 0.5 * u;
      const ny = mid[1] + 0.8 * u + j * (2.7 - 2.1 * wind) * u + noise(t * 3.1 + j * 0.37, 7) * j * (0.4 + 1.4 * wind) * u;
      ctx.lineWidth = (3.9 - 1.8 * k) * u; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(nx, ny); ctx.stroke();
      prev = [nx, ny];
    }
    seg(ctx, [mid[0] + 3 * u, mid[1] + 1 * u], [mid[0] + 3.8 * u + noise(t * 2, 1) * u, mid[1] + 11 * u], 3.2 * u);
  }
  ctx.restore();
  return { hand: [p.x + AF[2][0] * (p.dir || 1), p.y - ground + AF[2][1]], head: [p.x + hc[0] * (p.dir || 1), p.y - ground + hc[1]] };
}
function figBack(ctx, p, fill, scarfCol) {
  const u = p.h / 100, P = Object.assign({ aL: 0.12, eL: 0.06, aR: 0.12, eR: 0.06, tilt: 0, turn: 0 }, p.pose || {}), t = p.t || 0, wind = p.wind ?? 0.3;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  seg(ctx, [-3.6 * u, -50 * u], [-4.3 * u, -2.5 * u], 6 * u); seg(ctx, [3.6 * u, -50 * u], [4.3 * u, -2.5 * u], 6 * u);
  ctx.beginPath(); ctx.ellipse(-4.6 * u, -1.4 * u, 3.4 * u, 1.8 * u, 0, 0, TAU); ctx.ellipse(4.6 * u, -1.4 * u, 3.4 * u, 1.8 * u, 0, 0, TAU); ctx.fill();
  const sw = noise(t * 1.3, 4) * 0.8 * u;
  ctx.beginPath(); ctx.moveTo(-9.6 * u, -79 * u); ctx.quadraticCurveTo(-10.4 * u, -82 * u, -6.5 * u, -82.4 * u); ctx.lineTo(6.5 * u, -82.4 * u);
  ctx.quadraticCurveTo(10.4 * u, -82 * u, 9.6 * u, -79 * u); ctx.lineTo(13.2 * u + sw, -33 * u); ctx.quadraticCurveTo(0, -31 * u, -13.2 * u + sw, -33 * u); ctx.closePath(); ctx.fill();
  const arm = (side, a, e) => {
    const s0 = [side * 9.2 * u, -78 * u];
    const el = [s0[0] + side * Math.sin(a) * 16.5 * u, s0[1] + Math.cos(a) * 16.5 * u];
    const hd = [el[0] + side * Math.sin(a + e) * 15.5 * u, el[1] + Math.cos(a + e) * 15.5 * u];
    seg(ctx, s0, el, 4.8 * u); seg(ctx, el, hd, 4 * u); ctx.beginPath(); ctx.arc(hd[0], hd[1], 2.4 * u, 0, TAU); ctx.fill();
    return hd;
  };
  const hl = arm(-1, P.aL, P.eL), hr = arm(1, P.aR, P.eR);
  seg(ctx, [0, -81 * u], [0, -85.5 * u], 4.8 * u);
  const hx = P.turn * 1.6 * u, hy = -91.5 * u + P.tilt * 1.4 * u;
  ctx.beginPath(); ctx.ellipse(hx, hy, 7.1 * u, 7.6 * u * (1 - 0.06 * Math.abs(P.tilt)), 0, 0, TAU); ctx.fill();
  if (p.who !== 'him') {   // 后脑勺的短发：比头宽一点、齐到下巴
    const hs = noise(t * 2, 2) * wind * 0.8 * u;
    ctx.beginPath(); ctx.moveTo(hx - 7.6 * u, hy); ctx.bezierCurveTo(hx - 8.4 * u, hy - 10.8 * u, hx + 8.4 * u, hy - 10.8 * u, hx + 7.6 * u, hy);
    ctx.lineTo(hx + 8.6 * u + hs, hy + 7.4 * u); ctx.quadraticCurveTo(hx, hy + 9.4 * u, hx - 8.6 * u + hs, hy + 7.4 * u); ctx.closePath(); ctx.fill();
  }
  if (p.who !== 'him' && scarfCol) {
    ctx.fillStyle = scarfCol; ctx.strokeStyle = scarfCol;
    ctx.beginPath(); ctx.ellipse(0, -82.6 * u, 6.8 * u, 2.9 * u, 0, 0, TAU); ctx.fill();
    let prev = [4.2 * u, -82 * u];
    for (let j = 1; j <= 6; j++) {
      const nx = 4.2 * u + j * (0.6 + 2.6 * wind) * u + noise(t * 2.7 + j * 0.4, 11) * j * (0.3 + 1.1 * wind) * u;
      const ny = -82 * u + j * (2.9 - 1.5 * wind) * u + noise(t * 2.2 + j * 0.3, 13) * j * 0.6 * wind * u;
      ctx.lineWidth = (3.6 - 1.6 * j / 6) * u; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(nx, ny); ctx.stroke(); prev = [nx, ny];
    }
  }
  ctx.restore();
  return { hl: [p.x + hl[0], p.y + hl[1]], hr: [p.x + hr[0], p.y + hr[1]] };
}
// 画一个人：先画一遍轮廓光（偏一点、用光的颜色），再画剪影本体
function person(ctx, p) {
  const f = p.view === 'back' ? figBack : figSide;
  if (p.rim && p.rim.a > 0.01) {
    ctx.save(); ctx.globalAlpha = Math.min(1, p.rim.a) * (p.alpha ?? 1); ctx.translate(p.rim.dx, p.rim.dy);
    f(ctx, p, p.rim.col, p.who !== 'him' ? p.rim.col : null); ctx.restore();
  }
  ctx.save(); ctx.globalAlpha = p.alpha ?? 1;
  const r = f(ctx, p, p.fill || INK, p.scarf === false ? null : (p.scarfCol || SCARF));
  ctx.restore();
  return r;
}

// ============================================================ 她的侧脸特写（短发、睫毛、红围巾）
function faceProfile(ctx, x, y, s, o) {
  const tilt = o.tilt || 0, t = o.t || 0;
  const draw = (fill, rimPass) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = fill; ctx.strokeStyle = fill;
    ctx.beginPath(); ctx.moveTo(-90, 360); ctx.lineTo(-66, 60); ctx.lineTo(50, 60); ctx.lineTo(70, 190);
    ctx.quadraticCurveTo(230, 250, 330, 470); ctx.lineTo(-380, 470); ctx.quadraticCurveTo(-300, 330, -90, 360); ctx.fill();
    ctx.save(); ctx.translate(0, 50); ctx.rotate(tilt); ctx.translate(0, -50);
    ctx.beginPath();
    ctx.moveTo(-60, 90); ctx.lineTo(-70, 20);
    ctx.bezierCurveTo(-118, -60, -126, -172, -80, -228);
    ctx.bezierCurveTo(-40, -272, 30, -262, 58, -222);
    ctx.bezierCurveTo(78, -195, 86, -160, 88, -132);
    ctx.quadraticCurveTo(91, -121, 85, -112);
    ctx.quadraticCurveTo(101, -88, 117, -61);
    ctx.quadraticCurveTo(122, -52, 112, -48);
    ctx.quadraticCurveTo(102, -46, 98, -44);
    ctx.quadraticCurveTo(96, -38, 102, -29);
    ctx.quadraticCurveTo(100, -22, 94, -20);
    ctx.quadraticCurveTo(101, -15, 99, -8);
    ctx.quadraticCurveTo(90, 0, 92, 10);
    ctx.quadraticCurveTo(98, 30, 80, 42);
    ctx.quadraticCurveTo(55, 52, 42, 56);
    ctx.lineTo(50, 90); ctx.closePath(); ctx.fill();
    const sway = noise(t * 1.6, 5) * 4;
    const hp = new Path2D();   // 齐下巴的短发 + 碎刘海
    hp.moveTo(90, -146); hp.lineTo(77, -158); hp.lineTo(82, -167); hp.lineTo(69, -179); hp.lineTo(73, -190); hp.lineTo(60, -204);
    hp.bezierCurveTo(40, -264, -42, -292, -102, -248);
    hp.bezierCurveTo(-152, -206, -153, -110, -142, -40);
    hp.quadraticCurveTo(-138, 12, -126 + sway, 44);
    hp.lineTo(-112 + sway, 36); hp.lineTo(-100 + sway * 0.8, 47); hp.lineTo(-84 + sway * 0.5, 38); hp.lineTo(-70, 47); hp.lineTo(-52, 39);
    hp.quadraticCurveTo(-18, -40, 10, -112);
    hp.quadraticCurveTo(44, -150, 90, -146); hp.closePath();
    ctx.fillStyle = rimPass ? fill : (o.hair || '#0f1026'); ctx.fill(hp);
    if (!rimPass) {   // 发丝和头顶的一道光泽，让头发和脸分得开
      ctx.save(); ctx.clip(hp); ctx.lineCap = 'round';
      ctx.strokeStyle = o.sheen || 'rgba(160,180,255,0.07)'; ctx.lineWidth = 22;
      ctx.beginPath(); ctx.arc(-40, -120, 150, -2.6, -1.0); ctx.stroke();
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 26; i++) {
        const q = clamp(i / 25 + (hash(i, 9) - 0.5) * 0.05), ex = lerp(-140, 70, q), ey = lerp(40, -150, q * q);
        ctx.strokeStyle = `rgba(150,170,255,${0.02 + 0.045 * hash(i, 3)})`; ctx.lineWidth = 1.2 + 2.6 * hash(i, 8);
        ctx.beginPath(); ctx.moveTo(-20 + (hash(i, 4) - .5) * 60, -275); ctx.quadraticCurveTo(lerp(-150, 40, q) + sway, lerp(-180, -240, q), ex + sway * (1 - q), ey); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.fillStyle = fill;
    ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    [[83, -119, 98, -126], [84, -115, 99, -119], [83, -111, 97, -112]].forEach(l => { ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.quadraticCurveTo(l[2] - 4, l[1] - 2, l[2], l[3]); ctx.stroke(); });
    ctx.restore();
    if (!rimPass) {   // 红围巾
      ctx.fillStyle = SCARF;
      ctx.beginPath(); ctx.moveTo(-104, 66); ctx.quadraticCurveTo(-20, 52, 66, 78); ctx.quadraticCurveTo(96, 112, 84, 150);
      ctx.quadraticCurveTo(-20, 132, -122, 160); ctx.quadraticCurveTo(-134, 110, -104, 66); ctx.fill();
      ctx.beginPath(); ctx.moveTo(36, 128); ctx.quadraticCurveTo(70, 200 + sway, 66, 290); ctx.lineTo(120, 282); ctx.quadraticCurveTo(110, 200, 82, 126); ctx.fill();
      ctx.strokeStyle = 'rgba(120,8,22,0.7)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-100, 102); ctx.quadraticCurveTo(-10, 92, 74, 112); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,120,130,0.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-96, 72); ctx.quadraticCurveTo(-18, 60, 60, 82); ctx.stroke();
    }
    ctx.restore();
  };
  if (o.rim && o.rim.a > 0.01) { ctx.save(); ctx.globalAlpha = Math.min(1, o.rim.a); ctx.translate(o.rim.dx, o.rim.dy); draw(o.rim.col, true); ctx.restore(); }
  draw(o.fill || INK, false);
  if (o.tear && o.tear.a > 0.01) {   // 一滴眼泪：从眼角顺着脸颊滑下，带一点高光
    const k = clamp(o.tear.k);
    const pts = [[74, -104], [72, -80], [70, -52], [68, -24], [66, 0]];
    const seg4 = k * 4, i = Math.min(3, Math.floor(seg4)), f = seg4 - i;
    let tx = lerp(pts[i][0], pts[i + 1][0], f), ty = lerp(pts[i][1], pts[i + 1][1], f);
    const ca = Math.cos(tilt), sa = Math.sin(tilt); const rx = tx * ca - (ty - 50) * sa, ry = tx * sa + (ty - 50) * ca + 50;
    const X = x + rx * s, Y = y + ry * s;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 'cold', X, Y, 26 * s, o.tear.a * 0.9); glow(ctx, 'white', X, Y, 9 * s, o.tear.a);
    if (k > 0.05) { ctx.globalAlpha = o.tear.a * 0.35; ctx.strokeStyle = 'rgba(200,220,255,1)'; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.moveTo(x + 74 * s, y + -104 * s); ctx.lineTo(X, Y); ctx.stroke(); }
    ctx.restore();
  }
}
function bokeh(key, seed, warm) {
  return M.cached(key, W, H, (g) => {
    const r = M.rng(seed);
    const pal = warm ? [[255, 190, 120], [255, 130, 150], [255, 220, 160], [190, 150, 255]] : [[140, 180, 255], [190, 160, 255], [255, 200, 150], [120, 220, 255]];
    for (let i = 0; i < 46; i++) {
      const x = r() * W, y = r() * H * 0.9, rad = 30 + r() ** 2 * 140, c = pal[(r() * pal.length) | 0], a = 0.06 + r() * 0.2;
      const gr = g.createRadialGradient(x, y, rad * 0.6, x, y, rad);
      gr.addColorStop(0, rgba(c, a)); gr.addColorStop(0.85, rgba(c, a * 1.3)); gr.addColorStop(1, rgba(c, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    }
  });
}

// ============================================================ 江边（开头 / 感谢 / 满天烟火 / 眼睛里的倒影都用它）
const RB = { horizon: 585, rail: 800, ground: 858 };
function riverbank(ctx, t, o) {
  const list = o.list;
  const L = lightOf(list, t);
  skyGrad(ctx, 0, RB.horizon, [[0, '#04061a'], [0.55, '#111640'], [0.85, '#2a1f4e'], [1, '#4a2850']]);
  ctx.drawImage(starsCanvas('stars_rb', 420, 11, 520, false), 0, 0, W, H);
  twinkle(ctx, 21, 14, 480, t, 0.6);
  skyLight(ctx, list, t, o.skyK ?? 1);
  drawFWList(ctx, list, t);
  ctx.drawImage(cityCanvas('city_far', { seed: 5, base: RB.horizon, hMin: 30, hMax: 120, wMin: 40, wMax: 100, col: '#1a1838', win: 0.12, wx: 8, wy: 10 }), 0, 0, W, H);
  ctx.drawImage(cityCanvas('city_near', { seed: 9, base: RB.horizon + 2, hMin: 18, hMax: 150, wMin: 50, wMax: 130, col: '#0c0b1e', win: 0.2, wx: 9, wy: 11, tower: 420 }), 0, 0, W, H);
  // 江面
  skyGrad(ctx, RB.horizon, RB.rail, [[0, '#130f2c'], [1, '#05050f']]);
  ctx.save(); ctx.beginPath(); ctx.rect(0, RB.horizon + 2, W, RB.rail - RB.horizon); ctx.clip();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9; ctx.drawImage(cityReflect('cref', 3, RB.horizon + 4, RB.rail), 0, 0, W, H); ctx.restore();
  reflectFW(ctx, list, t, RB.horizon, 1);
  ctx.strokeStyle = 'rgba(4,4,12,0.55)';
  for (let i = 0; i < 26; i++) {
    const k = (i + 0.5) / 26, y = RB.horizon + 6 + (RB.rail - RB.horizon) * k ** 1.5, off = (t * (14 + 20 * k) + hash(i, 3) * 400) % 400;
    ctx.lineWidth = 1 + 3 * k; ctx.setLineDash([60 + 140 * k, 40 + 60 * hash(i, 5)]); ctx.lineDashOffset = -off;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.restore();
  // 栏杆、岸
  ctx.fillStyle = '#05050c'; ctx.fillRect(0, RB.ground - 6, W, H - RB.ground + 6);
  ctx.fillStyle = '#0a0918';
  ctx.fillRect(0, RB.rail - 8, W, 10); ctx.fillRect(0, RB.rail + 32, W, 6);
  for (let x = 30; x < W; x += 150) ctx.fillRect(x, RB.rail - 10, 9, RB.ground - RB.rail + 8);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  halo(ctx, 'warm', 1300, RB.ground + 120, 520, 0.12 + 0.18 * L.a, 0.35);
  ctx.globalAlpha = 0.18 * L.a; ctx.fillStyle = rgba(L.c, 1); ctx.fillRect(0, RB.rail - 9, W, 2);
  ctx.restore();
  // 她
  const rim = { col: rgba(mix(L.c, [255, 240, 220], 0.4), 1), a: 0.25 + 0.75 * Math.min(1, L.a), dx: -3, dy: -3 };
  if (o.mode === 'open') {
    const up = sm(T.L1_xiang, T.L1_xiang + 0.6, t);
    person(ctx, { view: 'back', x: 1560, y: 1046, h: 540, t, wind: 0.35, pose: { tilt: -up * 1.2, aL: 0.1, aR: 0.14 + 0.03 * Math.sin(t) }, rim });
  } else if (o.mode === 'thanks') {
    const bow = sm(T.L9, T.L9 + 0.35, t) * (1 - 0.6 * sm(T.L9 + 0.55, T.bar17, t));
    person(ctx, { view: 'side', dir: -1, x: 1480, y: 1046, h: 560, t, wind: 0.4,
      pose: { lean: 0.16 * bow, head: 0.32 * bow - 0.25 * (1 - bow), sF: 0.55, eF: 2.25, sB: -0.05, eB: 0.15, hF: 0.03, kF: 0.02, hB: -0.03, kB: 0.02 }, rim: { ...rim, dx: -4, dy: -2 } });
  } else {
    const k = sm(T.bar17, T.bar17 + 0.4, t), wv = Math.sin(TAU * (M.beat(t).i + M.beat(t).p) / 2);
    person(ctx, { view: 'back', x: o.inEye ? 1420 : 1560, y: 1046, h: 540, t, wind: 0.45, pose: { tilt: -1.2, aL: 0.1, aR: lerp(0.14, 2.55 + 0.18 * wv, k), eR: lerp(0.05, -0.25 + 0.2 * wv, k) }, rim });
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1;
  M.particles(ctx, 'snow', { n: 70, size: 2.4, speed: 0.45, alpha: 0.55, seed: 4, t });
  ctx.restore();
}

// ============================================================ 回忆：金色的两个人在烟火下转圈大笑
function memoryScene(ctx, t, o = {}) {
  skyGrad(ctx, 0, H, [[0, '#1d0c08'], [0.45, '#5a2a14'], [0.72, '#b8692e'], [0.86, '#e9a656'], [1, '#3a1a0c']]);
  ctx.drawImage(bokeh('bk_mem', 77, true), 0, 0, W, H);
  const list = FWL.mem;
  skyLight(ctx, list, t, 0.6);
  drawFWList(ctx, list, t, 0.9);
  ctx.fillStyle = '#2a120a'; ctx.fillRect(0, 900, W, H);
  ctx.drawImage(cityCanvas('city_mem', { seed: 9, base: 902, hMin: 18, hMax: 150, wMin: 50, wMax: 130, col: '#2a120a', win: 0.18, wx: 9, wy: 11, tower: 420 }), 0, 0, W, H);
  const lt = t - (o.t0 ?? 0);
  const spin = Math.sin(lt * 2.4) * 0.12, b = M.pulse('beat', { t, decay: 0.2 });
  const rim = { col: '#ffd7a0', a: 0.7, dx: 3, dy: -3 };
  person(ctx, { who: 'him', view: 'side', dir: 1, x: 860, y: 1000, h: 560, t, rim,
    pose: { lean: -0.12, head: -0.5 - 0.06 * b, sF: 2.42, eF: 0.12, sB: 0.35, eB: 0.3, hF: 0.18, kF: 0.12, hB: -0.15, kB: 0.05 } });
  person(ctx, { view: 'side', dir: -1, x: 1020, y: 1000, h: 520, t, wind: 0.9, rim: { ...rim, dx: -3 },
    pose: { lean: -0.14 + spin, head: -0.55 - 0.08 * b, sF: 2.42, eF: 0.1, sB: -1.3 + spin, eB: 0.4, hF: 0.25 + spin, kF: 0.3, hB: -0.2, kB: 0.1, fl: 4 } });
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * TAU + lt * 0.8, r = 200 + 40 * Math.sin(lt * 3 + i);
    glow(ctx, 'gold', 965 + Math.cos(a) * r, 520 + Math.sin(a) * r * 0.5, 7, 0.35 + 0.3 * Math.sin(lt * 5 + i));
  }
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(255,214,160,0.55)'; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// ============================================================ 夜路
function roadWalk(ctx, t, s) {
  skyGrad(ctx, 0, 680, [[0, '#050822'], [0.5, '#141a48'], [0.82, '#3a2556'], [1, '#6b3550']]);
  ctx.drawImage(starsCanvas('stars_road', 380, 17, 560, false), 0, 0, W, H);
  const list = FWL.road;
  skyLight(ctx, list, t, 1); drawFWList(ctx, list, t);
  const scroll = (t - T.bar5) * 260;
  const drawScroll = (cv, f) => { const off = ((scroll * f) % W + W) % W; ctx.drawImage(cv, -off, 0, W, H); ctx.drawImage(cv, W - off, 0, W, H); };
  drawScroll(ridge('rg_far', { base: 690, amp: 120, f: 0.0022, seed: 3, col: '#1d1840' }), 0.08);
  drawScroll(ridge('rg_mid', { base: 760, amp: 90, f: 0.004, seed: 8, col: '#100d26' }), 0.25);
  ctx.fillStyle = '#0a0918'; ctx.fillRect(0, 790, W, 60);
  const g = ctx.createLinearGradient(0, 812, 0, 860); g.addColorStop(0, '#3a2a40'); g.addColorStop(1, '#120e20');
  ctx.fillStyle = g; ctx.fillRect(0, 818, W, 40);
  ctx.fillStyle = '#05040b'; ctx.fillRect(0, 856, W, H - 856);
  const L = lightOf(list, t);
  // 路灯：一盏盏往后退
  const gap = 420, off = scroll % gap;
  for (let k = -1; k < 6; k++) {
    const x = k * gap - off + 120;
    ctx.fillStyle = '#05040b'; ctx.fillRect(x - 4, 470, 8, 360); ctx.fillRect(x - 4, 470, 46, 7);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 'warm', x + 38, 482, 30, 0.95); halo(ctx, 'warm', x + 38, 600, 180, 0.22, 1.6); halo(ctx, 'warm', x + 38, 836, 170, 0.35, 0.25);
    ctx.restore();
  }
  const ph = stepPhase(t, 1);
  person(ctx, { view: 'side', dir: 1, x: 860, y: 842, h: 470, t, wind: 0.75, pose: walkPose(ph, 1),
    rim: { col: rgba(mix(L.c, [255, 220, 180], 0.5), 1), a: 0.35 + 0.6 * Math.min(1, L.a), dx: 3, dy: -3 } });
  ctx.fillStyle = '#030208';
  for (let i = 0; i < 40; i++) {   // 前景的草，跑得比路快
    const x = ((i * 97 + hash(i, 4) * 60 - scroll * 1.6) % (W + 200) + W + 200) % (W + 200) - 100, hh = 30 + hash(i, 6) * 70;
    ctx.beginPath(); ctx.moveTo(x - 10, H); ctx.quadraticCurveTo(x - 2, H - hh * 0.6, x + (hash(i, 8) - .5) * 30, H - hh - 60); ctx.quadraticCurveTo(x + 4, H - hh * 0.5, x + 12, H); ctx.fill();
  }
  ctx.save(); M.particles(ctx, 'dust', { n: 40, size: 1.8, speed: 0.6, alpha: 0.35, color: '#cfc6ff', seed: 12, t }); ctx.restore();
}
const roadX = (s) => 960 + 140 * Math.sin(s * 5.2 + 0.4) * (1 - s) ** 0.8 + 210 * s;
const roadY = (s) => lerp(1110, 432, 1 - (1 - s) ** 1.7);
function roadFar(ctx, t, s) {
  skyGrad(ctx, 0, 440, [[0, '#03051a'], [0.6, '#0f1440'], [1, '#3a2858']]);
  ctx.drawImage(starsCanvas('stars_milky', 700, 23, 430, true), 0, 0, W, H);
  twinkle(ctx, 31, 24, 400, t, 0.8);
  const list = FWL.far; skyLight(ctx, list, t, 1); drawFWList(ctx, list, t);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; halo(ctx, 'warm', roadX(1) + 10, 430, 260, 0.45, 0.4); ctx.restore();
  ctx.drawImage(ridge('rg_f1', { base: 470, amp: 70, f: 0.003, seed: 13, col: '#1e1a44' }), 0, 0, W, H);
  ctx.drawImage(ridge('rg_f2', { base: 560, amp: 110, f: 0.0035, seed: 21, col: '#141130' }), 0, 0, W, H);
  ctx.drawImage(ridge('rg_f3', { base: 700, amp: 140, f: 0.0028, seed: 34, col: '#0c0a20' }), 0, 0, W, H);
  ctx.drawImage(ridge('rg_f4', { base: 880, amp: 160, f: 0.0026, seed: 41, col: '#060512' }), 0, 0, W, H);
  // 蜿蜒的路
  const N = 90, left = [], right = [];
  for (let i = 0; i <= N; i++) { const q = i / N, x = roadX(q), y = roadY(q), w = 330 * (1 - q) ** 1.6 + 2; left.push([x - w / 2, y]); right.push([x + w / 2, y]); }
  const rg = ctx.createLinearGradient(0, H, 0, 430); rg.addColorStop(0, '#2a2140'); rg.addColorStop(1, '#8a5a70');
  ctx.fillStyle = rg; ctx.beginPath(); left.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); for (let i = N; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i < 60; i++) {
    const q = i / 60 + ((t * 0.02) % (1 / 60)); if (q >= 1) continue;
    const w = 330 * (1 - q) ** 1.6 + 2, x = roadX(q), y = roadY(q), r = 3 + 10 * (1 - q) ** 2, a = 0.5 + 0.4 * Math.sin(t * 3 + i);
    glow(ctx, 'warm', x - w / 2 - 6, y, r * 2, a); glow(ctx, 'warm', x + w / 2 + 6, y, r * 2, a);
  }
  ctx.restore();
  const q = 0.36 + (t - T.L2_yao) * 0.006, px = roadX(q), py = roadY(q);
  const ph = stepPhase(t, 1);
  person(ctx, { view: 'back', x: px, y: py, h: 64, t, wind: 0.6, pose: { aL: 0.12 + 0.2 * Math.sin(ph), aR: 0.12 - 0.2 * Math.sin(ph) },
    rim: { col: '#ffcf9a', a: 0.6, dx: 0, dy: -1.5 } });
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 'red', px, py - 52, 10, 0.25); ctx.restore();
}

// ============================================================ 海
function seaY(x, t, layer, amp) {
  const k = layer;
  return Math.sin(x * (0.004 + k * 0.0012) + t * (0.9 + k * 0.25) + k * 1.7) * amp * (0.5 + k * 0.18)
    + Math.sin(x * (0.011 + k * 0.002) - t * (1.3 + k * 0.2) + k) * amp * 0.35 * (0.5 + k * 0.15)
    + noise(x * 0.004 + t * 0.4, k * 7) * amp * 0.5;
}
function sea(ctx, t, s) {
  skyGrad(ctx, 0, 530, [[0, '#040820'], [0.55, '#0f2050'], [1, '#2a3d74']]);
  ctx.drawImage(starsCanvas('stars_sea', 360, 29, 480, false), 0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  halo(ctx, 'cold', 1700, 330, 260, 0.55); glow(ctx, 'white', 1700, 330, 92, 0.95);
  ctx.restore();
  ctx.fillStyle = '#e8eeff'; ctx.beginPath(); ctx.arc(1700, 330, 52, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(180,195,235,0.5)'; ctx.beginPath(); ctx.arc(1688, 318, 12, 0, TAU); ctx.arc(1716, 344, 8, 0, TAU); ctx.fill();
  const list = FWL.sea; drawFWList(ctx, list, t, 0.8);
  ctx.drawImage(cityCanvas('city_sea', { seed: 9, base: 530, hMin: 4, hMax: 26, wMin: 10, wMax: 26, col: '#0c1230', win: 0.35, wx: 5, wy: 6 }), 0, 0, 760, H * 0.98);
  const lt = t - s.t0;
  const swell = 1 + 0.9 * sm(T.L3_hai - 0.4, T.L3_hai + 0.25, t) - 0.3 * sm(T.L3_hai + 1.2, T.bar8, t);
  const hit = M.pulse('bar', { t, decay: 0.5 });
  const cols = ['#18285e', '#122050', '#0d1842', '#091232', '#060c24', '#040818'];
  const base = [540, 590, 660, 750, 860, 990];
  let boat = null;
  for (let k = 0; k < 6; k++) {
    const amp = (6 + k * 12) * swell * (1 + 0.4 * hit * (k > 2 ? 1 : 0));
    ctx.fillStyle = cols[k]; ctx.beginPath(); ctx.moveTo(-20, H + 20);
    for (let x = -20; x <= W + 20; x += 16) ctx.lineTo(x, base[k] + seaY(x, t, k, amp));
    ctx.lineTo(W + 20, H + 20); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(150,180,255,${0.08 + k * 0.03})`; ctx.lineWidth = 1.5 + k * 0.6; ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 16) { const y = base[k] + seaY(x, t, k, amp); x < -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    for (let i = 0; i < 18; i++) {   // 月光在浪上的碎光
      const x = 1700 + (hash(i, k) - 0.5) * (120 + k * 80) + Math.sin(t * 2 + i) * 10, y = base[k] + seaY(x, t, k, amp) + 6 + hash(i, k + 9) * 30;
      glow(ctx, 'cold', x, y, 6 + k * 2, 0.25 + 0.3 * Math.sin(t * 6 + i * 1.7 + k));
    }
    ctx.restore();
    if (k === 3) {
      const bx = 820, by = base[k] + seaY(bx, t, k, amp), slope = (seaY(bx + 30, t, k, amp) - seaY(bx - 30, t, k, amp)) / 60;
      boat = { x: bx, y: by, a: Math.atan(slope) * 0.8 };
      ctx.save(); ctx.translate(bx, by + 6); ctx.rotate(boat.a);
      const lamp = person(ctx, { view: 'side', dir: -1, x: 30, y: -14, h: 250, t, wind: 1, pose: { lean: 0.08, head: -0.1, sF: 1.25, eF: 0.35, sB: -0.2, eB: 0.2, hF: 0.12, kF: 0.12, hB: -0.12, kB: 0.05 },
        rim: { col: '#ffcf8a', a: 0.8, dx: -2, dy: -2 } });
      ctx.fillStyle = '#05060f'; ctx.beginPath(); ctx.moveTo(-170, -20); ctx.quadraticCurveTo(-120, 30, 0, 32); ctx.quadraticCurveTo(130, 30, 175, -26); ctx.lineTo(150, -14); ctx.lineTo(-150, -10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#05060f'; ctx.fillRect(-150, -14, 300, 8);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const lx = lamp.hand[0], ly = lamp.hand[1] + 26 + Math.sin(t * 3) * 3;
      ctx.strokeStyle = '#05060f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lamp.hand[0], lamp.hand[1]); ctx.lineTo(lx, ly - 10); ctx.stroke();
      halo(ctx, 'warm', lx, ly, 150, 0.5); glow(ctx, 'warm', lx, ly, 26, 1); glow(ctx, 'white', lx, ly, 8, 0.9);
      ctx.restore();
      ctx.restore();
    }
  }
  if (boat) {   // 小节头浪打在船头
    const since = M.since('bar', t);
    if (since < 0.9) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 70; i++) {
        const a = -Math.PI / 2 + (hash(i, 3) - 0.5) * 2.2, v = 260 + hash(i, 4) * 420, tt = since;
        const x = boat.x - 160 + Math.cos(a) * v * tt, y = boat.y + Math.sin(a) * v * tt + 600 * tt * tt;
        glow(ctx, 'cold', x, y, 5 + hash(i, 5) * 6, (1 - since / 0.9) * 0.7);
      }
      ctx.restore();
    }
  }
  ctx.save(); M.particles(ctx, 'dust', { n: 50, size: 1.6, speed: 0.9, alpha: 0.3, color: '#bcd0ff', seed: 19, t }); ctx.restore();
}
function shoreHim(ctx, t, s) {
  skyGrad(ctx, 0, 700, [[0, '#050722'], [0.6, '#151c4c'], [1, '#3a2752']]);
  ctx.drawImage(starsCanvas('stars_rb', 420, 11, 520, false), 0, 0, W, H);
  const list = FWL.him; skyLight(ctx, list, t, 1); drawFWList(ctx, list, t);
  ctx.drawImage(cityCanvas('city_him', { seed: 9, base: 690, hMin: 30, hMax: 200, wMin: 60, wMax: 150, col: '#0e0c22', win: 0.2, wx: 10, wy: 12, tower: 520 }), 0, 0, W, H);
  ctx.fillStyle = '#07060f'; ctx.fillRect(0, 688, W, 30);
  skyGrad(ctx, 716, H, [[0, '#0e0c26'], [1, '#03030a']]);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 716, W, H - 716); ctx.clip();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(cityReflect('cref2', 8, 720, H), 0, 0, W, H); ctx.restore();
  reflectFW(ctx, list, t, 700, 1.1);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; halo(ctx, 'warm', 1180, 860, 120, 0.4, 2.6); ctx.restore();
  ctx.strokeStyle = 'rgba(3,3,10,0.6)';
  for (let i = 0; i < 30; i++) { const k = (i + 0.5) / 30, y = 720 + (H - 720) * k ** 1.4; ctx.lineWidth = 1 + 5 * k; ctx.setLineDash([80 + 200 * k, 50 + 80 * hash(i, 2)]); ctx.lineDashOffset = -(t * (20 + 40 * k) + hash(i, 1) * 300); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.setLineDash([]); ctx.restore();
  const look = sm(T.L3_kan - 0.05, T.L3_kan + 0.35, t);
  const lampA = 0.75 + 0.25 * M.pulse('char', { t, decay: 0.2 }) + 0.3 * M.pulse([T.L3_kan], { t, decay: 0.5 });
  ctx.fillStyle = '#05040b'; ctx.fillRect(1176, 420, 8, 272); ctx.fillRect(1176, 420, -60, 6);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 'warm', 1120, 430, 26, lampA);
  ctx.globalAlpha = 0.16 * lampA; const cone = ctx.createLinearGradient(0, 430, 0, 690); cone.addColorStop(0, 'rgba(255,190,120,1)'); cone.addColorStop(1, 'rgba(255,190,120,0.2)');
  ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(1112, 434); ctx.lineTo(1128, 434); ctx.lineTo(1210, 690); ctx.lineTo(1030, 690); ctx.closePath(); ctx.fill();
  ctx.restore();
  person(ctx, { who: 'him', view: 'side', dir: -1, x: 1110, y: 690, h: 250, t, pose: { head: lerp(0.25, -0.12, look), sF: lerp(0.15, 1.2, look * 0), eF: 0.9, sB: 0.15, eB: 0.9, hF: 0.04, kF: 0.02, hB: -0.04, kB: 0.02 },
    rim: { col: '#ffcf9a', a: 0.9 * lampA, dx: 2, dy: -2 } });
}

// ============================================================ 冬天的树林：黑夜 / 仙女棒照亮
function sparkBurst(ctx, x, y, t, k, seed = 1) {   // 仙女棒的火花
  if (k <= 0.01) return;
  const fr = Math.floor(t * 40);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  halo(ctx, 'warm', x, y, 520 * k, 0.55 * k); glow(ctx, 'white', x, y, 40 * k, 1); glow(ctx, 'gold', x, y, 90 * k, 0.8 * k);
  ctx.lineCap = 'round';
  for (let i = 0; i < 120; i++) {
    const h1 = hash(i, fr + seed * 77), h2 = hash(i + 50, fr + seed * 77), h3 = hash(i + 99, fr + seed * 77);
    const a = h1 * TAU, len = (40 + h2 * 190) * k, x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len + len * len * 0.0015;
    ctx.strokeStyle = h3 < 0.5 ? 'rgba(255,240,200,0.9)' : 'rgba(255,190,110,0.8)'; ctx.lineWidth = 1.2 + h3 * 1.6; ctx.globalAlpha = 0.5 + 0.5 * h3;
    const mx = x + Math.cos(a) * len * 0.55, my = y + Math.sin(a) * len * 0.55;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10); ctx.lineTo(mx, my); ctx.lineTo(x2, y2); ctx.stroke();
    if (h2 > 0.7) { ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a + 0.8) * len * 0.25, my + Math.sin(a + 0.8) * len * 0.25); ctx.stroke(); }
  }
  ctx.restore();
}
// 黑暗里盯着她的眼睛（惶恐）：光照到就闭上、消失
function fearEyes(ctx, t, cx, cy, R, k) {
  if (k <= 0.01) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 11; i++) {
    const a = hash(i, 51) * TAU, d = 420 + hash(i, 52) * 520;
    const x = cx + Math.cos(a) * d * 1.25, y = Math.min(860, cy + Math.sin(a) * d * 0.55);
    const lit = 1 - sm(d * 0.75, d * 1.05, R);
    const blinkP = (t * (0.6 + hash(i, 53) * 0.5) + hash(i, 54)) % 1, open = blinkP < 0.08 ? Math.abs(blinkP - 0.04) / 0.04 : 1;
    const a2 = k * lit * sm(0, 0.3, t - (T.L4_hei + 0.35 + hash(i, 55) * 0.9));
    if (a2 < 0.01) continue;
    const sz = 0.7 + hash(i, 56) * 0.7;
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(x + side * 20 * sz, y); ctx.scale(1, Math.max(0.08, open) * 0.45);
      glow(ctx, i % 3 ? 'violet' : 'red', 0, 0, 26 * sz, a2 * 0.95); glow(ctx, 'white', 0, 0, 5 * sz, a2 * 0.6);
      ctx.restore();
    }
  }
  ctx.restore();
}
function forest(ctx, t, s) {
  const light = s.params.mode === 'light';
  const dark = light ? 1 : sm(T.L4_hei - 0.06, T.L4_hei + 0.1, t);
  skyGrad(ctx, 0, 820, [[0, '#04061a'], [0.6, '#0f1a44'], [1, '#22306a']]);
  ctx.drawImage(starsCanvas('stars_forest', 500, 37, 600, false), 0, 0, W, H);
  twinkle(ctx, 41, 16, 560, t, 0.7);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; halo(ctx, 'cold', 1450, 250, 230, 0.6); glow(ctx, 'white', 1450, 250, 80, 0.9); ctx.restore();
  ctx.fillStyle = '#e6ecff'; ctx.beginPath(); ctx.arc(1450, 250, 44, 0, TAU); ctx.fill();
  ctx.drawImage(forestLayer('fl_far', { seed: 3, n: 16, hMin: 300, hMax: 420, base: 830, col: '#16204a' }), 0, 0, W, H);
  ctx.drawImage(forestLayer('fl_mid', { seed: 7, n: 9, hMin: 420, hMax: 620, base: 870, col: '#0b1030' }), 0, 0, W, H);
  if (dark > 0) { ctx.fillStyle = `rgba(1,1,4,${0.94 * dark})`; ctx.fillRect(-50, -50, W + 100, H + 100); }
  let R = 0, sx = 0, sy = 0;
  const walkX = light ? 640 + (t - T.bar11) * 90 : 560 + (t - T.L4) * 70;
  if (light) {   // 光圈
    const k1 = sm(T.bar11, T.bar11 + 0.3, t), k2 = sm(T.L6_bu - 0.05, T.L6_bu + 0.3, t), k3 = sm(T.L6_huang - 0.05, T.L6_huang + 0.4, t);
    R = 260 * k1 + 180 * k2 + 330 * k3 + 30 * Math.sin(t * 9) * k1 + 40 * M.pulse('beat', { t, decay: 0.15 });
    sx = walkX + 110; sy = 520;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    halo(ctx, 'amber', sx, sy + 120, R * 1.6, 0.85); halo(ctx, 'warm', sx, sy, R * 0.9, 0.7);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp(R / 600) * 0.9;
    ctx.drawImage(forestLayer('fl_mid_l', { seed: 7, n: 9, hMin: 420, hMax: 620, base: 870, col: '#07050a' }), 0, 0, W, H);
    ctx.restore();
  }
  ctx.drawImage(forestLayer('fl_near', { seed: 11, n: 5, hMin: 700, hMax: 900, base: 930, col: '#020205' }), 0, 0, W, H);
  ctx.fillStyle = '#020205'; ctx.fillRect(0, 900, W, H);
  const ph = stepPhase(t, 1);
  const pose = walkPose(ph, light ? 0.9 : 0.75);
  if (light) { pose.sF = 2.5; pose.eF = 0.2; pose.head = -0.15; }
  const rimDark = { col: '#5f80e0', a: lerp(0.35, 0.55, dark), dx: -2, dy: -2 };
  const res = person(ctx, { view: 'side', dir: 1, x: walkX, y: 905, h: light ? 330 : 300, t, wind: 0.5, pose,
    rim: light ? { col: '#ffc070', a: 0.95, dx: 3, dy: -3 } : rimDark, scarfCol: light ? SCARF : (dark > 0.5 ? '#7a1a26' : SCARF) });
  if (!light) {   // 呼出的白气，跟着拍子
    const sb = M.since('beat', t);
    if (sb < 0.8) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) glow(ctx, 'cold', res.head[0] + 20 + sb * 60 + i * 6, res.head[1] + 6 - sb * 20 - i * 3, 10 + sb * 30, (1 - sb / 0.8) * 0.18); ctx.restore(); }
    fearEyes(ctx, t, walkX + 40, 600, 0, dark);
  }
  if (light) {
    const hx = res.hand[0], hy = res.hand[1];
    ctx.strokeStyle = '#020205'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 30, hy - 60); ctx.stroke();
    sparkBurst(ctx, hx + 32, hy - 64, t, 0.75 + 0.25 * M.pulse('beat', { t, decay: 0.15 }), 3);
    fearEyes(ctx, t, sx, sy, R, 1 - sm(T.L6_huang, T.L6_huang + 0.25, t));
    // 黑影爪子：从四周伸过来，被光逼退；「惶恐」时碎成灰
    const crack = sm(T.L6_huang, T.L6_huang + 0.5, t);
    for (let i = 0; i < 9; i++) {
      const a = (i + 0.5) / 9 * TAU + 0.2 + hash(i, 2) * 0.25, edge = 1300;
      const ex = sx + Math.cos(a) * edge, ey = sy + Math.sin(a) * edge * 0.7;
      const reach = Math.max(R * 0.95 + 30, 150) + crack * 600 + 40 * Math.sin(t * 2.6 + i * 1.7);
      const tx = sx + Math.cos(a) * reach, ty = sy + Math.sin(a) * reach * 0.7;
      const al = (1 - crack) * 0.97;
      if (al > 0.01) {   // 一条又粗又弯的黑影胳膊，尽头是张开的爪子
        ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = '#0d0616';
        const nx = -Math.sin(a), ny = Math.cos(a), w0 = 120 + 70 * hash(i, 5), wob = Math.sin(t * 3 + i * 1.3) * 90;
        const mx = (ex + tx) / 2 + nx * wob, my = (ey + ty) / 2 + ny * wob;
        ctx.beginPath(); ctx.moveTo(ex + nx * w0, ey + ny * w0);
        ctx.quadraticCurveTo(mx + nx * w0 * 0.35, my + ny * w0 * 0.35, tx + nx * 16, ty + ny * 16);
        ctx.lineTo(tx - nx * 16, ty - ny * 16);
        ctx.quadraticCurveTo(mx - nx * w0 * 0.35, my - ny * w0 * 0.35, ex - nx * w0, ey - ny * w0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(175,90,235,0.5)'; ctx.lineWidth = 4; ctx.stroke();
        ctx.lineCap = 'round';
        for (let f = 0; f < 4; f++) {
          const fa = a + Math.PI + (f - 1.5) * 0.42 + Math.sin(t * 5 + i + f) * 0.08, l1 = 46 + 10 * hash(i, f), cx2 = tx + Math.cos(fa) * l1 * 0.6, cy2 = ty + Math.sin(fa) * l1 * 0.6;
          ctx.strokeStyle = '#0d0616'; ctx.lineWidth = 13 - f; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(cx2, cy2, cx2 + Math.cos(fa + 0.6) * l1 * 0.5, cy2 + Math.sin(fa + 0.6) * l1 * 0.5); ctx.stroke();
        }
        ctx.restore();
      }
      if (crack > 0 && crack < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let j = 0; j < 8; j++) { const d = reach - 200 + hash(i, j) * 300 + crack * 200, x = sx + Math.cos(a + (hash(j, i) - .5) * 0.3) * d, y = sy + Math.sin(a) * d * 0.7 - crack * 120 * hash(i + j, 1); glow(ctx, 'violet', x, y, 6, (1 - crack) * 0.7); }
        ctx.restore();
      }
    }
  }
  ctx.save(); ctx.globalAlpha = light ? 0.8 : lerp(0.7, 0.35, dark); M.particles(ctx, 'snow', { n: 90, size: 2.2, speed: 0.45, alpha: 0.6, seed: 8, t }); ctx.restore();
}
function sparkler(ctx, t, s) {
  skyGrad(ctx, 0, H, [[0, '#020208'], [1, '#05040c']]);
  const ign = sm(T.L5_xiang - 0.02, T.L5_xiang + 0.12, t);
  ctx.save(); ctx.globalAlpha = 0.25 + 0.5 * ign; ctx.drawImage(bokeh('bk_spark', 55, true), (t - s.t0) * -12, 0, W, H); ctx.restore();
  const tip = [1210, 690], hand = [1010, 975];
  // 光里浮出你的影子
  const ghost = sm(T.L5_ni - 0.1, T.L5_ni + 0.5, t) * 0.55;
  if (ghost > 0.01) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ghost;
    const gx = 1560 + (t - T.L5_ni) * 8, gy = 470;
    const gg = ctx.createRadialGradient(gx, gy - 60, 10, gx, gy, 380); gg.addColorStop(0, 'rgba(255,200,140,0.9)'); gg.addColorStop(1, 'rgba(255,170,100,0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.ellipse(gx, gy - 150, 78, 92, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(gx - 60, gy - 70); ctx.quadraticCurveTo(gx - 230, gy - 30, gx - 250, gy + 160); ctx.lineTo(gx + 250, gy + 160); ctx.quadraticCurveTo(gx + 230, gy - 30, gx + 60, gy - 70); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const L = ign * (0.85 + 0.15 * Math.sin(t * 37));
  faceProfile(ctx, 560, 660, 1.45, { tilt: 0.2, t, rim: { col: `rgba(255,${(170 + 50 * L) | 0},110,1)`, a: 0.1 + 0.9 * L, dx: 7, dy: -2 } });
  // 手和仙女棒
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(700, H + 20); ctx.quadraticCurveTo(860, 1010, hand[0] - 30, hand[1] + 10); ctx.lineTo(hand[0] + 10, hand[1] + 60); ctx.quadraticCurveTo(880, 1080, 820, H + 20); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hand[0], hand[1], 46, 36, -0.5, 0, TAU); ctx.fill();
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(hand[0] + 22 + i * 4, hand[1] - 22 + i * 13, 14, 0, TAU); ctx.fill(); }
  ctx.lineWidth = 5; ctx.strokeStyle = '#1a1416'; ctx.beginPath(); ctx.moveTo(hand[0] + 6, hand[1] - 8); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
  if (L > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L * 0.9; ctx.strokeStyle = 'rgba(255,170,90,1)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hand[0] + 30, hand[1] - 36); ctx.lineTo(tip[0], tip[1]); ctx.stroke(); ctx.restore(); }
  const fl = sm(T.bar10 - 0.02, T.bar10 + 0.03, t) * (1 - ign);   // 小节头：火柴一擦，小火苗
  if (fl > 0.01) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const fx = tip[0] + 6, fy = tip[1] - 8 + Math.sin(t * 40) * 2;
    halo(ctx, 'amber', fx, fy, 260, 0.45 * fl); glow(ctx, 'amber', fx, fy, 34, fl); glow(ctx, 'white', fx, fy + 6, 12, fl);
    ctx.restore();
  }
  sparkBurst(ctx, tip[0], tip[1], t, ign * (0.95 + 0.05 * Math.sin(t * 31)) * (1 + 0.15 * M.pulse('beat', { t, decay: 0.12 })), 1);
}
function timeflow(ctx, t, s) {
  const lt = t - s.t0, k = lt / s.dur;
  skyGrad(ctx, 0, H, [[0, '#03041a'], [0.6, rgba(mix([20, 24, 70], [60, 30, 90], k), 1)], [1, rgba(mix([40, 30, 80], [120, 60, 110], k), 1)]]);
  const cx = 960, cy = 260, ang = 0.4 * lt + 1.6 * lt * lt;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const r = 30 + hash(i, 1) ** 0.8 * 1300, a0 = hash(i, 2) * TAU, c = hash(i, 3);
    ctx.strokeStyle = c < 0.2 ? 'rgba(255,210,170,1)' : c < 0.4 ? 'rgba(180,200,255,1)' : 'rgba(240,240,255,1)';
    ctx.globalAlpha = 0.25 + 0.5 * hash(i, 4); ctx.lineWidth = 0.8 + hash(i, 5) * 1.8;
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + ang); ctx.stroke();
  }
  for (let i = 0; i < 80; i++) {   // 仙女棒的火星往天上飞，变成星星
    const st = hash(i, 9) * 0.8, q = clamp((lt - st) / 0.9); if (q <= 0) continue;
    const x = 960 + (hash(i, 10) - 0.5) * 300 + (hash(i, 11) - 0.5) * 900 * q, y = H + 40 - q * (H - 120 + hash(i, 12) * 300);
    glow(ctx, q < 0.6 ? 'gold' : 'white', x, y, 10 - q * 5, (1 - q * 0.5) * 0.9);
  }
  ctx.restore();
  ctx.fillStyle = '#020205'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H - 60); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, H - 50 - 40 * (0.5 + noise(x * 0.01, 2))); ctx.lineTo(W, H); ctx.fill();
}

// ============================================================ □□□□□：天色昼夜飞转，□□□□□
const DAY = [
  { s: ['#060818', '#141a44', '#3b2552'], g: '#0a0918', w: '#121034', sun: 0 },
  { s: ['#1d2252', '#7a4a78', '#f0a07c'], g: '#1d1424', w: '#5a3a5c', sun: 1 },
  { s: ['#3a62a4', '#7aa2d4', '#cfdcea'], g: '#2a2a36', w: '#4a6a98', sun: 1 },
  { s: ['#2a1d4a', '#9a4a62', '#ffb072'], g: '#1a1020', w: '#6a3a50', sun: 1 },
];
function dayAt(ph) { const i = Math.floor(ph) % 4, j = (i + 1) % 4, f = eIO(ph - Math.floor(ph)); const A = DAY[i], B = DAY[j];
  return { s: A.s.map((c, k) => mix(hex(c), hex(B.s[k]), f)), g: mix(hex(A.g), hex(B.g), f), w: mix(hex(A.w), hex(B.w), f), sun: lerp(A.sun, B.sun, f) }; }
function shoreTime(ctx, t, s) {
  const crowd = s.params.mode === 'crowd';
  const ph = t < T.bar14 ? 2.0 * ((t - T.L7) / (T.bar14 - T.L7)) ** 1.4 : t < T.L7_zou ? lerp(2.0, 2.45, (t - T.bar14) / (T.L7_zou - T.bar14)) : lerp(2.45, 4.0, eIO((t - T.L7_zou) / (T.L8 - T.L7_zou)));
  const D = dayAt(ph);
  const hz = crowd ? 700 : 560;
  skyGrad(ctx, 0, hz, [[0, rgba(D.s[0], 1)], [0.6, rgba(D.s[1], 1)], [1, rgba(D.s[2], 1)]]);
  const night = 1 - D.sun;
  ctx.save(); ctx.globalAlpha = night; ctx.drawImage(starsCanvas('stars_rb', 420, 11, 520, false), 0, crowd ? 60 : 0, W, H); ctx.restore();
  const sa = (ph % 1) * Math.PI;   // 太阳 / 月亮划过天空
  const bx = lerp(-100, W + 100, (ph % 1)), by = hz - Math.sin(sa) * (hz - 120);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (D.sun > 0.3) { halo(ctx, 'amber', bx, by, 300, 0.5 * D.sun); glow(ctx, 'white', bx, by, 70, 0.9 * D.sun); }
  else { halo(ctx, 'cold', bx, by, 200, 0.4); glow(ctx, 'white', bx, by, 44, 0.8); }
  ctx.restore();
  const list = FWL.time; drawFWList(ctx, list, t, 0.5 + 0.5 * night);
  ctx.drawImage(cityCanvas('city_far', { seed: 5, base: RB.horizon, hMin: 30, hMax: 120, wMin: 40, wMax: 100, col: '#1a1838', win: 0.12, wx: 8, wy: 10 }), 0, hz - RB.horizon, W, H);
  ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = rgba(mix(D.g, [10, 10, 20], 0.3), 1); ctx.fillRect(0, hz - 30, W, 32); ctx.restore();
  skyGrad(ctx, hz, crowd ? 860 : 800, [[0, rgba(D.w, 1)], [1, rgba(mix(D.w, [5, 5, 15], 0.7), 1)]]);
  ctx.fillStyle = rgba(mix(D.g, [3, 3, 8], 0.6), 1); ctx.fillRect(0, crowd ? 858 : 798, W, H);
  // 她：一动不动
  const sx = 960, sy = crowd ? 1062 : 1000, sh = crowd ? 600 : 330;
  const shA = (ph % 1) * Math.PI;   // 影子跟着太阳转
  ctx.save(); ctx.globalAlpha = 0.4 * D.sun; ctx.fillStyle = '#000'; ctx.translate(sx, sy); ctx.rotate(Math.PI / 2 - shA + Math.PI / 2); ctx.scale(1, 0.25);
  ctx.beginPath(); ctx.ellipse(0, -sh * 0.45, sh * 0.06, sh * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore();
  // 人潮
  const start = T.L7_ren, nPeople = crowd ? 46 : 26;
  const people = [];
  for (let i = 0; i < nPeople; i++) {
    const appear = start + (crowd ? -1.2 : 0) + hash(i, 1) * (crowd ? 1.0 : 1.4), gone = T.L7_zou - 0.05 + hash(i, 2) * 0.25;
    if (t < appear - 0.5) continue;
    const depth = hash(i, 3), dir = hash(i, 4) < 0.5 ? -1 : 1, sp = (crowd ? 900 : 380) * (0.6 + hash(i, 5)) * (crowd ? (0.4 + depth) : (0.5 + depth));
    const y = crowd ? lerp(880, 1220, depth) : lerp(820, 1060, depth), hh = crowd ? lerp(320, 1100, depth) : lerp(120, 380, depth);
    const x0 = hash(i, 6) * (W + 600) - 300;
    let x = x0 + dir * sp * (t - appear);
    x = ((x + 400) % (W + 800) + W + 800) % (W + 800) - 400;
    const a = sm(appear - 0.3, appear, t) * (1 - sm(gone, gone + 0.25, t));
    if (a <= 0.01) continue;
    people.push({ i, x, y, hh, dir, sp, a, depth });
  }
  people.sort((p, q) => p.depth - q.depth);
  const drawP = (p, ghostOnly) => {
    const wp = walkPose(p.x * 0.02 / Math.max(0.3, p.hh / 300), 1);
    const col = rgba(mix(D.g, [8, 8, 16], 0.75), 1);
    for (let g = 3; g >= (ghostOnly ? 1 : 0); g--) {
      person(ctx, { who: hash(p.i, 7) < 0.5 ? 'him' : 'her', scarf: false, view: 'side', dir: p.dir, x: p.x - p.dir * g * p.sp * 0.03, y: p.y, h: p.hh, t, pose: wp, fill: col, alpha: p.a * (g ? 0.22 / g : 0.85) * (p.y > sy ? 0.55 : 1) });
    }
  };
  people.filter(p => p.y <= sy).forEach(p => drawP(p));
  person(ctx, { view: 'back', x: sx, y: sy, h: sh, t, wind: 0.5, pose: { tilt: 0.1 }, rim: { col: rgba(mix(D.s[2], [255, 240, 220], 0.5), 1), a: 0.6, dx: 0, dy: -2 } });
  people.filter(p => p.y > sy).forEach(p => drawP(p));
}
function parting(ctx, t, s) {
  skyGrad(ctx, 0, 620, [[0, '#04061a'], [0.6, '#121844'], [1, '#33244e']]);
  ctx.drawImage(starsCanvas('stars_rb', 420, 11, 520, false), 0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; halo(ctx, 'cold', 380, 200, 200, 0.5); glow(ctx, 'white', 380, 200, 60, 0.8); ctx.restore();
  ctx.fillStyle = '#e8ecff'; ctx.beginPath(); ctx.arc(380, 200, 36, 0, TAU); ctx.fill();
  const list = FWL.part; skyLight(ctx, list, t, 0.8); drawFWList(ctx, list, t);
  ctx.drawImage(cityCanvas('city_far', { seed: 5, base: RB.horizon, hMin: 30, hMax: 120, wMin: 40, wMax: 100, col: '#1a1838', win: 0.12, wx: 8, wy: 10 }), 0, 620 - RB.horizon, W, H);
  skyGrad(ctx, 620, 820, [[0, '#121030'], [1, '#06050f']]);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; reflectFW(ctx, list, t, 620, 0.8); ctx.restore();
  ctx.fillStyle = '#05040b'; ctx.fillRect(0, 818, W, H);
  // 你：转身、走远
  const turn = sm(T.L8, T.L8 + 0.4, t), go = Math.max(0, t - T.bar15);
  const dist = go * 160 + go * go * 30, sc = 1 / (1 + go * 0.32);
  const hx = 1080 + dist, hh = 440 * sc, hy = 830 - (1 - sc) * 30;
  const dir = turn < 0.5 ? -1 : 1, squash = Math.abs(1 - 2 * turn) * 0.85 + 0.15;
  ctx.save(); ctx.translate(hx, 0); ctx.scale(squash, 1); ctx.translate(-hx, 0);
  person(ctx, { who: 'him', view: 'side', dir, x: hx, y: hy, h: hh, t, pose: go > 0 ? walkPose(stepPhase(t, 1), 0.8) : { head: 0.12 }, rim: { col: '#9fb5ff', a: 0.55, dx: -2, dy: -2 } });
  ctx.restore();
  // 她：站着，头慢慢低下
  const low = sm(T.L8 + 0.3, T.bar15 + 0.4, t);
  person(ctx, { view: 'side', dir: 1, x: 760, y: 830, h: 400, t, wind: 0.4, pose: { head: 0.05 + 0.25 * low, sF: 0.05, eF: 0.4, sB: 0.1, eB: 0.4 }, rim: { col: '#9fb5ff', a: 0.55, dx: 2, dy: -2 } });
  // 只有「……」的对话框：唱到「不用说」冒出来，唱到「说」碎成火星
  const pop = sm(T.L8_buyong - 0.02, T.L8_buyong + 0.18, t), dis = sm(T.L8_shuo, T.L8_shuo + 0.7, t);
  if (pop > 0.01 && dis < 1) {
    const bx = hx + 30 * sc, by = hy - hh * 1.18 - 40, bs = eBack(pop, 2) * sc * (1 - dis * 0.2);
    ctx.save(); ctx.globalAlpha = 1 - dis; ctx.translate(bx, by); ctx.scale(bs, bs);
    ctx.fillStyle = 'rgba(245,242,255,0.92)'; ctx.strokeStyle = 'rgba(30,26,60,0.9)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(-150, -80, 300, 140, 60); ctx.moveTo(-30, 58); ctx.lineTo(-60, 120); ctx.lineTo(10, 58); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a3460'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-75 + i * 30, -8, 8, 0, TAU); ctx.fill(); }
    ctx.restore();
    if (dis > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 60; i++) { const a = hash(i, 1) * TAU, d = dis * (80 + hash(i, 2) * 200); glow(ctx, i % 2 ? 'gold' : 'white', bx + Math.cos(a) * (120 * hash(i, 3)) + Math.cos(a) * d, by + Math.sin(a) * 60 * hash(i, 4) - dis * 140 * hash(i, 5), 6, (1 - dis) * 0.9); }
      ctx.restore();
    }
  }
  ctx.save(); ctx.globalAlpha = 0.8; M.particles(ctx, 'snow', { n: 60, size: 2.2, speed: 0.4, alpha: 0.55, seed: 15, t }); ctx.restore();
}
function profileShot(ctx, t, s) {
  const nod = s.params.mode === 'nod';
  skyGrad(ctx, 0, H, nod ? [[0, '#03051a'], [1, '#0b1030']] : [[0, '#050720'], [0.7, '#1a1a48'], [1, '#2e2050']]);
  ctx.save(); ctx.globalAlpha = nod ? 0.7 : 0.9; const dx = (t - s.t0) * -10; ctx.drawImage(bokeh(nod ? 'bk_cool' : 'bk_warm', nod ? 61 : 63, !nod), dx, 0, W, H); ctx.restore();
  if (!nod) {
    const list = FWL.look; const L = lightOf(list, t);
    skyLight(ctx, list, t, 0.8); drawFWList(ctx, list, t);
    const bub = sm(T.L1_xiao - 0.02, T.L1_xiao + 0.45, t);
    if (bub > 0.01) {   // 烟火的光圈里浮出回忆
      const R = 250 * eOut(bub), cx = 1280, cy = 420;
      const ly = M.layer('memL'); const g = ly.getContext('2d'); g.setTransform(M.SC, 0, 0, M.SC, 0, 0); g.clearRect(0, 0, W, H);
      memoryScene(g, t, { t0: T.L1_xiao });
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip(); ctx.globalAlpha = bub;
      ctx.drawImage(ly, cx - R * 1.9, cy - R * 1.07, R * 3.8, R * 2.14); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,210,150,0.8)'; ctx.globalAlpha = bub; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      halo(ctx, 'gold', cx, cy, R * 1.5, 0.35 * bub);
      for (let i = 0; i < 40; i++) { const a = i / 40 * TAU + t * 0.6, rr = R + 10 + 30 * hash(i, 3) + 20 * Math.sin(t * 4 + i); glow(ctx, 'gold', cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 7, 0.7 * bub); }
      ctx.restore();
    }
    faceProfile(ctx, 520, 690, 1.35, { tilt: -0.36, t, rim: { col: rgba(mix(L.c, [255, 235, 210], 0.35), 1), a: 0.35 + 0.65 * Math.min(1, L.a), dx: 6, dy: -4 } });
  } else {
    const list = FWL.nod; skyLight(ctx, list, t, 0.5); drawFWList(ctx, list, t, 0.7);
    const n1 = sm(T.L8_dou - 0.15, T.L8_dou + 0.2, t), n2 = sm(T.L8_dong, T.L8_dong + 0.5, t);
    const tilt = -0.05 + 0.22 * n1 - 0.08 * n2;
    const tear = { k: sm(T.L8_dong - 0.3, T.L8_dong + 0.9, t), a: sm(T.L8_wo - 0.1, T.L8_wo + 0.3, t) * (1 - sm(T.L9 - 0.2, T.L9, t) * 0.3) };
    faceProfile(ctx, 560, 700, 1.38, { tilt, t, tear, rim: { col: '#a9c0ff', a: 0.75, dx: 6, dy: -4 } });
  }
}

// ============================================================ 眼睛：满天烟火和她，都映在你的眼睛里
const EYE = { cx: 960, cy: 520, ix: 980, iy: 500, ir: 230, pr: 92 };
function irisCanvas() {
  return M.cached('iris', 520, 520, (g) => {
    const c = 260, R = EYE.ir;
    const gr = g.createRadialGradient(c, c, EYE.pr * 0.8, c, c, R);
    gr.addColorStop(0, '#2a160c'); gr.addColorStop(0.35, '#4a2a16'); gr.addColorStop(0.75, '#2c180c'); gr.addColorStop(0.93, '#140a06'); gr.addColorStop(1, '#050303');
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
    const r = M.rng(5);
    for (let i = 0; i < 420; i++) {
      const a = r() * TAU, r0 = EYE.pr + r() * 20, r1 = R * (0.75 + r() * 0.22);
      g.strokeStyle = r() < 0.5 ? `rgba(170,110,60,${0.08 + r() * 0.18})` : `rgba(20,10,6,${0.15 + r() * 0.25})`; g.lineWidth = 0.8 + r() * 1.6;
      g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.quadraticCurveTo(c + Math.cos(a + 0.08) * (r0 + r1) / 2, c + Math.sin(a + 0.08) * (r0 + r1) / 2, c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke();
    }
  });
}
function lidPath(ctx, c) {   // c = 闭眼程度 0..1
  const { cx, cy } = EYE, ew = 560;
  const up = lerp(-262, 194, c), up2 = lerp(-270, 194, c);
  ctx.moveTo(cx - ew, cy + 14);
  ctx.bezierCurveTo(cx - ew * 0.55, cy + up, cx + ew * 0.42, cy + up2, cx + ew, cy - 18);
}
function eyeShot(ctx, t, s) {
  const { cx, cy, ix, iy, ir, pr } = EYE;
  const list = FWL.fin, L = lightOf(list, t);
  const Z0 = lerp(5.3, 4.6, sm(T.bar18, T.bar19, t));
  const Z = lerp(Z0, 1.0, eExpo((t - T.bar19 + 0.02) / 0.75)) * (1 + 0.05 * sm(T.bar19 + 0.8, T.bar20 + 1, t));
  const close = eIO((t - T.bar20 - 0.25) / 1.15);
  // 倒影（镜像）画到一张离屏图上
  const ly = M.layer('eyeIn'); const g = ly.getContext('2d'); g.setTransform(M.SC, 0, 0, M.SC, 0, 0); g.clearRect(0, 0, W, H);
  g.save(); g.translate(W, 0); g.scale(-1, 1); riverbank(g, t, { list, mode: 'finale', inEye: true }); g.restore();
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(Z, Z); ctx.translate(-ix, -iy);
  const lc = rgba(mix(L.c, [255, 200, 160], 0.5), 1);
  const sk = ctx.createRadialGradient(cx, cy, 200, cx, cy, 1100); sk.addColorStop(0, '#2a1822'); sk.addColorStop(0.5, '#140c14'); sk.addColorStop(1, '#060407');
  ctx.fillStyle = sk; ctx.fillRect(cx - 1400, cy - 900, 2800, 1800);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.12 + 0.2 * Math.min(1, L.a); ctx.fillStyle = lc;
  const sg = ctx.createRadialGradient(cx + 200, cy - 250, 50, cx + 200, cy - 250, 900); sg.addColorStop(0, lc); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(cx - 1400, cy - 900, 2800, 1800); ctx.restore();
  // 眉毛
  ctx.save(); ctx.strokeStyle = 'rgba(8,5,8,0.95)'; ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) { const q = i / 69, x = lerp(cx - 560, cx + 600, q), y = cy - 360 - Math.sin(q * Math.PI) * 90 + q * 30; ctx.lineWidth = 10 - q * 5; ctx.beginPath(); ctx.moveTo(x, y + 18); ctx.lineTo(x + 34, y - 6 + hash(i, 3) * 10); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(5,3,6,0.7)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - 520, cy - 90); ctx.bezierCurveTo(cx - 300, cy - 330, cx + 320, cy - 340, cx + 560, cy - 110); ctx.stroke();
  // 眼球
  ctx.save(); ctx.beginPath(); lidPath(ctx, 0); ctx.bezierCurveTo(cx + 280, cy + 190, cx - 280, cy + 190, cx - 560, cy + 14); ctx.closePath(); ctx.clip();
  const sc = ctx.createRadialGradient(ix, iy + 60, 50, ix, iy, 640); sc.addColorStop(0, '#d9d3e6'); sc.addColorStop(0.55, '#a29ab8'); sc.addColorStop(1, '#3a3450');
  ctx.fillStyle = sc; ctx.fillRect(cx - 600, cy - 300, 1200, 600);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.35; ctx.fillStyle = lc; ctx.fillRect(cx - 600, cy - 300, 1200, 600); ctx.restore();
  ctx.drawImage(irisCanvas(), ix - 260, iy - 260, 520, 520);
  ctx.fillStyle = '#020102'; ctx.beginPath(); ctx.arc(ix, iy, pr, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.clip(); ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(ly, ix - 200, iy - 112.5, 400, 225); ctx.restore();
  const shd = ctx.createLinearGradient(0, cy - 270, 0, cy - 60); shd.addColorStop(0, 'rgba(0,0,0,0.75)'); shd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shd; ctx.fillRect(cx - 600, cy - 300, 1200, 260);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.75 * sm(3.2, 1.6, Z); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(ix - 95, iy - 100, 34, 22, -0.5, 0, TAU); ctx.fill();
  ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(ix + 70, iy + 80, 9, 0, TAU); ctx.fill();
  ctx.restore();
  if (close > 0) {   // 眼皮慢慢合上
    ctx.fillStyle = '#120a10'; ctx.beginPath(); ctx.moveTo(cx - 700, cy - 400); ctx.lineTo(cx + 700, cy - 400); ctx.lineTo(cx + 700, cy - 18); ctx.lineTo(cx + 560, cy - 18);
    const ew = 560, up = lerp(-262, 194, close), up2 = lerp(-270, 194, close);
    ctx.bezierCurveTo(cx + ew * 0.42, cy + up2, cx - ew * 0.55, cy + up, cx - ew, cy + 14); ctx.lineTo(cx - 700, cy + 14); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // 睫毛（沿着眼皮的边）
  ctx.strokeStyle = '#040203'; ctx.lineCap = 'round';
  const bz = (p0, p1, p2, p3, q) => { const a = 1 - q; return a * a * a * p0 + 3 * a * a * q * p1 + 3 * a * q * q * p2 + q * q * q * p3; };
  const ew = 560, up = lerp(-262, 194, close), up2 = lerp(-270, 194, close);
  ctx.lineWidth = 7; ctx.beginPath(); lidPath(ctx, close); ctx.stroke();
  for (let i = 0; i < 46; i++) {
    const q = 0.04 + 0.92 * i / 45;
    const x = bz(cx - ew, cx - ew * 0.55, cx + ew * 0.42, cx + ew, q), y = bz(cy + 14, cy + up, cy + up2, cy - 18, q);
    const len = (40 + 50 * Math.sin(q * Math.PI)) * (1 - close * 0.3), dir = lerp(-1.0, 0.6, q) - (Math.PI / 2) * (1 - close * 0.5);
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(dir) * len * 0.6, y + Math.sin(dir) * len * 0.6, x + Math.cos(dir + 0.35) * len, y + Math.sin(dir + 0.35) * len); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(30,18,24,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx + 560, cy - 18); ctx.bezierCurveTo(cx + 280, cy + 190, cx - 280, cy + 190, cx - 560, cy + 14); ctx.stroke();
  ctx.restore();
  // 片尾一颗小火星 + 歌名
  const endK = sm(T.end - 1.4, T.end - 0.5, t);
  if (endK > 0) { ctx.save(); ctx.fillStyle = `rgba(2,1,4,${endK * 0.92})`; ctx.fillRect(-50, -50, W + 100, H + 100); ctx.restore(); }
}

// ============================================================ 场景登记
MV.scene({
  bg: '#04050d',
  setup(m) {
    M = m;
    const R = (r) => M.ref(r);
    const L = (n) => M.lineN(n), wd = (n, w) => M.word(n, w);
    Object.assign(T, {
      bar5: R('bar5'), bar8: R('bar8'), bar10: R('bar10'), bar11: R('bar11'), bar12: R('bar12'), bar13: R('bar13'), bar14: R('bar14'), bar15: R('bar15'), bar16: R('bar16'),
      bar17: R('bar17'), bar18: R('bar18'), bar19: R('bar19'), bar20: R('bar20'), end: M.song.dur,
      L1_xiang: wd(1, '想起'), L1_xiao: wd(1, '笑容'), L2_yao: wd(2, '遥远'), L3_hai: wd(3, '海洋'), L3_kan: wd(3, '看你'),
      L4: L(4).t0, L4_hei: wd(4, '黑夜'), L5_xiang: wd(5, '想'), L5_ni: wd(5, '你'), L6_bu: wd(6, '□□'), L6_huang: wd(6, '□□'),
      L7: L(7).t0, L7_ren: wd(7, '人'), L7_zou: wd(7, '又走') + 0.05, L8: L(8).t0, L8_buyong: wd(8, '不用说'), L8_shuo: wd(8, '□'),
      L8_wo: wd(8, '□□□'), L8_dou: wd(8, '都'), L8_dong: wd(8, '懂'), L9: L(9).t0,
    });
    const B = M.song.beats;
    const beatAt = (i) => B[Math.min(B.length - 1, i)];
    // 开头：江对岸第一朵、第二朵……
    FWL.open = [
      { at: 'bar1', x: 520, y: 300, r: 95, col: 'rose', rise: 1.0 },
      { at: 'bar1+2b', x: 860, y: 250, r: 70, col: 'cyan', rise: 0.8 },
      { at: 'bar2', x: 980, y: 200, r: 210, col: 'gold', kind: 'willow', rise: 1.0, n: 120 },
      { at: 'bar2+2b', x: 600, y: 270, r: 120, col: 'violet', kind: 'ring', rise: 0.8 },
      { at: 'bar2+3b', x: 1200, y: 300, r: 85, col: 'rose', rise: 0.7 },
    ].map(mkFW);
    FWL.look = [
      { at: 'bar3', x: 1650, y: 220, r: 100, col: 'cyan', rise: 0.6 },
      { at: T.L1_xiao, x: 1280, y: 420, r: 330, col: 'gold', rise: 0.7, n: 150, life: 2.4 },
      { at: 'bar3+2b', x: 1760, y: 160, r: 90, col: 'rose', rise: 0.6 },
      { at: 'bar3+3b', x: 900, y: 150, r: 110, col: 'violet', rise: 0.6 },
    ].map(mkFW);
    FWL.mem = [
      { at: 'bar4', x: 960, y: 230, r: 280, col: 'gold', kind: 'willow', rise: 0.5, n: 120 },
      { at: 'bar4+1b', x: 560, y: 300, r: 160, col: 'amber', rise: 0.5 },
      { at: 'bar4+2b', x: 1380, y: 260, r: 190, col: 'gold', rise: 0.5 },
      { at: 'bar4+3b', x: 760, y: 180, r: 150, col: 'warm', rise: 0.5 },
    ].map(mkFW);
    const road = [];
    [[250, 470, 150, 'rose'], [640, 430, 170, 'gold'], [1010, 450, 140, 'cyan'], [1380, 420, 180, 'violet'], [1720, 480, 130, 'gold']].forEach(([x, y, r, c], i) =>
      road.push({ at: 'bar5', x, y, r, col: c, rise: 0.6, kind: i === 1 ? 'willow' : i === 3 ? 'ring' : 'peony' }));
    ['bar5+1b', 'bar5+2b', 'bar5+3b'].forEach((a, i) => road.push({ at: a, x: [420, 1200, 1560][i], y: [420, 380, 450][i], r: 110, col: ['amber', 'rose', 'cyan'][i], rise: 0.6 }));
    FWL.road = road.map(mkFW);
    FWL.far = ['line2@遥远', 'bar6', 'bar6+1b', 'line2@路', 'bar6+2b', 'bar6+3b', 'bar7'].map((a, i) => mkFW({ at: a, x: 1150 + (hash(i, 1) - 0.5) * 220, y: 330 + hash(i, 2) * 70, r: 50 + hash(i, 3) * 30, col: ['gold', 'rose', 'cyan', 'violet', 'gold', 'amber'][i], rise: 0.5, y0: 430 }));
    FWL.sea = ['line3', 'bar7', 'bar7+1b', 'bar7+2b', 'bar7+3b', 'bar8'].map((a, i) => mkFW({ at: a, x: 180 + hash(i, 5) * 520, y: 430 + hash(i, 6) * 50, r: 26 + hash(i, 7) * 22, col: ['gold', 'rose', 'cyan', 'violet', 'gold', 'amber'][i], rise: 0.4, y0: 530 }));
    FWL.him = [
      { at: 'bar8', x: 860, y: 260, r: 210, col: 'rose', rise: 0.6, y0: 690 },
      { at: T.L3_kan, x: 1240, y: 210, r: 170, col: 'gold', kind: 'willow', rise: 0.5, y0: 690 },
      { at: 'bar8+1b', x: 1600, y: 300, r: 130, col: 'cyan', rise: 0.5, y0: 690 },
      { at: 'bar8+2b', x: 560, y: 220, r: 120, col: 'violet', kind: 'ring', rise: 0.5, y0: 690 },
    ].map(mkFW);
    FWL.time = ['bar13', 'bar13+2b', 'bar14', 'bar14+2b'].map((a, i) => mkFW({ at: a, x: 300 + i * 420, y: 380 + hash(i, 3) * 60, r: 60 + 20 * hash(i, 4), col: ['gold', 'rose', 'cyan', 'violet'][i], rise: 0.5, y0: 560 }));
    FWL.part = [
      { at: 'line8-0.3s', x: 1500, y: 300, r: 120, col: 'cyan', rise: 0.5, y0: 620 },
      { at: 'bar15', x: 1300, y: 230, r: 240, col: 'gold', kind: 'willow', rise: 0.6, y0: 620, life: 3.4 },
      { at: 'bar16', x: 1650, y: 330, r: 80, col: 'rose', rise: 0.5, y0: 620 },
    ].map(mkFW);
    FWL.nod = [{ at: 'bar16', x: 1500, y: 260, r: 160, col: 'gold', kind: 'willow', rise: 0.4, life: 2.6 }].map(mkFW);
    // 满天烟火：感谢 → 炸满天 → 眼睛里的倒影一直放到最后
    const fin = [{ at: 'line9', x: 760, y: 280, r: 120, col: 'gold', rise: 0.5 }, { at: 'line9@你', x: 1150, y: 240, r: 90, col: 'rose', rise: 0.5 }];
    const big = [[240, 260, 230, 'rose'], [560, 150, 260, 'gold', 'willow'], [900, 300, 220, 'cyan'], [1220, 170, 280, 'violet', 'ring'], [1500, 260, 200, 'amber'], [380, 420, 160, 'mint'], [1080, 450, 150, 'gold']];
    big.forEach(([x, y, r, c, k]) => fin.push({ at: 'bar17', x, y, r, col: c, kind: k || 'peony', rise: 0.75, n: Math.round(70 + r * 0.35) }));
    const more = ['line9@让', 'bar17+1b', 'line9@我', 'bar17+2b', 'bar17+3b', 'bar17+3.5b', 'bar18', 'line10@留', 'bar18+1b', 'line10@你', 'bar18+2b', 'bar18+3b',
      'bar19', 'bar19+0.5b', 'line10@中', 'bar19+2b', 'bar19+3b', 'bar20', 'bar20+1b'];
    more.forEach((a, i) => {
      const bigOne = a === 'bar19' || a === 'bar20';
      fin.push({ at: a, x: 180 + hash(i, 21) * 1300, y: 140 + hash(i, 22) * 300, r: bigOne ? 300 : 110 + hash(i, 23) * 130, col: ['gold', 'rose', 'cyan', 'violet', 'amber', 'mint', 'red'][i % 7],
        kind: bigOne ? 'willow' : (i % 4 === 3 ? 'ring' : 'peony'), rise: 0.6, n: bigOne ? 150 : undefined, life: bigOne ? 3.2 : undefined });
      if (a === 'bar19') { fin.push({ at: a, x: 420, y: 230, r: 220, col: 'rose', rise: 0.6 }); fin.push({ at: a, x: 1260, y: 210, r: 240, col: 'cyan', rise: 0.6 }); }
    });
    FWL.fin = fin.map(mkFW);
    void beatAt;
  },
  shots: {
    riverbank(ctx, s) {
      const mode = s.params.mode || 'open';
      riverbank(ctx, s.t, { list: mode === 'open' ? FWL.open : FWL.fin, mode });
    },
    profile(ctx, s) { profileShot(ctx, s.t, s); },
    memory(ctx, s) {
      const t = s.t, burn = sm(s.t0 + 1.0, s.t1 + 0.05, t);
      if (burn <= 0) { memoryScene(ctx, t, { t0: s.t0 }); return; }
      const ly = M.layer('memB'); const g = ly.getContext('2d'); g.setTransform(M.SC, 0, 0, M.SC, 0, 0); g.clearRect(0, 0, W, H);
      memoryScene(g, t, { t0: s.t0 });
      const R = lerp(1250, 40, eIO(burn));
      g.globalCompositeOperation = 'destination-in';
      const gr = g.createRadialGradient(965, 560, Math.max(0, R - 120), 965, 560, R + 40); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#030206'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(ly, 0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 160; i++) {   // 烧着的边，火星往外飞
        const a = i / 160 * TAU + hash(i, 1) * 0.05, fly = ((t * 1.8 + hash(i, 2)) % 1);
        const rr = R - 20 + fly * 160 * hash(i, 3);
        glow(ctx, hash(i, 4) < 0.5 ? 'amber' : 'gold', 965 + Math.cos(a) * rr, 560 + Math.sin(a) * rr * 0.9 - fly * 40, 6 + 6 * hash(i, 5), (1 - fly) * 0.9);
      }
      ctx.restore();
    },
    road(ctx, s) { if (s.params.mode === 'far') roadFar(ctx, s.t, s); else roadWalk(ctx, s.t, s); },
    sea(ctx, s) { sea(ctx, s.t, s); },
    shore_him(ctx, s) { shoreHim(ctx, s.t, s); },
    forest(ctx, s) { forest(ctx, s.t, s); },
    sparkler(ctx, s) { sparkler(ctx, s.t, s); },
    timeflow(ctx, s) { timeflow(ctx, s.t, s); },
    shore_time(ctx, s) { shoreTime(ctx, s.t, s); },
    parting(ctx, s) { parting(ctx, s.t, s); },
    eye(ctx, s) { eyeShot(ctx, s.t, s); },
  },
  lyricDefault: { font: 'LXGWWenKai', fill: '#fff7ea', stroke: 'rgba(8,6,24,0.92)' },
  camera(cam, m) {   // 手持的轻微呼吸感
    const t = m.t;
    cam.x += noise(t * 0.35, 1) * 7; cam.y += noise(t * 0.3, 9) * 5; cam.rot += noise(t * 0.25, 17) * 0.002;
  },
  overlay(ctx, m) {
    const t = m.t, k = sm(T.end - 1.15, T.end - 0.45, t);
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k;
    m.text(ctx, '寂寞烟火', W / 2, H / 2 - 20, { size: 104, font: 'LXGWWenKai', fill: '#ffe9c8', stroke: null, glow: 'rgba(255,180,100,0.6)', spacing: 0.25 });
    m.text(ctx, '蓝心羽', W / 2, H / 2 + 80, { size: 40, font: 'LXGWWenKai', fill: 'rgba(255,233,200,0.75)', stroke: null, spacing: 0.4 });
    ctx.restore();
  },
});
})();
