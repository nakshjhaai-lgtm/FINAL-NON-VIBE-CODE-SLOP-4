// Single source of truth for the Lumière catalog and site structure.
// Prices, specs and copy come from the original Index.html data set; nothing invented.

export const SITE = {
  name: "Lumière Jewels",
  short: "Lumière",
  // Swap to the connected domain at deploy; sitemap and llms.txt build from
  // this. Canonical/OG in <head> are host-relative so preview and production
  // both point at the host that is actually serving the page.
  url: "https://lumierejewels.com",
  email: "hello@lumierejewels.com",
  phone: "+12125550143",
  phoneDisplay: "(212) 555-0143",
  address: "143 Wooster Street, New York, NY 10012",
  hours: "Tuesday to Saturday, 11am to 7pm. Sunday by appointment.",
  updated: "2026-09-06",
  promo: { code: "LUMIERE15", note: "Holiday pricing. 15% off with code LUMIERE15." },
  // The published promises, kept here so page copy, product schema and the
  // shipping page can never drift apart (competitor-parity set, cash model).
  policies: {
    freeShipOver: 150,
    flatShip: 8,
    shipWindow: "2 to 4 business days",
    returnDays: 30,
    resizeFreeYears: 1,
  },
};

const IMG = {
  aurora: "https://ik.imagekit.io/juxjcwmvp/generated-image-1.webp",
  etoile: "https://ik.imagekit.io/juxjcwmvp/generated-image-1%20(2).webp?updatedAt=1773167035424",
  nova: "https://ik.imagekit.io/juxjcwmvp/generated-image-1%20(3).webp.jpg?updatedAt=1773167035308",
  celestine: "https://ik.imagekit.io/juxjcwmvp/generated-image-1%20(1).webp?updatedAt=1773167035328",
  // These two used to reuse other pieces' photos (a chain shown as a pendant
  // sells nothing). Now their own studio shots, served from our own origin.
  lumina: "/assets/img/products/lumina-rope-chain.jpg",
  twilight: "/assets/img/products/twilight-drop-earrings.jpg",
};

export const CATEGORIES = [
  { id: "rings", label: "Rings" },
  { id: "necklaces", label: "Necklaces" },
  { id: "earrings", label: "Earrings" },
];

export const PRODUCTS = [
  {
    slug: "aurora-pave-band",
    name: "Aurora Pavé Band",
    category: "rings",
    badge: "Holiday sale",
    price: 245,
    was: 295,
    material: "14k gold vermeil · cubic zirconia",
    materialShort: "14k Gold Vermeil · CZ",
    desc: "A whisper-thin band encircled with micro-pavé stones. Each of the 42 hand-set cubic zirconia catches light from every angle.",
    specs: ["42 hand-set stones", "2 mm comfort-fit band", "14k gold over sterling silver", "Sizes 4 to 10 available"],
    sizes: [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10],
    img: IMG.aurora, w: 768, h: 1024,
    alt: "Aurora Pavé Band in 14k gold vermeil",
  },
  {
    slug: "etoile-diamond-pendant",
    name: "Étoile Diamond Pendant",
    category: "necklaces",
    badge: "Best seller",
    price: 425,
    was: 495,
    material: "14k solid gold · 0.15 ct diamond",
    materialShort: "14k Solid Gold · Diamond",
    desc: "A single brilliant-cut diamond suspended from our signature fine chain. The bezel setting creates that coveted floating effect.",
    specs: ["0.15 ct VS clarity diamond", "Solid 14k gold", "Adjustable 16 to 18 inch chain", "Certificate included"],
    img: IMG.etoile, w: 768, h: 1024,
    alt: "Étoile Diamond Pendant in solid gold",
  },
  {
    slug: "nova-huggie-hoops",
    name: "Nova Huggie Hoops",
    category: "earrings",
    price: 165,
    was: 195,
    material: "14k gold vermeil · pavé detail",
    materialShort: "14k Gold Vermeil",
    desc: "Modern huggies that sit close to the ear with a subtle line of pavé stones along the outer edge.",
    specs: ["12 mm diameter", "Hinged click-closure", "14k gold over sterling silver", "Sold as a pair"],
    img: IMG.nova, w: 896, h: 1152,
    alt: "Nova Huggie Hoops in gold vermeil",
  },
  {
    slug: "celestine-signet",
    name: "Celestine Signet",
    category: "rings",
    badge: "New",
    price: 185,
    was: 225,
    material: "Sterling silver · hand-polished",
    materialShort: "Sterling Silver",
    desc: "A modern take on the classic signet with softened edges, a gently domed face, and a mirror polish that catches light like water.",
    specs: ["10 × 8 mm face", "Mirror polish finish", "Rhodium-plated", "Custom engraving available"],
    img: IMG.celestine, w: 768, h: 1024,
    alt: "Celestine Signet in sterling silver",
  },
  {
    slug: "lumina-rope-chain",
    name: "Lumina Rope Chain",
    category: "necklaces",
    price: 145,
    was: 175,
    material: "Sterling silver · Italian-made",
    materialShort: "Sterling Silver · Italian",
    desc: "A timeless rope chain with unexpected weight and drape. Made by fourth-generation silversmiths in Arezzo, Italy.",
    specs: ["2 mm rope chain", "18 inches with extender", "Rhodium-plated", "Italian craftsmanship"],
    img: IMG.lumina, w: 768, h: 1024,
    alt: "Lumina Rope Chain in sterling silver",
  },
  {
    slug: "twilight-drop-earrings",
    name: "Twilight Drop Earrings",
    category: "earrings",
    badge: "Holiday sale",
    price: 225,
    was: 265,
    material: "Sterling silver · freshwater pearl",
    materialShort: "Silver · Pearl",
    desc: "A sculptural ear wire flows into a single teardrop pearl. Movement without weight.",
    specs: ["8 to 9 mm baroque pearls", "Hand-formed silver wire", "38 mm total drop", "Sold as a pair"],
    img: IMG.twilight, w: 768, h: 1024,
    alt: "Twilight Drop Earrings with freshwater pearls",
  },
];

export const NAV = [
  { href: "/collection/", label: "Collection", nav: "collection" },
  { href: "/craft/", label: "Craft", nav: "craft" },
  { href: "/care/", label: "Care & Service", nav: "care" },
  { href: "/atelier/", label: "Atelier", nav: "atelier" },
];

export const PAGES = [
  {
    file: "index.html", url: "/", nav: "home",
    title: "Lumière Jewels. Fine jewelry, hand-finished in New York",
    desc: "Hand-finished fine jewelry from our SoHo atelier. Recycled 14k gold, ethically sourced stones, lifetime care. Try pieces at 143 Wooster Street.",
    schema: ["org", "local"],
  },
  {
    file: "collection/index.html", url: "/collection/", nav: "collection",
    crumb: [{ name: "Collection", url: "/collection/" }],
    title: "The Collection. Six pieces, no more | Lumière Jewels",
    desc: "Rings, necklaces and earrings from the SoHo bench. Vermeil, solid gold and hand-polished silver, each priced in the open. 6 pieces, that's the whole collection.",
    schema: ["crumbs", "items"],
  },
  {
    file: "craft/index.html", url: "/craft/", nav: "craft",
    crumb: [{ name: "Craft", url: "/craft/" }],
    title: "Craft. From sketch to velvet | Lumière Jewels",
    desc: "How a Lumière piece is made: hand sketches, recycled 14k gold, hand-set stones and a mirror polish. Materials ledger included.",
    schema: ["crumbs"], longform: true,
  },
  {
    file: "care/index.html", url: "/care/", nav: "care",
    crumb: [{ name: "Care & Service", url: "/care/" }],
    title: "Care & Service. Cleaning, lifetime promise, FAQ | Lumière Jewels",
    desc: "Keep your piece bright: simple weekly care, what the lifetime promise covers, engraving, resizing and five questions we get at the counter.",
    schema: ["crumbs", "faq"], longform: true,
  },
  {
    file: "shipping/index.html", url: "/shipping/", nav: "care",
    crumb: [{ name: "Shipping & Returns", url: "/shipping/" }],
    title: "Shipping, Returns & Resizing | Lumière Jewels",
    desc: "Free insured US shipping over $150, 30-day returns, first resize on us. Same-day pickup at the SoHo atelier and gift wrapping with every order.",
    schema: ["crumbs"],
  },
  {
    file: "atelier/index.html", url: "/atelier/", nav: "atelier",
    crumb: [{ name: "Atelier", url: "/atelier/" }],
    title: "The Atelier. 143 Wooster Street, SoHo | Lumière Jewels",
    desc: "Our SoHo studio doubles as a private showroom. Tuesday to Saturday, 11am to 7pm, Sunday by appointment. Map, directions and what a visit looks like.",
    schema: ["crumbs", "local"],
  },
  {
    file: "contact/index.html", url: "/contact/", nav: "contact",
    crumb: [{ name: "Inquire", url: "/contact/" }],
    title: "Inquire. We reply within 1 business day | Lumière Jewels",
    desc: "Ask about a piece, book a private viewing or talk repairs. A person at the atelier reads every message and replies within 1 business day.",
    schema: ["crumbs"],
  },
  {
    file: "thanks/index.html", url: "/thanks/", nav: "contact",
    crumb: [{ name: "Thank you", url: "/thanks/" }],
    title: "Thank you. Your message is with the atelier | Lumière Jewels",
    desc: "Your inquiry reached the SoHo atelier. Expect a reply from a person, not a robot, within 1 business day.",
    schema: ["crumbs"], noindex: true,
  },
  {
    file: "bag/index.html", url: "/bag/", nav: "bag",
    crumb: [{ name: "Bag", url: "/bag/" }],
    title: "Your selection | Lumière Jewels",
    desc: "Pieces you saved in this browser. Send the list to the atelier and a stylist picks it up from there.",
    schema: ["crumbs"], noindex: true,
  },
  {
    file: "search/index.html", url: "/search/", nav: "search",
    crumb: [{ name: "Search", url: "/search/" }],
    title: "Search the ledger | Lumière Jewels",
    desc: "Find a piece, a care answer or the workshop hours. Search across everything on lumierejewels.com.",
    schema: ["crumbs"], noindex: true,
  },
  {
    file: "privacy/index.html", url: "/privacy/", nav: "legal",
    crumb: [{ name: "Privacy", url: "/privacy/" }],
    title: "Privacy Policy | Lumière Jewels",
    desc: "What we collect when you write to us, what we don't, and how to have it removed. Plain language, no tracking without consent.",
    schema: ["crumbs"],
  },
  {
    file: "terms/index.html", url: "/terms/", nav: "legal",
    crumb: [{ name: "Terms", url: "/terms/" }],
    title: "Terms of Use | Lumière Jewels",
    desc: "The short version: browse freely, prices in USD, pieces held by reservation, questions to the atelier.",
    schema: ["crumbs"],
  },
];
