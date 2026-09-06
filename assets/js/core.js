// Pure math the site runs on and tools/check.mjs asserts against. DOM-free by design.
window.LJ = {
  money: function (n) { return "$" + Number(n).toLocaleString("en-US"); },
  discount: function (price, was) { return Math.round(((was - price) / was) * 100); },
  bagTotal: function (entries, priceOf) {
    var t = 0;
    Object.keys(entries).forEach(function (k) { t += priceOf(k) * (entries[k].qty || 0); });
    return t;
  },
  bagCount: function (entries) {
    var n = 0;
    Object.keys(entries).forEach(function (k) { n += entries[k].qty || 0; });
    return n;
  },
  // title hits weigh more than body hits; every token must hit something.
  score: function (item, tokens) {
    var hay = (item.t + " " + (item.s || "") + " " + (item.d || "")).toLowerCase();
    var title = item.t.toLowerCase();
    var s = 0;
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i];
      if (title.indexOf(tk) === 0) s += 6;
      else if (title.indexOf(tk) > -1) s += 4;
      if (hay.indexOf(tk) > -1) s += 2;
    }
    return s;
  },
};
