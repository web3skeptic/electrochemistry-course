// Lesson 0.1 — Atoms, electrons and charge
(function () {
  const { h, s, fmt, widget, stat, slider, toggle, hbars, rng, narrow } = Course;
  const f = Chem.f;
  const YEL = "#ffd166", RED = "#ff6b6b", BLUE = "#6cb4ff", GRN = "#5fd38d", MUT = "#9aa3b5", LINE = "#3a4458", TEXT = "#e6e9ef", GREY = "#6b7385";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const note = (html, style) => h("div", { class: "note", style: style || "", html: html || "" });
  const nf = (v) => v.toLocaleString("en-US");
  const ORD = ["1st", "2nd", "3rd", "4th", "5th"];

  // ---- data -------------------------------------------------------------------------------------------
  const BYZ = [];
  Object.values(Chem.elements).forEach((e) => { if (e.Z <= 20) BYZ[e.Z] = e; });
  // Successive ionisation energies, kJ/mol: cost of removing the 1st, 2nd, 3rd, 4th electron from a lone atom.
  // Source: Wikipedia "Molar ionization energies of the elements" (CRC Handbook values), rounded.
  // The first value is replaced by Chem.elements[..].ie1 below so the course agrees with itself.
  const IE = {
    1: [1312], 2: [2372, 5250], 3: [520, 7298, 11815], 4: [900, 1757, 14849, 21007], 5: [801, 2427, 3660, 25026],
    6: [1086, 2353, 4621, 6223], 7: [1402, 2856, 4578, 7475], 8: [1314, 3388, 5300, 7469], 9: [1681, 3374, 6050, 8408],
    10: [2081, 3952, 6122, 9371], 11: [496, 4562, 6910, 9543], 12: [738, 1451, 7733, 10543], 13: [578, 1817, 2745, 11577],
    14: [787, 1577, 3232, 4356], 15: [1012, 1907, 2914, 4964], 16: [1000, 2252, 3357, 4556], 17: [1251, 2298, 3822, 5159],
    18: [1521, 2666, 3931, 5771], 19: [419, 3052, 4420, 5877], 20: [590, 1145, 4912, 6491],
  };
  for (let Z = 1; Z <= 20; Z++) IE[Z][0] = BYZ[Z].ie1;
  // Energy released when a lone atom takes one extra electron, kJ/mol (electron affinity, rounded; Wikipedia data
  // page). null = measured/estimated negative: a lone atom does not hold the extra electron.
  const EA = { 1: 73, 2: null, 3: 60, 4: null, 5: 27, 6: 122, 7: null, 8: 141, 9: 328, 10: null, 11: 53, 12: null, 13: 42, 14: 134, 15: 72, 16: 200, 17: 349, 18: null, 19: 48, 20: 2 };
  const EA2 = { 8: 744, 16: 456 }; // cost of forcing a second electron onto O⁻ / S⁻ (lone ion), kJ/mol
  const NOBLE = { 2: "helium", 10: "neon", 18: "argon" };

  // simple shell model: 2, 8, 8, then the 4th shell (good for Z ≤ 20)
  const CAP = [2, 8, 8, 8];
  const fill = (n) => { const out = []; for (const c of CAP) { if (n <= 0) break; out.push(Math.min(c, n)); n -= c; } return out; };
  const sgn = (q) => (q > 0 ? "+" + q : q < 0 ? "−" + -q : "0");
  const ion = (sym, q) => (q === 0 ? sym : f(sym + "^" + (Math.abs(q) > 1 ? Math.abs(q) : "") + (q > 0 ? "+" : "-")));
  const cap1 = (str) => str[0].toUpperCase() + str.slice(1);

  // ---- drawing ----------------------------------------------------------------------------------------
  const SHELL_R = [32, 50, 68, 86];
  const ORDER8 = [0, 4, 2, 6, 1, 5, 3, 7];
  function slotPos(cx, cy, si, k, rs) {
    rs = rs || SHELL_R;
    const cap = CAP[si], idx = cap === 2 ? k : ORDER8[k];
    const a = -Math.PI / 2 + (idx / cap) * 2 * Math.PI + si * 0.39;
    return [cx + rs[si] * Math.cos(a), cy + rs[si] * Math.sin(a)];
  }
  function T(x, y, str, o) {
    o = o || {};
    const t = s("text", { x, y, "text-anchor": o.anchor || "middle" });
    t.textContent = str;
    t.style.fontSize = (o.size || 12) + "px"; t.style.fill = o.fill || MUT;
    if (o.bold) t.style.fontWeight = "700";
    return t;
  }
  // o: { cx, cy, Z, n, ghosts, hide: [shell, slot], core, rs, er, nr, minShells }
  function drawAtom(g, o) {
    const rs = o.rs || SHELL_R, er = o.er || 5, nr = o.nr || 15;
    const shells = fill(o.n), nDraw = Math.max(shells.length, o.minShells || 0);
    const outer = shells.length - 1;
    for (let i = 0; i < nDraw; i++) {
      if (o.core && i < outer) continue;
      const empty = i >= shells.length;
      g.append(s("circle", { cx: o.cx, cy: o.cy, r: rs[i], fill: "none", stroke: empty ? "#2e3646" : i === outer && o.hiOuter ? YEL : LINE,
        "stroke-width": i === outer && o.hiOuter ? 1.6 : 1.2, "stroke-dasharray": empty ? "3 5" : "none" }));
    }
    shells.forEach((cnt, i) => {
      if (o.core && i < outer) return;
      for (let k = 0; k < CAP[i]; k++) {
        const [x, y] = slotPos(o.cx, o.cy, i, k, rs);
        if (k < cnt) {
          if (o.hide && o.hide[0] === i && o.hide[1] === k) continue;
          g.append(s("circle", { cx: x, cy: y, r: er, fill: YEL, opacity: o.dimInner && i < outer ? 0.3 : 1 }));
        } else if (o.ghosts && i === outer) {
          g.append(s("circle", { cx: x, cy: y, r: er - 0.8, fill: "none", stroke: GREY, "stroke-dasharray": "2 2" }));
        }
      }
    });
    if (o.core && outer >= 1) {
      const inner = o.n - shells[outer];
      g.append(s("circle", { cx: o.cx, cy: o.cy, r: rs[outer - 1] + 3, fill: "rgba(255,107,107,.2)", stroke: RED, "stroke-width": 1.5 }));
      g.append(T(o.cx, o.cy + 6, sgn(o.Z - inner), { size: 17, fill: TEXT, bold: true }));
    } else {
      g.append(s("circle", { cx: o.cx, cy: o.cy, r: nr, fill: "#b93c48", stroke: RED, "stroke-width": 1.5 }));
      g.append(T(o.cx, o.cy + (nr > 12 ? 4 : 3.5), o.Z + "+", { size: nr > 12 ? 12 : 10, fill: "#fff", bold: true }));
    }
  }
  function animator() {
    let timer = null;
    const A = {
      run(ms, frame, done) {
        A.stop();
        const t0 = Date.now();
        const tick = () => {
          const p = Math.min(1, (Date.now() - t0) / ms);
          frame(p);
          if (p < 1) timer = setTimeout(tick, 16); else { timer = null; done && done(); }
        };
        tick();
      },
      stop() { if (timer) { clearTimeout(timer); timer = null; } },
    };
    return A;
  }
  const ease = (p) => p * p * (3 - 2 * p);
  const AW = () => narrow(400, 300); // viewBox width for single-atom pictures (bigger atoms on phones)
  const mkSvg = (H, W) => s("svg", { viewBox: `0 0 ${W || 400} ${H}`, width: "100%", style: "max-width:560px;display:block;margin:0 auto" });

  // One atom on a stage, with electrons that fly in and out.
  function atomStage(H) {
    const W = AW(), cx = W / 2, cy = H / 2, svg = mkSvg(H, W), anim = animator();
    let tagText = "";
    function draw(o) {
      anim.stop(); svg.innerHTML = "";
      drawAtom(svg, Object.assign({ cx, cy }, o));
      if (tagText) svg.append(T(14, 26, tagText, { anchor: "start", size: 20, fill: TEXT, bold: true }));
    }
    const dot = () => { const c = s("circle", { r: 5, fill: YEL, stroke: "#fff", "stroke-width": 0.8 }); svg.append(c); return c; };
    const put = (c, x, y, op) => { c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("opacity", op == null ? 1 : op); };
    const lastSlot = (n) => { const sh = fill(n); return [sh.length - 1, sh[sh.length - 1] - 1]; };
    return {
      svg, draw, stop: anim.stop,
      tag(t) { tagText = t; },
      // o describes the atom AFTER the electron left; nBefore = electron count before
      flyOut(o, nBefore) {
        draw(o);
        const [si, k] = lastSlot(nBefore), [x0, y0] = slotPos(cx, cy, si, k), a = Math.atan2(y0 - cy, x0 - cx);
        const x1 = cx + 230 * Math.cos(a), y1 = cy + 230 * Math.sin(a), c = dot();
        anim.run(700, (p) => put(c, x0 + (x1 - x0) * ease(p), y0 + (y1 - y0) * ease(p), 1 - p * 0.6), () => c.remove());
      },
      // o describes the atom AFTER the electron arrived (o.n = new count)
      flyIn(o) {
        const [si, k] = lastSlot(o.n), [x1, y1] = slotPos(cx, cy, si, k);
        draw(Object.assign({}, o, { hide: [si, k] }));
        const c = dot(), x0 = W - 8, y0 = 10;
        anim.run(700, (p) => put(c, x0 + (x1 - x0) * ease(p), y0 + (y1 - y0) * ease(p)), () => draw(o));
      },
      // the electron comes in, finds no room, and leaves again
      bounce(o) {
        draw(o);
        const sh = fill(o.n), R = SHELL_R[Math.max(0, sh.length - 1)] + 16, a = -0.62;
        const x1 = cx + R * Math.cos(a), y1 = cy + R * Math.sin(a), x0 = W - 8, y0 = 10, c = dot();
        anim.run(900, (p) => { const u = p < 0.5 ? ease(p * 2) : ease((1 - p) * 2); put(c, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u); }, () => c.remove());
      },
    };
  }

  const style = h("style", {}, `
    .ae-tile { width: 104px; height: 104px; flex: 0 0 auto; border: 2px solid var(--yellow); border-radius: 10px; background: var(--panel2);
      display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.15; }
    .ae-tile .z { font: 13px var(--mono); color: var(--red); }
    .ae-tile .sym { font-size: 38px; font-weight: 700; color: var(--text); }
    .ae-tile .nm { font-size: 13px; color: var(--muted); }
    .ae-flex { display: flex; gap: 16px; align-items: center; margin-bottom: 10px; }
    .ae-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; margin-top: 12px; }
    .ae-grid button { padding: 5px 0; font-size: 13px; min-width: 0; }
    .ae-grid button.on { border-color: var(--yellow); color: var(--yellow); }
    .ae-msg { min-height: 44px; margin-top: 10px; font-size: 15px; }
    .ae-eq { font-size: 19px; margin-top: 10px; min-height: 26px; color: var(--text); }
    .ae-led { display: grid; grid-template-columns: minmax(118px, auto) 1fr auto; gap: 5px 10px; align-items: center; margin-top: 12px; font-size: 14px; }
    .ae-led .bar { height: 12px; background: var(--panel2); border-radius: 3px; overflow: hidden; }
    .ae-led .bar i { display: block; height: 100%; border-radius: 3px; }
    .ae-led .v { font-family: var(--mono); text-align: right; }
    .ae-led .wide { grid-column: 2 / 4; color: var(--muted); }
    .ae-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; align-items: center; font-size: 13px; color: var(--muted); }
    .ae-chips span.c { border: 1px solid var(--line); border-radius: 12px; padding: 2px 9px; color: var(--muted); }
    .ae-chips span.c.done { border-color: var(--green); color: var(--green); }
    @media (max-width: 600px) { .ae-led { grid-template-columns: minmax(96px, auto) 1fr auto; font-size: 13px; } }
  `);
  document.head.append(style);

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "Charge: the property behind all electricity",
    short: "Charge",
    newConcepts: ["charge"],
    render(el) {
      el.append(
        P("This course ends at batteries. It starts with a grain of table salt, because everything a battery does is already hiding inside it."),
        P("Matter is made of particles, and some of them carry a property called <b>charge</b>. Charge comes in exactly two kinds. We call them <b>positive (+)</b> and <b>negative (−)</b>. The names are arbitrary, but the rule is not: <b>opposite charges pull each other together, like charges push each other apart</b>, and something with no charge feels nothing."),
        P("Two charged balls on a track. Flip their signs, change the distance, then let go:")
      );
      let qa = 1, qb = -1, d = 180, timer = null;
      const svg = mkSvg(140);
      const sWhat = stat("what happens", "y"), sF = stat("strength of the force (toy units)", "b");
      const col = (q) => (q > 0 ? RED : q < 0 ? BLUE : GREY);
      function arrow(x, y, dx, c) {
        const x2 = Math.max(6, Math.min(394, x + dx)), dir = Math.sign(dx);
        svg.append(s("line", { x1: x, y1: y, x2: x2 - dir * 6, y2: y, stroke: c, "stroke-width": 3 }));
        svg.append(s("polygon", { points: `${x2},${y} ${x2 - dir * 9},${y - 5} ${x2 - dir * 9},${y + 5}`, fill: c }));
      }
      function draw() {
        svg.innerHTML = "";
        const xa = 200 - d / 2, xb = 200 + d / 2, F = (qa * qb) / Math.pow(d / 100, 2);
        svg.append(s("line", { x1: 8, x2: 392, y1: 70, y2: 70, stroke: LINE }));
        [[xa, qa], [xb, qb]].forEach(([x, q]) => {
          svg.append(s("circle", { cx: x, cy: 70, r: 17, fill: col(q), opacity: 0.9 }));
          svg.append(T(x, 76, q > 0 ? "+" : q < 0 ? "−" : "0", { size: 18, fill: "#10141c", bold: true }));
        });
        if (F !== 0) {
          const L = Math.max(10, Math.min(150, 22 * Math.abs(F))), dir = F < 0 ? 1 : -1;
          arrow(xa, 30, dir * L, col(qa)); arrow(xb, 110, -dir * L, col(qb));
        }
        sWhat.set(F < 0 ? "they attract" : F > 0 ? "they repel" : "nothing");
        sF.set(fmt.n(Math.abs(F), 2));
      }
      const stop = () => { if (timer) { clearTimeout(timer); timer = null; } };
      const dSl = slider({ name: "distance", min: 60, max: 300, step: 1, value: d, fmtv: (x) => Math.round(x), oninput: (v) => { stop(); d = v; draw(); } });
      function letGo() {
        stop();
        if (qb === 0) { draw(); return; }
        let v = 0, k = 0;
        const tick = () => {
          v += (0.35 * qa * qb) / Math.pow(d / 100, 2); d += v; k++;
          const end = d <= 36 || d >= 340 || k > 600;
          d = Math.max(36, Math.min(340, d)); draw();
          if (end) { timer = null; dSl.set(Math.max(60, Math.min(300, d))); } else timer = setTimeout(tick, 16);
        };
        tick();
      }
      const tA = toggle("left ball", [[1, "+"], [-1, "−"]], qa, (v) => { stop(); qa = v; draw(); });
      const tB = toggle("right ball", [[1, "+"], [-1, "−"], [0, "no charge"]], qb, (v) => { stop(); qb = v; draw(); });
      el.append(widget("Two charges on a track (arrows = the force on each ball)", svg, tA, tB, dSl,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: letGo }, "Let go"),
          h("button", { onclick: () => { stop(); d = 180; dSl.set(d); draw(); } }, "Put them back")),
        h("div", { class: "readout" }, sWhat, sF)));
      draw();
      el.append(
        P("Notice the distance: halve it and the force becomes four times stronger. Close charges grip each other hard, distant ones barely notice each other. That detail will decide which atoms hold on to their charged particles and which let go."),
        P("And here is the whole subject in one sentence: <b>electricity is charge that moves</b>. A battery is a device that makes charged particles want to travel from one place to another, through your wire."),
        takeaway("Charge comes in two kinds, + and −. Opposites attract, likes repel, and the force grows fast as they get closer.")
      );
      return stop;
    },
    check: {
      type: "choice",
      q: "The left ball is + and the right ball is −. You swap the left ball for a − one. What happens now?",
      options: ["They push each other apart", "They still pull together, only more weakly", "Nothing: the two − charges cancel out"],
      answer: 0,
      wrongHints: { 1: "The pull came from the charges being opposite. Now both are −. Try it in the widget.", 2: "Charges do not cancel by sitting near each other; each one still feels the other. Two of the same kind repel." },
      why: "Two charges of the same kind repel. Only opposite charges attract.",
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "Inside an atom: protons and electrons",
    short: "Protons and electrons",
    newConcepts: ["proton", "electron"],
    render(el) {
      el.append(
        P("Zoom into the grain of salt far enough and you reach <b>atoms</b>, the building blocks of all matter. Salt contains two kinds, sodium and chlorine. They are our running example."),
        P("An atom has two parts. In the middle sits a tiny, heavy <b>nucleus</b> that contains <b>protons</b>. Each proton carries a charge of exactly <b>+1</b>. Around the nucleus move <b>electrons</b>. Each electron carries exactly <b>−1</b>: the same amount of <em>charge</em> as a proton, of the opposite kind. Opposites attract, and that attraction is what holds the electrons around the nucleus."),
        P("A sodium atom has 11 protons and 11 electrons. Add up the charges with the buttons:")
      );
      const r = rng(11), cloud = [];
      for (let i = 0; i < 22; i++) { const a = i * 2.39996 + r() * 0.5, rad = 42 + ((i * 7) % 5) * 10 + r() * 6; cloud.push([200 + rad * Math.cos(a) * 1.5, 100 + rad * Math.sin(a)]); }
      let np = 11, ne = 11;
      const svg = mkSvg(200);
      const sP = stat("protons", "r"), sE = stat("electrons", "y"), sQ = stat("net charge", "");
      const sum = note("", "margin-top:10px;font-family:var(--mono);font-size:15px;color:var(--text)");
      const msg = note("", "margin-top:6px;min-height:22px");
      function draw() {
        svg.innerHTML = "";
        svg.append(s("ellipse", { cx: 200, cy: 100, rx: 140, ry: 92, fill: "rgba(255,209,102,.05)", stroke: "#2e3646", "stroke-dasharray": "3 5" }));
        for (let i = 0; i < np; i++) { const rr = 4.7 * Math.sqrt(i + 0.5), a = i * 2.39996; svg.append(s("circle", { cx: 200 + rr * Math.cos(a), cy: 100 + rr * Math.sin(a), r: 4.3, fill: RED, stroke: "#7a2630", "stroke-width": 0.8 })); }
        for (let i = 0; i < ne; i++) svg.append(s("circle", { cx: cloud[i][0], cy: cloud[i][1], r: 4.6, fill: YEL }));
        const q = np - ne;
        sP.set(String(np)); sE.set(String(ne)); sQ.set(sgn(q));
        sum.textContent = `${np} × (+1)  +  ${ne} × (−1)  =  ${sgn(q)}`;
        msg.innerHTML = q === 0 ? "Equal numbers: the charges cancel exactly. Seen from outside, the atom is <b>neutral</b>." : q > 0 ? `${q} more proton${q > 1 ? "s" : ""} than electrons: the whole thing is positive.` : `${-q} more electron${q < -1 ? "s" : ""} than protons: the whole thing is negative.`;
      }
      const set = (p, e) => { np = Math.max(1, Math.min(20, p)); ne = Math.max(0, Math.min(22, e)); draw(); };
      el.append(widget("Red = protons in the nucleus, yellow = electrons around it (not to scale)", svg,
        h("div", { class: "btns" },
          h("button", { onclick: () => set(np, ne - 1) }, "− electron"),
          h("button", { onclick: () => set(np, ne + 1) }, "+ electron"),
          h("button", { onclick: () => set(np - 1, ne) }, "− proton"),
          h("button", { onclick: () => set(np + 1, ne) }, "+ proton"),
          h("button", { onclick: () => set(11, 11) }, "Sodium atom: 11 and 11")),
        h("div", { class: "readout" }, sP, sE, sQ), sum, msg));
      draw();
      el.append(
        P("Two facts about this picture matter for the whole course. First, the drawing is wildly out of scale: if the atom were a football stadium, the nucleus would be a pea at the centre. Second, a proton is about 1836 times heavier than an electron and is locked inside that pea. (The nucleus also holds uncharged particles called neutrons. They add weight and nothing else, so we ignore them.)"),
        P("So in chemistry, and in every battery, <b>the protons stay put and only electrons move</b>. The “+ proton” button above is something no chemical reaction can press."),
        takeaway("An atom is a nucleus of protons (+1 each) surrounded by electrons (−1 each). Net charge = protons − electrons. Only the electrons can move.")
      );
    },
    check: {
      type: "number",
      q: "A sodium atom (11 protons, 11 electrons) loses one electron. What is its net charge now?",
      answer: 1, tolerance: 0, shown: "+1", placeholder: "e.g. -2 or +3",
      hint: "Count: 11 × (+1) plus 10 × (−1).",
      why: "+1. Eleven protons are now facing only ten electrons, so one + is left over.",
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "The proton count names the element",
    short: "Atomic number",
    newConcepts: ["atomicNumber"],
    render(el) {
      el.append(
        P("What makes sodium sodium, and chlorine chlorine? One number: <b>how many protons are in the nucleus</b>. It is called the <b>atomic number</b>, written <b>Z</b>."),
        P("Every atom with 11 <em>protons</em> is sodium (symbol Na, from its Latin name <i>natrium</i>). Every atom with 17 is chlorine (Cl). Atoms of one kind are called an <b>element</b>, and there is one element for every Z: 1, 2, 3 and so on, with no gaps."),
        P("The electron count does <b>not</b> decide the name. Change both and watch which one changes the tile:")
      );
      let Z = 11, ne = 11;
      const tile = h("div", { class: "ae-tile" });
      const desc = h("div", { style: "font-size:15px" });
      const grid = h("div", { class: "ae-grid" });
      const btns = [];
      function draw() {
        const e = BYZ[Z], q = Z - ne;
        tile.innerHTML = `<div class="z">Z = ${Z}</div><div class="sym">${e.sym}</div><div class="nm">${e.name}</div>`;
        desc.innerHTML = `<b>${Z} proton${Z > 1 ? "s" : ""}</b> → this is <b>${e.name}</b>.<br>${ne} electron${ne === 1 ? "" : "s"} → net charge <b>${sgn(q)}</b>` +
          (q === 0 ? ": a neutral atom." : `. Still ${e.name}: the name never looks at the electrons.`);
        btns.forEach((b, i) => b.classList.toggle("on", i + 1 === Z));
      }
      const zSl = slider({ name: "protons", min: 1, max: 20, step: 1, value: Z, fmtv: (x) => x, oninput: (v) => { Z = v; ne = v; eSl.set(v); draw(); } });
      const eSl = slider({ name: "electrons", min: 0, max: 22, step: 1, value: ne, fmtv: (x) => x, oninput: (v) => { ne = v; draw(); } });
      for (let z = 1; z <= 20; z++) { const b = h("button", { title: BYZ[z].name, onclick: () => { Z = z; ne = z; zSl.set(z); eSl.set(z); draw(); } }, BYZ[z].sym); btns.push(b); grid.append(b); }
      el.append(widget("The first 20 elements: move the protons, then move only the electrons", h("div", { class: "ae-flex" }, tile, desc), zSl, eSl, grid));
      draw();
      el.append(
        P("Moving the proton slider also resets the electrons to match, because that is how atoms normally come: <b>a neutral atom has exactly Z electrons</b>. So Z tells you two things at once: which element it is, and how many electrons the neutral atom has to place somewhere."),
        P("Where it places them is the next step, and it is the reason sodium and chlorine behave so differently."),
        takeaway("Atomic number Z = number of protons. It fixes the element. A neutral atom also has Z electrons, but electrons can come and go without changing the element.")
      );
    },
    check: {
      type: "choice",
      q: "A particle has <b>17 protons</b> and <b>18 electrons</b>. Which element is it? (Z: sulfur 16, chlorine 17, argon 18)",
      options: ["Argon, because it has 18 electrons", "Chlorine, with a net charge of −1", "Something between chlorine and argon"],
      answer: 1,
      wrongHints: { 0: "The element is named by its protons, never by its electrons. Count the protons.", 2: "There is nothing in between: 17 protons is chlorine, full stop. The extra electron only changes the charge." },
      why: "17 protons means chlorine. The 18th electron gives it a net charge of 17 − 18 = −1.",
      backTo: 1,
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "Electrons live in shells",
    short: "Electron shells",
    newConcepts: ["shell"],
    render(el) {
      el.append(
        P("The electrons of an atom do not crowd together next to the nucleus. They arrange themselves in layers called <b>electron shells</b>, and each shell has a fixed number of seats."),
        P("The rule for the first 20 elements is short: the first shell (closest to the nucleus) holds <b>2</b> electrons, the second holds <b>8</b>, the third holds <b>8</b>. Electrons fill from the inside out, because the inner seats are closer to the positive nucleus and so are held more tightly (remember how the force grew with closeness in step 1). Only when a shell is full does the next one start."),
        P("Add electrons one at a time (the proton count follows, so the atom stays neutral) and watch the seats fill:")
      );
      let Z = 11;
      const W = AW(), svg = mkSvg(200, W);
      const sEl = stat("element", ""), sSh = stat("electrons per shell", "y"), sRoom = stat("empty seats in outer shell", "b");
      function draw() {
        svg.innerHTML = "";
        drawAtom(svg, { cx: W / 2, cy: 100, Z, n: Z, ghosts: true, minShells: 3 });
        const sh = fill(Z);
        svg.append(T(14, 26, BYZ[Z].sym, { anchor: "start", size: 20, fill: TEXT, bold: true }));
        sEl.set(`${BYZ[Z].name} (Z = ${Z})`); sSh.set(sh.join(", ")); sRoom.set(String(CAP[sh.length - 1] - sh[sh.length - 1]));
      }
      const set = (z) => { Z = Math.max(1, Math.min(20, z)); zSl.set(Z); draw(); };
      const zSl = slider({ name: "electrons", min: 1, max: 20, step: 1, value: Z, fmtv: (x) => x, oninput: (v) => { Z = v; draw(); } });
      el.append(widget("Shell diagram: nucleus in the middle, dashed circles = empty seats", svg, zSl,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => set(Z + 1) }, "Add one electron"),
          h("button", { onclick: () => set(Z - 1) }, "Take one away"),
          h("button", { onclick: () => set(11) }, "Sodium (11)"),
          h("button", { onclick: () => set(17) }, "Chlorine (17)")),
        h("div", { class: "readout" }, sEl, sSh, sRoom)));
      draw();
      el.append(
        P("Our two atoms come out as: sodium <b>2, 8, 1</b> and chlorine <b>2, 8, 7</b>. Sodium has one lonely electron starting a new shell. Chlorine's outer shell is one electron short of full. Keep those two pictures in mind."),
        note("This 2, 8, 8 picture is a <b>simplified model</b>. Real electrons are not little balls on circular tracks, and the third shell can in fact hold 18 (that matters from element 21 on). For the first 20 elements, and for everything in this lesson, the simple model gives the right answers."),
        takeaway("Electrons fill shells from the inside out: 2, then 8, then 8. Sodium is 2, 8, 1 and chlorine is 2, 8, 7.")
      );
    },
    check: {
      type: "number",
      q: "Silicon has Z = 14. How many electrons sit in its <b>third</b> shell?",
      answer: 4, tolerance: 0,
      hint: "Fill the first shell (2), then the second (8). What is left over?",
      why: "4. Fourteen electrons: 2 in the first shell, 8 in the second, and the remaining 4 go into the third (2, 8, 4).",
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "Valence electrons: the only ones that matter outside",
    short: "Valence electrons",
    newConcepts: ["valence", "corePull"],
    render(el) {
      el.append(
        P("When two atoms meet, their outer <em>shells</em> touch first. The inner shells are buried and never take part. So chemistry is decided almost entirely by the electrons in the outermost shell. They are called <b>valence electrons</b>. Sodium (2, 8, 1) has 1. Chlorine (2, 8, 7) has 7."),
        P("How firmly are they held? A valence electron is attracted by all the protons in the nucleus, but the inner electrons sit in between and push it away. Roughly, each inner electron cancels one proton. What is left is the <b>net pull</b> on the outer shell:"),
        formula('net pull on the outer shell ≈ <span class="hl">protons</span> − <span class="bl">inner electrons</span><small>a rough estimate (it ignores the pushing among the valence electrons themselves), but good enough to compare atoms</small>'),
        P("Collapse the inner part of the atom into one blob and see what the valence electrons are actually facing:")
      );
      let Z = 11, core = true;
      const W = AW(), svg = mkSvg(200, W);
      const sV = stat("valence electrons", "y"), sI = stat("inner electrons", "b"), sC = stat("net pull on outer shell", "r");
      const msg = note("", "margin-top:10px;min-height:44px;font-size:15px;color:var(--text)");
      function draw() {
        svg.innerHTML = "";
        const sh = fill(Z), v = sh[sh.length - 1], inner = Z - v;
        drawAtom(svg, { cx: W / 2, cy: 100, Z, n: Z, core, hiOuter: true, dimInner: true, minShells: 3 });
        svg.append(T(14, 26, BYZ[Z].sym, { anchor: "start", size: 20, fill: TEXT, bold: true }));
        sV.set(String(v)); sI.set(String(inner)); sC.set(`${Z} − ${inner} = ${sgn(Z - inner)}`);
        const nm = cap1(BYZ[Z].name);
        msg.innerHTML = Z === 11 ? "Sodium: one valence electron, far out, facing a net pull of only +1. It is <b>loosely held</b>."
          : Z === 17 ? "Chlorine: seven valence electrons, closer in, each facing a net pull of +7. They are <b>tightly held</b>, and an extra electron in the one empty seat would feel that +7 too."
          : `${nm}: ${v} valence electron${v > 1 ? "s" : ""}, each facing a net pull of about ${sgn(Z - inner)}.`;
      }
      const zSl = slider({ name: "Z", min: 1, max: 20, step: 1, value: Z, fmtv: (x) => `${x} ${BYZ[x].sym}`, oninput: (v) => { Z = v; draw(); } });
      const tg = toggle("view", [[true, "collapse the inner part"], [false, "whole atom"]], core, (v) => { core = v; draw(); });
      const set = (z) => { Z = z; zSl.set(z); draw(); };
      el.append(widget("What the valence electrons face (outer shell highlighted)", svg, tg, zSl,
        h("div", { class: "btns" },
          h("button", { onclick: () => set(11) }, "Sodium"),
          h("button", { onclick: () => set(17) }, "Chlorine"),
          h("button", { onclick: () => set(19) }, "Potassium"),
          h("button", { onclick: () => set(9) }, "Fluorine")),
        h("div", { class: "readout" }, sV, sI, sC), msg));
      draw();
      el.append(
        P("Slide through one row, from sodium (11) to chlorine (17). The shell stays the same while the net pull climbs from +1 to +7. <b>Atoms with few valence electrons hold them weakly. Atoms with an almost full outer shell hold theirs strongly, and have a strong pull to offer a newcomer.</b>"),
        takeaway("Valence electrons are the outer-shell electrons. They face a net pull of about (protons − inner electrons): +1 for sodium, +7 for chlorine.")
      );
    },
    check: {
      type: "number",
      q: "Magnesium is 2, 8, 2 with 12 protons. Roughly what net pull do its two valence electrons face?",
      answer: 2, tolerance: 0, shown: "+2",
      hint: "Protons minus inner electrons. The inner electrons are the ones in the first two shells.",
      why: "+2. Twelve protons, screened by the 2 + 8 = 10 inner electrons: 12 − 10 = +2.",
      backTo: 3,
    },
  });

  // ---------------------------------------------------------------- 6
  steps.push({
    title: "The full shell: where stripping electrons hits a wall",
    short: "The full shell",
    newConcepts: ["fullShell"],
    render(el) {
      el.append(
        P("Here is a real measurement. Take a lone atom and pull its electrons off one at a time, recording the energy each one costs. The unit is kJ/mol: kilojoules for a fixed, enormous batch of atoms (the <em>mole</em>, defined in <em>Ions, salts and electrolytes</em>). For now, just compare the numbers."),
        P("Sodium's first electron is cheap. Look at what the second one costs:")
      );
      const opts = [[11, "Na  2, 8, 1"], [12, "Mg  2, 8, 2"], [13, "Al  2, 8, 3"], [10, "Ne  2, 8"]];
      let Z = 11;
      const W = AW(), svg = mkSvg(150, W);
      const bars = hbars(ORD.slice(0, 4).map((o) => o + " electron"), { max: 12000, fmtv: nf, labelWidth: 104 });
      const msg = note("", "margin-top:10px;min-height:44px;font-size:15px;color:var(--text)");
      function draw() {
        svg.innerHTML = "";
        const sh = fill(Z), v = NOBLE[Z] ? 0 : sh[sh.length - 1];
        drawAtom(svg, { cx: W / 2, cy: 75, Z, n: Z, rs: [22, 36, 50, 64], er: 4.2, nr: 12, minShells: 3, hiOuter: true });
        svg.append(T(14, 26, BYZ[Z].sym, { anchor: "start", size: 20, fill: TEXT, bold: true }));
        bars.update(IE[Z], IE[Z].map((_, i) => (i < v ? GRN : RED)));
        const nm = cap1(BYZ[Z].name);
        msg.innerHTML = v === 0
          ? `${nm}'s outer shell is already full. There is no cheap electron at all: even the first one costs ${nf(IE[Z][0])}, four times sodium's.`
          : `${nm}: the ${v === 1 ? "first electron is a valence electron" : "first " + v + " electrons are valence electrons"} (green). Number ${v + 1} has to come out of the full shell underneath (red) and costs <b>${fmt.n(IE[Z][v] / IE[Z][v - 1], 1)}×</b> as much as the one before it.`;
      }
      const tg = toggle("atom", opts.map(([z, t]) => [z, t]), Z, (v) => { Z = v; draw(); });
      el.append(widget("Cost of removing each electron, kJ/mol (measured). Green = valence electron, red = from a full shell", svg, tg, bars, msg));
      draw();
      el.append(
        P("The wall is always in the same place: right after the last <em>valence electron</em>. Once those are gone, what remains is a <b>full shell</b>, close to the nucleus and facing a large <em>net pull</em>. Breaking into it costs several times more. Ordinary chemistry never pays that price."),
        P("A full shell is just as unwelcoming in the other direction: there is no free seat, so an extra electron would have to start a new shell, where the net pull on it is about zero."),
        P("Elements whose <i>neutral</i> atoms already end on a full shell are helium (2), neon (2, 8) and argon (2, 8, 8). They neither give nor take electrons, and they react with almost nothing. Their arrangement is called a <b>noble-gas configuration</b>. Every other atom is a few electrons away from one, and that distance is what drives it."),
        takeaway("A full outer shell (noble-gas configuration: 2 / 2, 8 / 2, 8, 8) is the stable arrangement. Electrons above it come off cheaply; electrons in it do not.")
      );
    },
    check: {
      type: "number",
      q: "Calcium is 2, 8, 8, 2. You strip its electrons one by one. Which removal is the first to hit the wall: the 1st, 2nd, 3rd or 4th? (type the number)",
      answer: 3, tolerance: 0,
      hint: "The wall comes right after the last valence electron. How many valence electrons does calcium have?",
      why: "The 3rd. Calcium's two valence electrons come off cheaply (590 and 1,145 kJ/mol). The third must come out of the full shell below and costs 4,912.",
      backTo: 4,
    },
  });

  // ---------------------------------------------------------------- 7
  steps.push({
    title: "Losing electrons: sodium becomes a positive ion",
    short: "Ions and cations",
    newConcepts: ["ion", "cation"],
    render(el) {
      el.append(
        P("Sodium is one electron above a <em>full shell</em>. Pull that electron off and see what is left:")
      );
      const stage = atomStage(200);
      let Z = 11, n = 11;
      const sP = stat("protons", "r"), sE = stat("electrons", "y"), sQ = stat("net charge", "");
      const eq = h("div", { class: "ae-eq" }), msg = note("", "margin-top:8px;min-height:66px;font-size:15px;color:var(--text)");
      const state = () => ({ Z, n, ghosts: false, minShells: fill(Z).length });
      function info() {
        const e = BYZ[Z], q = Z - n, v = fill(Z).slice(-1)[0];
        stage.tag(ion(e.sym, q));
        sP.set(String(Z)); sE.set(String(n)); sQ.set(sgn(q));
        eq.textContent = q === 0 ? "" : f(`${e.sym} -> ${ion(e.sym, q)} + ${q > 1 ? q : ""}e-`);
        const paid = IE[Z].slice(0, q).reduce((a, b) => a + b, 0);
        msg.innerHTML = q === 0 ? `Neutral ${e.name}: ${fill(Z).join(", ")}. ${v} valence electron${v > 1 ? "s" : ""} above a full shell.`
          : q < v ? `${ion(e.sym, q)}: ${v - q} valence electron${v - q > 1 ? "s" : ""} still to go. Paid so far: ${nf(paid)} kJ/mol.`
          : q === v ? `<b>${ion(e.sym, q)}</b>: ${Z} protons, ${n} electrons, arranged ${fill(n).join(", ")} like ${NOBLE[n]}. A full outer shell, reached for ${nf(paid)} kJ/mol. This is the ion ${e.name} really forms.`
          : `<span style="color:var(--red)">That electron came out of the full shell: ${nf(IE[Z][q - 1])} kJ/mol, ${fmt.n(IE[Z][q - 1] / IE[Z][q - 2], 1)}× the one before.</span> ${ion(e.sym, q)} does not exist in ordinary chemistry.`;
      }
      function pull() {
        const v = fill(Z).slice(-1)[0];
        if (Z - n > v) return;
        n -= 1; info(); stage.flyOut(state(), n + 1);
      }
      function reset(z) { Z = z; n = z; info(); stage.draw(state()); }
      const tg = toggle("atom", [[11, "Na  2, 8, 1"], [12, "Mg  2, 8, 2"], [13, "Al  2, 8, 3"]], Z, (v) => reset(v));
      el.append(widget("Pull electrons off, one at a time", stage.svg, tg,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: pull }, "Pull off an electron"),
          h("button", { onclick: () => reset(Z) }, "Reset")),
        h("div", { class: "readout" }, sP, sE, sQ), eq, msg));
      reset(11);
      el.append(
        P("The nucleus did not change, so this is still sodium (<em>atomic number</em> 11). But 11 protons now face 10 electrons, and the particle has a net charge of +1. An atom with a net charge is called an <b>ion</b>. A positive ion, one that has <b>lost</b> electrons, is a <b>cation</b>."),
        P("We write the charge as a superscript: Na⁺. Losing two gives a 2+, as in Mg²⁺. The event itself is written like this, with e⁻ for the electron that left:"),
        formula(f("Na -> Na^+ + e-") + "<small>atoms balance (one Na on each side) and charge balances (0 on the left, +1 − 1 = 0 on the right)</small>"),
        P("Press the button once more on Na⁺ and you run into the wall from the last step. That is why sodium always forms Na⁺ and never Na²⁺. Try magnesium and aluminium: each stops where its valence electrons run out."),
        takeaway("An ion is an atom with a net charge. Losing electrons makes a positive ion, a cation: Na → Na⁺ + e⁻. Atoms lose only their valence electrons.")
      );
      return stage.stop;
    },
    check: {
      type: "number",
      q: f("Aluminium (Z = 13; 2, 8, 3) loses all three valence electrons and becomes Al^3+. How many electrons does the ion have?"),
      answer: 10, tolerance: 0,
      hint: "The protons stay at 13. A charge of 3+ means three fewer electrons than protons.",
      why: "10. Thirteen protons and ten electrons give 13 − 10 = +3, arranged 2, 8 like neon.",
      backTo: 1,
    },
  });

  // ---------------------------------------------------------------- 8
  steps.push({
    title: "Gaining electrons: chlorine becomes a negative ion",
    short: "Anions",
    newConcepts: ["anion"],
    render(el) {
      el.append(
        P("Chlorine (2, 8, 7) has the opposite problem. Removing seven tightly held electrons is out of the question. But there is exactly <b>one empty seat</b> in its outer shell, and whoever sits there feels a <em>net pull</em> of about +7. Offer it an electron:")
      );
      const stage = atomStage(200);
      let Z = 17, n = 17;
      const NAMES = { 17: "chloride", 9: "fluoride", 8: "oxide", 16: "sulfide" };
      const sP = stat("protons", "r"), sE = stat("electrons", "y"), sQ = stat("net charge", "");
      const eq = h("div", { class: "ae-eq" }), msg = note("", "margin-top:8px;min-height:66px;font-size:15px;color:var(--text)");
      const state = () => ({ Z, n, ghosts: true, minShells: fill(Z).length });
      function info(bounced) {
        const e = BYZ[Z], q = Z - n, k = -q, room = 8 - fill(Z).slice(-1)[0];
        stage.tag(ion(e.sym, q));
        sP.set(String(Z)); sE.set(String(n)); sQ.set(sgn(q));
        eq.textContent = q === 0 ? "" : f(`${e.sym} + ${k > 1 ? k : ""}e- -> ${ion(e.sym, q)}`);
        msg.innerHTML = bounced ? `<span style="color:var(--red)">No free seat.</span> The outer shell of ${ion(e.sym, q)} is full, so this electron would have to start a new shell, far out, where ${Z} protons are outnumbered by ${n} electrons. It is pushed away.`
          : q === 0 ? `Neutral ${e.name}: ${fill(Z).join(", ")}. ${room} empty seat${room > 1 ? "s" : ""} in the outer shell.`
          : k < room ? `${ion(e.sym, q)}: one seat still empty. The first electron released ${EA[Z]} kJ/mol as it settled in.`
          : `<b>${ion(e.sym, q)}</b>, the ${NAMES[Z]} ion: ${Z} protons, ${n} electrons, arranged ${fill(n).join(", ")} like ${NOBLE[n]}. A full outer shell. ` +
            (k === 1 ? `Instead of costing energy, the electron <b>released</b> ${EA[Z]} kJ/mol as it settled in.`
              : `The first electron released ${EA[Z]} kJ/mol. The second had to be pushed onto an already negative ion and costs a lone ion ${EA2[Z]} kJ/mol; in a real solid the positive neighbours pay that back (next lessons).`);
      }
      function offer() {
        if (fill(n).slice(-1)[0] === 8) { info(true); stage.bounce(state()); return; }
        n += 1; info(); stage.flyIn(state());
      }
      function reset(z) { Z = z; n = z; info(); stage.draw(state()); }
      const tg = toggle("atom", [[17, "Cl  2, 8, 7"], [9, "F  2, 7"], [8, "O  2, 6"], [16, "S  2, 8, 6"]], Z, (v) => reset(v));
      el.append(widget("Offer electrons, one at a time (dashed circles = empty seats)", stage.svg, tg,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: offer }, "Offer an electron"),
          h("button", { onclick: () => reset(Z) }, "Reset")),
        h("div", { class: "readout" }, sP, sE, sQ), eq, msg));
      reset(17);
      el.append(
        P("Seventeen protons now face 18 electrons: net charge −1. A negative <em>ion</em>, one that has <b>gained</b> electrons, is an <b>anion</b>. Its name gets the ending <i>-ide</i>: a chlorine atom becomes a chlor<i>ide</i> ion, Cl⁻."),
        formula(f("Cl + e- -> Cl^-") + "<small>charge balances: 0 − 1 on the left, −1 on the right</small>"),
        P("Offer Cl⁻ another electron and it bounces: a full shell has no seat. Oxygen and sulfur have two empty seats, so they end up as O²⁻ and S²⁻."),
        P("Put the last two steps side by side. <b>Atoms with few valence electrons empty their outer shell and become cations. Atoms with a nearly full outer shell fill it and become anions.</b> Both end on a noble-gas configuration."),
        takeaway("Gaining electrons makes a negative ion, an anion: Cl + e⁻ → Cl⁻. Atoms gain just enough to fill their outer shell.")
      );
      return stage.stop;
    },
    check: {
      type: "choice",
      q: "All three of these particles have 18 electrons arranged 2, 8, 8. Which one is an <b>anion</b>?",
      options: ["18 protons, 18 electrons", "19 protons, 18 electrons", "16 protons, 18 electrons"],
      answer: 2,
      wrongHints: { 0: "Equal numbers of protons and electrons cancel: that is a neutral atom (argon), not an ion.", 1: "More protons than electrons leaves a positive charge. That is a cation (K⁺)." },
      why: "16 protons and 18 electrons give a net charge of −2: the anion S²⁻. The first is a neutral argon atom, the second is the cation K⁺. Same electron arrangement, three different elements.",
      backTo: 6,
    },
  });

  // ---------------------------------------------------------------- 9
  steps.push({
    title: "Give and take: sodium meets chlorine",
    short: "Sodium meets chlorine",
    newConcepts: [],
    render(el) {
      el.append(
        P("Now put the two atoms next to each other. Sodium has one electron it holds weakly. Chlorine has one empty seat with a strong pull. You can guess what happens.")
      );
      const svg = mkSvg(200), anim = animator();
      const RS = [24, 40, 56], cy = 90;
      let mode = "start";
      const sNa = stat("sodium", ""), sCl = stat("chlorine", ""), sTot = stat("total charge", "");
      const msg = note("", "margin-top:10px;min-height:88px;font-size:15px;color:var(--text)");
      function draw(shift, hide) {
        svg.innerHTML = "";
        const nNa = mode === "fwd" ? 10 : mode === "rev" ? 12 : 11, nCl = mode === "fwd" ? 18 : mode === "rev" ? 16 : 17;
        const xa = 96 + shift, xb = 304 - shift;
        drawAtom(svg, { cx: xa, cy, Z: 11, n: nNa, rs: RS, er: 4, nr: 11, minShells: 3, ghosts: true, hide: hide && hide[0] === "Na" ? hide[1] : null });
        drawAtom(svg, { cx: xb, cy, Z: 17, n: nCl, rs: RS, er: 4, nr: 11, minShells: 3, ghosts: true, hide: hide && hide[0] === "Cl" ? hide[1] : null });
        svg.append(T(xa, 174, ion("Na", 11 - nNa), { size: 18, fill: 11 - nNa > 0 ? RED : 11 - nNa < 0 ? BLUE : TEXT, bold: true }));
        svg.append(T(xb, 174, ion("Cl", 17 - nCl), { size: 18, fill: 17 - nCl > 0 ? RED : 17 - nCl < 0 ? BLUE : TEXT, bold: true }));
        svg.append(T(xa, 192, fill(nNa).join(", "), { size: 12 }));
        svg.append(T(xb, 192, fill(nCl).join(", "), { size: 12 }));
        sNa.set(sgn(11 - nNa)); sCl.set(sgn(17 - nCl)); sTot.set(sgn(11 - nNa + 17 - nCl));
      }
      function text() {
        msg.innerHTML = mode === "start" ? "Two neutral atoms: sodium 2, 8, 1 and chlorine 2, 8, 7."
          : mode === "fwd" ? `<b>${f("Na + Cl -> Na^+ + Cl^-")}</b>. Both now end on a full shell. The bill, for lone atoms: sodium's electron cost ${IE[11][0]} kJ/mol, chlorine paid back ${EA[17]}. That still leaves ${IE[11][0] - EA[17]} to pay, and the last move covers it: the new + and − ions attract (step 1), and falling together releases far more than that.`
          : `<span style="color:var(--red)">The reverse.</span> Pulling an electron off chlorine costs ${nf(IE[17][0])} kJ/mol, sodium pays back only ${EA[11]}, and neither ends on a full shell (Na⁻ is 2, 8, 2 and Cl⁺ is 2, 8, 6). Nothing pays for this. It does not happen.`;
      }
      function go(m) {
        anim.stop();
        const fwd = m === "fwd";
        mode = "start";
        const from = fwd ? slotPos(96, cy, 2, 0, RS) : slotPos(304, cy, 2, 6, RS);
        const to = fwd ? slotPos(304, cy, 2, 7, RS) : slotPos(96, cy, 2, 1, RS);
        mode = m; text();
        const hide = fwd ? ["Cl", [2, 7]] : ["Na", [2, 1]];
        draw(0, hide);
        const c = s("circle", { r: 4.6, fill: YEL, stroke: "#fff", "stroke-width": 0.8, cx: from[0], cy: from[1] }); svg.append(c);
        anim.run(800, (p) => { const u = ease(p); c.setAttribute("cx", from[0] + (to[0] - from[0]) * u); c.setAttribute("cy", from[1] + (to[1] - from[1]) * u - 26 * Math.sin(Math.PI * u)); },
          () => { if (fwd) anim.run(600, (p) => draw(34 * ease(p))); else draw(0); });
      }
      function reset() { anim.stop(); mode = "start"; text(); draw(0); }
      el.append(widget("One electron, two atoms", svg,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => go("fwd") }, "Sodium gives its electron to chlorine"),
          h("button", { onclick: () => go("rev") }, "Try the reverse: chlorine gives to sodium"),
          h("button", { onclick: reset }, "Reset")),
        h("div", { class: "readout" }, sNa, sCl, sTot), msg));
      reset();
      el.append(
        P("One electron changed owner. Count the charge before and after: 0 and 0. <b>Charge is never created or destroyed here, only moved.</b> What was created is a <em>cation</em> next to an <em>anion</em>, gripping each other. Pack billions of those pairs together and you have the grain of salt we started with (how they pack is the subject of <em>Ions, salts and electrolytes</em>)."),
        P("Now the thread of this whole course. In this picture the electron jumps straight from the giver to the taker, and the energy is lost as heat. <b>If you could keep the two apart and make the electron travel through a wire to get there, that moving charge would be an electric current.</b> That is all a battery is. The rest of the course is about which elements give, which take, and how to build the detour."),
        takeaway("Sodium gives one electron, chlorine takes it: Na + Cl → Na⁺ + Cl⁻. Total charge stays zero. An electron moving from a giver to a taker is the raw material of electricity.")
      );
      return anim.stop;
    },
    check: {
      type: "choice",
      q: "Potassium is 2, 8, 8, 1. Fluorine is 2, 7. One atom of each meet. What do you expect?",
      options: [
        f("Fluorine gives its 7 valence electrons to potassium: F^7+ and K^7-"),
        f("Potassium gives 1 electron to fluorine: K^+ and F^-"),
        "Nothing: both atoms are neutral, so they do not attract",
      ],
      answer: 1,
      wrongHints: { 0: "Fluorine's seven valence electrons face a net pull of +7, and potassium has no use for seven more. Which atom has the single loosely held electron?", 2: "Sodium and chlorine were neutral too. What matters is that one holds an electron weakly and the other has an empty seat with a strong pull." },
      why: "Potassium loses its single valence electron (K⁺: 2, 8, 8, like argon) and fluorine fills its one empty seat (F⁻: 2, 8, like neon). Same story as sodium and chlorine.",
      backTo: 4,
    },
  });

  // ---------------------------------------------------------------- 10
  steps.push({
    title: "Capstone: the ion workbench",
    short: "Capstone: ion workbench",
    newConcepts: [],
    render(el) {
      el.append(
        P("Everything at once. Pick any of the first 20 elements, then strip electrons off or push electrons on, and read the bill. The bars are real measurements for lone atoms, in kJ/mol. The question to keep asking: <b>which ions are cheap to make?</b>")
      );
      const stage = atomStage(200);
      const MAXADD = 3;
      let Z = 11, n = 11, bounced = false;
      const sSp = stat("particle", "y"), sP = stat("protons", "r"), sE = stat("electrons", ""), sSh = stat("shells", "b");
      sSp.querySelector(".v").style.fontFamily = "inherit";
      const led = h("div", { class: "ae-led" });
      const msg = h("div", { class: "ae-msg" });
      const GOALS = [[11, 1], [12, 2], [13, 3], [17, -1], [8, -2], [19, 1], [10, "b"]];
      const done = new Set();
      const chips = h("div", { class: "ae-chips" });
      const state = () => ({ Z, n, ghosts: true, minShells: fill(Z).length });
      const val = (z) => fill(z).slice(-1)[0];
      const fromFull = (z, i) => !!NOBLE[z] || i >= val(z);
      const maxRemove = () => Math.min(Z, 4);
      function row(label, v, color, txt) {
        led.append(h("div", {}, label));
        if (v == null) led.append(h("div", { class: "wide", html: txt }));
        else led.append(h("div", { class: "bar" }, h("i", { style: `width:${Math.min(100, (v / 12000) * 100)}%;background:${color}` })), h("div", { class: "v", style: `color:${color}`, html: `${nf(v)} <span style="color:var(--muted);font-family:inherit;font-size:12px">${txt}</span>` }));
      }
      function verdict() {
        const e = BYZ[Z], q = Z - n, v = val(Z), nm = cap1(e.name), I = ion(e.sym, q), cap = Z <= 2 ? 2 : 8, room = cap - v;
        const paid = IE[Z].slice(0, Math.max(0, q)).reduce((a, b) => a + b, 0);
        if (bounced) return `<span style="color:var(--red)">Bounced.</span> The outer shell of ${I} is full. A new electron would have to start the next shell, where the net pull on it is about ${sgn(Z - n)}. It does not stick.`;
        if (q === 0) {
          if (NOBLE[Z]) return `${nm}: full outer shell already. Try both buttons. Nothing here is cheap.`;
          if (Z === 1) return "Hydrogen: one electron in a shell that holds two. It can lose it (leaving a bare proton) or gain one (helium's arrangement).";
          return `${nm}: ${fill(Z).join(", ")}, so ${v} valence electron${v > 1 ? "s" : ""}. Shortest way to a full shell: ` + (v <= 3 ? `<b>lose ${v}</b>.` : v >= 5 ? `<b>gain ${room}</b>.` : "four either way, which is a long way in both directions.");
        }
        if (q > 0) {
          if (NOBLE[Z]) return `<span style="color:var(--red)">You broke into a full shell</span> (${nf(paid)} kJ/mol so far). Noble gases do not form ions in ordinary chemistry.`;
          if (q > v) return `<span style="color:var(--red)">You broke into the full shell:</span> that last electron cost ${nf(IE[Z][q - 1])}, ${fmt.n(IE[Z][q - 1] / IE[Z][q - 2], 1)}× the one before. ${I} does not exist in ordinary chemistry.`;
          if (q === v) {
            if (Z === 1) return "<b>H⁺</b>: no electrons left at all, a bare proton. Real and important: it is what makes acids acidic (later lessons).";
            if (v === 4 || Z === 5) return `${I} ends on a full shell, but the bill is ${nf(paid)} kJ/mol. Too steep: ${e.name} usually <em>shares</em> its valence electrons instead of handing them over (named in <em>Silicon and light</em>).`;
            return `<b style="color:var(--green)">${I}</b>: ${fill(n).join(", ")}, ${NOBLE[n]}'s arrangement, for ${nf(paid)} kJ/mol and without breaking into a full shell. This is the ion ${e.name} really forms.`;
          }
          return v >= 5 ? `${I}: expensive, and still ${v - q} electrons away from an empty outer shell. ${nm} is a taker. Go back to neutral and add electrons instead.` : `${I}: ${v - q} valence electron${v - q > 1 ? "s" : ""} still to go before the outer shell is empty.`;
        }
        const k = -q;
        if (k === room) {
          if (Z === 1) return "<b>H⁻</b>: two electrons, helium's arrangement. It exists (the hydride ion), but only next to very eager givers such as sodium.";
          return `<b style="color:var(--green)">${I}</b>: ${fill(n).join(", ")}, ${NOBLE[n]}'s arrangement. ` + (k === 1 ? `This is the ion ${e.name} really forms, and making it releases energy.` : k === 2 ? `This is the ion ${e.name} forms in solids, where positive neighbours pay for the uphill second electron.` : "It exists, but only in a few solids with very eager givers: three extra electrons is a lot of negative charge on one atom.");
        }
        return v >= 4 ? `${I}: ${room - k} empty seat${room - k > 1 ? "s" : ""} left in the outer shell.` : `${I}: an extra electron on an atom with only ${v} valence electron${v > 1 ? "s" : ""}. Weakly held and nowhere near a full shell. Not an ion you meet in ordinary chemistry.`;
      }
      function info() {
        const e = BYZ[Z], q = Z - n;
        stage.tag(ion(e.sym, q));
        sSp.set(ion(e.sym, q)); sP.set(String(Z)); sE.set(String(n)); sSh.set(n ? fill(n).join(", ") : "none");
        led.innerHTML = "";
        for (let i = 0; i < q; i++) row(`${ORD[i]} removed`, IE[Z][i], fromFull(Z, i) ? RED : GRN, fromFull(Z, i) ? "full shell" : "valence");
        for (let i = 0; i < -q; i++) {
          if (i === 0) { if (EA[Z] != null) row("1st added", EA[Z], BLUE, "released"); else row("1st added", null, "", "uphill (measured): a lone atom does not keep it. The simple shell model misses this one."); }
          else if (i === 1 && EA2[Z]) row("2nd added", EA2[Z], RED, "cost");
          else row(`${ORD[i]} added`, null, "", "costs energy: the ion was already negative");
        }
        if (q >= 0 && q < maxRemove()) row("next removal", IE[Z][q], GREY, fromFull(Z, q) ? "full shell" : "valence");
        if (q === 0) { if (EA[Z] != null) row("adding one", EA[Z], GREY, "released"); else row("adding one", null, "", NOBLE[Z] ? "no free seat: it will not stick" : "uphill (measured)"); }
        msg.innerHTML = verdict();
        GOALS.forEach(([z, g]) => { if (z === Z && (g === "b" ? bounced : g === q && !bounced)) done.add(z + ":" + g); });
        chips.innerHTML = "";
        chips.append("Try to make:");
        GOALS.forEach(([z, g]) => chips.append(h("span", { class: "c" + (done.has(z + ":" + g) ? " done" : "") }, g === "b" ? "bounce one off Ne" : ion(BYZ[z].sym, g))));
      }
      function remove() {
        if (Z - n >= maxRemove()) { bounced = false; info(); msg.innerHTML = n === 0 ? "No electrons left to remove." : "The workbench stops at four removals. By now you have seen where the wall is."; return; }
        bounced = false; n -= 1; info(); stage.flyOut(state(), n + 1);
      }
      function add() {
        const q = Z - n;
        if (q <= 0 && fill(n).slice(-1)[0] === (n <= 2 ? 2 : 8)) { bounced = true; info(); stage.bounce(state()); return; }
        if (-q >= MAXADD) { bounced = false; info(); msg.innerHTML = "The workbench stops at three extra electrons."; return; }
        bounced = false; n += 1; info(); stage.flyIn(state());
      }
      function setZ(z) { Z = z; n = z; bounced = false; zSl.set(z); info(); stage.draw(state()); }
      const zSl = slider({ name: "element", min: 1, max: 20, step: 1, value: Z, fmtv: (x) => `${x} ${BYZ[x].sym}`, oninput: (v) => { Z = v; n = v; bounced = false; info(); stage.draw(state()); } });
      el.append(widget("Ion workbench: Z = 1 to 20", stage.svg, zSl,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: remove }, "Remove an electron"),
          h("button", { class: "primary", onclick: add }, "Add an electron"),
          h("button", { onclick: () => setZ(Z) }, "Back to neutral")),
        h("div", { class: "readout" }, sSp, sP, sE, sSh), led, msg, chips));
      setZ(11);
      el.append(
        P("What to look for, each from an earlier step:"),
        h("ul", {},
          h("li", { html: "<b>Givers.</b> Li, Na, K (one valence electron), then Be, Mg, Ca (two) and Al (three): green bars, then a red wall. The cheap ion is always the one that stops at the wall (<b>steps 6 and 7</b>)." }),
          h("li", { html: "<b>Takers.</b> F, Cl, O, S: every removal is expensive, but an added electron <i>releases</i> energy as it drops into an empty seat with a strong net pull (<b>steps 5 and 8</b>)." }),
          h("li", { html: "<b>Neither.</b> He, Ne, Ar: nothing comes off cheaply and nothing sticks (<b>step 6</b>)." }),
          h("li", { html: "<b>Compare Na with K, or Mg with Ca.</b> Same number of valence electrons, but the lower atom's are one shell further out and cheaper to remove. Distance matters (<b>step 1</b>)." }),
          h("li", { html: "<b>Where the simple model creaks.</b> Be, N and Mg have room in their outer shell, yet a lone atom will not keep an extra electron. Shells have finer structure than 2, 8, 8. We will not need it." })),
        P("The next lesson, <em>The periodic table: who gives, who takes</em>, arranges all the elements so that these patterns can be read off at a glance."),
        takeaway("Cheap ions are the ones that end on a full shell without breaking into one: givers lose their few valence electrons, takers fill their few empty seats. That difference is what a battery puts to work.")
      );
      return stage.stop;
    },
  });

  Course.run({
    id: "atoms-electrons",
    section: "0. Atoms that give and take electrons",
    title: "Atoms, electrons and charge",
    concepts: {
      charge: "charge (+ / −)", proton: "proton", electron: "electron", atomicNumber: "atomic number Z",
      shell: "electron shell (2, 8, 8)", valence: "valence electron", corePull: "net pull on the outer shell",
      fullShell: "full shell (noble-gas configuration)", ion: "ion", cation: "cation (+)", anion: "anion (−)",
    },
    sources: [
      { title: "OpenStax Chemistry 2e, §2.3 Atomic Structure and Symbolism", url: "https://openstax.org/books/chemistry-2e/pages/2-3-atomic-structure-and-symbolism", note: "protons, electrons, atomic number, ions, cation / anion" },
      { title: "OpenStax Chemistry 2e, §6.4 Electronic Structure of Atoms", url: "https://openstax.org/books/chemistry-2e/pages/6-4-electronic-structure-of-atoms-electron-configurations", note: "the real (subshell) picture behind the simplified 2, 8, 8 shell model; valence electrons" },
      { title: "OpenStax Chemistry 2e, §6.5 Periodic Variations in Element Properties", url: "https://openstax.org/books/chemistry-2e/pages/6-5-periodic-variations-in-element-properties", note: "shielding by inner electrons (the 'net pull'), successive ionisation energies and the jump at a full shell, electron affinity" },
      { title: "Wikipedia: Molar ionization energies of the elements", url: "https://en.wikipedia.org/wiki/Molar_ionization_energies_of_the_elements", note: "1st–4th removal costs in kJ/mol for Z = 1–20 (CRC Handbook values, rounded)" },
      { title: "Wikipedia: Electron affinity (data page)", url: "https://en.wikipedia.org/wiki/Electron_affinity_(data_page)", note: "energy released on adding an electron (Cl 349, F 328, O 141, Na 53 kJ/mol …), negative values for He, Be, N, Ne, Mg, Ar; second electron on O⁻ 744, S⁻ 456" },
      { title: "Wikipedia: Proton-to-electron mass ratio", url: "https://en.wikipedia.org/wiki/Proton-to-electron_mass_ratio", note: "≈ 1836" },
      { title: "OpenStax Chemistry 2e, §7.1 Ionic Bonding", url: "https://openstax.org/books/chemistry-2e/pages/7-1-ionic-bonding", note: "sodium + chlorine electron transfer; noble-gas configurations of the ions" },
    ],
    steps,
  });
})();
