// Lesson 1.1 — Oxidation and reduction
(function () {
  const { h, s, widget, stat, slider, toggle, rng, narrow } = Course;
  const f = Chem.f, EL = Chem.elements;
  const YEL = "#ffd166", RED = "#ff6b6b", BLUE = "#6cb4ff", GRN = "#5fd38d", MUTED = "#9aa3b5", TXT = "#e6e9ef",
    PANEL2 = "#212734", LINE = "#2e3646", COPPER = "#c8815a", ZINC = "#7d8794", DARK = "#0b1220";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const note = (html, style) => h("div", { class: "note", style: style || "", html });

  // ---- small local helpers -------------------------------------------------
  if (!document.getElementById("redox-style")) {
    document.head.append(h("style", { id: "redox-style", html: `
      .redox-eq { font-size: 20px; letter-spacing: .01em; text-align: center; margin: 8px 0 10px; line-height: 1.5; }
      .redox-half { font-size: 17px; margin: 6px 0 2px; }
      .redox-dot { display: inline-block; width: 13px; height: 13px; border-radius: 50%; margin: 2px 3px 2px 0; vertical-align: middle; box-sizing: border-box; }
      .redox-msg { min-height: 46px; margin-top: 10px; font-size: 15px; line-height: 1.45; }
      .redox-stepper { display: inline-flex; align-items: center; gap: 4px; }
      .redox-stepper button { padding: 2px 10px; font-family: var(--mono); font-size: 16px; }
      .redox-stepper .v { display: inline-block; min-width: 34px; text-align: center; font-family: var(--mono); font-size: 17px; color: var(--yellow); }
      .redox-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; padding: 8px 0; border-bottom: 1px solid var(--line); }
      .redox-row .pair { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
      .redox-row .el { font-size: 18px; width: 34px; font-weight: 700; }
      .redox-row .sp { color: var(--muted); font-size: 14px; }
      .redox-row .mk { font-size: 14px; flex-basis: 100%; min-height: 0; }
      .redox-svg { display: block; width: 100%; margin: 0 auto; }
      .redox-rules li { margin: 3px 0; }
      @media (max-width: 600px) { .redox-eq { font-size: 17px; } .redox-half { font-size: 15px; } }
    ` }));
  }
  const svgBox = (W, H, maxW) => s("svg", { viewBox: `0 0 ${W} ${H}`, class: "redox-svg", style: `max-width:${maxW || Math.round(W * 1.25)}px` });
  function T(x, y, str, o = {}) {
    const t = s("text", { x, y, "text-anchor": o.anchor || "middle" });
    t.style.fill = o.fill || TXT; t.style.fontSize = (o.size || 12) + "px"; if (o.bold) t.style.fontWeight = "700";
    if (o.halo) { t.style.stroke = "#1a1f29"; t.style.strokeWidth = "4px"; t.style.paintOrder = "stroke"; }
    t.textContent = str; return t;
  }
  // a labelled circle that can move and change its look
  function particle(label, fill, r, o = {}) {
    const g = s("g", {}), c = s("circle", { r, cx: 0, cy: 0 }), t = T(0, (o.size || 11) * 0.36, label, { size: o.size || 11, fill: o.textFill || DARK, bold: true });
    g.append(c, t);
    g.look = (lab, fl, rr, tf, stroke) => { t.textContent = lab; c.setAttribute("fill", fl); if (rr) c.setAttribute("r", rr); t.style.fill = tf || DARK; c.setAttribute("stroke", stroke || "none"); c.setAttribute("stroke-width", stroke ? 2 : 0); };
    g.move = (x, y) => g.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`);
    g.show = (v) => g.setAttribute("visibility", v ? "visible" : "hidden");
    g.look(label, fill, r, o.textFill, o.stroke);
    return g;
  }
  function ticker(fn, ms) { let alive = true; (function tk() { if (!alive) return; fn(); setTimeout(tk, ms); })(); return () => { alive = false; }; }
  function tween(ms, fn, done) {
    const t0 = Date.now(); let alive = true;
    (function tk() { if (!alive) return; const t = Math.min(1, (Date.now() - t0) / ms); fn(t); if (t < 1) setTimeout(tk, 16); else if (done) done(); })();
    return () => { alive = false; };
  }
  const ease = (t) => t * t * (3 - 2 * t);
  const ox = (n) => (n > 0 ? "+" + n : n < 0 ? "−" + -n : "0");           // oxidation number: sign first
  const ion = (sym, q) => (q === 0 ? sym : f(sym + "^" + (Math.abs(q) > 1 ? Math.abs(q) : "") + (q > 0 ? "+" : "-")));
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
  function stepper(min, max, value, onchange, fmtv = ox) {
    let cur = value;
    const v = h("span", { class: "v" }, fmtv(cur));
    const set = (x, fire) => { cur = Math.max(min, Math.min(max, x)); v.textContent = fmtv(cur); if (fire && onchange) onchange(cur); };
    const box = h("span", { class: "redox-stepper" },
      h("button", { type: "button", "aria-label": "lower", onclick: () => set(cur - 1, true) }, "−"), v,
      h("button", { type: "button", "aria-label": "raise", onclick: () => set(cur + 1, true) }, "+"));
    box.get = () => cur; box.set = (x) => set(x, false);
    return box;
  }

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "A zinc strip in a blue solution",
    short: "Zinc in copper sulfate",
    newConcepts: ["spectator", "netionic"],
    render(el) {
      el.append(
        P(`In <em>Ions, salts and electrolytes</em> you dissolved salts and watched them fall apart into ions. Here is a new salt: copper sulfate, ${f("CuSO4")}. In water it <em>dissociates</em> into ${f("Cu^2+")} cations, which colour the solution blue, and sulfate anions ${f("SO4^2-")} (a <em>polyatomic ion</em>).`),
        P("Now dip a strip of zinc metal into it and wait. Two things happen that you could see with your own eyes: <b>the strip grows a reddish-brown coat of copper metal, and the blue fades.</b> Run it, and watch the counters."));
      const W = narrow(520, 360), H = 250, N = 8, cx = W / 2;
      const svg = svgBox(W, H, 660);
      const liquid = s("rect", { x: 24, y: 62, width: W - 48, height: 176, fill: "#3f8cff" });
      svg.append(liquid, s("path", { d: `M24,26 V238 H${W - 24} V26`, fill: "none", stroke: MUTED, "stroke-width": 2 }));
      svg.append(s("rect", { x: cx - 13, y: 6, width: 26, height: 194, rx: 2, fill: ZINC, stroke: "#aab3c0" }), T(cx, 24, "Zn", { size: 12, bold: true, fill: DARK }), T(cx, 40, "strip", { size: 9, fill: DARK }));
      const r = rng(11);
      const box = (side) => (side ? [cx + 30, W - 40] : [40, cx - 30]);
      const mk = (side) => { const b = box(side); return { x: b[0] + r() * (b[1] - b[0]), y: 80 + r() * 140, vx: (r() - 0.5) * 1.6, vy: (r() - 0.5) * 1.6, side }; };
      const sulf = [], slots = [];
      for (let i = 0; i < N; i++) {
        const p = mk(i % 2); p.g = particle(f("SO4^2-"), BLUE, 15, { size: 9 }); svg.append(p.g); sulf.push(p);
      }
      for (let i = 0; i < N; i++) {
        const side = i % 2, c = mk(side), z = mk(side);
        const tx = side ? cx + 22 : cx - 22, ty = 84 + Math.floor(i / 2) * 30;
        c.g = particle(f("Cu^2+"), RED, 13, { size: 9.5 }); z.g = particle(f("Zn^2+"), RED, 13, { size: 9.5, stroke: "#ffd9d9" }); z.g.show(false);
        svg.append(c.g, z.g); slots.push({ c, z, tx, ty, phase: 0 });
      }
      const drift = (p) => {
        const b = box(p.side); p.x += p.vx; p.y += p.vy;
        if (p.x < b[0]) { p.x = b[0]; p.vx = Math.abs(p.vx); } if (p.x > b[1]) { p.x = b[1]; p.vx = -Math.abs(p.vx); }
        if (p.y < 80) { p.y = 80; p.vy = Math.abs(p.vy); } if (p.y > 222) { p.y = 222; p.vy = -Math.abs(p.vy); }
      };
      const sCu = stat(f("Cu^2+") + " in solution", "r"), sZn = stat(f("Zn^2+") + " in solution", "r"), sSO = stat(f("SO4^2-") + " in solution", "b"), sAt = stat("Cu atoms on the strip", "");
      let k = 0, auto = null, lastDone = -1;
      function setK(n) {
        k = n;
        slots.forEach((sl, i) => {
          if (i < k && sl.phase === 0) sl.phase = 1;
          if (i >= k && sl.phase > 0) { sl.phase = 0; sl.c.g.look(f("Cu^2+"), RED, 13); sl.z.g.show(false); }
        });
      }
      const stop = ticker(() => {
        sulf.forEach((p) => { drift(p); p.g.move(p.x, p.y); });
        let done = 0;
        slots.forEach((sl) => {
          const c = sl.c, z = sl.z;
          if (sl.phase === 0) drift(c);
          else if (sl.phase === 1) {
            const dx = sl.tx - c.x, dy = sl.ty - c.y, d = Math.hypot(dx, dy);
            if (d < 5) { c.x = sl.tx; c.y = sl.ty; sl.phase = 2; c.g.look("Cu", COPPER, 11); z.x = sl.tx + (c.side ? 14 : -14); z.y = sl.ty; z.vx = (c.side ? 1 : -1) * 0.9; z.g.show(true); }
            else { c.x += (dx / d) * 4.5; c.y += (dy / d) * 4.5; }
          } else { done++; drift(z); z.g.move(z.x, z.y); }
          c.g.move(c.x, c.y);
        });
        if (done !== lastDone) {
          lastDone = done;
          liquid.setAttribute("opacity", (0.06 + 0.34 * (N - done) / N).toFixed(3));
          sCu.set(String(N - done)); sZn.set(String(done)); sSO.set(String(N)); sAt.set(String(done));
        }
      }, 40);
      const sl = slider({ name: "reacted", min: 0, max: N, step: 1, value: 0, fmtv: (x) => x + " of " + N, oninput: (v) => { if (auto) { clearTimeout(auto); auto = null; } setK(v); } });
      const run = () => {
        if (auto) return;
        if (k >= N) { setK(0); sl.set(0); }
        const go = () => { if (k >= N) { auto = null; return; } setK(k + 1); sl.set(k); auto = setTimeout(go, 800); };
        auto = setTimeout(go, 100);
      };
      el.append(widget("Zinc strip in copper sulfate solution (8 of each ion shown, real beakers hold ~10²³)", svg, sl,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: run }, "Let it react"),
          h("button", { onclick: () => { if (auto) { clearTimeout(auto); auto = null; } setK(0); sl.set(0); } }, "Fresh strip")),
        h("div", { class: "readout" }, sCu, sZn, sSO, sAt)));
      el.append(
        P(`Read the counters. ${f("Cu^2+")} ions left the solution and turned up as copper atoms on the strip. Zinc atoms left the strip and turned up as ${f("Zn^2+")} ions (colourless, hence the fading). The sulfate ions did nothing at all: 8 before, 8 after. An ion that is present but comes out unchanged is a <b>spectator ion</b>.`),
        P("Chemists leave the spectators out and write only what changed. That shorter line is the <b>net ionic equation</b>:"),
        formula(`Zn + ${f("Cu^2+")} → ${f("Zn^2+")} + Cu<small>full version, spectators included: ${f("Zn + CuSO4 -> ZnSO4 + Cu")}</small>`),
        takeaway(`Zinc metal in copper sulfate: zinc atoms become ${f("Zn^2+")} ions, ${f("Cu^2+")} ions become copper atoms, and sulfate just watches.`));
      return () => { stop(); if (auto) clearTimeout(auto); };
    },
    check: {
      type: "choice",
      q: `You repeat the experiment with copper <i>nitrate</i> solution, ${f("Cu(NO3)2")}, which dissociates into ${f("Cu^2+")} and ${f("NO3^-")}. The same copper coat grows on the zinc. What is the net ionic equation?`,
      options: [`${f("Zn + Cu^2+ -> Zn^2+ + Cu")}, the same as before`, `${f("Zn + 2NO3^- -> Zn(NO3)2")}, because nitrate replaced sulfate`, "It has to be a new equation: a different salt is a different reaction"],
      answer: 0,
      wrongHints: { 1: "Count the charge: 0 + 2− on the left, 0 on the right. And nitrate comes out unchanged, exactly like sulfate did.", 2: "Look at what actually changes: copper ions and zinc atoms. The anion only keeps the solution neutral." },
      why: "The anion is a spectator either way, so it drops out. The net ionic equation shows that the two experiments are the same event.",
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "Zoom in: two electrons change hands",
    short: "Two electrons move",
    newConcepts: ["redox"],
    render(el) {
      el.append(
        P(`Why would a ${f("Cu^2+")} ion turn into a copper atom? Remember what an <em>ion</em> is (from <em>Atoms, electrons and charge</em>): the protons stay put, only the electron count differs. ${f("Cu^2+")} is a copper atom that is <b>2 electrons short</b>. A zinc atom has all of its electrons, including 2 <em>valence electrons</em> that it holds loosely.`),
        P(`Zoom in on one spot of the strip, where one ${f("Cu^2+")} ion bumps into one zinc atom. Step through it and keep an eye on the electron column.`));
      const W = narrow(520, 360), H = 200, hx = 62, hy = 100;
      const svg = svgBox(W, H, 640);
      svg.append(s("rect", { x: 80, y: 0, width: W - 80, height: H, fill: "#3f8cff", opacity: 0.1 }));
      for (const x of [30, 62]) for (const y of [36, 68, 100, 132, 164]) {
        if (x === hx && y === hy) continue;
        svg.append(s("circle", { cx: x, cy: y, r: 16, fill: ZINC, stroke: "#aab3c0" }), T(x, y + 4, "Zn", { size: 11, fill: DARK, bold: true }));
      }
      svg.append(T(46, 195, "zinc strip", { size: 10, fill: MUTED }), T(W - 60, 195, "solution", { size: 10, fill: MUTED }));
      const zn = particle("Zn", ZINC, 16, { size: 11 }), cu = particle(f("Cu^2+"), RED, 16, { size: 11 });
      const e1 = s("circle", { r: 4.5, fill: YEL }), e2 = s("circle", { r: 4.5, fill: YEL });
      svg.append(zn, cu, e1, e2);
      const POS = [
        { zn: [hx, hy], cu: [W - 60, hy] },
        { zn: [hx, hy], cu: [hx + 36, hy] },
        { zn: [hx, hy], cu: [hx + 36, hy] },
        { zn: [W - 70, 46], cu: [hx, hy] },
      ];
      const CAP = [
        `A ${f("Cu^2+")} ion drifts through the solution. The zinc atom sits in the surface of the strip.`,
        `Contact. ${f("Cu^2+")} is 2 electrons short. Zinc holds its 2 valence electrons only loosely.`,
        "<b>Two electrons jump from zinc to copper.</b> Nothing else moved. Check the table: 30 → 28 and 27 → 29.",
        `The new ${f("Zn^2+")} ion is pulled off into the water. The new copper atom stays behind on the strip.`,
      ];
      const cap = note("", "min-height:44px;margin-top:8px;font-size:15px");
      const tb = h("table", { class: "small" });
      let stage = 0, cur = { zn: POS[0].zn.slice(), cu: POS[0].cu.slice() }, cancel = null;
      const btn = h("button", { class: "primary", onclick: () => go((stage + 1) % 4, true) }, "Next ▸");
      function look(flipped) {
        if (flipped) { zn.look(f("Zn^2+"), RED, 16, DARK, "#ffd9d9"); cu.look("Cu", COPPER, 16); } else { zn.look("Zn", ZINC, 16); cu.look(f("Cu^2+"), RED, 16); }
        const row = (name, p, e) => `<tr><td>${name}</td><td class="num">${p}</td><td class="num" style="color:var(--yellow)">${e}</td><td class="num">${ox(p - e)}</td></tr>`;
        tb.innerHTML = `<tr><th>particle</th><th class="num">protons (+)</th><th class="num">electrons (−)</th><th class="num">net charge</th></tr>` +
          row("zinc", EL.Zn.Z, EL.Zn.Z - (flipped ? 2 : 0)) + row("copper", EL.Cu.Z, EL.Cu.Z - (flipped ? 0 : 2));
      }
      function place() { zn.move(cur.zn[0], cur.zn[1]); cu.move(cur.cu[0], cur.cu[1]); }
      function electrons(t) {
        const show = t != null;
        e1.setAttribute("visibility", show ? "visible" : "hidden"); e2.setAttribute("visibility", show ? "visible" : "hidden");
        if (!show) return;
        const x = hx + 4 + ease(t) * 28, lift = Math.sin(Math.PI * t) * 10;
        e1.setAttribute("cx", x); e1.setAttribute("cy", hy - 7 - lift); e2.setAttribute("cx", x); e2.setAttribute("cy", hy + 7 + lift);
      }
      function go(n, animate) {
        if (cancel) cancel();
        stage = n; cap.innerHTML = `<b style="color:var(--muted)">${n + 1}/4</b> ` + CAP[n]; btn.textContent = n === 3 ? "Replay ↺" : "Next ▸";
        const from = { zn: cur.zn.slice(), cu: cur.cu.slice() }, to = POS[n];
        if (n === 0 || !animate) { cur = { zn: to.zn.slice(), cu: to.cu.slice() }; place(); electrons(null); look(n >= 2); return; }
        look(n > 2);
        cancel = tween(n === 2 ? 900 : 700, (t) => {
          const u = ease(t);
          for (const key of ["zn", "cu"]) cur[key] = [from[key][0] + (to[key][0] - from[key][0]) * u, from[key][1] + (to[key][1] - from[key][1]) * u];
          place(); electrons(n === 2 ? t : null);
        }, () => { electrons(null); look(n >= 2); });
      }
      el.append(widget("One collision at the strip surface", svg, cap, h("div", { class: "btns" }, btn, h("button", { onclick: () => go(0, false) }, "Start over")), h("div", { style: "margin-top:12px" }, tb)));
      go(0, false);
      el.append(
        P("No atom was created or destroyed, and no proton moved. The only things that changed owner are <b>two electrons</b>, from zinc to copper. A reaction that comes down to electrons passing from one particle to another is an electron-transfer reaction, or <b>redox reaction</b>. (The odd name is explained in the next step.)"),
        P("This is the thread of the whole course in miniature: one element gives electrons, another takes them. Here the electrons simply hop across where the particles touch. In <em>The galvanic cell</em> you will force them to take a wire instead. Why zinc gives to copper and not the other way round is the subject of <em>The activity series</em>."),
        takeaway(`${f("Zn + Cu^2+ -> Zn^2+ + Cu")} is nothing but 2 electrons moving from a zinc atom to a copper ion. That is a redox reaction.`));
      return () => { if (cancel) cancel(); };
    },
    check: {
      type: "number", q: `Five ${f("Cu^2+")} ions land on the strip and become copper atoms. How many electrons left zinc atoms in total?`,
      answer: 10, tolerance: 0, hint: `Each ${f("Cu^2+")} is 2 electrons short of being an atom.`, why: "5 × 2 = 10 electrons, supplied by 5 zinc atoms giving 2 each.",
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "Losing is oxidation, gaining is reduction",
    short: "Oxidation, reduction",
    newConcepts: ["oxidation", "reduction"],
    render(el) {
      el.append(
        P("The two particles had opposite experiences, and each experience has a name."),
        P(`<b>Losing electrons is called oxidation.</b> Zinc was oxidised: Zn became ${f("Zn^2+")}. <b>Gaining electrons is called reduction.</b> The copper ion was reduced: ${f("Cu^2+")} became Cu.`),
        P("The names are historical. “Oxidation” first meant reacting with oxygen, the classic electron taker (high <em>electronegativity</em>, from <em>The periodic table</em>). For “reduction”, watch the charge: every electron gained <b>reduces</b> it by one. Try it on a few particles."));
      const DATA = {
        Zn: { min: 0, max: 2, stable: [0, 2], hi: "A third electron would have to come out of a full inner shell: far too costly (<em>Atoms, electrons and charge</em>).", lo: "A metal atom has no use for an extra electron. You will not meet Zn⁻ in a beaker." },
        Cu: { min: 0, max: 2, stable: [0, 1, 2], hi: f("Cu^3+") + " is too costly to make in water. Copper stops at 2+.", lo: "A metal atom has no use for an extra electron. You will not meet Cu⁻ in a beaker." },
        Fe: { min: 0, max: 3, stable: [0, 2, 3], hi: f("Fe^4+") + " is too costly to make in water. Iron stops at 3+.", lo: "A metal atom has no use for an extra electron." },
        Cl: { min: -1, max: 0, stable: [-1, 0], hi: "Chlorine is a taker (7 valence electrons, one short of a full shell). It does not give electrons up as a lone ion.", lo: f("Cl^-") + " already has a full outer shell of 8. There is no room for another electron." },
      };
      const W = narrow(520, 360), H = 140, X = (q) => 36 + (q + 2) * (W - 72) / 5, LY = 92;
      const svg = svgBox(W, H, 640);
      svg.append(s("line", { x1: 20, y1: LY, x2: W - 20, y2: LY, stroke: MUTED, "stroke-width": 1.5 }));
      for (let q = -2; q <= 3; q++) svg.append(s("line", { x1: X(q), y1: LY - 5, x2: X(q), y2: LY + 5, stroke: MUTED }), T(X(q), LY + 20, q === 0 ? "0" : (Math.abs(q) + (q > 0 ? "+" : "−")), { size: 12, fill: q > 0 ? RED : q < 0 ? BLUE : MUTED }));
      svg.append(T(W - 20, H - 6, "lose e⁻ = oxidation →", { size: 11, anchor: "end", fill: RED }), T(20, H - 6, "← gain e⁻ = reduction", { size: 11, anchor: "start", fill: BLUE }), T(W / 2, H - 6, "charge", { size: 10, fill: MUTED }));
      const pt = particle("Zn", ZINC, 20, { size: 12 }), eDot = s("circle", { r: 5, fill: YEL, visibility: "hidden" });
      svg.append(pt, eDot);
      const msg = h("div", { class: "redox-msg" });
      const sQ = stat("charge", "y"), sLost = stat("oxidations so far", "r"), sGain = stat("reductions so far", "b");
      let sym = "Zn", q = 0, px = X(0), cancel = null, nOx = 0, nRed = 0;
      const paint = () => { pt.look(ion(sym, q), q > 0 ? RED : q < 0 ? BLUE : sym === "Cu" ? COPPER : sym === "Cl" ? GRN : ZINC, 20); sQ.set(q === 0 ? "0" : Math.abs(q) + (q > 0 ? "+" : "−")); sLost.set(String(nOx)); sGain.set(String(nRed)); };
      function move(d) {
        const D = DATA[sym], nq = q + d;
        if (nq > D.max || nq < D.min) { msg.innerHTML = `<span style="color:var(--red)">Not this one.</span> ` + (d > 0 ? D.hi : D.lo); return; }
        const before = ion(sym, q); q = nq; const after = ion(sym, q);
        if (d > 0) nOx++; else nRed++;
        msg.innerHTML = (d > 0
          ? `<b style="color:var(--text)">${before} → ${after} + e⁻</b> &nbsp; It <b>lost</b> an electron, the charge went up by 1: <b style="color:var(--red)">oxidation</b>.`
          : `<b style="color:var(--text)">${before} + e⁻ → ${after}</b> &nbsp; It <b>gained</b> an electron, the charge went down by 1: <b style="color:var(--blue)">reduction</b>.`) +
          (D.stable.includes(q) ? "" : ` <span class="note">(${after} is only a passing state. In practice the next electron follows at once.)</span>`);
        paint();
        if (cancel) cancel();
        const x0 = px, x1 = X(q);
        eDot.setAttribute("visibility", "visible");
        cancel = tween(450, (t) => {
          const u = ease(t); px = x0 + (x1 - x0) * u; pt.move(px, 52);
          const w = d > 0 ? u : 1 - u; // electron flies away (oxidation) or flies in (reduction)
          eDot.setAttribute("cx", px + 14 + w * 40); eDot.setAttribute("cy", 44 - w * 34); eDot.setAttribute("opacity", 1 - 0.6 * w);
        }, () => eDot.setAttribute("visibility", "hidden"));
      }
      function pick(v) { if (cancel) cancel(); eDot.setAttribute("visibility", "hidden"); sym = v; q = 0; px = X(0); pt.move(px, 52); msg.innerHTML = `A neutral ${EL[sym].name} atom. Take an electron away, or hand it one.`; paint(); }
      const tg = toggle("particle:", [["Zn", "Zn"], ["Cu", "Cu"], ["Fe", "Fe"], ["Cl", "Cl"]], "Zn", pick);
      el.append(widget("Move one particle along the charge line, one electron at a time", tg, svg,
        h("div", { class: "btns" },
          h("button", { onclick: () => move(+1) }, "Take an electron away"),
          h("button", { onclick: () => move(-1) }, "Hand it an electron")),
        msg, h("div", { class: "readout" }, sQ, sLost, sGain)));
      pick("Zn");
      el.append(
        P("A common memory aid is <b>OIL RIG</b>: Oxidation Is Loss, Reduction Is Gain (of electrons)."),
        P("In the widget you were the one taking and handing out electrons. In a beaker nobody does that: an electron lost by one particle has to be gained by another. So <b>oxidation and reduction always come as a pair</b>, and “redox” is just <b>red</b>uction + <b>ox</b>idation glued together."),
        takeaway("Oxidation = losing electrons (charge goes up). Reduction = gaining electrons (charge goes down). One never happens without the other."));
      return () => { if (cancel) cancel(); };
    },
    check: {
      type: "choice", q: `An iron ion changes like this: ${f("Fe^3+")} + e⁻ → ${f("Fe^2+")}. What happened to it?`,
      options: ["It was reduced: it gained an electron", "It was oxidised: it is still a positive ion", "Neither: it did not become a neutral atom"],
      answer: 0,
      wrongHints: { 1: "The sign of the charge does not decide it. The direction does: did the charge go up or down?", 2: "Reduction does not have to end at zero. Any gain of electrons counts, here 3+ → 2+." },
      why: "The charge went down from 3+ to 2+ because an electron was gained. That is reduction, wherever it starts and ends.",
    },
  });

  // ---------------------------------------------------------------- 4
  const HALVES = [
    { name: "zinc + copper ion", ox: { l: [1, "Zn"], r: [1, "Zn^2+"], n: 2 }, red: { l: [1, "Cu^2+"], r: [1, "Cu"], n: 2 } },
    { name: "copper + silver ion", ox: { l: [1, "Cu"], r: [1, "Cu^2+"], n: 2 }, red: { l: [1, "Ag^+"], r: [1, "Ag"], n: 1 } },
    { name: "sodium + chlorine", ox: { l: [1, "Na"], r: [1, "Na^+"], n: 1 }, red: { l: [1, "Cl2"], r: [2, "Cl^-"], n: 2 } },
  ];
  steps.push({
    title: "Half-reactions: one equation for each side of the deal",
    short: "Half-reactions",
    newConcepts: ["half"],
    render(el) {
      el.append(
        P("Since the reaction is two experiences, you can write it as two equations, with the electrons shown openly as e⁻:"),
        formula(`<span class="hl">Zn → ${f("Zn^2+")} + 2e⁻</span> <small>oxidation: electrons come out on the right</small><span class="bl">${f("Cu^2+")} + 2e⁻ → Cu</span> <small>reduction: electrons go in on the left</small>`),
        P("Each line is a <b>half-reaction</b>. Neither can run alone, because free electrons do not pile up in a beaker. Add the two lines, the 2e⁻ on each side cancel, and the net ionic equation from step 1 is back."),
        P(`The electrons have to cancel <b>exactly</b>. That gets interesting when the two sides deal in different amounts. A silver ion ${f("Ag^+")} takes just one electron, but a copper atom gives two. Pick <i>copper + silver ion</i> below and make the books balance.`));
      let R = HALVES[0], a = 1, b = 1;
      const term = (k, [c, sp]) => (k * c === 1 ? "" : k * c) + f(sp);
      const es = (n) => (n === 1 ? "" : n) + "e⁻";
      const out = h("div");
      const dots = (n, filled) => Array.from({ length: n }, () => `<span class="redox-dot" style="${filled ? "background:" + YEL : "border:2px dashed " + YEL}"></span>`).join("");
      function draw() {
        const give = a * R.ox.n, take = b * R.red.n;
        const wrap = (k, str) => (k > 1 ? `${k} × ( ${str} )` : str);
        const balanced = give === take;
        let verdict;
        if (balanced) {
          const g = (x, y) => (y ? g(y, x % y) : x), twice = g(a, b) > 1;
          verdict = `<div class="redox-eq" style="color:var(--green)">${term(a, R.ox.l)} + ${term(b, R.red.l)} → ${term(a, R.ox.r)} + ${term(b, R.red.r)}</div>
            <div class="note">Balanced: ${plural(give, "electron")} given, ${give} taken. They cancel and vanish from the overall equation.${twice ? " (This is the smallest version happening " + g(a, b) + " times over.)" : ""}</div>`;
        } else if (give > take) verdict = `<div class="redox-eq" style="color:var(--red)">${plural(give - take, "electron")} with nowhere to go</div><div class="note">More electrons are released than taken. That cannot happen: add takers or remove givers.</div>`;
        else verdict = `<div class="redox-eq" style="color:var(--red)">${plural(take - give, "electron")} missing</div><div class="note">More electrons are demanded than released. That cannot happen: add givers or remove takers.</div>`;
        out.innerHTML =
          `<div class="redox-half" style="color:var(--yellow)">${wrap(a, `${f(R.ox.l[1])} → ${term(1, R.ox.r)} + ${es(R.ox.n)}`)}</div>
           <div>${dots(give, true)} <span class="note">${give} released</span></div>
           <div class="redox-half" style="color:var(--blue)">${wrap(b, `${f(R.red.l[1])} + ${es(R.red.n)} → ${term(1, R.red.r)}`)}</div>
           <div>${dots(take, false)} <span class="note">${take} wanted</span></div>
           <div style="margin-top:12px;border-top:1px solid var(--line);padding-top:8px">${verdict}</div>`;
      }
      const sa = slider({ name: "givers ×", min: 1, max: 3, step: 1, value: 1, fmtv: (x) => "× " + x, oninput: (v) => { a = v; draw(); } });
      const sb = slider({ name: "takers ×", min: 1, max: 3, step: 1, value: 1, fmtv: (x) => "× " + x, oninput: (v) => { b = v; draw(); } });
      const tg = toggle("", HALVES.map((r, i) => [i, r.name]), 0, (i) => { R = HALVES[i]; a = b = 1; sa.set(1); sb.set(1); draw(); });
      el.append(widget("Scale each half-reaction until electrons released = electrons wanted", tg, sa, sb, out));
      draw();
      el.append(
        P(`The third reaction is the sodium and chlorine story from the very first lesson, now as two half-reactions. Chlorine gas comes as pairs of atoms, ${f("Cl2")}. One pair takes 2 electrons and becomes two ${f("Cl^-")} ions, so it needs two sodium atoms.`),
        P("Notice that every half-reaction also balances in charge: Zn (0) on the left, 2+ and 2− on the right. A recipe that handles much messier cases is the next lesson, <em>Balancing redox equations</em>."),
        takeaway("A redox reaction splits into an oxidation half-reaction (electrons out) and a reduction half-reaction (electrons in). Electrons given must equal electrons taken."));
    },
    check: {
      type: "number", q: `Aluminium gives three electrons: ${f("Al -> Al^3+")} + 3e⁻. Silver ions take one each: ${f("Ag^+")} + e⁻ → Ag. How many ${f("Ag^+")} ions does one aluminium atom supply?`,
      answer: 3, tolerance: 0, hint: "Electrons released must equal electrons taken. One Al releases 3.", why: `3. The overall equation is ${f("Al + 3Ag^+ -> Al^3+ + 3Ag")}: 3 electrons out, 3 in.`, backTo: 2,
    },
  });

  // ---------------------------------------------------------------- 5
  const AGENTS = [
    { eq: "Zn + Cu^2+ -> Zn^2+ + Cu", giver: "Zn", taker: "Cu^2+", gq: 0, tq: 2, n: 2, flip: false },
    { eq: "Cu + 2Ag^+ -> Cu^2+ + 2Ag", giver: "Cu", taker: "Ag^+", gq: 0, tq: 1, n: 2, flip: true },
    { eq: "2Na + Cl2 -> 2Na^+ + 2Cl^-", giver: "Na", taker: "Cl2", gq: 0, tq: 0, n: 2, flip: false },
    { eq: "Fe + Cu^2+ -> Fe^2+ + Cu", giver: "Fe", taker: "Cu^2+", gq: 0, tq: 2, n: 2, flip: true },
  ];
  steps.push({
    title: "Who does it to whom: oxidising and reducing agents",
    short: "The two agents",
    newConcepts: ["oxagent", "redagent"],
    render(el) {
      el.append(
        P("So far you described what happens <i>to</i> each particle. Chemists also name what each particle does <i>to the other one</i>."),
        P(`${f("Cu^2+")} takes electrons away from zinc. It is the reason zinc got oxidised, so ${f("Cu^2+")} is called the <b>oxidising agent</b>. Zinc pushes electrons onto ${f("Cu^2+")}. It is the reason copper got reduced, so zinc is the <b>reducing agent</b>.`),
        P("Here is the trap: <b>the agent goes through the opposite of its own name.</b> Think of a travel agent, who sends <i>you</i> travelling and stays at the desk. The oxidising agent oxidises someone else, and in doing so is itself reduced."));
      const W = narrow(480, 340), H = 132, xa = W * 0.24, xb = W * 0.76, cy = 76;
      const svg = svgBox(W, H, 600);
      const pa = particle("", ZINC, 30, { size: 14 }), pb = particle("", RED, 30, { size: 14 });
      pa.move(xa, cy); pb.move(xb, cy);
      const cap = T(W / 2, 16, "", { size: 11, fill: YEL });
      const es = [0, 1, 2].map(() => s("circle", { r: 4.5, fill: YEL }));
      svg.append(pa, pb, cap, ...es);
      let R = AGENTS[0], ask = "red", phase = 0;
      const eqLine = h("div", { class: "redox-eq" }), q = h("div", { style: "margin-top:10px;font-weight:600" }), fb = h("div", { class: "redox-msg" }), tb = h("table", { class: "small", style: "display:none" });
      const b1 = h("button", { onclick: () => answer(0) }), b2 = h("button", { onclick: () => answer(1) });
      const colour = (sp, ch) => (ch > 0 ? RED : sp === "Cl2" ? GRN : sp === "Cu" ? COPPER : ZINC);
      const left = () => (R.flip ? "taker" : "giver");
      function draw() {
        const L = left(), Rr = L === "giver" ? "taker" : "giver";
        pa.look(f(R[L]), colour(R[L], L === "giver" ? R.gq : R.tq), 30); pb.look(f(R[Rr]), colour(R[Rr], Rr === "giver" ? R.gq : R.tq), 30);
        cap.textContent = "electrons flow " + (R.flip ? "←" : "→");
        eqLine.textContent = f(R.eq);
        b1.textContent = f(R[L]); b2.textContent = f(R[Rr]);
        q.innerHTML = `Which reactant is the <span style="color:var(--yellow)">${ask === "red" ? "reducing" : "oxidising"} agent</span>?`;
        fb.innerHTML = ""; tb.style.display = "none";
      }
      function answer(i) {
        const L = left(), picked = i === 0 ? L : (L === "giver" ? "taker" : "giver");
        const right = (ask === "red") === (picked === "giver");
        if (!right) {
          fb.innerHTML = `<span style="color:var(--red)">Not quite.</span> ` + (ask === "red"
            ? `${f(R.taker)} is the one <i>being</i> reduced (it gains the electrons). The reducing agent is whoever does that to it.`
            : `${f(R.giver)} is the one <i>being</i> oxidised (it loses the electrons). The oxidising agent is whoever does that to it.`);
          tb.style.display = "none"; return;
        }
        fb.innerHTML = `<span style="color:var(--green)">✓</span> ` + (ask === "red"
          ? `${f(R.giver)} hands over the electrons, so it reduces ${f(R.taker)}. It is the reducing agent, and ends up oxidised itself.`
          : `${f(R.taker)} pulls the electrons away, so it oxidises ${f(R.giver)}. It is the oxidising agent, and ends up reduced itself.`);
        tb.innerHTML = `<tr><th>reactant</th><th>electrons</th><th>what happens to it</th><th>its role</th></tr>
          <tr><td>${f(R.giver)}</td><td>gives</td><td style="color:var(--red)">is oxidised</td><td><b>reducing agent</b></td></tr>
          <tr><td>${f(R.taker)}</td><td>takes</td><td style="color:var(--blue)">is reduced</td><td><b>oxidising agent</b></td></tr>`;
        tb.style.display = "";
      }
      const stop = ticker(() => {
        phase = (phase + 0.012) % 1;
        es.forEach((e, i) => {
          const t = (phase + i / 3) % 1, u = R.flip ? 1 - t : t;
          e.setAttribute("cx", xa + 34 + u * (xb - xa - 68)); e.setAttribute("cy", cy - 16 - Math.sin(Math.PI * u) * 26);
          e.setAttribute("opacity", Math.min(1, 4 * Math.min(t, 1 - t) + 0.15));
        });
      }, 30);
      const tgR = toggle("", AGENTS.map((r, i) => [i, f(r.giver + " + " + r.taker)]), 0, (i) => { R = AGENTS[i]; draw(); });
      const tgQ = toggle("ask for the:", [["red", "reducing agent"], ["ox", "oxidising agent"]], "red", (v) => { ask = v; draw(); });
      el.append(widget("The picture shows who gives. You name the roles.", tgR, eqLine, svg, tgQ, q, h("div", { class: "btns" }, b1, b2), fb, h("div", { class: "tablewrap" }, tb)));
      draw();
      el.append(
        P("This lines up with the map from <em>The periodic table</em>. <em>Metals</em> on the left, with low <em>ionisation energy</em>, give electrons easily: they are reducing agents. <em>Halogens</em> and oxygen, with high electronegativity, pull electrons in: they are oxidising agents. Every battery in this course pairs one of each."),
        takeaway("The reducing agent gives electrons (and is oxidised). The oxidising agent takes electrons (and is reduced)."));
      return stop;
    },
    check: {
      type: "choice", q: `Sodium burns in chlorine gas: ${f("2Na + Cl2 -> 2NaCl")}. Each sodium atom gives one electron to chlorine. What is ${f("Cl2")} here?`,
      options: ["The oxidising agent, and it is itself reduced", "The reducing agent, because it ends up reduced", "The oxidising agent, and it is itself oxidised"],
      answer: 0,
      wrongHints: { 1: "Being reduced is what happens to it. Its role is named after what it does to sodium: it takes sodium's electrons, which oxidises sodium.", 2: `Right role, wrong fate. Chlorine gains electrons (${f("Cl2")} + 2e⁻ → ${f("2Cl^-")}), and gaining is reduction.` },
      why: `${f("Cl2")} takes the electrons: it oxidises sodium (so it is the oxidising agent) and is itself reduced to ${f("Cl^-")}.`, backTo: 2,
    },
  });

  // ---------------------------------------------------------------- 6
  const MOLS = [
    { name: "H2O", label: "water", atoms: [["O", 0, -22], ["H", -78, 40], ["H", 78, 40]], bonds: [[0, 1, 2], [0, 2, 2]] },
    { name: "HCl", label: "hydrogen chloride", atoms: [["H", -58, 0], ["Cl", 58, 0]], bonds: [[0, 1, 2]] },
    { name: "NH3", label: "ammonia", atoms: [["N", 0, -30], ["H", -88, 30], ["H", 0, 62], ["H", 88, 30]], bonds: [[0, 1, 2], [0, 2, 2], [0, 3, 2]] },
    { name: "SO2", label: "sulfur dioxide (simplified bonding picture)", atoms: [["S", 0, -22], ["O", -88, 38], ["O", 88, 38]], bonds: [[0, 1, 4], [0, 2, 4]] },
    { name: "Cl2", label: "chlorine gas", atoms: [["Cl", -56, 0], ["Cl", 56, 0]], bonds: [[0, 1, 2]] },
  ];
  steps.push({
    title: "No ions in sight: oxidation numbers",
    short: "Oxidation numbers",
    newConcepts: ["oxnum"],
    render(el) {
      el.append(
        P(`Every reaction so far had ions in it, so “who lost electrons” could be read off the charges. Now try hydrogen gas burning in oxygen to make water: ${f("2H2 + O2 -> 2H2O")}. There is not a single ion anywhere. Did electrons move or not?`),
        P("In water, the atoms do not hand electrons over. They <b>share</b> them: each H–O link is a pair of electrons, one from each atom, held between the two. (How sharing works is covered in <em>Silicon and light</em>.) But the sharing is lopsided. Oxygen pulls harder on the pair than hydrogen does. That pull is <em>electronegativity</em> (EN), from <em>The periodic table</em>."),
        P("So chemists use a bookkeeping trick: <b>pretend every shared electron belongs entirely to the atom that pulls harder</b>, then read off the charge each atom would have. That pretend charge is the atom's <b>oxidation number</b>."));
      const W = narrow(480, 340), H = 216, cx = W / 2, cy = 100, k = narrow(1, 0.86);
      const svg = svgBox(W, H, 580);
      const sumLine = h("div", { class: "redox-eq", style: "font-size:17px;min-height:52px" });
      let M = MOLS[0], t = 0;
      const R = (sym) => (sym === "H" ? 17 : 25);
      function calc(m) { // oxidation number of each atom
        const n = m.atoms.map(() => 0);
        m.bonds.forEach(([i, j, e]) => { const a = EL[m.atoms[i][0]].en, b = EL[m.atoms[j][0]].en; if (a > b) { n[i] -= e / 2; n[j] += e / 2; } else if (b > a) { n[j] -= e / 2; n[i] += e / 2; } });
        return n;
      }
      function draw() {
        svg.textContent = "";
        const num = calc(M), full = t > 0.99;
        const pos = M.atoms.map(([sym, x, y]) => [cx + x * k, cy + y * k, sym]);
        M.bonds.forEach(([i, j, e]) => {
          const [x1, y1, s1] = pos[i], [x2, y2, s2] = pos[j];
          svg.append(s("line", { x1, y1, x2, y2, stroke: LINE, "stroke-width": e === 4 ? 14 : 7, "stroke-linecap": "round" }));
          const en1 = EL[s1].en, en2 = EL[s2].en, len = Math.hypot(x2 - x1, y2 - y1);
          // fraction along the bond (0 = atom i, 1 = atom j) where the shared electrons sit
          let fr = 0.5;
          if (en2 > en1) fr = 0.5 + t * (1 - (R(s2) + 3) / len - 0.5); else if (en1 > en2) fr = 0.5 - t * (0.5 - (R(s1) + 3) / len);
          const px = x1 + (x2 - x1) * fr, py = y1 + (y2 - y1) * fr, nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
          const offs = e === 4 ? [-12, -4.5, 4.5, 12] : [-5, 5];
          offs.forEach((o) => svg.append(s("circle", { cx: px + nx * o, cy: py + ny * o, r: 3.6, fill: YEL })));
        });
        pos.forEach(([x, y, sym], i) => {
          const col = !full ? MUTED : num[i] > 0 ? RED : num[i] < 0 ? BLUE : MUTED;
          svg.append(s("circle", { cx: x, cy: y, r: R(sym), fill: PANEL2, stroke: col, "stroke-width": 2.5 }), T(x, y + 5, sym, { size: 14, bold: true }));
          const below = y > cy + 5 || M.atoms.length === 2;
          svg.append(T(x, below ? y + R(sym) + 15 : y - R(sym) - 22, "EN " + EL[sym].en.toFixed(2), { size: 10, fill: MUTED }));
          const lab = T(x, below ? y + R(sym) + 32 : y - R(sym) - 6, ox(num[i]), { size: 15, bold: true, fill: num[i] > 0 ? RED : num[i] < 0 ? BLUE : TXT });
          lab.setAttribute("opacity", (0.12 + 0.88 * t).toFixed(2)); svg.append(lab);
        });
        const groups = {}; M.atoms.forEach(([sym], i) => { (groups[sym + "|" + num[i]] ||= { sym, n: num[i], c: 0 }).c++; });
        sumLine.innerHTML = full ? `${f(M.name)}: ` + Object.values(groups).map((g) => `${g.c > 1 ? g.c + " × " : ""}(${ox(g.n)})`).join(" + ") + " = 0<div class='note'>a neutral molecule, so the numbers cancel</div>"
          : `<span class="note">${f(M.name)}, ${M.label}: yellow dots are the shared electrons. Slide to hand them over.</span>`;
      }
      const sl = slider({ name: "hand over", nameWidth: 96, min: 0, max: 1, step: 0.05, value: 0, fmtv: (x) => (x < 0.01 ? "shared" : x > 0.99 ? "assigned" : Math.round(x * 100) + "%"), oninput: (v) => { t = v; draw(); } });
      const tg = toggle("", MOLS.map((m, i) => [i, f(m.name)]), 0, (i) => { M = MOLS[i]; draw(); });
      el.append(widget("Shared electrons, then the pretend hand-over to the stronger puller", tg, svg, sl, sumLine));
      draw();
      el.append(
        P("In water each hydrogen “loses” its one shared electron, so it gets <b>+1</b>. Oxygen “gains” two, so it gets <b>−2</b>. Before burning, both gases were pure elements: equal partners, a tie, nobody wins an electron, oxidation number <b>0</b> (try " + f("Cl2") + "). So hydrogen went from 0 to +1: on paper it lost electrons. It was oxidised after all."),
        P(`An oxidation number is a <b>label, not a real charge</b>: the oxygen in real water is only slightly negative. To keep the two apart, oxidation numbers are written sign first (+2, −2) and real ion charges sign last (2+, 2−). For a single-atom ion they agree: ${f("Cu^2+")} has oxidation number +2.`),
        takeaway("Oxidation number = the charge an atom would have if every shared electron went to the more electronegative atom. Bookkeeping, not a real charge."));
    },
    check: {
      type: "number", q: `Hydrogen sulfide, ${f("H2S")}: one sulfur (EN ${EL.S.en.toFixed(2)}) shares one electron pair with each of two hydrogens (EN ${EL.H.en.toFixed(2)}). What is sulfur's oxidation number?`,
      answer: -2, tolerance: 0, hint: "Who pulls harder? That atom is handed one extra electron per shared pair.", why: "−2. Sulfur pulls harder, so it is handed one electron from each of the two hydrogens. Each hydrogen is +1, and 2 × (+1) + (−2) = 0.",
    },
  });

  // ---------------------------------------------------------------- 7
  const SPECIES = [
    { s: "SO4^2-", name: "sulfate ion", charge: -2, atoms: [{ el: "S", n: 1, ans: 6 }, { el: "O", n: 4, v: -2, rule: "rule 4" }], say: "Sulfur is +6 in sulfate. No S⁶⁺ ion exists: it is a label." },
    { s: "NO3^-", name: "nitrate ion", charge: -1, atoms: [{ el: "N", n: 1, ans: 5 }, { el: "O", n: 3, v: -2, rule: "rule 4" }], say: "Nitrogen is +5 in nitrate: all five of its valence electrons are counted as given to oxygen." },
    { s: "MnO4^-", name: "permanganate ion", charge: -1, atoms: [{ el: "Mn", n: 1, ans: 7 }, { el: "O", n: 4, v: -2, rule: "rule 4" }], say: "Manganese is +7, one of the highest oxidation numbers you will meet. It makes permanganate a fierce oxidising agent." },
    { s: "PbO2", name: "lead dioxide", charge: 0, atoms: [{ el: "Pb", n: 1, ans: 4 }, { el: "O", n: 2, v: -2, rule: "rule 4" }], say: "Lead is +4 here. This is the positive plate of a car battery (see Lead: the rechargeable car battery)." },
    { s: "Fe2O3", name: "iron oxide (rust-red)", charge: 0, atoms: [{ el: "Fe", n: 2, ans: 3 }, { el: "O", n: 3, v: -2, rule: "rule 4" }], say: "Each iron is +3. Two irons share the job of balancing three oxygens: 2 × (+3) + 3 × (−2) = 0." },
    { s: "H2O2", name: "hydrogen peroxide", charge: 0, atoms: [{ el: "H", n: 2, v: 1, rule: "rule 4" }, { el: "O", n: 2, ans: -1 }], say: "The exception: in a peroxide the two oxygens are bonded to each other (a tie), so each ends up at −1, not −2." },
  ];
  steps.push({
    title: "Five shortcut rules",
    short: "The rules",
    newConcepts: ["oxrules"],
    render(el) {
      el.append(
        P("Drawing shared electrons every time is slow. Luckily the tug-of-war always ends the same way for a handful of elements. That gives five shortcut rules. Apply them in this order:"),
        h("ol", { class: "redox-rules" },
          h("li", { html: `<b>A pure element is 0.</b> Zn metal, Cu metal, ${f("H2")}, ${f("O2")}, ${f("Cl2")}.` }),
          h("li", { html: `<b>A single-atom ion is its charge.</b> ${f("Cu^2+")} is +2, ${f("Cl^-")} is −1. Also inside a salt: ${f("CuSO4")} is made of ${f("Cu^2+")} and ${f("SO4^2-")}, so its copper is +2.` }),
          h("li", { html: "<b>In compounds, group 1 metals are +1, group 2 metals are +2, fluorine is −1.</b> Chlorine, bromine and iodine are −1 in simple salts and acids such as NaCl and HCl." }),
          h("li", { html: `<b>Hydrogen is +1 and oxygen is −2</b> in almost all compounds. (Named exceptions: oxygen is −1 in peroxides like ${f("H2O2")}; hydrogen is −1 when bonded to a metal.)` }),
          h("li", { html: "<b>All the numbers add up to the total charge:</b> 0 for a neutral compound, the ion's charge for a polyatomic ion. Use this to find whatever is left." })),
        P("Rule 5 does most of the work. Solve for the unknown atom below."));
      let S = SPECIES[0], x = 0;
      const head = h("div", { class: "redox-eq", style: "font-size:24px" }), body = h("div");
      function build() {
        x = 0; body.textContent = "";
        const unk = S.atoms.find((a) => a.ans != null);
        const tb = h("table", { class: "small" }), verdict = h("div", { class: "redox-msg" });
        const upd = () => {
          tb.innerHTML = `<tr><th>element</th><th class="num">atoms</th><th class="num">number each</th><th class="num">subtotal</th><th>from</th></tr>` +
            S.atoms.map((a) => { const v = a.ans != null ? x : a.v; return `<tr><td><b>${a.el}</b></td><td class="num">${a.n}</td><td class="num" style="color:${a.ans != null ? "var(--yellow)" : "inherit"}">${ox(v)}</td><td class="num">${ox(a.n * v)}</td><td class="note">${a.ans != null ? "your slider" : a.rule}</td></tr>`; }).join("");
          const sum = S.atoms.reduce((t, a) => t + a.n * (a.ans != null ? x : a.v), 0), okk = sum === S.charge;
          verdict.innerHTML = `<span class="mono">sum = <b style="color:${okk ? "var(--green)" : "var(--red)"}">${ox(sum)}</b></span>, must equal the charge of ${f(S.s)}: <span class="mono"><b>${ox(S.charge)}</b></span>. ` +
            (okk ? `<span style="color:var(--green)">✓ ${unk.el} is ${ox(unk.ans)}.</span> ${S.say}` : sum > S.charge ? "Too high: go down." : "Too low: go up.");
        };
        head.innerHTML = `${f(S.s)} <span class="note" style="font-size:14px">${S.name}</span>`;
        const sl = slider({ name: unk.el + " =", min: -3, max: 7, step: 1, value: 0, fmtv: ox, oninput: (v) => { x = v; upd(); } });
        body.append(sl, h("div", { class: "tablewrap", style: "margin-top:8px" }, tb), verdict);
        upd();
      }
      const tg = toggle("", SPECIES.map((sp, i) => [i, f(sp.s)]), 0, (i) => { S = SPECIES[i]; build(); });
      el.append(widget("Rule 5 as a solver: slide the unknown until the sum fits", tg, head, body));
      build();
      el.append(
        P("Look at what the solver gives for manganese (+7) or sulfur (+6). No such ions exist: stripping seven electrons off an atom is hopelessly expensive. These atoms share electrons with oxygen, and the rules simply count every shared electron as oxygen's. <b>Large oxidation numbers are labels, never real charges.</b>"),
        takeaway("Element = 0; simple ion = its charge; H is +1, O is −2 (nearly always); everything adds up to the total charge. Solve for the rest."));
    },
    check: {
      type: "number", q: `The dichromate ion is ${f("Cr2O7^2-")}: two chromium atoms, seven oxygens, total charge 2−. What is the oxidation number of <b>each</b> chromium?`,
      answer: 6, tolerance: 0, hint: "Seven oxygens at −2 make −14. The total must be −2, and two chromiums share the difference.", why: "+6. 2 × Cr + 7 × (−2) = −2, so the two chromiums together carry +12, which is +6 each.",
    },
  });

  // ---------------------------------------------------------------- 8
  const RXNS = [
    { eq: "Zn + Cu^2+ -> Zn^2+ + Cu", redox: true, els: [{ el: "Zn", b: 0, a: 2, n: 1 }, { el: "Cu", b: 2, a: 0, n: 1 }],
      say: "Zn climbs 0 → +2 (oxidised), Cu drops +2 → 0 (reduced). 1 atom × 2 steps = <b>2 electrons</b>, just as you watched in step 2." },
    { eq: "2H2 + O2 -> 2H2O", redox: true, els: [{ el: "H", b: 0, a: 1, n: 4 }, { el: "O", b: 0, a: -2, n: 2 }],
      say: "No ions anywhere, yet H climbs 0 → +1 and O drops 0 → −2. 4 H atoms × 1 step = <b>4 electrons</b> (and 2 O atoms × 2 steps = 4: the books agree)." },
    { eq: "AgNO3 + NaCl -> AgCl + NaNO3", redox: false, els: [{ el: "Ag", b: 1, a: 1, n: 1 }, { el: "N", b: 5, a: 5, n: 1 }, { el: "O", b: -2, a: -2, n: 3 }, { el: "Na", b: 1, a: 1, n: 1 }, { el: "Cl", b: -1, a: -1, n: 1 }],
      say: `A white solid, AgCl, drops out of the solution, which looks dramatic. But ${f("Ag^+")}, ${f("Na^+")}, ${f("Cl^-")} and ${f("NO3^-")} only swap partners. No number moves, <b>no electrons move</b>.` },
    { eq: "Fe2O3 + 2Al -> Al2O3 + 2Fe", redox: true, els: [{ el: "Fe", b: 3, a: 0, n: 2 }, { el: "Al", b: 0, a: 3, n: 2 }, { el: "O", b: -2, a: -2, n: 3 }],
      say: "Aluminium pulls the oxygen off iron (the thermite reaction, hot enough to weld rails). Al climbs 0 → +3, Fe drops +3 → 0, oxygen is a spectator at −2. 2 Al atoms × 3 steps = <b>6 electrons</b>." },
  ];
  steps.push({
    title: "Redox, redefined with oxidation numbers",
    short: "Numbers up, numbers down",
    newConcepts: ["oxchange"],
    render(el) {
      el.append(
        P("With oxidation numbers you can upgrade the definitions from step 3 so that they work with or without visible ions:"),
        formula(`<span class="hl">oxidation</span> = oxidation number goes <span class="hl">up</span><br><span class="bl">reduction</span> = oxidation number goes <span class="bl">down</span><small>each step of 1, for one atom, stands for one electron</small>`),
        P("So you can also <b>count the electrons</b> without drawing anything: (how far the number moved) × (how many atoms made that move). And if no number changes at all, the reaction is not redox, however dramatic it looks."),
        P("Below, each element is shown with its oxidation number <i>before</i> the reaction. Work out where each one ends up, make your call, then reveal."));
      const W = narrow(480, 340), H = 236, Y = (v) => 28 + (5 - v) * 24;
      const svg = svgBox(W, H, 580);
      const eqLine = h("div", { class: "redox-eq" }), msg = h("div", { class: "redox-msg" });
      let R = RXNS[0], shown = false;
      function draw() {
        svg.textContent = ""; eqLine.textContent = f(R.eq);
        for (let v = -2; v <= 5; v++) {
          svg.append(s("line", { x1: 34, y1: Y(v), x2: W - 8, y2: Y(v), stroke: v === 0 ? MUTED : LINE, "stroke-width": v === 0 ? 1.2 : 1 }), T(26, Y(v) + 4, ox(v), { size: 11, anchor: "end", fill: MUTED }));
        }
        const n = R.els.length;
        R.els.forEach((e, i) => {
          const x = 34 + (W - 42) * (i + 0.5) / n;
          svg.append(T(x, H - 6, e.el, { size: 14, bold: true }));
          const up = e.a > e.b, col = !shown || e.a === e.b ? MUTED : up ? RED : BLUE;
          if (shown && e.a !== e.b) {
            const y1 = Y(e.b) + (up ? -8 : 8), y2 = Y(e.a) + (up ? 10 : -10), d = up ? 1 : -1;
            svg.append(s("line", { x1: x, y1, x2: x, y2, stroke: col, "stroke-width": 3 }), s("path", { d: `M${x - 7},${y2 + 9 * d} L${x},${y2 - 2 * d} L${x + 7},${y2 + 9 * d} Z`, fill: col }));
            svg.append(s("circle", { cx: x, cy: Y(e.a), r: 7, fill: col }), T(x + 12, Y(e.a) + 4, ox(e.a), { size: 12, anchor: "start", fill: col, bold: true, halo: true }));
            svg.append(T(x - 12, (Y(e.a) + Y(e.b)) / 2 + 4, up ? "oxidised" : "reduced", { size: narrow(11, 10), anchor: "end", fill: col, halo: true }));
          }
          svg.append(s("circle", { cx: x, cy: Y(e.b), r: 7, fill: shown && e.a === e.b ? MUTED : PANEL2, stroke: shown && e.a === e.b ? MUTED : TXT, "stroke-width": 2 }), T(x + 12, Y(e.b) + 4, ox(e.b), { size: 12, anchor: "start", fill: TXT, halo: true }));
          if (shown && e.a === e.b) svg.append(T(x, Y(e.b) - 12, "no change", { size: 10, fill: MUTED }));
        });
      }
      function guess(g) {
        shown = true; draw();
        msg.innerHTML = (g === R.redox ? `<span style="color:var(--green)">✓ Right.</span> ` : `<span style="color:var(--red)">Not this time.</span> `) + (R.redox ? "It is a redox reaction. " : "It is <b>not</b> a redox reaction. ") + R.say;
      }
      const tg = toggle("", RXNS.map((r, i) => [i, f(r.eq.split(" -> ")[0])]), 0, (i) => { R = RXNS[i]; shown = false; msg.innerHTML = "Hollow dots: oxidation numbers before the reaction. Where does each element end up?"; draw(); });
      el.append(widget("Predict, then reveal: is it redox?", tg, eqLine, svg,
        h("div", { class: "btns" }, h("button", { onclick: () => guess(true) }, "It is redox"), h("button", { onclick: () => guess(false) }, "Not redox")), msg));
      msg.innerHTML = "Hollow dots: oxidation numbers before the reaction. Where does each element end up?"; draw();
      el.append(
        P("The definition of a <em>redox reaction</em> from step 2 is now complete: <b>a reaction in which oxidation numbers change</b>. The element whose number rises is oxidised, the one whose number falls is reduced, and the total climb always equals the total drop, because every electron lost is an electron gained."),
        takeaway("Oxidation number up = oxidised, down = reduced, unchanged everywhere = not redox. Electrons moved = change in number × atoms that changed."));
    },
    check: {
      type: "number", q: `Magnesium burns in oxygen: ${f("2Mg + O2 -> 2MgO")}. Each Mg goes from 0 to +2. How many electrons move in total, for the equation as written?`,
      answer: 4, tolerance: 0, hint: "Change in number × number of atoms that changed. There are 2 Mg atoms.", why: "4. Two Mg atoms each climb 2 steps: 2 × 2 = 4 electrons. Check from the other side: two O atoms each drop 0 → −2, also 4.", backTo: 6,
    },
  });

  // ---------------------------------------------------------------- 9
  const SANDBOX = [
    { eq: "Zn + CuSO4 -> ZnSO4 + Cu", tag: "zinc in copper sulfate", e: 2, rows: [
      { el: "Zn", L: "Zn", R: "ZnSO4", b: 0, a: 2, n: 1 }, { el: "Cu", L: "CuSO4", R: "Cu", b: 2, a: 0, n: 1 },
      { el: "S", L: "CuSO4", R: "ZnSO4", b: 6, a: 6, n: 1 }, { el: "O", L: "CuSO4", R: "ZnSO4", b: -2, a: -2, n: 4 }],
      note: `The running example, spectators included. Sulfate (${f("SO4^2-")}) passes through untouched: S stays +6 and O stays −2.` },
    { eq: "2Na + Cl2 -> 2NaCl", tag: "sodium + chlorine", e: 2, rows: [
      { el: "Na", L: "Na", R: "NaCl", b: 0, a: 1, n: 2 }, { el: "Cl", L: "Cl2", R: "NaCl", b: 0, a: -1, n: 2 }],
      note: "The first reaction of the course. Two sodium atoms give one electron each to one pair of chlorine atoms." },
    { eq: "Zn + 2HCl -> ZnCl2 + H2", tag: "zinc in acid", e: 2, rows: [
      { el: "Zn", L: "Zn", R: "ZnCl2", b: 0, a: 2, n: 1 }, { el: "H", L: "HCl", R: "H2", b: 1, a: 0, n: 2 }, { el: "Cl", L: "HCl", R: "ZnCl2", b: -1, a: -1, n: 2 }],
      note: `Zinc dissolves and hydrogen gas bubbles off. Here hydrogen at +1 is the electron taker, and ${f("Cl^-")} is the spectator. More in The activity series.` },
    { eq: "2H2 + O2 -> 2H2O", tag: "hydrogen burns", e: 4, rows: [
      { el: "H", L: "H2", R: "H2O", b: 0, a: 1, n: 4 }, { el: "O", L: "O2", R: "H2O", b: 0, a: -2, n: 2 }],
      note: "No ions at all, and still 4 electrons change owner on paper. Run through a wire, this is the reaction of a fuel cell (Hydrogen and fuel cells)." },
    { eq: "Fe2O3 + 2Al -> Al2O3 + 2Fe", tag: "thermite", e: 6, rows: [
      { el: "Fe", L: "Fe2O3", R: "Fe", b: 3, a: 0, n: 2 }, { el: "Al", L: "Al", R: "Al2O3", b: 0, a: 3, n: 2 }, { el: "O", L: "Fe2O3", R: "Al2O3", b: -2, a: -2, n: 3 }],
      note: "Aluminium is such a strong reducing agent that it tears oxygen away from iron. Six electrons per equation." },
    { eq: "Zn + 2MnO2 -> ZnO + Mn2O3", tag: "alkaline battery", e: 2, rows: [
      { el: "Zn", L: "Zn", R: "ZnO", b: 0, a: 2, n: 1 }, { el: "Mn", L: "MnO2", R: "Mn2O3", b: 4, a: 3, n: 2 }, { el: "O", L: "MnO2", R: "ZnO", b: -2, a: -2, n: 4 }],
      note: "This is the reaction inside an alkaline AA cell (Zinc: from Volta's pile to the alkaline cell). Zinc gives 2 electrons; two manganese atoms take one each, +4 → +3." },
    { eq: "AgNO3 + NaCl -> AgCl + NaNO3", tag: "white solid forms", e: 0, rows: [
      { el: "Ag", L: "AgNO3", R: "AgCl", b: 1, a: 1, n: 1 }, { el: "N", L: "AgNO3", R: "NaNO3", b: 5, a: 5, n: 1 }, { el: "O", L: "AgNO3", R: "NaNO3", b: -2, a: -2, n: 3 },
      { el: "Na", L: "NaCl", R: "NaNO3", b: 1, a: 1, n: 1 }, { el: "Cl", L: "NaCl", R: "AgCl", b: -1, a: -1, n: 1 }],
      note: "The trap. Ions swap partners and a solid drops out, but no oxidation number changes: not a redox reaction, and nothing a battery could use." },
  ];
  steps.push({
    title: "Capstone: the oxidation-number sandbox",
    short: "Capstone: sandbox",
    newConcepts: [],
    render(el) {
      el.append(
        P("Everything at once. Pick a reaction and audit it like an accountant: assign an oxidation number to every element before and after (step 7's rules), then say who was oxidised, who was reduced, and how many electrons moved (step 8)."),
        P("One of the seven is not a redox reaction at all. Two of them run inside devices you will build later in the course."));
      let R = SANDBOX[0], steppers = [], pickOx, pickRed, eStep;
      const eqLine = h("div", { class: "redox-eq" }), tagLine = note("", "text-align:center;margin-top:-6px"), stage1 = h("div"), stage2 = h("div"), summary = h("div");
      const isPure = (sp, e) => sp === e || sp === e + "2";
      function hint(row, side) {
        const sp = side === "b" ? row.L : row.R;
        if (isPure(sp, row.el)) return `${f(sp)} is a pure element: rule 1.`;
        if (row.el === "O") return `Oxygen in a compound: rule 4.`;
        if (row.el === "H") return `Hydrogen in a compound: rule 4.`;
        return `In ${f(sp)} the numbers must add up to 0 (rule 5). Fix the known ones first, then solve for ${row.el}.`;
      }
      function build() {
        eqLine.textContent = f(R.eq); tagLine.textContent = R.tag;
        stage1.textContent = ""; stage2.textContent = ""; summary.textContent = ""; stage2.style.display = "none";
        steppers = R.rows.map((row) => {
          const sb = stepper(-3, 7, 0, () => { mk.textContent = ""; }), sa = stepper(-3, 7, 0, () => { mk.textContent = ""; });
          const mk = h("div", { class: "mk" });
          stage1.append(h("div", { class: "redox-row" }, h("span", { class: "el" }, row.el),
            h("span", { class: "pair" }, h("span", { class: "sp" }, "in " + f(row.L)), sb), h("span", { class: "pair" }, h("span", { class: "sp" }, "→ in " + f(row.R)), sa), mk));
          return { sb, sa, mk, row };
        });
        const fb1 = h("div", { class: "redox-msg" });
        const check1 = () => {
          let bad = 0;
          steppers.forEach(({ sb, sa, mk, row }) => {
            const okB = sb.get() === row.b, okA = sa.get() === row.a;
            if (okB && okA) mk.innerHTML = `<span style="color:var(--green)">✓ ${ox(row.b)} → ${ox(row.a)}</span>`;
            else { bad++; mk.innerHTML = `<span style="color:var(--red)">✗ ${!okB ? "before" : "after"}:</span> <span class="note">${hint(row, !okB ? "b" : "a")}</span>`; }
          });
          if (bad) { fb1.innerHTML = `${plural(bad, "element")} still off. Fix the red rows and check again.`; stage2.style.display = "none"; summary.textContent = ""; }
          else { fb1.innerHTML = `<span style="color:var(--green)">All numbers right.</span> Now read the story off them.`; stage2.style.display = ""; }
        };
        stage1.append(h("div", { class: "btns" },
          h("button", { class: "primary", onclick: check1 }, "Check my numbers"),
          h("button", { onclick: () => { steppers.forEach(({ sb, sa, row }) => { sb.set(row.b); sa.set(row.a); }); check1(); } }, "Fill them in for me")), fb1);
        // stage 2
        const opts = [...R.rows.map((r) => [r.el, r.el]), ["none", "none"]];
        pickOx = toggle("oxidised:", opts, null, () => { summary.textContent = ""; });
        pickRed = toggle("reduced:", opts, null, () => { summary.textContent = ""; });
        eStep = stepper(0, 12, 0, () => { summary.textContent = ""; }, (v) => String(v));
        stage2.append(h("div", { style: "margin-top:16px;border-top:1px solid var(--line);padding-top:10px" },
          note("Which element was oxidised, which was reduced, and how many electrons moved for the equation as written?"),
          pickOx, pickRed,
          h("div", { class: "btns", style: "align-items:center" }, h("span", { class: "c-seg-label" }, "electrons moved:"), eStep),
          h("div", { class: "btns" }, h("button", { class: "primary", onclick: check2 }, "Check the story"))));
      }
      function check2() {
        const up = R.rows.find((r) => r.a > r.b), down = R.rows.find((r) => r.a < r.b);
        const wantOx = up ? up.el : "none", wantRed = down ? down.el : "none";
        const probs = [];
        if (pickOx.get() !== wantOx) probs.push(pickOx.get() == null ? "Pick the oxidised element (or “none”)." : "Oxidised means the number went <b>up</b>. Look for the row that climbs.");
        if (pickRed.get() !== wantRed) probs.push(pickRed.get() == null ? "Pick the reduced element (or “none”)." : "Reduced means the number went <b>down</b>. Look for the row that drops.");
        if (eStep.get() !== R.e) probs.push(up ? `Electrons: (change in number) × (atoms that changed). ${up.el} appears ${up.n} time${up.n > 1 ? "s" : ""} in the equation.` : "If no number changed, how many electrons moved?");
        if (probs.length) { summary.innerHTML = `<div class="redox-msg" style="color:var(--text)"><span style="color:var(--red)">Not yet.</span> ${probs.join(" ")}</div>`; return; }
        if (!up) { summary.innerHTML = `<div class="takeaway" style="margin-top:12px"><b>Not a redox reaction.</b> No oxidation number changed, so 0 electrons moved. ${R.note}</div>`; return; }
        const spect = R.rows.filter((r) => r.a === r.b).map((r) => `${r.el} (${ox(r.b)})`);
        summary.innerHTML = `<table class="small" style="margin-top:12px">
          <tr><td style="color:var(--red)">oxidised</td><td><b>${up.el}</b>: ${ox(up.b)} → ${ox(up.a)}, ${up.n} atom${up.n > 1 ? "s" : ""} × ${up.a - up.b} = ${R.e} e⁻ lost</td></tr>
          <tr><td style="color:var(--blue)">reduced</td><td><b>${down.el}</b>: ${ox(down.b)} → ${ox(down.a)}, ${down.n} atom${down.n > 1 ? "s" : ""} × ${down.b - down.a} = ${R.e} e⁻ gained</td></tr>
          <tr><td>reducing agent</td><td>${f(up.L)}</td></tr>
          <tr><td>oxidising agent</td><td>${f(down.L)}</td></tr>
          <tr><td>unchanged</td><td>${spect.length ? spect.join(", ") : "nothing: every element took part"}</td></tr>
          <tr><td style="color:var(--yellow)">electrons moved</td><td><b>${R.e}</b></td></tr></table>
          <div class="note" style="margin-top:8px">${R.note}</div>`;
      }
      const tg = toggle("", SANDBOX.map((r, i) => [i, f(r.eq.split(" -> ")[0])]), 0, (i) => { R = SANDBOX[i]; build(); });
      el.append(widget("Audit a reaction: numbers first, then the story", tg, eqLine, tagLine, stage1, stage2, summary));
      build();
      el.append(
        P("What to notice, each from an earlier step:"),
        h("ul", {},
          h("li", { html: "Electrons lost always equal electrons gained (<b>step 4</b>). If your two counts disagree, a number is wrong." }),
          h("li", { html: "The reducing agent is the reactant that <i>contains</i> the oxidised element, and the other way round (<b>step 5</b>)." }),
          h("li", { html: "Elements whose number does not move are spectators, like sulfate in the zinc strip experiment (<b>step 1</b>)." }),
          h("li", { html: "In the alkaline-battery reaction zinc is, once again, the electron giver. Zinc is the giver in several of the batteries in this course." })),
        P("You can now look at any inorganic reaction and say whether electrons move, from whom to whom, and how many. Two questions are still open. How do you balance the harder equations? That is <em>Balancing redox equations</em>. And which pairs actually react, and in which direction? That is <em>The activity series</em>."),
        takeaway("Assign oxidation numbers, find what went up and what went down, count the electrons. That audit is the first step of every battery calculation that follows."));
    },
  });

  Course.run({
    id: "redox",
    section: "1. Redox: electrons change hands",
    title: "Oxidation and reduction",
    concepts: {
      spectator: "spectator ion", netionic: "net ionic equation", redox: "redox reaction (electron transfer)",
      oxidation: "oxidation = losing electrons", reduction: "reduction = gaining electrons", half: "half-reaction",
      oxagent: "oxidising agent", redagent: "reducing agent", oxnum: "oxidation number", oxrules: "oxidation-number rules",
      oxchange: "redox = oxidation numbers change",
    },
    sources: [
      { title: "OpenStax, Chemistry 2e, §4.2 Classifying Chemical Reactions", url: "https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions", note: "oxidation-number rules, oxidising/reducing agents, single-displacement reactions" },
      { title: "OpenStax, Chemistry 2e, §17.1 Review of Redox Chemistry", url: "https://openstax.org/books/chemistry-2e/pages/17-1-review-of-redox-chemistry", note: "half-reactions; electrons lost = electrons gained" },
      { title: "IUPAC Gold Book: oxidation state", url: "https://goldbook.iupac.org/terms/view/O04365", note: "definition: charge of an atom after the ionic approximation of its bonds (shared electrons assigned to the more electronegative partner)" },
      { title: "Karen, McArdle, Takats (2016), Comprehensive definition of oxidation state (IUPAC Recommendations 2016)", url: "https://doi.org/10.1515/pac-2015-1204", note: "why the electronegativity-based hand-over is the definition and the school rules are shortcuts" },
      { title: "Wikipedia: Single displacement reaction", url: "https://en.wikipedia.org/wiki/Single_displacement_reaction", note: "zinc in copper sulfate: copper deposits, the blue colour fades" },
      { title: "Wikipedia: Thermite", url: "https://en.wikipedia.org/wiki/Thermite", note: "Fe2O3 + 2Al → Al2O3 + 2Fe" },
      { title: "Wikipedia: Alkaline battery", url: "https://en.wikipedia.org/wiki/Alkaline_battery", note: "overall cell reaction Zn + 2MnO2 → ZnO + Mn2O3" },
    ],
    steps,
  });
})();
