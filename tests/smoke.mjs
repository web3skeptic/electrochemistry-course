#!/usr/bin/env node
// Headless playthrough of lessons: validates metadata, plays every step like a learner
// (wrong answer → must stay locked, right answer → unlocks), pokes every widget control,
// and reports JS errors, NaN/undefined text, layout overflow. Optional screenshots.
//
//   node tests/smoke.mjs                      # all lessons that have a .meta.json
//   node tests/smoke.mjs attention kv-cache   # specific lessons
//   node tests/smoke.mjs attention --shots /tmp/shots   # + screenshot per step (desktop + mobile)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const shotsIdx = args.indexOf("--shots");
const SHOTS = shotsIdx >= 0 ? args[shotsIdx + 1] : null;
const ids = args.filter((a, i) => !a.startsWith("--") && (shotsIdx < 0 || i !== shotsIdx + 1));

function loadPlaywright() {
  const tries = [path.join(ROOT, "package.json"), path.join(ROOT, "..", "playwright-cli", "package.json")];
  for (const t of tries) { try { return createRequire(t)("playwright"); } catch (e) {} }
  throw new Error("playwright not found: run `npm install` in the repo");
}
const CHROME = process.env.CHROME || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, resp) => {
      const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const f = path.join(ROOT, u === "/" ? "index.html" : u);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { resp.writeHead(404); return resp.end(); }
      resp.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
      fs.createReadStream(f).pipe(resp);
    });
    srv.listen(0, "127.0.0.1", () => res(srv));
  });
}

const course = JSON.parse(fs.readFileSync(path.join(ROOT, "course.json"), "utf8"));
const lessonIds = ids.length ? ids : course.lessons.map((l) => l.id).filter((id) => fs.existsSync(path.join(ROOT, "lessons", id + ".meta.json")));

async function testLesson(browser, base, id) {
  const errors = [], warnings = [];
  const entry = course.lessons.find((l) => l.id === id);
  if (!entry) errors.push(`"${id}" is not in course.json`);
  // ---- metadata
  let meta = null;
  const metaPath = path.join(ROOT, "lessons", id + ".meta.json");
  if (!fs.existsSync(path.join(ROOT, "lessons", id + ".js"))) errors.push(`lessons/${id}.js missing`);
  if (!fs.existsSync(metaPath)) errors.push(`lessons/${id}.meta.json missing`);
  else {
    try { meta = JSON.parse(fs.readFileSync(metaPath, "utf8")); } catch (e) { errors.push("meta.json invalid JSON: " + e.message); }
    if (meta) {
      if (meta.id !== id) errors.push(`meta.id "${meta.id}" ≠ "${id}"`);
      if (!Array.isArray(meta.concepts) || !meta.concepts.every((c) => c.key && c.label && c.definition)) errors.push("meta.concepts must be [{key,label,definition}]");
      if (!meta.summary) warnings.push("meta.summary missing");
    }
  }
  if (errors.length) return { id, errors, warnings };

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("page error: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console error: " + m.text()); });
  page.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`HTTP ${r.status()} for ${r.url().replace(base, "")}`); });
  await page.goto(`${base}/lesson.html?id=${id}`);
  await page.evaluate((k) => localStorage.removeItem(k), "chemcourse:" + id);
  await page.reload();
  try { await page.waitForFunction(() => window.__lesson && document.querySelector(".step-title"), null, { timeout: 8000 }); }
  catch (e) { errors.push("lesson never rendered (window.__lesson / .step-title missing)"); await ctx.close(); return { id, errors, warnings }; }
  await page.waitForTimeout(300);

  // ---- static structure
  const S = await page.evaluate(() => {
    const L = window.__lesson;
    return { id: L.id, title: L.title, n: L.steps.length, concepts: Object.keys(L.concepts || {}), sources: (L.sources || []).length,
      steps: L.steps.map((s) => ({ title: s.title, nc: s.newConcepts || [], check: s.check ? { type: s.check.type, nopts: (s.check.options || []).length, answer: s.check.answer, backTo: s.check.backTo } : null })) };
  });
  if (S.id !== id) errors.push(`lesson id "${S.id}" ≠ "${id}"`);
  if (meta.steps !== S.n) errors.push(`meta.steps ${meta.steps} ≠ actual ${S.n}`);
  const metaKeys = new Set(meta.concepts.map((c) => c.key));
  const seen = {};
  S.steps.forEach((s, i) => {
    if (s.nc.length > 2) errors.push(`step ${i + 1} introduces ${s.nc.length} concepts (max 2)`);
    s.nc.forEach((k) => { if (!S.concepts.includes(k)) errors.push(`step ${i + 1} concept "${k}" not in lesson.concepts`); if (seen[k] != null) warnings.push(`concept "${k}" introduced twice (steps ${seen[k] + 1}, ${i + 1})`); seen[k] = i; });
    if (!s.check && i < S.n - 1) warnings.push(`step ${i + 1} has no check`);
    if (s.check) {
      if (s.check.type === "choice" && !(s.check.answer >= 0 && s.check.answer < s.check.nopts)) errors.push(`step ${i + 1} choice answer index out of range`);
      if (s.check.type === "number" && typeof s.check.answer !== "number") errors.push(`step ${i + 1} number answer not numeric`);
      if (!["choice", "number"].includes(s.check.type)) errors.push(`step ${i + 1} unknown check type`);
      if (s.check.backTo != null && !(s.check.backTo >= 0 && s.check.backTo < i)) warnings.push(`step ${i + 1} backTo ${s.check.backTo} should point to an earlier step (0-based)`);
    }
  });
  S.concepts.forEach((k) => { if (seen[k] == null) warnings.push(`concept "${k}" never introduced by a step`); if (!metaKeys.has(k)) warnings.push(`concept "${k}" missing from meta.concepts`); });
  if (S.n < 6) warnings.push(`only ${S.n} steps — lessons should usually have 7–12`);
  if (!S.sources) warnings.push("lesson.sources empty (cite papers / docs)");

  // ---- playthrough
  const BAD = /\bNaN\b|\bundefined\b|\[object Object\]/;
  for (let i = 0; i < S.n; i++) {
    const title = await page.$eval(".step-title", (e) => e.textContent);
    if (title !== S.steps[i].title) { errors.push(`step ${i + 1}: expected title "${S.steps[i].title}", got "${title}"`); break; }
    // poke widgets
    await page.evaluate(() => {
      document.querySelectorAll(".main input[type=range]").forEach((r) => {
        for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event("input", { bubbles: true })); r.dispatchEvent(new Event("change", { bubbles: true })); }
      });
      document.querySelectorAll(".main select").forEach((s) => { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event("change", { bubbles: true })); } });
    });
    const btns = await page.$$(".main .widget button");
    for (const b of btns.slice(0, 25)) { try { await b.click({ timeout: 1500 }); await page.waitForTimeout(40); } catch (e) {} }
    await page.waitForTimeout(700);
    const txt = await page.$eval(".main", (e) => e.innerText);
    const m = txt.match(BAD); if (m) errors.push(`step ${i + 1}: page shows "${m[0]}" (…${txt.slice(Math.max(0, m.index - 60), m.index + 20).replace(/\s+/g, " ")}…)`);
    const ov = await page.evaluate(() => { const mn = document.querySelector(".main"); return [...mn.querySelectorAll("*")].some((e) => e.getBoundingClientRect().right > mn.getBoundingClientRect().right + 4 && getComputedStyle(e).position !== "fixed") || document.documentElement.scrollWidth > document.documentElement.clientWidth + 2; });
    if (ov) warnings.push(`step ${i + 1}: content overflows horizontally at 1280px`);
    if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${id}-step${String(i + 1).padStart(2, "0")}.png`), fullPage: true }); }

    const chk = S.steps[i].check;
    const nextDisabled = async () => page.$eval(".nav .primary", (b) => b.disabled);
    if (chk) {
      if (!(await nextDisabled())) errors.push(`step ${i + 1}: Next is enabled before answering`);
      const full = await page.evaluate((k) => { const c = window.__lesson.steps[k].check; return { type: c.type, answer: c.answer, n: (c.options || []).length, tol: c.tolerance ?? 0.01 }; }, i);
      if (full.type === "choice") {
        const wrong = full.answer === 0 ? 1 : 0;
        if (full.n > 1) {
          await page.click(`.check .opts button:nth-child(${wrong + 1})`);
          if (!(await page.$(".feedback.bad"))) errors.push(`step ${i + 1}: wrong choice not rejected`);
          if (!(await nextDisabled())) errors.push(`step ${i + 1}: wrong choice unlocked Next`);
        }
        await page.click(`.check .opts button:nth-child(${full.answer + 1})`);
      } else {
        await page.fill(".check input.ans", String(full.answer + Math.max(1000, Math.abs(full.answer) * 10)));
        await page.click(".check button");
        if (!(await page.$(".feedback.bad"))) errors.push(`step ${i + 1}: wrong number not rejected`);
        await page.fill(".check input.ans", String(full.answer));
        await page.click(".check button");
      }
      if (!(await page.$(".feedback.ok"))) { errors.push(`step ${i + 1}: correct answer not accepted`); break; }
      if (await nextDisabled()) { errors.push(`step ${i + 1}: Next still disabled after correct answer`); break; }
    }
    if (i < S.n - 1) { await page.click(".nav .primary"); await page.waitForTimeout(250); }
  }

  // ---- mobile layout pass
  await page.setViewportSize({ width: 390, height: 844 });
  for (let i = 0; i < S.n; i++) {
    await page.evaluate((k) => window.__courseGo(k), i);
    await page.waitForTimeout(150);
    const w = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (w > 8) warnings.push(`step ${i + 1}: horizontal scroll on mobile (+${w}px)`);
    if (SHOTS) { const m = await page.$("#main"); await (m || page).screenshot({ path: path.join(SHOTS, `${id}-mobile-step${i + 1}.png`) }); }
  }
  await ctx.close();
  return { id, errors: [...new Set(errors)], warnings: [...new Set(warnings)], steps: S.n };
}

const { chromium } = loadPlaywright();
const srv = await serve();
const base = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
let failed = 0;
for (const id of lessonIds) {
  let r;
  try { r = await testLesson(browser, base, id); } catch (e) { r = { id, errors: ["harness crash: " + e.message.split("\n")[0]], warnings: [] }; }
  const ok = !r.errors.length; if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${id}${r.steps ? ` (${r.steps} steps)` : ""}`);
  r.errors.forEach((e) => console.log("   ✗ " + e));
  r.warnings.forEach((w) => console.log("   ⚠ " + w));
}
await browser.close(); srv.close();
console.log(`\n${lessonIds.length - failed}/${lessonIds.length} lessons pass`);
process.exit(failed ? 1 : 0);
