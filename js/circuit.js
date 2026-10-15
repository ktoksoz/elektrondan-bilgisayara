/* Analog devre çözücü
   Modified Nodal Analysis (MNA): bilinmeyenler düğüm gerilimleri + gerilim kaynaklarının
   (ve bobin, opamp çıkışı gibi dalların) akımları. Doğrusal olmayan bileşenler
   (diyot, BJT, MOSFET, gerçekçi opamp) Newton–Raphson ile çözülür; diyot eklemlerinde
   SPICE tarzı adım sınırlama (pnjlim) kullanılır. Geçici rejim: yamuk ya da geri Euler.

   Akım yönü: her bileşenin terminal akımı "dışarıdan bileşene giren" akımdır.
   İki uçlu bileşende i(id) = a ucundan girip bileşenden geçerek b ucundan çıkan akım.
   Tarayıcıda klasik <script> ile window.Circuit, Node'da require() ile yüklenir. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Circuit = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const VT = 0.025852; // ısıl gerilim, 300 K
  const GMIN = 1e-12;
  const GROUND = new Set(["0", "gnd", "GND", "toprak"]);

  /* taşmayan üstel: büyük argümanda doğrusal devam */
  const EXPMAX = 80;
  function explim(x) {
    if (x > EXPMAX) { const e = Math.exp(EXPMAX); return [e * (1 + x - EXPMAX), e]; }
    const e = Math.exp(x); return [e, e];
  }
  /* SPICE pnjlim: eklem geriliminin bir iterasyonda fazla sıçramasını engeller */
  function pnjlim(vnew, vold, vt, vcrit) {
    if (vnew > vcrit && Math.abs(vnew - vold) > 2 * vt) {
      if (vold > 0) {
        const arg = 1 + (vnew - vold) / vt;
        vnew = arg > 0 ? vold + vt * Math.log(arg) : vcrit;
      } else vnew = vt * Math.log(vnew / vt);
      return [vnew, true];
    }
    return [vnew, false];
  }

  /* ---- dalga biçimleri ---- */
  function waveAt(w, t, dflt) {
    if (w == null) return dflt;
    if (typeof w === "number") return w;
    if (typeof w === "function") return w(t);
    const off = w.offset || 0;
    switch (w.type) {
      case "sin": return off + w.amp * Math.sin(2 * Math.PI * w.freq * t + (w.phase || 0));
      case "square": {
        const ph = ((t * w.freq) % 1 + 1) % 1;
        return ph < (w.duty == null ? 0.5 : w.duty) ? w.high : w.low;
      }
      case "tri": {
        const ph = ((t * w.freq) % 1 + 1) % 1;
        return off + w.amp * (ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph);
      }
      case "step": return t >= (w.at || 0) ? w.high : w.low;
      default: return dflt;
    }
  }

  /* ---- yoğun doğrusal çözücü: kısmi pivotlu Gauss eliminasyonu ---- */
  function solveLinear(A, b, n) {
    for (let c = 0; c < n; c++) {
      let p = c, mx = Math.abs(A[c * n + c]);
      for (let r = c + 1; r < n; r++) { const v = Math.abs(A[r * n + c]); if (v > mx) { mx = v; p = r; } }
      if (mx < 1e-300) return false;
      if (p !== c) {
        for (let k = c; k < n; k++) { const t = A[c * n + k]; A[c * n + k] = A[p * n + k]; A[p * n + k] = t; }
        const t = b[c]; b[c] = b[p]; b[p] = t;
      }
      const d = A[c * n + c];
      for (let r = c + 1; r < n; r++) {
        const f = A[r * n + c] / d;
        if (f === 0) continue;
        for (let k = c; k < n; k++) A[r * n + k] -= f * A[c * n + k];
        b[r] -= f * b[c];
      }
    }
    for (let r = n - 1; r >= 0; r--) {
      let s = b[r];
      for (let k = r + 1; k < n; k++) s -= A[r * n + k] * b[k];
      b[r] = s / A[r * n + r];
    }
    return true;
  }

  /* ======================== bileşen modelleri ======================== */
  // Her model: init(ctx) → iç düğüm/dal ayır; stamp(s) → matrise yaz;
  // currents(x) → dış terminal akımları; accept(x) → zaman adımı kabul edildi.

  const MODELS = {};

  MODELS.R = {
    terms: 2,
    stamp(e, s) { s.G(e.t[0], e.t[1], 1 / Math.max(e.p.R, 1e-9)); },
    currents(e, s) { const i = (s.V(e.t[0]) - s.V(e.t[1])) / Math.max(e.p.R, 1e-9); return [i, -i]; },
  };
  // anahtar: kapalıyken küçük, açıkken çok büyük direnç
  MODELS.S = {
    terms: 2,
    R(e) { return e.p.closed ? (e.p.ron ?? 1e-3) : (e.p.roff ?? 1e12); },
    stamp(e, s) { s.G(e.t[0], e.t[1], 1 / this.R(e)); },
    currents(e, s) { const i = (s.V(e.t[0]) - s.V(e.t[1])) / this.R(e); return [i, -i]; },
  };
  // potansiyometre: a–w–b; pos = 0 (a ucu) … 1 (b ucu)
  MODELS.POT = {
    terms: 3,
    parts(e) {
      const pos = Math.min(1, Math.max(0, e.p.pos ?? 0.5));
      return [Math.max(e.p.R * pos, 1e-3), Math.max(e.p.R * (1 - pos), 1e-3)];
    },
    stamp(e, s) { const [r1, r2] = this.parts(e); s.G(e.t[0], e.t[1], 1 / r1); s.G(e.t[1], e.t[2], 1 / r2); },
    currents(e, s) {
      const [r1, r2] = this.parts(e);
      const i1 = (s.V(e.t[0]) - s.V(e.t[1])) / r1, i2 = (s.V(e.t[1]) - s.V(e.t[2])) / r2;
      return [i1, i2 - i1, -i2];
    },
  };
  // bağımsız gerilim kaynağı: t[0] artı, t[1] eksi. Dal akımı artı uçtan kaynağa giren akım.
  MODELS.V = {
    terms: 2,
    init(e, c) { e.k = c.branch(); if (e.p.R) e.ni = c.node(); },
    value(e, s) { return waveAt(e.p.wave, s.t, e.p.V || 0) * s.srcScale; },
    stamp(e, s) {
      // isteğe bağlı iç direnç: artı uç —R— iç düğüm —kaynak— eksi uç
      const plus = e.p.R ? e.ni : e.t[0];
      if (e.p.R) s.G(e.t[0], e.ni, 1 / e.p.R);
      s.B(plus, e.k, 1); s.B(e.t[1], e.k, -1);
      s.Brow(e.k, plus, 1); s.Brow(e.k, e.t[1], -1);
      s.rhsB(e.k, this.value(e, s));
    },
    currents(e, s) { const i = s.x[e.k]; return [i, -i]; },
  };
  // bağımsız akım kaynağı: akım kaynağın içinden t[0] → t[1] yönünde akar
  MODELS.I = {
    terms: 2,
    stamp(e, s) { const I = waveAt(e.p.wave, s.t, e.p.I || 0) * s.srcScale; s.J(e.t[0], -I); s.J(e.t[1], I); },
    currents(e, s) { const I = waveAt(e.p.wave, s.t, e.p.I || 0) * s.srcScale; return [I, -I]; },
  };
  // kondansatör: DC'de açık devre; geçici rejimde yamuk/geri Euler eşdeğeri
  MODELS.C = {
    terms: 2,
    init(e) { e.st = { v: e.p.v0 || 0, i: 0 }; },
    coef(e, s) {
      if (!s.h) return null;
      const trap = s.method === "trap" && !s.firstStep;
      const geq = (trap ? 2 : 1) * e.p.C / s.h;
      const ieq = geq * e.st.v + (trap ? e.st.i : 0);
      return [geq, ieq];
    },
    stamp(e, s) {
      const c = this.coef(e, s);
      if (!c) { s.G(e.t[0], e.t[1], GMIN); return; }
      s.G(e.t[0], e.t[1], c[0]); s.J(e.t[0], c[1]); s.J(e.t[1], -c[1]);
    },
    currents(e, s) {
      if (s.accepted) return [e.st.i, -e.st.i]; // adım kabul edildi: o adımın akımı
      const v = s.V(e.t[0]) - s.V(e.t[1]);
      const c = this.coef(e, s);
      const i = c ? c[0] * v - c[1] : v * GMIN;
      return [i, -i];
    },
    accept(e, s) { const i = this.currents(e, s)[0]; e.st.v = s.V(e.t[0]) - s.V(e.t[1]); e.st.i = i; },
    reset(e, s) { e.st.v = s.V(e.t[0]) - s.V(e.t[1]); e.st.i = 0; },
  };
  // bobin: dal akımı bilinmeyen; DC'de kısa devre
  MODELS.L = {
    terms: 2,
    init(e, c) { e.k = c.branch(); e.st = { v: 0, i: e.p.i0 || 0 }; },
    stamp(e, s) {
      s.B(e.t[0], e.k, 1); s.B(e.t[1], e.k, -1);
      s.Brow(e.k, e.t[0], 1); s.Brow(e.k, e.t[1], -1);
      if (!s.h) { s.Bdiag(e.k, -(e.p.Rs || 0)); return; }
      const trap = s.method === "trap" && !s.firstStep;
      const req = (trap ? 2 : 1) * e.p.L / s.h + (e.p.Rs || 0);
      s.Bdiag(e.k, -req);
      s.rhsB(e.k, -((trap ? 2 : 1) * e.p.L / s.h) * e.st.i - (trap ? e.st.v - (e.p.Rs || 0) * e.st.i : 0));
    },
    currents(e, s) { const i = s.x[e.k]; return [i, -i]; },
    accept(e, s) { e.st.i = s.x[e.k]; e.st.v = s.V(e.t[0]) - s.V(e.t[1]); },
    reset(e, s) { e.st.i = s.x[e.k]; e.st.v = 0; },
  };

  /* diyot: Shockley + isteğe bağlı seri direnç (Rs) ve ters kırılma (Zener, Bv) */
  function diodeIV(p, v) {
    const nvt = (p.N || 1) * VT;
    const [ex, dex] = explim(v / nvt);
    let I = p.Is * (ex - 1), G = (p.Is * dex) / nvt;
    if (p.Bv) {
      const nb = (p.Nbv || 1) * VT, ibv = p.Ibv || 1e-3;
      const [eb, deb] = explim(-(v + p.Bv) / nb);
      I -= ibv * eb; G += (ibv * deb) / nb;
    }
    return [I + GMIN * v, G + GMIN];
  }
  MODELS.D = {
    terms: 2,
    init(e, c) {
      if (e.p.Rs) e.ni = c.node();
      const nvt = (e.p.N || 1) * VT;
      e.vcrit = nvt * Math.log(nvt / (Math.SQRT2 * e.p.Is));
      e.vd = 0; // son iterasyondaki (sınırlanmış) eklem gerilimi
    },
    anode(e) { return e.p.Rs ? e.ni : e.t[0]; },
    stamp(e, s) {
      const a = this.anode(e), k = e.t[1];
      if (e.p.Rs) s.G(e.t[0], e.ni, 1 / e.p.Rs);
      let v = s.V(a) - s.V(k), lim = false;
      const nvt = (e.p.N || 1) * VT;
      [v, lim] = pnjlim(v, e.vd, nvt, e.vcrit);
      if (e.p.Bv && !lim) {
        // kırılma bölgesi için ayna sınırlama
        const nb = (e.p.Nbv || 1) * VT, u = -v - e.p.Bv, uold = -e.vd - e.p.Bv;
        const [u2, l2] = pnjlim(u, uold, nb, nb * Math.log(nb / (Math.SQRT2 * (e.p.Ibv || 1e-3))));
        if (l2) { v = -u2 - e.p.Bv; lim = true; }
      }
      if (lim) s.limited = true;
      e.vd = v;
      const [I, G] = diodeIV(e.p, v);
      s.G(a, k, G);
      const ieq = I - G * v;
      s.J(a, -ieq); s.J(k, ieq);
    },
    current(e, s) { const v = s.V(this.anode(e)) - s.V(e.t[1]); return diodeIV(e.p, v)[0]; },
    currents(e, s) { const i = this.current(e, s); return [i, -i]; },
  };

  /* genel doğrusal olmayan yazım: terminal akımları I[k] ve Jacobian J[k][j] */
  function stampNL(s, terms, I, J) {
    const n = terms.length;
    for (let k = 0; k < n; k++) {
      let ieq = I[k];
      for (let j = 0; j < n; j++) {
        s.Gij(terms[k], terms[j], J[k][j]);
        ieq -= J[k][j] * s.V(terms[j]);
      }
      s.J(terms[k], -ieq);
    }
  }

  /* BJT — basitleştirilmiş Ebers–Moll (taşıma modeli). t = [c, b, e]; pol +1 NPN, −1 PNP.
     Rc: kollektör seri direnci (doyum gerilimini gerçekçi kılar). */
  function bjtEval(p, vbe, vbc) {
    const pol = p.pol || 1, Is = p.Is || 1e-14, bf = p.bf || 100, br = p.br || 1;
    const [ef, def] = explim(vbe / VT), [er, der] = explim(vbc / VT);
    const If = Is * (ef - 1) + GMIN * vbe, Ir = Is * (er - 1) + GMIN * vbc;
    const gf = (Is * def) / VT + GMIN, gr = (Is * der) / VT + GMIN;
    const Ic = If - Ir * (1 + 1 / br), Ib = If / bf + Ir / br;
    return { pol, Ic, Ib, dIc_dbe: gf, dIc_dbc: -gr * (1 + 1 / br), dIb_dbe: gf / bf, dIb_dbc: gr / br };
  }
  MODELS.Q = {
    terms: 3,
    init(e, c) {
      if (e.p.Rc) e.ni = c.node();
      const Is = e.p.Is || 1e-14;
      e.vcrit = VT * Math.log(VT / (Math.SQRT2 * Is));
      e.vbe = 0; e.vbc = 0;
    },
    nodes(e) { return [e.p.Rc ? e.ni : e.t[0], e.t[1], e.t[2]]; },
    stamp(e, s) {
      if (e.p.Rc) s.G(e.t[0], e.ni, 1 / e.p.Rc);
      const [c, b, em] = this.nodes(e), pol = e.p.pol || 1;
      let vbe = pol * (s.V(b) - s.V(em)), vbc = pol * (s.V(b) - s.V(c)), l1, l2;
      [vbe, l1] = pnjlim(vbe, e.vbe, VT, e.vcrit);
      [vbc, l2] = pnjlim(vbc, e.vbc, VT, e.vcrit);
      if (l1 || l2) s.limited = true;
      e.vbe = vbe; e.vbc = vbc;
      const m = bjtEval(e.p, vbe, vbc);
      // terminal akımları (pol ile çarpılır); Jacobian'da pol² = 1
      const Ic = pol * m.Ic, Ib = pol * m.Ib;
      const dc = [-m.dIc_dbc, m.dIc_dbe + m.dIc_dbc, -m.dIc_dbe]; // d/dVc, d/dVb, d/dVe
      const db = [-m.dIb_dbc, m.dIb_dbe + m.dIb_dbc, -m.dIb_dbe];
      const de = dc.map((v, i) => -(v + db[i]));
      // doğrusallaştırma noktası sınırlanmış gerilimlerdir; sağ tarafı ona göre kur
      const Vn = [s.V(c), s.V(b), s.V(em)];
      const vbeR = pol * (Vn[1] - Vn[2]), vbcR = pol * (Vn[1] - Vn[0]);
      // sınırlanmış ve gerçek gerilim farkını akımlara yansıt
      const adj = (dbe, dbc) => pol * (dbe * (vbe - vbeR) + dbc * (vbc - vbcR));
      const I = [Ic - adj(m.dIc_dbe, m.dIc_dbc), Ib - adj(m.dIb_dbe, m.dIb_dbc), 0];
      I[2] = -(I[0] + I[1]);
      stampNL(s, [c, b, em], I, [dc, db, de]);
    },
    currents(e, s) {
      const [c, b, em] = this.nodes(e), pol = e.p.pol || 1;
      const m = bjtEval(e.p, pol * (s.V(b) - s.V(em)), pol * (s.V(b) - s.V(c)));
      const Ic = pol * m.Ic, Ib = pol * m.Ib;
      // dış kollektör akımı Rc'den geçen akımdır (iç düğüme bağlı eklem kapasitesinin akımı dahil)
      const IcExt = e.p.Rc ? (s.V(e.t[0]) - s.V(c)) / e.p.Rc : Ic;
      return [IcExt, Ib, -(Ic + Ib)];
    },
    info(e, s) {
      const [c, b, em] = this.nodes(e), pol = e.p.pol || 1;
      const vbe = pol * (s.V(b) - s.V(em)), vce = pol * (s.V(e.t[0]) - s.V(em));
      const [Ic, Ib] = this.currents(e, s).map((v) => v * pol);
      let region = "aktif";
      if (vbe < 0.5 && Math.abs(Ic) < 1e-6) region = "kesim";
      else if (Ib > 0 && Ic < 0.9 * (e.p.bf || 100) * Ib) region = "doyum";
      return { vbe, vce, Ic, Ib, region };
    },
  };

  /* MOSFET — kare yasası. t = [d, g, s]; pol +1 N kanal, −1 P kanal.
     Kesim, doğrusal (triyot) ve doyum bölgeleri; eşik altında yumuşak geçiş için softplus. */
  function mosEval(p, vgs, vds) {
    const Vt = p.Vt ?? 2, K = p.K ?? 0.5, lam = p.lambda ?? 0.01, nvt = 1.5 * VT;
    const z = (vgs - Vt) / nvt;
    const vov = z > 30 ? vgs - Vt : nvt * Math.log1p(Math.exp(z));
    const dvov = z > 30 ? 1 : 1 / (1 + Math.exp(-z));
    const cl = 1 + lam * vds;
    let I, gm, gds;
    if (vds < vov) {
      const f = vov * vds - (vds * vds) / 2;
      I = K * f * cl; gm = K * vds * cl * dvov; gds = K * (vov - vds) * cl + K * f * lam;
    } else {
      I = (K / 2) * vov * vov * cl; gm = K * vov * cl * dvov; gds = (K / 2) * vov * vov * lam;
    }
    return { I, gm, gds, vov };
  }
  MODELS.M = {
    terms: 3,
    init(e) { e.vgs = 0; e.vds = 0; },
    // akaç akımını ve türevlerini hesapla (ters kutupta d ile s yer değiştirir)
    evalAt(e, Vd, Vg, Vs) {
      const pol = e.p.pol || 1;
      let vds = pol * (Vd - Vs), swap = false;
      if (vds < 0) swap = true;
      const vgs = swap ? pol * (Vg - Vd) : pol * (Vg - Vs);
      const m = mosEval(e.p, vgs, Math.abs(vds));
      // Id: d ucuna giren akım
      if (!swap) return { Id: pol * m.I, dd: m.gds, dg: m.gm, ds: -m.gm - m.gds, m, vgs, vds };
      return { Id: -pol * m.I, dd: m.gm + m.gds, dg: -m.gm, ds: -m.gds, m, vgs, vds };
    },
    stamp(e, s) {
      const [d, g, so] = e.t;
      let Vd = s.V(d), Vg = s.V(g), Vs = s.V(so);
      // basit FET sınırlaması: kapı geriliminin bir adımda 1 V'tan fazla değişmesine izin verme
      const pol = e.p.pol || 1;
      let vgs = pol * (Vg - Vs);
      if (Math.abs(vgs - e.vgs) > 1) { vgs = e.vgs + Math.sign(vgs - e.vgs); s.limited = true; Vg = Vs + pol * vgs; }
      e.vgs = vgs;
      const r = this.evalAt(e, Vd, Vg, Vs);
      const I = [r.Id, 0, -r.Id];
      const Jd = [r.dd, r.dg, r.ds];
      const J = [Jd, [0, 0, 0], Jd.map((v) => -v)];
      // doğrusallaştırma noktası (Vd, Vg, Vs); sınırlanmış Vg'yi sağ tarafta düzelt
      const dVg = Vg - s.V(g);
      const corr = r.dg * dVg;
      I[0] -= corr; I[2] += corr;
      stampNL(s, [d, g, so], I, J);
      s.G(d, so, GMIN);
    },
    currents(e, s) {
      const r = this.evalAt(e, s.V(e.t[0]), s.V(e.t[1]), s.V(e.t[2]));
      const id = r.Id + GMIN * (s.V(e.t[0]) - s.V(e.t[2]));
      return [id, 0, -id];
    },
    info(e, s) {
      const r = this.evalAt(e, s.V(e.t[0]), s.V(e.t[1]), s.V(e.t[2]));
      const vth = e.p.Vt ?? 2;
      const region = r.vgs <= vth ? "kesim" : Math.abs(r.vds) < r.vgs - vth ? "doğrusal" : "doyum";
      return { vgs: r.vgs, vds: r.vds, Id: Math.abs(r.Id), region };
    },
  };

  /* opamp. t = [+giriş, −giriş, çıkış]. Girişler akım çekmez.
     ideal: V+ = V− kısıtı (nullor), sınırsız çıkış.
     gerçekçi: Vout = sınırlı(A·(V+ − V−)); besleme raylarına yumuşak (tanh) kırpma. */
  MODELS.OA = {
    terms: 3,
    init(e, c) { e.k = c.branch(); },
    rails(e) {
      const hr = e.p.headroom ?? 0;
      const hi = (e.p.vpos ?? 15) - hr, lo = (e.p.vneg ?? -15) + hr;
      return [hi, lo];
    },
    stamp(e, s) {
      const [ip, im, out] = e.t;
      s.B(out, e.k, 1);
      if (e.p.ideal) { s.Brow(e.k, ip, 1); s.Brow(e.k, im, -1); return; }
      const A = e.p.A ?? 1e5;
      const [hi, lo] = this.rails(e), mid = (hi + lo) / 2, half = (hi - lo) / 2;
      const vd = s.V(ip) - s.V(im);
      const u = (A * vd) / half, th = Math.tanh(u);
      const f = mid + half * th, df = A * (1 - th * th);
      // Vout − df·(V+ − V−) = f − df·vd
      s.Brow(e.k, out, 1); s.Brow(e.k, ip, -df); s.Brow(e.k, im, df);
      s.rhsB(e.k, f - df * vd);
    },
    currents(e, s) { return [0, 0, s.x[e.k]]; },
    info(e, s) {
      const v = s.V(e.t[2]);
      if (e.p.ideal) return { vout: v, clipped: false };
      const [hi, lo] = this.rails(e);
      const m = 0.01 * (hi - lo);
      return { vout: v, clipped: v > hi - m || v < lo + m };
    },
  };
  // gerilim kontrollü gerilim kaynağı: t = [çıkış+, çıkış−, kontrol+, kontrol−]
  MODELS.E = {
    terms: 4,
    init(e, c) { e.k = c.branch(); },
    stamp(e, s) {
      const [op, om, cp, cm] = e.t;
      s.B(op, e.k, 1); s.B(om, e.k, -1);
      s.Brow(e.k, op, 1); s.Brow(e.k, om, -1); s.Brow(e.k, cp, -e.p.gain); s.Brow(e.k, cm, e.p.gain);
    },
    currents(e, s) { const i = s.x[e.k]; return [i, -i, 0, 0]; },
  };

  /* ======================== benzetim nesnesi ======================== */
  function create(def) {
    const elements = (def.elements || def).map((d) => ({ ...d, p: { ...d }, m: MODELS[d.type] }));
    elements.forEach((e) => { if (!e.m) throw new Error("Bilinmeyen bileşen türü: " + e.type); });
    const byId = {};
    elements.forEach((e, i) => { if (!e.id) e.id = e.type + (i + 1); byId[e.id] = e; });

    // düğüm numaraları (toprak = -1)
    const nodeNames = [];
    const nodeIndex = {};
    function nodeOf(name) {
      name = String(name);
      if (GROUND.has(name)) return -1;
      if (!(name in nodeIndex)) { nodeIndex[name] = nodeNames.length; nodeNames.push(name); }
      return nodeIndex[name];
    }
    elements.forEach((e) => { e.t = e.n.map(nodeOf); });
    const nExt = nodeNames.length;
    let nNodes = nExt, nBranch = 0;
    const internal = [], branches = [];
    const alloc = {
      node() { internal.push(1); return nNodes++; },
      branch() { branches.push(1); return -(++nBranch); }, // geçici; sonra kaydırılır
    };
    elements.forEach((e) => e.m.init && e.m.init(e, alloc));
    // BJT eklem kapasiteleri (Cbe, Cbc): modelin parçası, şemada çizilmez; yalnız geçici rejimde etkili
    elements.slice().forEach((e) => {
      if (e.type !== "Q") return;
      const c = e.p.Rc ? e.ni : e.t[0], b = e.t[1], em = e.t[2];
      [["cbe", e.p.Cbe, b, em], ["cbc", e.p.Cbc, b, c]].forEach(([k, Cv, a, z]) => {
        if (!Cv) return;
        const ce = { type: "C", id: e.id + "." + k, p: { C: Cv }, m: MODELS.C, t: [a, z], n: [], hidden: true };
        MODELS.C.init(ce);
        elements.push(ce); byId[ce.id] = ce;
      });
    });
    // dal indekslerini düğümlerden sonraya taşı
    elements.forEach((e) => { if (e.k != null && e.k < 0) e.k = nNodes + (-e.k - 1); });
    const N = nNodes + nBranch;
    const nonlinear = elements.some((e) => "D Q M OA".includes(e.type) && !(e.type === "OA" && e.p.ideal));

    const A = new Float64Array(N * N), b = new Float64Array(N);
    let x = new Float64Array(N);
    const s = {
      x, t: 0, h: 0, method: def.method || "trap", srcScale: 1, limited: false, firstStep: false,
      V(i) { return i < 0 ? 0 : s.x[i]; },
      Gij(i, j, g) { if (i >= 0 && j >= 0) A[i * N + j] += g; },
      G(i, j, g) {
        if (i >= 0) A[i * N + i] += g;
        if (j >= 0) A[j * N + j] += g;
        if (i >= 0 && j >= 0) { A[i * N + j] -= g; A[j * N + i] -= g; }
      },
      J(i, cur) { if (i >= 0) b[i] += cur; },
      B(i, k, v) { if (i >= 0) A[i * N + k] += v; },
      Brow(k, i, v) { if (i >= 0) A[k * N + i] += v; },
      Bdiag(k, v) { A[k * N + k] += v; },
      rhsB(k, v) { b[k] += v; },
    };

    function assemble() {
      A.fill(0); b.fill(0); s.limited = false;
      // GMIN yalnızca dış düğümlere (iç düğümler seri dirençlerle zaten bağlı)
      for (let i = 0; i < nExt; i++) A[i * N + i] += GMIN;
      for (const e of elements) e.m.stamp(e, s);
    }

    function newton(maxIt = 200) {
      let it = 0;
      s.accepted = false;
      for (; it < maxIt; it++) {
        assemble();
        const sol = b.slice();
        const M = A.slice();
        if (!solveLinear(M, sol, N)) return { ok: false, it, reason: "tekil matris" };
        let conv = true, maxd = 0;
        for (let i = 0; i < N; i++) {
          const d = Math.abs(sol[i] - x[i]);
          if (d > maxd) maxd = d;
          const tol = i < nNodes ? 1e-6 + 1e-6 * Math.abs(sol[i]) : 1e-9 + 1e-6 * Math.abs(sol[i]);
          if (d > tol) conv = false;
        }
        if (!isFinite(maxd)) return { ok: false, it, reason: "taşma" };
        // büyük sıçramaları sönümle (yalnız doğrusal olmayan devrelerde)
        if (nonlinear && maxd > 5) {
          const f = 5 / maxd;
          for (let i = 0; i < N; i++) x[i] += (sol[i] - x[i]) * f;
          continue;
        }
        x.set(sol);
        if (!nonlinear) return { ok: true, it: it + 1 };
        if (conv && !s.limited && it > 0) {
          // bir iterasyon daha: Newton karesel yakınsadığı için kalan hata (ör. küçük seri dirençli
          // iç düğümlerde µA düzeyinde KCL farkı) makine hassasiyetine iner
          assemble();
          const sol2 = b.slice(), M2 = A.slice();
          if (solveLinear(M2, sol2, N) && sol2.every(isFinite)) x.set(sol2);
          return { ok: true, it: it + 2 };
        }
      }
      return { ok: false, it, reason: "yakınsamadı" };
    }

    const snapshot = () => ({ x: x.slice(), st: elements.map((e) => ({ vd: e.vd, vbe: e.vbe, vbc: e.vbc, vgs: e.vgs })) });
    const restore = (sn) => { x.set(sn.x); elements.forEach((e, i) => Object.assign(e, sn.st[i])); };

    function dc() {
      const h0 = s.h; s.h = 0;
      const start = snapshot();
      let r = newton();
      if (!r.ok) {
        // kaynak adımlama: kaynakları sıfırdan yavaşça büyüt
        restore(start); x.fill(0);
        elements.forEach((e) => { if (e.vd != null) e.vd = 0; if (e.vbe != null) { e.vbe = 0; e.vbc = 0; } if (e.vgs != null) e.vgs = 0; });
        let ok = true;
        for (let k = 1; k <= 20; k++) {
          s.srcScale = k / 20;
          const rr = newton();
          if (!rr.ok) { ok = false; break; }
        }
        s.srcScale = 1;
        r = { ok, it: -1, reason: ok ? "" : "yakınsamadı (kaynak adımlama)" };
      }
      s.h = h0;
      sim.converged = r.ok;
      return r;
    }

    // geçici rejim: başlangıç koşulu ya verilen v0 / i0 (uic) ya da DC çalışma noktası
    function tranInit(opts = {}) {
      s.t = opts.t0 || 0;
      if (!opts.uic) {
        dc();
        elements.forEach((e) => e.m.reset && e.m.reset(e, s));
      } else {
        elements.forEach((e) => {
          if (e.type === "C") { e.st.v = e.p.v0 || 0; e.st.i = 0; }
          if (e.type === "L") { e.st.i = e.p.i0 || 0; e.st.v = 0; }
        });
      }
      s.firstStep = true;
    }

    // bir zaman adımı; yakınsamazsa adımı yarılayarak (en çok 2^12 parçaya kadar) yeniden dener
    function stepOnce(h, t0) {
      s.h = h; s.t = t0 + h;
      const r = newton(60);
      if (!r.ok) return r;
      elements.forEach((e) => e.m.accept && e.m.accept(e, s));
      s.accepted = true;
      s.firstStep = false;
      return r;
    }
    function stepRec(h, t0, depth) {
      const sn = snapshot();
      const st = elements.map((e) => (e.st ? { ...e.st } : null));
      const first = s.firstStep;
      const r = stepOnce(h, t0);
      if (r.ok) return true;
      restore(sn);
      elements.forEach((e, i) => { if (st[i]) e.st = { ...st[i] }; });
      s.firstStep = first;
      if (depth >= 28) return false;
      return stepRec(h / 2, t0, depth + 1) && stepRec(h / 2, t0 + h / 2, depth + 1);
    }
    function step(h) {
      const t0 = s.t;
      const ok = stepRec(h, t0, 0);
      s.h = h; s.t = t0 + h;
      sim.converged = ok;
      sim.lastFail = ok ? null : { reason: "yakınsamadı" };
      return { ok };
    }

    const sim = {
      converged: true,
      elements: elements.filter((e) => !e.hidden), byId, nodes: nodeNames.slice(),
      get t() { return s.t; }, set t(v) { s.t = v; },
      get state() { return s; },
      // düğüm gerilimi (toprağa göre)
      v(name) { const i = nodeOf(name); return i < 0 ? 0 : x[i]; },
      // bileşen akımı: iki uçlularda a→b; çok uçlularda terminal dizisi
      i(id) { const e = byId[id]; const c = e.m.currents(e, s); return e.m.terms === 2 ? c[0] : c; },
      terminals(id) { const e = byId[id]; return e.m.currents(e, s); },
      // harcanan güç (kaynaklarda negatif = güç veriyor)
      p(id) {
        const e = byId[id]; const c = e.m.currents(e, s);
        return c.reduce((acc, I, k) => acc + I * s.V(e.t[k]), 0);
      },
      vAcross(id) { const e = byId[id]; return s.V(e.t[0]) - s.V(e.t[1]); },
      info(id) { const e = byId[id]; return e.m.info ? e.m.info(e, s) : {}; },
      set(id, key, val) {
        const e = byId[id];
        if (!e) throw new Error("Bileşen yok: " + id);
        if (typeof key === "object") Object.assign(e.p, key); else e.p[key] = val;
        return sim;
      },
      get(id, key) { return byId[id].p[key]; },
      dc, tranInit, step,
      // KCL kontrolü: her dış düğümde bileşenlere giren akımların toplamı
      kcl() {
        const sum = new Float64Array(nExt), mag = new Float64Array(nExt);
        for (const e of elements) {
          const c = e.m.currents(e, s);
          e.t.forEach((ti, k) => { if (ti >= 0 && ti < nExt) { sum[ti] += c[k]; mag[ti] += Math.abs(c[k]); } });
        }
        // her düğümde toprağa bağlı GMIN iletkenliği de çözümün parçasıdır
        for (let i = 0; i < nExt; i++) sum[i] += GMIN * x[i];
        const res = nodeNames.map((n, i) => ({ node: n, sum: sum[i], scale: mag[i] }));
        return res;
      },
      // devredeki en büyük akıma göre bağıl KCL hatası
      kclError() {
        const r = sim.kcl();
        let worst = 0;
        const ref = Math.max(1e-6, ...r.map((q) => q.scale));
        r.forEach((q) => { worst = Math.max(worst, Math.abs(q.sum) / ref); });
        return worst;
      },
    };
    return sim;
  }

  /* ======================== hazır modeller ======================== */
  // LED: tipik ileri gerilim Vf (Iref = 10 mA'de) — basitleştirilmiş model
  const LED_COLORS = {
    kirmizi: { name: "Kırmızı", Vf: 2.0, color: "#ff3b3b", nm: 630 },
    sari: { name: "Sarı", Vf: 2.1, color: "#ffd23b", nm: 590 },
    yesil: { name: "Yeşil", Vf: 2.2, color: "#4dff6a", nm: 565 },
    mavi: { name: "Mavi", Vf: 3.1, color: "#3b8cff", nm: 470 },
    beyaz: { name: "Beyaz", Vf: 3.1, color: "#f4f4ff", nm: 0 },
  };
  function ledParams(Vf, opts = {}) {
    const N = opts.N || 2, Rs = opts.Rs ?? 2, Iref = opts.Iref || 0.01;
    const vd = Vf - Iref * Rs;
    return { Is: Iref / (Math.exp(vd / (N * VT)) - 1), N, Rs, Vf, Imax: opts.Imax || 0.03 };
  }
  const MODELS_PRESET = {
    // genel amaçlı silisyum diyot (basitleştirilmiş)
    si: { Is: 1e-14, N: 1, Rs: 0.05 },
    // küçük sinyal NPN / PNP (basitleştirilmiş Ebers–Moll)
    // Cbe, Cbc: eklem kapasiteleri (geçici rejimde hızlı geçişleri gerçekçi ve çözülebilir kılar)
    npn: { pol: 1, Is: 1e-14, bf: 100, br: 1, Rc: 2, Cbe: 10e-12, Cbc: 4e-12 },
    pnp: { pol: -1, Is: 1e-14, bf: 100, br: 1, Rc: 2, Cbe: 10e-12, Cbc: 4e-12 },
    // "logic level" N kanal MOSFET (kare yasası, basitleştirilmiş)
    nmos: { pol: 1, Vt: 1.5, K: 2, lambda: 0.01 },
    pmos: { pol: -1, Vt: 1.5, K: 2, lambda: 0.01 },
  };
  // Vz: 5 mA ters akımdaki kırılma gerilimi
  function zenerParams(Vz) { return { Is: 1e-14, N: 1, Rs: 0.5, Bv: Vz, Ibv: 5e-3, Nbv: 3 }; }

  /* ======================== yardımcılar ======================== */
  const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  // en yakın standart değer (geometrik olarak); up=true ise bir üstteki
  function nearestE(v, series = E12, up = false) {
    if (!(v > 0)) return series[0];
    const dec = Math.floor(Math.log10(v));
    const cands = [];
    for (let d = dec - 1; d <= dec + 1; d++) for (const m of series) cands.push(+(m * 10 ** d).toPrecision(3));
    if (up) return cands.filter((c) => c >= v * (1 - 1e-9)).sort((a, b) => a - b)[0];
    return cands.sort((a, b) => Math.abs(Math.log(a / v)) - Math.abs(Math.log(b / v)))[0];
  }
  // mühendislik gösterimi, Türkçe ondalık virgül: fmt(0.0047,"A") → "4,7 mA"
  const PREF = [[1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"]];
  function fmt(v, unit = "", digits = 3) {
    if (v == null || !isFinite(v)) return "—";
    const a = Math.abs(v);
    if (a < 1e-15) return "0 " + unit;
    let [m, p] = PREF.find(([m]) => a >= m * 0.9995) || PREF[PREF.length - 1];
    let n = v / m;
    let s = Math.abs(n) >= 100 ? n.toFixed(Math.max(0, digits - 3)) : Math.abs(n) >= 10 ? n.toFixed(Math.max(0, digits - 2)) : n.toFixed(Math.max(0, digits - 1));
    if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
    return s.replace(".", ",").replace("-", "−") + " " + p + unit;
  }
  // direnç renk kodu
  const BANDS = ["siyah", "kahverengi", "kırmızı", "turuncu", "sarı", "yeşil", "mavi", "mor", "gri", "beyaz"];
  function colorCode(R) {
    const exp = Math.floor(Math.log10(R)) - 1;
    const sig = Math.round(R / 10 ** exp);
    return [Math.floor(sig / 10), sig % 10, exp];
  }

  return {
    create, VT, waveAt, models: MODELS_PRESET, LED: LED_COLORS, led: ledParams, zener: zenerParams,
    E12, nearestE, fmt, BANDS, colorCode, solveLinear,
  };
});
