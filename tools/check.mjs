// The smallest thing that fails if the logic breaks: an assertion pass over
// every built page. Run `node tools/build.mjs && node tools/check.mjs`.
// No frameworks; if a rule below ever gets annoying, delete the rule, not the discipline.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, PAGES, PRODUCTS } from "../site/data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let fails = 0;
const ok = (cond, msg) => {
  if (!cond) {
    console.error("FAIL:", msg);
    fails++;
  }
};

const htmlFiles = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    if (f === ".git" || f === "node_modules" || f === "site" || f === "tools" || f === "tmp") continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".html")) htmlFiles.push(p);
  }
})(ROOT);

const pages = htmlFiles.map((f) => ({ f, rel: "/" + f.slice(ROOT.length + 1), src: readFileSync(f, "utf8") }));
ok(pages.length === PAGES.length + PRODUCTS.length + 1, `page count: want ${PAGES.length + PRODUCTS.length + 1}, got ${pages.length}`);
ok(pages.some((p) => p.rel === "/index.html"), "root file is lowercase /index.html (Netlify directory index)");
ok(!existsSync(join(ROOT, "Index.html")), "no case-colliding Index.html left over");

/* ------------------------------------------------ per-page invariants */
const titles = new Map();
const descs = new Map();
for (const p of pages) {
  const t = p.src.match(/<title>([^<]+)<\/title>/);
  ok(!!t, `${p.rel}: has a <title>`);
  if (t) {
    ok(!titles.has(t[1]) || p.rel === "/404.html", `${p.rel}: title not unique`);
    titles.set(t[1], p.rel);
    ok(t[1].length <= 68, `${p.rel}: title ${t[1].length} chars (keep it under 68)`);
  }
  const d = p.src.match(/name="description" content="([^"]+)"/);
  ok(!!d, `${p.rel}: has a meta description`);
  if (d) {
    ok(d[1].length <= 165, `${p.rel}: description ${d[1].length} chars`);
    ok(!descs.has(d[1]), `${p.rel}: duplicate description with ${descs.get(d[1])}`);
    descs.set(d[1], p.rel);
  }
  ok(/<html lang="en">/.test(p.src), `${p.rel}: lang attribute`);
  ok(/initial-scale=1/.test(p.src) && !/maximum-scale/.test(p.src), `${p.rel}: viewport, zoom not disabled`);
  ok(/rel="canonical"/.test(p.src), `${p.rel}: canonical`);
  ok(!/<link rel="canonical" href="https?:\/\/[^"]+"/.test(p.src), `${p.rel}: canonical is host-relative (no canonical/OG host mismatch)`);
  ok(!/<meta property="og:(?:url|image)" content="https?:\/\/[^"]+"/.test(p.src), `${p.rel}: OG url/image are host-relative`);
  ok(/property="og:image"/.test(p.src) && /twitter:card/.test(p.src), `${p.rel}: share metadata`);
  ok(/name="theme-color"/.test(p.src), `${p.rel}: theme-color`);
  ok((p.src.match(/<h1/g) || []).length === 1, `${p.rel}: exactly one h1 (got ${p.src.split("<h1").length - 1})`);
  ok(/id="main"/.test(p.src), `${p.rel}: has main landmark`);
  ok(/class="skip"/.test(p.src), `${p.rel}: skip link`);
  ok(!/ style="/.test(p.src), `${p.rel}: no inline style attributes (strict CSP)`);
  ok(!/<script(?![^>]*src=)[^>]*>(?!\s*\n\s*\{?"?@context)[\s\S]*?<\/script>\s*(?!<\/body>)/.test(p.src) || /<script type="application\/json" id="pieces"/.test(p.src) || !/<script>/.test(p.src), `${p.rel}: no inline script blocks (CSP)`);
  ok(!/onclick=|onload=|onerror=/.test(p.src), `${p.rel}: no inline event handlers`);
  ok(!/href="#"/.test(p.src), `${p.rel}: no dead href="#"`);
  ok(!/—|–/.test(p.src.replace(/&[nd]ash;/g, "")) || p.rel.includes("assets"), `${p.rel}: em/en dashes in copy (use commas or &ndash; entities)`);
  ok(!/lorem ipsum|John Doe|Jane Smith|Sarah Chen|TODO|FIXME/i.test(p.src), `${p.rel}: placeholder/TODO text`);
  ok(!/console\.(log|warn|error)/.test(p.src), `${p.rel}: console noise`);

  // headings hierarchy sanity within main: never skip a level
  const mainSlice = p.src.split('<main')[1]?.split('</main>')[0] || "";
  const levels = [...mainSlice.matchAll(/<h([1-6])/g)].map((m) => +m[1]);
  let prev = 0;
  for (const lv of levels) {
    ok(prev === 0 || lv <= prev + 1, `${p.rel}: heading jump h${prev} to h${lv}`);
    prev = lv;
  }

  // every button has an accessible name (text or label); icons need aria-label
  for (const b of mainSlice.concat(p.src.split("</main>")[1] || "").matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const label = b[2].replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, "").trim();
    ok(label || /aria-label="[^"]+"/.test(b[1]) || /title=/.test(b[1]), `${p.rel}: unlabeled button: ${b[0].slice(0, 70)}`);
  }

  // images: alt + dimensions (CLS rule) except decorative alt=""
  for (const img of p.src.matchAll(/<img\b[^>]*>/g)) {
    ok(/\balt="[^"]*"/.test(img[0]), `${p.rel}: img missing alt: ${img[0].slice(0, 60)}`);
    ok(/width="\d+"/.test(img[0]) && /height="\d+"/.test(img[0]), `${p.rel}: img missing width/height: ${img[0].slice(0, 60)}`);
  }

  // icon-only links need labels too (search/bag header buttons)
  for (const a of p.src.matchAll(/<a\b[^>]*class="iconbtn[^"]*"[^>]*>/g)) {
    ok(/aria-label="[^"]+"/.test(a[0]), `${p.rel}: icon link missing aria-label`);
  }
  // external links opening new tabs keep the opener safe
  for (const a of p.src.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    ok(/rel="[^"]*noopener/.test(a[0]), `${p.rel}: target=_blank without rel=noopener`);
  }

  // local links & assets resolve to real files (query strings carry data, not paths)
  const resolves = (u) => {
    const path = u.split("?")[0].split("#")[0];
    if (path.startsWith("/assets/data")) return true;
    let f = join(ROOT, path);
    if (path.endsWith("/")) f = join(f, "index.html");
    return existsSync(f);
  };
  for (const m of p.src.matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
    ok(resolves(m[1]), `${p.rel}: broken local link ${m[1]}`);
  }
  for (const m of p.src.matchAll(/<a\b[^>]*href="(\/[^"]+)"/g)) {
    ok(resolves(m[1]), `${p.rel}: broken anchor ${m[1]}`);
  }
  // only https externals, and only origins the CSP allows
  for (const m of p.src.matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g)) {
    const u = m[1];
    ok(/^https:\/\//.test(u), `${p.rel}: insecure external ${u}`);
    if (u.startsWith(SITE.url)) continue;
    ok(
      /ik\.imagekit\.io|openstreetmap\.org|maps\.google\.com/.test(u),
      `${p.rel}: third-party origin outside the CSP allowlist: ${u}`
    );
  }
  // forms: netlify wiring + honeypot + form-name (no fake success paths)
  for (const f of p.src.matchAll(/<form\b[^>]*name="(inquire|newsletter)"[\s\S]*?<\/form>/g)) {
    const fsrc = f[0];
    ok(/data-netlify="true"/.test(fsrc), `${p.rel}: form ${f[1]} missing data-netlify`);
    ok(/netlify-honeypot="_gotcha"/.test(fsrc) && /name="_gotcha"/.test(fsrc), `${p.rel}: form ${f[1]} honeypot mismatch`);
    ok(fsrc.includes(`name="form-name" value="${f[1]}"`), `${p.rel}: form ${f[1]} missing form-name`);
    ok(/action="/.test(fsrc), `${p.rel}: form ${f[1]} needs a real action for the no-JS path`);
    ok(/novalidate/.test(fsrc), `${p.rel}: form ${f[1]} novalidate (custom states)`);
    for (const inp of fsrc.matchAll(/<(input|textarea|select)[^>]*id="([\w-]+)"/g)) {
      ok(new RegExp(`for="${inp[2]}"`).test(fsrc), `${p.rel}: #${inp[2]} has no label[for]`);
    }
  }
  // JSON-LD must be JSON
  for (const j of p.src.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let obj;
    try { obj = JSON.parse(j[1].replace(/\\u003c/g, "<")); } catch (e) { ok(false, `${p.rel}: invalid JSON-LD (${e.message})`); continue; }
    const types = [].concat(obj).map((x) => x["@type"]);
    ok(types.length > 0, `${p.rel}: empty JSON-LD`);
    ok(j[1].length < 12000, `${p.rel}: JSON-LD suspiciously large`);
  }
  // footer copyright hardcodes the launch year for the no-JS path
  ok(/data-year>2026</.test(p.src), `${p.rel}: footer year fallback`);
  // duplicate ids within a page (only ids we render are checkable cheaply)
  const ids = [...p.src.matchAll(/\bid="([\w-]+)"/g)].map((m) => m[1]);
  ok(new Set(ids).size === ids.length, `${p.rel}: duplicate id(s): ${ids.filter((x, i) => ids.indexOf(x) !== i).join(", ")}`);
}

/* ------------------------------------------------------- content/data */
const home = pages.find((p) => p.rel === "/index.html").src;
ok((home.match(/data-peek[" ]/g) || []).length === PRODUCTS.length, "home lookbook row count");
ok(/Light that <em>lingers<\/em>/.test(home), "home hero keeps the original tagline");
ok(/LUMIERE15/.test(home) && /15% off/.test(home), "home carries the holiday code copy");
const coll = pages.find((p) => p.rel === "/collection/index.html").src;
ok((coll.match(/<article class="card"/g) || []).length === PRODUCTS.length, "collection card count");
for (const p of PRODUCTS) {
  ok(coll.includes(`data-add="${p.slug}"`), `collection has ${p.slug}`);
  const card = coll.split(`data-category="${p.category}"`)[0];
  void card;
}
// price math on cards matches data
for (const p of PRODUCTS) {
  const page = pages.find((x) => x.rel === `/product/${p.slug}/index.html`);
  ok(!!page, `product page exists: ${p.slug}`);
  if (!page) continue;
  ok(page.src.includes(`$${p.price}`), `${p.slug}: sale price rendered`);
  const off = Math.round(((p.was - p.price) / p.was) * 100);
  ok(page.src.includes(`${off}% off`), `${p.slug}: discount label matches math`);
}
// chip counts (2/2/2) agree with the data
for (const c of ["rings", "necklaces", "earrings"]) {
  const n = PRODUCTS.filter((p) => p.category === c).length;
  const m = coll.match(new RegExp(`data-count="${c}">(\\d+)<`));
  ok(m && +m[1] === n, `collection chip count for ${c}: want ${n}`);
}

/* ------------------------------------------------------------ assets/js */
const css = readFileSync(join(ROOT, "assets/css/site.css"), "utf8");
ok(!/transition:\s*all/.test(css), "css: no transition:all");
ok(!/body\s*\{[^}]*overflow-x:\s*hidden/.test(css), "css: horizontal overflow fixed, not hidden (clip allowed)");
ok(/overflow-wrap:\s*break-word/.test(css), "css: long copy/URLs wrap instead of widening the page");
ok(/grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(css), "css: grids use minmax(0,1fr) tracks so tables/pre/iframes can shrink");
ok(!/box-shadow:[^;]*(glow|0 0 \d+px rgba\(2\d\d)/.test(css), "css: no decorative glow shadows");
const radii = new Set([...css.matchAll(/--r-\w+:\s*([^;]+);/g)].map((m) => m[1]));
ok(radii.size <= 3, `css: radius system has ${radii.size} values, max 3`);
ok(/prefers-reduced-motion/.test(css), "css: reduced motion respected");
ok(/@media print/.test(css), "css: print stylesheet exists");
for (const f of css.matchAll(/url\("\/assets\/fonts\/([\w.-]+)"\)/g)) {
  ok(existsSync(join(ROOT, "assets/fonts", f[1])), `css: font file missing ${f[1]}`);
}
const js = readFileSync(join(ROOT, "assets/js/site.js"), "utf8");
ok(!/innerHTML\s*=\s*[^'";]*\+/.test(js), "js: no concatenated innerHTML (XSS rule #8/#15)");
ok(!/localStorage\.setItem\([^)]*token|api[_-]?key/i.test(js), "js: no secrets in storage");
for (const f of ["theme.js", "site.js"]) {
  ok(existsSync(join(ROOT, "assets/js", f)), `js file exists: ${f}`);
}
ok(!/console\.(log|warn)/.test(readFileSync(join(ROOT, "assets/js/site.js"), "utf8")), "js: no console.log left");

/* ---------------------------------------------------------- meta files */
ok(existsSync(join(ROOT, "robots.txt")), "robots.txt exists");
ok(/Sitemap:/.test(readFileSync(join(ROOT, "robots.txt"), "utf8")), "robots points at the sitemap");
ok(existsSync(join(ROOT, "llms.txt")), "llms.txt exists");
const site = readFileSync(join(ROOT, "sitemap.xml"), "utf8");
const smUrls = [...site.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const smIndex = new Set(smUrls.map((u) => u.replace(SITE.url, "").replace(/\/$/, "/") || "/"));
const expectIndex = new Set(PAGES.filter((p) => !p.noindex).map((p) => p.url));
for (const p of PRODUCTS) expectIndex.add(`/product/${p.slug}/`);
ok(expectIndex.has("/"), "home in expected sitemap set");
for (const u of expectIndex) ok(smUrls.includes(SITE.url + u), `sitemap missing ${u}`);
for (const u of smUrls) ok(existsSync(join(ROOT, new URL(u).pathname.slice(1))), `sitemap entry not a real file: ${u}`);
ok(new Set(smUrls).size === smUrls.length, "sitemap has duplicate URLs");

/* --------------------------------------------------------- netlify.toml */
const toml = readFileSync(join(ROOT, "netlify.toml"), "utf8");
for (const h of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]) {
  ok(toml.includes(h), `netlify.toml missing header: ${h}`);
}
ok(!/unsafe-inline/.test(toml), "netlify.toml: CSP has no unsafe-inline");
ok(toml.includes("404.html"), "netlify.toml wires the custom 404");

/* -------------------------------------------------- search index sanity */
const idx = JSON.parse(readFileSync(join(ROOT, "assets/data/search.json"), "utf8"));
ok(idx.length >= PAGES.length + PRODUCTS.length, "search index covers pages and pieces");
for (const it of idx) {
  let f = join(ROOT, it.u.split("#")[0]);
  if (it.u.endsWith("/")) f = join(f, "index.html");
  ok(existsSync(f), `search.json points nowhere: ${it.u}`);
}

/* ------------------------------------------- unit asserts on shipped core */
{
  const src = readFileSync(join(ROOT, "assets/js/core.js"), "utf8");
  const win = {};
  new Function("window", src)(win);
  const LJ = win.LJ;
  const assert = (cond, msg) => ok(cond, `core.js: ${msg}`);
  assert(LJ.money(245) === "$245", "money formats plain");
  assert(LJ.money(1234) === "$1,234", "money groups thousands");
  assert(LJ.discount(245, 295) === 17, "Aurora 17% off matches the label shipped");
  assert(LJ.discount(425, 495) === 14 && LJ.discount(165, 195) === 15, "pendant/hoop discounts");
  const bag = { "a": { qty: 2 }, "b": { qty: 3 } };
  const priceOf = (k) => (k === "a" ? 245 : 165);
  assert(LJ.bagTotal(bag, priceOf) === 2 * 245 + 3 * 165, "bag total");
  assert(LJ.bagCount(bag) === 5, "bag count");
  assert(LJ.bagCount({}) === 0, "empty bag is zero, not NaN");
  const item = { t: "Nova Huggie Hoops", s: "12 mm diameter hinged", d: "gold" };
  assert(LJ.score(item, ["nova"]) > LJ.score(item, ["gold"]), "title beats body hit");
  assert(LJ.score(item, ["pearl"]) === 0, "no match scores zero");
  assert(LJ.score(item, ["huggie", "diameter"]) > 0, "multi-token works");
  // every discount badge on the built cards equals the computed math
  for (const c of coll.matchAll(/data-price="(\d+)" data-off="(\d+)"/g)) {
    const price = +c[1], off = +c[2];
    const match = PRODUCTS.find((x) => x.price === price);
    ok(match && Math.round(((match.was - price) / match.was) * 100) === off, `collection card off% wrong for $${price}`);
  }
}

/* --------------------------------------- syntax + CSS class coverage ---- */
{
  for (const f of ["theme.js", "core.js", "site.js"]) {
    const s = readFileSync(join(ROOT, "assets/js", f), "utf8");
    let bad = false;
    try { new Function(f === "core.js" ? s.replace("window.LJ", "this.LJ") : s); } catch (e) { bad = true; }
    ok(!bad, `js parses: ${f}`);
  }
  const used = new Set();
  for (const p of pages) for (const m of p.src.matchAll(/class="([^"]+)"/g)) m[1].split(/\s+/).forEach((c) => c && used.add(c));
  const declared = new Set([...css.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]));
  for (const cls of used) {
    // html[hidden]/[open]/dialog states and js toggles style via attribute selectors
    if (["sr-only", "wrap"].includes(cls)) continue;
    ok(declared.has(cls), `class .${cls} used in HTML but missing from CSS`);
  }
}

/* -------------------------------------------------------------- done */
if (fails) {
  console.error(`\n${fails} problem(s).`);
  process.exit(1);
}
console.log(`check passed: ${pages.length} pages, ${idx.length} index entries, core unit asserts, headers, assets, copy rules.`);
