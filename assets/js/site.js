// Lumière site behaviour. Vanilla, deferred, same-origin, ~9KB minified-ish.
// Every control that exists does something real: filters write to the URL, the
// bag persists locally with undo, forms hit Netlify endpoints with states for
// loading/success/error. No dead buttons.
(function () {
  "use strict";

  /* ------------------------------------------------------- config ---- */
  // Analytics ship dark: nothing loads until the visitor consents AND an ID
  // exists. Create a GA4 property, paste the ID here, done. No fake ID, no
  // failed request noise, no tracking before opt-in (see /privacy/).
  var GA4_ID = "";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover:hover) and (pointer:fine)").matches;
  var fmt = window.LJ.money;

  /* ------------------------------------------------------ storage ---- */
  function ls(get, key, val) {
    try {
      if (get) return localStorage.getItem(key);
      if (val === null) return localStorage.removeItem(key);
      localStorage.setItem(key, val);
      return val;
    } catch (e) { return null; }
  }

  /* --------------------------------------------------------- year ---- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ------------------------------------------------- header shadow ---- */
  var hdr = $(".hdr");
  if (hdr) {
    addEventListener("scroll", function () {
      hdr.classList.toggle("is-stuck", scrollY > 4);
    }, { passive: true });
  }

  /* --------------------------------------------------- scroll progress
     CSS scroll-timeline handles the real work where supported; this is the
     5-line fallback for Safari/Firefox without it. */
  var prog = $(".prog");
  if (prog && !CSS.supports("animation-timeline", "scroll()") && !reduced) {
    var raf = 0;
    addEventListener("scroll", function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var max = document.documentElement.scrollHeight - innerHeight;
        prog.style.setProperty("--sp", max > 0 ? (scrollY / max).toFixed(4) : 0);
      });
    }, { passive: true });
  }

  /* ----------------------------------------------------- focus trap ---- */
  function trap(container, e) {
    if (e.key !== "Tab") return;
    var f = $$('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', container)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* -------------------------------------------------- mobile menu ---- */
  var menu = $("#menu"), lastFocus = null;
  function openMenu() {
    if (!menu) return;
    lastFocus = document.activeElement;
    menu.hidden = false;
    document.documentElement.style.overflow = "hidden";
    $('[data-menu-open]').setAttribute("aria-expanded", "true");
    document.addEventListener("keydown", menuKey);
    $(".menu__link", menu).focus();
  }
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    document.documentElement.style.overflow = "";
    $('[data-menu-open]')?.setAttribute("aria-expanded", "false");
    document.removeEventListener("keydown", menuKey);
    lastFocus?.focus?.();
  }
  function menuKey(e) {
    if (e.key === "Escape") { closeMenu(); return; }
    trap($(".menu__panel", menu), e);
  }
  $$("[data-menu-open]").forEach(function (b) { b.addEventListener("click", openMenu); });
  $$("[data-menu-close]").forEach(function (b) { b.addEventListener("click", closeMenu); });

  /* --------------------------------------------------------- toast ---- */
  var toast = $("[data-toast]"), toastMsg = $(".toast__msg", toast), undoBtn = $("[data-toast-undo]");
  var toastTimer = null, undoFn = null;
  function say(msg, undo) {
    if (!toast) return;
    toastMsg.textContent = msg;
    toast.hidden = false;
    undoFn = undo || null;
    undoBtn.hidden = !undoFn;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hush, 5200);
  }
  function hush() { toast.hidden = true; undoFn = null; }
  undoBtn.addEventListener("click", function () { if (undoFn) undoFn(); hush(); });
  $("[data-toast-close]", toast).addEventListener("click", hush);

  /* ---------------------------------------------------- bag (local) ---- */
  var BAGKEY = "lumiere.bag.v1";
  var bag = (function () {
    var data = {};
    try { data = JSON.parse(ls(true, BAGKEY) || "{}") || {}; } catch (e) {}
    function persist() {
      try { localStorage.setItem(BAGKEY, JSON.stringify(data)); } catch (e) {}
      dispatch();
    }
    function dispatch() {
      document.dispatchEvent(new CustomEvent("bag:change", { detail: data }));
      syncCount();
    }
    addEventListener("storage", function (e) {
      if (e.key === BAGKEY) { try { data = JSON.parse(e.newValue || "{}"); } catch (err) {} dispatch(); }
    });
    return {
      all: function () { return data; },
      count: function () { var n = 0; Object.keys(data).forEach(function (k) { n += data[k].qty; }); return n; },
      add: function (slug, size) {
        var item = data[slug] || { qty: 0 };
        item.qty += 1;
        if (size) item.size = size;
        data[slug] = item;
        persist();
      },
      remove: function (slug) { delete data[slug]; persist(); },
      restore: function (snapshot) { data = snapshot || {}; persist(); },
      setQty: function (slug, qty) {
        if (!data[slug]) return;
        if (qty < 1) delete data[slug];
        else data[slug].qty = Math.min(9, qty);
        persist();
      },
      clear: function () { data = {}; persist(); },
    };
  })();

  function syncCount() {
    var n = bag.count();
    $$("[data-cart-count]").forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
    $$(".cartbtn").forEach(function (a) {
      a.setAttribute("aria-label", "Your selection, " + n + (n === 1 ? " piece" : " pieces"));
    });
  }
  syncCount();

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-add]");
    if (!btn) return;
    var slug = btn.getAttribute("data-add");
    var sel = btn.getAttribute("data-add-size");
    var size = sel ? $(sel)?.selectedOptions?.[0]?.textContent?.trim() : "";
    if (sel && !$(sel).value) size = "";
    var name = btn.getAttribute("data-name") || "";
    if (!name) {
      var card = btn.closest(".card");
      name = card && $(".card__name", card) ? $(".card__name", card).textContent : "The piece";
    }
    var snapshot = JSON.stringify(bag.all()); // for the toast's Undo
    bag.add(slug, size);
    say("Added to your bag: " + name + (size && size !== "Fitted at the atelier" ? " · size " + size : ""),
      function () { bag.restore(JSON.parse(snapshot)); });
  });

  /* ------------------------------------------------------ copy code ---- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-copy]");
    if (!btn) return;
    var text = btn.getAttribute("data-copy");
    var done = function () {
      btn.classList.add("is-copied");
      say(btn.getAttribute("data-copy-msg") || "Copied");
      setTimeout(function () { btn.classList.remove("is-copied"); }, 1600);
    };
    if (navigator.clipboard && isSecureContext) {
      navigator.clipboard.writeText(text).then(done);
    } else {
      var t = document.createElement("textarea");
      t.value = text;
      t.setAttribute("readonly", "");
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      try { document.execCommand("copy"); done(); } catch (err) {}
      t.remove();
    }
  });

  /* --------------------------------------------------- print / top ---- */
  $$("[data-print]").forEach(function (b) {
    b.addEventListener("click", function () { window.print(); });
  });
  var topBtn = $("[data-top]");
  if (topBtn) {
    addEventListener("scroll", function () {
      topBtn.hidden = scrollY < innerHeight * 0.8;
    }, { passive: true });
    topBtn.addEventListener("click", function () {
      scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    });
  }

  /* ------------------------------------------------ sticky mobile CTA */
  var mcta = $("[data-mcta]");
  if (mcta) {
    addEventListener("scroll", function () {
      mcta.classList.toggle("is-on", scrollY > innerHeight * 0.55);
    }, { passive: true });
  }

  /* ------------------------------------------------- cookie consent ---- */
  var CONSENT = "lumiere.consent.v1";
  function loadAnalytics() {
    if (ls(true, CONSENT) !== "on" || !GA4_ID) return;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA4_ID, { anonymize_ip: true });
  }
  (function consent() {
    if (ls(true, CONSENT)) { loadAnalytics(); return; }
    var bar = document.createElement("div");
    bar.className = "cookies";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Analytics consent");
    var p = document.createElement("p");
    p.textContent = "This site sets no cookies and tracks nothing by default. We can count page visits anonymously to see what the collection does; that’s off unless you say yes.";
    var acts = document.createElement("div");
    acts.className = "cookies__acts";
    [["No thanks", "off", "btn--ghost"], ["Accept", "on", "btn--pri"]].forEach(function (cfg) {
      var b = document.createElement("button");
      b.className = "btn " + cfg[2] + " btn--sm";
      b.type = "button";
      b.textContent = cfg[0];
      b.addEventListener("click", function () {
        ls(false, CONSENT, cfg[1]);
        bar.remove();
        loadAnalytics();
        say("Preference saved. You can change it anytime by clearing this site’s stored data.");
      });
      acts.appendChild(b);
    });
    bar.appendChild(p);
    bar.appendChild(acts);
    document.body.appendChild(bar);
  })();

  /* -------------------------------------------- UTM capture (19-19) ---- */
  (function utm() {
    var q = new URLSearchParams(location.search);
    var hit = {};
    ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) {
      if (q.get(k)) hit[k] = q.get(k).slice(0, 80);
    });
    var saved = {};
    try { saved = JSON.parse(sessionStorage.getItem("lumiere.utm") || "{}"); } catch (e) {}
    Object.assign(saved, hit);
    try { sessionStorage.setItem("lumiere.utm", JSON.stringify(saved)); } catch (e) {}
    $$("[data-utm]").forEach(function (input) {
      input.value = saved[input.getAttribute("data-utm")] || "";
    });
    var page = $("[data-utm-page]");
    if (page) page.value = location.pathname;
  })();

  /* --------------------------------------------- collection filters ---- */
  var fbar = $("[data-filters]");
  if (fbar) {
    var cards = $$(".grid .card");
    var fcount = $("[data-fcount]");
    var emptyBox = $("[data-empty]");
    var grid = $("#items");

    function params() {
      var q = new URLSearchParams(location.search);
      return {
        filter: q.get("filter") || "all",
        needle: (q.get("q") || "").toLowerCase().trim(),
        sort: q.get("sort") || "curated",
      };
    }
    function apply() {
      var st = params();
      // sync controls
      $$(".chip input", fbar).forEach(function (r) { r.checked = r.value === st.filter || (st.filter === "all" && r.value === "all"); });
      if ($("#find")) $("#find").value = st.needle;
      if ($("#sort")) $("#sort").value = st.sort;
      var shown = 0;
      cards.forEach(function (c) {
        var okCat = st.filter === "all" || c.getAttribute("data-category") === st.filter;
        var okQ = !st.needle || (c.getAttribute("data-name") || "").indexOf(st.needle) > -1;
        var on = okCat && okQ;
        c.classList.toggle("is-hidden", !on);
        if (on) shown++;
      });
      var price = function (c) { return +c.getAttribute("data-price"); };
      var list = cards.slice().sort(function (a, b) {
        if (st.sort === "price-asc") return price(a) - price(b);
        if (st.sort === "price-desc") return price(b) - price(a);
        return +a.getAttribute("data-i") - +b.getAttribute("data-i");
      });
      list.forEach(function (c) { grid.appendChild(c); });
      fcount.textContent = "Showing " + shown + " of " + cards.length + " pieces." + (st.needle ? ' Matching “' + st.needle + '”.' : "");
      emptyBox.hidden = shown > 0;
    }
    if (fcount) fcount.hidden = false;
    fbar.addEventListener("change", function () {
      var fd = new FormData(fbar);
      var q = new URLSearchParams();
      if (fd.get("filter") && fd.get("filter") !== "all") q.set("filter", fd.get("filter"));
      if ((fd.get("q") || "").trim()) q.set("q", fd.get("q").trim());
      if (fd.get("sort") && fd.get("sort") !== "curated") q.set("sort", fd.get("sort"));
      history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
      apply();
    });
    // search-as-you-type, deep-linked (the input only exists when JS is on)
    var find = $("#find");
    if (find) find.addEventListener("input", function () {
      var v = this.value.trim();
      var q = new URLSearchParams(location.search);
      if (v) q.set("q", v); else q.delete("q");
      history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
      apply();
    });
    addEventListener("popstate", apply);
    apply();
  }

  /* ------------------------------------------------ site search page ---- */
  var searchForm = $("[data-search-form]");
  if (searchForm) {
    var input = $("[data-search-input]"),
      out = $("[data-search-results]"),
      status = $("[data-search-status]"),
      empty = $("[data-search-empty]");
    var index = null;
    fetch("/assets/data/search.json")
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (data) { index = data; run((new URLSearchParams(location.search).get("q") || "").trim()); })
      .catch(function () { status.hidden = false; status.textContent = "The index didn’t load. Try reloading, or use the menu."; });

    var score = window.LJ.score;
    function run(q) {
      if (!q) {
        out.innerHTML = "";
        status.hidden = false;
        status.textContent = "Suggestions: pavé, pearl, resizing, Wooster, lifetime.";
        empty.hidden = true;
        return;
      }
      var tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
      var hits = (index || []).map(function (it) { return [score(it, tokens), it]; })
        .filter(function (x) { return x[0] > 0; })
        .sort(function (a, b) { return b[0] - a[0]; })
        .slice(0, 14);
      out.innerHTML = "";
      hits.forEach(function (x) {
        var it = x[1];
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = it.u;
        var k = document.createElement("span"); k.className = "results__k"; k.textContent = it.k;
        var t = document.createElement("span"); t.className = "results__t"; t.textContent = it.t;
        var d = document.createElement("span"); d.className = "results__d"; d.textContent = it.d;
        a.appendChild(k); a.appendChild(t); a.appendChild(d);
        li.appendChild(a); out.appendChild(li);
      });
      status.hidden = false;
      status.textContent = hits.length
        ? hits.length + (hits.length === 1 ? " result" : " results") + " for “" + q + "”."
        : "";
      empty.hidden = hits.length > 0;
    }
    var deb;
    input.addEventListener("input", function () {
      clearTimeout(deb);
      var v = input.value.trim();
      deb = setTimeout(function () {
        var q = new URLSearchParams(location.search);
        if (v) q.set("q", v); else q.delete("q");
        history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
        run(v);
      }, 220);
    });
    // autofocus is a speed win on desktop only; mobile keyboards cause layout jump
    if (!new URLSearchParams(location.search).get("q") && matchMedia("(min-width:641px) and (hover:hover)").matches) {
      input.focus();
    }
  }

  /* ------------------------------------------------------ bag page ---- */
  var bagList = $("[data-bag-list]");
  if (bagList) {
    var pieces = {};
    try { pieces = JSON.parse($("#pieces").textContent); } catch (e) {}
    var bagSection = $("[data-bag]"), bagEmpty = $("[data-bag-empty]");

    function render() {
      var data = bag.all();
      var slugs = Object.keys(data);
      bagSection.hidden = bagEmpty.hidden = false;
      if (!slugs.length) { bagSection.hidden = true; return; }
      bagEmpty.hidden = true;
      bagList.innerHTML = "";
      var total = window.LJ.bagTotal(data, function (k) { return (pieces[k] || {}).price || 0; });
      var count = window.LJ.bagCount(data);
      slugs.forEach(function (slug) {
        var meta = pieces[slug] || { name: slug, price: 0 };
        var row = data[slug];
        var li = document.createElement("li");
        li.className = "bagrow";
        li.innerHTML =
          '<img src="' + (meta.img || "") + '" alt="" width="64" height="84" loading="lazy">' +
          '<span class="bagrow__name"><a href="/product/' + slug + '/">' + esc(meta.name) + "</a>" +
          '<span class="bagrow__sub">' + (row.size ? "Size " + esc(row.size) + " · " : "") + fmt(meta.price) + " each</span></span>" +
          '<span class="qty"><button type="button" data-dec="' + slug + '" aria-label="One less ' + esc(meta.name) + '">−</button>' +
          "<output>" + row.qty + "</output>" +
          '<button type="button" data-inc="' + slug + '" aria-label="One more ' + esc(meta.name) + '">+</button></span>' +
          "<strong>" + fmt(meta.price * row.qty) + "</strong>" +
          '<span class="bagrow__side"><button type="button" class="link-rem" data-rm="' + slug + '">Remove</button></span>';
        bagList.appendChild(li);
      });
      $("[data-bag-total]").textContent = fmt(total);
      $("[data-bag-count]").textContent = count;
      $("[data-bag-plural]").textContent = count === 1 ? "piece" : "pieces";
      $("[data-clear-bag]").hidden = false;
    }
    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
    }
    bagList.addEventListener("click", function (e) {
      var t = e.target;
      var inc = t.closest("[data-inc]"), dec = t.closest("[data-dec]"), rm = t.closest("[data-rm]");
      if (inc) bag.setQty(inc.getAttribute("data-inc"), ((bag.all()[inc.getAttribute("data-inc")] || {}).qty || 0) + 1);
      if (dec) bag.setQty(dec.getAttribute("data-dec"), ((bag.all()[dec.getAttribute("data-dec")] || {}).qty || 1) - 1);
      if (rm) {
        var slug = rm.getAttribute("data-rm"), snap = JSON.stringify(bag.all());
        bag.remove(slug);
        say("Removed from your bag.", function () { bag.restore(JSON.parse(snap)); });
      }
    });
    $("[data-clear-bag]").addEventListener("click", function () {
      var dlg = $("[data-confirm]");
      if (!dlg.showModal) { bag.clear(); return; }
      $("[data-confirm-title]").textContent = "Clear the tray?";
      $("[data-confirm-msg]").textContent = "Your bag list is saved only in this browser. Removing it can’t be undone after this dialog closes.";
      $("[data-confirm-ok]").textContent = "Yes, clear it";
      dlg.returnValue = "";
      dlg.showModal();
      dlg.addEventListener("close", function h() {
        dlg.removeEventListener("close", h);
        if (dlg.returnValue === "ok") { bag.clear(); say("Tray cleared."); }
      });
    });
    document.addEventListener("bag:change", render);
    render();
  }

  /* ------------------------------------------------ contact / forms ---- */
  $$("form[name]").forEach(function (form) {
    if (form.getAttribute("name") === "inquire") enhanceInquiry(form);
    if (form.getAttribute("name") === "newsletter") enhanceNewsletter(form);
  });

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function problemFor(el) {
    var v = el.value.trim();
    switch (el.id) {
      case "name": return v.length < 2 ? "We like a name when we write back." : "";
      case "email": return EMAIL_RE.test(v) ? "" : "That email doesn’t look complete. Check the @ and the part after it.";
      case "phone": return v && !/^[+(][\d\s().-]{6,22}$/.test(v) ? "Digits and spaces, please. Or leave it empty and we’ll email." : "";
      case "message": return v.length < 10 ? "A sentence or two, enough to point a human at the right tray." : "";
      default: return "";
    }
  }

  function fieldErr(input) {
    var slot = $('[data-err="' + input.id + '"]', input.closest(".field,form"));
    if (!slot) return { slot: null };
    if (!slot.id) slot.id = "err-" + input.id;
    input.setAttribute("aria-describedby", slot.id);
    return { slot: slot };
  }
  function mark(input, msg) {
    var f = fieldErr(input);
    if (f.slot) f.slot.textContent = msg || "";
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  function validateInquiry(form) {
    var els = [$("#name", form), $("#email", form), $("#phone", form), $("#message", form)];
    var problems = [];
    els.forEach(function (el) {
      var msg = problemFor(el);
      mark(el, msg);
      if (msg) problems.push([el, msg]);
    });
    return problems;
  }
  function post(form, body) {
    // Netlify accepts submissions at the page's own URL; that's the honest endpoint.
    return fetch(location.pathname, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body,
    });
  }
  function serialize(form) {
    var fd = new FormData(form);
    var out = new URLSearchParams();
    fd.forEach(function (v, k) { out.set(k, String(v).trim().slice(0, 4000)); });
    return out;
  }

  function enhanceInquiry(form) {
    var q = new URLSearchParams(location.search);
    var topicMap = { viewing: "A private viewing", repair: "Care & repairs", delivery: "Delivery", reserve: "A piece", general: "A piece", gift: "A gift" };
    var want = q.get("topic");
    if (want && topicMap[want]) {
      var r = $$('input[name="topic"]', form).find(function (x) { return x.value === topicMap[want]; });
      if (r) r.checked = true;
    }
    var piece = q.get("piece");
    if (piece) {
      $("[data-piece-field]", form).value = piece.slice(0, 160);
      var note = $("[data-piece-note]", form);
      note.hidden = false;
      note.textContent = "This inquiry arrives tagged: " + piece.slice(0, 160) + ". The piece is on hold while we read.";
    }
    if (q.get("from") === "bag") {
      var data = bag.all();
      var slugs = Object.keys(data);
      if (slugs.length) {
        var piecesMeta = {};
        try { piecesMeta = JSON.parse($("#pieces").textContent); } catch (e) {}
        $("[data-bag-field]", form).value = slugs
          .map(function (s) { return s + " x" + data[s].qty + (data[s].size ? " size " + data[s].size : ""); })
          .join(", ").slice(0, 4000);
        var list = $("[data-bag-note]", form);
        list.hidden = false;
        list.textContent = "";
        slugs.forEach(function (s) {
          var li = document.createElement("li");
          li.textContent = (piecesMeta[s] ? piecesMeta[s].name : s) + " · " + data[s].qty + " · " + fmt((piecesMeta[s] ? piecesMeta[s].price : 0) * data[s].qty);
          list.appendChild(li);
        });
        var lead = document.createElement("li");
        lead.textContent = "Your saved list came along:";
        list.insertBefore(lead, list.firstChild);
      }
    }

    var message = $("#message", form);
    var counter = $("[data-counter]", form);
    var updateCounter = function () {
      if (counter) counter.textContent = (4000 - message.value.length).toLocaleString("en-US") + " characters left; a paragraph is plenty.";
    };
    message.addEventListener("input", updateCounter);
    updateCounter();

    // live-validate once a field has been touched; never pre-disable submit
    ["#name", "#email", "#phone", "#message"].forEach(function (sel) {
      var el = $(sel, form);
      el.addEventListener("blur", function () { if (el.value) mark(el, problemFor(el)); });
      el.addEventListener("input", function () { if (el.getAttribute("aria-invalid") === "true") mark(el, problemFor(el)); });
    });

    var dirty = false;
    form.addEventListener("input", function once() {
      form.removeEventListener("input", once);
      dirty = true;
      addEventListener("beforeunload", guard);
    });
    function guard(e) { e.preventDefault(); }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var statusEl = $("[data-form-status]", form);
      if ($('[name="_gotcha"]', form).value) { statusEl.textContent = "Sent."; return; } // honeypot
      var problems = validateInquiry(form);
      if (problems.length) {
        statusEl.className = "form__status is-err";
        statusEl.textContent = problems.length + (problems.length === 1 ? " field needs" : " fields need") + " a look. We’ve marked them below.";
        problems[0][0].focus();
        return;
      }
      var btn = $("[data-submit]", form);
      var btnLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Sending…";
      statusEl.className = "form__status";
      statusEl.textContent = "";
      post(form, serialize(form)).then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        removeEventListener("beforeunload", guard);
        dirty = false;
        location.href = form.getAttribute("action") || "/thanks/";
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = btnLabel;
        statusEl.className = "form__status is-err";
        statusEl.textContent = "That didn’t reach the bench. Nothing was lost: your text is still here, so try again, or call (212) 555-0143.";
      });
    });
  }

  function enhanceNewsletter(form) {
    var email = $("#nl-email", form);
    var ok = $("[data-inline-ok]", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      mark(email, "");
      if (!EMAIL_RE.test(email.value.trim())) {
        mark(email, "Add a full email address (with the @) and we’ll send the invitations there.");
        email.focus();
        return;
      }
      var btn = $("button[type=submit]", form);
      var label = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Sending…";
      post(form, serialize(form)).then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        removeEventListener("beforeunload", guardNewsletter);
        $$(".field", form).forEach(function (f) { f.hidden = true; });
        ok.hidden = false;
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = label;
        mark(email, "Something blocked it. Try again, or write to hello@lumierejewels.com.");
      });
    });
    function guardNewsletter(e) { e.preventDefault(); }
    form.addEventListener("input", function once() {
      form.removeEventListener("input", once);
      addEventListener("beforeunload", guardNewsletter);
    });
  }

  /* ------------------------------------------------- anchored details
     A link to /care/#faq should open the answer it points into. */
  if (location.hash) {
    var target = $(location.hash);
    var det = target && target.tagName === "DETAILS" ? target : target && target.closest("details");
    if (det) det.open = true;
  }

  /* ------------------------------------------------- lookbook peek ---- */
  var peek = $("[data-look]") || $(".look");
  if (peek && fine && !reduced && innerWidth >= 900) {
    var box = document.createElement("div");
    box.className = "peek";
    var im = document.createElement("img");
    im.alt = "";
    box.appendChild(im);
    document.body.appendChild(box);
    var tx = 0, ty = 0, cx = 0, cy = 0, on = false, loop = null;
    function tick() {
      cx += (tx - cx) * 0.16;
      cy += (ty - cy) * 0.16;
      box.style.transform = "translate(" + cx + "px," + cy + "px)";
      loop = on || Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5 ? requestAnimationFrame(tick) : null;
    }
    peek.addEventListener("pointermove", function (e) {
      tx = e.clientX + 140;
      ty = e.clientY;
      if (tx > innerWidth - 130) tx = e.clientX - 140;
      if (!loop) loop = requestAnimationFrame(tick);
    });
    peek.addEventListener("pointerover", function (e) {
      var row = e.target.closest("[data-peek]");
      if (!row) return;
      im.src = row.getAttribute("data-peek-src");
      im.alt = row.getAttribute("data-peek-alt") || "";
      on = true;
      box.classList.add("is-on");
      if (!loop) loop = requestAnimationFrame(tick);
    });
    peek.addEventListener("pointerout", function (e) {
      if (e.relatedTarget && e.relatedTarget.closest("[data-peek]")) return;
      on = false;
      box.classList.remove("is-on");
    });
  }

  /* ------------------------------------------------ product page size
     Keep the Add-to-bag label honest when a size is picked. */
  var pieceSel = $("#size");
  if (pieceSel) {
    pieceSel.addEventListener("change", function () {
      var btn = $("[data-add]");
      if (!btn) return;
      var base = "Add to bag";
      btn.textContent = pieceSel.value ? base + " · size " + pieceSel.options[pieceSel.selectedIndex].textContent : base;
    });
  }
})();
