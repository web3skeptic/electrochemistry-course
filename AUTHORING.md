# Authoring a lesson

Read this whole file before writing a lesson. The reference implementation is [`reference/example-lesson.js`](reference/example-lesson.js) (with its
`.meta.json`). It comes from a sister course about LLMs: ignore its subject, but read it fully and match its
structure, quality, tone and interactivity.

## The course

*Electricity from the elements*: inorganic electrochemistry from the atom to the battery. The thread through every
lesson is **which elements give electrons, which take them, and how that is turned into current**.

**Inorganic chemistry only.** No organic chemistry: no carbon-chain structures, functional groups or organic
mechanisms. Where a real device uses an organic material (Li-ion solvent, polymer membrane, separator), describe it
by its function in a few words ("a non-aqueous solvent") and move on.

## The learner

A programmer, comfortable with numbers, code and graphs, whose school chemistry is long forgotten: assume **no
chemistry knowledge** beyond what earlier lessons taught. They find textbook/wiki-style explanations unreadable and
want explanations in the spirit of 3Blue1Brown / StatQuest: few concepts in play, each built from the previous
ones, with interactive pictures (atoms, ions, beakers, electrodes, moving electrons) instead of walls of definitions.

## Teaching contract (strict)

1. **One running concrete example** per lesson, with small real numbers, reused from step to step. Where possible
   connect it to a running example from a prerequisite lesson (sodium + chlorine, zinc in copper sulfate, the
   Daniell cell, …).
2. **At most 2 new concepts per step** (`newConcepts`). Never use a term before the step that introduces it.
3. **Intuition → name → formula**, in that order. A formula appears only as shorthand for something already felt.
4. **Gradual difficulty**: step 1 is easy and concrete; each step uses only what came before; the last 2–3 steps
   combine ideas; the final step is a **capstone** (an interactive simulation or mini-experiment that uses
   everything, `newConcepts: []`, no check).
5. Every step: short prose (≤ ~250 words outside widgets) → **at least one meaningful interactive widget** →
   a one-line `takeaway` → a `check` that unlocks the next step (all steps except the capstone).
6. 7–12 steps per lesson.

### Concept continuity across lessons

- The lessons you build on are the transitive `prereqs` in `course.json`. Read each prerequisite's
  `lessons/<id>.meta.json` if it exists; if it is still being written, its `teaches` list and `scope` in
  `course.json` are the contract. Those concepts are **earned** and can be used freely. When you first use one, recall it
  in half a sentence and name the lesson (e.g. *oxidation number (from Oxidation and reduction)*).
- Anything not earned must be introduced as a `newConcept` in your lesson, or not used.
- A concept taught in a lesson that is **not** a prerequisite may only be *named* with a pointer
  ("covered in *Electrolysis*"), never relied on.
- Your lesson must teach everything in its own `teaches` list in `course.json` (other lessons rely on it) and stay
  inside its `scope`: topics in another lesson's scope belong to that lesson.
- Your `meta.json` must list every concept you introduce, with a one-sentence definition, because later lessons
  depend on it.

### Style

- Second person, short sentences, plain words. No hype, no emojis, no wiki-style definition lists.
- In prose HTML: `<b>` = the key idea (rendered yellow); `<em>` = an earned concept or reference (rendered blue);
  `<code>` for formulas if you like.
- Write formulas with real sub/superscripts: `Chem.f("Cu^2+ + SO4^2-")` → Cu²⁺ + SO₄²⁻ (works in HTML and SVG).
  Use e⁻ for the electron and → for reactions.
- Checks are answerable in one line: `number` (with `tolerance`) or `choice` (3 options, `wrongHints` that address
  the specific misconception, `why` explaining the right answer). Use `backTo` (0-based index of an *earlier* step)
  when a wrong answer means an earlier idea didn't land.
- Checks should not be trivia: they test whether the idea landed (predict, compute, compare).

### Accuracy and literature

- **Numbers come from `assets/chem.js`** wherever it has them (`Chem.E0` standard reduction potentials,
  `Chem.elements`, `Chem.F`, `Chem.R`), so the whole course agrees with itself. Read that file first.
- **Verify before you teach.** For anything else you are not certain about (cell voltages, capacities, dates,
  industrial process conditions, energy densities), use web search / fetch if you have it. Prefer textbooks
  (LibreTexts, OpenStax Chemistry), the CRC Handbook, IUPAC, review papers, manufacturer data sheets.
- Cite what you used in `sources` (`{ title, url, note }`); 3–8 entries is typical. Only cite URLs you are confident
  exist (OpenStax / LibreTexts chapter pages, Wikipedia articles, DOIs).
- Never invent numbers. Toy numbers must be clearly toy. Simplified models (the 2-8-8 shell model, "voltage follows
  fill level") must be labelled as simplifications. Date time-sensitive facts ("as of 2026").
- Chemistry must be right: every equation balanced in atoms **and** charge, correct oxidation states, correct
  electrode polarity and direction of electron and ion flow. Re-check each one before you finish.

## Files you write (and the only files you touch)

- `lessons/<id>.js`: the lesson
- `lessons/<id>.meta.json`: its metadata

Do **not** edit `assets/*`, `course.json`, `index.html`, other lessons, or tests: other agents work in parallel.
If you need a helper the engine lacks, write it inside your lesson file. If you think the engine should have it,
put a note in `meta.engineWishes`. Do not run git commands. Do not start dev servers.

## Lesson file

```js
(function () {
  const { h, s, fmt, log2, surprise, widget, stat, slider, betSliders, barChart, plot, softmax,
          toggle, hbars, heatmap, plane, rng, gauss, chunked, movingAvg, isNarrow, narrow, fitText } = Course;  // take what you use
  const steps = [];
  steps.push({
    title: "The game: guess the next word",   // shown as the heading
    short: "Guess the next word",              // shown in the ladder sidebar (≤ 26 chars)
    newConcepts: ["ntp", "bets"],              // keys of lesson.concepts, max 2
    render(el, api) {                          // el = .prose container; append DOM to it
      el.append(h("p", { html: "…" }), widget("Label", /* controls */), h("div", { class: "takeaway", html: "…" }));
      return () => { /* optional cleanup: clear timers */ };
    },
    check: { type: "number", q: "…html…", answer: 0.1, tolerance: 0.001, alsoPercent: true, shown: "10%",
             hint: "…", why: "…", backTo: 0 },
    // or: { type: "choice", q: "…", options: ["…", "…", "…"], answer: 0, wrongHints: { 1: "…", 2: "…" }, why: "…" }
  });
  Course.run({
    id: "<id>", section: "0. Atoms that give and take electrons", title: "<title from course.json>",
    concepts: { ntp: "next-token prediction", bets: "bets (probability distribution)" },  // key → short chip label
    sources: [{ title: "…", url: "https://…", note: "…" }],
    steps,
  });
})();
```

`section` is the display string `"<section id>. <section title>"` from `course.json`.

### Chemistry helpers (`assets/chem.js`, global `Chem`)

| helper | what it does |
|---|---|
| `Chem.f(str)` | formula formatter → Unicode: `Chem.f("2MnO4^- + 16H^+ -> 2Mn^2+ + 8H2O")`, `e-` → e⁻, `<->` → ⇌ |
| `Chem.elements.Zn` | `{ Z, sym, name, group, period, mass, en (Pauling), ie1 (kJ/mol), shells: [2,8,18,2], valence }` for H–Kr plus Ag, Cd, Sn, I, Cs, Ba, Pt, Au, Hg, Pb |
| `Chem.E0` / `Chem.E0by[id]` | standard reduction potentials `{ id, ox, red, n, E, medium }`, sorted from Li (−3.04 V) to F₂ (+2.87 V); ids like `"Zn"`, `"Cu"`, `"Fe3/Fe2"`, `"O2"`, `"PbO2"`, `"NiOOH"` |
| `Chem.half(idOrEntry, reverse)` | half-reaction text: `"Zn²⁺ + 2e⁻ → Zn"` (reverse = written as oxidation) |
| `Chem.nernst(E0, n, Q, T)` | E = E° − (RT/nF) ln Q |
| `Chem.capacity(n, M)` | theoretical specific capacity in mAh/g |
| `Chem.F`, `Chem.R`, `Chem.T0`, `Chem.E_CHARGE`, `Chem.N_A` | constants |

The generic engine has no chemistry drawings: draw atoms, shells, beakers, electrodes, ions and wires yourself with
SVG (`s()`), inside your lesson file. Moving electrons/ions should actually move (setTimeout animation). Ignore the
LLM-specific helpers (`softmax`, `betSliders`, `surprise`, the `sentence`/`tok` CSS classes).

### Engine helpers (`assets/course.js`)

| helper | what it does |
|---|---|
| `h(tag, attrs, ...children)` | create an element; `attrs.class`, `attrs.html` (innerHTML), `onclick`, … |
| `s(tag, attrs)` | create an SVG element |
| `fmt.pct(p)`, `fmt.n(x, d)`, `fmt.sci(x)`, `fmt.pow10(v)` | formatting (`fmt.n` prints ∞ for non-finite; `fmt.pow10(1000)` → `10³`) |
| `log2`, `surprise(p)` | −log₂ p |
| `softmax(arr)` | numerically stable softmax |
| `widget(label, ...children)` | the standard bordered widget box |
| `stat(label, cls)` | a readout tile; `.set(text)`; cls: `y` `b` `g` `r` `p` colours |
| `slider({name, min, max, step, value, fmtv, oninput})` | labelled range row; `.set(v)` |
| `betSliders(words, init, onchange)` | sliders that always sum to 1; `.get()`, `.setAll(p)` |
| `barChart({labels, max, height, colors, fmtv, signed})` | SVG bars; `.update(values, colors?)`, `.labelAt(i, text, color)` |
| `plot({xmin,xmax,ymin,ymax,width,height,xlabel,ylabel,xticks,yticks})` | SVG axes; `.fn(f,color,dash)`, `.line(pts,color,dash)`, `.hline(y,color,label)`, `.marker()` → `.move(x,y)`, `.clear()`, `.X(x)`/`.Y(y)` |
| `stat(label, cls)` … `.setLabel(text)` | change the readout title when the widget state changes |
| `slider({…, log, steps, nameWidth})` | `log: true` moves in log₁₀ space between `min` and `max` (both > 0, `steps` positions, `step` ignored); `oninput`/`.set`/`.get()` use real values. `nameWidth` (px or CSS) widens the name column for long names (wraps, capped at 40% of the row) |
| `barChart({…, width, narrow, minFont, onclick})` | optional: viewBox `width` (default 520), `narrow` (viewBox width on phones, `true` = 380), `minFont` (px floor, see `fitText`), `onclick(i)` per bar column |
| `plot({…, xlog, ylog, xfmt, yfmt, clip, narrow, minFont, margins})` | optional: `xlog`/`ylog` base-10 axes (ranges, ticks and points stay in data units; ticks print as 10ⁿ); `xfmt`/`yfmt(v)` tick-label formatters; `clip: true` makes `.line`/`.fn` break at the frame instead of clamping (no fake plateaus); `narrow` viewBox width on phones (`true` = 400); `minFont` px floor for text; `margins: {left,right,top,bottom}` |
| plot extras | `.line(pts, color, true)` = dashed; `.hline(y, color, label, {pos: "left"\|"right", below, halo})`; `.vline(x, color, label, {pos, halo})`; `.dot(x, y, color, r)` (clearable; out-of-range values show as hollow rings on the frame); `.area(ptsOrFn, color, opacity, base)`; `.marker(color, {clearable: true})`; `.legend([[label, color, dash], …], {pos: "right"})`; `.setRange({xmin, xmax, ymin, ymax, xticks, yticks})` re-labels the axes (then `.clear()` and redraw); `.layer`, `.frame` |
| `toggle(label, options, value, onchange)` | one-of-N button row; `options` = `[[value, html], …]` or strings (value = index); `.set(v)` (no callback), `.get()`, `.buttons` |
| `hbars(labels, {series, signed, max, fmtv, labelWidth, onclick})` | horizontal label · bar · value rows (HTML, phone-friendly); `.update(vals, colorsPerRow?, ghost?)` with `vals` = numbers or one array per series, `ghost` = dashed "before" values; `.mark(i or [i…])`, `.labelAt(i, html)` |
| `heatmap({rows, cols, values, min, max, fmtv, showValues, mask, onclick, color, negColor, cell, corner})` | n × m grid with labels; `min < 0` → diverging blue/red; `mask(i,j)` hatches a cell; `onclick(i, j)` (row label: `j = -1`); `.update(values, {mask, mark(i,j)})`, `.select(i)`, `.cell(i,j)`; scrolls sideways on phones |
| `plane({xmin, xmax, ymin, ymax, size, height, grid, xlabel, ylabel, maxWidth})` | 2-D grid; `.point(x, y, {color, label, r, drag})` → `.move(x,y)`, `.label(t)`, `.pos`; `.arrow({from, to, color, label, width, at, drag})` → `.set(x, y, x0?, y0?)`, `.pos`; `drag(x, y)` gets clamped coords and may return `[x, y]` to snap; `.line(pts,color,dash)`, `.clear()`, `.X/.Y`, `.inv(event)` |
| `rng(seed)` → `r()` | seeded RNG (mulberry32); `r.gauss()`, `r.int(n)`, `r.pick(arr)`; also `gauss(r)` |
| `chunked(stepFn, {perTick, delay, total, onTick, onDone})` | run a training loop in `setTimeout` chunks; `stepFn(i)` returning `false` stops; returns `stop()`, call it from your cleanup |
| `movingAvg(arr, n)` | trailing mean over the last `n` values, for noisy training curves |
| `isNarrow()`, `narrow(wide, small)` | phone check (≤ 600 px); e.g. `plot({ width: narrow(560, 400), … })` for any hand-made SVG viewBox |
| `fitText(svg, minPx = 10)` | keep text drawn with the default SVG font at least `minPx` on screen (scales font-size up to 1.8×); leave room in your layout |

CSS classes: `takeaway`, `formula` (inside: `.hl` yellow, `.bl` blue, `<small>` caption), `widget`, `widget-label`,
`row`, `btns`, `readout`, `stat`, `sentence` (with `.tok`, `.tok.ctx`, `.tok.tgt`, `.tok.dim`, `.blank`), `note`,
`table.small` (`td.num` / `th.num` right-align numbers; add `compact` for dense grids), `tablewrap` (wrap wide tables
so they scroll sideways on phones), `sample`, `chip`. Colour convention for particles across the course: electrons yellow, cations (+) red, anions (−) blue,
neutral atoms / metals muted or green. Colours: `var(--blue)` `var(--yellow)` `var(--green)`
`var(--red)` `var(--purple)` `var(--muted)` `var(--panel2)`. You may add inline styles or a `<style>` element
from your lesson for lesson-specific visuals (prefix classes with your lesson id).

### Interactivity rules

- Every step needs a widget that **changes something the learner can see** when they act: live sliders, draggable
  points, step-through buttons, small simulations, "predict, then reveal". No decorative widgets.
- Prefer things the learner can *break*: extreme slider values, "what if we remove X" toggles.
- Everything runs client-side in vanilla JS, with no external libraries, CDNs, fonts or network requests. Canvas or SVG.
- Animations use `setTimeout` (≈16 ms), not `requestAnimationFrame` (rAF stalls in hidden tabs and in the test
  harness). Return a cleanup function that clears timers.
- Use a seeded RNG when results should be reproducible. Keep interactions under ~50 ms.
- Real model data that can't be computed in-browser may be embedded as small JSON constants; say where it came
  from, or mark it as synthetic.
- Layout must work at 390 px wide (mobile) and must not overflow horizontally: SVG with `viewBox` + `width="100%"`.
  A 560-wide viewBox shrinks 12 px text to about 7 px on a phone: pass `narrow: true` (or `width: narrow(560, 400)`)
  and/or `minFont: 10` to `plot()`/`barChart()`, and prefer `hbars`/`heatmap` (HTML) for labelled lists and grids.
- `course.css` has a global `svg text { fill; font }` rule that **overrides SVG presentation attributes**: to colour or
  size hand-made SVG text, use inline `style="fill:…;font-size:…"`, not `fill=`/`font-size=` attributes.
- Unicode superscripts (²⁺) get wide gaps in the monospace font (`.mono`, `<code>`, `.stat .v`): set formulas in the
  sans font (`style="font-family:inherit"`).
- The test harness holds handles to a widget's buttons while clicking them: a widget that rebuilds its buttons on
  every click costs 1.5 s per stale button. Update buttons in place where you can.
- Before writing a local helper, check the table above: toggles, horizontal bars, heatmaps, a draggable 2-D plane,
  log axes, log sliders and a seeded RNG are built in.

## meta.json

```json
{
  "id": "<id>",
  "title": "<title>",
  "steps": 10,
  "concepts": [{ "key": "ntp", "label": "next-token prediction", "definition": "one sentence" }],
  "namedOnly": ["terms mentioned but not taught, e.g. 'causal mask'"],
  "summary": "2–3 sentences: running example, capstone, hooks later lessons can reuse",
  "sources": [{ "title": "…", "url": "…" }],
  "engineWishes": []
}
```

## Testing (required before you finish)

```bash
node tests/smoke.mjs <id>                      # must print PASS; fix all ✗ and aim for zero ⚠
node tests/smoke.mjs <id> --shots shots/<id>    # screenshots of every step (desktop + mobile)
```

`--shots` writes a desktop full-page PNG and a mobile (390 px) PNG of the lesson column for every step. If you write
throwaway scripts, put them in the scratchpad under a name containing your lesson id (other agents share it).

Then **look at the screenshots** (open the PNGs) and fix anything that looks broken, cramped, unreadable or ugly.
The harness plays every step: it gives a wrong answer (must stay locked), then the right answer, moves every slider
to its extremes, clicks every widget button, and flags JS errors, `NaN`/`undefined` in the page and overflow.
