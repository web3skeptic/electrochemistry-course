// Lesson 3.2 — Lead: the rechargeable car battery
(function () {
  const { h, s, fmt, widget, stat, slider, toggle, hbars, plot, rng, narrow } = Course;
  const f = Chem.f, EL = Chem.elements;
  const YEL = "#ffd166", RED = "#ff6b6b", BLUE = "#6cb4ff", GRN = "#5fd38d", PUR = "#c3a6ff", MUTED = "#9aa3b5", TEXT = "#e6e9ef", DARK = "#12151c";
  const C_PB = "#8d97a8", C_PBO2 = "#6b4433", C_SULF = "#ece8da", C_WATER = "#bfe9f5";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const statusBox = () => h("div", { class: "la-status" });

  // ---- chemistry data (all from Chem) ----
  const M = {
    Pb: EL.Pb.mass,
    PbO2: EL.Pb.mass + 2 * EL.O.mass,
    H2SO4: 2 * EL.H.mass + EL.S.mass + 4 * EL.O.mass,
    PbSO4: EL.Pb.mass + EL.S.mass + 4 * EL.O.mass,
    H2O: 2 * EL.H.mass + EL.O.mass,
  };
  const E_NEG = Chem.E0by.PbSO4.E, E_POS = Chem.E0by.PbO2.E;   // −0.36 V and +1.69 V
  const E_CELL = +(E_POS - E_NEG).toFixed(2);                    // 2.05 V
  const HALF_NEG = f("Pb + SO4^2- -> PbSO4 + 2e-"), HALF_POS = f("PbO2 + SO4^2- + 4H^+ + 2e- -> PbSO4 + 2H2O");
  const HALF_NEG_R = f("PbSO4 + 2e- -> Pb + SO4^2-"), HALF_POS_R = f("PbSO4 + 2H2O -> PbO2 + SO4^2- + 4H^+ + 2e-");

  // ---- the running example: one cell of a 60 Ah car battery ----
  const CAP = 60;                       // Ah
  const RHO_FULL = 1.28, RHO_FLAT = 1.12;   // g/mL, typical textbook values for a car battery
  const rho = (soc) => RHO_FLAT + (RHO_FULL - RHO_FLAT) * soc;
  const ocv = (soc) => rho(soc) + 0.84;     // rule of thumb for a rested cell, volts
  const wtPct = (soc) => 17 + 20 * soc;      // % H2SO4 by mass (17% ↔ 1.12 g/mL, 37% ↔ 1.28 g/mL)
  const molarity = (soc) => (10 * wtPct(soc) * rho(soc)) / M.H2SO4;
  const WATER_PER_AH = (3600 / Chem.F / 2) * M.H2O;            // g of water split per Ah of overcharge (0.336)
  const GAS_L_PER_AH = (3600 / Chem.F) * 0.75 * 24.5;          // litres of H2 + O2 per Ah at room temperature
  const I_CHARGE = 6, I_LOAD = 10;      // A

  // share of the charging current that goes into splitting water (toy curve: none below 75% full, all of it at 100%)
  const gasFrac = (x) => { const u = clamp((x - 0.75) / 0.25, 0, 1); return u * u; };
  // one time-step of charging. b = { q (Ah stored), cap (Ah still usable), gasAh }
  function chargeTick(b, dt, smart) {
    const x = b.cap > 0.5 ? b.q / b.cap : 1, g = gasFrac(x);
    let I = I_CHARGE;
    if (smart && g > 0.45) I = I_CHARGE * Math.pow((1 - g) / 0.55, 2);
    if (smart && I < 0.3) return { done: true, V: ocv(b.q / CAP), gas: 0, I: 0 };
    const dq = Math.min(Math.max(0, b.cap - b.q), (1 - g) * I * dt);
    b.q += dq; b.gasAh += I * dt - dq;
    const V = ocv(b.q / CAP) + 0.10 + 0.42 * g;
    return { done: false, V: smart ? Math.min(2.4, V) : V, gas: g * I / I_CHARGE, I };
  }
  // one week of standing idle. b = { soc, hard } as fractions of the original capacity
  function storeWeek(b) {
    b.soc *= 0.988;                                   // self-discharge, about 5% a month
    const soft = Math.max(0, 1 - b.soc - b.hard);
    b.hard = Math.min(1, b.hard + soft / 12);          // toy rate: soft sulfate hardens with a 12-week time constant
  }

  const style = h("style", {}, `
    .la-status { min-height:46px; margin-top:10px; padding:8px 12px; border-left:3px solid var(--blue); background:var(--panel2); border-radius:6px; font-size:15px; line-height:1.45; }
    .la-status.warn { border-left-color:var(--red); }
    .la-legend { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:8px; font-size:13px; }
    .la-legend i { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:5px; }
    .la-cards { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; }
    .la-card { border:2px solid var(--line); border-radius:10px; padding:8px 6px 10px; text-align:center; opacity:.5; cursor:pointer; transition:opacity .2s, border-color .2s; }
    .la-card.on { opacity:1; border-color:var(--yellow); }
    .la-card .sw { height:30px; border-radius:6px; margin-bottom:6px; border:1px solid #0006; }
    .la-card .fm { font-size:19px; font-weight:600; }
    .la-card .nm { font-size:12.5px; color:var(--muted); line-height:1.25; min-height:32px; }
    .la-card .ox { font:600 22px var(--mono); color:var(--yellow); }
    .la-card .oxl { font-size:11.5px; color:var(--muted); }
    .la-eq { display:block; }
    @media (max-width:600px) { .la-eq { font-size:15px; } .la-status { font-size:14px; } }
  `);
  const legend = (extra) => h("div", { class: "note la-legend", html:
    `<span><i style="background:${YEL}"></i>electron</span><span><i style="background:${BLUE}"></i>${f("SO4^2-")} (sulfate)</span><span><i style="background:${RED}"></i>${f("H^+")}</span><span><i style="background:${C_WATER}"></i>new water</span>` +
    `<span><i style="background:${C_SULF};border-radius:2px"></i>${f("PbSO4")} on a plate</span>${extra ? `<span>${extra}</span>` : ""}` });

  // =====================================================================================
  // The cell drawing: two plates in one pot of sulfuric acid, a wire with a lamp or charger,
  // electrons that travel along the wire, ions that drift to the plates, bubbles when gassing.
  // =====================================================================================
  function leadCell(o = {}) {
    const W = 400, H = 306, XL = 95, XR = 305, PW = 34, PT = 68, PB = 252, WY = 38;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:540px" });
    const layer = () => { const g = s("g"); svg.append(g); return g; };
    const gLiq = layer(), gPl = layer(), gIon = layer(), gBub = layer(), gGlass = layer(), gWire = layer(), gE = layer(), gTxt = layer();
    const rnd = rng(o.seed || 11);
    const st = { neg: 0, pos: 0, hard: 0, soc: o.soc == null ? 1 : o.soc, mode: "rest", device: o.device || "bulb", gas: 0, level: 0, flow: "", roleL: "", roleR: "", meter: "" };
    let ions = [], els = [], bubs = [], tickN = 0, side = 1, hIn = 0, glow = 0.08, pulseT = 0, wireKey = "", bulbEl = null, timer = null;

    function T(g, x, y, str, a = {}) {
      const t = s("text", { x, y, "text-anchor": a.anchor || "middle", style: `font-size:${a.size || 12}px;fill:${a.fill || TEXT};font-weight:${a.weight || 400}` });
      t.textContent = str; g.append(t); return t;
    }
    const yTop = () => 140 + st.level * 72;

    // statics
    const liq = s("rect", { x: 46, y: 140, width: 308, height: 130, fill: "#7fb0e8", opacity: 0.2 }); gLiq.append(liq);
    gGlass.append(s("path", { d: "M44 116 V272 H356 V116", fill: "none", stroke: "#6b7689", "stroke-width": 2 }));
    const mkPlate = (cx, col, label, lcol) => {
      gPl.append(s("rect", { x: cx - PW / 2, y: PT, width: PW, height: PB - PT, rx: 2, fill: col }));
      const ov = s("rect", { x: cx - PW / 2, y: 132, width: PW, height: PB - 132, rx: 2, fill: C_SULF, opacity: 0, style: "transition:opacity .5s" }); gPl.append(ov);
      const cr = [];
      for (let i = 0; i < 14; i++) {
        const x = cx - PW / 2 + 5 + (i % 3) * 12 + (rnd() - 0.5) * 3, y = 150 + Math.floor(i / 3) * 21 + rnd() * 8, d = 5 + rnd() * 2.5;
        const c = s("path", { d: `M${x} ${y - d} L${x + d} ${y} L${x} ${y + d} L${x - d} ${y} Z`, fill: "#fff", stroke: "#3a3f4a", "stroke-width": 1.1, style: "display:none" });
        gPl.append(c); cr.push(c);
      }
      T(gPl, cx, 86, label, { size: 11.5, fill: lcol, weight: 700 });
      return { ov, cr };
    };
    const pl = { L: mkPlate(XL, C_PB, "Pb", DARK), R: mkPlate(XR, C_PBO2, f("PbO2"), "#f1e4d8") };
    T(gTxt, XL - 31, 92, "−", { size: 22, weight: 700 }); T(gTxt, XR + 31, 92, "+", { size: 20, weight: 700 });
    const capL = T(gTxt, XL + 12, 289, "", { size: 11.5, fill: MUTED }), capR = T(gTxt, XR - 12, 289, "", { size: 11.5, fill: MUTED });
    const roleL = T(gTxt, XL + 12, 303, "", { size: 11.5, fill: YEL, weight: 600 }), roleR = T(gTxt, XR - 12, 303, "", { size: 11.5, fill: YEL, weight: 600 });

    function drawWire() {
      const key = st.device + "|" + st.flow + "|" + st.meter;
      if (key === wireKey) return;
      wireKey = key; gWire.innerHTML = ""; bulbEl = null;
      const cx = W / 2, col = "#b9c2d3";
      const line = (x1, y1, x2, y2) => gWire.append(s("line", { x1, y1, x2, y2, stroke: col, "stroke-width": 2.5, "stroke-linecap": "round" }));
      line(XL, PT, XL, WY); line(XR, PT, XR, WY);
      if (st.device === "open") {
        line(XL, WY, cx - 26, WY); line(cx + 26, WY, XR, WY);
        T(gWire, cx, WY + 4, "open", { size: 11, fill: MUTED });
      } else {
        line(XL, WY, XR, WY);
        if (st.device === "bulb") {
          bulbEl = s("circle", { cx, cy: WY, r: 13, fill: YEL, "fill-opacity": glow, stroke: col, "stroke-width": 1.5 }); gWire.append(bulbEl);
          T(gWire, cx, WY + 28, "lamp", { size: 10.5, fill: MUTED });
        } else if (st.device === "charger") {
          gWire.append(s("rect", { x: cx - 40, y: WY - 14, width: 80, height: 28, rx: 5, fill: "#212734", stroke: GRN, "stroke-width": 1.5 }));
          T(gWire, cx, WY + 4.5, st.meter || "charger", { size: 12, fill: GRN, weight: 700 });
          T(gWire, cx - 50, WY - 5, "−", { size: 13, fill: MUTED }); T(gWire, cx + 50, WY - 5, "+", { size: 12, fill: MUTED });
          T(gWire, cx, WY + 28, "charger", { size: 10.5, fill: MUTED });
        }
      }
      if (st.flow) T(gWire, cx, 13, st.flow, { size: 12, fill: YEL, weight: 600 });
    }
    const pctS = (x) => Math.round(clamp(x, 0, 1) * 100) + "%";
    function redraw() {
      const yt = yTop();
      liq.setAttribute("y", yt); liq.setAttribute("height", 270 - yt); liq.setAttribute("opacity", (0.07 + 0.24 * clamp(st.soc, 0, 1)).toFixed(3));
      pl.L.ov.setAttribute("opacity", (0.92 * clamp(st.neg, 0, 1)).toFixed(3)); pl.R.ov.setAttribute("opacity", (0.92 * clamp(st.pos, 0, 1)).toFixed(3));
      const nh = Math.round(clamp(st.hard, 0, 1) * 14);
      for (const p of [pl.L, pl.R]) p.cr.forEach((c, i) => (c.style.display = i < nh ? "" : "none"));
      capL.textContent = `Pb ${pctS(1 - st.neg)} · ${f("PbSO4")} ${pctS(st.neg)}`;
      capR.textContent = `${f("PbO2")} ${pctS(1 - st.pos)} · ${f("PbSO4")} ${pctS(st.pos)}`;
      roleL.textContent = st.roleL || ""; roleR.textContent = st.roleR || "";
      drawWire();
    }

    // particles
    const place = (p) => p.g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    function mkIon(kind, x, y) {
      const K = kind === "S" ? { r: 9.5, fill: BLUE, t: "SO₄", fs: 7.2 } : kind === "H" ? { r: 5.5, fill: RED, t: "H⁺", fs: 6.6 } : { r: 4.5, fill: C_WATER, t: "", fs: 0 };
      const g = s("g"); g.append(s("circle", { r: K.r, fill: K.fill }));
      if (K.t) { const t = s("text", { "text-anchor": "middle", dy: "0.36em", style: `font-size:${K.fs}px;font-weight:700;fill:${DARK}` }); t.textContent = K.t; g.append(t); }
      const p = { kind, r: K.r, g, x, y, vx: (rnd() - 0.5) * 1.2, vy: (rnd() - 0.5) * 1.2, to: null, life: 70 };
      gIon.append(g); ions.push(p); place(p); return p;
    }
    const nTarget = () => Math.round(2 + 8 * clamp(st.soc, 0, 1));
    function populate() {
      ions.forEach((p) => p.g.remove()); ions = [];
      const n = nTarget(), yt = yTop() + 12;
      for (let i = 0; i < n; i++) mkIon("S", 128 + rnd() * 144, yt + rnd() * (258 - yt));
      for (let i = 0; i < 2 * n; i++) mkIon("H", 126 + rnd() * 148, yt + rnd() * (260 - yt));
    }
    function sync() {
      const n = nTarget(), yt = yTop() + 16;
      const ry = () => yt + rnd() * (244 - yt);
      const S = ions.filter((p) => p.kind === "S" && !p.to), Hh = ions.filter((p) => p.kind === "H" && !p.to);
      if (S.length > n) { side = -side; S[S.length - 1].to = [side < 0 ? XL + 20 : XR - 20, ry()]; }
      else if (S.length < n) { side = -side; const p = mkIon("S", side < 0 ? XL + 27 : XR - 27, ry()); p.vx = -side * 1; }
      for (let k = 0; k < 2; k++) {
        if (Hh.length - k > 2 * n) Hh[Hh.length - 1 - k].to = [XR - 20, ry()];
        else if (Hh.length + k < 2 * n) { const p = mkIon("H", XR - 24, ry()); p.vx = -1.1; }
      }
    }
    function posOnWire(u) {   // u = distance along the wire from the top of the left plate
      const a = PT - WY, b = XR - XL;
      if (u < a) return [XL, PT - u];
      if (u < a + b) return [XL + (u - a), WY];
      return [XR, WY + (u - a - b)];
    }
    const WLEN = 2 * (PT - WY) + (XR - XL);
    function addElectron(dir, delay) {
      const g = s("circle", { r: 4, fill: YEL, stroke: DARK, "stroke-width": 0.7, style: "display:none" });
      gE.append(g); els.push({ g, u: dir > 0 ? 0 : WLEN, dir, wait: delay || 0 });
    }
    function tick() {
      tickN++;
      const yt = yTop() + 10;
      // electrons
      if (st.device !== "open" && (st.mode === "discharge" || st.mode === "charge") && tickN % 7 === 0) addElectron(st.mode === "discharge" ? 1 : -1, 0);
      els = els.filter((e) => {
        if (e.wait > 0) { e.wait--; return true; }
        e.u += e.dir * 5.5;
        if (e.u < 0 || e.u > WLEN) { e.g.remove(); return false; }
        const [x, y] = posOnWire(e.u); e.g.style.display = st.device === "charger" && y === WY && Math.abs(x - W / 2) < 44 ? "none" : ""; e.g.setAttribute("cx", x.toFixed(1)); e.g.setAttribute("cy", y.toFixed(1)); return true;
      });
      // lamp
      if (pulseT > 0) pulseT--;
      const want = st.device === "bulb" && (st.mode === "discharge" || pulseT > 0) ? 0.9 : 0.08;
      glow += (want - glow) * 0.2;
      if (bulbEl) bulbEl.setAttribute("fill-opacity", glow.toFixed(2));
      // ions
      if (tickN % 3 === 0) sync();
      ions = ions.filter((p) => {
        if (p.kind === "W") {
          p.life--; p.x += p.vx; p.y += p.vy; p.g.setAttribute("opacity", (Math.max(0, p.life) / 70).toFixed(2));
          if (p.life <= 0) { p.g.remove(); return false; }
        } else if (p.to) {
          const dx = p.to[0] - p.x, dy = p.to[1] - p.y, d = Math.hypot(dx, dy);
          if (d < 3.2) {
            if (p.kind === "H" && ++hIn % 2 === 0) { const w = mkIon("W", XR - 24, p.y); w.vx = -0.7 - rnd() * 0.5; w.vy = (rnd() - 0.5) * 0.5; }
            p.g.remove(); return false;
          }
          p.x += (dx / d) * 3; p.y += (dy / d) * 3;
        } else {
          p.vx = clamp(p.vx + (rnd() - 0.5) * 0.35, -1, 1); p.vy = clamp(p.vy + (rnd() - 0.5) * 0.35, -1, 1);
          p.x += p.vx; p.y += p.vy;
          const x0 = XL + PW / 2 + p.r + 2, x1 = XR - PW / 2 - p.r - 2, y0 = yt + p.r, y1 = 268 - p.r;
          if (p.x < x0) { p.x = x0; p.vx = Math.abs(p.vx); } if (p.x > x1) { p.x = x1; p.vx = -Math.abs(p.vx); }
          if (p.y < y0) { p.y = Math.min(y0, p.y + 3); p.vy = Math.abs(p.vy); } if (p.y > y1) { p.y = y1; p.vy = -Math.abs(p.vy); }
        }
        place(p); return true;
      });
      // bubbles: hydrogen at the negative plate (twice as many), oxygen at the positive plate
      if (st.gas > 0.02) {
        const mk = (x, big) => { const g = s("circle", { cx: x, cy: 0, r: big ? 4 : 3, fill: "none", stroke: "#dbe4f3", "stroke-width": 1.2 }); gBub.append(g); bubs.push({ g, x, y: 190 + rnd() * 58 }); };
        if (rnd() < st.gas * 0.6) mk(XL + PW / 2 + 5 + rnd() * 6, false);
        if (rnd() < st.gas * 0.3) mk(XR - PW / 2 - 5 - rnd() * 6, true);
      }
      bubs = bubs.filter((b) => {
        b.y -= 2.2; b.x += (rnd() - 0.5) * 1.2;
        if (b.y < yTop()) { b.g.remove(); return false; }
        b.g.setAttribute("cx", b.x.toFixed(1)); b.g.setAttribute("cy", b.y.toFixed(1)); return true;
      });
    }

    const cell = {
      svg,
      set(patch) { Object.assign(st, patch); redraw(); return cell; },
      reset(patch) { Object.assign(st, patch); els.forEach((e) => e.g.remove()); els = []; bubs.forEach((b) => b.g.remove()); bubs = []; populate(); redraw(); return cell; },
      pulse(n, dir) { for (let i = 0; i < n; i++) addElectron(dir, i * 6); pulseT = 45; },
      stop() { clearInterval(timer); },
    };
    populate(); redraw();
    timer = setInterval(tick, 33);
    return cell;
  }

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "One metal, three states",
    short: "One metal, three states",
    newConcepts: ["states"],
    render(el) {
      el.append(style,
        P("In 1859 the French physicist Gaston Planté rolled two sheets of lead into a jar of dilute sulfuric acid, charged them, and got current back out. Then he charged them again. It was the first <em>secondary cell</em> (from <em>Zinc</em>: a cell you can recharge), and its descendants still start most cars."),
        P("Every battery so far paired two different elements: zinc gives, copper or manganese takes. Planté's cell uses <b>one element for both jobs</b>. Lead sits in group 14 with four outer electrons, and it is comfortable having given away none of them, two, or all four. Those are three <em>oxidation numbers</em> (from <em>Oxidation and reduction</em>: the charge an atom would carry if shared electrons went to the stronger puller): 0, +2 and +4."),
        P("Each state is a different solid. Walk lead through them:")
      );
      const DATA = [
        { fm: "Pb", nm: "lead metal", col: C_PB, ox: "0", txt: `<b>Lead metal</b>: soft, grey, conducts electrons. A pure element always has oxidation number 0. All four outer electrons are still there, and lead is willing to give two away.` },
        { fm: f("PbSO4"), nm: "lead sulfate", col: C_SULF, ox: "+2", txt: `<b>Lead sulfate</b>: a white salt of ${f("Pb^2+")} and ${f("SO4^2-")} ions. The charges must add to zero: Pb + (−2) = 0, so lead is <b>+2</b>. It hardly dissolves in water or acid, and it does not conduct electrons.` },
        { fm: f("PbO2"), nm: "lead dioxide", col: C_PBO2, ox: "+4", txt: `<b>Lead dioxide</b>: a dark brown solid that, unusually for an oxide, conducts electrons. Each oxygen counts −2: Pb + 2 × (−2) = 0, so lead is <b>+4</b>. All four outer electrons are gone and lead badly wants two back: a strong <em>oxidising agent</em>.` },
      ];
      let k = 0;
      const cards = h("div", { class: "la-cards" });
      const cardEls = DATA.map((d, i) => {
        const c = h("div", { class: "la-card", onclick: () => { k = i; draw(); } },
          h("div", { class: "sw", style: `background:${d.col}` }), h("div", { class: "fm" }, d.fm), h("div", { class: "nm" }, d.nm),
          h("div", { class: "ox" }, d.ox.replace("-", "−")), h("div", { class: "oxl" }, "oxidation number of Pb"));
        cards.append(c); return c;
      });
      // outer shell picture
      const svg = s("svg", { viewBox: "0 0 400 112", width: "100%", style: "display:block;margin:10px auto 0;max-width:520px" });
      const dots = [];
      svg.append(s("circle", { cx: 200, cy: 56, r: 44, fill: "none", stroke: "#4a5568", "stroke-width": 1.5, "stroke-dasharray": "4 4" }));
      svg.append(s("circle", { cx: 200, cy: 56, r: 22, fill: C_PB }));
      const nuc = s("text", { x: 200, y: 61, "text-anchor": "middle", style: `font-size:14px;font-weight:700;fill:${DARK}` }); nuc.textContent = "Pb"; svg.append(nuc);
      [[200, 12], [244, 56], [200, 100], [156, 56]].forEach(([x, y]) => { const c = s("circle", { cx: x, cy: y, r: 6.5, fill: YEL, stroke: YEL, "stroke-width": 1.5 }); svg.append(c); dots.push(c); });
      const tl = s("text", { x: 138, y: 60, "text-anchor": "end", style: `font-size:12.5px;fill:${MUTED}` }); svg.append(tl);
      const tr = s("text", { x: 262, y: 60, "text-anchor": "start", style: `font-size:12.5px;fill:${YEL}` }); svg.append(tr);
      const status = statusBox();
      const bUp = h("button", { class: "primary", onclick: () => { if (k < 2) k++; draw(); } }, "Take 2 electrons away (oxidise)");
      const bDn = h("button", { onclick: () => { if (k > 0) k--; draw(); } }, "Give 2 electrons back (reduce)");
      function draw() {
        cardEls.forEach((c, i) => c.classList.toggle("on", i === k));
        dots.forEach((d, i) => d.setAttribute("fill", i < 4 - 2 * k ? YEL : "none"));
        tl.textContent = `outer shell: ${4 - 2 * k} of 4`;
        tr.textContent = `given away: ${2 * k}`;
        status.innerHTML = DATA[k].txt;
        bUp.disabled = k === 2; bDn.disabled = k === 0;
      }
      el.append(widget("Lead's three states (click a card or use the buttons)", cards, svg,
        h("div", { class: "note", style: "text-align:center;font-size:12.5px" }, "outer shell only (simple shell model)"),
        h("div", { class: "btns" }, bUp, bDn), status));
      draw();
      el.append(
        P("Look at the two ends. Lead metal can give two electrons. Lead dioxide wants two. And both of them land on the same middle state, lead sulfate. A giver, a taker and one shared product: that is a complete battery made from a single metal."),
        takeaway(`Lead has three oxidation states: Pb (0), ${f("PbSO4")} (+2) and ${f("PbO2")} (+4). The battery pairs the two outer ones.`)
      );
    },
    check: {
      type: "number", q: `A lead atom starts in ${f("PbO2")} and ends up in ${f("PbSO4")}. How many electrons did it gain?`,
      answer: 2, tolerance: 0.01, hint: "Its oxidation number goes from +4 to +2. Each electron gained lowers it by one.",
      why: "2. From +4 down to +2 is a gain of two electrons: a reduction.",
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "Discharge: both plates turn into lead sulfate",
    short: "Discharge",
    newConcepts: ["negplate", "posplate"],
    render(el) {
      el.append(style,
        P(`Build the cell. Two plates stand in sulfuric acid, ${f("H2SO4")} dissolved in water. An <em>acid</em> (from <em>The activity series</em>) releases ${f("H^+")} ions; here each ${f("H2SO4")} gives two ${f("H^+")} and one sulfate ion ${f("SO4^2-")}. (In acid this strong, many sulfates still hold on to one ${f("H^+")}. The bookkeeping comes out the same, so we use the simple picture.)`),
        P(`<b>Negative plate: spongy lead.</b> A lead atom gives two electrons to the wire and becomes ${f("Pb^2+")}. A sulfate ion grabs it at once, and because lead sulfate does not dissolve, it stays stuck to the plate:`),
        formula(`<span class="bl la-eq">${HALF_NEG}</span><small>lead: 0 → +2 (oxidation)</small>`),
        P(`<b>Positive plate: lead dioxide.</b> The two electrons arrive through the wire. Lead drops from +4 to +2, its two oxygens leave with four ${f("H^+")} as water, and again a sulfate ion locks the lead in place:`),
        formula(`<span class="hl la-eq">${HALF_POS}</span><small>lead: +4 → +2 (reduction)</small>`)
      );
      const N = 4;
      let units = 0, auto = null;
      const cell = leadCell({ device: "bulb", seed: 5 });
      const sE = stat("electrons through the lamp", "y"), sS = stat("sulfate ions left", "b"), sH = stat("H+ ions left", "r");
      const status = statusBox();
      function show(msg) {
        const x = units / N;
        cell.set({ neg: x, pos: x, soc: 1 - x, flow: units ? "electrons →" : "", roleL: units ? "anode: lead oxidised" : "", roleR: units ? "cathode: lead reduced" : "" });
        sE.set(String(2 * units)); sS.set(String(10 - 2 * units)); sH.set(String(20 - 4 * units));
        status.innerHTML = msg || (units === 0
          ? `Fully charged: grey lead on the left, brown lead dioxide on the right, 10 ${f("SO4^2-")} and 20 ${f("H^+")} in the acid (the charges cancel). Press the button.`
          : units < N ? `Two electrons went left → right through the lamp. Each plate took one ${f("SO4^2-")}; the dioxide plate also took four ${f("H^+")} and released two water molecules. Both plates are a little whiter.`
          : `Flat. Both plates are coated in the same white ${f("PbSO4")}: two identical plates cannot push electrons anywhere. Only a few ions are left in the acid.`);
      }
      const pass = () => { if (units < N) { units++; cell.pulse(2, 1); show(); } else show(); };
      const stopAuto = () => { if (auto) clearInterval(auto); auto = null; };
      el.append(widget("One lead–acid cell, a lamp in the wire",
        cell.svg, legend("the picture counts single ions; a real plate does this about 10²³ times"),
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => { stopAuto(); pass(); } }, "Pass 2 electrons"),
          h("button", { onclick: () => { stopAuto(); pass(); auto = setInterval(() => { if (units >= N) stopAuto(); else pass(); }, 1300); } }, "Run until flat"),
          h("button", { onclick: () => { stopAuto(); units = 0; cell.reset({ soc: 1 }); show(); } }, "Recharge (reset)")),
        h("div", { class: "readout" }, sE, sS, sH), status));
      show();
      el.append(
        P(`Oxidation at the lead plate makes it the <em>anode</em>; reduction at the dioxide plate makes it the <em>cathode</em> (both from <em>The galvanic cell</em>). Notice what is missing: a <em>salt bridge</em>. The Daniell cell needed one to keep ${f("Cu^2+")} away from the zinc. Here the giver, the taker and the product are all solids stuck to their own plates, so one pot of acid serves both.`),
        takeaway(`On discharge both plates turn into ${f("PbSO4")}: Pb is oxidised (0 → +2) at the negative plate, ${f("PbO2")} is reduced (+4 → +2) at the positive plate.`)
      );
      return () => { stopAuto(); cell.stop(); };
    },
    check: {
      type: "choice", q: "While the lamp is lit, which way do the electrons travel?",
      options: [`Through the wire, from the ${f("PbO2")} plate to the Pb plate`, `Through the wire, from the Pb plate to the ${f("PbO2")} plate`, "Through the acid, carried by the sulfate ions"],
      answer: 1,
      wrongHints: {
        0: `${f("PbO2")} is the taker: its lead goes from +4 to +2, so it receives electrons. They must come from the plate that gives.`,
        2: "Ions carry the charge inside the acid, but electrons themselves never swim through a solution. They take the wire.",
      },
      why: `From Pb to ${f("PbO2")}: lead metal is oxidised and releases the electrons (anode, negative), lead dioxide is reduced and receives them (cathode, positive).`,
      backTo: 0,
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "The acid is a reactant",
    short: "The acid is used up",
    newConcepts: ["overall"],
    render(el) {
      const full = (CAP * 3600) / Chem.F;
      el.append(style,
        P("Add the two half-reactions. Two electrons are given, two are taken, so they cancel (n = 2, the <em>electrons transferred</em> from <em>Balancing redox equations</em>):"),
        formula(`<span class="la-eq">${f("Pb + PbO2 + 2SO4^2- + 4H^+ -> 2PbSO4 + 2H2O")}</span><small>${f("2SO4^2- + 4H^+")} is just two dissolved ${f("H2SO4")}:</small><span class="la-eq">Pb + ${f("PbO2")} + <span class="hl">${f("2H2SO4")}</span> → ${f("2PbSO4")} + <span class="bl">${f("2H2O")}</span></span>`),
        P(`Read the left side again. <b>The acid is not a bystander. It is a reactant.</b> In the Daniell cell sulfate was a <em>spectator ion</em>, and in the alkaline cell the ${f("OH^-")} used at one electrode came back at the other. Here every two electrons through the wire remove two ${f("H2SO4")} from the liquid and put two ${f("H2O")} in. The acid gets thinner as the cell runs.`),
        P("Put numbers on it with the chain from <em>Charge, energy and capacity</em>: ampere-hours → coulombs → moles of electrons (÷ 96 485) → moles and grams of everything else. Our running example from here on is <b>one cell of a 60 Ah car battery</b>.")
      );
      const labels = ["Pb used (− plate)", `${f("PbO2")} used (+ plate)`, `${f("H2SO4")} used (acid)`, `${f("PbSO4")} formed (both plates)`, `${f("H2O")} formed`];
      const bars = hbars(labels, { max: 700, fmtv: (v) => v.toFixed(0) + " g", labelWidth: "44%" });
      const cols = [C_PB, "#a06a52", YEL, C_SULF, BLUE];
      const sQ = stat("charge", ""), sN = stat("mol of electrons", "y"), sA = stat("mol H2SO4 used", "y"), sW = stat("mol PbSO4 formed", "");
      const upd = (ah) => {
        const ne = (ah * 3600) / Chem.F;
        bars.update([ne / 2 * M.Pb, ne / 2 * M.PbO2, ne * M.H2SO4, ne * M.PbSO4, ne * M.H2O], cols);
        sQ.set(Math.round(ah * 3600).toLocaleString("en-US").replace(/,/g, " ") + " C"); sN.set(ne.toFixed(2)); sA.set(ne.toFixed(2)); sW.set(ne.toFixed(2));
      };
      el.append(widget("What one cell consumes and produces as it delivers charge",
        slider({ name: "charge delivered", min: 0, max: CAP, step: 1, value: 20, fmtv: (v) => v + " Ah", oninput: upd, nameWidth: 130 }),
        bars, h("div", { class: "readout" }, sQ, sN, sA, sW)));
      upd(20);
      el.append(
        P(`Slide to the full 60 Ah: ${full.toFixed(2)} mol of electrons turn ${(full / 2 * M.Pb).toFixed(0)} g of lead, ${(full / 2 * M.PbO2).toFixed(0)} g of lead dioxide and ${(full * M.H2SO4).toFixed(0)} g of sulfuric acid into ${(full * M.PbSO4).toFixed(0)} g of lead sulfate and ${(full * M.H2O).toFixed(0)} g of water. One acid molecule disappears for every electron that goes round.`),
        takeaway(`Overall: Pb + ${f("PbO2")} + ${f("2H2SO4")} → ${f("2PbSO4")} + ${f("2H2O")}, with n = 2. Discharging uses up sulfuric acid and makes water.`)
      );
    },
    check: {
      type: "number", q: `A lead–acid cell pushes <b>1 mol of electrons</b> through a lamp. How many moles of ${f("H2SO4")} disappear from its acid?`,
      answer: 1, tolerance: 0.01,
      hint: `The overall equation uses ${f("2H2SO4")} for every 2 electrons.`,
      why: `1 mol. Two ${f("H2SO4")} per two electrons: one at each plate, so one acid molecule per electron.`,
      backTo: 1,
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "Two volts per cell, six cells in a row",
    short: "2 V × 6 = 12 V",
    newConcepts: ["cellv", "series"],
    render(el) {
      el.append(style,
        P(`How hard does this cell push? Both half-reactions are rungs on the <em>potential ladder</em> (from <em>Electrode potentials</em>): ${f("PbSO4")}/Pb at ${E_NEG.toFixed(2).replace("-", "−")} V and ${f("PbO2")}/${f("PbSO4")} at +${E_POS.toFixed(2)} V. Electrons fall from the upper rung to the lower one:`),
        formula(`E°<sub>cell</sub> = E°<sub>cathode</sub> − E°<sub>anode</sub> = ${E_POS.toFixed(2)} − (−${Math.abs(E_NEG).toFixed(2)}) = <span class="hl">${E_CELL.toFixed(2)} V</span>`)
      );
      // --- ladder
      const RUNGS = [
        { id: "Zn", lab: f("Zn^2+") + " / Zn" }, { id: "PbSO4", lab: f("PbSO4") + " / Pb" }, { id: "H", lab: f("H^+") + " / " + f("H2") },
        { id: "Cu", lab: f("Cu^2+") + " / Cu" }, { id: "PbO2", lab: f("PbO2") + " / " + f("PbSO4") },
      ];
      const lsvg = s("svg", { viewBox: "48 0 284 196", width: "100%", style: "display:block;margin:0 auto;max-width:520px" });
      const Y = (E) => 22 + ((E + 0.9) / 2.8) * 158;
      const PAIRS = [["Zn", "Cu", "Daniell cell"], ["PbSO4", "PbO2", "lead–acid cell"]];
      const sDrop = stat("drop = cell voltage", "y");
      function drawLadder(k) {
        lsvg.innerHTML = "";
        const [a, c] = PAIRS[k];
        RUNGS.forEach((r) => {
          const E = Chem.E0by[r.id].E, on = r.id === a || r.id === c, y = Y(E), col = on ? YEL : "#5b6577";
          lsvg.append(s("line", { x1: 150, x2: 262, y1: y, y2: y, stroke: col, "stroke-width": on ? 3 : 1.5 }));
          const t1 = s("text", { x: 142, y: y + 4, "text-anchor": "end", style: `font-size:12.5px;fill:${on ? TEXT : MUTED};font-weight:${on ? 600 : 400}` }); t1.textContent = r.lab;
          const t2 = s("text", { x: 270, y: y + 4, "text-anchor": "start", style: `font-size:12.5px;fill:${on ? YEL : MUTED}` }); t2.textContent = (E > 0 ? "+" : E < 0 ? "−" : "") + Math.abs(E).toFixed(2) + " V";
          lsvg.append(t1, t2);
        });
        const y1 = Y(Chem.E0by[a].E) + 3, y2 = Y(Chem.E0by[c].E) - 3;
        lsvg.append(s("line", { x1: 206, x2: 206, y1, y2: y2 - 7, stroke: YEL, "stroke-width": 2.5 }));
        lsvg.append(s("path", { d: `M200 ${y2 - 8} L212 ${y2 - 8} L206 ${y2} Z`, fill: YEL }));
        const t = s("text", { x: 214, y: (y1 + y2) / 2 + 16, "text-anchor": "start", style: `font-size:12px;fill:${YEL}` }); t.textContent = "electrons fall"; lsvg.append(t);
        sDrop.set((Chem.E0by[c].E - Chem.E0by[a].E).toFixed(2) + " V");
        sDrop.setLabel(PAIRS[k][2] + ": drop");
      }
      const tg = toggle("", [[0, "Daniell cell: Zn and Cu"], [1, `Lead–acid: Pb and ${f("PbO2")}`]], 1, drawLadder);
      el.append(widget("Standard potentials, most negative on top (values from the course table)", tg, lsvg, h("div", { class: "readout" }, sDrop)));
      drawLadder(1);

      el.append(
        P("That is nearly twice the Daniell cell, from a single element, because lead in its +4 state is such a strong oxidising agent."),
        P("Two volts is still far too little to crank an engine. So <b>six cells are connected in a row</b>: the positive plate of each cell is joined to the negative plate of the next. Every electron gets pushed by each cell in turn, and because a <em>volt is a joule per coulomb</em> (from <em>Charge, energy and capacity</em>), the pushes add up. This arrangement is called <b>cells in series</b>. Strictly, a <em>battery</em> is such a set of cells.")
      );
      // --- series
      const ssvg = s("svg", { width: "100%", style: "display:block;margin:6px auto 0" });
      const sN = stat("cells in series", ""), sV = stat("total voltage", "y"), sL = stat("sold as", "g");
      let n = 6, flip = 0;
      function drawSeries() {
        const W = narrow(520, 380), per = n <= 6 ? 6 : 12, cw = (W - 16) / per, rows = Math.ceil(n / per), RH = 64, bh = per === 6 ? 34 : 28;
        ssvg.setAttribute("viewBox", `0 0 ${W} ${rows * RH + 4}`); ssvg.innerHTML = "";
        let v = 0;
        for (let i = 0; i < n; i++) {
          const r = Math.floor(i / per), c = i % per, x = 8 + c * cw, y = 8 + r * RH, back = flip && i === Math.min(1, n - 1);
          v += back ? -E_CELL : E_CELL;
          ssvg.append(s("rect", { x: x + 3, y, width: cw - 6, height: bh, rx: 4, fill: "#212734", stroke: back ? RED : "#6b7689", "stroke-width": back ? 2 : 1.3 }));
          if (c < per - 1 && i < n - 1) ssvg.append(s("line", { x1: x + cw - 3, x2: x + cw + 3, y1: y + bh / 2, y2: y + bh / 2, stroke: "#b9c2d3", "stroke-width": 2.5 }));
          const fs = per === 6 ? 15 : 11, dx = per === 6 ? 13 : 8;
          const tm = s("text", { x: x + (back ? cw - dx : dx) + (back ? -1 : 1), y: y + bh / 2 + fs * 0.34, "text-anchor": "middle", style: `font-size:${fs}px;fill:${MUTED};font-weight:700` }); tm.textContent = "−";
          const tp = s("text", { x: x + (back ? dx : cw - dx) + (back ? 1 : -1), y: y + bh / 2 + fs * 0.34, "text-anchor": "middle", style: `font-size:${fs}px;fill:${back ? RED : TEXT};font-weight:700` }); tp.textContent = "+";
          const tv = s("text", { x: x + cw / 2, y: y + bh + 16, "text-anchor": "middle", style: `font-size:${per === 6 ? 12.5 : 10.5}px;fill:${YEL}` });
          tv.textContent = (v < 0 ? "−" : "") + Math.abs(v).toFixed(per === 6 ? 2 : 1) + (per === 6 ? " V" : "");
          ssvg.append(tm, tp, tv);
        }
        sN.set(String(n)); sV.set((v < 0 ? "−" : "") + Math.abs(v).toFixed(2) + " V");
        sL.set(flip ? "a mistake" : "a " + 2 * n + " V battery");
      }
      el.append(widget("Chain the cells: the number under each one is the running total",
        slider({ name: "cells", min: 1, max: 24, step: 1, value: 6, fmtv: (v) => v, oninput: (v) => { n = v; drawSeries(); } }),
        toggle("", [[0, "all cells the same way round"], [1, "one cell in backwards"]], 0, (v) => { flip = v; drawSeries(); }),
        ssvg, h("div", { class: "readout" }, sN, sV, sL)));
      drawSeries();
      el.append(
        P("Three cells make the 6 V battery of a vintage car, six the usual 12 V, twelve a truck's 24 V. Series adds volts, not ampere-hours: the same electrons pass through every cell, so six 60 Ah cells are still a 60 Ah battery, only now at 12 V."),
        takeaway(`One lead–acid cell gives E° = ${E_CELL.toFixed(2)} V. Cells in series add their voltages: six make a “12 V” battery.`)
      );
    },
    check: {
      type: "number", q: "A truck needs a 24 V lead–acid battery. Cells are counted as 2 V each. How many cells in series?",
      answer: 12, tolerance: 0, hint: "Voltages in series add: 2 V + 2 V + …", why: "12 cells: 12 × 2 V = 24 V (12 × 2.05 V = 24.6 V by the standard potentials).",
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "The acid is the fuel gauge",
    short: "State of charge",
    newConcepts: ["soc", "density"],
    render(el) {
      el.append(style,
        P("How full is the battery? Call the fraction of its charge that is still available the <b>state of charge</b>: 100% is full, 0% is flat. The Daniell cell had no easy gauge (in <em>Concentration and the Nernst equation</em> its voltage barely moved until the very end). Lead–acid has one built in, because its acid is a reactant."),
        P("Sulfuric acid is almost twice as dense as water. A full cell holds acid of about 37% by mass: 1.28 g/mL. As discharge swaps acid for water the liquid gets lighter, down to about 1.12 g/mL when flat. Mechanics read it with a <b>hydrometer</b>: a weighted glass float that rides higher in a denser liquid.")
      );
      const svg = s("svg", { viewBox: "0 0 400 282", width: "100%", style: "display:block;margin:0 auto;max-width:480px" });
      const T = (x, y, str, a = {}) => { const t = s("text", { x, y, "text-anchor": a.anchor || "middle", style: `font-size:${a.size || 12}px;fill:${a.fill || TEXT};font-weight:${a.weight || 400}` }); t.textContent = str; svg.append(t); return t; };
      // composition bar
      T(62, 34, "by mass", { fill: MUTED, size: 11.5 });
      svg.append(s("rect", { x: 40, y: 44, width: 44, height: 200, rx: 3, fill: "#31506e" }));
      const acidBar = s("rect", { x: 40, y: 44, width: 44, height: 0, rx: 3, fill: YEL, opacity: 0.85 }); svg.append(acidBar);
      const tAcid = T(92, 0, "", { anchor: "start", fill: YEL, size: 12 }), tWater = T(92, 70, "", { anchor: "start", fill: BLUE, size: 12 });
      // tube
      const liq = s("rect", { x: 172, y: 112, width: 76, height: 156, fill: "#7fb0e8", opacity: 0.2 }); svg.append(liq);
      svg.append(s("path", { d: "M170 14 V270 H250 V14", fill: "none", stroke: "#6b7689", "stroke-width": 2 }));
      svg.append(s("line", { x1: 172, x2: 248, y1: 112, y2: 112, stroke: "#9fc3ee", "stroke-width": 1.5 }));
      const fl = s("g"); svg.append(fl);
      const mY = (r) => 6 + ((r - 1.10) / 0.2) * 80;      // position of a scale mark on the stem
      [[1.10, 1.16, RED], [1.16, 1.23, YEL], [1.23, 1.30, GRN]].forEach(([a, b, c]) => fl.append(s("rect", { x: 203, y: mY(a), width: 14, height: mY(b) - mY(a), fill: c, opacity: 0.8 })));
      fl.append(s("rect", { x: 203, y: 0, width: 14, height: 94, fill: "none", stroke: "#cfd8e6", "stroke-width": 1.2 }));
      for (let r = 1.10; r < 1.305; r += 0.02) {
        const big = Math.round(r * 100) % 10 === 0;
        fl.append(s("line", { x1: big ? 196 : 199, x2: 203, y1: mY(r), y2: mY(r), stroke: "#cfd8e6", "stroke-width": 1 }));
        if (big) { const t = s("text", { x: 194, y: mY(r) + 3.5, "text-anchor": "end", style: `font-size:9.5px;fill:${TEXT}` }); t.textContent = r.toFixed(2); fl.append(t); }
      }
      fl.append(s("rect", { x: 193, y: 94, width: 34, height: 60, rx: 13, fill: "#cfd8e6", "fill-opacity": 0.25, stroke: "#cfd8e6", "stroke-width": 1.2 }));
      fl.append(s("rect", { x: 198, y: 134, width: 24, height: 16, rx: 7, fill: "#4a5568" }));
      svg.append(s("line", { x1: 250, x2: 268, y1: 112, y2: 112, stroke: YEL, "stroke-width": 1.5 }));
      const tRead = T(274, 109, "", { anchor: "start", fill: YEL, size: 17, weight: 700 }), tSub = T(274, 127, "", { anchor: "start", fill: MUTED, size: 11.5 });
      T(274, 143, "read where the surface", { anchor: "start", fill: MUTED, size: 11 }); T(274, 156, "cuts the stem", { anchor: "start", fill: MUTED, size: 11 });
      const sD = stat("acid density", "y"), sM = stat("acid, mol/L (approx.)", ""), sV = stat("rested cell voltage", "b"), sB = stat("× 6 cells", "g");
      const upd = (p) => {
        const soc = p / 100, r = rho(soc), w = wtPct(soc);
        fl.setAttribute("transform", `translate(0 ${(112 - mY(r)).toFixed(1)})`);
        liq.setAttribute("opacity", (0.08 + 0.25 * soc).toFixed(3));
        const ah = 2 * w; acidBar.setAttribute("y", 244 - ah); acidBar.setAttribute("height", ah);
        tAcid.setAttribute("y", 244 - ah / 2 + 4); tAcid.textContent = `acid ${w.toFixed(0)}%`;
        tWater.setAttribute("y", 44 + (200 - ah) / 2 + 4); tWater.textContent = `water ${(100 - w).toFixed(0)}%`;
        tRead.textContent = r.toFixed(2) + " g/mL"; tSub.textContent = p >= 75 ? "green band: charged" : p >= 25 ? "yellow band: partly used" : "red band: recharge now";
        sD.set(r.toFixed(3)); sM.set(molarity(soc).toFixed(1)); sV.set(ocv(soc).toFixed(2) + " V"); sB.set((6 * ocv(soc)).toFixed(1) + " V");
      };
      el.append(widget("A hydrometer in the cell's acid (typical values for a car battery)", svg,
        slider({ name: "state of charge", min: 0, max: 100, step: 1, value: 100, fmtv: (v) => v + "%", oninput: upd, nameWidth: 120 }),
        h("div", { class: "readout" }, sD, sM, sV, sB)));
      upd(100);
      el.append(
        P(`The voltage moves too, and you already know why: the acid appears in the <em>reaction quotient Q</em>, so by the <em>Nernst equation</em> less acid means less push. A handy rule for a rested cell is <b>volts ≈ density + 0.84</b>. At full charge that gives 2.12 V, a little above E° = ${E_CELL.toFixed(2)} V, because battery acid is far stronger than the 1 mol/L of <em>standard conditions</em>. A healthy “12 V” battery therefore rests at about 12.7 V.`),
        takeaway("State of charge = the fraction of charge still available. In a lead–acid cell the acid density tracks it: about 1.28 g/mL full, 1.12 g/mL flat.")
      );
    },
    check: {
      type: "number", q: "A battery reads 1.28 g/mL when full and 1.12 g/mL when flat. Today the hydrometer shows <b>1.20 g/mL</b>. Roughly what is the state of charge, in %?",
      answer: 50, tolerance: 4, hint: "Where does 1.20 sit between 1.12 and 1.28?", why: "About 50%: 1.20 is exactly halfway between 1.12 and 1.28, so half of the usable acid has been turned into water.",
      backTo: 2,
    },
  });

  // ---------------------------------------------------------------- 6
  steps.push({
    title: "Recharging: push the electrons back",
    short: "Recharging",
    newConcepts: ["charging", "reversible"],
    render(el) {
      el.append(style,
        P("Now the trick that made Planté's cell famous. Connect an outside source, a <b>charger</b>, with its negative terminal on the negative plate, and set its voltage above the cell's own 2.1 V. The charger out-pushes the cell. Electrons are forced <b>backwards</b>: into the lead plate, out of the dioxide plate. Both half-reactions run in reverse:"),
        formula(`<span class="bl la-eq">${HALF_NEG_R}</span><small>negative plate: lead +2 → 0</small><span class="hl la-eq">${HALF_POS_R}</span><small>positive plate: lead +2 → +4</small>`),
        P("Lead sulfate turns back into lead on one plate and lead dioxide on the other, and the acid returns. The electrical energy you pay is stored again as chemical energy. (Forcing a reaction uphill with an outside voltage is the subject of <em>Electrolysis</em>.)"),
        P("Why does this work here? Because the product never left. Lead sulfate is a solid, stuck exactly where it formed, touching the plate that can hand it electrons or take them away. A cell reaction that can be run cleanly in both directions is called <b>reversible</b>; that is what makes a cell rechargeable.")
      );
      let soc = 0.35, mode = "open", vch = 2.3, timer = null, last = "";
      const cell = leadCell({ device: "open", soc, seed: 8 });
      const sS = stat("state of charge", "g"), sV = stat("cell's own voltage", "b"), sD = stat("acid density", "y");
      const status = statusBox();
      function frame() {
        let dir = "rest", msg;
        const v = ocv(soc);
        if (mode === "bulb") {
          if (soc > 0) { soc = Math.max(0, soc - 0.004); dir = "discharge"; msg = `<b>Discharging.</b> Electrons leave the Pb plate, light the lamp, enter the ${f("PbO2")} plate. Both plates gain ${f("PbSO4")}, the acid thins.`; }
          else msg = "Flat: both plates are lead sulfate. Switch to the charger.";
        } else if (mode === "charger") {
          const d = vch - v;
          if (Math.abs(d) < 0.012) msg = `The charger pushes exactly as hard as the cell (${v.toFixed(2)} V). Nothing flows. Raise its voltage.`;
          else if (d > 0) {
            if (soc < 1) { soc = Math.min(1, soc + 0.035 * d); dir = "charge"; msg = `<b>Charging.</b> The charger (${vch.toFixed(2)} V) out-pushes the cell (${v.toFixed(2)} V): electrons are driven into the Pb plate. ${f("PbSO4")} turns back into Pb and ${f("PbO2")}, the acid thickens.`; }
            else msg = "Fully charged: no lead sulfate is left to convert. What happens if the charger stays on is the next step.";
          } else if (soc > 0) { soc = Math.max(0, soc + 0.035 * d); dir = "discharge"; msg = `The charger (${vch.toFixed(2)} V) pushes <b>less</b> than the cell (${v.toFixed(2)} V), so the cell wins and discharges through it. A charger must beat the cell's own voltage.`; }
          else msg = "Flat, and the charger voltage is too low to charge it.";
        } else msg = "Open circuit: nothing moves. Choose the lamp or the charger.";
        cell.set({ neg: 1 - soc, pos: 1 - soc, soc, mode: dir, device: mode, meter: vch.toFixed(2) + " V",
          flow: dir === "discharge" ? "electrons →" : dir === "charge" ? "← electrons" : "",
          roleL: dir === "discharge" ? "anode (oxidation)" : dir === "charge" ? "cathode (reduction)" : "negative plate",
          roleR: dir === "discharge" ? "cathode (reduction)" : dir === "charge" ? "anode (oxidation)" : "positive plate" });
        sS.set(Math.round(soc * 100) + "%"); sV.set(ocv(soc).toFixed(2) + " V"); sD.set(rho(soc).toFixed(2));
        if (msg !== last) { status.innerHTML = msg; last = msg; }
      }
      timer = setInterval(frame, 60);
      el.append(widget("The same cell with a lamp or a charger in the wire",
        toggle("connect:", [["bulb", "Lamp (discharge)"], ["open", "Nothing"], ["charger", "Charger"]], mode, (v) => { mode = v; frame(); }),
        cell.svg,
        slider({ name: "charger voltage", min: 1.8, max: 2.4, step: 0.01, value: vch, fmtv: (v) => v.toFixed(2) + " V", oninput: (v) => { vch = v; frame(); }, nameWidth: 120 }),
        legend(), h("div", { class: "readout" }, sS, sV, sD), status));
      frame();
      el.append(
        P("One naming trap. <em>Anode</em> means “where oxidation happens”, so the names swap on charge: the dioxide plate is the cathode while discharging and the anode while charging. That is why battery people say <b>positive plate</b> and <b>negative plate</b>. Those never change."),
        takeaway(`Charging: an outside voltage higher than the cell's own drives electrons backwards and reverses both half-reactions, ${f("2PbSO4")} + ${f("2H2O")} → Pb + ${f("PbO2")} + ${f("2H2SO4")}.`)
      );
      return () => { clearInterval(timer); cell.stop(); };
    },
    check: {
      type: "choice", q: `While the battery is being <b>charged</b>, what is the positive plate (${f("PbSO4")} → ${f("PbO2")})?`,
      options: ["The cathode, because the positive plate is always the cathode", "The anode: lead is oxidised there, from +2 to +4", "Neither: no redox happens during charging"],
      answer: 1,
      wrongHints: {
        0: "Anode and cathode are defined by the reaction, not by the sign. Which way does lead's oxidation number move at this plate during charging?",
        2: "Lead's oxidation number changes at both plates (+2 → +4 and +2 → 0). That is redox, only forced backwards.",
      },
      why: "The anode. Lead goes from +2 to +4 and gives up electrons, which is oxidation, and oxidation always defines the anode. The plate stays positive either way.",
      backTo: 1,
    },
  });

  // ---------------------------------------------------------------- 7
  steps.push({
    title: "Overcharge: the cell starts splitting water",
    short: "Overcharge and gassing",
    newConcepts: ["gassing"],
    render(el) {
      el.append(style,
        P("Leave the charger on after the last lead sulfate is gone. The electrons keep arriving, and they need something to react with. The only thing left is the water in the acid:"),
        formula(`<span class="la-eq"><span class="bl">${f("2H^+ + 2e- -> H2")}</span> &nbsp;·&nbsp; <span class="hl">${f("2H2O -> O2 + 4H^+ + 4e-")}</span></span><small>negative plate: hydrogen gas · positive plate: oxygen gas</small><span class="la-eq">${f("2H2O -> 2H2 + O2")}</span>`),
        P("The cell bubbles. This is <b>gassing</b>, the sign of <b>overcharge</b>. It becomes serious once the charging voltage passes about 2.4 V per cell (14.4 V for the battery). Three consequences: water is lost and has to be topped up with pure water; the energy that made the gas is wasted; and hydrogen mixed with oxygen is explosive, so no sparks near a charging battery.")
      );
      let b, left = 0, dt = 0.1, timer = null, smart = 0;
      const cell = leadCell({ device: "charger", soc: 0.9, seed: 3 });
      const sS = stat("state of charge", "g"), sV = stat("charging voltage / cell", "b"), sG = stat("charge turned into gas", "r"), sW = stat("water lost", "y"), sL = stat("gas produced", "");
      const status = statusBox();
      function draw(r) {
        const soc = b.q / CAP, lost = b.gasAh * WATER_PER_AH, on = !!r && !r.done;
        cell.set({ neg: 1 - soc, pos: 1 - soc, soc, mode: on ? "charge" : "rest", gas: on ? r.gas : 0, level: clamp(lost / 300, 0, 1), meter: on ? r.V.toFixed(2) + " V" : "off",
          flow: on ? "← electrons" : "", roleL: on && r.gas > 0.3 ? f("H2") + " bubbles" : "", roleR: on && r.gas > 0.3 ? f("O2") + " bubbles" : "" });
        sS.set(Math.round(soc * 100) + "%"); sV.set(on ? r.V.toFixed(2) + " V" : "–"); sG.set(b.gasAh.toFixed(1) + " Ah"); sW.set(lost.toFixed(1) + " g"); sL.set((b.gasAh * GAS_L_PER_AH).toFixed(1) + " L");
        status.classList.toggle("warn", lost > 120);
        status.innerHTML = r && r.done ? "The smart charger saw 2.40 V, let its current fade and switched off. Almost no water was lost."
          : lost > 120 ? "So much water has been split that the tops of the plates stand dry. Top up with pure water (the acid itself never left)."
          : on && r.gas > 0.9 ? `Full. Every electron now splits water: ${I_CHARGE} A makes about ${(I_CHARGE * WATER_PER_AH).toFixed(1)} g of water vanish per hour as ${f("H2")} and ${f("O2")}.`
          : on && r.gas > 0.05 ? "Nearly full: lead sulfate is getting scarce, so part of the current already makes gas and the voltage climbs."
          : on ? "Charging normally: the current converts lead sulfate, almost no gas."
          : `Charger off. The cell is ${Math.round(soc * 100)}% charged. Pick how long to charge at ${I_CHARGE} A.`;
      }
      function loop() {
        timer = null;
        if (left <= 1e-9) { draw(null); return; }
        const r = chargeTick(b, Math.min(dt, left), smart); left -= dt;
        if (r.done) { left = 0; draw(r); return; }
        draw(r); timer = setTimeout(loop, 40);
      }
      const run = (hours) => { left = hours; dt = Math.max(0.1, hours / 60); if (!timer) loop(); };
      const reset = () => { if (timer) clearTimeout(timer); timer = null; left = 0; b = { q: 0.9 * CAP, cap: CAP, gasAh: 0 }; cell.reset({ soc: 0.9, level: 0, gas: 0 }); draw(null); };
      el.append(widget(`One cell at 90%, charged at a steady ${I_CHARGE} A (simplified model)`,
        toggle("charger:", [[0, `dumb: ${I_CHARGE} A whatever happens`], [1, "smart: never above 2.40 V"]], 0, (v) => { smart = v; }),
        cell.svg,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => run(1) }, "Charge 1 hour"),
          h("button", { onclick: () => run(10) }, "Charge 10 hours"),
          h("button", { onclick: () => run(100) }, "Forget it for 100 hours"),
          h("button", { onclick: reset }, "Reset")),
        h("div", { class: "readout" }, sS, sV, sG, sW, sL), status,
        h("div", { class: "note", style: "margin-top:8px" }, "Gas volume at room temperature, where a mole of any gas fills about 24.5 L. Bubbles: hydrogen on the left (two for every one of oxygen on the right).")));
      reset();
      el.append(
        P(`A puzzle to finish. On the potential ladder, splitting water needs only 1.23 V, yet this cell sits at 2.1 V in water without fizzing. And lead stands above hydrogen in the <em>activity series</em>, so the acid “should” dissolve it. Both reactions are allowed. On lead surfaces they are just extremely slow, until extra voltage forces them. The lead–acid battery exists thanks to that sluggishness. (Why allowed reactions can be slow is a topic of <em>Real batteries</em>.)`),
        takeaway(`Overcharge: once the ${f("PbSO4")} is used up, the charging current splits water, ${f("2H2O -> 2H2 + O2")}. The cell gasses and loses water.`)
      );
      return () => { if (timer) clearTimeout(timer); cell.stop(); };
    },
    check: {
      type: "number", q: `A full cell is overcharged by <b>10 Ah</b>, and all of it splits water (${f("2H2O -> 2H2 + O2")}, 4 electrons per 2 ${f("H2O")}). How many grams of water are lost? (${f("H2O")} = 18.0 g/mol, F = 96 485 C/mol)`,
      answer: 3.36, tolerance: 0.08,
      hint: "10 Ah × 3600 s/h = 36 000 C. Divide by F for moles of electrons, then 2 electrons per water molecule, then × 18.0 g/mol.",
      why: "3.36 g. 36 000 C ÷ 96 485 = 0.373 mol of electrons → 0.187 mol of water → 3.36 g. That is why old car batteries needed topping up.",
    },
  });

  // ---------------------------------------------------------------- 8
  steps.push({
    title: "Sulfation: when lead sulfate hardens",
    short: "Sulfation",
    newConcepts: ["sulfation"],
    render(el) {
      el.append(style,
        P("Lead sulfate makes the cell rechargeable, and it is also what kills it. Freshly formed, it is a film of tiny crystals with a huge surface, easy to convert back. But lead sulfate dissolves just a trace, and over days and weeks material leaves the small crystals and settles on larger ones. A few big, hard crystals replace many small ones."),
        P("Big crystals are bad news twice over: lead sulfate does not conduct electrons, and a big crystal has little surface for its volume. The charger cannot get at it, and that lead is locked out of the battery for good. This is <b>sulfation</b>, the most common death of lead–acid batteries."),
        P("The longer a battery sits partly or fully discharged, the more it sulfates. Even a full battery slowly discharges itself while parked (a few percent per month), so it needs an occasional top-up charge.")
      );
      const W = 400, H = 150;
      const svg = s("svg", { viewBox: `0 44 ${W} ${H - 44}`, width: "100%", style: "display:block;margin:0 auto;max-width:540px" });
      svg.append(s("rect", { x: 0, y: 96, width: W, height: 54, fill: C_PB }));
      const cap = s("text", { x: W / 2, y: 136, "text-anchor": "middle", style: `font-size:12.5px;fill:${DARK};font-weight:700` }); svg.append(cap);
      const r0 = rng(21);
      const small = [], big = [];
      for (let i = 0; i < 60; i++) {
        const x = 6 + (i % 30) * 13.2 + r0() * 4, y = (i < 30 ? 90 : 79) + r0() * 4, d = 4.2 + r0() * 1.6;
        const c = s("path", { d: `M${x} ${y - d} L${x + d} ${y} L${x} ${y + d} L${x - d} ${y} Z`, fill: C_SULF, stroke: "#8b8672", "stroke-width": 0.8 }); svg.append(c); small.push(c);
      }
      for (let i = 0; i < 12; i++) {
        const x = 20 + i * 32.5 + r0() * 8, d = 13 + r0() * 6, y = 96 - d * 0.75;
        const c = s("path", { d: `M${x - d} ${y + d * 0.75} L${x - d * 0.8} ${y - d * 0.2} L${x - d * 0.2} ${y - d} L${x + d * 0.6} ${y - d * 0.7} L${x + d} ${y + d * 0.75} Z`, fill: "#ffffff", stroke: "#4a4f5a", "stroke-width": 1.5 }); svg.append(c); big.push(c);
      }
      let soc0 = 0, weeks = 8, view = 0;
      const sSoft = stat("soft sulfate (recharges)", "b"), sHard = stat("hard sulfate (stuck)", "r"), sCap = stat("capacity after recharge", "g");
      const status = statusBox();
      function draw() {
        const b = { soc: soc0, hard: 0 };
        for (let w = 0; w < weeks; w++) storeWeek(b);
        const soft = Math.max(0, 1 - b.soc - b.hard);
        const ns = view ? 0 : Math.round(soft * 60), nb = Math.round(b.hard * 12);
        small.forEach((c, i) => (c.style.display = i < ns ? "" : "none"));
        big.forEach((c, i) => (c.style.display = i < nb ? "" : "none"));
        cap.textContent = view ? "plate surface after a full recharge" : `plate surface after ${weeks} week${weeks === 1 ? "" : "s"} of standing`;
        sSoft.set(fmt.pct(view ? 0 : soft)); sHard.set(fmt.pct(b.hard)); sCap.set(fmt.pct(1 - b.hard));
        status.classList.toggle("warn", b.hard > 0.25);
        status.innerHTML = view
          ? (b.hard < 0.03 ? "The small crystals converted back. Practically nothing was lost." : `The small crystals are gone, the big ones are still there. ${fmt.pct(b.hard)} of the plate no longer takes part: the battery has shrunk.`)
          : weeks === 0 ? "Just discharged to this level: all the sulfate is fresh and fine-grained."
          : `Stored at ${Math.round(soc0 * 100)}% for ${weeks} weeks. Small crystals have fed big ones. Press “after a recharge” to see what comes back.`;
      }
      el.append(widget("Leave a battery standing, then try to recharge it (toy rates; real ones depend on temperature and design)",
        toggle("left standing at:", [[1, "100% charge"], [0.5, "50%"], [0, "0% (flat)"]], soc0, (v) => { soc0 = v; draw(); }),
        slider({ name: "weeks standing", min: 0, max: 26, step: 1, value: weeks, fmtv: (v) => v + " wk", oninput: (v) => { weeks = v; draw(); }, nameWidth: 120 }),
        svg,
        toggle("show:", [[0, "as it stands"], [1, "after a recharge"]], 0, (v) => { view = v; draw(); }),
        h("div", { class: "readout" }, sSoft, sHard, sCap), status));
      draw();
      el.append(
        P("Running a battery completely flat hurts for the same reason, plus one more: lead sulfate takes up more room than the lead or lead dioxide it came from (about 48 cm³ per mole, against 18 and 25). A fully sulfated plate swells, clogs its own pores and can shed material."),
        takeaway("Sulfation: lead sulfate left standing grows into large, insulating crystals that no longer recharge. A lead–acid battery wants to be kept full.")
      );
    },
    check: {
      type: "choice", q: "Two identical car batteries spend the winter in a garage. A was put away fully charged, B was put away flat. In spring both go on a charger. What do you expect?",
      options: ["B has lost much more capacity: its lead sulfate had months to harden", "Both recover fully: charging always reverses the reaction", "A is worse: a full battery wears out faster when stored"],
      answer: 0,
      wrongHints: {
        1: "The reaction is reversible only while the sulfate is fine-grained and in contact with the plate. What happens to the crystals over months?",
        2: "A full battery has almost no lead sulfate on its plates, so there is little to harden. It only needs a top-up against self-discharge.",
      },
      why: "B. Its plates sat as lead sulfate all winter, the crystals coarsened, and the charger cannot convert the big ones back. A only needs topping up.",
    },
  });

  // ---------------------------------------------------------------- 9
  steps.push({
    title: "Heavy, yet strong",
    short: "Heavy, yet strong",
    newConcepts: ["heavy"],
    render(el) {
      const capPb = Chem.capacity(2, M.Pb), capZn = Chem.capacity(2, EL.Zn.mass);
      el.append(style,
        P("Two facts about car batteries seem to clash: they are absurdly heavy for the energy they hold, yet they deliver enormous currents."),
        P(`<b>Heavy</b> is written in the periodic table. A mole of lead weighs ${M.Pb.toFixed(0)} g and gives only 2 electrons: about ${capPb.toFixed(0)} mAh/g, against ${capZn.toFixed(0)} for zinc (<em>specific capacity</em>, from <em>Charge, energy and capacity</em>). And as that lesson warned, always ask “per kilogram of what?”. The lead dioxide, the acid and its water all have to come along.`)
      );
      const waterG = 2 * M.H2SO4 * (63 / 37);
      const STAGES = [
        { lab: "Pb only", m: M.Pb, txt: `Counting only the lead that gives the electrons: ${M.Pb.toFixed(0)} g per 2 mol of electrons.` },
        { lab: `+ ${f("PbO2")}`, m: M.Pb + M.PbO2, txt: `The taker is lead too, and carries two oxygens: + ${M.PbO2.toFixed(0)} g.` },
        { lab: `+ ${f("2H2SO4")}`, m: M.Pb + M.PbO2 + 2 * M.H2SO4, txt: `The acid is a reactant, so it counts: + ${(2 * M.H2SO4).toFixed(0)} g. This is the usual “theoretical” figure for lead–acid.` },
        { lab: "+ water in the acid", m: M.Pb + M.PbO2 + 2 * M.H2SO4 + waterG, txt: `Battery acid is about 37% acid and 63% water: + ${waterG.toFixed(0)} g of water that only carries the ions.` },
        { lab: "real battery", m: null, txt: "Add lead grids to hold the paste, connectors, separators and a case, and active material that never reacts (typically only about half does). Real car batteries reach roughly 30–40 Wh/kg." },
      ];
      const whkg = (m) => (m ? Chem.capacity(2, m) * E_CELL : 35);
      const bars = hbars(STAGES.map((x) => x.lab), { max: 560, fmtv: (v) => v.toFixed(0) + " Wh/kg", labelWidth: "38%" });
      const note = statusBox();
      const sM = stat("mass per 2 mol e⁻", ""), sC = stat("specific capacity", "b"), sE = stat("specific energy", "y");
      const showStage = (k) => {
        bars.update(STAGES.map((x) => whkg(x.m)), STAGES.map((x, i) => (i === k ? YEL : "#56617a")));
        bars.mark(k);
        const st = STAGES[k];
        sM.set(st.m ? st.m.toFixed(0) + " g" : "–"); sC.set(st.m ? Chem.capacity(2, st.m).toFixed(0) + " mAh/g" : "–"); sE.set((st.m ? "" : "≈ ") + whkg(st.m).toFixed(0) + " Wh/kg");
        note.innerHTML = st.txt + (st.m ? ` Capacity × ${E_CELL.toFixed(2)} V = ${whkg(st.m).toFixed(0)} Wh/kg.` : "");
      };
      el.append(widget("Per kilogram of what? Add what the cell really has to carry",
        toggle("count:", STAGES.map((x, i) => [i, x.lab]), 0, showStage), bars, h("div", { class: "readout" }, sM, sC, sE), note));
      showStage(0);
      el.append(P(`<b>Strong</b> comes from the design. Each cell holds many thin, spongy plates wired side by side, so the reacting surface is huge; ${f("H^+")} is the fastest-moving ion there is, so the acid conducts very well; and both plate reactions are quick. A starter motor can draw around 300 A for a few seconds.`));
      const sP = stat("power ≈ 12 V × current", "y"), sT = stat("time to empty 60 Ah (ideal)", "b"), sB = stat("a 3-second burst uses", "g"), sPb = stat("lead converted per second", "");
      const updI = (I) => {
        const Pw = 12 * I;
        sP.set(Pw >= 1000 ? (Pw / 1000).toFixed(1) + " kW" : Pw.toFixed(0) + " W");
        const hrs = CAP / I; sT.set(hrs >= 1 ? hrs.toFixed(1) + " h" : (hrs * 60).toFixed(0) + " min");
        const ah = (I * 3) / 3600; sB.set(ah.toFixed(ah < 0.1 ? 3 : 2) + " Ah");
        const g = (I / (2 * Chem.F)) * M.Pb; sPb.set(g >= 0.1 ? g.toFixed(2) + " g" : (g * 1000).toFixed(1) + " mg");
      };
      el.append(widget("A 12 V, 60 Ah battery: choose the current",
        slider({ name: "current", min: 1, max: 600, log: true, value: 300, fmtv: (v) => (v < 10 ? v.toFixed(1) : v.toFixed(0)) + " A", oninput: updI, nameWidth: 80 }),
        h("div", { class: "readout" }, sP, sT, sB, sPb),
        h("div", { class: "note", style: "margin-top:8px" }, "Idealised: under heavy load the voltage sags and less than the full 60 Ah comes out. That is the subject of Real batteries.")));
      updI(300);
      el.append(
        P("Starting the engine takes kilowatts but only a fraction of an ampere-hour, which the car's generator puts straight back. Lead is also cheap, and nearly all of it is recycled into new batteries. So a chemistry from 1859 is still under the bonnet, while anything that must be carried around (phones, electric cars) moved on: see <em>Lithium</em>."),
        takeaway("Lead gives few electrons per gram, so lead–acid stores only about 30–40 Wh/kg. Thin plates with a huge surface and a highly conducting acid still let it deliver hundreds of amperes.")
      );
    },
    check: {
      type: "number", q: "A 12 V, 60 Ah car battery weighs 18 kg. What is its specific energy in Wh/kg?",
      answer: 40, tolerance: 0.6, hint: "Energy in Wh = volts × ampere-hours. Then divide by the mass.", why: "12 V × 60 Ah = 720 Wh, and 720 Wh ÷ 18 kg = 40 Wh/kg. A phone-type lithium cell stores several times that.",
    },
  });

  // ---------------------------------------------------------------- 10
  steps.push({
    title: "Capstone: a year in the life of a car battery",
    short: "Capstone: use and abuse",
    newConcepts: [],
    render(el) {
      el.append(style,
        P("Everything at once. Below is one cell of a 12 V, 60 Ah battery (the readouts multiply the voltage by six). Run it down with the headlights, charge it with a smart or a dumb charger, park it for months, and watch the plates, the acid and the voltage."),
        P("The chemistry is exact (Faraday's constant, the overall reaction, 0.34 g of water per ampere-hour of gassing). The voltage curve and the rates of sulfation are simplified models with realistic shapes.")
      );
      let b, mode, smart = 1, t, segs, parks, timer = null, note = "", tickN = 0;
      const cell = leadCell({ device: "open", soc: 1, seed: 17 });
      const sV = stat("battery voltage", "y"), sS = stat("state of charge", "g"), sD = stat("acid density", "b"), sH = stat("usable capacity", ""), sW = stat("water lost / cell", "r");
      const bars = hbars(["Pb on the − plate", `${f("PbO2")} on the + plate`, `soft ${f("PbSO4")} (recharges)`, `hard ${f("PbSO4")} (stuck)`], { max: 1, fmtv: fmt.pct, labelWidth: "46%" });
      const status = statusBox();
      const pl = plot({ xmin: 0, xmax: 12, ymin: 9.5, ymax: 16.5, width: 560, height: 220, narrow: 400, minFont: 10, xlabel: "hours of use (parking not counted)", ylabel: "battery voltage (V)", xticks: [0, 6, 12], yticks: [10, 11, 12, 13, 14, 15, 16] });
      const modeTg = toggle("", [["rest", "Disconnected"], ["load", `Headlights on (${I_LOAD} A)`], ["charge", "Charger on"]], "rest", (v) => setMode(v));
      const soc = () => b.q / CAP;
      const cap = () => CAP * (1 - b.hard);
      let lastV = ocv(1), lastGas = 0;
      function drawPlot() {
        const xmax = Math.max(12, Math.ceil(t / 6) * 6);
        pl.setRange({ xmin: 0, xmax, ymin: 9.5, ymax: 16.5, xticks: [0, xmax / 2, xmax], yticks: [10, 11, 12, 13, 14, 15, 16] });
        pl.clear();
        pl.hline(14.4, GRN, "14.4 V: gassing above", { halo: true });
        pl.hline(10.5, RED, "10.5 V: flat", { below: true, halo: true });
        parks.slice(-6).forEach((p) => pl.vline(p.t, MUTED, p.n + " mo", { pos: "left" }));
        segs.forEach((sg) => { if (sg.pts.length > 1) pl.line(sg.pts, sg.col); });
      }
      function draw() {
        const x = soc(), soft = Math.max(0, 1 - x - b.hard), lost = b.gasAh * WATER_PER_AH;
        const dir = mode === "load" ? "discharge" : mode === "charge" ? "charge" : "rest";
        cell.set({ neg: 1 - x, pos: 1 - x, hard: b.hard, soc: x, mode: dir, device: mode === "rest" ? "open" : mode === "load" ? "bulb" : "charger", gas: mode === "charge" ? lastGas : 0,
          level: clamp(lost / 300, 0, 1), meter: (lastV * 6).toFixed(1) + " V",
          flow: dir === "discharge" ? "electrons →" : dir === "charge" ? "← electrons" : "",
          roleL: dir === "discharge" ? "anode (oxidation)" : dir === "charge" ? "cathode (reduction)" : "negative plate",
          roleR: dir === "discharge" ? "cathode (reduction)" : dir === "charge" ? "anode (oxidation)" : "positive plate" });
        sV.set((lastV * 6).toFixed(2) + " V"); sS.set(Math.round(x * 100) + "%"); sD.set(rho(x).toFixed(3)); sH.set(cap().toFixed(0) + " Ah"); sW.set(lost.toFixed(0) + " g");
        bars.update([x, x, soft, b.hard], [C_PB, "#a06a52", C_SULF, RED]);
        status.classList.toggle("warn", b.hard > 0.2 || lost > 120);
        status.innerHTML = note;
      }
      function push(col) {
        let sg = segs[segs.length - 1];
        if (!sg || sg.col !== col || sg.closed) { sg = { col, pts: [] }; segs.push(sg); }
        sg.pts.push([t, lastV * 6]);
        if (sg.pts.length > 900) sg.pts = sg.pts.filter((_, i) => i % 2 === 0 || i === sg.pts.length - 1);
      }
      function setMode(v, msg) {
        mode = v; modeTg.set(v);
        if (segs.length) segs[segs.length - 1].closed = true;
        if (v === "rest") { lastV = ocv(soc()); lastGas = 0; note = msg || `Disconnected. Rested voltage ${(6 * lastV).toFixed(2)} V, acid ${rho(soc()).toFixed(2)} g/mL: about ${Math.round(soc() * 100)}% charged.`; }
        draw(); drawPlot();
      }
      function frame() {
        tickN++;
        if (mode === "load") {
          const dt = 0.05, x = soc();
          if (b.q <= 0) return setMode("rest", `<b>Flat.</b> The plates are almost all ${f("PbSO4")} and the acid is down to ${RHO_FLAT} g/mL. Recharge at once: every week in this state hardens more sulfate.`);
          b.q = Math.max(0, b.q - I_LOAD * dt); t += dt;
          if (x < 0.2) b.hard = Math.min(1 - soc(), b.hard + 0.02 * dt * (1 - x / 0.2));
          lastV = ocv(soc()) - 0.06 - 0.15 * Math.pow(Math.max(0, 1 - soc() / 0.1), 2);
          note = soc() < 0.2 ? `<b>Deep discharge.</b> Below about 20% the plates are mostly sulfate, the voltage sags towards 10.5 V and some sulfate is already turning hard.` : `Discharging at ${I_LOAD} A: Pb and ${f("PbO2")} turn into ${f("PbSO4")}, acid becomes water, the density and the voltage creep down.`;
          push(YEL);
        } else if (mode === "charge") {
          const g0 = gasFrac(cap() > 0.5 ? b.q / cap() : 1), dt = !smart && g0 > 0.9 ? 0.25 : 0.05;
          const bb = { q: b.q, cap: cap(), gasAh: b.gasAh };
          const r = chargeTick(bb, dt, smart);
          if (r.done) return setMode("rest", `<b>The smart charger switched off</b> at ${Math.round(soc() * 100)}%: it held 14.4 V, let the current fade and stopped.` + (b.hard > 0.03 ? ` It cannot do more: ${fmt.pct(b.hard)} of the plates is hard sulfate.` : ""));
          b.q = bb.q; b.gasAh = bb.gasAh; t += dt; lastV = r.V; lastGas = r.gas;
          note = r.gas > 0.9 ? `<b>Overcharging.</b> No soft sulfate left, so all ${I_CHARGE} A split water: bubbles of ${f("H2")} and ${f("O2")}, about ${(I_CHARGE * WATER_PER_AH).toFixed(0)} g of water lost per hour, ${(6 * r.V).toFixed(1)} V.`
            : r.gas > 0.05 ? `Nearly full: the voltage climbs past 14.4 V and part of the current makes gas.` + (smart ? " The smart charger holds 14.4 V and lets the current fade." : "")
            : `Charging at ${I_CHARGE} A: ${f("PbSO4")} turns back into Pb and ${f("PbO2")}, the acid thickens.`;
          push(GRN);
        } else return;
        draw();
        if (tickN % 2 === 0) drawPlot();
      }
      function park(months) {
        const st = { soc: soc(), hard: b.hard }, h0 = b.hard;
        for (let w = 0; w < Math.round(months * 4.33); w++) storeWeek(st);
        b.q = st.soc * CAP; b.hard = Math.min(st.hard, 1 - st.soc);
        const last = parks[parks.length - 1];
        if (last && Math.abs(last.t - t) < 1e-9) last.n += months; else parks.push({ t, n: months });
        setMode("rest", `Parked for ${months} month${months > 1 ? "s" : ""}. Self-discharge took it to ${Math.round(soc() * 100)}%` + (b.hard - h0 > 0.005 ? `, and <b>${fmt.pct(b.hard - h0)} of the plates hardened</b> into sulfate that will not recharge.` : ". Hardly any sulfate hardened, because hardly any was there."));
      }
      function fresh() {
        b = { q: CAP, hard: 0, gasAh: 0 }; t = 0; segs = []; parks = []; lastV = ocv(1); lastGas = 0; mode = "rest"; modeTg.set("rest");
        cell.reset({ soc: 1, level: 0, hard: 0, gas: 0 });
        note = "A new, full battery: 12.7 V at rest, acid 1.28 g/mL. Switch the headlights on.";
        draw(); drawPlot();
      }
      el.append(widget("One cell of a 12 V / 60 Ah battery",
        modeTg,
        toggle("charger type:", [[1, "smart (holds 14.4 V, then stops)"], [0, `dumb (${I_CHARGE} A for ever)`]], 1, (v) => { smart = v; }),
        cell.svg, legend("white diamonds = hard sulfate"), status,
        h("div", { class: "readout" }, sV, sS, sD, sH, sW), bars, pl,
        h("div", { class: "btns" },
          h("button", { onclick: () => park(1) }, "Park it for 1 month"),
          h("button", { onclick: () => park(3) }, "Park it for 3 months"),
          h("button", { onclick: () => { b.gasAh = 0; setMode(mode === "rest" ? "rest" : mode, mode === "rest" ? "Topped up with pure water. The acid that was there never left, so the density is back where it belongs." : undefined); } }, "Top up the water"),
          h("button", { onclick: fresh }, "New battery"))));
      fresh();
      timer = setInterval(frame, 40);
      el.append(
        P("Things to try, each from an earlier step:"),
        h("ul", {},
          h("li", { html: `<b>Headlights on</b> until it stops. Both plates turn white, the acid thins from 1.28 to 1.12 g/mL (steps 2, 3 and 5), and the voltage slides slowly, then drops.` }),
          h("li", { html: "<b>Smart charger</b>: electrons go the other way, the roles of anode and cathode swap, and everything comes back (step 6)." }),
          h("li", { html: "<b>Dumb charger</b>, and leave it: once full, the voltage jumps above 14.4 V and the cell bubbles its water away (step 7). Top it up." }),
          h("li", { html: "<b>Run it flat, then park it for 3 months.</b> Now charge. The white diamonds stay, and the usable capacity has shrunk for good (step 8)." }),
          h("li", { html: "Start again with a new battery, park it <b>full</b> for 3 months and compare." })),
        takeaway(`One metal, three oxidation states, one pot of acid: Pb + ${f("PbO2")} + ${f("2H2SO4")} ⇌ ${f("2PbSO4")} + ${f("2H2O")}. Discharge runs it to the right, a charger pushes it back, and the acid density tells you where you are.`)
      );
      return () => { clearInterval(timer); cell.stop(); };
    },
  });

  Course.run({
    id: "lead-acid",
    section: "3. Batteries, element by element",
    title: "Lead: the rechargeable car battery",
    concepts: {
      states: "lead's three states: Pb / PbSO₄ / PbO₂",
      negplate: "negative plate: Pb → PbSO₄",
      posplate: "positive plate: PbO₂ → PbSO₄",
      overall: "overall reaction: the acid is a reactant",
      cellv: "2.05 V per cell",
      series: "cells in series",
      soc: "state of charge",
      density: "acid density as fuel gauge",
      charging: "charging (electrons pushed backwards)",
      reversible: "reversible (rechargeable) cell reaction",
      gassing: "overcharge / gassing",
      sulfation: "sulfation",
      heavy: "low Wh/kg, high current",
    },
    sources: [
      { title: "OpenStax Chemistry 2e, §17.5 Batteries and Fuel Cells", url: "https://openstax.org/books/chemistry-2e/pages/17-5-batteries-and-fuel-cells", note: "lead–acid half-reactions, overall reaction, about 2 V per cell, six cells in series" },
      { title: "Wikipedia: Lead–acid battery", url: "https://en.wikipedia.org/wiki/Lead%E2%80%93acid_battery", note: "Planté 1859, electrolyte density vs state of charge, gassing voltage, sulfation, 35–40 Wh/kg" },
      { title: "Wikipedia: Gaston Planté", url: "https://en.wikipedia.org/wiki/Gaston_Plant%C3%A9", note: "the 1859 spiral-wound lead cell, the first rechargeable battery" },
      { title: "Battery University BU-201: How does the Lead Acid Battery Work?", url: "https://batteryuniversity.com/article/bu-201-how-does-the-lead-acid-battery-work", note: "starter vs deep-cycle designs, charge limits, practical specific energy" },
      { title: "Battery University BU-804b: Sulfation and How to Prevent it", url: "https://batteryuniversity.com/article/bu-804b-sulfation-and-how-to-prevent-it", note: "soft (reversible) vs hard (permanent) sulfation" },
      { title: "Battery University BU-903: How to Measure State-of-charge", url: "https://batteryuniversity.com/article/bu-903-how-to-measure-state-of-charge", note: "specific gravity and open-circuit voltage tables for lead–acid" },
      { title: "CRC Handbook of Chemistry and Physics: Electrochemical Series", url: "https://hbcp.chemnetbase.com/", note: "E° of PbSO₄/Pb (−0.36 V) and PbO₂/PbSO₄ (+1.69 V), as in the course table" },
    ],
    steps,
  });
})();
