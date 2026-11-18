"use strict";

const W = 1920, H = 1080, TAU = Math.PI * 2;
const stage = document.querySelector("#film");
const ctx = stage.getContext("2d", { alpha: false });
const { audio, cues } = window.filmTiming;
const serif = '"Noto Serif SC", "Songti SC", SimSun, serif';
const sans = '"Noto Sans SC", "Microsoft YaHei", sans-serif';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, p) => a + (b - a) * p;
const ease = (a, b, x) => {
  const p = clamp((x - a) / (b - a));
  return p * p * (3 - 2 * p);
};
const fract = x => x - Math.floor(x);
const hash = x => fract(Math.sin(x * 127.1 + 19.19) * 43758.5453123);
const rgba = (c, a) => `rgba(${c.join(",")},${clamp(a)})`;
const gold = [255, 183, 109], coral = [250, 116, 113], aqua = [144, 211, 215];
const ivory = [252, 229, 190], plum = [190, 151, 214];
const path = d => new Path2D(d);

function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}

function plate(w, h, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d"), w, h);
  return canvas;
}

function linear(g, x0, y0, x1, y1, stops) {
  const gradient = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([p, color]) => gradient.addColorStop(p, color));
  return gradient;
}

function poly(g, points, color) {
  g.beginPath();
  g.moveTo(...points[0]);
  points.slice(1).forEach(p => g.lineTo(...p));
  g.closePath();
  g.fillStyle = color;
  g.fill();
}

function line(g, x, y, xx, yy, color, width = 1) {
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(xx, yy);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.stroke();
}

function oval(g, x, y, a, b, color) {
  g.beginPath();
  g.ellipse(x, y, a, b, 0, 0, TAU);
  g.fillStyle = color;
  g.fill();
}

const glows = new Map();
function glow(g, x, y, rx, ry, color, alpha = 1) {
  if (alpha <= 0 || rx <= 0 || ry <= 0) return;
  const key = color.join(",");
  if (!glows.has(key)) {
    glows.set(key, plate(192, 192, (p, w) => {
      const r = w / 2, gradient = p.createRadialGradient(r, r, 0, r, r, r);
      [[0, .82], [.10, .51], [.28, .25], [.54, .083], [.76, .025], [1, 0]]
        .forEach(([offset, a]) => gradient.addColorStop(offset, rgba(color, a)));
      p.fillStyle = gradient;
      p.fillRect(0, 0, w, w);
    }));
  }
  const old = g.globalAlpha;
  g.globalAlpha = old * clamp(alpha);
  g.drawImage(glows.get(key), x - rx, y - ry, rx * 2, ry * 2);
  g.globalAlpha = old;
}

const grain = Array.from({length: 4}, (_, i) => plate(480, 270, (g, w, h) => {
  const rng = random(i + 619), pixels = g.createImageData(w, h);
  for (let k = 0; k < pixels.data.length; k += 4) {
    const white = rng() > .49;
    pixels.data[k] = white ? 238 : 0;
    pixels.data[k + 1] = white ? 223 : 0;
    pixels.data[k + 2] = white ? 207 : 18;
    pixels.data[k + 3] = Math.floor(rng() ** 1.5 * (white ? 14 : 30));
  }
  g.putImageData(pixels, 0, 0);
}));

const stars = Array.from({length: 540}, (_, i) => ({
  x: hash(i * 8 + 1) * 2100 - 90, y: hash(i * 8 + 2) ** 1.5 * 625,
  size: .38 + hash(i * 8 + 3) ** 3 * 2.3, time: hash(i * 8 + 4) * TAU,
  bright: .12 + hash(i * 8 + 5) ** 2 * .55,
}));

const skies = [
  { top: "#101c37", low: "#593a4c", fog: [239, 130, 104], cool: [97, 136, 198], star: .42 },
  { top: "#101f42", low: "#885362", fog: [252, 149, 119], cool: [75, 122, 194], star: .79 },
  { top: "#10223a", low: "#426075", fog: [168, 147, 179], cool: [102, 146, 192], star: .85 },
  { top: "#201630", low: "#945063", fog: [254, 120, 102], cool: [131, 96, 177], star: .90 },
  { top: "#132342", low: "#3b566c", fog: [226, 154, 124], cool: [84, 144, 190], star: .72 },
];

function cloudPlate(palette, seed) {
  return plate(W, 670, (g, w, h) => {
    g.fillStyle = linear(g, 0, 0, 0, h, [[0, palette.top], [.73, palette.top], [1, palette.low]]);
    g.fillRect(0, 0, w, h);
    glow(g, 1520, 580, 1100, 570, palette.fog, .65);
    glow(g, 145, 440, 1100, 570, palette.cool, .48);
    const rng = random(seed + 9);
    for (let band = 0; band < 16; band++) {
      const x = rng() * w, y = 210 + rng() * 440, stretch = 80 + rng() * 435;
      const tint = band % 3 ? palette.cool : palette.fog;
      for (let j = 0; j < 31; j++) {
        const p = rng(), px = x + (p - .5) * stretch * 3;
        const py = y + Math.sin(p * 10 + band) * 17 + rng() * 30;
        glow(g, px, py, 50 + rng() * 167, 8 + rng() * 31, tint, .023 + rng() * .038);
      }
    }
  });
}

const skyPlates = skies.map((palette, i) => cloudPlate(palette, 60 + i * 17));

function sky(g, t, id, horizon, pan = 0, moon = null) {
  g.fillStyle = skies[id].low;
  g.fillRect(0, 0, W, H);
  g.drawImage(skyPlates[id], pan - 70, 0, W + 150, Math.max(horizon + 75, 560));
  g.fillStyle = "#fce2cd";
  for (const s of stars) {
    const y = s.y * horizon / 680;
    g.globalAlpha = s.bright * skies[id].star * (.77 + .23 * Math.sin(t * 1.47 + s.time));
    const x = s.x + pan * .6;
    g.fillRect(x, y, s.size * 1.1, s.size);
  }
  g.globalAlpha = 1;
  if (moon) {
    const [x, y, r] = moon;
    glow(g, x, y, r * 5.1, r * 4.7, ivory, .30);
    oval(g, x, y, r, r, "#eedcc6");
    g.save();
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.clip();
    const craters = random(731);
    for (let i = 0; i < 46; i++) {
      const dx = (craters() - .5) * r * 2, dy = (craters() - .5) * r * 2;
      glow(g, x + dx, y + dy, 2 + craters() * r * .4, 3 + craters() * r * .24, [123, 90, 108], .16);
    }
    glow(g, x - r * .38, y - r * .5, r, r, ivory, .83);
    g.restore();
  }
}

function ridge(seed, span, amplitude, base, tint) {
  const rng = random(seed);
  const a = rng() * TAU, b = rng() * TAU, c = rng() * TAU;
  const yAt = (x) => {
    const k = x / span;
    return base - amplitude * (.31 + .31 * Math.sin(k + a) + .13 * Math.sin(k * 2.12 + b)
      + .1 * Math.cos(k * 4.6 + c) + .034 * Math.sin(k * 13.5 + c));
  };
  return plate(2240, 760, (g, w, h) => {
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) g.lineTo(x, yAt(x));
    g.lineTo(w, h);
    g.closePath();
    g.fillStyle = linear(g, 0, base - amplitude, 0, base + 30, [[0, tint[0]], [1, tint[1]]]);
    g.fill();
    g.save();
    g.clip();
    for (let i = 0; i < 650; i++) {
      const x = rng() * w, y = yAt(x) + rng() ** 1.55 * amplitude;
      line(g, x, y, x + 2 + rng() * 39, y + 1 + rng() * 6, `rgba(201,167,202,${rng() * .14})`);
    }
    g.restore();
  });
}

const mountainPlates = [
  ridge(31, 270, 132, 641, ["#726179", "#5d576e"]),
  ridge(64, 350, 115, 658, ["#506078", "#34465f"]),
  ridge(71, 277, 95, 670, ["#3d4c67", "#25354f"]),
  ridge(18, 220, 60, 683, ["#3e3b55", "#222c43"]),
];

function mountains(g, h, t, pan = 0, height = 1) {
  mountainPlates.forEach((p, i) => {
    const x = -127 + pan * (i + 1) * .39;
    g.drawImage(p, x, h - (682 + 8 * i) * height, 2240, 760 * height);
    if (i < 3) glow(g, 480 + 290 * i + 18 * Math.sin(t / 5), h - 59 + i * 8,
      930, 35 + i * 16, i % 2 ? plum : aqua, .085);
  });
}

const windows = [];
function makeCity(seed) {
  return plate(2230, 198, (g, w, h) => {
    const rng = random(seed);
    for (let row = 0; row < 3; row++) {
      let x = -13;
      while (x < w) {
        const breadth = 9 + rng() * 39;
        const shape = rng(), height = 7 + rng() ** 2.5 * (row === 1 ? 114 : 72);
        const top = h - height - (2 - row) * 5;
        g.fillStyle = ["#515068", "#34384e", "#222d42"][row];
        g.fillRect(x, top, breadth, h - top);
        if (shape > .69) {
          g.fillRect(x + breadth * .19, top - 4 - rng() * 7, breadth * .59, 12);
          if (shape > .91) line(g, x + breadth * .53, top - 4, x + breadth * .53, top - 19, "#786172");
        } else if (shape > .52) {
          poly(g, [[x - 3, top + 2], [x + breadth * .46, top - 7], [x + breadth + 4, top + 2]], "#43425b");
        }
        for (let wy = top + 6; wy < h - 4; wy += 5 + rng() * 4) {
          for (let wx = x + 3; wx < x + breadth - 3; wx += 4.5 + rng() * 3) {
            if (rng() > .46) continue;
            g.fillStyle = rgba(rng() > .36 ? gold : aqua, .16 + rng() * .63);
            g.fillRect(wx, wy, rng() > .42 ? 2.6 : 1.3, 1.8);
            if (row === 2 && rng() > .70) windows.push([wx, wy, rng()]);
          }
        }
        x += breadth + rng() * 6;
      }
    }
    line(g, 0, h - 2, w, h - 2, "#816578", 2);
  });
}

const city = makeCity(815);

function shoreline(g, h, t, pan = 0, scale = 1, opacity = 1) {
  const left = -105 + pan;
  g.globalAlpha = opacity;
  g.drawImage(city, left, h - 198 * scale, 2230, 198 * scale);
  for (let i = 0; i < windows.length; i++) {
    const [x, y, a] = windows[i];
    const amp = (a + .2) * (.5 + .5 * Math.sin(1.8 * t + i * .9)) ** 4;
    if (amp < .22) continue;
    const yy = h - (198 - y) * scale, xx = x + left;
    glow(g, xx, yy, 11, 8, gold, .40 * amp);
    g.fillStyle = rgba(ivory, .73 * amp);
    g.fillRect(xx, yy, 2, 1.5);
  }
  g.globalAlpha = 1;
}

const waveSeeds = Array.from({length: 1150}, (_, i) => [
  hash(i * 6 + 91) * 2140 - 110, hash(i * 6 + 92), hash(i * 6 + 93),
  hash(i * 6 + 94), hash(i * 6 + 95)
]);

function sea(g, t, horizon, tone, lights = [], surf = 1) {
  const depth = H - horizon;
  const colors = [
    ["#524a61", "#182c47", "#0c172a"],
    ["#635266", "#29435a", "#111e32"],
    ["#516d80", "#214254", "#112437"],
    ["#715163", "#303552", "#15182d"],
    ["#4b6576", "#224355", "#0d1a2c"],
  ][tone];
  g.fillStyle = linear(g, 0, horizon, 0, H, [[0, colors[0]], [.33, colors[1]], [1, colors[2]]]);
  g.fillRect(0, horizon, W, depth);
  for (const l of lights) glow(g, l.x, horizon + depth * .29, l.w * 1.7, depth * .74, l.c, l.a * .50);
  const groups = Array.from({length: 8 + lights.length}, () => new Path2D());
  for (let i = 0; i < waveSeeds.length; i++) {
    const [x0, d, p, r, v] = waveSeeds[i];
    const power = d ** 1.8;
    const y = horizon + depth * power + Math.sin(t * (1.5 - d * .7) + p * TAU) * (2 + 8 * d) * surf;
    const x = x0 + Math.sin(t * .66 + p * 14) * (8 + 34 * d);
    const len = (2 + 100 * power) * (.18 + r ** 1.7);
    let group = (v > .48 ? 0 : 4) + Math.min(3, Math.floor(p * 4));
    let span = len;
    for (let j = 0; j < lights.length; j++) {
      const l = lights[j];
      const spread = l.w * (.38 + .89 * d);
      const delta = Math.abs(x - l.x - Math.sin(y * .08 + t) * d * 20) / spread;
      if (delta < 1 && r < (1 - delta) * l.a * 1.45) {
        group = 8 + j;
        span = len * 1.18 + 2;
        break;
      }
    }
    const stroke = groups[group];
    stroke.moveTo(x - span, y + d * 1.4);
    stroke.quadraticCurveTo(x - span * .13, y - (1 + d * 5) * surf, x + span, y);
  }
  groups.forEach((p, i) => {
    g.lineWidth = i > 7 ? 1.55 : .8 + (i % 4) * .27;
    g.strokeStyle = i > 7 ? rgba(lights[i - 8].c, lights[i - 8].a * .68)
      : i < 4 ? rgba([164, 191, 218], .075 + i * .025) : rgba([6, 14, 30], .17 + (i - 4) * .055);
    g.stroke(p);
  });
  line(g, 0, horizon + 1, W, horizon + 1, "rgba(245,182,166,.18)");
}

function lantern(g, x, y, size, t, power = 1) {
  glow(g, x, y, size * 7.5, size * 8, gold, .80 * power);
  glow(g, x, y, size * 2.8, size * 3.4, coral, .52 * power);
  g.save();
  g.translate(x, y);
  g.scale(size / 14, size / 14);
  g.rotate(.1 * Math.sin(t * 2.3));
  g.fillStyle = "#2b2031";
  g.fillRect(-11, -17, 22, 4);
  g.fillRect(-11, 15, 22, 4);
  g.fillStyle = linear(g, -11, 0, 11, 0, [[0, "#a64b48"], [.35, "#ffc987"], [.65, "#ffdb99"], [1, "#bf634e"]]);
  g.fill(path("M-10 -14 Q-16 0 -10 14 H10 Q16 0 10 -14Z"));
  for (const k of [-7, 0, 7]) {
    g.strokeStyle = "rgba(149,66,59,.48)";
    g.lineWidth = .85;
    g.stroke(path(`M${k} -14 Q${k * 1.28} 0 ${k} 15`));
  }
  line(g, 0, 18, 1 + Math.sin(t * 4) * 3, 26, "#c37562");
  g.restore();
}

function traveler(g, x, y, scale, t, walk, rim = .65, flip = 1) {
  g.save();
  g.translate(x, y);
  g.scale(scale * flip, scale);
  const cycle = t * TAU * 1.65, swing = Math.sin(cycle) * 19 * walk;
  g.translate(0, -walk * (1 + Math.cos(cycle * 2)) * 2);
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = "#131a2a";
  g.lineWidth = 15;
  g.stroke(path(`M-9 -68 Q${-13 + swing * .39} -38 ${-12 + swing} -7 l7 2 M13 -68 Q${17 - swing * .39} -38 ${13 - swing} -7 l8 1`));
  g.strokeStyle = "rgba(141,159,180,.48)";
  g.lineWidth = 2;
  g.stroke(path(`M19 -61 Q${22 - swing * .39} -38 ${20 - swing} -8`));
  const tail = Math.sin(t * 4.7) * 9;
  const coat = path(`M-4 -171 C17 -175 28 -155 27 -137 Q29 -104 39 -59 Q17 -49 -9 -52 L${-30 + tail * .4} -55 Q-22 -91 -23 -119 C-24 -146 -25 -157 -4 -171Z`);
  g.fillStyle = linear(g, -29, -102, 38, -94, [[0, "#1d283c"], [.55, "#323146"], [1, "#734958"]]);
  g.fill(coat);
  g.strokeStyle = rgba(gold, .54 * rim);
  g.lineWidth = 1.8;
  g.stroke(path("M-4 -170 C17 -175 28 -155 27 -137 Q29 -104 39 -59 Q27 -56 19 -55"));
  g.strokeStyle = "rgba(208,148,151,.34)";
  g.stroke(path("M-2 -156 Q10 -137 8 -101 L11 -61 M-13 -112 Q-7 -83 -13 -60 M26 -110 L28 -76"));
  g.fillStyle = "#252538";
  g.fill(path(`M18 -155 Q31 -149 29 -135 Q29 -114 ${24 - swing * .28} -96 L${15 - swing * .28} -97 Q17 -121 12 -137Z`));
  g.fillStyle = "#be827c";
  g.fill(path(`M${19 - swing * .28} -100 l7 2 -2 10 -6 -1 -2 -7z`));
  g.fillStyle = "#634650";
  g.fill(path("M-3 -194 L13 -196 L17 -169 Q6 -160 -8 -168Z"));
  g.fillStyle = linear(g, -30, -218, 26, -198, [[0, "#202333"], [.76, "#372838"], [1, "#b3766f"]]);
  g.fill(path("M-21 -194 C-34 -220 -13 -237 6 -234 C27 -231 29 -216 27 -205 L32 -194 L26 -190 Q25 -175 12 -178 L2 -183 C-8 -176 -16 -182 -21 -194Z"));
  g.fillStyle = "#161d2e";
  g.fill(path(`M-24 -186 C-39 -206 -25 -229 -11 -234 C9 -242 24 -230 25 -214 Q11 -223 6 -201 Q5 -186 -5 -179 Q${-26 + tail} -169 -31 -150 Q-44 -158 -34 -183Z`));
  g.strokeStyle = rgba(coral, .6 * rim);
  g.stroke(path(`M-29 -185 C-41 -210 -21 -239 1 -235 Q19 -234 25 -215 M-24 -182 Q${-36 + tail} -166 -34 -153`));
  g.fillStyle = "#a45456";
  g.fill(path(`M-13 -174 Q3 -160 18 -173 L19 -164 Q9 -155 -5 -160 Q-31 -141 ${-64 + tail} -153 L${-79 + tail} -164 Q-32 -154 -13 -174Z`));
  g.strokeStyle = rgba(gold, .7 * rim);
  g.stroke(path(`M-12 -171 Q-25 -157 ${-73 + tail} -161`));
  g.restore();
}

function dust(g, t, speed, color, amount, top = 0, bottom = H) {
  const pr = new Path2D();
  for (let i = 0; i < amount; i++) {
    const x = fract(hash(i * 7 + 443) + t * speed * (.002 + hash(i * 7 + 444) * .012)) * (W + 120) - 60;
    const y = top + fract(hash(i * 7 + 445) - t * speed * (.001 + hash(i * 7 + 446) * .008)) * (bottom - top);
    const radius = .65 + hash(i * 7 + 447) ** 3 * 2.8;
    if (Math.sin(t + i * 2.3) < -.64) continue;
    pr.moveTo(x + radius, y);
    pr.arc(x, y, radius, 0, TAU);
  }
  g.fillStyle = rgba(color, .36);
  g.fill(pr);
}

function title(g, opacity) {
  g.save();
  g.globalAlpha = opacity;
  g.fillStyle = "#f6e7d4";
  g.font = `600 87px ${serif}`;
  g.letterSpacing = "12px";
  g.textBaseline = "alphabetic";
  g.fillText("寂寞烟火", 154, 408);
  g.font = `400 24px ${sans}`;
  g.letterSpacing = "8px";
  g.fillStyle = "#ffd2ac";
  g.fillText("蓝心羽", 162, 478);
  g.letterSpacing = "0px";
  g.restore();
}

function room(g, t, sound) {
  const drift = ease(0, 7.5, t), luminance = .25 + sound.energy * .19;
  g.fillStyle = "#171b2b";
  g.fillRect(0, 0, W, H);
  glow(g, 1430, 555, 1250, 740, [93, 70, 108], .65);
  const left = 726 - 55 * drift, top = 91 - 30 * drift, right = 1735 + 65 * drift, bottom = 807 + 27 * drift;
  g.save();
  g.beginPath();
  g.rect(left, top, right - left, bottom - top);
  g.clip();
  sky(g, t, 0, 599, -22 * drift, [1487 - drift * 18, 281, 48]);
  mountains(g, 599, t, -26 * drift);
  shoreline(g, 597, t, -34 * drift, 1.37);
  sea(g, t, 599, 0, [
    {x: 1487 - drift * 18, w: 130, c: gold, a: .36},
    {x: 1050, w: 190, c: plum, a: .2},
  ], .62);
  for (let i = 0; i < 100; i++) {
    const dx = hash(i * 4 + 3), dy = hash(i * 4 + 4), length = 6 + hash(i * 4 + 5) ** 3 * 64;
    const x = left + dx * (right - left), y = top + fract(dy + t * (.018 + dx * .058)) * (bottom - top);
    line(g, x, y, x - 1.6, y + length, rgba([205, 199, 230], .05 + hash(i * 4 + 6) * .22), .7 + dx);
    if (length > 31) oval(g, x - 1.6, y + length, 1.6, 1.9, "rgba(217,195,219,.32)");
  }
  glow(g, 1175, 559, 460, 240, coral, luminance * ease(3, 6.5, t));
  g.restore();
  g.fillStyle = "#151925";
  g.fillRect(left - 15, top - 14, right - left + 28, 16);
  g.fillRect(left - 15, top, 14, bottom - top);
  g.fillRect(right - 3, top, 15, bottom - top);
  g.fillRect(left + (right - left) * .36, top, 18, bottom - top);
  g.fillRect(left, top + (bottom - top) * .69, right - left, 12);
  g.fillRect(left - 41, bottom, right - left + 82, 24);
  line(g, left - 42, bottom, right + 43, bottom, "#7f5664", 2);
  line(g, right + 15, top + 3, right + 15, bottom - 4, "#5e465d", 2);
  line(g, left + (right - left) * .36 + 17, top, left + (right - left) * .36 + 17, bottom, "#625068", 1.4);

  const sway = Math.sin(t * .8) * 17;
  const curtain = path(`M1608 -30 H1930 V936 Q1812 879 1661 923
    C1710 760 ${1727 + sway} 556 1682 385 Q1632 213 1608 -30Z`);
  g.fillStyle = linear(g, 1625, 0, W, 110, [[0, "#302539"], [.18, "#504057"], [.41, "#2f273b"],
    [.60, "#49374b"], [.76, "#282638"], [1, "#151d2e"]]);
  g.fill(curtain);
  g.save();
  g.clip(curtain);
  for (let i = 0; i < 12; i++) {
    g.strokeStyle = rgba(i % 2 ? [159, 104, 123] : [11, 16, 31], i % 2 ? .17 : .34);
    g.lineWidth = 1.2 + i % 3 * 2;
    const x = 1630 + i * 27;
    g.stroke(path(`M${x} -28 C${x + 24} 279 ${x + 123 + sway * .82} 566 ${x + 37} 955`));
  }
  g.restore();

  glow(g, 1350, 801, 247, 280, [193, 112, 114], .38);
  traveler(g, 1415 + 20 * drift, 952 + 43 * drift, 1.95 + .29 * drift, t, 0, .7, -1);
  poly(g, [[0, 850], [348, 812], [588, 839], [708, 961], [0, H]], "#181b2a");
  line(g, 0, 850, 348, 812, "#483a4c", 2);
  poly(g, [[386, 809], [470, 819], [551, 798], [470, 784]], "#79616d");
  poly(g, [[386, 809], [470, 819], [551, 798], [548, 806], [473, 830], [386, 819]], "#343244");
  line(g, 404, 812, 470, 822, "#a08080", 1.1);
  dust(g, t, .8, ivory, 35);
  title(g, ease(.04, .84, t) * (1 - ease(4.2, 5.55, t)));
}

function memory(g, t, sound) {
  const u = t - 4.5, camera = ease(-.2, 3.2, u);
  g.fillStyle = linear(g, 0, 770, 1650, 110, [[0, "#1b2133"], [.55, "#383247"], [1, "#594355"]]);
  g.fillRect(0, 0, W, H);
  glow(g, 1567, 348, 1190, 710, coral, .36);
  const scratch = new Path2D();
  for (let i = 0; i < 420; i++) {
    const x = -370 + hash(i * 7 + 626) * 2480, y = hash(i * 7 + 627) * 1230 - 75;
    const d = 8 + hash(i * 7 + 628) ** 2 * 183;
    scratch.moveTo(x, y);
    scratch.quadraticCurveTo(x + d * .62, y - d * .17, x + d, y - d * .26);
  }
  g.lineWidth = 1.1;
  g.strokeStyle = "rgba(174,139,146,.11)";
  g.stroke(scratch);
  for (let i = 0; i < 9; i++) {
    const y = 213 + 152 * i + 7 * Math.sin(i * 8.1);
    line(g, 0, y, W, y - 498, "rgba(23,27,45,.3)", 3.6);
    line(g, 0, y + 6, W, y - 492, "rgba(211,157,157,.12)", 1.3);
  }
  g.save();
  g.translate(543 - camera * 33, 655 + camera * 18);
  g.rotate(-.27 - camera * .046);
  const book = path("M-565 -189 Q-231 -272 -19 -144 Q162 -257 429 -161 L456 167 Q201 97 0 231 Q-246 128 -538 242Z");
  g.fillStyle = "#2c293d";
  g.fill(book);
  g.translate(0, -14);
  g.fillStyle = linear(g, -500, 0, 460, 0, [[0, "#8e7b82"], [.36, "#b19a91"], [.51, "#715d6e"],
    [.6, "#c6a495"], [1, "#a67f7d"]]);
  g.fill(book);
  g.save();
  g.clip(book);
  for (let i = 0; i < 17; i++) {
    const y = -132 + i * 19, end = hash(i + 55) * 68;
    g.strokeStyle = "rgba(68,55,74,.31)";
    g.lineWidth = 1.1;
    g.stroke(path(`M-507 ${y - 14} Q-265 ${y - 65} ${-72 - end} ${y + 26}
      M62 ${y + 13} Q246 ${y - 58} ${399 - end} ${y - 16}`));
  }
  g.restore();
  g.restore();
  g.save();
  g.translate(1128 - camera * 61, 524 + camera * 5);
  g.rotate(.115 - camera * .051);
  g.scale(.92 + camera * .184, .92 + camera * .184);
  glow(g, -6, 18, 610, 414, [12, 17, 35], .89);
  g.fillStyle = "#432f3c";
  g.fillRect(-357, -249, 725, 519);
  g.fillStyle = linear(g, -350, -220, 355, 256, [[0, "#e0c3b1"], [.51, "#cead9b"], [1, "#ac8180"]]);
  g.fillRect(-363, -263, 725, 519);
  g.save();
  g.beginPath();
  g.rect(-333, -233, 665, 415);
  g.clip();
  g.translate(-333, -233);
  g.scale(665 / W, 415 / H);
  sky(g, t, 3, 690, 0, [1490, 442, 53]);
  mountains(g, 690, t, 0, 1);
  sea(g, t, 690, 3, [{x: 974, w: 350, c: gold, a: .43}], .63);
  glow(g, 938, 375, 661, 481, coral, .47);
  fireworks(g, memoryShells, t, 690);
  poly(g, [[0, 903], [410, 855], [1132, 875], [1920, 990], [1920, 1080], [0, 1080]], "#342835");
  traveler(g, 894, 967, 1.86, t, 0, .83);
  traveler(g, 1041, 970, 1.71, t + .21, 0, .66, -1);
  g.restore();
  line(g, -332, 184, 332, 184, "rgba(104,65,77,.7)", 2);
  g.restore();
  glow(g, 1600, 150, 700, 424, gold, .17 + .09 * sound.pulse);
  dust(g, t, .52, ivory, 40);
}

function bridge(g, t, sound) {
  const u = t - 7.5, pan = 21 * Math.sin(u * .36) - 12;
  const horizon = 674 - u * 18;
  sky(g, t, 1, horizon, pan, [1528 - 15 * u, 261 - 6 * u, 67]);
  mountains(g, horizon, t, pan * 1.7, 1.3);
  shoreline(g, horizon, t, 38 + pan, .66);
  sea(g, t, horizon, 1, [
    {x: 1528 - 15 * u, w: 148, c: gold, a: .58},
    {x: 552, w: 330, c: plum, a: .20},
  ], 1.1);
  const curve = x => 773 - u * 22 - x * .092 - x * x * .000060;
  for (let x = -70; x < W + 110; x += 132) {
    const y = curve(x), depth = 33 - x * .009;
    poly(g, [[x - depth, y + 10], [x + depth, y + 7], [x + depth * .47, y + 165],
      [x - depth * .55, y + 172]], "#212c43");
    line(g, x + depth * .77, y + 12, x + depth * .47, y + 165, "#786071", 2);
    glow(g, x, y + 173, 68 - x * .017, 14, aqua, .21);
  }
  const track = new Path2D();
  track.moveTo(-100, curve(-100));
  for (let x = -97; x < W + 80; x += 8) track.lineTo(x, curve(x));
  for (const [width, color, offset] of [[45, "#20273d", 20], [18, "#414359", 6], [2, "#b89da0", -2]]) {
    g.save();
    g.translate(0, offset);
    g.lineWidth = width;
    g.strokeStyle = color;
    g.stroke(track);
    g.restore();
  }
  for (let x = -40; x < W + 32; x += 24) {
    const y = curve(x);
    line(g, x, y + 5, x + 18, y + 12, "rgba(177,151,163,.45)", 1.5);
  }

  const front = 260 + u * 328;
  for (let car = 7; car >= 0; car--) {
    const x = front - car * 129;
    if (x < -80 || x > W + 150) continue;
    const y = curve(x), s = 1.22 - x / 7000;
    g.save();
    g.translate(x, y - 8);
    g.rotate(Math.atan(-.092 - x * .00012));
    g.scale(s, s);
    g.fillStyle = linear(g, 0, -57, 0, 0, [[0, "#a597aa"], [.22, "#6a627d"], [.65, "#513f5a"], [1, "#282b42"]]);
    g.fill(path(car === 0
      ? "M-119 -7V-42Q-119 -53 -109 -54H-30Q-7 -54 6 -32L15 -12Q17 -6 7 -4Z"
      : "M-120 -7V-44Q-119 -54 -110 -54H-11Q0 -54 1 -43V-7Z"));
    for (let k = 0, n = car === 0 ? 5 : 6; k < n; k++) {
      const vx = -109 + k * 17;
      g.fillStyle = "#39344b";
      g.fillRect(vx - 1, -40, 14, 15);
      g.fillStyle = k === 1 && car === 2 ? "#8b7d91" : "#f5be92";
      g.fillRect(vx, -39, 12, 12);
      line(g, vx + 7, -39, vx + 7, -27, "#aa7776", 1);
      glow(g, vx + 5, -33, 19, 21, gold, .30);
    }
    line(g, -117, -17, car === 0 ? 9 : 0, -17, "#d38c81", 2.3);
    if (car === 0) {
      poly(g, [[-24, -43], [-13, -40], [0, -24], [-21, -24]], "#2b3146");
      glow(g, 9, -18, 167, 40, gold, .45 + .15 * sound.bass);
      oval(g, 9, -18, 4, 2, "#fff0c9");
    }
    g.restore();
  }
  glow(g, 500 + u * 90, horizon + 86, 670, 46, plum, .18);
  dust(g, t, 1.2, ivory, 40, 0, 770);
}

function paperBoat(g, x, y, scale, t, angle) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.scale(scale, scale);
  glow(g, 5, 31, 132, 45, [3, 13, 29], .80);
  g.fillStyle = "#111e31";
  g.fill(path("M-101 16Q-40 26 22 17L98 5 65 38-56 40Z"));
  poly(g, [[-105, -7], [-49, 10], [37, 12], [101, -9], [62, 27], [-63, 31]], "#ba7a6a");
  poly(g, [[-105, -7], [-55, 1], [2, -10], [101, -9], [13, 19], [-60, 18]], "#f1caa0");
  poly(g, [[-57, 9], [-5, -76], [57, 8], [4, 19]], "#d9a281");
  poly(g, [[-57, 9], [-5, -76], [1, 2], [4, 19]], "#f8dfb0");
  poly(g, [[4, 19], [101, -9], [62, 27], [-63, 31]], "#dc9b77");
  line(g, -105, -7, -60, 18, "#ffe6c1", 1);
  line(g, -55, 8, -5, -75, "#fff0c7", 1.5);
  line(g, 5, 18, 101, -9, "#ffe5b9", 1.5);
  line(g, -61, 27, 61, 23, "rgba(120,79,80,.54)", 1.4);
  g.restore();
}

function overhead(g, t, sound) {
  const u = t - 11.5, nx = 1100 - u * 68, ny = 541 + Math.sin(u * 1.17) * 34;
  const paint = linear(g, 0, 0, W, H, [[0, "#4f5a70"], [.41, "#2a4d63"], [.76, "#17354c"], [1, "#101f36"]]);
  g.fillStyle = paint;
  g.fillRect(0, 0, W, H);
  const stream = 250 + u * 57;
  glow(g, stream, 515, 740, 1130, [126, 175, 193], .48);
  glow(g, nx, ny, 300, 220, gold, .31);
  const p = Array.from({length: 9}, () => new Path2D());
  for (let i = 0; i < waveSeeds.length; i++) {
    const [x0, d, r, k, q] = waveSeeds[i];
    const y = d * H + Math.sin(t * .9 + k * 12) * 27;
    const x = x0 + t * 9 + Math.sin(t * .37 + y * .004) * 82 - 173;
    const width = 6 + 111 * k ** 3;
    const spi = stream + y * .53 + 99 * Math.sin(y / 220 + u * .38);
    const lit = Math.abs(x - spi) < 200 && q > .31;
    const index = lit ? 6 + Math.floor(r * 3) : Math.floor(r * 6);
    p[index].moveTo(x - width, y + width * .34);
    p[index].bezierCurveTo(x - width * .37, y - 17 * k, x + width * .47, y - 13 * k, x + width, y - width * .43);
  }
  p.forEach((s, i) => {
    g.strokeStyle = i > 5 ? rgba([206, 202, 228], .11 + (i - 6) * .072)
      : i > 2 ? rgba([148, 188, 211], .10 + (i - 3) * .04) : rgba([7, 18, 36], .14 + i * .09);
    g.lineWidth = i > 5 ? 1.9 : .9 + i % 3 * .55;
    g.stroke(s);
  });
  for (let j = 0; j < 20; j++) {
    const k = fract(j / 20 + u * .23), r = 25 + 414 * k;
    g.save();
    g.translate(nx + 64 * k, ny + 90 * k);
    g.rotate(-.36);
    g.beginPath();
    g.ellipse(0, 0, r, 25 + r * .38, 0, .08 + j * .01, 2.92);
    g.strokeStyle = rgba(j % 3 === 0 ? ivory : aqua, (.26 + .10 * sound.pulse) * (1 - k) ** 1.75);
    g.lineWidth = 1.1 + (1 - k) * 2.5;
    g.stroke();
    g.restore();
  }
  paperBoat(g, nx, ny + 7 * Math.sin(t * 2), .92 + .095 * u, t, -.22 + Math.sin(u * 1.38) * .16);
  dust(g, t, -2, aqua, 76);
}

function cliffs(g, height, t) {
  const edge = path(`M-10 ${height + 52} Q255 ${height - 29} 544 ${height - 12}
    Q682 ${height + 2} 843 ${height + 18} Q1032 ${height + 38} 1296 ${height + 86}
    L1930 ${height + 217} V1080 H-10Z`);
  g.fillStyle = linear(g, 0, height - 40, 0, H, [[0, "#2c3045"], [.38, "#1f293d"], [1, "#111b2a"]]);
  g.fill(edge);
  g.save();
  g.clip(edge);
  for (let i = 0; i < 205; i++) {
    const x = hash(i * 7 + 820) * 2140 - 120;
    const y = height - 22 + hash(i * 7 + 821) ** 1.25 * (H - height + 85);
    line(g, x, y, x + 1 + hash(i * 7 + 822) * 36, y + 2 + hash(i * 7 + 823) * 7,
      rgba(i % 3 ? [115, 121, 143] : [150, 106, 118], .035 + hash(i * 7 + 824) * .13), 1.1);
  }
  g.restore();
}

function grasses(g, y, t, color, seed, count = 80, x0 = 0, span = W) {
  const rng = random(seed), drawn = new Path2D();
  for (let i = 0; i < count; i++) {
    const x = x0 + rng() * span, height = 13 + rng() ** 2 * 150, offset = -15 + rng() * 50;
    const base = y + rng() * 84;
    const dx = offset + Math.sin(t * 2 + x * .01) * (height / 10);
    drawn.moveTo(x, base);
    drawn.quadraticCurveTo(x + dx * .32, base - height * .62, x + dx, base - height);
  }
  g.strokeStyle = color;
  g.lineWidth = 2.2;
  g.stroke(drawn);
}

function walk(g, t, sound) {
  const u = t - 15.5, pan = -17 * u, h = 615 - u * 8;
  const xMoon = 1330 - u * 19;
  sky(g, t, 2, h, pan, [xMoon, 366 - u * 9, 60]);
  mountains(g, h, t, pan, .92);
  shoreline(g, h, t, pan, .5, .81);
  sea(g, t, h, 2, [{x: xMoon, w: 154, c: ivory, a: .48},
    {x: 330, w: 110, c: coral, a: .23}], 1.12);
  const x = 460 - 41 * u, dy = 620 + 4 * u;
  g.fillStyle = "#313047";
  g.fillRect(x - 6, dy - 357, 13, 446);
  line(g, x + 7, dy - 357, x + 7, dy + 89, "#806070", 1.4);
  g.lineWidth = 7;
  g.strokeStyle = "#38364b";
  g.stroke(path(`M${x - 4} ${dy - 352} Q${x + 19} ${dy - 429} ${x + 88} ${dy - 405} q29 10 23 52`));
  lantern(g, x + 109, dy - 335, 19, t, .85 + .14 * sound.pulse);
  cliffs(g, 752, t);
  glow(g, x + 127, 757, 349, 122, gold, .53);
  const xTraveler = 685 + u * 104;
  oval(g, xTraveler + 38, 758 + u * 12, 107, 20, "rgba(11,17,31,.42)");
  traveler(g, xTraveler, 766 + u * 12, 1.32 + u * .046, t, .94 - ease(4.0, 5.0, u) * .68, .61);
  grasses(g, 1055, t, "#111a28", 74, 105, -50, 620);
  grasses(g, 1090, t, "#172435", 138, 109, 1328, 664);
  dust(g, t, 1.5, ivory, 53, 185, 926);
}

function shell(at, x, y, radius, color, style, seed) {
  const rng = random(seed), particles = [];
  const count = style === "willow" ? 158 : style === "peony" ? 178 : 106;
  for (let i = 0; i < count; i++) {
    const a = i * TAU / count + (rng() - .5) * .055;
    const v = (.67 + rng() * .48) * (style === "ring" ? .91 + .13 * rng() : 1);
    particles.push({
      x: Math.cos(a) * v, y: Math.sin(a) * v, a, spin: (rng() - .5) * .39,
      drag: 1.24 + rng() * .77, life: 1.27 + rng() ** .8 * 2.29,
      tail: .11 + rng() * .19, hot: rng(), flicker: rng() * TAU,
      ring: style === "peony" && rng() > .83 ? .52 : 1,
    });
  }
  return {at, x, y, radius, color, style, particles, seed};
}

const closeShells = [
  shell(21.02, .25, .41, 99, coral, "ring", 333),
  shell(22.50, .41, .279, 242, gold, "willow", 459),
  shell(22.72, .17, .295, 125, coral, "peony", 491),
  shell(23.26, .55, .41, 103, plum, "ring", 446),
  shell(24.04, .72, .23, 126, aqua, "ring", 796),
];
const memoryShells = [
  shell(4.56, .24, .29, 151, coral, "peony", 471),
  shell(5.07, .51, .27, 226, gold, "willow", 166),
  shell(5.58, .68, .41, 141, plum, "ring", 559),
];
const wideShells = [
  shell(24.50, .67, .28, 216, coral, "peony", 823),
  shell(25.03, .45, .21, 148, plum, "ring", 896),
  shell(25.51, .85, .34, 136, gold, "willow", 946),
  shell(26.28, .32, .41, 107, coral, "ring", 829),
  shell(26.51, .56, .227, 295, gold, "willow", 929),
  shell(27.01, .78, .17, 156, plum, "peony", 528),
  shell(27.82, .11, .28, 145, coral, "peony", 528),
  shell(28.51, .32, .254, 290, coral, "peony", 482),
  shell(28.51, .67, .22, 273, gold, "willow", 479),
  shell(28.77, .87, .36, 161, aqua, "ring", 92),
  shell(29.01, .52, .407, 145, plum, "ring", 803),
  shell(29.50, .9, .149, 161, coral, "peony", 874),
  shell(30.52, .48, .245, 323, ivory, "willow", 602),
  shell(30.52, .21, .36, 146, plum, "peony", 681),
  shell(30.75, .75, .325, 195, coral, "ring", 491),
  shell(31.02, .60, .141, 181, gold, "peony", 839),
  shell(31.99, .82, .26, 166, gold, "willow", 562),
];

function shellPosition(s, x, y, p, age) {
  age = Math.max(0, age);
  const spread = s.radius * p.ring * (1 - Math.exp(-p.drag * age));
  const curl = p.spin * Math.min(age, 3.5) * spread;
  const grav = (s.style === "willow" ? 15.4 : 10.8) * age * age;
  return [x + spread * p.x - curl * p.y + age * 7,
    y + (spread * p.y + curl * p.x) * (s.style === "ring" ? .79 : .94) + grav];
}

function fireworks(g, list, t, h, transform = null) {
  for (const s of list) {
    const age = t - s.at;
    if (age < -.84 || age > 3.7) continue;
    const [x, y] = transform ? transform(s.x * W, s.y * H) : [s.x * W, s.y * H];
    if (age < 0) {
      const q = ease(-.84, .04, age);
      const launchX = x + (s.seed % 2 ? 76 : -76) * (1 - q);
      const launchY = mix(h - 12, y, q);
      const b = 18 + (h - launchY) * .14;
      const tail = linear(g, launchX, launchY, launchX, launchY + b,
        [[0, rgba(s.color, .87)], [.43, rgba(s.color, .34)], [1, rgba(s.color, 0)]]);
      line(g, launchX, launchY, launchX + (x - launchX) * -.27, launchY + b, tail, 1.8);
      glow(g, launchX, launchY, 31, 31, s.color, .73);
      oval(g, launchX, launchY, 2.2, 2.2, "#ffeac1");
      continue;
    }
    const expansion = 58 + s.radius * (1 - Math.exp(-2.9 * age));
    glow(g, x, y + age * 12, expansion * 1.43, expansion * 1.26, s.color, .48 * Math.exp(-age * .92));
    if (s.radius > 190) {
      glow(g, x, y + age * 21, expansion * 2.3, expansion * 1.7, s.color, .34 * Math.exp(-age * 2.1));
    }
    if (age < .25) {
      const flash = Math.exp(-age * 17);
      glow(g, x, y, 145, 132, ivory, flash * .90);
      glow(g, x, y, 39 + 62 * age, 48 + 62 * age, s.color, flash);
      oval(g, x, y, 4.5 + 2 * flash, 4.5 + 2 * flash, rgba(ivory, flash));
    }
    const lines = Array.from({length: 12}, () => new Path2D());
    const points = Array.from({length: 8}, () => []);
    for (const p of s.particles) {
      if (age > p.life) continue;
      const decay = (1 - age / p.life) ** .65;
      const scintillation = .76 + .24 * Math.sin(age * (13 + p.hot * 14) + p.flicker);
      const strength = decay * scintillation * (.7 + .3 * p.hot);
      const bin = Math.min(5, Math.floor(strength * 6));
      const head = shellPosition(s, x, y, p, age);
      const trail = p.tail * (s.style === "willow" ? 1.54 : 1);
      const tail = shellPosition(s, x, y, p, age - trail - age * .073);
      const bend = shellPosition(s, x, y, p, age - p.tail * .52);
      const colorBin = p.hot > .75 ? bin + 6 : bin;
      const stroke = lines[colorBin];
      stroke.moveTo(...tail);
      stroke.quadraticCurveTo(...bend, ...head);
      if (p.hot > .11 && strength > .18) points[Math.min(7, Math.floor(strength * 8))].push(head);
      if (age > .70 && p.hot > .84) {
        const k = age - .46, sx = head[0] - p.x * k * 19 + Math.sin(p.a * 31) * k * 11;
        const sy = head[1] + k * k * 15;
        points[Math.min(3, bin)].push([sx, sy]);
      }
    }
    g.lineCap = "round";
    lines.forEach((stroke, i) => {
      const strength = i % 6;
      g.lineWidth = 2.3 + strength * .60;
      g.strokeStyle = rgba(s.color, .035 + .015 * strength);
      g.stroke(stroke);
      g.lineWidth = .82 + strength * .31;
      g.strokeStyle = rgba(i > 5 ? ivory : s.color, .13 + strength * .154);
      g.stroke(stroke);
    });
    points.forEach((group, i) => {
      const size = .77 + .46 * i;
      g.fillStyle = rgba(i > 4 ? ivory : s.color, .23 + .103 * i);
      for (const [px, py] of group) g.fillRect(px - size / 2, py - size / 2, size, size);
    });
    if (s.radius > 195 && age < 1.47) {
      for (let i = 16; i < s.particles.length; i += 13) {
        const p = s.particles[i];
        const [fx, fy] = shellPosition(s, x, y, p, age);
        const flicker = Math.sin(age * 12 + i * 3.73) ** 4 * Math.sin(age / 1.47 * Math.PI);
        if (flicker < .07) continue;
        glow(g, fx, fy, 15 + p.hot * 11, 16 + p.hot * 10, s.color, .76 * flicker);
        glow(g, fx, fy, 9, 9, ivory, .51 * flicker);
      }
    }
    g.lineCap = "butt";
  }
}

function shellLight(list, t) {
  return list.filter(s => t >= s.at && t - s.at < 2.35).map(s => ({
    x: s.x * W + (t - s.at) * 11,
    w: s.radius * (.59 + (t - s.at) * .25),
    c: s.color,
    a: .68 * Math.exp(-(t - s.at) * .91),
  }));
}

function rock(g, x, y, size, t, hue = "#20283b") {
  g.save();
  g.translate(x, y);
  g.scale(size, size);
  g.fillStyle = hue;
  g.fill(path("M-105 22-81 -20-59 -40-29 -50 25 -39 68 -24 112 20 64 43-78 45Z"));
  poly(g, [[-105,22],[-81,-20],[-59,-40],[-29,-50],[-5,-33],[-35,-22],[-66,20]], "#3d374b");
  poly(g, [[-29,-50],[25,-39],[68,-24],[112,20],[31,3],[-5,-33]], "#514050");
  line(g, -58, -39, -29, -50, "rgba(210,153,143,.45)", 1.8);
  line(g, -29, -50, 24, -39, "rgba(210,153,143,.47)", 1.4);
  for (let i = 0; i < 20; i++) {
    const rx = (hash(i + 35) - .5) * 149, ry = (hash(i + 52) - .25) * 39;
    line(g, rx, ry, rx + 18 * hash(i + 68), ry - 2, "rgba(223,161,149,.14)");
  }
  g.restore();
}

function lookout(g, t, sound) {
  const u = t - 20.5, h = 677 - u * 17;
  sky(g, t, 3, h, -u * 7, [1510, 249, 42]);
  mountains(g, h, t, u * -12, .85);
  shoreline(g, h, t, 16, .86);
  const lights = shellLight(closeShells, t);
  const rim = clamp(lights.reduce((sum, l) => sum + l.a, .11));
  sea(g, t, h, 3, [{x: 1402, w: 120, c: gold, a: .25}, ...lights], 1.08);
  fireworks(g, closeShells, t, h);
  g.fillStyle = linear(g, 1030, 770, 1540, H, [[0, "#473244"], [.44, "#222338"], [1, "#151a2c"]]);
  g.fill(path("M1920 749 Q1738 727 1580 764 L1414 796 1290 847 1186 861 1138 903 1010 945 846 1080H1920Z"));
  for (let i = 0; i < 13; i++) {
    const x = 1128 + i * 75, y = 905 - i * 12 + hash(i + 692) * 70;
    rock(g, x, y, .48 + hash(i + 81) * .49, t);
  }
  glow(g, 1595, 813, 235, 205, coral, rim * .39);
  traveler(g, 1614 - u * 24, 827, 1.70 + u * .08, t, .05, .4 + rim * .6, -1);
  grasses(g, 979, t, "#171c2c", 251, 112, 1335, 615);
  dust(g, t, 2, gold, 86, 240, 1050);
}

function bay(g, t, sound) {
  const u = t - 24.5, h = 696 + 11 * Math.sin(u * .55);
  sky(g, t, 3, h, 24 - u * 6);
  glow(g, 1050, 388, 1020, 595, coral, .29 + .28 * sound.pulse);
  mountains(g, h, t, -u * 12, .90);
  shoreline(g, h, t, -6 + u * 9, 1.33);
  const active = shellLight(wideShells, t);
  const lamps = [{x: 960, w: 290, c: plum, a: .21}, {x: 1564, w: 120, c: coral, a: .20}];
  sea(g, t, h, 3, [...active, ...lamps], 1.26);
  fireworks(g, wideShells, t, h);
  const hit = t - 28.51;
  if (hit >= 0 && hit < 1.45) {
    glow(g, 965, h - 40, 1360, 524, gold, .46 * Math.exp(-hit * 3.6));
    glow(g, 910, h + 110, 1145, 284, coral, .27 * Math.exp(-hit * 2.6));
  }
  const bx = 1192 - u * 61, by = 853 + 9 * Math.sin(u * 1.35);
  paperBoat(g, bx, by, .59 + .023 * u, t, -.13 + .05 * Math.sin(u * 1.55));
  for (let i = 0; i < 6; i++) {
    const f = fract(t * .54 + i / 6);
    g.beginPath();
    g.ellipse(bx + f * 65, by + 16 + f * 17, 64 + f * 143, 11 + f * 38, .07, .06, 2.53);
    g.lineWidth = 1.3;
    g.strokeStyle = rgba(ivory, .26 * (1 - f));
    g.stroke();
  }
  dust(g, t, 2.2, ivory, 120, 354, 1060);
}

const eyeShape = path("M625 557 C734 491 797 409 929 405 C1061 397 1172 444 1306 506 C1190 523 1082 601 947 627 C805 644 707 605 625 557Z");
const brow = path("M614 395 C771 246 984 233 1172 309 Q1247 337 1287 398 C1080 313 937 307 808 338 Q688 372 615 404Z");
const topLid = path("M625 557 C737 487 797 407 929 403 C1054 396 1172 444 1306 506 C1190 461 1032 402 942 422 C805 427 739 501 625 557Z");

const irisPlate = plate(460, 460, (g, w) => {
  const m = w / 2, r = m - 8;
  g.beginPath();
  g.arc(m, m, r, 0, TAU);
  g.clip();
  const grad = g.createRadialGradient(m, m, 31, m, m, r);
  [[0, "#242030"], [.31, "#5f3941"], [.51, "#ad695a"], [.71, "#777080"], [.88, "#4f516a"], [1, "#25293c"]]
    .forEach(([x, c]) => grad.addColorStop(x, c));
  g.fillStyle = grad;
  g.fillRect(0, 0, w, w);
  const rng = random(6182);
  for (let j = 0; j < 510; j++) {
    const a = rng() * TAU, inner = 64 + rng() * 104, d = 22 + rng() * 69;
    g.save();
    g.translate(m, m);
    g.rotate(a);
    g.strokeStyle = rgba(j % 3 ? [254,174,124] : [19,25,44], .12 + rng() * .39);
    g.lineWidth = .55 + rng() * 1.8;
    g.beginPath();
    g.moveTo(inner, 0);
    g.quadraticCurveTo(inner + d * .6, -3 + rng() * 7, inner + d, 0);
    g.stroke();
    g.restore();
  }
});

const eyeShells = [
  shell(32.63, .487, .446, 47, coral, "peony", 172),
  shell(33.76, .548, .454, 42, plum, "ring", 728),
  shell(35.05, .501, .442, 91, gold, "willow", 224),
  shell(36.52, .48, .45, 69, coral, "ring", 639),
  shell(36.75, .553, .485, 37, aqua, "peony", 449),
];

function eye(g, t, sound) {
  const u = t - 32.5, progress = ease(-.4, 6.2, u), irisX = 960 + progress * 34;
  g.fillStyle = "#212334";
  g.fillRect(0, 0, W, H);
  g.save();
  g.translate(960 - progress * 34, 511 + progress * 20);
  g.scale(1 + progress * .28, 1 + progress * .28);
  g.translate(-960, -511);
  const face = path("M102 107 C387 -86 1182 -141 1443 231 Q1517 330 1501 441 Q1494 500 1540 595 L1663 687 Q1696 713 1681 738 Q1655 769 1574 776 Q1562 830 1575 862 Q1550 905 1491 934 L1358 1119 H225 Q65 861 35 561 Q15 327 102 107Z");
  g.fillStyle = linear(g, 297, 21, 1523, 877, [[0, "#292338"], [.30, "#474055"], [.52, "#865d68"],
    [.71, "#b97d75"], [.87, "#935e67"], [1, "#4e3f54"]]);
  g.fill(face);
  g.save();
  g.clip(face);
  glow(g, 1396, 159, 510, 600, gold, .35);
  glow(g, 518, 747, 750, 521, [14, 27, 55], .68);
  glow(g, 1176, 670, 415, 277, coral, .32 + sound.voice * .073);
  glow(g, 1535, 722, 160, 470, gold, .33);
  glow(g, 727, 566, 490, 246, [61, 44, 69], .57);
  g.restore();

  g.fillStyle = "#322a3d";
  g.fill(brow);
  const lashes = new Path2D();
  for (let i = 0; i < 36; i++) {
    const p = i / 35, x = 649 + 631 * p;
    const y = 523 - Math.sin(p * Math.PI) ** 1.34 * 114 + p * -22;
    const len = (9 + hash(i + 194) * 22) * Math.sin(p * Math.PI + .08) + 6;
    lashes.moveTo(x, y + 2);
    lashes.quadraticCurveTo(x + 7 - p * 29, y - len * .35, x + 12 - p * 48, y - len);
  }
  g.fillStyle = linear(g, 0, 412, 0, 626, [[0, "#3d394c"], [.46, "#988589"], [1, "#e5b9a3"]]);
  g.fill(eyeShape);
  g.save();
  g.clip(eyeShape);
  const scale = 386 + 28 * progress;
  g.drawImage(irisPlate, irisX - scale / 2, 514 - scale / 2, scale, scale);
  oval(g, irisX, 514, 64 + progress * 5, 64 + progress * 5, "#1c1b2c");
  glow(g, irisX - 35, 504, 124, 97, gold, .49 + sound.pulse * .15);
  fireworks(g, eyeShells, t, 612);
  g.strokeStyle = "rgba(241,213,195,.46)";
  g.lineWidth = 2.2;
  g.stroke(path("M841 480 Q888 454 933 459 M906 571 Q946 601 1009 583"));
  glow(g, irisX - 42, 474, 35, 22, ivory, .64);
  oval(g, irisX - 43, 474, 15, 7, "#f9e3c5");
  oval(g, irisX + 44, 548, 4, 3, "rgba(255,217,184,.57)");
  g.restore();
  g.fillStyle = "#332b3d";
  g.fill(topLid);
  g.strokeStyle = "#302738";
  g.lineWidth = 2.2;
  g.stroke(lashes);
  g.strokeStyle = "rgba(244,168,151,.68)";
  g.lineWidth = 2;
  g.stroke(path("M651 575 C829 681 1042 617 1243 541 M631 531 Q782 387 922 380 Q1060 369 1192 445"));
  g.strokeStyle = "rgba(250,174,145,.35)";
  g.lineWidth = 2;
  g.stroke(path("M1456 442 Q1485 557 1557 628 Q1603 663 1643 686 M1654 744 Q1611 751 1586 765"));

  const wind = Math.sin(u * 1.6) * 25;
  g.fillStyle = linear(g, 0, 40, 746, 659, [[0, "#1d2033"], [.60, "#2c273a"], [1, "#523749"]]);
  g.fill(path(`M-60 -25 H1190 Q837 -9 682 162 Q590 275 491 375 Q364 517 481 668
    Q${403 + wind} 556 ${354 + wind} 533 C267 609 297 845 440 1097 H-60Z`));
  g.fill(path(`M501 -5 Q741 -21 867 -14 C697 50 624 163 604 282 Q585 407 484 492 Q540 ${396 + wind} 531 275 Q485 135 501 -5Z`));
  const hair = new Path2D();
  for (let i = 0; i < 44; i++) {
    const x = 70 + i * 16, spread = i / 44;
    hair.moveTo(x + 225, -95);
    hair.bezierCurveTo(x + 63, 160, x - 234, 375, x - 242 + wind * spread, 591 + 459 * (1 - spread));
  }
  g.strokeStyle = "rgba(177,117,138,.19)";
  g.lineWidth = 1.3;
  g.stroke(hair);
  g.strokeStyle = "rgba(240,152,130,.41)";
  g.stroke(path(`M796 -17 Q641 61 590 230 Q582 351 498 ${467 + wind} M540 -22 Q444 89 384 236`));
  g.restore();
  dust(g, t, .58, ivory, 40, 185, 945);
}

function aftermath(g, t, sound) {
  const u = t - 38.62, h = 601 + u * 22;
  sky(g, t, 4, h, -9 + u * 6, [963 + u * 2, 380, 33]);
  mountains(g, h, t, -u * 13, .63);
  shoreline(g, h, t, 59, .49, .59);
  const x = 938 + 52 * u, y = 794 - 22 * u;
  sea(g, t, h, 4, [{x: 955, w: 116, c: ivory, a: .36},
    {x, w: 70, c: coral, a: .23 * (1 - ease(.7, 2.0, u))}], .7);
  paperBoat(g, x, y, .61 - u * .09, t, -.11);
  glow(g, x - 3, y - 17, 45, 65, gold, .71 - u * .18);
  oval(g, x - 3, y - 17, 2.9 - u * .43, 2.5, rgba(ivory, .91 - u * .22));
  dust(g, t, .47, ivory, 30, 70, 887);
}

const scenes = [
  {at: 0, paint: room},
  {at: 4.5, paint: memory, dissolve: .26},
  {at: 7.5, paint: bridge, flash: .16},
  {at: 11.5, paint: overhead, dissolve: .18},
  {at: 15.5, paint: walk, dissolve: .25},
  {at: 20.5, paint: lookout, dissolve: .17},
  {at: 24.5, paint: bay, flash: .12},
  {at: 32.5, paint: eye, dissolve: .27},
  {at: 38.62, paint: aftermath, dissolve: .48},
];
const blendCanvas = plate(W, H, () => {});
const blendCtx = blendCanvas.getContext("2d");
const vignette = plate(W, H, g => {
  const v = g.createRadialGradient(914, 480, 495, 938, 492, 1170);
  v.addColorStop(0, "rgba(6,10,25,0)");
  v.addColorStop(.70, "rgba(6,10,25,.13)");
  v.addColorStop(1, "rgba(6,10,25,.39)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
});

function sample(env, t) {
  const x = clamp(t / audio.step, 0, env.length - 1);
  const p = Math.floor(x);
  return mix(env[p], env[Math.min(p + 1, env.length - 1)], x - p);
}

function soundAt(t) {
  let pulse = 0;
  for (const [at, strength] of audio.onsets) {
    if (at > t + .013) break;
    if (at < t - .55) continue;
    pulse += strength * Math.exp(-15 * Math.max(0, t - at));
  }
  return {pulse: clamp(pulse), energy: sample(audio.energy, t),
    voice: sample(audio.voice, t), bass: sample(audio.bass, t)};
}

function lyrics(g, t) {
  const cue = cues.find(c => t >= c.start && t < c.end);
  if (!cue) return;
  const chars = Array.from(cue.text), step = 54;
  const opacity = ease(cue.start, cue.start + .11, t) * (1 - ease(cue.end - .18, cue.end, t));
  const x = W / 2 - (chars.length - 1) * step / 2;
  const shade = linear(g, 0, 894, 0, H, [[0, "rgba(8,13,23,0)"],
    [.5, "rgba(8,13,23,.55)"], [1, "rgba(8,13,23,.62)"]]);
  g.save();
  g.globalAlpha = .78 * opacity;
  g.fillStyle = shade;
  g.fillRect(0, 894, W, H - 894);
  g.globalAlpha = opacity;
  g.font = `600 42px ${serif}`;
  g.letterSpacing = "0px";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.lineWidth = 2.9;
  g.strokeStyle = "rgba(8,12,24,.78)";
  chars.forEach((char, i) => {
    const at = cue.marks[i], p = ease(at - .025, at + .12, t);
    const px = x + i * step;
    g.strokeText(char, px, 974);
    g.fillStyle = rgba([243 + Math.round(p * 12), 230 - Math.round(p * 24),
      219 - Math.round(p * 51)], .92 + .08 * p);
    g.fillText(char, px, 974);
  });
  g.restore();
}

let current = 0;
function drawFrame(t) {
  t = clamp(t, 0, 40.52);
  current = t;
  const i = scenes.findLastIndex(scene => scene.at <= t);
  const scene = scenes[i], elapsed = t - scene.at, music = soundAt(t);
  if (i > 0 && scene.dissolve && elapsed < scene.dissolve) {
    scenes[i - 1].paint(ctx, t, music);
    scene.paint(blendCtx, t, music);
    ctx.globalAlpha = ease(0, scene.dissolve, elapsed);
    ctx.drawImage(blendCanvas, 0, 0);
    ctx.globalAlpha = 1;
  } else {
    scene.paint(ctx, t, music);
  }
  if (scene.flash && elapsed < .55) {
    glow(ctx, scene.paint === bridge ? 1510 : 1160, 370, 1260, 935, ivory, scene.flash * Math.exp(-8 * elapsed));
  }
  ctx.drawImage(vignette, 0, 0);
  ctx.globalAlpha = .65;
  ctx.drawImage(grain[Math.floor(t * 19) % grain.length], 0, 0, W, H);
  ctx.globalAlpha = 1;
  const fade = .49 * (1 - ease(0, .40, t)) + .88 * ease(39.44, 40.52, t);
  if (fade > 0) {
    ctx.fillStyle = `rgba(9,14,26,${fade})`;
    ctx.fillRect(0, 0, W, H);
  }
  lyrics(ctx, t);
}

window.drawFrame = drawFrame;
window.__timelines ??= {};
window.__timelines.mv = {
  seek: drawFrame,
  duration: () => 40.52,
  totalDuration: () => 40.52,
  time(value) { return value === undefined ? current : drawFrame(value); },
  pause() { return this; },
};

const track = document.querySelector("#sound");
const play = document.querySelector("#play");
if (new URLSearchParams(location.search).has("render")) document.documentElement.classList.add("render");
play.addEventListener("click", async () => {
  if (track.paused) {
    await track.play();
    const update = () => {
      drawFrame(track.currentTime);
      if (!track.paused) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  } else {
    track.pause();
  }
});
for (const event of ["play", "pause", "ended"]) {
  track.addEventListener(event, () => {
    play.textContent = track.paused ? "播放" : "暂停";
  });
}
window.filmReady = document.fonts.ready.then(() => {
  drawFrame(0);
  return true;
});
