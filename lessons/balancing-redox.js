// Lesson 1.2 — Balancing redox equations (electron bookkeeping, the half-reaction method)
(function () {
  const { h, s, widget, stat, slider, toggle } = Course;
  const f = Chem.f;
  const YEL = "#ffd166", RED = "#ff6b6b", BLUE = "#6cb4ff", GRN = "#5fd38d", MUT = "#8fa3b8", PUR = "#c3a6ff", DARK = "#0b1220";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });

  if (!document.getElementById("brx-style")) document.head.append(h("style", { id: "brx-style" }, `
    .brx-eq { display:flex; flex-wrap:wrap; align-items:flex-start; gap:8px 6px; font-size:20px; margin:6px 0 10px; }
    .brx-term { display:flex; flex-direction:column; align-items:center; gap:5px; background:var(--panel2); border-radius:8px; padding:6px 8px; min-width:52px; }
    .brx-term.zero .brx-f { opacity:.38; }
    .brx-f { white-space:nowrap; }
    .brx-coef { color:var(--yellow); font-weight:700; margin-right:4px; }
    .brx-pm { display:flex; gap:4px; }
    .brx-pm button { padding:0; width:32px; height:28px; font-size:17px; line-height:1; }
    .brx-op { color:var(--muted); padding-top:6px; }
    .brx-e { color:var(--yellow); }
    .brx-hl { color:var(--yellow); font-weight:700; }
    .brx-line { font-size:18px; margin:4px 0; overflow-wrap:anywhere; line-height:1.5; }
    .brx-cap { font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); margin:12px 0 2px; }
    .brx-ledger { margin-top:10px; }
    .brx-lrow { display:grid; grid-template-columns:78px 1fr 34px 34px 1fr 92px; gap:6px; align-items:center; font-size:14px; margin:4px 0; white-space:nowrap; }
    .brx-lrow .lab { color:var(--muted); }
    .brx-lrow .num { font-family:var(--mono); text-align:center; }
    .brx-lhead { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
    .brx-bar { height:12px; display:flex; justify-content:flex-end; }
    .brx-bar.r { justify-content:flex-start; }
    .brx-bar i { display:block; height:100%; border-radius:3px; }
    .brx-ok { color:var(--green); } .brx-bad { color:var(--red); }
    .brx-chips { display:flex; flex-wrap:wrap; gap:6px; margin:4px 0 8px; }
    .brx-chip { font-family:var(--mono); font-size:13px; padding:2px 8px; border-radius:6px; border:1px solid var(--line); white-space:nowrap; }
    .brx-chip.ok { color:var(--green); border-color:#2f6b47; } .brx-chip.bad { color:var(--red); border-color:#7a3535; }
    .brx-verdict { min-height:46px; margin-top:10px; font-size:15px; line-height:1.45; }
    .brx-sum { display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:17px; margin:6px 0; }
    .brx-sum button { font-size:17px; padding:4px 9px; }
    .brx-sum button.gone { text-decoration:line-through; opacity:.35; border-style:dashed; }
    .brx-sum button.nope { border-color:var(--red); }
    .brx-stages { display:flex; flex-wrap:wrap; gap:5px; margin-top:10px; }
    .brx-stages button { padding:3px 0; width:34px; }
    .brx-stages button.on { border-color:var(--yellow); color:var(--yellow); }
    .brx-select { font:inherit; background:var(--panel2); color:var(--text); border:1px solid var(--line); border-radius:6px; padding:5px 8px; max-width:100%; }
    @media (max-width:600px) {
      .brx-eq { font-size:17px; } .brx-line { font-size:16px; } .brx-sum, .brx-sum button { font-size:15px; }
      .brx-lrow { grid-template-columns:62px 1fr 26px 26px 1fr 72px; gap:4px; font-size:13px; }
    }
  `));

  // ---------- tiny chemistry bookkeeping ----------
  // species "Cr2O7^2-" → { atoms: {Cr: 2, O: 7}, q: -2 }; "e-" is the electron
  const spCache = {};
  function sp(str) {
    if (spCache[str]) return spCache[str];
    let out;
    if (str === "e-") out = { f: str, atoms: {}, q: -1, e: true };
    else {
      const [body, ch] = str.split("^");
      const atoms = {};
      body.replace(/([A-Z][a-z]?)(\d*)/g, (m, el, n) => { atoms[el] = (atoms[el] || 0) + (n ? +n : 1); return m; });
      let q = 0;
      if (ch) { const m = ch.match(/^(\d*)([+-])$/); q = (m[1] ? +m[1] : 1) * (m[2] === "+" ? 1 : -1); }
      out = { f: str, atoms, q };
    }
    return (spCache[str] = out);
  }
  const side = (str) => (str.trim() ? str.split(" + ").map((t) => { const m = t.trim().match(/^(\d+)?(.+)$/); return { c: m[1] ? +m[1] : 1, sp: sp(m[2]) }; }) : []);
  const parseEq = (str) => { const [l, r] = str.split(" -> "); return { L: side(l), R: side(r) }; };
  function tally(S) {
    const atoms = {}; let q = 0;
    for (const t of S) { q += t.c * t.sp.q; for (const [e, n] of Object.entries(t.sp.atoms)) atoms[e] = (atoms[e] || 0) + t.c * n; }
    return { atoms, q };
  }
  const elementsOf = (L, R) => { const out = []; for (const t of [...L, ...R]) for (const e of Object.keys(t.sp.atoms)) if (!out.includes(e)) out.push(e); return out; };
  const sg = (q) => (q > 0 ? "+" + q : q < 0 ? "−" + -q : "0");
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const spHTML = (x) => (x.e ? '<span class="brx-e">e⁻</span>' : f(x.f));
  const termHTML = (t, hl) => { const body = (t.c === 1 ? "" : t.c) + spHTML(t.sp); return hl && t.sp.f === hl ? `<span class="brx-hl">${body}</span>` : body; };
  const sideHTML = (S, hl) => S.filter((t) => t.c > 0).map((t) => termHTML(t, hl)).join(" + ") || "…";
  const eqHTML = (eq, hl) => sideHTML(eq.L, hl) + " → " + sideHTML(eq.R, hl);
  const isBalanced = (eq) => { const a = tally(eq.L), b = tally(eq.R); return a.q === b.q && elementsOf(eq.L, eq.R).every((e) => (a.atoms[e] || 0) === (b.atoms[e] || 0)); };

  // live ledger: one see-saw row per element, plus charge
  function ledger(order) {
    const box = h("div", { class: "brx-ledger" });
    box.update = (L, R) => {
      const a = tally(L), b = tally(R);
      const els = order || elementsOf(L, R);
      const mx = Math.max(1, Math.abs(a.q), Math.abs(b.q), ...els.map((e) => Math.max(a.atoms[e] || 0, b.atoms[e] || 0)));
      box.innerHTML = "";
      box.append(h("div", { class: "brx-lrow brx-lhead" }, h("span", {}), h("span", { style: "grid-column:span 2;text-align:right" }, "left side"), h("span", { style: "grid-column:span 2" }, "right side"), h("span", {})));
      let good = 0;
      const row = (label, x, y, isQ) => {
        const ok = x === y; if (ok) good++;
        const col = (v) => (isQ ? (v > 0 ? RED : BLUE) : ok ? GRN : MUT);
        const bar = (v, right) => h("div", { class: "brx-bar" + (right ? " r" : "") }, h("i", { style: `width:${(Math.abs(v) / mx) * 100}%;background:${col(v)}` }));
        box.append(h("div", { class: "brx-lrow" }, h("span", { class: "lab" }, label), bar(x, false),
          h("span", { class: "num" }, isQ ? sg(x) : String(x)), h("span", { class: "num" }, isQ ? sg(y) : String(y)), bar(y, true),
          h("span", { class: ok ? "brx-ok" : "brx-bad" }, ok ? "✓ equal" : "✗ off by " + Math.abs(x - y))));
      };
      els.forEach((e) => row(e + " atoms", a.atoms[e] || 0, b.atoms[e] || 0, false));
      row("charge", a.q, b.q, true);
      box.good = good; box.rows = els.length + 1; box.ok = good === box.rows; box.a = a; box.b = b;
      return box.ok;
    };
    return box;
  }
  // compact balance status for one equation
  function statusChips(eq) {
    const a = tally(eq.L), b = tally(eq.R);
    const chip = (txt, ok) => h("span", { class: "brx-chip " + (ok ? "ok" : "bad") }, txt + (ok ? " ✓" : " ✗"));
    return h("div", { class: "brx-chips" },
      ...elementsOf(eq.L, eq.R).map((e) => chip(`${e} ${a.atoms[e] || 0} | ${b.atoms[e] || 0}`, (a.atoms[e] || 0) === (b.atoms[e] || 0))),
      chip(`charge ${sg(a.q)} | ${sg(b.q)}`, a.q === b.q));
  }
  // equation with − / + steppers on the coefficients. spec: { L: [{ f, c, min, max, fixed }], R: […] }
  function editor(spec, onchange) {
    const st = { L: spec.L.map((t) => ({ ...t, sp: sp(t.f) })), R: spec.R.map((t) => ({ ...t, sp: sp(t.f) })) };
    const box = h("div", { class: "brx-eq" });
    const refs = [];
    ["L", "R"].forEach((k, si) => {
      if (si) box.append(h("span", { class: "brx-op" }, "→"));
      st[k].forEach((t, i) => {
        if (i) box.append(h("span", { class: "brx-op" }, "+"));
        const coef = h("span", { class: "brx-coef" }, String(t.c));
        const term = h("div", { class: "brx-term" }, h("div", { class: "brx-f" }, coef, h("span", { html: spHTML(t.sp) })));
        const bump = (d) => { const v = Math.max(t.min ?? 1, Math.min(t.max ?? 9, t.c + d)); if (v !== t.c) { t.c = v; refresh(); onchange && onchange(box.get()); } };
        if (!t.fixed) term.append(h("div", { class: "brx-pm" },
          h("button", { type: "button", "aria-label": "fewer " + t.f, onclick: () => bump(-1) }, "−"),
          h("button", { type: "button", "aria-label": "more " + t.f, onclick: () => bump(1) }, "+")));
        refs.push({ t, coef, term });
        box.append(term);
      });
    });
    function refresh() { refs.forEach(({ t, coef, term }) => { coef.textContent = String(t.c); term.classList.toggle("zero", t.c === 0); }); }
    box.get = () => ({ L: st.L.map((t) => ({ c: t.c, sp: t.sp })), R: st.R.map((t) => ({ c: t.c, sp: t.sp })) });
    box.set = (l, r) => { st.L.forEach((t, i) => (t.c = l[i])); st.R.forEach((t, i) => (t.c = r[i])); refresh(); onchange && onchange(box.get()); };
    refresh();
    return box;
  }
  // SVG helpers (CSS styles svg text, so colours go through style)
  function ball(svg, x, y, r, fill, stroke, label, textFill, fs) {
    svg.append(s("circle", { cx: x, cy: y, r, fill, stroke: stroke || "none", "stroke-width": 1.5 }));
    if (label) { const t = s("text", { x, y: y + (fs || 12) * 0.36, "text-anchor": "middle", style: `fill:${textFill || DARK};font-size:${fs || 12}px;font-weight:600` }); t.textContent = label; svg.append(t); }
  }
  const metalBall = (svg, x, y, r, label) => ball(svg, x, y, r, "#243243", GRN, label, "#d7e3ee");
  const cationBall = (svg, x, y, r, label) => ball(svg, x, y, r, RED, null, label, DARK);
  function svgText(svg, x, y, txt, fill, anchor, size) { const t = s("text", { x, y, "text-anchor": anchor || "middle", style: `fill:${fill || MUT};font-size:${size || 12}px` }); t.textContent = txt; svg.append(t); return t; }

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "Atoms match, and the equation is still wrong",
    short: "Atoms and charge",
    newConcepts: ["coeff", "chargecons"],
    render(el) {
      el.append(
        P(`In <em>Oxidation and reduction</em> zinc handed electrons to copper ions: ${f("Zn + Cu^2+ -> Zn^2+ + Cu")}. One zinc, one copper ion, done. Now swap the zinc for aluminium. Aluminium sits in group 13 and gives away three electrons, so its ion is ${f("Al^3+")} (<em>typical ion charge</em>, from <em>The periodic table</em>).`),
        P(`Copy the pattern: ${f("Al + Cu^2+ -> Al^3+ + Cu")}. One Al on each side, one Cu on each side. Atoms never appear or vanish in a reaction, and here they don't. But add up the charges: <b>+2 on the left, +3 on the right</b>. A whole unit of positive charge appeared from nowhere.`),
        P(`That cannot happen. Charge is carried by electrons and protons, and a reaction only moves electrons around. So the total charge before and after must be equal: <b>charge conservation</b>. The only thing you may change to fix an equation is how many of each particle take part: the number in front of each formula, its <b>coefficient</b>. (The small subscripts inside a formula are off limits: they say what the substance is.)`),
        P("Try to fix it by hand. The sulfate from the copper sulfate solution is a <em>spectator ion</em>, so it is left out.")
      );
      const svg = s("svg", { viewBox: "0 0 380 132", width: "100%", style: "max-width:560px;display:block;margin:4px auto 0" });
      const led = ledger(["Al", "Cu"]);
      const verdict = h("div", { class: "brx-verdict" });
      const upd = (eq) => {
        svg.innerHTML = "";
        const [a, b] = eq.L.map((t) => t.c), [c, d] = eq.R.map((t) => t.c);
        for (let i = 0; i < a; i++) metalBall(svg, 30 + i * 38, 30, 15, "Al");
        for (let i = 0; i < b; i++) cationBall(svg, 30 + i * 38, 74, 15, "Cu²⁺");
        for (let i = 0; i < c; i++) cationBall(svg, 236 + i * 38, 30, 15, "Al³⁺");
        for (let i = 0; i < d; i++) metalBall(svg, 236 + i * 38, 74, 15, "Cu");
        svgText(svg, 190, 58, "→", MUT, "middle", 22);
        const ok = led.update(eq.L, eq.R);
        svgText(svg, 87, 120, "total charge " + sg(led.a.q), led.a.q === led.b.q ? GRN : RED);
        svgText(svg, 293, 120, "total charge " + sg(led.b.q), led.a.q === led.b.q ? GRN : RED);
        if (ok && a === 2) verdict.innerHTML = `<span class="brx-ok">Balanced: ${eqHTML(eq)}. Two Al give 6 electrons, three ${f("Cu^2+")} take 6.</span>`;
        else if (ok) verdict.innerHTML = `<span class="brx-ok">Balanced.</span> Every coefficient can be halved, though: the convention is the smallest whole numbers.`;
        else if (led.a.q === led.b.q) verdict.innerHTML = `<span class="brx-bad">Charge is equal now, but the atoms are not.</span> Both ledgers must close at once.`;
        else verdict.innerHTML = `<span class="brx-bad">Not balanced:</span> charge is ${sg(led.a.q)} on the left and ${sg(led.b.q)} on the right.`;
      };
      const ed = editor({ L: [{ f: "Al", c: 1, max: 4 }, { f: "Cu^2+", c: 1, max: 4 }], R: [{ f: "Al^3+", c: 1, max: 4 }, { f: "Cu", c: 1, max: 4 }] }, upd);
      el.append(widget("Set the coefficients (yellow) until atoms and charge match", ed, svg, led, verdict,
        h("div", { class: "btns" },
          h("button", { onclick: () => ed.set([1, 1], [1, 1]) }, "Reset to 1, 1, 1, 1"),
          h("button", { onclick: () => ed.set([2, 3], [2, 3]) }, "Show a balanced set"))));
      upd(ed.get());
      el.append(
        P("With four particles you can find the answer by fiddling. With seven, and oxygen and hydrogen in the mix, fiddling stops working. The rest of this lesson is a method that always works, and it works by counting electrons."),
        takeaway("A balanced equation has the same atoms and the same total charge on both sides. Only coefficients may be changed.")
      );
    },
    check: {
      type: "choice",
      q: `Silver ions meet copper metal: ${f("Ag^+ + Cu -> Ag + Cu^2+")}. There is one Ag and one Cu on each side. Is the equation balanced?`,
      options: ["No: the total charge is +1 on the left and +2 on the right", "Yes: every atom on the left also appears on the right", "No: a copper atom is missing on the right"],
      answer: 0,
      wrongHints: { 1: "Atoms are only half of the bookkeeping. Add up the charges on each side.", 2: `${f("Cu^2+")} is still a copper atom, just with two electrons fewer. Count the charges instead.` },
      why: `Atoms match but charge does not (+1 vs +2). The fix is ${f("2Ag^+ + Cu -> 2Ag + Cu^2+")}: +2 on both sides.`,
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "Follow the electrons, one half at a time",
    short: "Electrons in each half",
    newConcepts: ["ebal"],
    render(el) {
      el.append(
        P(`Why did the charges not match? Because one Al gives <b>three</b> electrons and one ${f("Cu^2+")} takes only <b>two</b>. The mismatch is an electron mismatch, so make the electrons visible.`),
        P(`You already know how: a <em>half-reaction</em> (from <em>Oxidation and reduction</em>) shows only the giving or only the taking, with the electrons written out, like ${f("Zn -> Zn^2+ + 2e-")}. An electron is a real particle with charge −1, so it counts in the charge ledger like any ion.`),
        P("Below are the two halves of our reaction, each missing its electrons. Add electrons to one side of each until the charge is the same on the left and on the right.")
      );
      const mk = (label, spec, name, hint) => {
        const led = ledger();
        const verdict = h("div", { class: "brx-verdict", style: "min-height:40px" });
        const upd = (eq) => {
          led.update(eq.L, eq.R);
          const l = eq.L[eq.L.length - 1].c, r = eq.R[eq.R.length - 1].c;
          if (!led.ok) verdict.innerHTML = `<span class="brx-bad">Charge: ${sg(led.a.q)} left, ${sg(led.b.q)} right.</span> ${hint}`;
          else if (l && r) verdict.innerHTML = `Balanced, but electrons sit on both sides. Take ${Math.min(l, r)} away from each side: they cancel.`;
          else verdict.innerHTML = `<span class="brx-ok">Balanced: ${eqHTML(eq)}.</span> ${name}`;
        };
        const ed = editor(spec, upd);
        upd(ed.get());
        return { ed, nodes: [h("div", { class: "brx-cap" }, label), ed, led, verdict] };
      };
      const A = mk("Aluminium half", { L: [{ f: "Al", c: 1, fixed: true }, { f: "e-", c: 0, min: 0, max: 4 }], R: [{ f: "Al^3+", c: 1, fixed: true }, { f: "e-", c: 0, min: 0, max: 4 }] },
        "Electrons on the right are electrons given away: this is the oxidation.", "Each electron you add makes its side one unit more negative.");
      const C = mk("Copper half", { L: [{ f: "Cu^2+", c: 1, fixed: true }, { f: "e-", c: 0, min: 0, max: 4 }], R: [{ f: "Cu", c: 1, fixed: true }, { f: "e-", c: 0, min: 0, max: 4 }] },
        "Electrons on the left are electrons taken: this is the reduction.", "Each electron you add makes its side one unit more negative.");
      el.append(widget("Add electrons (e⁻, charge −1) until each half balances", ...A.nodes, ...C.nodes,
        h("div", { class: "btns" },
          h("button", { onclick: () => { A.ed.set([1, 0], [1, 0]); C.ed.set([1, 0], [1, 0]); } }, "Remove all electrons"),
          h("button", { onclick: () => { A.ed.set([1, 0], [1, 3]); C.ed.set([1, 2], [1, 0]); } }, "Show both"))));
      el.append(
        P("Notice what the electrons tell you. In the aluminium half they come out on the right: the metal loses them, an <em>oxidation</em>. In the copper half they go in on the left: the ion gains them, a <em>reduction</em>. And each half is now balanced on its own, in atoms and in charge."),
        takeaway("Write each half-reaction with its electrons. The right number of electrons is the one that makes the charge equal on both sides.")
      );
    },
    check: {
      type: "number",
      q: `Chlorine gas is reduced to chloride ions: ${f("Cl2")} + <b>?</b> e⁻ → ${f("2Cl^-")}. How many electrons make the charge balance?`,
      answer: 2, tolerance: 0,
      hint: `The right side holds two ions of charge −1 each. The left side must have the same total charge.`,
      why: `2. The right side is −2 in total, ${f("Cl2")} is neutral, so two electrons are needed on the left: ${f("Cl2 + 2e- -> 2Cl^-")}.`,
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "Scale the halves until the electrons cancel",
    short: "Electrons must cancel",
    newConcepts: ["hrm", "n"],
    render(el) {
      el.append(
        P(`The two halves happen together. No electron is left floating in the beaker: every electron an Al atom gives up lands on a ${f("Cu^2+")} ion. So <b>electrons given must equal electrons taken</b>.`),
        P(`One Al gives 3, one ${f("Cu^2+")} takes 2. You may run each half any whole number of times. Choose how many, then press <em>Transfer</em> and watch whether every electron finds a home.`)
      );
      let a = 1, b = 1, t = 0, timer = null;
      const svg = s("svg", { viewBox: "0 0 380 200", width: "100%", style: "max-width:520px;display:block;margin:6px auto" });
      const sG = stat("electrons given (3 per Al)", "y"), sT = stat("electrons taken (2 per Cu²⁺)", "y"), sN = stat("electrons transferred, n", "g");
      const line = h("div", { class: "brx-line" }), verdict = h("div", { class: "brx-verdict" });
      const ease = (x) => x * x * (3 - 2 * x);
      function draw() {
        const H = Math.max(a, b, 2) * 44 + 30, xa = 60, xb = 320;
        svg.setAttribute("viewBox", `0 0 380 ${H}`);
        svg.innerHTML = "";
        const ya = (i) => H / 2 + 6 - (a - 1) * 22 + i * 44, yb = (m) => H / 2 + 6 - (b - 1) * 22 + m * 44;
        svgText(svg, xa, 14, "aluminium metal", MUT, "middle", 13); svgText(svg, xb, 14, "copper ions", MUT, "middle", 13);
        const given = 3 * a, slots = 2 * b, stranded = Math.max(0, given - slots), k = ease(t);
        for (let i = 0; i < a; i++) (t >= 1 ? cationBall : metalBall)(svg, xa, ya(i), 16, t >= 1 ? "Al³⁺" : "Al");
        for (let m = 0; m < b; m++) {
          const got = t >= 1 ? Math.max(0, Math.min(2, given - 2 * m)) : 0;
          if (got === 2) metalBall(svg, xb, yb(m), 16, "Cu"); else cationBall(svg, xb, yb(m), 16, got === 1 ? "Cu⁺" : "Cu²⁺");
        }
        for (let e = 0; e < given; e++) {
          const i = Math.floor(e / 3), j = e % 3;
          const x0 = xa + 25, y0 = ya(i) + (j - 1) * 10;
          let x1, y1, lost = false;
          if (e < slots) { x1 = xb - 25; y1 = yb(Math.floor(e / 2)) + (e % 2 ? 6 : -6); }
          else { lost = true; x1 = 190; y1 = H / 2 + 6 + (e - slots - (stranded - 1) / 2) * 13; }
          svg.append(s("circle", { cx: x0 + (x1 - x0) * k, cy: y0 + (y1 - y0) * k, r: 4.5, fill: YEL, stroke: lost && t >= 1 ? RED : "none", "stroke-width": 2 }));
        }
        if (t >= 1 && stranded) svgText(svg, 190, H / 2 + 6 - stranded * 6.5 - 10, "no home", RED, "middle", 13);
      }
      function upd() {
        const given = 3 * a, taken = 2 * b;
        sG.set(String(given)); sT.set(String(taken));
        const base = `${a === 1 ? "" : a}Al + ${b === 1 ? "" : b}${f("Cu^2+")} → ${a === 1 ? "" : a}${f("Al^3+")} + ${b === 1 ? "" : b}Cu`;
        const eN = (x) => `<span class="brx-bad">${x === 1 ? "" : x}e⁻</span>`;
        if (given === taken) {
          sN.set(String(given));
          line.innerHTML = `${a} × (${f("Al -> Al^3+")} + 3<span class="brx-e">e⁻</span>)<br>${b} × (${f("Cu^2+")} + 2<span class="brx-e">e⁻</span> → Cu)<br><b style="color:var(--green)">${base}</b>`;
          verdict.innerHTML = gcd(a, b) > 1 ? `Electrons cancel (${given} = ${taken}), so this is balanced. But everything can be divided by ${gcd(a, b)}: use the smallest whole numbers.`
            : `<span class="brx-ok">${given} given, ${taken} taken: the electrons cancel and disappear from the equation.</span> Charge check: left ${sg(2 * b)}, right ${sg(3 * a)}.`;
        } else {
          sN.set("–");
          line.innerHTML = given > taken ? `${base} + ${eN(given - taken)}` : `${base.replace(" →", ` + ${eN(taken - given)} →`)}`;
          verdict.innerHTML = given > taken ? `<span class="brx-bad">${given - taken} electron${given - taken > 1 ? "s" : ""} left over with nowhere to go.</span> Free electrons do not stay in a solution: this cannot be the whole story.`
            : `<span class="brx-bad">${taken - given} electron${taken - given > 1 ? "s" : ""} short.</span> Some copper ions wait for electrons that nobody supplies.`;
        }
        draw();
      }
      const stop = () => { if (timer) clearTimeout(timer); timer = null; };
      const reset = () => { stop(); t = 0; upd(); };
      const run = () => { stop(); t = 0; const tick = () => { t = Math.min(1, t + 0.04); draw(); timer = t < 1 ? setTimeout(tick, 16) : null; }; tick(); };
      const sa = slider({ name: "× Al half", nameWidth: 92, min: 1, max: 4, step: 1, value: a, fmtv: (x) => "× " + x, oninput: (v) => { a = v; reset(); } });
      const sb = slider({ name: "× Cu half", nameWidth: 92, min: 1, max: 6, step: 1, value: b, fmtv: (x) => "× " + x, oninput: (v) => { b = v; reset(); } });
      el.append(widget("How many times does each half run?", sa, sb, svg,
        h("div", { class: "btns" },
          h("button", { onclick: () => { a = 2; b = 3; sa.set(2); sb.set(3); reset(); } }, "Try × 2 and × 3"),
          h("button", { class: "primary", onclick: run }, "Transfer the electrons")),
        h("div", { class: "readout" }, sG, sT, sN), h("div", { style: "margin-top:10px" }, line), verdict));
      upd();
      el.append(
        P("3 and 2 first meet at <b>6</b>, their least common multiple: run the aluminium half twice and the copper half three times. Add the two scaled halves, and the 6 electrons on the left cancel the 6 on the right."),
        P("That is the whole <b>half-reaction method</b>: split the reaction into halves, balance each half with electrons, scale them so the electrons match, add. The number of electrons that cancel is called <b>n</b>, the electrons transferred. Here n = 6. Later lessons use n to turn chemistry into coulombs and volts."),
        takeaway("Scale the two half-reactions until electrons given = electrons taken, then add. The electrons cancel; their number is n.")
      );
      return stop;
    },
    check: {
      type: "number",
      q: `Tin(II) ions reduce iron(III) ions. The halves are ${f("Sn^2+ -> Sn^4+ + 2e-")} and ${f("Fe^3+ + e- -> Fe^2+")}. In the balanced equation with the smallest whole coefficients, what is n, the number of electrons transferred?`,
      answer: 2, tolerance: 0,
      hint: "The tin half releases 2 electrons each time it runs. How often must the iron half run to take them?",
      why: `n = 2. Run the iron half twice: ${f("Sn^2+ + 2Fe^3+ -> Sn^4+ + 2Fe^2+")}. Charge is +8 on both sides.`,
      backTo: 1,
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "When oxygen is in the way",
    short: "Oxygen: add water",
    newConcepts: ["balO"],
    render(el) {
      el.append(
        P(`A harder customer, and the second example of this lesson. Permanganate, ${f("MnO4^-")}, is a <em>polyatomic ion</em> (like the sulfate from <em>Ions, salts and electrolytes</em>) that colours water deep purple. Drip it into a solution of ${f("Fe^2+")} ions and the purple vanishes: iron is oxidised to ${f("Fe^3+")}, and the manganese ends up as nearly colourless ${f("Mn^2+")}.`),
        P(`The iron half is easy: ${f("Fe^2+ -> Fe^3+ + e-")}. The manganese half starts as ${f("MnO4^- -> Mn^2+")}, and now there is a problem electrons cannot fix: <b>four oxygen atoms on the left, none on the right</b>.`),
        P(`The reaction runs in water, so water molecules, ${f("H2O")}, are always at hand as spare parts. Each one can carry away exactly one O atom. Using water does not disturb the electron count: oxygen has the same <em>oxidation number</em>, −2, in ${f("H2O")} as in ${f("MnO4^-")}, so moving an O atom into water costs no electrons.`),
        P("Add water molecules to whichever side is short of oxygen.")
      );
      const svg = s("svg", { viewBox: "0 0 380 124", width: "100%", style: "max-width:560px;display:block;margin:4px auto 0" });
      const water = (x, y) => { ball(svg, x - 9, y + 8, 5, "#dfe7ef"); ball(svg, x + 9, y + 8, 5, "#dfe7ef"); ball(svg, x, y, 9, PUR, null, "O", DARK, 9); };
      const led = ledger(["Mn", "O", "H"]);
      const verdict = h("div", { class: "brx-verdict" });
      const upd = (eq) => {
        const wl = eq.L[1].c, wr = eq.R[1].c;
        svg.innerHTML = "";
        [[-17, -17], [17, -17], [-17, 17], [17, 17]].forEach(([dx, dy]) => ball(svg, 38 + dx, 62 + dy, 10, PUR, null, "O", DARK, 9));
        ball(svg, 38, 62, 13, "#243243", GRN, "Mn", "#d7e3ee", 10);
        svgText(svg, 38, 119, f("MnO4^-"), MUT, "middle", 13);
        for (let i = 0; i < wl; i++) water(88 + (i % 3) * 32, 40 + Math.floor(i / 3) * 40);
        svgText(svg, 190, 68, "→", MUT, "middle", 22);
        cationBall(svg, 228, 62, 14, "Mn²⁺"); svgText(svg, 228, 119, f("Mn^2+"), MUT, "middle", 13);
        for (let i = 0; i < wr; i++) water(274 + (i % 3) * 32, 40 + Math.floor(i / 3) * 40);
        led.update(eq.L, eq.R);
        const oL = led.a.atoms.O || 0, oR = led.b.atoms.O || 0;
        if (wl && wr) verdict.innerHTML = `Water on both sides: ${Math.min(wl, wr)} of them cancel. Keep water on one side only.`;
        else if (oL === oR) verdict.innerHTML = `<span class="brx-ok">Oxygen balanced: 4 O in ${f("MnO4^-")}, 4 O in ${f("4H2O")}.</span> But the water brought 8 hydrogen atoms with it, and the charge is still off. Those are the next step.`;
        else verdict.innerHTML = `<span class="brx-bad">Oxygen: ${oL} on the left, ${oR} on the right.</span> Add ${f("H2O")} to the side with fewer O atoms.`;
      };
      const ed = editor({ L: [{ f: "MnO4^-", c: 1, fixed: true }, { f: "H2O", c: 0, min: 0, max: 6 }], R: [{ f: "Mn^2+", c: 1, fixed: true }, { f: "H2O", c: 0, min: 0, max: 6 }] }, upd);
      el.append(widget("Purple = oxygen atoms. Give every one of them a place on the right", ed, svg, led, verdict,
        h("div", { class: "btns" }, h("button", { onclick: () => ed.set([1, 0], [1, 0]) }, "Remove the water"), h("button", { onclick: () => ed.set([1, 0], [1, 4]) }, "Show it"))));
      upd(ed.get());
      el.append(takeaway(`In water solution, balance oxygen atoms by adding ${f("H2O")} to the side that has too few.`));
    },
    check: {
      type: "number",
      q: `Dichromate ions are reduced to chromium(III) ions: ${f("Cr2O7^2- -> 2Cr^3+")}. How many ${f("H2O")} molecules must be added to the right side to balance the oxygen?`,
      answer: 7, tolerance: 0,
      hint: "Count the O atoms on the left. Each water molecule holds one.",
      why: `7. Seven O atoms on the left need seven water molecules: ${f("Cr2O7^2- -> 2Cr^3+ + 7H2O")} (hydrogen and charge still to do).`,
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "In acid: hydrogen from H⁺, then charge from electrons",
    short: "Acid: add H⁺, then e⁻",
    newConcepts: ["acid", "balH"],
    render(el) {
      el.append(
        P(`The water fixed oxygen and left 8 stray hydrogen atoms on the right of ${f("MnO4^- -> Mn^2+ + 4H2O")}. Where can hydrogen come from on the left?`),
        P(`This reaction is done in an <b>acidic solution</b>: water that contains plenty of ${f("H^+")} ions. Sulfuric acid, ${f("H2SO4")}, for example, <em>dissociates</em> in water into ${f("2H^+")} and ${f("SO4^2-")}. So in acid, ${f("H^+")} is a second free spare part, and hydrogen in ${f("H^+")} is +1, the same as in water: again no electrons are smuggled in.`),
        P(`The order matters. <b>First atoms, then charge</b>: balance H by adding ${f("H^+")}, and only then look at the charge and fix it with electrons, exactly as in step 2. Electrons go last because every ${f("H^+")} you add changes the charge.`)
      );
      const led = ledger(["Mn", "O", "H"]);
      const verdict = h("div", { class: "brx-verdict" });
      const upd = (eq) => {
        led.update(eq.L, eq.R);
        const [, hl, elx] = eq.L.map((t) => t.c), [, , hr, er] = eq.R.map((t) => t.c);
        const HL = led.a.atoms.H || 0, HR = led.b.atoms.H || 0;
        if (HL !== HR) verdict.innerHTML = `<span class="brx-bad">Hydrogen: ${HL} on the left, ${HR} on the right.</span> Add ${f("H^+")} to the side that is short. Leave the electrons for later.`;
        else if (led.a.q !== led.b.q) verdict.innerHTML = `Atoms are all balanced. <span class="brx-bad">Charge: ${sg(led.a.q)} on the left, ${sg(led.b.q)} on the right.</span> Electrons are −1 each: add them to the more positive side.`;
        else if ((hl && hr) || (elx && er)) verdict.innerHTML = "Balanced, but the same particle sits on both sides. Cancel it so it appears only once.";
        else verdict.innerHTML = `<span class="brx-ok">Balanced: ${eqHTML(eq)}.</span> Five electrons. Check with oxidation numbers: Mn goes from +7 in ${f("MnO4^-")} to +2, a drop of 5.`;
      };
      const ed = editor({
        L: [{ f: "MnO4^-", c: 1, fixed: true }, { f: "H^+", c: 0, min: 0, max: 10 }, { f: "e-", c: 0, min: 0, max: 8 }],
        R: [{ f: "Mn^2+", c: 1, fixed: true }, { f: "H2O", c: 4, fixed: true }, { f: "H^+", c: 0, min: 0, max: 10 }, { f: "e-", c: 0, min: 0, max: 8 }],
      }, upd);
      el.append(widget("First H⁺ until hydrogen matches, then e⁻ until charge matches", ed, led, verdict,
        h("div", { class: "btns" },
          h("button", { onclick: () => ed.set([1, 0, 0], [1, 4, 0, 0]) }, "Start over"),
          h("button", { onclick: () => ed.set([1, 8, 0], [1, 4, 0, 0]) }, "Show the H⁺ step"),
          h("button", { onclick: () => ed.set([1, 8, 5], [1, 4, 0, 0]) }, "Show the finished half"))));
      upd(ed.get());
      el.append(
        formula(`${f("MnO4^-")} + <span class="bl">${f("8H^+")}</span> + <span class="hl">5e⁻</span> → ${f("Mn^2+")} + <span class="bl">${f("4H2O")}</span><small>charge: −1 + 8 − 5 = +2 on the left, +2 on the right</small>`),
        P(`This is why the purple colour only vanishes cleanly in acid: the half-reaction consumes eight ${f("H^+")} for every permanganate ion.`),
        takeaway(`In acidic solution: balance O with ${f("H2O")}, then H with ${f("H^+")}, and last the charge with electrons.`)
      );
    },
    check: {
      type: "number",
      q: `Manganese dioxide is reduced in acid: ${f("MnO2 -> Mn^2+")}. Balance O with water, then H with ${f("H^+")}. How many electrons does the finished half-reaction need?`,
      answer: 2, tolerance: 0,
      hint: `After water and ${f("H^+")} you should have ${f("MnO2 + 4H^+ -> Mn^2+ + 2H2O")}. Now compare the charges.`,
      why: `2. ${f("MnO2 + 4H^+ + 2e- -> Mn^2+ + 2H2O")}: charge +4 − 2 = +2 on both sides. Mn goes from +4 to +2.`,
      backTo: 3,
    },
  });

  // ---------------------------------------------------------------- 6
  const RECIPE = {
    perm: {
      label: f("MnO4^- + Fe^2+"), n: 5,
      stages: [
        { t: "Skeleton: who reacts, what forms", all: "MnO4^- + Fe^2+ -> Mn^2+ + Fe^3+", cap: "Just the reactants and products that change. Atoms and charge are both off." },
        { t: "Split into two halves", a: "MnO4^- -> Mn^2+", b: "Fe^2+ -> Fe^3+", cap: "One half per element whose oxidation number changes: manganese (+7 → +2) and iron (+2 → +3)." },
        { t: "Balance atoms other than O and H", a: "MnO4^- -> Mn^2+", b: "Fe^2+ -> Fe^3+", cap: "One Mn on each side, one Fe on each side. Nothing to do here." },
        { t: "Balance O with H₂O", a: "MnO4^- -> Mn^2+ + 4H2O", b: "Fe^2+ -> Fe^3+", hl: "H2O", cap: "Four O atoms need four water molecules. The iron half has no oxygen." },
        { t: "Balance H with H⁺", a: "MnO4^- + 8H^+ -> Mn^2+ + 4H2O", b: "Fe^2+ -> Fe^3+", hl: "H^+", cap: "Four waters hold 8 H, so 8 H⁺ go on the left." },
        { t: "Balance charge with electrons", a: "MnO4^- + 8H^+ + 5e- -> Mn^2+ + 4H2O", b: "Fe^2+ -> Fe^3+ + e-", hl: "e-", cap: "Manganese half: +7 on the left, +2 on the right, so 5 e⁻ on the left. Iron half: 1 e⁻ on the right. Each half is now fully balanced." },
        { t: "Scale so the electrons match", a: "MnO4^- + 8H^+ + 5e- -> Mn^2+ + 4H2O", b: "5Fe^2+ -> 5Fe^3+ + 5e-", hl: "e-", cap: "5 taken, 1 given: run the iron half five times." },
        { t: "Add the halves, cancel the electrons", all: "MnO4^- + 8H^+ + 5Fe^2+ -> Mn^2+ + 4H2O + 5Fe^3+", cap: "The 5 e⁻ on each side cancel. Cross-check with oxidation numbers: Mn drops by 5 (+7 → +2), five Fe each rise by 1. n = 5." },
      ],
    },
    dichr: {
      label: f("Cr2O7^2- + Fe^2+"), n: 6,
      stages: [
        { t: "Skeleton: who reacts, what forms", all: "Cr2O7^2- + Fe^2+ -> Cr^3+ + Fe^3+", cap: "Orange dichromate oxidises iron(II) and ends as green chromium(III). Nothing is balanced yet." },
        { t: "Split into two halves", a: "Cr2O7^2- -> Cr^3+", b: "Fe^2+ -> Fe^3+", cap: "Chromium is +6 in dichromate (2 Cr + 7 × (−2) = −2) and +3 afterwards. Iron goes +2 → +3." },
        { t: "Balance atoms other than O and H", a: "Cr2O7^2- -> 2Cr^3+", b: "Fe^2+ -> Fe^3+", hl: "Cr^3+", cap: "Dichromate holds two Cr atoms, so two Cr³⁺ must form. Easy to forget, so it comes first." },
        { t: "Balance O with H₂O", a: "Cr2O7^2- -> 2Cr^3+ + 7H2O", b: "Fe^2+ -> Fe^3+", hl: "H2O", cap: "Seven O atoms, seven water molecules." },
        { t: "Balance H with H⁺", a: "Cr2O7^2- + 14H^+ -> 2Cr^3+ + 7H2O", b: "Fe^2+ -> Fe^3+", hl: "H^+", cap: "Seven waters hold 14 H, so 14 H⁺ on the left." },
        { t: "Balance charge with electrons", a: "Cr2O7^2- + 14H^+ + 6e- -> 2Cr^3+ + 7H2O", b: "Fe^2+ -> Fe^3+ + e-", hl: "e-", cap: "Chromium half: −2 + 14 = +12 on the left, +6 on the right, so 6 e⁻ on the left." },
        { t: "Scale so the electrons match", a: "Cr2O7^2- + 14H^+ + 6e- -> 2Cr^3+ + 7H2O", b: "6Fe^2+ -> 6Fe^3+ + 6e-", hl: "e-", cap: "6 taken, 1 given: run the iron half six times." },
        { t: "Add the halves, cancel the electrons", all: "Cr2O7^2- + 14H^+ + 6Fe^2+ -> 2Cr^3+ + 7H2O + 6Fe^3+", cap: "Cross-check with oxidation numbers: two Cr each drop by 3 (+6 → +3), that is 6; six Fe each rise by 1. n = 6." },
      ],
    },
  };
  steps.push({
    title: "The whole recipe, start to finish",
    short: "The recipe in acid",
    newConcepts: ["oxcheck"],
    render(el) {
      el.append(
        P(`You now have every move. Put in order, they balance any redox reaction in acidic solution:`),
        h("ol", {},
          h("li", { html: "<b>Split</b> into an oxidation half and a reduction half." }),
          h("li", { html: "Balance the atoms <b>other than O and H</b>." }),
          h("li", { html: `Balance <b>O</b> with ${f("H2O")}.` }),
          h("li", { html: `Balance <b>H</b> with ${f("H^+")}.` }),
          h("li", { html: "Balance <b>charge</b> with electrons." }),
          h("li", { html: "<b>Scale</b> the halves so the electrons match." }),
          h("li", { html: "<b>Add</b>, and cancel whatever appears on both sides." })),
        P(`There is a quick way to catch mistakes. In <em>Oxidation and reduction</em> the change in <em>oxidation number</em> told you how many electrons an atom lost or gained. So the electrons in a finished half must equal <b>(change in oxidation number) × (atoms that change)</b>. If the two counts disagree, something went wrong.`),
        P("Step through two full examples. The chips under each line show what is balanced (left | right) at that moment.")
      );
      let key = "perm", stage = 0;
      const body = h("div"), sN = stat("electrons transferred, n", "g"), sStage = stat("stage", "b");
      const stageBtns = h("div", { class: "brx-stages" });
      const draw = () => {
        const R = RECIPE[key], S = R.stages[stage];
        body.innerHTML = "";
        body.append(h("div", { class: "brx-cap", style: "color:var(--yellow)" }, `${stage + 1} · ${S.t}`));
        const block = (label, str) => { const eq = parseEq(str); body.append(h("div", { class: "brx-cap" }, label), h("div", { class: "brx-line", html: eqHTML(eq, S.hl) }), statusChips(eq)); };
        if (S.all) block("whole reaction", S.all); else { block("reduction half (electrons taken)", S.a); block("oxidation half (electrons given)", S.b); }
        body.append(h("div", { class: "note", style: "margin-top:6px;min-height:44px", html: S.cap }));
        sStage.set(`${stage + 1} / ${R.stages.length}`); sN.set(stage >= 5 ? String(R.n) : "–");
        [...stageBtns.children].forEach((b, i) => b.classList.toggle("on", i === stage));
      };
      RECIPE.perm.stages.forEach((_, i) => stageBtns.append(h("button", { type: "button", onclick: () => { stage = i; draw(); } }, String(i + 1))));
      const tg = toggle("reaction:", [["perm", RECIPE.perm.label], ["dichr", RECIPE.dichr.label]], key, (v) => { key = v; stage = 0; draw(); });
      el.append(widget("Step through the recipe", tg, body,
        h("div", { class: "btns" },
          h("button", { onclick: () => { stage = Math.max(0, stage - 1); draw(); } }, "← Back"),
          h("button", { class: "primary", onclick: () => { stage = Math.min(7, stage + 1); draw(); } }, "Next move →")),
        stageBtns, h("div", { class: "readout" }, sStage, sN)));
      draw();
      el.append(takeaway("Split, other atoms, O with water, H with H⁺, charge with electrons, scale, add. Then check the electron count against the oxidation numbers."));
    },
    check: {
      type: "number",
      q: `Permanganate also oxidises tin(II): the halves are ${f("MnO4^- + 8H^+ + 5e- -> Mn^2+ + 4H2O")} and ${f("Sn^2+ -> Sn^4+ + 2e-")}. In the balanced overall equation (smallest whole numbers), how many ${f("H^+")} appear?`,
      answer: 16, tolerance: 0,
      hint: "5 and 2 first meet at 10 electrons. Scaling a half multiplies everything in it, not only the electrons.",
      why: `16. The manganese half runs twice and the tin half five times (n = 10): ${f("2MnO4^- + 16H^+ + 5Sn^2+ -> 2Mn^2+ + 8H2O + 5Sn^4+")}.`,
      backTo: 2,
    },
  });

  // ---------------------------------------------------------------- 7
  const BASE = {
    zn: { label: "Zn → ZnO", acid: "Zn + H2O -> ZnO + 2H^+ + 2e-", note: "Zinc metal becomes solid zinc oxide, ZnO (Zn goes 0 → +2). This is the zinc side of an alkaline cell." },
    mn: { label: f("MnO2 -> Mn2O3"), acid: "2MnO2 + 2H^+ + 2e- -> Mn2O3 + H2O", note: "Solid manganese dioxide becomes solid Mn₂O₃ (Mn goes +4 → +3). This is the other side of an alkaline cell." },
    pm: { label: f("MnO4^- -> MnO2"), acid: "MnO4^- + 4H^+ + 3e- -> MnO2 + 2H2O", note: "In neutral or mildly basic solution permanganate typically stops at solid MnO₂ (Mn goes +7 → +4), taking 3 electrons instead of 5." },
  };
  function toBase(eq, k) {
    const clone = (S) => S.map((t) => ({ c: t.c, sp: t.sp }));
    const add = (S, name, c) => { if (!c) return; const t = S.find((x) => x.sp.f === name); if (t) t.c += c; else S.push({ c, sp: sp(name) }); };
    const l1 = { L: clone(eq.L), R: clone(eq.R) }; add(l1.L, "OH^-", k); add(l1.R, "OH^-", k);
    const l2 = { L: clone(l1.L), R: clone(l1.R) };
    for (const S of [l2.L, l2.R]) {
      const hT = S.find((x) => x.sp.f === "H^+"), oT = S.find((x) => x.sp.f === "OH^-");
      if (hT && oT) { const p = Math.min(hT.c, oT.c); hT.c -= p; oT.c -= p; add(S, "H2O", p); }
    }
    const l3 = { L: clone(l2.L), R: clone(l2.R) };
    for (const t of l3.L) { const u = l3.R.find((x) => x.sp.f === t.sp.f); if (u) { const m = Math.min(t.c, u.c); t.c -= m; u.c -= m; } }
    const hLeft = [...l3.L, ...l3.R].filter((t) => t.sp.f === "H^+").reduce((a2, t) => a2 + t.c, 0);
    return { l1, l2, l3, hLeft };
  }
  steps.push({
    title: "In base there is no H⁺: use OH⁻",
    short: "Base: swap H⁺ for OH⁻",
    newConcepts: ["base", "ohfix"],
    render(el) {
      el.append(
        P(`Not every solution is acidic. The liquid in an alkaline battery is potassium hydroxide, KOH, dissolved in water: ${f("K^+")} ions and hydroxide ions, ${f("OH^-")}. Water with plenty of ${f("OH^-")} is called a <b>basic</b> (or alkaline) solution.`),
        P(`${f("H^+")} and ${f("OH^-")} cannot both be plentiful, because they join into water on contact: ${f("H^+ + OH^- -> H2O")}. So an equation for a basic solution must not contain ${f("H^+")}. The free spare parts in base are ${f("H2O")} and ${f("OH^-")}.`),
        P(`You do not need a new recipe. Balance the half as if it were in acid, then repair it: <b>add the same number of ${f("OH^-")} to both sides</b>, one for every ${f("H^+")}. Adding the same thing to both sides cannot unbalance anything. Each ${f("H^+")} meets an ${f("OH^-")} and becomes water, and water that then appears on both sides cancels.`)
      );
      let key = "zn", k = 0;
      const body = h("div"), verdict = h("div", { class: "brx-verdict" });
      const draw = () => {
        const B = BASE[key], eq = parseEq(B.acid), r = toBase(eq, k);
        const hN = [...eq.L, ...eq.R].find((t) => t.sp.f === "H^+").c;
        body.innerHTML = "";
        const row = (label, e, hl) => body.append(h("div", { class: "brx-cap" }, label), h("div", { class: "brx-line", html: eqHTML(e, hl) }));
        row("balanced as if in acid", eq, "H^+");
        row(`after adding ${k} OH⁻ to each side`, r.l1, "OH^-");
        row("after every H⁺ + OH⁻ pair has become H₂O", r.l2, "H2O");
        row("after cancelling what sits on both sides", r.l3, r.hLeft ? "H^+" : "OH^-");
        body.append(statusChips(r.l3));
        if (r.hLeft) verdict.innerHTML = `<span class="brx-bad">Still ${r.hLeft} ${f("H^+")} in the equation.</span> That cannot be right in a basic solution: add more ${f("OH^-")}.`;
        else if (k === hN) verdict.innerHTML = `<span class="brx-ok">No ${f("H^+")} left, and the chips still all show ✓.</span> ${B.note}`;
        else verdict.innerHTML = `Correct result, but you added ${k - hN} more ${f("OH^-")} than needed. The extra ones sit on both sides and simply cancel. ${hN} was enough: one per ${f("H^+")}.`;
      };
      const sl = slider({ name: "OH⁻ added to each side", nameWidth: 120, min: 0, max: 6, step: 1, value: 0, fmtv: (x) => String(x), oninput: (v) => { k = v; draw(); } });
      const tg = toggle("half-reaction:", [["zn", BASE.zn.label], ["mn", BASE.mn.label], ["pm", BASE.pm.label]], key, (v) => { key = v; k = 0; sl.set(0); draw(); });
      el.append(widget("Add OH⁻ to both sides and watch the H⁺ disappear", tg, sl, body, verdict));
      draw();
      el.append(takeaway(`For a basic solution: balance in acid first, add as many ${f("OH^-")} to both sides as there are ${f("H^+")}, turn each pair into ${f("H2O")}, cancel.`));
    },
    check: {
      type: "number",
      q: `Oxygen gas is reduced. In acid the half-reaction is ${f("O2 + 4H^+ + 4e- -> 2H2O")}. Convert it to basic solution. How many ${f("OH^-")} are on the right side of the result?`,
      answer: 4, tolerance: 0,
      hint: `Add 4 ${f("OH^-")} to each side. On the left they join the 4 ${f("H^+")} to give 4 ${f("H2O")}; then cancel the water that appears on both sides.`,
      why: `4. Adding ${f("4OH^-")} to both sides gives ${f("O2 + 4H2O + 4e- -> 2H2O + 4OH^-")}; cancel two waters: ${f("O2 + 2H2O + 4e- -> 4OH^-")}.`,
    },
  });

  // ---------------------------------------------------------------- 8
  function cancelGame(halfA, halfB, doneHTML) {
    const A = parseEq(halfA), B = parseEq(halfB);
    const terms = { L: [...A.L, ...B.L].map((t) => ({ ...t, gone: false })), R: [...A.R, ...B.R].map((t) => ({ ...t, gone: false })) };
    const row = h("div", { class: "brx-sum" }), msg = h("div", { class: "brx-verdict", style: "min-height:64px" }), net = h("div", { class: "brx-line" });
    const all = [];
    const refresh = (note) => {
      all.forEach(({ t, b }) => { b.classList.toggle("gone", t.gone); b.classList.remove("nope"); });
      const left = { L: terms.L.filter((t) => !t.gone), R: terms.R.filter((t) => !t.gone) };
      const pending = left.L.filter((t) => left.R.some((u) => u.sp.f === t.sp.f));
      net.innerHTML = eqHTML(left);
      if (!pending.length) msg.innerHTML = `<span class="brx-ok">Nothing left to cancel.</span> ${doneHTML}`;
      else msg.innerHTML = note || "Click a particle that appears on both sides to cancel it against its twin.";
    };
    ["L", "R"].forEach((k, si) => {
      if (si) row.append(h("span", { class: "brx-op", style: "padding:0" }, "→"));
      terms[k].forEach((t, i) => {
        if (i) row.append(h("span", { class: "brx-op", style: "padding:0" }, "+"));
        const b = h("button", { type: "button", html: termHTML(t), onclick: () => {
          if (t.gone) return;
          const twin = terms[k === "L" ? "R" : "L"].find((u) => !u.gone && u.sp.f === t.sp.f);
          if (twin && twin.c === t.c) { t.gone = twin.gone = true; refresh(`${termHTML(t)} cancelled on both sides.`); }
          else { refresh(`<span class="brx-bad">${spHTML(t.sp)} has no twin on the other side.</span> It is really ${k === "L" ? "used up" : "produced"} by the reaction, so it stays.`); b.classList.add("nope"); }
        } });
        all.push({ t, b }); row.append(b);
      });
    });
    const box = h("div", {},
      h("div", { class: "brx-line", style: "font-size:15px;color:var(--muted)", html: eqHTML(A) + "<br>" + eqHTML(B) }),
      h("div", { class: "brx-cap" }, "both halves added: click to cancel"), row,
      h("div", { class: "brx-cap" }, "what is left"), net, msg,
      h("div", { class: "btns", style: "margin-top:4px" }, h("button", { onclick: () => { [...terms.L, ...terms.R].forEach((t) => (t.gone = false)); refresh(); } }, "Undo all")));
    refresh();
    return box;
  }
  steps.push({
    title: "Adding up a battery reaction",
    short: "What is really used up",
    newConcepts: ["net"],
    render(el) {
      el.append(
        P(`Time to use the base trick on something real. The alkaline cell in a remote control has zinc on one side and manganese dioxide, ${f("MnO2")}, on the other, both soaked in KOH solution (the cell itself is the subject of <em>Zinc: from Volta's pile to the alkaline cell</em>). You balanced both halves in the last step:`),
        formula(`${f("Zn + 2OH^-")} → ${f("ZnO + H2O")} + <span class="hl">2e⁻</span><br>${f("2MnO2 + H2O")} + <span class="hl">2e⁻</span> → ${f("Mn2O3 + 2OH^-")}<small>simplified textbook halves; both involve 2 electrons, so no scaling is needed</small>`),
        P(`Add them and several particles turn up on both sides. Anything that is both consumed and produced in equal amounts is not really used up, so it cancels. What survives is the <b>net reaction</b>: the true shopping list of what the reaction consumes and makes.`),
        P("Cancel everything you can in both examples below, and compare what survives.")
      );
      el.append(widget("Alkaline cell (basic solution)",
        cancelGame("Zn + 2OH^- -> ZnO + H2O + 2e-", "2MnO2 + H2O + 2e- -> Mn2O3 + 2OH^-",
          `Net: ${f("Zn + 2MnO2 -> ZnO + Mn2O3")}, n = 2. All the ${f("OH^-")} and water cancelled: the cell needs the KOH solution to work, but does not use it up.`)));
      el.append(widget("Permanganate and iron (acidic solution)",
        cancelGame("MnO4^- + 8H^+ + 5e- -> Mn^2+ + 4H2O", "5Fe^2+ -> 5Fe^3+ + 5e-",
          `Only the electrons cancelled, n = 5. The 8 ${f("H^+")} have no twin: this reaction really eats acid and makes water.`)));
      el.append(
        P(`Same method, two different outcomes. In the alkaline cell the hydroxide is taken by one half and handed back by the other. In the permanganate reaction the ${f("H^+")} is gone for good. Balancing is how you find that out: you cannot tell by looking at the unbalanced skeleton.`),
        takeaway("After adding the halves, cancel what appears on both sides. What is left is the net reaction: the only things truly consumed and produced.")
      );
    },
    check: {
      type: "choice",
      q: `An alkaline cell runs until 1 mol of zinc has reacted. How much ${f("OH^-")} has been used up overall?`,
      options: [
        `2 mol: the zinc half-reaction takes 2 ${f("OH^-")} per Zn`,
        `None: the manganese half gives back exactly the 2 ${f("OH^-")} that the zinc half takes`,
        `None: ${f("OH^-")} is a spectator and takes part in neither half`,
      ],
      answer: 1,
      wrongHints: {
        0: "True for the zinc half alone. Now add the other half and see what it produces.",
        2: `It does take part: ${f("OH^-")} appears in both half-reactions. Look at which side it is on in each.`,
      },
      why: `The zinc half consumes 2 ${f("OH^-")}, the manganese half produces 2. They cancel in the net reaction ${f("Zn + 2MnO2 -> ZnO + Mn2O3")}.`,
      backTo: 6,
    },
  });

  // ---------------------------------------------------------------- 9 (capstone)
  const LAB = [
    { name: "Aluminium in copper sulfate", eq: "Al + Cu^2+ -> Al^3+ + Cu", ans: [2, 3, 2, 3], n: 6,
      halves: ["Al -> Al^3+ + 3e-", "Cu^2+ + 2e- -> Cu"], note: "The running example of steps 1–3." },
    { name: "Aluminium in acid (hydrogen gas forms)", eq: "Al + H^+ -> Al^3+ + H2", ans: [2, 6, 2, 3], n: 6,
      halves: ["Al -> Al^3+ + 3e-", "2H^+ + 2e- -> H2"], note: "A metal dissolving in acid and releasing hydrogen gas, the subject of The activity series." },
    { name: "Permanganate + iron(II), in acid", eq: "MnO4^- + Fe^2+ + H^+ -> Mn^2+ + Fe^3+ + H2O", ans: [1, 5, 8, 1, 5, 4], n: 5,
      halves: ["MnO4^- + 8H^+ + 5e- -> Mn^2+ + 4H2O", "Fe^2+ -> Fe^3+ + e-"], note: "The example of steps 4–6." },
    { name: "Copper in nitric acid", eq: "Cu + NO3^- + H^+ -> Cu^2+ + NO + H2O", ans: [3, 2, 8, 3, 2, 4], n: 6,
      halves: ["Cu -> Cu^2+ + 2e-", "NO3^- + 4H^+ + 3e- -> NO + 2H2O"], note: "Nitrate (N at +5) is reduced to the gas NO (N at +2): 3 electrons per nitrogen." },
    { name: "Iron rusting in wet air (first stage)", eq: "Fe + O2 + H2O -> Fe^2+ + OH^-", ans: [2, 1, 2, 2, 4], n: 4,
      halves: ["Fe -> Fe^2+ + 2e-", "O2 + 2H2O + 4e- -> 4OH^-"], note: "The oxygen half is the one you converted to base in step 7. Rust is the subject of Corrosion." },
    { name: "Alkaline cell", eq: "Zn + MnO2 -> ZnO + Mn2O3", ans: [1, 2, 1, 1], n: 2,
      halves: ["Zn + 2OH^- -> ZnO + H2O + 2e-", "2MnO2 + H2O + 2e- -> Mn2O3 + 2OH^-"], note: "The net reaction of step 8." },
    { name: "Lead–acid car battery", eq: "Pb + PbO2 + H^+ + SO4^2- -> PbSO4 + H2O", ans: [1, 1, 4, 2, 2, 2], n: 2,
      halves: ["Pb + SO4^2- -> PbSO4 + 2e-", "PbO2 + SO4^2- + 4H^+ + 2e- -> PbSO4 + 2H2O"], note: "Lead at 0 and lead at +4 both end up at +2 in solid lead sulfate. This reaction really consumes acid, which matters in Lead: the rechargeable car battery." },
  ];
  steps.push({
    title: "Capstone: the balancing bench",
    short: "Capstone: balance them",
    newConcepts: [],
    render(el) {
      el.append(
        P("Seven real reactions, each given as an unbalanced skeleton with every particle already in place. Set the coefficients. The ledger shows, live, which atoms and how much charge are still off."),
        P("You can fiddle, but try the method: write the two halves on paper (or open the hint), find n, then scale. The later ones are close to impossible by guessing and take a minute with the recipe.")
      );
      let idx = 0, edBox = h("div"), ed = null, led = null, hintOn = false;
      const solved = new Set();
      const verdict = h("div", { class: "brx-verdict", style: "min-height:70px" }), hint = h("div", { class: "brx-line", style: "font-size:15px;color:var(--muted);min-height:0" });
      const sRows = stat("ledger rows balanced", "b"), sN = stat("electrons transferred, n", "g"), sDone = stat("reactions balanced", "y");
      const ledBox = h("div");
      const sel = h("select", { class: "brx-select", "aria-label": "reaction" }, ...LAB.map((r, i) => h("option", { value: String(i) }, `${i + 1}. ${r.name}`)));
      const upd = (eq) => {
        const R = LAB[idx];
        led.update(eq.L, eq.R);
        sRows.set(`${led.good} / ${led.rows}`);
        const cs = [...eq.L, ...eq.R].map((t) => t.c), k = cs[0] / R.ans[0];
        if (led.ok && k === 1) {
          solved.add(idx); sN.set(String(R.n));
          verdict.innerHTML = `<span class="brx-ok">Balanced: ${eqHTML(eq)}.</span> n = ${R.n}. ${R.note}`;
        } else if (led.ok) {
          sN.set(String(R.n * k));
          verdict.innerHTML = `Atoms and charge both match, but every coefficient can be divided by ${k}. The convention is the smallest whole numbers.`;
        } else {
          sN.set("–");
          const bad = [];
          elementsOf(eq.L, eq.R).forEach((e) => { if ((led.a.atoms[e] || 0) !== (led.b.atoms[e] || 0)) bad.push(e); });
          if (led.a.q !== led.b.q) bad.push("charge");
          verdict.innerHTML = `<span class="brx-bad">Still off: ${bad.join(", ")}.</span>` + (bad.length === 1 && bad[0] === "charge" ? " Atoms match but charge does not: the electrons given and taken are not equal yet." : "");
        }
        sDone.set(`${solved.size} / ${LAB.length}`);
      };
      const showHint = () => {
        const R = LAB[idx];
        hint.innerHTML = hintOn ? `<div class="brx-cap">half-reactions (not yet scaled)</div>${R.halves.map((x) => eqHTML(parseEq(x))).join("<br>")}` : "";
      };
      const load = (i) => {
        idx = i; hintOn = false; showHint();
        const R = LAB[i], eq = parseEq(R.eq);
        const mx = Math.max(...R.ans) + 2;
        led = ledger(); ledBox.innerHTML = ""; ledBox.append(led);
        ed = editor({ L: eq.L.map((t) => ({ f: t.sp.f, c: 1, min: 1, max: mx })), R: eq.R.map((t) => ({ f: t.sp.f, c: 1, min: 1, max: mx })) }, upd);
        edBox.innerHTML = ""; edBox.append(ed);
        upd(ed.get());
      };
      sel.addEventListener("change", () => load(+sel.value));
      el.append(widget("Pick a reaction, set the coefficients, close the ledger",
        h("div", { style: "margin-bottom:10px" }, sel), edBox, ledBox,
        h("div", { class: "readout" }, sRows, sN, sDone), verdict,
        h("div", { class: "btns" },
          h("button", { onclick: () => { hintOn = !hintOn; showHint(); } }, "Hint: show the half-reactions"),
          h("button", { onclick: () => { const R = LAB[idx], nL = parseEq(R.eq).L.length; ed.set(R.ans.slice(0, nL).map(() => 1), R.ans.slice(nL).map(() => 1)); } }, "Reset to all 1"),
          h("button", { onclick: () => { const R = LAB[idx], nL = parseEq(R.eq).L.length; ed.set(R.ans.slice(0, nL), R.ans.slice(nL)); } }, "Reveal this one")),
        hint));
      load(0);
      el.append(
        P("What to notice, each from an earlier step:"),
        h("ul", {},
          h("li", { html: "In reaction 1 the atoms balance at once and the charge does not (<b>step 1</b>). The charge row is the electron count in disguise." }),
          h("li", { html: `In reactions 3 and 4 the hint gives 5 + 1 and 2 + 3 electrons. Scale to n = 5 and n = 6 and the ${f("H^+")} and ${f("H2O")} coefficients fall out without any guessing (<b>steps 3–6</b>).` }),
          h("li", { html: `Reaction 5 runs without acid, so the product is ${f("OH^-")}, not water (<b>step 7</b>).` }),
          h("li", { html: `Reactions 6 and 7 are batteries. One shows no ${f("OH^-")} at all in its net reaction; the other consumes ${f("H^+")} and sulfate as it runs (<b>step 8</b>).` })),
        P("Every cell in the rest of the course is two half-reactions like these, with the electrons made to travel through a wire instead of jumping directly. The number n you found here is how many of them make the trip."),
        takeaway("Any redox equation yields to the same bookkeeping: balance each half in atoms and charge, make the electrons cancel, add.")
      );
    },
  });

  Course.run({
    id: "balancing-redox",
    section: "1. Redox: electrons change hands",
    title: "Balancing redox equations",
    concepts: {
      coeff: "coefficient (balanced equation)", chargecons: "charge conservation", ebal: "electrons balance a half-reaction",
      hrm: "half-reaction method", n: "electrons transferred (n)", balO: "balance O with H₂O",
      acid: "acidic solution (H⁺ available)", balH: "balance H with H⁺", oxcheck: "electron count = oxidation-number change",
      base: "basic solution (OH⁻ available)", ohfix: "convert to base with OH⁻", net: "net reaction (cancel both sides)",
    },
    sources: [
      { title: "OpenStax Chemistry 2e, §17.1 Review of Redox Chemistry", url: "https://openstax.org/books/chemistry-2e/pages/17-1-review-of-redox-chemistry", note: "the half-reaction method in acidic and basic solution, step by step" },
      { title: "OpenStax Chemistry 2e, §4.2 Classifying Chemical Reactions", url: "https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions", note: "balancing redox reactions via half-reactions; dichromate + iron(II) worked example" },
      { title: "LibreTexts: Balancing Redox Reactions", url: "https://chem.libretexts.org/Bookshelves/Analytical_Chemistry/Supplemental_Modules_(Analytical_Chemistry)/Electrochemistry/Redox_Chemistry/Balancing_Redox_reactions", note: "acidic and basic recipes, adding OH⁻ to both sides" },
      { title: "Wikipedia: Half-reaction", url: "https://en.wikipedia.org/wiki/Half-reaction", note: "permanganate half-reactions in acid (5 e⁻, Mn²⁺) and in base (3 e⁻, MnO₂)" },
      { title: "Wikipedia: Alkaline battery", url: "https://en.wikipedia.org/wiki/Alkaline_battery", note: "Zn + 2MnO₂ → ZnO + Mn₂O₃ and its two half-reactions in KOH" },
      { title: "Wikipedia: Lead–acid battery", url: "https://en.wikipedia.org/wiki/Lead%E2%80%93acid_battery", note: "Pb + PbO₂ + 2H₂SO₄ → 2PbSO₄ + 2H₂O and its half-reactions" },
    ],
    steps,
  });
})();
