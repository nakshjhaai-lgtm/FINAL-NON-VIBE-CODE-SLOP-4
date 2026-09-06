// Build step: composes shared header/footer/head into static pages and writes
// the fully-formed HTML to the repo root (the Netlify publish dir). Output is
// committed, so deploying needs no build.
//
// Why a build at all: 15 pages x nav/head is exactly where vibe-coded sites
// drift out of sync. One template, one source of truth.
//
// Usage: node tools/build.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, PAGES, PRODUCTS, CATEGORIES, NAV } from "../site/data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "site/pages");

const esc = (s) =>
  String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const catLabel = (id) => CATEGORIES.find((c) => c.id === id).label;

/* ------------------------------------------------------------------ icons */
const ICON = {
  mark: `<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"><path d="M15 6h18l9 9v18l-9 9H15l-9-9V15z"/><path d="M19 19h10v10H19z"/></g></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M6 7h12l1 14H5L6 7z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 13.3A8.5 8.5 0 0 1 10.7 3.5a8.5 8.5 0 1 0 9.8 9.8z"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3.5 8h17M3.5 16h17"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  arr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 12.5 5 5 10-11"/></svg>`,
  up: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>`,
};

/* ------------------------------------------------------------------- head */
function head(p) {
  const og = `${SITE.url}/assets/img/og.png`;
  const canonical = `${SITE.url}${p.url}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${canonical}">
${p.noindex ? '<meta name="robots" content="noindex, follow">\n' : ""}<meta name="theme-color" content="#F6F3EE">
<meta name="color-scheme" content="light dark">
<meta name="author" content="Lumière Jewels, New York">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lumière Jewels">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Lumière. Light lingers. Hand-finished at our SoHo bench.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.title)}">
<meta name="twitter:description" content="${esc(p.desc)}">
<meta name="twitter:image" content="${og}">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/img/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="manifest" href="/assets/site.webmanifest">
<link rel="preload" href="/assets/css/site.css" as="style">
<link rel="stylesheet" href="/assets/css/site.css">
<link rel="preload" href="/assets/fonts/fraunces-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/karla-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preconnect" href="https://ik.imagekit.io">
<script src="/assets/js/theme.js"></script>
<script src="/assets/js/core.js" defer></script>
<script src="/assets/js/site.js" defer></script>
</head>
<body>`;
}

/* ----------------------------------------------------------------- header */
function header(active) {
  const links = NAV.map(
    (n) =>
      `        <a class="nav__link${n.nav === active ? " is-current" : ""}" href="${n.href}"${n.nav === active ? ' aria-current="page"' : ""}>${n.label}</a>`
  ).join("\n");
  return `  <a class="skip" href="#main">Skip to content</a>

  <header class="hdr" id="hdr">
    <div class="hdr__inner wrap">
      <a class="brand" href="/" aria-label="Lumière Jewels, home">
        <span class="brand__mark">${ICON.mark}</span>
        <span class="brand__name">Lumière</span>
      </a>
      <nav class="nav" aria-label="Main">
${links}
      </nav>
      <div class="hdr__actions">
        <a class="iconbtn" href="/search/" aria-label="Search the site">${ICON.search}</a>
        <button class="iconbtn" type="button" data-theme-toggle aria-label="Switch to the dark appearance">
          <span class="iconbtn__sun">${ICON.sun}</span><span class="iconbtn__moon">${ICON.moon}</span>
        </button>
        <a class="iconbtn cartbtn" href="/bag/" aria-label="Your selection, 0 pieces">
          ${ICON.bag}<span class="cartbtn__count" data-cart-count hidden>0</span>
        </a>
        <a class="btn btn--pri btn--sm hdr__cta" href="/contact/">Inquire</a>
        <button class="iconbtn menubtn" type="button" data-menu-open aria-expanded="false" aria-controls="menu" aria-label="Open menu">${ICON.menu}</button>
      </div>
    </div>
  </header>

  <div class="menu" id="menu" hidden>
    <div class="menu__scrim" data-menu-close></div>
    <nav class="menu__panel" role="dialog" aria-modal="true" aria-label="Site menu">
      <div class="menu__top">
        <span class="brand" aria-hidden="true"><span class="brand__mark">${ICON.mark}</span><span class="brand__name">Lumière</span></span>
        <button class="iconbtn" type="button" data-menu-close aria-label="Close menu">${ICON.close}</button>
      </div>
      <div class="menu__links">
        <a class="menu__link" href="/collection/">The Collection</a>
        <a class="menu__link" href="/craft/">Craft</a>
        <a class="menu__link" href="/care/">Care &amp; Service</a>
        <a class="menu__link" href="/atelier/">The Atelier</a>
        <a class="menu__link" href="/bag/">Your selection</a>
        <a class="menu__link" href="/search/">Search</a>
      </div>
      <div class="menu__foot">
        <a class="btn btn--pri btn--wide" href="/contact/">Inquire</a>
        <a class="btn btn--ghost btn--wide" href="tel:${SITE.phone}">Call ${SITE.phoneDisplay}</a>
      </div>
    </nav>
  </div>`;
}

/* ----------------------------------------------------------------- footer */
function footer() {
  return `
  <footer class="ftr">
    <div class="wrap">
      <div class="ftr__grid">
        <div class="ftr__brand">
          <span class="brand" aria-hidden="true"><span class="brand__mark brand__mark--lg">${ICON.mark}</span><span class="brand__name brand__name--lg">Lumière</span></span>
          <p class="ftr__tag">Fine jewelry, hand-finished on Wooster Street. Priced in the open.</p>
          <p class="ftr__line">
            <a href="tel:${SITE.phone}">${SITE.phoneDisplay}</a>
            <span aria-hidden="true">·</span>
            <a href="mailto:${SITE.email}">${SITE.email}</a>
          </p>
        </div>
        <nav class="ftr__col" aria-label="Collection">
          <p class="ftr__h">Collection</h3>
          <a href="/collection/">All pieces</a>
${CATEGORIES.map((c) => `          <a href="/collection/?filter=${c.id}">${c.label}</a>`).join("\n")}
          <a href="/bag/">Your selection</a>
        </nav>
        <nav class="ftr__col" aria-label="The house">
          <p class="ftr__h">The house</h3>
          <a href="/craft/">Craft &amp; materials</a>
          <a href="/atelier/">Visit the atelier</a>
          <a href="/#inner-circle">The Inner Circle</a>
          <a href="/search/">Search</a>
        </nav>
        <nav class="ftr__col" aria-label="Service">
          <p class="ftr__h">Service</h3>
          <a href="/care/">Care guide</a>
          <a href="/care/#faq">Frequently asked</a>
          <a href="/contact/?topic=repair">Repairs &amp; re-plating</a>
          <a href="/contact/">Write to the bench</a>
        </nav>
        <nav class="ftr__col" aria-label="Legal">
          <p class="ftr__h">Fine print</h3>
          <a href="/privacy/">Privacy</a>
          <a href="/terms/">Terms</a>
          <a href="/sitemap.xml">Sitemap</a>
        </nav>
      </div>
      <div class="ftr__base">
        <p>© <span data-year>2026</span> ${SITE.name}. Handcrafted in New York.</p>
        <p class="ftr__meta">Set in Fraunces &amp; Karla. Updated <time datetime="${SITE.updated}">6 Sep 2026</time>.</p>
      </div>
    </div>
  </footer>

  <button class="topbtn" type="button" data-top hidden>${ICON.up}<span>Top</span></button>

  <div class="toast" data-toast hidden>
    <span class="toast__mark" aria-hidden="true">${ICON.check}</span>
    <span class="toast__msg" role="status" aria-live="polite"></span>
    <button class="toast__act" type="button" data-toast-undo hidden>Undo</button>
    <button class="toast__x" type="button" data-toast-close aria-label="Dismiss notification">${ICON.close}</button>
  </div>

  <dialog class="confirm" data-confirm>
    <form method="dialog" class="confirm__box">
      <h2 class="confirm__title" data-confirm-title>Are you sure?</h2>
      <p class="confirm__msg" data-confirm-msg>This can’t be undone.</p>
      <div class="confirm__acts">
        <button class="btn btn--ghost" value="cancel">Keep it</button>
        <button class="btn btn--pri" value="ok" data-confirm-ok>Yes, remove</button>
      </div>
    </form>
  </dialog>`;
}

/* ---------------------------------------------------------------- widgets */
const crumbsHTML = (crumbs) => `      <nav class="crumbs" aria-label="Breadcrumb">
        <ol class="crumbs__list">
          <li><a href="/">Home</a></li>
${crumbs
  .map(
    (c, i) =>
      `          <li>${i === crumbs.length - 1 ? `<span aria-current="page">${esc(c.name)}</span>` : `<a href="${c.url}">${esc(c.name)}</a>`}</li>`
  )
  .join("\n")}
        </ol>
      </nav>`;

const priceHTML = (p) => {
  const off = Math.round(((p.was - p.price) / p.was) * 100);
  return `<p class="price"><span class="price__now">$${p.price}</span> <s class="price__was">$${p.was}</s> <span class="price__off">${off}% off</span></p>`;
};
// (card sort uses data-price below, so the rendered math is never re-parsed)

const cardHTML = (p, i) => `
        <article class="card" data-i="${i}" data-category="${p.category}" data-price="${p.price}" data-off="${Math.round(((p.was - p.price) / p.was) * 100)}" data-name="${esc(p.name.toLowerCase())} ${esc(p.material.toLowerCase())}">
          <a class="card__fig" href="/product/${p.slug}/" tabindex="-1" aria-hidden="true">
            <img src="${p.img}" alt="" width="${p.w}" height="${p.h}" loading="lazy" decoding="async">
            ${p.badge ? `<span class="card__badge">${esc(p.badge)}</span>` : ""}
          </a>
          <div class="card__body">
            <p class="card__meta"><span class="kicker">${catLabel(p.category)}</span><span class="card__no">No.&nbsp;${String(i + 1).padStart(2, "0")}</span></p>
            <h2 class="card__name"><a href="/product/${p.slug}/">${esc(p.name)}</a></h2>
            <p class="card__mat">${esc(p.material)}</p>
            ${priceHTML(p)}
            <div class="card__acts">
              <button class="btn btn--pri btn--sm" type="button" data-add="${p.slug}" data-name="${esc(p.name)}">Add to bag</button>
              <a class="quiet" href="/product/${p.slug}/">View piece</a>
            </div>
          </div>
        </article>`;

const lookRow = (p, i) => `
          <li>
            <a class="look__row" href="/product/${p.slug}/" data-peek data-peek-src="${p.img}" data-peek-alt="${esc(p.alt)}">
              <span class="look__no">No.&nbsp;${String(i + 1).padStart(2, "0")}</span>
              <span class="look__name">${esc(p.name)}</span>
              <span class="look__mat">${esc(p.material)}</span>
              <span class="look__price">$${p.price} <s>$${p.was}</s></span>
              <span class="look__go">${ICON.arr}</span>
            </a>
          </li>`;

/* ----------------------------------------------------------- product page */
function productBody(p, idx) {
  const prev = PRODUCTS[(idx - 1 + PRODUCTS.length) % PRODUCTS.length];
  const next = PRODUCTS[(idx + 1) % PRODUCTS.length];
  const sizeSel = p.sizes
    ? `
        <div class="sizerow">
          <label class="field__label" for="size">Ring size <span class="field__opt">(optional)</span></label>
          <span class="select"><select id="size" name="size">
            <option value="">Fitted at the atelier</option>
${p.sizes.map((s) => `            <option>${s}</option>`).join("\n")}
          </select></span>
        </div>`
    : "";
  return `${crumbsHTML([{ name: "Collection", url: "/collection/" }, { name: p.name, url: `/product/${p.slug}/` }])}

    <div class="piece">
      <figure class="piece__fig">
        <img src="${p.img}" alt="${esc(p.alt)}" width="${p.w}" height="${p.h}" fetchpriority="high" decoding="async">
      </figure>

      <div class="piece__info">
        <p class="kicker kicker--rule">${catLabel(p.category)}</p>
        <h1>${esc(p.name)}</h1>
        ${priceHTML(p)}
        <p class="piece__mat">${esc(p.material)}</p>
        <p class="lead">${esc(p.desc)}</p>
${sizeSel}
        <div class="cta-row">
          <button class="btn btn--pri" type="button" data-add="${p.slug}" data-name="${esc(p.name)}" data-add-size="${p.sizes ? "#size" : ""}">Add to bag</button>
          <a class="btn btn--ghost" href="/contact/?topic=reserve&amp;piece=${encodeURIComponent(p.name)}">Reserve at atelier</a>
        </div>
        <p class="fineprint">A reservation wraps the piece and holds it at 143 Wooster. ${esc(SITE.promo.note)}</p>

        <h2 class="h-rule">The details</h2>
        <ul class="specs">
${p.specs.map((s) => `          <li>${esc(s)}</li>`).join("\n")}
          <li>Resizing at the bench for ${p.sizes ? "sizes 4 to 10" : "any fit you need"}</li>
          <li>Weekly wipe with the cloth in your linen box keeps the finish bright</li>
        </ul>

        <h2 class="h-rule">Delivery &amp; care</h2>
        <ul class="assure">
          <li>
            <h3>Same-day pickup</h3>
            <p>Order by 2pm, collect from SoHo by 6pm, Tuesday to Saturday.</p>
          </li>
          <li>
            <h3>Signature packaging</h3>
            <p>Linen box with a polishing cloth, ready to gift.</p>
          </li>
          <li>
            <h3>Lifetime care</h3>
            <p>Unlimited cleaning, re-plating and minor repairs, on us.</p>
          </li>
        </ul>
      </div>
    </div>

    <nav class="pager" aria-label="More pieces">
      <a href="/product/${prev.slug}/"><span>Previous</span><strong>${esc(prev.name)}</strong></a>
      <a href="/product/${next.slug}/"><span>Next</span><strong>${esc(next.name)}</strong></a>
    </nav>`;
}

/* --------------------------------------------------------------- schemas */
function schemasFor(p) {
  const out = [];
  if (p.jsonld?.length) out.push(...p.jsonld);
  if (p.schema?.includes("local") || p.url === "/") {
    out.push({
      "@context": "https://schema.org",
      "@type": "Jeweler",
      name: "Lumière Jewels",
      url: `${SITE.url}/atelier/`,
      description: "Hand-finished fine jewelry atelier in SoHo, New York.",
      telephone: SITE.phone,
      email: SITE.email,
      priceRange: "$$",
      currenciesAccepted: "USD",
      paymentAccepted: "Card, cash at the atelier. Invoices for reservations.",
      address: {
        "@type": "PostalAddress",
        streetAddress: "143 Wooster Street",
        addressLocality: "New York",
        addressRegion: "NY",
        postalCode: "10012",
        addressCountry: "US",
      },
      geo: { "@type": "GeoCoordinates", latitude: 40.72339, longitude: -74.00279 },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          opens: "11:00",
          closes: "19:00",
        },
      ],
      image: `${SITE.url}/assets/img/og.png`,
    });
  }
  if (p.url === "/") {
    out.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Lumière Jewels",
      url: SITE.url,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/search/?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    });
  }
  if (p.crumb?.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE.url}/` },
        ...p.crumb.map((c, i) => ({
          "@type": "ListItem",
          position: i + 2,
          name: c.name,
          item: `${SITE.url}${c.url}`,
        })),
      ],
    });
  }
  if (p.schema?.includes("items")) {
    out.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "The Collection",
      numberOfItems: PRODUCTS.length,
      itemListElement: PRODUCTS.map((x, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE.url}/product/${x.slug}/`,
        name: x.name,
      })),
    });
  }
  if (p.schema?.includes("faq")) {
    const faq = [
      [
        "How should I care for my Lumière piece?",
        "Wipe it with the polishing cloth from your linen box once a week, keep it away from perfume, lotion and pool water, and store it dry in the box. That routine keeps vermeil and rhodium plating bright for years.",
      ],
      [
        "What does the lifetime promise cover?",
        "Unlimited cleaning, re-plating and minor repairs, on us, for as long as you own the piece. Bring it to the atelier on Wooster Street or write to us and we will arrange the rest.",
      ],
      [
        "Where do your stones and metals come from?",
        "We work exclusively with recycled 14k gold and conflict-free, ethically sourced diamonds, with full supply chain transparency. Our sterling silver is rhodium-plated for lasting brilliance.",
      ],
      [
        "Can I try pieces before buying?",
        "Yes. Our SoHo studio doubles as a private showroom. Try pieces in natural light, watch the bench work, and a stylist will walk you through the collection Tuesday to Saturday, 11am to 7pm, or Sunday by appointment.",
      ],
      [
        "Do you offer engraving?",
        "Custom engraving is available on signet faces and other flat surfaces, cut by hand at the bench. Ask at pickup or mention it in an inquiry and we will quote it for the piece.",
      ],
    ];
    out.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(([name, text]) => ({
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      })),
    });
  }
  return out;
}

/* ------------------------------------------------------------ page render */
function renderPage(p) {
  const json = schemasFor(p);
  const schemaBlock = json.length
    ? `\n  <script type="application/ld+json">\n${JSON.stringify(json.length === 1 ? json[0] : json).replace(/</g, "\\u003c")}\n  </script>\n`
    : "\n";
  const longform = p.longform ? `\n  <div class="prog" role="presentation" aria-hidden="true"></div>` : "";
  const mcta = p.mcta
    ? `\n  <div class="mcta" data-mcta>\n    ${p.mcta}\n  </div>`
    : "";
  return `${head(p)}
${header(p.nav)}${longform}
  <main id="main" class="main" tabindex="-1">
${p.body}
  </main>
${mcta}
${footer()}
${schemaBlock}</body>
</html>
`;
}

/* --------------------------------------------------------------------- go */
const writes = new Map();
const put = (file, html) => writes.set(file, html.replace(/\n{3,}/g, "\n\n"));

// Home: inject lookbook rows + promo line
{
  let body = readFileSync(join(SRC, "home.html"), "utf8");
  body = body.replace("{{LOOK}}", PRODUCTS.map(lookRow).join("\n"));
  put(
    "index.html",
    renderPage({
      ...PAGES[0],
      body,
      mcta: `
    <a class="btn btn--pri" href="/collection/">Browse the six</a>
    <a class="btn btn--ghost" href="tel:+12125550143">Call</a>`,
    })
  );
}

// Static pages: site/pages/<dir|name>.html; data placeholders get filled from data.mjs
const BAGDATA = JSON.stringify(
  Object.fromEntries(
    PRODUCTS.map((p) => [p.slug, { name: p.name, price: p.price, img: p.img }])
  )
);
for (const p of PAGES.slice(1)) {
  const name = p.file.split("/")[0];
  let body = readFileSync(join(SRC, `${name}.html`), "utf8");
  body = body
    .replaceAll("{{CARDS}}", () => PRODUCTS.map(cardHTML).join("\n"))
    .replaceAll("{{BAGDATA}}", () => BAGDATA);
  put(p.file, renderPage({ ...p, body }));
}

// Product pages from the same data (title/meta/canonical included)
PRODUCTS.forEach((p, i) => {
  const url = `/product/${p.slug}/`;
  put(
    `product/${p.slug}/index.html`,
    renderPage({
      url,
      nav: "collection",
      title: `${p.name}. $${p.price} | Lumière Jewels`,
      desc: `${p.name}: ${p.material}. $${p.price}, was $${p.was}. ${p.specs[0]}. Try it at the SoHo atelier.`,
      crumb: [{ name: "Collection", url: "/collection/" }, { name: p.name, url }],
      body: productBody(p, i),
      schema: [],
      mcta: `
    <button class="btn btn--pri" type="button" data-add="${p.slug}" data-name="${esc(p.name)}" data-add-size="${p.sizes ? "#size" : ""}">Add to bag · $${p.price}</button>
    <a class="btn btn--ghost" href="/contact/?topic=reserve&amp;piece=${encodeURIComponent(p.name)}">Reserve</a>`,
      jsonld: [
        {
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          description: p.desc,
          image: p.img,
          sku: p.slug.toUpperCase(),
          category: catLabel(p.category),
          material: p.material,
          brand: { "@type": "Brand", name: "Lumière Jewels" },
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: String(p.price),
            url: `${SITE.url}${url}`,
          },
        },
      ],
    })
  );
});

// 404
{
  const body = readFileSync(join(SRC, "404.html"), "utf8");
  put(
    "404.html",
    renderPage({
      url: "/404.html",
      nav: "none",
      title: "Page not found | Lumière Jewels",
      desc: "That page isn’t in the ledger. Search the site or start from the collection.",
      noindex: true,
      body,
      schema: [],
    })
  );
}

// Search index
const searchIndex = [
  ...PAGES.filter((p) => !p.noindex).map((p) => ({
    t: p.title.split(" | ")[0],
    d: p.desc,
    u: p.url,
    k: "page",
    s: `${p.title} ${p.desc}`,
  })),
  ...PRODUCTS.map((p) => ({
    t: p.name,
    d: `${p.materialShort}. $${p.price}`,
    u: `/product/${p.slug}/`,
    k: "piece",
    s: `${p.name} ${p.material} ${p.specs.join(" ")} ${catLabel(p.category)} ${p.desc}`,
  })),
  { t: "Lifetime promise", d: "Cleaning, re-plating, minor repairs, on us.", u: "/care/#promise", k: "page", s: "lifetime promise repairs cleaning replating guarantee" },
  { t: "Atelier hours & directions", d: "143 Wooster Street, Tuesday to Saturday.", u: "/atelier/#visit", k: "page", s: "hours directions map opening times appointment" },
  { t: "Holiday code LUMIERE15", d: "15% off during the holiday run.", u: "/#holiday", k: "page", s: "holiday sale promo code discount lumiere15" },
];
put("assets/data/search.json", JSON.stringify(searchIndex) + "\n");

// Sitemap / robots / llms.txt
put(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...PAGES.filter((p) => !p.noindex), ...PRODUCTS.map((p) => ({ url: `/product/${p.slug}/` }))]
  .map((p) => `  <url><loc>${SITE.url}${p.url}</loc><lastmod>${SITE.updated}</lastmod></url>`)
  .join("\n")}
</urlset>
`
);

put("robots.txt", `# Lumière Jewels\nUser-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

put(
  "llms.txt",
  `# Lumière Jewels

> Hand-finished fine jewelry from the SoHo atelier at 143 Wooster Street, New York.
> Recycled 14k gold, ethically sourced diamonds, rhodium-plated sterling silver.
> Lifetime care (cleaning, re-plating, minor repairs) included with every piece.

Prices in USD. Holiday pricing: code LUMIERE15 gives 15% off.
Contact: ${SITE.email}, ${SITE.phoneDisplay}. Reply within 1 business day.

## Collection

${PRODUCTS.map((p) => `- [${p.name}](${SITE.url}/product/${p.slug}/): $${p.price} (was $${p.was}). ${p.material}. ${p.desc}`).join("\n")}

## Pages

- [The Collection](${SITE.url}/collection/): all six pieces, filterable
- [Craft & materials](${SITE.url}/craft/): process ledger and materials
- [Care & Service](${SITE.url}/care/): care guide, lifetime promise, FAQ
- [Atelier](${SITE.url}/atelier/): hours, directions, what a visit looks like
- [Inquire](${SITE.url}/contact/): forms go straight to the bench
- [Privacy](${SITE.url}/privacy/) · [Terms](${SITE.url}/terms/)
`
);

for (const [file, html] of writes) {
  const out = join(ROOT, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html.endsWith("\n") ? html : html + "\n");
}
console.log(`built ${writes.size} files`);
