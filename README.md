# Electricity from the elements

An interactive, step-by-step course on inorganic electrochemistry: which elements give electrons, which take them,
and how that becomes current (galvanic cells, batteries element by element, electrolysis, fuel cells, corrosion,
solar cells). One or two new ideas per step, each step gated by a small check.

```bash
python3 -m http.server 5213
```

Then open http://localhost:5213. Progress is stored in your browser's localStorage.

- `course.json`: the lesson plan (sections, prerequisites, scope, what each lesson teaches)
- `lessons/<id>.js` + `.meta.json`: one lesson
- `assets/course.js`, `course.css`: the lesson engine; `assets/chem.js`: shared chemistry data and helpers
- `AUTHORING.md`: the teaching contract for writing lessons
- `node tests/smoke.mjs [ids] [--shots dir]`: headless playthrough of lessons
