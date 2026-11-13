// Tiny course engine: a ladder of steps, each with prose, a widget and a check
// that unlocks the next step. Progress lives in localStorage.
(function () {
  const NS = "http://www.w3.org/2000/svg";

  // ---------- DOM helpers ----------
  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  }
  function s(tag, attrs = {}) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }
  const fmt = {
    pct: (p) => (p * 100).toFixed(p < 0.1 && p > 0 ? 1 : 0) + "%",
    n: (x, d = 2) => (!isFinite(x) ? "∞" : x.toFixed(d)),
    sci: (x) => (x === 0 ? "0 (underflow!)" : x >= 0.001 ? x.toPrecision(3) : x.toExponential(2)),
    // 1000 → "10³"; non-powers of ten fall back to 3 significant digits
    pow10: (v) => {
      const k = Math.log10(v);
      if (!isFinite(k)) return String(v);
      if (Math.abs(k - Math.round(k)) > 1e-9) return String(+(+v).toPrecision(3));
      return "10" + String(Math.round(k)).replace(/./g, (c) => SUP[c] || c);
    },
  };
  const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  const log2 = Math.log2;
  const surprise = (p) => (p <= 0 ? Infinity : -log2(p));

  // ---------- mobile helpers ----------
  const isNarrow = () => !!(window.matchMedia && window.matchMedia("(max-width: 600px)").matches);
  // pick a value for phones (≤ 600 px wide), e.g. a narrower viewBox width: narrow(560, 400)
  const narrow = (wide, small) => (isNarrow() ? small : wide);
  // Keep SVG text (drawn with the default 12 px svg font) at least minPx on screen,
  // however far the viewBox is scaled down. Scales font-size by up to maxK.
  function fitText(svg, minPx = 10, maxK = 1.8) {
    svg.classList.add("c-fs");
    const upd = () => {
      const vb = svg.viewBox && svg.viewBox.baseVal, w = svg.getBoundingClientRect().width;
      if (!vb || !vb.width || !w) return;
      const k = Math.min(maxK, Math.max(1, minPx / ((12 * w) / vb.width)));
      svg.style.setProperty("--c-k", k.toFixed(3));
    };
    if (window.ResizeObserver) new ResizeObserver(upd).observe(svg);
    return svg;
  }

  function widget(label, ...kids) {
    return h("div", { class: "widget" }, label ? h("div", { class: "widget-label" }, label) : null, ...kids);
  }
  function stat(k, cls = "") {
    const v = h("div", { class: "v" }, "–");
    const kl = h("div", { class: "k" }, k);
    const el = h("div", { class: "stat " + cls }, kl, v);
    el.set = (txt) => (v.textContent = txt);
    el.setLabel = (txt) => (kl.textContent = txt);
    return el;
  }
  // log: true → the range moves in log10 space between min and max (both > 0); `steps` positions.
  // nameWidth: px number or CSS width for long names (wraps; capped at 40% of the row).
  function slider({ name, min = 0, max = 1, step = 0.01, value = 0, fmtv = (x) => x, oninput, log = false, steps = 300, nameWidth }) {
    const to = log ? (x) => Math.log10(x) : (x) => x;
    const from = log ? (u) => +Math.pow(10, u).toPrecision(12) : (u) => u;
    const input = log
      ? h("input", { type: "range", min: to(min), max: to(max), step: (to(max) - to(min)) / steps, value: to(value) })
      : h("input", { type: "range", min, max, step, value });
    const val = h("span", { class: "val" }, fmtv(value));
    const nw = nameWidth == null ? false : `width:min(${typeof nameWidth === "number" ? nameWidth + "px" : nameWidth}, 40%);white-space:normal;line-height:1.25;flex-shrink:0`;
    const row = h("div", { class: "row" }, h("span", { class: "name", style: nw }, name), input, val);
    input.addEventListener("input", () => { const x = from(+input.value); val.textContent = fmtv(x); oninput && oninput(x); });
    row.input = input;
    row.set = (x) => { input.value = to(x); val.textContent = fmtv(x); };
    row.get = () => from(+input.value);
    return row;
  }

  // Bets that always sum to 100%: moving one slider rescales the others.
  function betSliders(words, init, onchange, { min = 0 } = {}) {
    let p = init.slice();
    const box = h("div");
    const rows = words.map((w, i) =>
      slider({
        name: w, min: 0, max: 1, step: 0.005, value: p[i], fmtv: fmt.pct,
        oninput: (v) => {
          v = Math.max(min, Math.min(1 - min * (words.length - 1), v));
          const rest = p.reduce((a, b, j) => (j === i ? a : a + b), 0);
          p = p.map((x, j) => (j === i ? v : rest > 1e-12 ? (x / rest) * (1 - v) : (1 - v) / (words.length - 1)));
          sync(i); onchange(p);
        },
      })
    );
    function sync(skip) { rows.forEach((r, j) => j !== skip && r.set(p[j])); if (skip != null) rows[skip].set(p[skip]); }
    rows.forEach((r) => box.append(r));
    box.get = () => p.slice();
    box.setAll = (q) => { p = q.slice(); sync(null); rows.forEach((r, j) => r.set(p[j])); onchange(p); };
    return box;
  }

  // Horizontal-ish vertical bar chart (values 0..max)
  // Optional: width (viewBox, default 520), narrow (viewBox width on phones; true = 380),
  // minFont (px floor for label text, see fitText), onclick(i) (click a bar's column).
  function barChart({ labels, max = 1, height = 150, colors, fmtv = fmt.pct, signed = false, width = 520, narrow: nw, minFont, onclick }) {
    if (nw && isNarrow()) width = nw === true ? 380 : nw;
    const W = width, H = height, pad = 26, n = labels.length, bw = (W - pad * 2) / n;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H + 40}`, width: "100%" });
    const base = signed ? H / 2 + 10 : H + 10;
    svg.append(s("line", { x1: pad, x2: W - pad, y1: base, y2: base, class: "axis" }));
    const bars = labels.map((lab, i) => {
      const x = pad + i * bw + bw * 0.18;
      if (onclick) {
        const hit = s("rect", { x: pad + i * bw, width: bw, y: 0, height: H + 40, fill: "transparent", class: "c-hit" });
        hit.addEventListener("click", () => onclick(i)); svg.append(hit);
      }
      const r = s("rect", { x, width: bw * 0.64, y: base, height: 0, rx: 4, fill: colors ? colors[i] : "#6cb4ff" });
      const t = s("text", { x: x + bw * 0.32, y: base - 6, "text-anchor": "middle" });
      const l = s("text", { x: x + bw * 0.32, y: H + 32, "text-anchor": "middle" });
      l.textContent = lab; l.style.fontFamily = "var(--mono)"; l.style.fontSize = minFont ? "calc(14px * var(--c-k, 1))" : "14px"; l.style.fill = "#e6e9ef";
      if (onclick) [r, t, l].forEach((e) => { e.style.pointerEvents = "none"; });
      svg.append(r, t, l);
      return { r, t, l };
    });
    if (minFont) fitText(svg, minFont);
    svg.update = (vals, cols) => {
      vals.forEach((v, i) => {
        const span = signed ? H / 2 : H;
        const hh = Math.min(span, (Math.abs(v) / max) * span);
        const up = v >= 0;
        bars[i].r.setAttribute("y", up ? base - hh : base);
        bars[i].r.setAttribute("height", hh);
        if (cols) bars[i].r.setAttribute("fill", cols[i]);
        bars[i].t.setAttribute("y", up ? base - hh - 6 : base + hh + 14);
        bars[i].t.textContent = fmtv(v);
      });
    };
    svg.labelAt = (i, txt, color) => { bars[i].l.textContent = txt; if (color) bars[i].l.style.fill = color; };
    return svg;
  }

  // Line plot with optional marker. series: [{fn | pts, color, dash}]
  // Optional (all default off): xlog/ylog (base-10 axes; ranges and ticks in data units, ticks labelled 10ⁿ),
  // xfmt/yfmt (tick label formatters), clip (line/fn break at the frame instead of clamping),
  // narrow (viewBox width on phones; true = 400), minFont (px floor for text, see fitText),
  // margins ({left, right, top, bottom} in viewBox units).
  function plot({ xmin, xmax, ymin, ymax, width = 560, height = 240, xlabel = "", ylabel = "", xticks = [], yticks = [],
    xlog = false, ylog = false, xfmt, yfmt, clip = false, narrow: nw, minFont, margins = {} }) {
    if (nw && isNarrow()) width = nw === true ? 400 : nw;
    const L = margins.left ?? 48, R = margins.right ?? 14, T = margins.top ?? 12, B = margins.bottom ?? 36, W = width, H = height;
    const tx = xlog ? Math.log10 : (v) => v, ty = ylog ? Math.log10 : (v) => v;
    let u0, u1, v0, v1;
    const setUV = () => { u0 = tx(xmin); u1 = tx(xmax); v0 = ty(ymin); v1 = ty(ymax); };
    setUV();
    const SX = (u) => L + ((u - u0) / (u1 - u0)) * (W - L - R);
    const SY = (v) => T + (1 - (v - v0) / (v1 - v0)) * (H - T - B);
    const X = xlog ? (x) => SX(tx(x)) : (x) => L + ((x - xmin) / (xmax - xmin)) * (W - L - R);
    const Y = ylog ? (y) => SY(ty(y)) : (y) => T + (1 - (y - ymin) / (ymax - ymin)) * (H - T - B);
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%" });
    svg.append(s("line", { x1: L, x2: W - R, y1: H - B, y2: H - B, class: "axis" }));
    svg.append(s("line", { x1: L, x2: L, y1: T, y2: H - B, class: "axis" }));
    const xl = s("text", { x: (L + W - R) / 2, y: H - 4, "text-anchor": "middle" }); xl.textContent = xlabel;
    const yl = s("text", { x: 12, y: (T + H - B) / 2, "text-anchor": "middle", transform: `rotate(-90 12 ${(T + H - B) / 2})` }); yl.textContent = ylabel;
    let tickEls = [];
    const drawTicks = (before) => {
      tickEls.forEach((e) => e.remove()); tickEls = [];
      const add = (t) => { tickEls.push(t); before ? svg.insertBefore(t, before) : svg.append(t); };
      xticks.forEach((x) => {
        const t = s("text", { x: X(x), y: H - B + 16, "text-anchor": "middle" });
        t.textContent = xfmt ? xfmt(x) : xlog ? fmt.pow10(x) : x;
        const hw = String(t.textContent).length * 3.4; // keep a wide last label inside the viewBox
        if (X(x) + hw > W - 1) t.setAttribute("x", W - 1 - hw);
        add(t);
      });
      yticks.forEach((y) => { const t = s("text", { x: L - 6, y: Y(y) + 4, "text-anchor": "end" }); t.textContent = yfmt ? yfmt(y) : ylog ? fmt.pow10(y) : y; add(t); });
    };
    drawTicks(null);
    svg.append(xl, yl);
    const layer = s("g"); svg.append(layer);
    const clamp = (y) => Math.max(ymin, Math.min(ymax, y));
    svg.X = X; svg.Y = Y; svg.layer = layer;
    svg.frame = { left: L, right: W - R, top: T, bottom: H - B, width: W, height: H };
    // Liang–Barsky: clip each segment to the frame in axis space, break the path where it leaves
    const clipD = (pts) => {
      const ua = Math.min(u0, u1), ub = Math.max(u0, u1), va = Math.min(v0, v1), vb = Math.max(v0, v1);
      let d = "", pen = null, prev = null;
      const P = (u, v) => SX(u).toFixed(1) + "," + SY(v).toFixed(1);
      for (const p of pts) {
        const cur = [tx(p[0]), ty(p[1])];
        if (!isFinite(cur[0]) || !isFinite(cur[1])) { prev = null; pen = null; continue; }
        if (prev) {
          const du = cur[0] - prev[0], dv = cur[1] - prev[1];
          let t0 = 0, t1 = 1, ok = true;
          for (const [pp, qq] of [[-du, prev[0] - ua], [du, ub - prev[0]], [-dv, prev[1] - va], [dv, vb - prev[1]]]) {
            if (pp === 0) { if (qq < 0) { ok = false; break; } }
            else { const r = qq / pp; if (pp < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; } }
          }
          if (ok) {
            const a = [prev[0] + t0 * du, prev[1] + t0 * dv], b = [prev[0] + t1 * du, prev[1] + t1 * dv];
            if (!pen || t0 > 0) d += "M" + P(a[0], a[1]);
            d += "L" + P(b[0], b[1]);
            pen = t1 < 1 ? null : b;
          } else pen = null;
        }
        prev = cur;
      }
      return d;
    };
    svg.line = (pts, color = "#6cb4ff", dash = "", w = 2.5) => {
      if (dash === true) dash = "6 4";
      const d = clip ? clipD(pts)
        : pts.filter((p) => isFinite(p[1]) && (!xlog || p[0] > 0)).map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + "," + Y(clamp(p[1])).toFixed(1)).join("");
      const path = s("path", { d, fill: "none", stroke: color, "stroke-width": w, "stroke-dasharray": dash });
      layer.append(path); return path;
    };
    const sample = (f, n) => {
      const pts = [];
      for (let i = 0; i <= n; i++) { const x = xlog ? Math.pow(10, u0 + ((u1 - u0) * i) / n) : xmin + ((xmax - xmin) * i) / n; pts.push([x, f(x)]); }
      return pts;
    };
    svg.fn = (f, color, dash, n = 300) => svg.line(sample(f, n), color, dash);
    // o: { pos: "right" | "left", below: bool, halo: bool }
    svg.hline = (y, color, label, o = {}) => {
      const g = s("g");
      g.append(s("line", { x1: L, x2: W - R, y1: Y(y), y2: Y(y), stroke: color, "stroke-dasharray": "5 5", "stroke-width": 1.5 }));
      if (label) {
        const left = o.pos === "left";
        const t = s("text", { x: left ? L + 4 : W - R - 4, y: o.below ? Y(y) + 14 : Y(y) - 5, "text-anchor": left ? "start" : "end" });
        t.textContent = label; t.style.fill = color; if (o.halo) t.classList.add("c-halo"); g.append(t);
      }
      layer.append(g); return g;
    };
    // vertical dashed reference line; o: { pos: "right" | "left" of the line, halo }
    svg.vline = (x, color = "#9aa3b5", label, o = {}) => {
      const g = s("g");
      g.append(s("line", { x1: X(x), x2: X(x), y1: T, y2: H - B, stroke: color, "stroke-dasharray": "5 5", "stroke-width": 1.5 }));
      if (label) {
        const left = o.pos === "left";
        const t = s("text", { x: X(x) + (left ? -4 : 4), y: T + 12, "text-anchor": left ? "end" : "start" });
        t.textContent = label; t.style.fill = color; if (o.halo) t.classList.add("c-halo"); g.append(t);
      }
      layer.append(g); return g;
    };
    // scatter dot in the clearable layer; values outside [ymin, ymax] sit on the frame as hollow rings
    svg.dot = (x, y, color = "#ffd166", r = 4) => {
      const out = y > ymax || y < ymin;
      const c = s("circle", { cx: X(x), cy: Y(clamp(y)), r, fill: out ? "none" : color, stroke: out ? color : "none", "stroke-width": 2 });
      layer.append(c); return c;
    };
    // shaded area between a curve (points or function) and `base` (default: bottom of the frame)
    svg.area = (ptsOrFn, color = "#6cb4ff", opacity = 0.18, base) => {
      const pts = (typeof ptsOrFn === "function" ? sample(ptsOrFn, 200) : ptsOrFn).filter((p) => isFinite(p[1]) && (!xlog || p[0] > 0));
      if (!pts.length) return null;
      const yb = Y(clamp(base == null ? ymin : base)).toFixed(1);
      const d = "M" + X(pts[0][0]).toFixed(1) + "," + yb + pts.map((p) => "L" + X(p[0]).toFixed(1) + "," + Y(clamp(p[1])).toFixed(1)).join("") + "L" + X(pts[pts.length - 1][0]).toFixed(1) + "," + yb + "Z";
      const path = s("path", { d, fill: color, "fill-opacity": opacity, stroke: "none" });
      layer.append(path); return path;
    };
    // o: { clearable: true } puts the marker in the layer that clear() empties
    svg.marker = (color = "#ffd166", o = {}) => {
      const g = s("g"); const c = s("circle", { r: 6, fill: color });
      const vl = s("line", { stroke: color, "stroke-dasharray": "3 4", "stroke-width": 1 });
      const hl = s("line", { stroke: color, "stroke-dasharray": "3 4", "stroke-width": 1 });
      g.append(vl, hl, c); (o.clearable ? layer : svg).append(g);
      g.move = (x, y) => {
        const cy = Y(clamp(y)), cx = X(x);
        c.setAttribute("cx", cx); c.setAttribute("cy", cy);
        vl.setAttribute("x1", cx); vl.setAttribute("x2", cx); vl.setAttribute("y1", cy); vl.setAttribute("y2", H - B);
        hl.setAttribute("x1", L); hl.setAttribute("x2", cx); hl.setAttribute("y1", cy); hl.setAttribute("y2", cy);
      };
      return g;
    };
    // items: [{label, color, dash}] or [[label, color, dash?]]; o: { pos: "left" | "right" } (top corner)
    svg.legend = (items, o = {}) => {
      if (svg._legend) svg._legend.remove();
      const g = s("g", { class: "c-legend" });
      const its = items.map((it) => (Array.isArray(it) ? { label: it[0], color: it[1], dash: it[2] } : it));
      const wmax = Math.max(...its.map((it) => String(it.label).length)) * 6.6 + 30;
      const x0 = o.pos === "right" ? W - R - wmax - 6 : L + 8;
      g.append(s("rect", { x: x0 - 4, y: T + 2, width: wmax + 8, height: its.length * 17 + 6, rx: 5, fill: "#1a1f29", "fill-opacity": 0.85 }));
      its.forEach((it, i) => {
        const y = T + 15 + i * 17;
        g.append(s("line", { x1: x0, x2: x0 + 20, y1: y - 4, y2: y - 4, stroke: it.color, "stroke-width": 2.5, "stroke-dasharray": it.dash === true ? "6 4" : it.dash || "" }));
        const t = s("text", { x: x0 + 26, y }); t.textContent = it.label; g.append(t);
      });
      svg.append(g); svg._legend = g; return g;
    };
    // change ranges / ticks after creation (e.g. a growing training curve). Redraws tick labels only:
    // call clear() and redraw your lines afterwards.
    svg.setRange = (o = {}) => {
      if (o.xmin != null) xmin = o.xmin; if (o.xmax != null) xmax = o.xmax;
      if (o.ymin != null) ymin = o.ymin; if (o.ymax != null) ymax = o.ymax;
      if (o.xticks) xticks = o.xticks; if (o.yticks) yticks = o.yticks;
      setUV(); drawTicks(xl); return svg;
    };
    svg.clear = () => (layer.innerHTML = "");
    if (minFont) fitText(svg, minFont);
    return svg;
  }

  function softmax(z) {
    const m = Math.max(...z); const e = z.map((v) => Math.exp(v - m)); const S = e.reduce((a, b) => a + b, 0);
    return e.map((v) => v / S);
  }

  // ---------- shared widget helpers ----------
  // One-of-N button row. options: [[value, html], …] or plain strings (value = index).
  // .set(v) selects without firing onchange; .get() returns the selected value.
  function toggle(label, options, value, onchange) {
    const box = h("div", { class: "btns c-seg" }, label ? h("span", { class: "c-seg-label" }, label) : null);
    let cur = value;
    const bs = options.map((o, i) => {
      const [v, txt] = Array.isArray(o) ? o : [i, o];
      const b = h("button", { type: "button", html: String(txt), onclick: () => { box.set(v); onchange && onchange(v); } });
      box.append(b); return [v, b];
    });
    box.set = (v) => { cur = v; bs.forEach(([k, b]) => { b.classList.toggle("on", k === v); b.setAttribute("aria-pressed", String(k === v)); }); };
    box.get = () => cur;
    box.buttons = bs.map((x) => x[1]);
    box.set(value);
    return box;
  }

  // Horizontal labelled bars (HTML, readable on phones). labels: strings/html.
  // series: one colour per series; .update(vals, colorsPerRow?, ghost?) where vals is an array of numbers
  // (one series) or an array of arrays (one per series); ghost = per-row "before" values drawn dashed.
  function hbars(labels, { series = ["#6cb4ff"], signed = false, max = 1, fmtv = fmt.pct, labelWidth, onclick } = {}) {
    const box = h("div", { class: "c-hb", style: labelWidth ? `--c-hb-lw:${typeof labelWidth === "number" ? labelWidth + "px" : labelWidth}` : false });
    const n = series.length;
    const rows = labels.map((l, i) => {
      const t = h("div", { class: "t" + (signed ? " signed" : "") });
      const gh = h("div", { class: "gh", style: "display:none" }); t.append(gh);
      const bars = series.map((c, j) => { const b = h("div", { class: "f", style: `background:${c};top:${(j * 100) / n}%;height:${100 / n}%;left:${signed ? 50 : 0}%;width:0` }); t.append(b); return b; });
      const lab = h("div", { class: "l" + (onclick ? " click" : ""), html: String(l) }), v = h("div", { class: "v" });
      if (onclick) [lab, t].forEach((e) => e.addEventListener("click", () => onclick(i)));
      box.append(lab, t, v);
      return { bars, lab, v, gh };
    });
    const place = (el, x) => {
      const w = Math.min(1, Math.abs(x) / max);
      if (signed) { el.style.left = (x >= 0 ? 50 : 50 - w * 50) + "%"; el.style.width = w * 50 + "%"; }
      else { el.style.left = "0%"; el.style.width = w * 100 + "%"; }
    };
    box.update = (vals, colorsPerRow, ghost) => {
      const S = Array.isArray(vals[0]) ? vals : [vals];
      rows.forEach((r, i) => {
        S.forEach((arr, j) => { if (r.bars[j]) { place(r.bars[j], arr[i]); if (colorsPerRow) r.bars[j].style.background = colorsPerRow[i]; } });
        if (ghost && isFinite(ghost[i])) { r.gh.style.display = ""; place(r.gh, ghost[i]); } else r.gh.style.display = "none";
        r.v.innerHTML = S.map((arr, j) => `<span style="color:${S.length > 1 ? series[j] : "inherit"}">${fmtv(arr[i])}</span>`).join(" ");
      });
      return box;
    };
    box.mark = (k) => rows.forEach((r, i) => r.lab.classList.toggle("hi", Array.isArray(k) ? k.includes(i) : i === k));
    box.labelAt = (i, html) => (rows[i].lab.innerHTML = html);
    return box;
  }

  // n × m grid of coloured cells with row/column labels. values[i][j]; min < 0 → diverging (blue +, red −).
  // mask(i, j) → true hides a cell (hatched). onclick(i, j) on cells, onclick(i, -1) on row labels.
  // .update(values, {mask, mark(i,j)}), .select(i) highlights a row, .cell(i, j) returns the <td>.
  function heatmap({ rows, cols, values, min = 0, max = 1, fmtv = (v) => v.toFixed(2), showValues = true, mask, onclick,
    color = "108,180,255", negColor = "255,107,107", cell = 34, corner = "" }) {
    const wrap = h("div", { class: "c-heat-wrap" });
    const tbl = h("table", { class: "c-heat" });
    const hr = h("tr", {}, h("th", {}, corner), ...cols.map((c) => h("th", { class: "c", html: String(c) })));
    tbl.append(hr);
    const tds = rows.map((r, i) => {
      const th = h("th", { class: "r" + (onclick ? " click" : ""), html: String(r) });
      if (onclick) th.addEventListener("click", () => onclick(i, -1));
      const cells = cols.map((_, j) => {
        const td = h("td", { style: `min-width:${cell}px;height:${Math.round(cell * 0.8)}px` });
        if (onclick) { td.classList.add("click"); td.addEventListener("click", () => onclick(i, j)); }
        return td;
      });
      tbl.append(h("tr", {}, th, ...cells));
      return cells;
    });
    wrap.append(tbl);
    let curMask = mask;
    wrap.update = (vals, o = {}) => {
      if (o.mask !== undefined) curMask = o.mask;
      tds.forEach((cells, i) => cells.forEach((td, j) => {
        const v = vals[i] ? vals[i][j] : NaN;
        const masked = curMask ? curMask(i, j) : false;
        td.classList.toggle("m", !!masked);
        td.classList.toggle("mk", !!(o.mark && o.mark(i, j)));
        if (masked || !isFinite(v)) { td.style.background = ""; td.style.color = ""; td.textContent = ""; return; }
        const neg = min < 0 && v < 0;
        const a = Math.max(0, Math.min(1, neg ? v / min : (v - (min < 0 ? 0 : min)) / (max - (min < 0 ? 0 : min))));
        td.style.background = `rgba(${neg ? negColor : color},${(0.08 + 0.85 * a).toFixed(3)})`;
        td.style.color = a > 0.6 ? "#0b1220" : "";
        td.textContent = showValues ? fmtv(v) : "";
      }));
      return wrap;
    };
    wrap.select = (k) => tds.forEach((cells, i) => cells[0].parentNode.classList.toggle("sel", i === k));
    wrap.cell = (i, j) => tds[i][j];
    if (values) wrap.update(values);
    return wrap;
  }

  // 2-D coordinate plane with grid, labelled points and arrows that can be dragged (mouse or touch).
  // drag callbacks get (x, y) clamped to the range and may return [x, y] to override (e.g. snapping).
  function plane({ xmin = -3, xmax = 3, ymin = -3, ymax = 3, size = 360, height, grid = 1, xlabel = "", ylabel = "", maxWidth = 440 } = {}) {
    const W = size, H = height || Math.round((size * (ymax - ymin)) / (xmax - xmin)), pad = 16;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", class: "c-plane", style: `max-width:${maxWidth}px` });
    const X = (x) => pad + ((x - xmin) / (xmax - xmin)) * (W - 2 * pad);
    const Y = (y) => H - pad - ((y - ymin) / (ymax - ymin)) * (H - 2 * pad);
    const cl = (v, a, b) => Math.max(a, Math.min(b, v));
    if (grid) {
      for (let k = Math.ceil(xmin / grid) * grid; k <= xmax + 1e-9; k += grid) svg.append(s("line", { x1: X(k), x2: X(k), y1: Y(ymin), y2: Y(ymax), class: "c-grid" }));
      for (let k = Math.ceil(ymin / grid) * grid; k <= ymax + 1e-9; k += grid) svg.append(s("line", { x1: X(xmin), x2: X(xmax), y1: Y(k), y2: Y(k), class: "c-grid" }));
    }
    if (ymin <= 0 && ymax >= 0) svg.append(s("line", { x1: X(xmin), x2: X(xmax), y1: Y(0), y2: Y(0), class: "axis" }));
    if (xmin <= 0 && xmax >= 0) svg.append(s("line", { x1: X(0), x2: X(0), y1: Y(ymin), y2: Y(ymax), class: "axis" }));
    const txt = (x, y, t, anchor) => { const e = s("text", { x, y, "text-anchor": anchor }); e.textContent = t; return e; };
    if (xlabel) svg.append(txt(X(xmax) - 2, Y(cl(0, ymin, ymax)) - 6, xlabel + " →", "end"));
    if (ylabel) svg.append(txt(X(cl(0, xmin, xmax)) + 6, Y(ymax) + 12, "↑ " + ylabel, "start"));
    const back = s("g"), layer = s("g"), front = s("g");
    svg.append(back, layer, front);
    svg.X = X; svg.Y = Y; svg.back = back; svg.layer = layer; svg.front = front;
    svg.inv = (evt) => {
      const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return [xmin + ((p.x - pad) / (W - 2 * pad)) * (xmax - xmin), ymin + ((H - pad - p.y) / (H - 2 * pad)) * (ymax - ymin)];
    };
    const draggable = (el, cb) => {
      el.classList.add("c-drag");
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        const mv = (ev) => { if (ev.pointerId !== e.pointerId) return; const [x, y] = svg.inv(ev); cb(cl(x, xmin, xmax), cl(y, ymin, ymax)); };
        const up = (ev) => { if (ev.pointerId !== e.pointerId) return; window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
        window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
      });
    };
    const label = (color, size) => { const t = s("text", {}); t.style.fill = color; t.style.fontFamily = "var(--mono)"; t.style.fontSize = size + "px"; return t; };
    // point: .move(x, y), .label(text), .pos = [x, y]
    svg.point = (x, y, { color = "#6cb4ff", label: lab = "", r = 6, dx = 9, dy = -8, drag } = {}) => {
      const g = s("g"); const c = s("circle", { r, fill: color }); const t = label(color, 14); t.textContent = lab;
      g.append(c, t); front.append(g);
      g.move = (px, py) => { g.pos = [px, py]; c.setAttribute("cx", X(px)); c.setAttribute("cy", Y(py)); t.setAttribute("x", X(px) + dx); t.setAttribute("y", Y(py) + dy); return g; };
      g.label = (s2) => (t.textContent = s2);
      g.move(x, y);
      if (drag) {
        const hit = s("circle", { r: r + 12, fill: "transparent" }); g.insertBefore(hit, c);
        const oldMove = g.move; g.move = (px, py) => { oldMove(px, py); hit.setAttribute("cx", X(px)); hit.setAttribute("cy", Y(py)); return g; };
        g.move(x, y);
        draggable(g, (px, py) => { const r2 = drag(px, py); const [nx, ny] = Array.isArray(r2) ? r2 : [px, py]; g.move(nx, ny); });
      }
      return g;
    };
    // arrow from (x0, y0) to (x, y): .set(x, y, x0?, y0?), .pos = [x, y]; drag moves the tip
    svg.arrow = ({ from = [0, 0], to = [1, 1], color = "#c3a6ff", label: lab = "", width = 2.5, at = 1, lx = 6, ly = -6, drag, layer: lyr } = {}) => {
      const g = s("g"); const ln = s("line", { stroke: color, "stroke-width": width }); const hd = s("polygon", { fill: color }); const t = label(color, 13);
      t.textContent = lab; g.append(ln, hd, t); (lyr || front).append(g);
      let f0 = from.slice();
      const hit = drag ? s("circle", { r: 16, fill: "transparent" }) : null;
      if (hit) g.append(hit);
      g.set = (x, y, x0 = f0[0], y0 = f0[1]) => {
        f0 = [x0, y0]; g.pos = [x, y];
        const ax = X(x0), ay = Y(y0), bx = X(x), by = Y(y);
        const len = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / len, uy = (by - ay) / len, hl = Math.min(10, len * 0.5);
        ln.setAttribute("x1", ax); ln.setAttribute("y1", ay); ln.setAttribute("x2", bx - ux * hl * 0.6); ln.setAttribute("y2", by - uy * hl * 0.6);
        hd.setAttribute("points", `${bx},${by} ${bx - ux * hl - uy * hl * 0.5},${by - uy * hl + ux * hl * 0.5} ${bx - ux * hl + uy * hl * 0.5},${by - uy * hl - ux * hl * 0.5}`);
        t.setAttribute("x", ax + (bx - ax) * at + lx); t.setAttribute("y", ay + (by - ay) * at + ly);
        if (hit) { hit.setAttribute("cx", bx); hit.setAttribute("cy", by); }
        return g;
      };
      g.label = (s2) => (t.textContent = s2);
      g.set(to[0], to[1]);
      if (drag) draggable(hit, (px, py) => { const r2 = drag(px, py); const [nx, ny] = Array.isArray(r2) ? r2 : [px, py]; g.set(nx, ny); });
      return g;
    };
    svg.line = (pts, color = "#6cb4ff", dash = "", w = 2) => {
      const d = pts.filter((p) => isFinite(p[0]) && isFinite(p[1])).map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join("");
      const path = s("path", { d, fill: "none", stroke: color, "stroke-width": w, "stroke-dasharray": dash === true ? "6 4" : dash });
      layer.append(path); return path;
    };
    svg.clear = () => (layer.innerHTML = "");
    return svg;
  }

  // Seeded RNG (mulberry32): r() in [0, 1); r.gauss() standard normal; r.int(n); r.pick(arr)
  function rng(seed = 1) {
    let a = seed >>> 0;
    const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    r.gauss = () => gauss(r);
    r.int = (n) => Math.floor(r() * n);
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    return r;
  }
  function gauss(r = Math.random) { const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  // Run stepFn(i) in chunks of perTick per setTimeout tick (keeps the page responsive while training).
  // Stops after `total` steps or when stepFn returns false. onTick(i) after each chunk, onDone(i) at the end.
  // Returns stop(); return it (or call it) from your step's cleanup.
  function chunked(stepFn, { perTick = 20, delay = 16, total = Infinity, onTick, onDone } = {}) {
    let i = 0, timer = null, stopped = false;
    const tick = () => {
      for (let k = 0; k < perTick && i < total; k++, i++) if (stepFn(i) === false) { i = total; break; }
      onTick && onTick(i);
      if (i < total && !stopped) timer = setTimeout(tick, delay); else if (!stopped) { stopped = true; onDone && onDone(i); }
    };
    timer = setTimeout(tick, 0);
    return () => { stopped = true; clearTimeout(timer); };
  }
  // trailing moving average over the last n values (same length as arr)
  function movingAvg(arr, n = 10) {
    let sum = 0;
    return arr.map((v, i) => { sum += v; if (i >= n) sum -= arr[i - n]; return sum / Math.min(i + 1, n); });
  }

  // ---------- engine ----------
  function run(lesson) {
    const key = "chemcourse:" + lesson.id;
    let st = JSON.parse(localStorage.getItem(key) || "null") || { done: [], cur: 0 };
    const save = () => localStorage.setItem(key, JSON.stringify(st));
    const fromHash = parseInt(location.hash.slice(1), 10);
    if (!isNaN(fromHash) && fromHash >= 1 && fromHash <= lesson.steps.length && canOpen(fromHash - 1)) st.cur = fromHash - 1;
    let cleanup = null;

    function canOpen(i) { return i === 0 || st.done.includes(i - 1) || st.done.includes(i); }
    function earnedUpTo(i) {
      const set = new Set();
      lesson.steps.forEach((stp, j) => { if (j < i || st.done.includes(j)) (stp.newConcepts || []).forEach((c) => set.add(c)); });
      return set;
    }

    const side = document.getElementById("side");
    const main = document.getElementById("main");

    function renderSide() {
      side.innerHTML = "";
      side.append(
        h("h1", {}, h("a", { href: "index.html", style: "color:inherit;text-decoration:none" }, "← Electrochemistry")),
        h("div", { class: "sub" }, lesson.section + " · " + lesson.title),
        h("h2", {}, "The ladder")
      );
      const ol = h("ol", { class: "ladder" });
      lesson.steps.forEach((stp, i) => {
        const cls = [st.done.includes(i) ? "done" : canOpen(i) ? "open" : "locked", i === st.cur ? "current" : ""].join(" ");
        ol.append(h("li", { class: cls, onclick: () => canOpen(i) && go(i) }, stp.short || stp.title));
      });
      side.append(ol, h("h2", {}, "Concepts you've earned"));
      const earned = earnedUpTo(st.cur);
      const cur = new Set(lesson.steps[st.cur].newConcepts || []);
      const box = h("div", { class: "concepts" });
      Object.entries(lesson.concepts).forEach(([k, label]) => {
        const cls = cur.has(k) ? "new" : earned.has(k) ? "earned" : "";
        box.append(h("span", { class: "chip " + cls, title: cls ? "" : "not yet" }, cls ? label : "· · ·"));
      });
      side.append(box);
      const reset = h("button", { style: "margin-top:26px;font-size:12px", onclick: () => { if (confirm("Reset progress for this lesson?")) { localStorage.removeItem(key); location.hash = ""; location.reload(); } } }, "Reset progress");
      side.append(reset);
    }

    function go(i) {
      st.cur = i; save();
      history.replaceState(null, "", location.pathname + location.search + "#" + (i + 1));
      render(); window.scrollTo(0, 0);
    }

    function render() {
      if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
      renderSide();
      try { localStorage.setItem("chemcourse:last", JSON.stringify({ id: lesson.id, step: st.cur })); } catch (e) {}
      const stp = lesson.steps[st.cur];
      main.innerHTML = "";
      main.append(h("div", { class: "crumb" }, `${lesson.section} · ${lesson.title} · step ${st.cur + 1} of ${lesson.steps.length}`));
      if (st.cur === 0 && course) {
        const me = course.lessons.find((l) => l.id === lesson.id);
        if (me && me.prereqs.length) {
          const b = h("div", { class: "buildson" }, "Builds on: ");
          me.prereqs.forEach((pid, k) => { const pl = course.lessons.find((l) => l.id === pid); b.append(k ? ", " : "", h("a", { href: "lesson.html?id=" + pid }, pl ? pl.title : pid)); });
          main.append(b);
        }
      }
      main.append(h("h2", { class: "step-title" }, stp.title));
      if (stp.newConcepts && stp.newConcepts.length) {
        const ni = h("div", { class: "newideas" }, "New ideas in this step:");
        stp.newConcepts.forEach((c) => ni.append(h("span", { class: "chip new" }, lesson.concepts[c])));
        main.append(ni);
      } else main.append(h("div", { class: "newideas" }, "No new ideas, just combining what you have."));
      const body = h("div", { class: "prose" });
      main.append(body);
      cleanup = stp.render(body, api) || null;
      if (st.cur === lesson.steps.length - 1 && lesson.sources && lesson.sources.length) {
        const ul = h("ul", { class: "sources" });
        lesson.sources.forEach((src) => ul.append(h("li", {}, src.url ? h("a", { href: src.url, target: "_blank", rel: "noopener" }, src.title) : src.title, src.note ? " — " + src.note : "")));
        main.append(h("details", { class: "sources-box" }, h("summary", {}, "Sources & further reading"), ul));
      }

      const isDone = st.done.includes(st.cur);
      const last = st.cur === lesson.steps.length - 1;
      const nextLesson = last && course ? course.lessons[course.lessons.findIndex((l) => l.id === lesson.id) + 1] : null;
      const next = h("button", { class: "primary", disabled: !isDone && !!stp.check, onclick: () => { if (!last) go(st.cur + 1); else location.href = nextLesson ? "lesson.html?id=" + nextLesson.id : "index.html"; } },
        !last ? "Next step →" : nextLesson ? "Next lesson: " + nextLesson.title + " →" : "Back to the course map");
      const prev = h("button", { onclick: () => go(st.cur - 1), style: st.cur === 0 ? "visibility:hidden" : "" }, "← Previous");

      if (stp.check) main.append(renderCheck(stp.check, isDone, () => {
        if (!st.done.includes(st.cur)) st.done.push(st.cur); save(); next.disabled = false; renderSide();
      }));
      else if (!isDone) { st.done.push(st.cur); save(); }
      main.append(h("div", { class: "nav" }, prev, next));
    }

    function renderCheck(c, already, onPass) {
      const fb = h("div", { class: "feedback" });
      const box = h("div", { class: "check" }, h("div", { class: "q", html: c.q }));
      const pass = (msg) => { fb.className = "feedback ok"; fb.innerHTML = "✓ " + (msg || c.why || "Right."); onPass(); };
      const fail = (extra) => {
        fb.className = "feedback bad";
        fb.innerHTML = "Not quite. " + (extra || c.hint || "") + (c.backTo != null ? ` <span class="back">If this feels shaky, revisit <a href="#" data-back>step ${c.backTo + 1}</a>.</span>` : "");
        const a = fb.querySelector("[data-back]"); if (a) a.onclick = (e) => { e.preventDefault(); go(c.backTo); };
      };
      if (c.type === "choice") {
        const opts = h("div", { class: "opts" });
        c.options.forEach((o, i) => {
          const b = h("button", { html: o, onclick: () => {
            opts.querySelectorAll("button").forEach((x) => x.classList.remove("wrong"));
            if (i === c.answer) { b.classList.add("right"); pass(); }
            else { b.classList.add("wrong"); fail(c.wrongHints && c.wrongHints[i]); }
          } });
          opts.append(b);
        });
        box.append(opts);
        if (already) { opts.children[c.answer].classList.add("right"); fb.className = "feedback ok"; fb.innerHTML = "✓ " + (c.why || "Done."); }
      } else {
        const inp = h("input", { class: "ans", placeholder: c.placeholder || "your answer" });
        const btn = h("button", { style: "margin-left:8px", onclick: () => {
          const v = parseFloat(inp.value.replace(/[−–]/g, "-").replace(",", ".").replace("%", ""));
          const target = c.answer, tol = c.tolerance ?? 0.01;
          if (isNaN(v)) return fail("Type a number.");
          if (Math.abs(v - target) <= tol || (c.alsoPercent && Math.abs(v / 100 - target) <= tol)) pass(); else fail();
        } }, "Check");
        inp.addEventListener("keydown", (e) => e.key === "Enter" && btn.click());
        box.append(h("div", {}, inp, btn));
        if (already) { inp.value = c.shown ?? c.answer; fb.className = "feedback ok"; fb.innerHTML = "✓ " + (c.why || "Done."); }
      }
      box.append(fb);
      return box;
    }

    const api = { go };
    let course = null;
    window.__lesson = lesson; window.__courseGo = go;
    fetch("course.json").then((r) => r.json()).then((c) => { course = c; render(); }).catch(() => render());
  }

  window.Course = { run, h, s, fmt, log2, surprise, widget, stat, slider, betSliders, barChart, plot, softmax,
    toggle, hbars, heatmap, plane, rng, gauss, chunked, movingAvg, fitText, isNarrow, narrow };
})();
