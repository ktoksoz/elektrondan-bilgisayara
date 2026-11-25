/* AC devre hesabı: karmaşık sayılar, eleman empedansları, seri/paralel bağlantılar.
   Fazörler tepe genliğiyle tutulur ve sinüs referanslıdır: V = A∠θ  ⇔  v(t) = A · sin(ωt + θ)
   (çözücüdeki "sin" dalgasıyla aynı kural; anlık değer = Im(V · e^{jωt})).
   Tarayıcıda klasik <script> ile window.AC, Node'da require() ile yüklenir. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AC = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const cx = (re, im = 0) => ({ re, im });
  const add = (a, b) => cx(a.re + b.re, a.im + b.im);
  const sub = (a, b) => cx(a.re - b.re, a.im - b.im);
  const mul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const scale = (a, k) => cx(a.re * k, a.im * k);
  const conj = (a) => cx(a.re, -a.im);
  const abs = (a) => Math.hypot(a.re, a.im);
  const arg = (a) => Math.atan2(a.im, a.re);
  const polar = (r, th) => cx(r * Math.cos(th), r * Math.sin(th));
  const INF = cx(Infinity, 0);
  const isInf = (a) => !isFinite(a.re) || !isFinite(a.im);
  function div(a, b) {
    if (isInf(b)) return cx(0, 0);
    const d = b.re * b.re + b.im * b.im;
    if (d === 0) return INF;
    return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
  }
  const inv = (a) => div(cx(1, 0), a);
  const sum = (arr) => arr.reduce(add, cx(0, 0));
  // seri: empedanslar toplanır; paralel: admitanslar (1/Z) toplanır
  function ser(...zs) { return zs.some(isInf) ? INF : sum(zs); }
  function par(...zs) {
    if (zs.some((z) => abs(z) === 0)) return cx(0, 0);
    const y = sum(zs.map(inv));
    return abs(y) < 1e-300 ? INF : inv(y);
  }

  /* eleman empedansları (ω = 2πf) */
  const zR = (R) => cx(R, 0);
  const zL = (L, w) => cx(0, w * L);
  const zC = (C, w) => cx(0, -1 / (w * C));
  const reactL = (L, f) => 2 * Math.PI * f * L;
  const reactC = (C, f) => 1 / (2 * Math.PI * f * C);
  const f0 = (L, C) => 1 / (2 * Math.PI * Math.sqrt(L * C));

  /* Bağlantı biçimleri. use: hangi elemanlar devrede (yalnızca seri ve paralelde seçilebilir).
     Sonuç: toplam Z, kaynak akımı I, her elemanın V/I/Z fazörü, gerilim ve akım zincirleri
     (fazör diyagramında uç uca eklenen oklar) ve güçler (tepe fazörlerinden: S = ½ · V · I*). */
  const TOPOS = ["seri", "paralel", "r-lc", "rl-c"];
  function analyze(topo, o) {
    const { A, f, R, L, C } = o;
    const use = o.use || { R: true, L: true, C: true };
    const w = 2 * Math.PI * f;
    const V = cx(A, 0);
    const Z = { R: zR(R), L: zL(L, w), C: zC(C, w) };
    const parts = {};
    let Ztot, I, chainV, chainI;
    const on = ["R", "L", "C"].filter((k) => (topo === "seri" || topo === "paralel" ? use[k] : true));
    if (topo === "seri") {
      Ztot = ser(...on.map((k) => Z[k]));
      I = div(V, Ztot);
      on.forEach((k) => (parts[k] = { Z: Z[k], I, V: mul(I, Z[k]) }));
      chainV = on.map((k) => ({ k, v: parts[k].V }));
      chainI = [{ k: "I", v: I }];
    } else if (topo === "paralel") {
      Ztot = par(...on.map((k) => Z[k]));
      on.forEach((k) => (parts[k] = { Z: Z[k], V, I: div(V, Z[k]) }));
      I = sum(on.map((k) => parts[k].I));
      chainV = [{ k: "V", v: V }];
      chainI = on.map((k) => ({ k, v: parts[k].I }));
    } else if (topo === "r-lc") {
      const Zp = par(Z.L, Z.C);
      Ztot = ser(Z.R, Zp);
      I = div(V, Ztot);
      const Vp = isInf(Zp) ? V : mul(I, Zp);
      parts.R = { Z: Z.R, I, V: mul(I, Z.R) };
      parts.L = { Z: Z.L, V: Vp, I: div(Vp, Z.L) };
      parts.C = { Z: Z.C, V: Vp, I: div(Vp, Z.C) };
      chainV = [{ k: "R", v: parts.R.V }, { k: "LC", v: Vp }];
      chainI = [{ k: "L", v: parts.L.I }, { k: "C", v: parts.C.I }];
    } else if (topo === "rl-c") {
      const Z1 = ser(Z.R, Z.L);
      Ztot = par(Z1, Z.C);
      const I1 = div(V, Z1);
      parts.R = { Z: Z.R, I: I1, V: mul(I1, Z.R) };
      parts.L = { Z: Z.L, I: I1, V: mul(I1, Z.L) };
      parts.C = { Z: Z.C, V, I: div(V, Z.C) };
      I = add(I1, parts.C.I);
      chainV = [{ k: "R", v: parts.R.V }, { k: "L", v: parts.L.V }];
      chainI = [{ k: "RL", v: I1 }, { k: "C", v: parts.C.I }];
    } else throw new Error("bilinmeyen bağlantı: " + topo);
    const S = scale(mul(V, conj(I)), 0.5);
    return {
      topo, on, w, V, I, Z: Ztot, parts, chainV, chainI,
      P: S.re, Q: S.im, S: abs(S), pf: abs(S) ? S.re / abs(S) : 1,
      phi: isInf(Ztot) ? 0 : arg(Ztot),
    };
  }

  /* Belli bir frekanstaki toplam empedans (tarama eğrileri için) */
  function zAt(topo, o, f) { return analyze(topo, { ...o, f }).Z; }

  /* Aynı devrenin çözücü (Circuit) bileşen listesi. Kaynak "in" ile toprak arasında.
     Kondansatör gerilimi ve bobin akımı t = 0'daki kalıcı rejim değerleriyle başlatılır:
     böylece benzetim geçici rejim yaşamadan doğrudan kalıcı rejimde başlar. */
  function netlist(topo, o, an) {
    an = an || analyze(topo, o);
    const v0 = an.parts.C ? an.parts.C.V.im : 0, i0 = an.parts.L ? an.parts.L.I.im : 0;
    const el = {
      R: (a, b) => ({ type: "R", id: "R", n: [a, b], R: o.R }),
      L: (a, b) => ({ type: "L", id: "L", n: [a, b], L: o.L, i0 }),
      C: (a, b) => ({ type: "C", id: "C", n: [a, b], C: o.C, v0 }),
    };
    const out = [{ type: "V", id: "V", n: ["in", "0"], wave: { type: "sin", amp: o.A, freq: o.f } }];
    if (topo === "seri") {
      const on = an.on;
      on.forEach((k, i) => out.push(el[k](i ? "n" + i : "in", i === on.length - 1 ? "0" : "n" + (i + 1))));
    } else if (topo === "paralel") an.on.forEach((k) => out.push(el[k]("in", "0")));
    else if (topo === "r-lc") out.push(el.R("in", "m"), el.L("m", "0"), el.C("m", "0"));
    else if (topo === "rl-c") out.push(el.R("in", "m"), el.L("m", "0"), el.C("in", "0"));
    return out;
  }

  /* Tek frekanslı DFT: tam periyotlar boyunca örneklenmiş iki sinyalden (gerilim, akım) fazör.
     Örnekler eşit aralıklı olmalı; sonuç sinüs referanslı tepe fazörüdür. */
  function phasorOf(ts, xs, f) {
    const w = 2 * Math.PI * f;
    let s = 0, c = 0;
    for (let k = 0; k < xs.length; k++) { s += xs[k] * Math.sin(w * ts[k]); c += xs[k] * Math.cos(w * ts[k]); }
    const n = xs.length;
    // x = a·sin + b·cos  →  fazör (sinüs referanslı) = a + j·b
    return cx((2 * s) / n, (2 * c) / n);
  }

  /* Türkçe gösterim yardımcıları */
  const deg = (r) => (r * 180) / Math.PI;

  return {
    cx, add, sub, mul, div, inv, scale, conj, abs, arg, polar, sum, ser, par, isInf, INF,
    zR, zL, zC, reactL, reactC, f0, TOPOS, analyze, zAt, netlist, phasorOf, deg,
  };
});
