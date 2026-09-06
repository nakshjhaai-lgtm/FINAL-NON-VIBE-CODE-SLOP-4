// Runs before paint (blocking, ~1KB, same-origin) so the chosen appearance
// never flashes. Deferred scripts are too late for this; CSP blocks an inline
// copy, so the external sync script is the lazy-but-correct answer.
(function () {
  var doc = document.documentElement;
  var KEY = "lumiere.theme.v1";
  var stored = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch (e) {}
  function system() {
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function apply(t) {
    doc.setAttribute("data-theme", t);
    var meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#141210" : "#F6F3EE");
  }
  doc.classList.add("js");
  apply(stored === "dark" || stored === "light" ? stored : system());
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
    if (stored !== "light" && stored !== "dark") apply(e.matches ? "dark" : "light");
  });
  // Toggle is wired by delegation: this file runs before the button exists.
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-theme-toggle]");
    if (!btn) return;
    var next = doc.getAttribute("data-theme") === "dark" ? "light" : "dark";
    apply(next);
    stored = next;
    try {
      localStorage.setItem(KEY, next);
    } catch (err) {}
    btn.setAttribute(
      "aria-label",
      next === "dark" ? "Switch to the light appearance" : "Switch to the dark appearance"
    );
  });
  // Keep every toggle's label honest on load too.
  document.addEventListener("DOMContentLoaded", function () {
    var t = doc.getAttribute("data-theme");
    var btn = document.querySelector("[data-theme-toggle]");
    if (btn) btn.setAttribute("aria-label", t === "dark" ? "Switch to the light appearance" : "Switch to the dark appearance");
  });
})();
