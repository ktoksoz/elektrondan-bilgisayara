/* 4. bölüm, ikinci yarı: reaktans, fazör, empedans (kara kutu), empedans hesaplayıcı, rezonans.
   Karmaşık sayı hesabı js/ac.js'te; şemalı deneylerdeki ölçümler çözücünün geçici rejim benzetiminden,
   her periyotta tek frekanslı DFT ile alınır. */
(function () {
  const S = STR.ch04b;
  const { C, FONT, h, slider, seg, btn, canvas, num, rgba } = L;
  const fmt = (v, u, d) => Circuit.fmt(v, u, d);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const G = (window.GUIDES = window.GUIDES || {});
  const TSEQ = Scope.TSEQ, VSEQ = Scope.VSEQ;
  const tdivFor = (t) => TSEQ.find((v) => v >= t * 0.999) || TSEQ[TSEQ.length - 1];
  const vdivFor = (vp) => VSEQ.find((v) => v >= vp / 3.4) || VSEQ[VSEQ.length - 1];
  const meter = (label) => { const b = h("b", "—"); const m = h("div.meter", h("small", label), b); m.val = b; return m; };
  const deg = AC.deg;
  const P = Schematic.PARTS;

  // renkler: gerilim sarı (KN1), akım pembe; elemanlar: R bakır, L yeşil, C camgöbeği
  const COL = { V: C.ch1, I: C.ch3, R: C.copper2, L: C.ch4, C: C.ch2, LC: "#c08cff", RL: "#ffb35c", Z: C.silk };

  /* ---------------- çizim yardımcıları ---------------- */
  function nice(v) {
    if (!(v > 0) || !isFinite(v)) return 1;
    const e = Math.floor(Math.log10(v)), m = v / 10 ** e;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * 10 ** e;
  }
  function tag(ctx, text, x, y, col, align = "left", base = "middle", size = 11) {
    ctx.font = `600 ${size}px ${FONT.mono}`;
    const w = ctx.measureText(text).width, hh = size + 4;
    const bx = align === "left" ? x : align === "right" ? x - w : x - w / 2;
    const by = base === "bottom" ? y - hh : base === "top" ? y : y - hh / 2;
    ctx.fillStyle = "rgba(6,21,15,0.84)"; ctx.fillRect(bx - 3, by, w + 6, hh);
    ctx.fillStyle = col; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(text, bx, by + hh / 2 + 0.5);
  }
  // alt simgeli etiket: "V" + "R"
  function subTag(ctx, main, sub, x, y, col, align = "left") {
    ctx.textBaseline = "middle";
    ctx.font = `700 13px ${FONT.mono}`; const w1 = ctx.measureText(main).width;
    ctx.font = `700 10px ${FONT.mono}`; const w2 = sub ? ctx.measureText(sub).width : 0;
    const w = w1 + w2 + (sub ? 1 : 0);
    const bx = align === "left" ? x : align === "right" ? x - w : x - w / 2;
    ctx.fillStyle = "rgba(6,21,15,0.8)"; ctx.fillRect(bx - 3, y - 9, w + 6, 19);
    ctx.fillStyle = col; ctx.textAlign = "left";
    ctx.font = `700 13px ${FONT.mono}`; ctx.fillText(main, bx, y);
    if (sub) { ctx.font = `700 10px ${FONT.mono}`; ctx.fillText(sub, bx + w1 + 1, y + 4); }
  }
  function arrow(ctx, x0, y0, x1, y1, col, wd = 2.4, head = 10) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = wd; ctx.lineCap = "round";
    if (len < 2) { ctx.beginPath(); ctx.arc(x0, y0, 3, 0, Math.PI * 2); ctx.fill(); return; }
    const hd = Math.min(head, len * 0.45), ux = dx / len, uy = dy / len;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * hd * 0.8, y1 - uy * hd * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ux * hd - uy * hd * 0.42, y1 - uy * hd + ux * hd * 0.42);
    ctx.lineTo(x1 - ux * hd + uy * hd * 0.42, y1 - uy * hd - ux * hd * 0.42);
    ctx.closePath(); ctx.fill(); ctx.lineCap = "butt";
  }
  function dash(ctx, x0, y0, x1, y1, col, d = [4, 4], wd = 1.2) {
    ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.setLineDash(d);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
  }
  // açı yayı: veri uzayında saat yönünün tersine a0 → a1 (radyan)
  function angArc(ctx, ox, oy, r, a0, a1, col, label) {
    if (Math.abs(a1 - a0) < 0.02) return;
    ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(ox, oy, r, -a0, -a1, a1 > a0); ctx.stroke();
    if (label) {
      const am = (a0 + a1) / 2;
      tag(ctx, label, ox + (r + 14) * Math.cos(am), oy - (r + 14) * Math.sin(am), col, "center", "middle", 11);
    }
  }

  /* Karmaşık düzlem: veri kapsamı (her iki eksende eşit ölçek, açılar doğru görünsün).
     ext = {x0, x1, y0, y1}; başlık ve eksen adları. */
  function plane(ctx, rect, ext, o = {}) {
    const pad = o.pad ?? 30;
    let { x0, x1, y0, y1 } = ext;
    x0 = Math.min(x0, 0); y0 = Math.min(y0, 0); x1 = Math.max(x1, 0); y1 = Math.max(y1, 0);
    const span = Math.max(x1 - x0, y1 - y0, 1e-30);
    const minSpan = span * 0.18;
    if (x1 - x0 < minSpan) { x1 += minSpan / 2; x0 -= minSpan / 2; }
    if (y1 - y0 < minSpan) { y1 += minSpan / 2; y0 -= minSpan / 2; }
    const W = rect.w - 2 * pad, H = rect.h - 2 * pad - (o.top || 0);
    const k = Math.min(W / (x1 - x0), H / (y1 - y0));
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const cxp = rect.x + rect.w / 2, cyp = rect.y + (o.top || 0) + pad + H / 2;
    const X = (x) => cxp + (x - mx) * k, Y = (y) => cyp - (y - my) * k;
    // ızgara
    const step = nice(Math.max(x1 - x0, y1 - y0) / 5);
    const L0 = rect.x + 6, R0 = rect.x + rect.w - 6, T0 = rect.y + (o.top || 0) + 6, B0 = rect.y + rect.h - 6;
    const gx0 = Math.ceil((mx - (cxp - L0) / k) / step), gx1 = Math.floor((mx + (R0 - cxp) / k) / step);
    const gy0 = Math.ceil((my - (B0 - cyp) / k) / step), gy1 = Math.floor((my + (cyp - T0) / k) / step);
    ctx.strokeStyle = rgba(C.silk, 0.07); ctx.lineWidth = 1; ctx.beginPath();
    if (gx1 - gx0 < 60) for (let i = gx0; i <= gx1; i++) { const x = Math.round(X(i * step)) + 0.5; ctx.moveTo(x, T0); ctx.lineTo(x, B0); }
    if (gy1 - gy0 < 60) for (let i = gy0; i <= gy1; i++) { const y = Math.round(Y(i * step)) + 0.5; ctx.moveTo(L0, y); ctx.lineTo(R0, y); }
    ctx.stroke();
    // eksenler
    const ox = X(0), oy = Y(0);
    ctx.strokeStyle = rgba(C.silk, 0.55); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(L0, oy); ctx.lineTo(R0, oy); ctx.moveTo(ox, B0); ctx.lineTo(ox, T0); ctx.stroke();
    ctx.fillStyle = rgba(C.silk, 0.55);
    ctx.beginPath(); ctx.moveTo(R0, oy); ctx.lineTo(R0 - 7, oy - 4); ctx.lineTo(R0 - 7, oy + 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ox, T0); ctx.lineTo(ox - 4, T0 + 7); ctx.lineTo(ox + 4, T0 + 7); ctx.fill();
    ctx.font = `600 11px ${FONT.mono}`; ctx.fillStyle = C.silk2;
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(o.xl || "Re", R0 - 2, oy - 5);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(o.yl || "Im", ox + 6, T0);
    // ölçek etiketi (bir ızgara aralığı)
    if (o.unit != null) {
      ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillStyle = C.muted; ctx.font = `500 10px ${FONT.mono}`;
      ctx.fillText(`ızgara: ${fmt(step, o.unit, 2)}`, R0 - 2, B0);
    }
    return { X, Y, k, ox, oy, step };
  }
  /* Uç uca eklenen oklar. Ters yönlü ve aynı doğrultudaki ardışık oklar (ör. jXL ve −jXC)
     üst üste binmesin diye yana kaydırılır; etiket okun sağ yanına yazılır. */
  function drawChain(ctx, pl, items, labelOf, minLen = 16) {
    let acc = AC.cx(0, 0), prev = null, off = 0;
    items.forEach((c) => {
      const nx = AC.add(acc, c.v);
      let x0 = pl.X(acc.re), y0 = pl.Y(acc.im), x1 = pl.X(nx.re), y1 = pl.Y(nx.im);
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
      if (prev && len > 1 && prev.len > 1 && (dx * prev.dx + dy * prev.dy) / (len * prev.len) < -0.95) off += 9; else off = 0;
      const nxp = len ? -dy / len : 0, nyp = len ? dx / len : 0;
      x0 += nxp * off; y0 += nyp * off; x1 += nxp * off; y1 += nyp * off;
      arrow(ctx, x0, y0, x1, y1, COL[c.k], 2.2, 9);
      if (len > minLen) {
        // etiket okun sol normali yönünde (yukarı giden okun sağı, aşağı gidenin solu, sağa gidenin altı)
        const lx = (x0 + x1) / 2 + nxp * 12, ly = (y0 + y1) / 2 + nyp * 14;
        const [m, sb] = labelOf(c);
        subTag(ctx, m, sb, lx, ly, COL[c.k], Math.abs(nxp) < 0.5 ? "center" : nxp > 0 ? "left" : "right");
      }
      prev = { dx, dy, len }; acc = nx;
    });
  }
  const clampY = (y, H) => Math.max(26, Math.min(H - 30, y));
  // fazör/empedans metni: dikdörtgen ve kutupsal
  const rect = (z, u) => AC.isInf(z) ? S.inf : `${fmt(z.re, u)} ${z.im < 0 ? "−" : "+"} j${fmt(Math.abs(z.im), u)}`;
  const pol = (z, u) => AC.isInf(z) ? S.inf : `${fmt(AC.abs(z), u)} ∠ ${num(deg(AC.arg(z)), 1)}°`;
  const angS = (r) => `${r > 0.0005 ? "+" : ""}${num(deg(r), 1)}°`;
  const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  /* Kayan pencere DFT: her yükselen sıfır geçişinde son periyodun fazörlerini verir */
  function periodMeter(onMeas) {
    let acc = null, prev = 0, last = null;
    return {
      reset() { acc = null; last = null; },
      push(t, f, xs) {
        const v0 = xs[0];
        if (acc) {
          const w = 2 * Math.PI * f, s = Math.sin(w * t), c = Math.cos(w * t);
          xs.forEach((x, i) => { acc.s[i] += x * s; acc.c[i] += x * c; });
          acc.n++;
        }
        if (prev < 0 && v0 >= 0) {
          if (acc && last != null && acc.n > 16) onMeas(xs.map((_, i) => AC.cx((2 * acc.s[i]) / acc.n, (2 * acc.c[i]) / acc.n)));
          last = t; acc = { s: xs.map(() => 0), c: xs.map(() => 0), n: 0 };
        }
        prev = v0;
      },
    };
  }

  // osiloskopa ikinci iz olarak akım: halka arabellek + çizici
  function currentTrace(color) {
    const CAP = 20000, tt = new Float64Array(CAP), vv = new Float64Array(CAP);
    let head = 0, n = 0, div = 0.001;
    return {
      clear() { n = 0; },
      setDiv(d) { div = d; },
      get div() { return div; },
      push(t, i) { tt[head] = t; vv[head] = i; head = (head + 1) % CAP; if (n < CAP) n++; },
      draw(ctx, api, g) {
        if (api.t0 == null) return;
        const y0 = api.toY(0, api.channels[0]);
        ctx.save(); ctx.beginPath(); ctx.rect(g.m, g.m, g.gw, g.gh); ctx.clip();
        ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.beginPath();
        let started = false, lx = -1e9;
        for (let k = 0; k < n; k++) {
          const j = (head - n + k + CAP) % CAP, x = api.toX(tt[j]);
          if (x < g.m - 2 || x > g.m + g.gw + 2) continue;
          if (started && x - lx < 0.6) continue;
          const y = y0 - (vv[j] / div) * g.dy;
          started ? ctx.lineTo(x, y) : ctx.moveTo(x, y); started = true; lx = x;
        }
        ctx.stroke(); ctx.restore();
        tag(ctx, `I  ${fmt(div, "A", 2)}/b`, g.m + g.gw - 8, g.m + 30, color, "right");
      },
    };
  }
  // akım probu (pens ampermetre) çizimi: şemada telin üstüne halka
  function clamp(ctx, s, at, horiz = true) {
    const [x, y] = s.screenOf(at), u = s.unit;
    ctx.strokeStyle = COL.I; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, horiz ? 0.32 * u : 0.62 * u, horiz ? 0.62 * u : 0.32 * u, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `750 ${Math.max(10, 0.55 * u)}px ${FONT.mono}`; ctx.fillStyle = COL.I; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText("I", x, y - 0.75 * u);
  }

  /* =====================================================================
     1) Reaktans: R, C ya da L tek başına AC kaynağında; ölçülen Vp/Ip ve faz
     ===================================================================== */
  Demos.c4react = function (stage) {
    const schPane = h("div.pane", h("span.pane-title", S.sch));
    const xCv = h("canvas", { role: "img", "aria-label": S.xf });
    const xPane = h("div.pane", h("span.pane-title", S.xf), xCv);
    const sbox = h("div.c4-scope.c4-notrig");
    stage.append(h("div.split.c4-split", { style: { gridTemplateRows: "1fr 1.05fr" } }, h("div.c4-row", schPane, xPane), sbox));

    const A = 5;
    const val = { R: 1000, C: 1e-6, L: 0.1 };
    let kind = "C", f = 100, meas = null;
    const FMIN = 10, FMAX = 10000;
    const xForm = (k, ff) => (k === "R" ? val.R : k === "C" ? AC.reactC(val.C, ff) : AC.reactL(val.L, ff));
    const psi = (k) => (k === "C" ? Math.PI / 2 : k === "L" ? -Math.PI / 2 : 0);

    const it = currentTrace(COL.I);
    const sc = Scope(sbox, {
      channels: [{ name: "KN1", vdiv: 2, pos: 0 }], tdiv: 2e-3, trigger: { ch: 0, level: 0, edge: "rise", mode: "auto" }, style: { flex: "1" },
      overlay: (ctx, api, g) => it.draw(ctx, api, g),
    });
    const base = CIRCUITS.c4react;
    function makeDef() {
      const d = clone(base), x = d.parts.find((p) => p.id === "X1"), w = 2 * Math.PI * f;
      const T = 1 / f;
      if (kind === "R") Object.assign(x, { type: "resistor", R: val.R });
      if (kind === "C") Object.assign(x, { type: "capacitor", C: val.C, v0: 0 });
      // ideal bobin: kalıcı rejimde i(0) = −A/(ωL); yoksa akımda sönmeyen bir DC kayma kalırdı
      if (kind === "L") Object.assign(x, { type: "inductor", L: val.L, i0: -A / (w * val.L) });
      d.parts.find((p) => p.id === "V1").wave.freq = f;
      d.tran = { h: T / 120, rate: 2 * T };
      d.iRef = (A / xForm(kind, f)) * 0.6;
      return d;
    }
    const pm = periodMeter((ph) => {
      const [V, I] = ph;
      meas = { X: AC.abs(V) / AC.abs(I), psi: wrapPi(AC.arg(I) - AC.arg(V)) };
      show();
    });
    const sch = Schematic(schPane, makeDef(), {
      maxUnit: 30,
      overlay(ctx, s) { clamp(ctx, s, [6, -1]); },
      tick() { sc.draw(); },
    });
    sch.on("step", (t) => {
      const v = sch.v(sch.netOf("V1", "a")), i = -sch.sim.i("V1");
      sc.push(t, [v]); it.push(t, i);
      pm.push(t, f, [v, i]);
    });
    let rt = 0;
    function rebuild() {
      clearTimeout(rt);
      rt = setTimeout(() => {
        sch.rebuild(makeDef());
        sc.clear(); it.clear(); pm.reset(); meas = null;
        sc.setTdiv(tdivFor((2.5 / f) / 10));
        it.setDiv(nice(A / xForm(kind, f) / 3.2));
        show(); drawX();
      }, 40);
    }
    function show() {
      const xf = xForm(kind, f);
      mF.querySelector("small").textContent = kind === "R" ? "R" : kind === "C" ? "XC = 1 / (2π·f·C)" : "XL = 2π·f·L";
      mF.val.textContent = fmt(xf, "Ω");
      if (!meas) { mX.val.textContent = mP.val.textContent = S.waiting; return; }
      mX.val.textContent = fmt(meas.X, "Ω");
      const d = deg(meas.psi);
      mP.val.textContent = Math.abs(d) < 2 ? `0° · ${S.inPhase}` : d > 0 ? `+${num(d, 0)}° · ${S.ahead}` : `${num(d, 0)}° · ${S.behind}`;
      drawX();
    }

    let xs;
    function drawX() {
      if (!xs || !xs.w) return;
      const { ctx, w, h: H } = xs;
      ctx.clearRect(0, 0, w, H);
      const l = 50, r = 14, t = 30, b = 24, gw = w - l - r, gh = H - t - b;
      const ZMIN = 1, ZMAX = 1e6;
      const X = (ff) => l + (Math.log(ff / FMIN) / Math.log(FMAX / FMIN)) * gw;
      const Y = (z) => t + (1 - Math.log(Math.min(ZMAX, Math.max(ZMIN, z)) / ZMIN) / Math.log(ZMAX / ZMIN)) * gh;
      ctx.strokeStyle = rgba(C.silk, 0.08); ctx.lineWidth = 1; ctx.beginPath();
      for (let d = 10; d <= FMAX; d *= 10) { const x = Math.round(X(d)) + 0.5; ctx.moveTo(x, t); ctx.lineTo(x, t + gh); }
      for (let z = ZMIN; z <= ZMAX; z *= 10) { const y = Math.round(Y(z)) + 0.5; ctx.moveTo(l, y); ctx.lineTo(l + gw, y); }
      ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `500 10.5px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      [[10, "10 Hz"], [100, "100 Hz"], [1000, "1 kHz"], [10000, "10 kHz"]].forEach(([ff, s]) => ctx.fillText(s, Math.min(X(ff), l + gw - 18), t + gh + 5));
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let z = ZMIN; z <= ZMAX; z *= 100) ctx.fillText(fmt(z, "Ω", 1), l - 5, Y(z));
      // üç eğri: seçilen kalın
      [["R", "R"], ["C", "XC"], ["L", "XL"]].forEach(([k, name]) => {
        const on = k === kind;
        ctx.strokeStyle = on ? COL[k] : rgba(k === "R" ? C.copper2 : k === "C" ? C.ch2 : C.ch4, 0.28);
        ctx.lineWidth = on ? 2.6 : 1.4; ctx.beginPath();
        for (let i = 0; i <= 60; i++) { const ff = FMIN * Math.pow(FMAX / FMIN, i / 60), x = X(ff), y = Y(xForm(k, ff)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        const fl = k === "L" ? FMAX * 0.5 : k === "R" ? 250 : FMIN * 1.6, z = xForm(k, fl);
        if (z > ZMIN && z < ZMAX) tag(ctx, name, X(fl), Y(z) + (k === "R" ? 12 : 12), on ? COL[k] : C.muted, k === "L" ? "right" : "left", "middle", 10.5);
      });
      const x = X(f);
      dash(ctx, x, t, x, t + gh, rgba(C.silk, 0.4), [2, 3]);
      const z = meas ? meas.X : xForm(kind, f);
      ctx.fillStyle = C.amp; ctx.beginPath(); ctx.arc(x, Y(z), 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.mask; ctx.lineWidth = 2; ctx.stroke();
    }
    xs = canvas(xCv, drawX);

    const kseg = seg([["R", S.R], ["C", S.C], ["L", S.L]], kind, (k) => { kind = k; vals.forEach(([kk, s]) => (s.style.display = kk === k ? "" : "none")); rebuild(); }, S.elemAria);
    const fs = slider({ label: S.freq, min: FMIN, max: FMAX, step: 0, value: f, log: true, fmt: (v) => fmt(v, "Hz"), oninput: (v) => { f = v; rebuild(); } });
    const vals = [
      ["R", slider({ label: S.rVal, min: 100, max: 10000, step: 0, value: val.R, log: true, fmt: (v) => fmt(Circuit.nearestE(v), "Ω"), oninput: (v) => { val.R = Circuit.nearestE(v); rebuild(); } })],
      ["C", slider({ label: S.cVal, min: 100e-9, max: 10e-6, step: 0, value: val.C, log: true, fmt: (v) => fmt(Circuit.nearestE(v), "F"), oninput: (v) => { val.C = Circuit.nearestE(v); rebuild(); } })],
      ["L", slider({ label: S.lVal, min: 0.01, max: 1, step: 0, value: val.L, log: true, fmt: (v) => fmt(Circuit.nearestE(v), "H"), oninput: (v) => { val.L = Circuit.nearestE(v); rebuild(); } })],
    ];
    vals.forEach(([k, s]) => (s.style.display = k === kind ? "" : "none"));
    const mX = meter(S.xMeas), mF = meter("XC"), mP = meter(S.lead);
    stage.append(h("div.controls.c4-tight", kseg, fs, ...vals.map((v) => v[1]), h("div.meters", mX, mF, mP)));
    rebuild();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["reaktans"] = [{ click: "=" + S.C }, { slide: "label:" + S.freq, to: 1000 }, { wait: 2200 }, { click: "=" + S.L }, { wait: 1800 }, { slide: "label:" + S.freq, to: 50 }];

  /* =====================================================================
     2) Fazör: dönen ok ve izdüşümü
     ===================================================================== */
  Demos.c4phasor = function (stage) {
    const cv = h("canvas", { role: "img", "aria-label": S.phAria });
    stage.append(h("div.split", h("div.pane.c4b-phasor", cv)));
    // akımın gerilime göre fazı (rad) ve gösterim boyu (gerilim oku = 1)
    const KINDS = {
      R: { psi: 0, ia: 0.62 }, C: { psi: Math.PI / 2, ia: 0.62 }, L: { psi: -Math.PI / 2, ia: 0.62 },
      RL: { psi: -Math.atan(1.2), ia: 0.5 }, RC: { psi: Math.atan(0.8), ia: 0.55 },
    };
    const A = 5, IA = 2;
    let kind = "C", running = true, speed = 0.25, th = 0.6, homing = null;
    let psiShow = KINDS[kind].psi, iaShow = KINDS[kind].ia;
    const reduced = L.reduced && L.reduced();
    if (reduced) { running = false; th = 0; }

    let cs;
    function draw() {
      if (!cs || !cs.w) return;
      const { ctx, w, h: H } = cs;
      ctx.clearRect(0, 0, w, H);
      const narrow = w < 560;
      const R0 = Math.min(narrow ? w * 0.36 : H * 0.4, narrow ? H * 0.2 : w * 0.19);
      const cxp = narrow ? w / 2 : 30 + R0 * 1.25, cyp = narrow ? 26 + R0 * 1.3 : H / 2;
      const kd = KINDS[kind];
      // eksenler
      ctx.strokeStyle = rgba(C.silk, 0.5); ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.moveTo(cxp - R0 * 1.2, cyp); ctx.lineTo(cxp + R0 * 1.2, cyp); ctx.moveTo(cxp, cyp + R0 * 1.2); ctx.lineTo(cxp, cyp - R0 * 1.2); ctx.stroke();
      ctx.font = `600 11px ${FONT.mono}`; ctx.fillStyle = C.silk2; ctx.textAlign = "right"; ctx.textBaseline = "top";
      ctx.fillText(S.reAx, cxp + R0 * 1.2, cyp + 5); ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(S.imAx, cxp + 6, cyp - R0 * 1.2);
      ctx.strokeStyle = rgba(C.silk, 0.14); ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(cxp, cyp, R0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cxp, cyp, R0 * iaShow, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      const vx = cxp + R0 * Math.cos(th), vy = cyp - R0 * Math.sin(th);
      const ia = th + psiShow, ix = cxp + R0 * iaShow * Math.cos(ia), iy = cyp - R0 * iaShow * Math.sin(ia);
      // dalga alanı
      const wx0 = narrow ? 24 : cxp + R0 * 1.45, wx1 = w - 16;
      const wy = narrow ? cyp + R0 * 1.45 + R0 : cyp;
      const per = (wx1 - wx0) / 2.25; // px / periyot
      ctx.strokeStyle = rgba(C.silk, 0.35); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(wx0, wy); ctx.lineTo(wx1, wy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(wx0, wy - R0 * 1.1); ctx.lineTo(wx0, wy + R0 * 1.1); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `500 10.5px ${FONT.mono}`; ctx.textAlign = "right"; ctx.textBaseline = "top";
      ctx.fillText(S.wave + " →", wx1, wy + R0 * 1.12);
      // izdüşüm çizgileri
      dash(ctx, vx, vy, wx0, wy - R0 * Math.sin(th), rgba(COL.V, 0.55), [3, 4]);
      dash(ctx, ix, iy, wx0, wy - R0 * iaShow * Math.sin(ia), rgba(COL.I, 0.55), [3, 4]);
      // dalgalar: x = wx0 + τ·per  ↔  açı th − 2πτ
      [[1, 0, COL.V], [iaShow, psiShow, COL.I]].forEach(([r, ps, col]) => {
        ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath();
        for (let x = wx0; x <= wx1; x += 2) {
          const a = th + ps - (2 * Math.PI * (x - wx0)) / per, y = wy - R0 * r * Math.sin(a);
          x === wx0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.fillStyle = COL.V; ctx.beginPath(); ctx.arc(wx0, wy - R0 * Math.sin(th), 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COL.I; ctx.beginPath(); ctx.arc(wx0, wy - R0 * iaShow * Math.sin(ia), 4, 0, Math.PI * 2); ctx.fill();
      // oklar ve açı yayı
      angArc(ctx, cxp, cyp, R0 * 0.3, th, ia, rgba(C.silk, 0.8), Math.abs(psiShow) > 0.05 ? `${num(deg(psiShow), 0)}°` : "");
      arrow(ctx, cxp, cyp, vx, vy, COL.V, 3);
      arrow(ctx, cxp, cyp, ix, iy, COL.I, 3);
      subTag(ctx, "V", "", vx + 8 * Math.cos(th), vy - 8 * Math.sin(th) - 4, COL.V, Math.cos(th) < -0.2 ? "right" : "left");
      subTag(ctx, "I", "", ix + 8 * Math.cos(ia), iy - 8 * Math.sin(ia) + 6, COL.I, Math.cos(ia) < -0.2 ? "right" : "left");
      // durağan resim açıklaması
      if (!running && Math.abs(wrapPi(th)) < 0.01) {
        ctx.font = `600 11.5px ${FONT.display}`; ctx.fillStyle = C.silk2; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(S.frozenNote, 12, 10);
      }
      // değerler
      mV.val.textContent = `${num(A, 0)} V ∠ 0°  =  ${num(A, 0)} + j0`;
      const Ic = AC.polar(IA * (iaShow / 0.62), kd.psi);
      mI.val.textContent = `${num(AC.abs(Ic), 2)} A ∠ ${num(deg(kd.psi), 0)}°  =  ${num(Ic.re, 2)} ${Ic.im < 0 ? "−" : "+"} j${num(Math.abs(Ic.im), 2)}`;
    }
    cs = canvas(cv, draw);
    let lastT = null;
    const lp = L.loop((dt) => {
      // seçilen elemana yumuşak geçiş
      const kd = KINDS[kind];
      psiShow += (kd.psi - psiShow) * Math.min(1, dt * 6);
      iaShow += (kd.ia - iaShow) * Math.min(1, dt * 6);
      if (running) th = (th + 2 * Math.PI * speed * dt) % (2 * Math.PI);
      else if (homing != null) {
        const d = wrapPi(-th);
        if (Math.abs(d) < 0.004) { th = 0; homing = null; } else th += d * Math.min(1, dt * 5);
      }
      draw();
    });
    const kseg = seg([["R", S.phR], ["C", S.phC], ["L", S.phL], ["RL", S.phRL], ["RC", S.phRC]], kind, (k) => { kind = k; }, S.elemAria);
    const runB = btn(running ? S.freeze : S.run, () => {
      running = !running;
      runB.textContent = running ? S.freeze : S.run;
      homing = running ? null : 1;
    }, "primary c4b-run");
    const sp = slider({ label: S.speed, min: 0.05, max: 1, step: 0.01, value: speed, fmt: (v) => `${num(v, 2)} tur/s`, oninput: (v) => { speed = v; } });
    const mV = meter(S.vPh), mI = meter(S.iPh);
    stage.append(h("div.controls.c4-tight", kseg, runB, sp, h("div.meters.c4b-wide", mV, mI)));
    return { enter() { lp.start(); }, leave() { lp.stop(); } };
  };
  G["fazor"] = [{ click: "=" + S.phC }, { wait: 2500 }, { click: "css:.c4b-run" }, { wait: 1800 }, { click: "=" + S.phL }, { wait: 1500 }, { click: "css:.c4b-run" }];

  /* =====================================================================
     3) Empedans: kara kutu. Vp/Ip ve faz farkından Z vektörü; frekans taramasında uç izi
     ===================================================================== */
  const BOX = {
    A: { topo: "seri", use: { R: true, L: true, C: false }, R: 100, L: 10e-3, C: 1e-6 },
    B: { topo: "seri", use: { R: true, L: false, C: true }, R: 100, L: 10e-3, C: 1e-6 },
    C: { topo: "paralel", use: { R: true, L: false, C: true }, R: 220, L: 10e-3, C: 1e-6 },
    D: { topo: "seri", use: { R: true, L: true, C: true }, R: 47, L: 10e-3, C: 1e-6 },
  };
  // kutunun içindeki elemanlar (çözücü bileşenleri). Ara düğümler kutuya özel adlıdır.
  function boxElements(p, na, nb) {
    const b = BOX[p.kind], A = p.A || 5, f = p.f || 1000;
    const an = AC.analyze(b.topo, { A, f, R: b.R, L: b.L, C: b.C, use: b.use });
    const v0 = an.parts.C ? an.parts.C.V.im : 0, i0 = an.parts.L ? an.parts.L.I.im : 0;
    const el = {
      R: (a, c) => ({ type: "R", id: p.id + ".R", n: [a, c], R: b.R }),
      L: (a, c) => ({ type: "L", id: p.id + ".L", n: [a, c], L: b.L, Rs: 0, i0 }),
      C: (a, c) => ({ type: "C", id: p.id + ".C", n: [a, c], C: b.C, v0 }),
    };
    if (b.topo === "paralel") return an.on.map((k) => el[k](na, nb));
    return an.on.map((k, i) => el[k](i ? p.id + ".m" + i : na, i === an.on.length - 1 ? nb : p.id + ".m" + (i + 1)));
  }
  P.c4box = {
    pins: { a: [0, -3], b: [0, 3] }, box: [-2.3, -2.4, 2.3, 2.4], hide: 3,
    paths: [{ term: 0, pts: [[0, -3], [0, -2.4]] }, { term: 1, pts: [[0, 3], [0, 2.4]] }],
    el: (p, n) => boxElements(p, n("a"), n("b")),
    draw(g, p) {
      g.lead([0, -3], [0, -2.4], "a"); g.lead([0, 3], [0, 2.4], "b");
      g.rect(-2.3, -2.4, 4.6, 4.8, { fill: p.open ? C.mask2 : "#06150f", stroke: p.open ? C.silk2 : C.copper });
      if (!p.open) {
        g.text("?", [0, -0.2], { size: 2.4, color: C.copper, weight: 800 });
        g.text(`${S.box} ${p.kind}`, [0, 1.75], { size: 0.55, color: C.muted });
        return;
      }
      const b = BOX[p.kind], on = ["R", "L", "C"].filter((k) => b.use[k]);
      const sym = (k, x, y) => {
        if (k === "R") g.rect(x - 0.22, y - 0.5, 0.44, 1, { stroke: COL.R, width: 1.8 });
        if (k === "L") for (let j = 0; j < 3; j++) g.arcPath(x, y - 0.4 + 0.4 * j, 0.2, -Math.PI / 2, Math.PI / 2, { stroke: COL.L, width: 1.8 });
        if (k === "C") { g.line([x - 0.42, y - 0.12], [x + 0.42, y - 0.12], { stroke: COL.C, width: 2 }); g.line([x - 0.42, y + 0.12], [x + 0.42, y + 0.12], { stroke: COL.C, width: 2 }); }
      };
      const vt = (k) => (k === "R" ? fmt(b.R, "Ω") : k === "L" ? fmt(b.L, "H") : fmt(b.C, "F"));
      const wire = (a, c) => g.line(a, c, { stroke: C.silk2, width: 1.4 });
      if (b.topo === "paralel") {
        wire([0, -2.4], [0, -1.6]); wire([0, 2.4], [0, 1.6]);
        wire([-1.1, -1.6], [1.1, -1.6]); wire([-1.1, 1.6], [1.1, 1.6]);
        on.forEach((k, i) => {
          const x = i ? 1.1 : -1.1;
          wire([x, -1.6], [x, -0.5]); wire([x, 0.5], [x, 1.6]);
          sym(k, x, 0);
          g.text(vt(k), [x + (i ? -0.1 : 0.1), i ? 2.05 : -2.05], { size: 0.42, color: COL[k] });
        });
        return;
      }
      const n = on.length, span = 4.8 / n;
      on.forEach((k, i) => {
        const y = -2.4 + span * (i + 0.5);
        wire([-0.9, y - span / 2], [-0.9, y - 0.52]); wire([-0.9, y + 0.52], [-0.9, y + span / 2]);
        sym(k, -0.9, y);
        g.text(vt(k), [0.95, y], { size: 0.46, color: COL[k] });
      });
      wire([0, -2.4], [-0.9, -2.4]); wire([0, 2.4], [-0.9, 2.4]);
    },
    info: (p) => (p.open ? `<b>${S.boxes[p.kind]}</b>` : `<b>${S.box} ${p.kind}</b>`),
  };
  // tek frekansta kutunun empedansını çözücüyle ölç (kalıcı rejimden başlatılmış 2 periyot)
  function measureBox(kind, f) {
    const p = { id: "X", kind, A: 1, f };
    const sim = Circuit.create({ method: "trap", elements: [{ type: "V", id: "V", n: ["a", "0"], wave: { type: "sin", amp: 1, freq: f } }, ...boxElements(p, "a", "0")] });
    sim.tranInit({ uic: true });
    const N = 100, hh = 1 / f / N, ts = [], vs = [], is = [];
    for (let k = 1; k <= 2 * N; k++) { sim.step(hh); if (k > N) { ts.push(sim.t); vs.push(sim.v("a")); is.push(-sim.i("V")); } }
    return AC.div(AC.phasorOf(ts, vs, f), AC.phasorOf(ts, is, f));
  }

  Demos.c4zbox = function (stage) {
    const schPane = h("div.pane", h("span.pane-title", S.sch));
    const zCv = h("canvas", { role: "img", "aria-label": S.zPlane });
    const zPane = h("div.pane", h("span.pane-title", S.zPlane), zCv);
    const sbox = h("div.c4-scope.c4-notrig");
    stage.append(h("div.split.c4-split", { style: { gridTemplateRows: "1.1fr 0.9fr" } }, h("div.c4-row.c4b-row-box", schPane, zPane), sbox));
    const A = 5, FMIN = 100, FMAX = 10000;
    let kind = "A", f = 1000, meas = null, locus = [], shown = 0, sweeping = null, open = false;
    const it = currentTrace(COL.I);
    const sc = Scope(sbox, {
      channels: [{ name: "KN1", vdiv: 2, pos: 0 }], tdiv: 1e-4, trigger: { ch: 0, level: 0, edge: "rise", mode: "auto" }, style: { flex: "1" },
      overlay: (ctx, api, g) => it.draw(ctx, api, g),
    });
    const def = clone(CIRCUITS.c4box);
    const X1 = def.parts.find((p) => p.id === "X1");
    function prep() {
      Object.assign(X1, { kind, f, A, open });
      const T = 1 / f;
      def.parts.find((p) => p.id === "V1").wave.freq = f;
      def.tran.h = T / 120; def.tran.rate = 2 * T;
      const z = AC.zAt(BOX[kind].topo, { A, R: BOX[kind].R, L: BOX[kind].L, C: BOX[kind].C, use: BOX[kind].use }, f);
      def.iRef = (A / AC.abs(z)) * 0.6;
      return def;
    }
    const pm = periodMeter(([V, I]) => { meas = AC.div(V, I); show(); });
    const sch = Schematic(schPane, prep(), {
      maxUnit: 30,
      overlay(ctx, s) { clamp(ctx, s, [6, 0]); },
      tick() { sc.draw(); },
    });
    sch.on("step", (t) => {
      const v = sch.v(sch.netOf("V1", "a")), i = -sch.sim.i("V1");
      sc.push(t, [v]); it.push(t, i); pm.push(t, f, [v, i]);
    });
    function scales() {
      sc.setTdiv(tdivFor((2.5 / f) / 10));
      const z = AC.zAt(BOX[kind].topo, { A, ...BOX[kind] }, f);
      it.setDiv(nice(A / AC.abs(z) / 3.2));
    }
    let rt = 0;
    function setF(v, hard) {
      f = v;
      clearTimeout(rt);
      rt = setTimeout(() => { sch.rebuild(prep()); sc.clear(); it.clear(); pm.reset(); meas = null; scales(); show(); }, hard ? 0 : 50);
    }
    function newBox() {
      locus = [];
      for (let k = 0; k <= 40; k++) { const ff = FMIN * Math.pow(FMAX / FMIN, k / 40); locus.push({ f: ff, z: measureBox(kind, ff) }); }
      shown = 0; open = false; openB.textContent = S.open;
      setF(f, true);
    }
    function show() {
      if (!meas) { mZ.val.textContent = mP.val.textContent = mR.val.textContent = mX.val.textContent = S.waiting; drawZ(); return; }
      const phi = AC.arg(meas);
      mZ.val.textContent = fmt(AC.abs(meas), "Ω");
      mP.val.textContent = `${angS(phi)} · ${S.dt} ${fmt(Math.abs(phi) / (2 * Math.PI * f), "s")}`;
      mR.val.textContent = fmt(meas.re, "Ω");
      mX.val.textContent = fmt(meas.im, "Ω");
      drawZ();
    }
    let zs;
    function drawZ() {
      if (!zs || !zs.w) return;
      const { ctx, w, h: H } = zs;
      ctx.clearRect(0, 0, w, H);
      const pts = locus.map((q) => q.z);
      if (meas) pts.push(meas);
      const ext = { x0: 0, x1: 0, y0: 0, y1: 0 };
      pts.forEach((z) => { ext.x1 = Math.max(ext.x1, z.re); ext.x0 = Math.min(ext.x0, z.re); ext.y1 = Math.max(ext.y1, z.im); ext.y0 = Math.min(ext.y0, z.im); });
      const pl = plane(ctx, { x: 0, y: 0, w, h: H }, ext, { xl: "R (Ω)", yl: "jX (Ω)", unit: "Ω", top: 14 });
      // iz
      if (shown > 1) {
        ctx.strokeStyle = rgba(C.gold, 0.75); ctx.lineWidth = 1.8; ctx.beginPath();
        for (let k = 0; k < shown; k++) { const q = locus[k]; const x = pl.X(q.z.re), y = pl.Y(q.z.im); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        [100, 1000, 10000].forEach((ff) => {
          const k = locus.findIndex((q) => Math.abs(Math.log10(q.f / ff)) < 0.03);
          if (k >= 0 && k < shown) {
            const q = locus[k], x = pl.X(q.z.re), y = pl.Y(q.z.im);
            ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
            tag(ctx, fmt(ff, "Hz", 2), x + 7, y, C.gold, "left", "middle", 10);
          }
        });
        if (shown >= locus.length) tag(ctx, S.locus, 10, H - 14, rgba(C.gold, 0.9), "left", "middle", 10);
      }
      if (!meas) return;
      const x = pl.X(meas.re), y = pl.Y(meas.im);
      dash(ctx, x, y, x, pl.oy, rgba(C.copper2, 0.7));
      dash(ctx, x, y, pl.ox, y, rgba(C.ch4, 0.6));
      arrow(ctx, pl.ox, pl.oy, x, pl.oy, COL.R, 2, 8);
      arrow(ctx, x, pl.oy, x, y, meas.im >= 0 ? COL.L : COL.C, 2, 8);
      const phi = AC.arg(meas);
      angArc(ctx, pl.ox, pl.oy, Math.min(40, Math.hypot(x - pl.ox, y - pl.oy) * 0.4), 0, phi, rgba(C.silk, 0.85), "φ");
      arrow(ctx, pl.ox, pl.oy, x, y, COL.Z, 3, 11);
      const right = x > w * 0.62, ty = clampY(y + (meas.im >= 0 ? -22 : 14), H);
      tag(ctx, `Z = ${rect(meas, "Ω")}`, x + (right ? -10 : 10), ty, C.silk, right ? "right" : "left", "middle", 11);
      tag(ctx, `  = ${pol(meas, "Ω")}`, x + (right ? -10 : 10), ty + 17, C.silk2, right ? "right" : "left", "middle", 10.5);
    }
    zs = canvas(zCv, drawZ);

    const bseg = seg(Object.keys(BOX).map((k) => [k, `${S.box} ${k}`]), kind, (k) => { stopSweep(); kind = k; newBox(); }, S.boxAria);
    const fs = slider({ label: S.freq, min: FMIN, max: FMAX, step: 0, value: f, log: true, fmt: (v) => fmt(v, "Hz"), oninput: (v) => { stopSweep(); setF(v); } });
    function stopSweep() { if (sweeping) { clearInterval(sweeping); sweeping = null; swB.textContent = S.sweep; } }
    const swB = btn(S.sweep, () => {
      if (sweeping) return stopSweep();
      shown = 0; swB.textContent = S.freeze;
      sweeping = setInterval(() => {
        shown++;
        const q = locus[Math.min(shown, locus.length) - 1];
        fs.set(q.f); setF(q.f, true);
        if (shown >= locus.length) stopSweep();
      }, 140);
    }, "primary");
    const openB = btn(S.open, () => {
      open = !open; openB.textContent = open ? S.close : S.open;
      sch.set("X1", "open", open);
    });
    const mZ = meter(S.zMag), mP = meter(S.zPh), mR = meter(S.zRe), mX = meter(S.zIm);
    stage.append(h("div.controls.c4-tight", bseg, fs, swB, openB, h("div.meters", mZ, mP, mR, mX)));
    newBox();
    return { enter() { sch.start(); }, leave() { sch.stop(); stopSweep(); }, sch };
  };
  G["empedans"] = [{ click: "=" + S.sweep }, { wait: 6500 }, { click: "=" + S.box + " B" }, { click: "=" + S.sweep }, { wait: 6500 }, { click: "=" + S.open }];

  /* =====================================================================
     4) Empedans hesaplayıcı: seri / paralel / karışık RLC, empedans düzlemi ve fazör diyagramı
     ===================================================================== */
  // mühendislik ekli sayı: "4,7k", "100n", "22 mH", "1e-6"
  const PRE = { p: 1e-12, n: 1e-9, u: 1e-6, "µ": 1e-6, "μ": 1e-6, m: 1e-3, "": 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };
  function parseEng(str) {
    const m = String(str).trim().replace(",", ".").match(/^\+?(\d*\.?\d+(?:[eE][+-]?\d+)?)\s*([pnuµμmkKMG]?)\s*(?:Ω|ohm|F|H|V|Hz)?$/);
    return m ? parseFloat(m[1]) * PRE[m[2]] : NaN;
  }
  const fmtIn = (v) => fmt(v, "", 3).replace(" ", "").trim();
  function entry({ label, unit, min, max, value, oninput }) {
    const inp = h("input.c4b-num", { type: "text", inputmode: "decimal", spellcheck: "false", "aria-label": label + " değeri", value: fmtIn(value) });
    const sl = slider({ label, min, max, step: 0, value, log: true, fmt: () => "", oninput: (v) => { inp.value = fmtIn(v); inp.classList.remove("bad"); oninput(v); } });
    sl.classList.add("c4b-entry");
    const commit = () => {
      const v = parseEng(inp.value);
      if (!(v > 0) || !isFinite(v)) { inp.classList.add("bad"); inp.title = S.bad; return; }
      const c = Math.max(min, Math.min(max, v));
      inp.classList.remove("bad"); inp.title = "";
      sl.set(c); inp.value = fmtIn(c); oninput(c);
    };
    inp.addEventListener("change", commit);
    inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); commit(); inp.blur(); } });
    sl.append(inp, h("span.c4b-unit", unit));
    sl.setValue = (v) => { sl.set(v); inp.value = fmtIn(v); };
    return sl;
  }
  const NAME = { R: "R", L: "L", C: "C", LC: "L∥C", RL: "R+L", V: "", I: "" };

  Demos.c4calc = function (stage) {
    const schPane = h("div.pane", h("span.pane-title", S.sch));
    const zCv = h("canvas", { role: "img", "aria-label": S.zDiag });
    const zPane = h("div.pane", h("span.pane-title", S.zDiag), zCv);
    const pCv = h("canvas", { role: "img", "aria-label": S.phDiag });
    let view = "V";
    const vseg = seg([["V", S.vView], ["I", S.iView]], view, (k) => { view = k; drawP(); }, S.phDiag);
    vseg.classList.add("c4b-pseg");
    const pPane = h("div.pane", h("span.pane-title", S.phDiag), pCv, vseg);
    const res = h("div.c4b-res");
    const resPane = h("div.pane.c4b-respane", h("span.pane-title", S.res), res);
    stage.append(h("div.split.c4b-calc", h("div.c4-row.c4b-row", schPane, zPane), h("div.c4-row.c4b-row", pPane, resPane)));

    const o = { A: 10, f: 1000, R: 100, L: 22e-3, C: 1e-6 };
    let topo = "seri";
    const use = { R: true, L: true, C: true };
    let an = AC.analyze(topo, { ...o, use }), meas = null;

    const pm = periodMeter(([V, I]) => { meas = AC.div(V, I); showRes(); });
    const sch = Schematic(schPane, CIRCUITS.c4calc(topo, an, o), { maxUnit: 30, tick() {} });
    sch.on("step", (t) => {
      const v = sch.v(sch.netOf("V1", "a")), i = -sch.sim.i("V1");
      pm.push(t, o.f, [v, i]);
    });
    let rt = 0;
    function update(now) {
      an = AC.analyze(topo, { ...o, use });
      clearTimeout(rt);
      const go = () => { sch.rebuild(CIRCUITS.c4calc(topo, an, o)); pm.reset(); meas = null; showRes(); };
      now ? go() : (rt = setTimeout(go, 70));
      drawZ(); drawP(); showRes();
    }

    /* --- empedans düzlemi --- */
    let zs;
    function drawZ() {
      if (!zs || !zs.w) return;
      const { ctx, w, h: H } = zs;
      ctx.clearRect(0, 0, w, H);
      const Z = an.Z;
      if (AC.isInf(Z)) { tag(ctx, `Z = ${S.inf}`, w / 2, H / 2, C.silk, "center"); return; }
      // seri zinciri: uç uca eklenen eleman empedansları
      let chain = [];
      if (topo === "seri") chain = an.on.map((k) => ({ k, z: an.parts[k].Z }));
      else if (topo === "r-lc") chain = [{ k: "R", z: an.parts.R.Z }, { k: "LC", z: AC.sub(Z, an.parts.R.Z) }];
      const ext = { x0: 0, x1: Z.re, y0: Math.min(0, Z.im), y1: Math.max(0, Z.im) };
      let acc = AC.cx(0, 0);
      chain.forEach((c) => { acc = AC.add(acc, c.z); ext.x1 = Math.max(ext.x1, acc.re); ext.y0 = Math.min(ext.y0, acc.im); ext.y1 = Math.max(ext.y1, acc.im); });
      const pl = plane(ctx, { x: 0, y: 0, w, h: H }, ext, { xl: "R (Ω)", yl: "jX (Ω)", unit: "Ω", top: 14 });
      const x = pl.X(Z.re), y = pl.Y(Z.im);
      if (chain.length > 1) {
        drawChain(ctx, pl, chain.map((c) => ({ k: c.k, v: c.z })), (c) => ["Z", NAME[c.k]]);
      } else {
        dash(ctx, x, y, x, pl.oy, rgba(C.copper2, 0.7));
        dash(ctx, x, y, pl.ox, y, rgba(Z.im >= 0 ? C.ch4 : C.ch2, 0.6));
        subTag(ctx, "R", "eş", x, pl.oy + (Z.im >= 0 ? 12 : -12), COL.R, "center");
        subTag(ctx, "X", "eş", pl.ox + 6, y, Z.im >= 0 ? COL.L : COL.C, "left");
      }
      angArc(ctx, pl.ox, pl.oy, Math.min(38, Math.hypot(x - pl.ox, y - pl.oy) * 0.4), 0, AC.arg(Z), rgba(C.silk, 0.85), "φ");
      arrow(ctx, pl.ox, pl.oy, x, y, COL.Z, 3.2, 12);
      const right = x > w * 0.6, ty = clampY(y + (Z.im >= 0 ? -22 : 14), H);
      tag(ctx, `Z = ${rect(Z, "Ω")}`, x + (right ? -12 : 12), ty, C.silk, right ? "right" : "left");
      tag(ctx, `  = ${pol(Z, "Ω")}`, x + (right ? -12 : 12), ty + 17, C.silk2, right ? "right" : "left", "middle", 10.5);
      if (topo === "paralel" || topo === "rl-c") tag(ctx, "1/Z = Σ 1/Zk", 10, H - 14, C.muted, "left", "middle", 10);
    }
    zs = canvas(zCv, drawZ);

    /* --- fazör diyagramı --- */
    let ps;
    function drawP() {
      if (!ps || !ps.w) return;
      const { ctx, w, h: H } = ps;
      ctx.clearRect(0, 0, w, H);
      const V = an.V, I = an.I;
      const chain = view === "V" ? an.chainV : an.chainI;
      const main = view === "V" ? V : I, other = view === "V" ? I : V;
      if (AC.isInf(main) || !isFinite(main.re)) return;
      const ext = { x0: 0, x1: 0, y0: 0, y1: 0 };
      let acc = AC.cx(0, 0);
      const pts = [main];
      chain.forEach((c) => { acc = AC.add(acc, c.v); pts.push(acc); });
      pts.forEach((z) => { ext.x0 = Math.min(ext.x0, z.re); ext.x1 = Math.max(ext.x1, z.re); ext.y0 = Math.min(ext.y0, z.im); ext.y1 = Math.max(ext.y1, z.im); });
      // diğer büyüklük yalnızca yönü için: boyu ana okun yarısı
      const od = AC.abs(other) > 0 ? AC.scale(other, (0.5 * AC.abs(main)) / AC.abs(other)) : AC.cx(0, 0);
      [od].forEach((z) => { ext.x0 = Math.min(ext.x0, z.re); ext.x1 = Math.max(ext.x1, z.re); ext.y0 = Math.min(ext.y0, z.im); ext.y1 = Math.max(ext.y1, z.im); });
      const u = view === "V" ? "V" : "A";
      const pl = plane(ctx, { x: 0, y: 0, w, h: H }, ext, { xl: "Re", yl: "Im", unit: u, top: 26 });
      // diğer büyüklüğün yönü (ince)
      arrow(ctx, pl.ox, pl.oy, pl.X(od.re), pl.Y(od.im), rgba(view === "V" ? COL.I : COL.V, 0.75), 1.6, 8);
      subTag(ctx, view === "V" ? "I" : "V", "(yön)", pl.X(od.re) + 6, pl.Y(od.im) + 10, view === "V" ? COL.I : COL.V, "left");
      angArc(ctx, pl.ox, pl.oy, 26, AC.arg(I), AC.arg(V), rgba(C.silk, 0.8), "φ");
      // zincir
      if (chain.length > 1) drawChain(ctx, pl, chain, (c) => [view, NAME[c.k]], 18);
      arrow(ctx, pl.ox, pl.oy, pl.X(main.re), pl.Y(main.im), view === "V" ? COL.V : COL.I, 3.2, 12);
      const mx = pl.X(main.re), my = pl.Y(main.im);
      tag(ctx, `${view} = ${pol(main, u)}`, mx + (mx > w * 0.6 ? -10 : 10), clampY(my + (main.im > 0 ? -12 : 14), H), view === "V" ? COL.V : COL.I, mx > w * 0.6 ? "right" : "left");
    }
    ps = canvas(pCv, drawP);

    /* --- sonuç tablosu --- */
    function showRes() {
      const Z = an.Z, I = an.I, rms = Math.SQRT1_2;
      const nat = AC.isInf(Z) || Math.abs(an.phi) < 0.0175 ? S.nature.res : an.phi > 0 ? S.nature.ind : S.nature.cap;
      // hücre içinde yalnızca " · " ayırıcılarında satır kırılsın
      const nb = (t) => String(t).replace(/ /g, "\u00a0").replace(/\u00a0·\u00a0/g, " · ");
      const row = (k, a, b, cls) => h("tr" + (cls ? "." + cls : ""), h("th", { html: k }), h("td", h("span", nb(a)), b ? h("span.b", nb(b)) : ""));
      const rows = [
        row("Z", rect(Z, "Ω"), pol(Z, "Ω"), "big"),
        row("I", `${pol(I, "A")}`, `rms ${fmt(AC.abs(I) * rms, "A")}`, "big"),
      ];
      ["R", "L", "C"].forEach((k) => {
        const p = an.parts[k];
        if (!p) return;
        const x = k === "R" ? "" : `<small>X ${fmt(AC.abs(p.Z), "Ω")}</small>`;
        rows.push(row(`<span style="color:${COL[k]}">${k}</span>${x}`, `V ${pol(p.V, "V")}`, `I ${pol(p.I, "A")}`));
      });
      rows.push(row("cos φ", `${num(an.pf, 3)} · φ ${angS(an.phi)}`, nat));
      rows.push(row("P · Q · S", `${fmt(an.P, "W")} · ${fmt(an.Q, "VAR")}`, `${fmt(an.S, "VA")}`));
      const sol = meas
        ? `${rect(meas, "Ω")}`
        : S.waiting;
      const diff = meas && !AC.isInf(Z) ? `fark %${num((100 * AC.abs(AC.sub(meas, Z))) / (AC.abs(Z) || 1), 2)}` : "";
      rows.push(row(S.solver, sol, diff, "sol"));
      res.replaceChildren(h("table", h("tbody", rows)));
    }

    /* --- denetimler --- */
    const useBtns = {};
    const tseg = seg(Object.entries(S.topo), topo, (k) => { topo = k; syncUse(); update(true); }, S.topoAria);
    const useWrap = h("div.seg.c4b-use", { role: "group", "aria-label": S.useAria });
    ["R", "L", "C"].forEach((k) => {
      const b = h("button", { type: "button", "aria-pressed": "true" }, k);
      b.addEventListener("click", () => {
        if (use[k] && Object.values(use).filter(Boolean).length === 1) { note.textContent = S.atLeast; return; }
        use[k] = !use[k]; note.textContent = ""; syncUse(); update(true);
      });
      useBtns[k] = b; useWrap.append(b);
    });
    function syncUse() {
      const free = topo === "seri" || topo === "paralel";
      ["R", "L", "C"].forEach((k) => {
        const on = free ? use[k] : true;
        useBtns[k].classList.toggle("on", on); useBtns[k].setAttribute("aria-pressed", on);
        useBtns[k].disabled = !free;
        ents[k].classList.toggle("off", !on);
      });
    }
    const note = h("span.c4-note", S.entryHint);
    const ents = {
      A: entry({ label: S.amp, unit: "V", min: 0.1, max: 400, value: o.A, oninput: (v) => { o.A = v; update(); } }),
      f: entry({ label: S.freq, unit: "Hz", min: 1, max: 1e6, value: o.f, oninput: (v) => { o.f = v; update(); } }),
      R: entry({ label: S.R, unit: "Ω", min: 0.1, max: 1e7, value: o.R, oninput: (v) => { o.R = v; update(); } }),
      L: entry({ label: S.L, unit: "H", min: 1e-7, max: 100, value: o.L, oninput: (v) => { o.L = v; update(); } }),
      C: entry({ label: S.C, unit: "F", min: 1e-12, max: 0.1, value: o.C, oninput: (v) => { o.C = v; update(); } }),
    };
    stage.append(h("div.controls.c4-tight.c4b-ctl", tseg, useWrap, note));
    stage.append(h("div.controls.c4-tight.c4b-ents", ents.A, ents.f, ents.R, ents.L, ents.C));
    syncUse();
    update(true);
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["empedans-hesap"] = [{ slide: "label:" + S.freq, to: 1074 }, { wait: 1800 }, { click: "=" + S.topo.paralel }, { wait: 1500 }, { click: "=" + S.iView }, { wait: 1500 }, { click: "=" + S.topo["r-lc"] }];

  /* =====================================================================
     5) Rezonans: seri RLC ve paralel LC tank; empedans eğrisi, Q, gerilim büyümesi
     ===================================================================== */
  Demos.c4res = function (stage) {
    const schPane = h("div.pane", h("span.pane-title", S.sch));
    const zCv = h("canvas", { role: "img", "aria-label": S.zf });
    const zPane = h("div.pane", h("span.pane-title", S.zf), zCv);
    const sbox = h("div.c4-scope.c4-notrig");
    stage.append(h("div.split.c4-split", { style: { gridTemplateRows: "1fr 1fr" } }, h("div.c4-row", schPane, zPane), sbox));
    const A = 1, Lv = 0.01, RS_TANK = 1, FMIN = 100, FMAX = 20000;
    let mode = "series", f = 1000, Cv = 1e-6, Rser = 10, Rfeed = 1000, meas = null;
    const R = () => (mode === "series" ? Rser : Rfeed);
    const f0 = () => AC.f0(Lv, Cv);
    const Z0 = () => Math.sqrt(Lv / Cv);
    const Q = () => (mode === "series" ? Z0() / Rser : 1 / (Z0() / Rfeed + RS_TANK / Z0()));
    function zOf(ff) {
      const w = 2 * Math.PI * ff;
      if (mode === "series") return AC.ser(AC.zR(Rser), AC.zL(Lv, w), AC.zC(Cv, w));
      return AC.ser(AC.zR(Rfeed), AC.par(AC.add(AC.zR(RS_TANK), AC.zL(Lv, w)), AC.zC(Cv, w)));
    }
    const sc = Scope(sbox, {
      channels: [{ name: "KN1", vdiv: 0.5, pos: 0 }, { name: "KN2", vdiv: 0.5, pos: 0 }], tdiv: 2e-4,
      trigger: { ch: 0, level: 0, edge: "rise", mode: "auto" }, style: { flex: "1" },
    });
    const def = clone(CIRCUITS.c4series);
    let vdiv = 0.5;
    const pm = periodMeter(([V, I, V2]) => {
      meas = { z: AC.abs(V) / AC.abs(I), i: AC.abs(I), v2: AC.abs(V2) };
      const want = vdivFor(Math.max(A, meas.v2));
      if (want !== vdiv) { vdiv = want; sc.setVdiv(0, vdiv); sc.setVdiv(1, vdiv); }
      show();
    });
    function retime() {
      const T = 1 / f;
      def.tran.h = T / 120; def.tran.rate = 6 * T;
      sc.setTdiv(tdivFor((2.5 * T) / 10));
      pm.reset();
    }
    const sch = Schematic(schPane, def, { maxUnit: 28, tick() { sc.draw(); } });
    sch.on("step", (t) => {
      const v = sch.v(sch.netOf("V1", "a")), v2 = sch.v(sch.netOf("C1", "a")), i = -sch.sim.i("V1");
      sc.push(t, [v, v2]); pm.push(t, f, [v, i, v2]);
    });
    function setMode(m) {
      mode = m;
      const d = clone(m === "series" ? CIRCUITS.c4series : CIRCUITS.c4tank);
      d.parts.find((p) => p.id === "C1").C = Cv;
      d.parts.find((p) => p.id === "R1").R = R();
      d.parts.find((p) => p.id === "V1").wave.freq = f;
      sch.rebuild(d);
      retime(); sc.clear(); meas = null;
      rS.style.display = m === "series" ? "" : "none"; rF.style.display = m === "series" ? "none" : "";
      show();
    }
    function setF(v) { f = v; sch.set("V1", "wave", { type: "sin", amp: A, freq: f }); retime(); show(); }
    function show() {
      mF0.val.textContent = fmt(f0(), "Hz");
      mQ.val.textContent = num(Q(), Q() < 10 ? 2 : 1);
      if (meas) {
        mZ.val.textContent = fmt(meas.z, "Ω");
        mI.val.textContent = fmt(meas.i, "A");
        mV2.val.textContent = `${fmt(meas.v2, "V")} (${num(meas.v2 / A, 1)}×)`;
      } else mZ.val.textContent = mI.val.textContent = mV2.val.textContent = S.waiting;
      drawZ();
    }
    let zs;
    function drawZ() {
      if (!zs || !zs.w) return;
      const { ctx, w, h: H } = zs;
      ctx.clearRect(0, 0, w, H);
      const l = 52, r = 14, t = 30, b = 24, gw = w - l - r, gh = H - t - b;
      const ZMIN = 1, ZMAX = 1e5;
      const X = (ff) => l + (Math.log(ff / FMIN) / Math.log(FMAX / FMIN)) * gw;
      const Y = (z) => t + (1 - Math.log(Math.min(ZMAX * 1.5, Math.max(ZMIN / 1.5, z)) / ZMIN) / Math.log(ZMAX / ZMIN)) * gh;
      ctx.strokeStyle = rgba(C.silk, 0.08); ctx.lineWidth = 1; ctx.beginPath();
      [100, 1000, 10000].forEach((d) => { for (let m = 1; m < 10; m++) { const ff = d * m; if (ff > FMAX) break; const x = Math.round(X(ff)) + 0.5; ctx.moveTo(x, t); ctx.lineTo(x, t + gh); } });
      for (let z = ZMIN; z <= ZMAX; z *= 10) { const y = Math.round(Y(z)) + 0.5; ctx.moveTo(l, y); ctx.lineTo(l + gw, y); }
      ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `500 10.5px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      [[100, "100 Hz"], [1000, "1 kHz"], [10000, "10 kHz"]].forEach(([ff, s]) => ctx.fillText(s, X(ff), t + gh + 5));
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let z = ZMIN; z <= ZMAX; z *= 10) ctx.fillText(fmt(z, "Ω", 1), l - 5, Y(z));
      ctx.save(); ctx.beginPath(); ctx.rect(l, t, gw, gh); ctx.clip();
      const curve = (fn, col, wd, d) => {
        ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.setLineDash(d || []); ctx.beginPath();
        for (let i = 0; i <= 240; i++) { const ff = FMIN * Math.pow(FMAX / FMIN, i / 240), x = X(ff), y = Y(fn(ff)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke(); ctx.setLineDash([]);
      };
      curve((ff) => AC.reactL(Lv, ff), rgba(C.ch4, 0.6), 1.4, [5, 4]);
      curve((ff) => AC.reactC(Cv, ff), rgba(C.ch2, 0.6), 1.4, [5, 4]);
      curve(() => R(), rgba(C.copper2, 0.45), 1.2, [2, 4]);
      curve((ff) => AC.abs(zOf(ff)), C.copper2, 2.6);
      ctx.restore();
      tag(ctx, "XL", X(FMAX * 0.6), Y(AC.reactL(Lv, FMAX * 0.6)) + 12, C.ch4, "right", "middle", 10.5);
      tag(ctx, "XC", X(FMIN * 1.5), Y(AC.reactC(Cv, FMIN * 1.5)) + 12, C.ch2, "left", "middle", 10.5);
      tag(ctx, "|Z|", X(FMAX * 0.95), Y(AC.abs(zOf(FMAX * 0.95))) - 12, C.copper2, "right", "middle", 10.5);
      const x0 = X(f0());
      dash(ctx, x0, t, x0, t + gh, rgba(C.gold, 0.7));
      tag(ctx, `f₀ ${fmt(f0(), "Hz")}`, x0 + 5, t + 2, C.gold, "left", "top", 10.5);
      const x = X(f);
      dash(ctx, x, t, x, t + gh, rgba(C.silk, 0.45), [2, 3]);
      const z = meas ? meas.z : AC.abs(zOf(f));
      ctx.fillStyle = C.amp; ctx.beginPath(); ctx.arc(x, Y(z), 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.mask; ctx.lineWidth = 2; ctx.stroke();
    }
    zs = canvas(zCv, drawZ);

    const mseg = seg([["series", S.series], ["tank", S.tank]], mode, (k) => setMode(k), S.modeAria);
    const fs = slider({ label: S.freq, min: FMIN, max: FMAX, step: 0, value: f, log: true, fmt: (v) => fmt(v, "Hz"), oninput: (v) => setF(v) });
    const cs = slider({ label: S.tune, min: 100e-9, max: 10e-6, step: 0, value: Cv, log: true, fmt: (v) => fmt(Circuit.nearestE(v), "F"),
      oninput: (v) => { Cv = Circuit.nearestE(v); sch.set("C1", "C", Cv); pm.reset(); show(); } });
    const rS = slider({ label: S.rS, min: 2.2, max: 220, step: 0, value: Rser, log: true, fmt: (v) => fmt(Circuit.nearestE(v), "Ω"),
      oninput: (v) => { Rser = Circuit.nearestE(v); sch.set("R1", "R", Rser); pm.reset(); show(); } });
    const rF = slider({ label: S.rFeed, min: 100, max: 10000, step: 0, value: Rfeed, log: true, fmt: (v) => fmt(Circuit.nearestE(v), "Ω"),
      oninput: (v) => { Rfeed = Circuit.nearestE(v); sch.set("R1", "R", Rfeed); pm.reset(); show(); } });
    const toB = btn(S.toF0, () => { fs.set(f0()); setF(f0()); }, "primary");
    const mF0 = meter(S.f0), mQ = meter(S.q), mZ = meter(S.zNow), mI = meter(S.iAmp), mV2 = meter(S.vc);
    stage.append(h("div.controls.c4-tight", mseg, fs, toB, cs, rS, rF, h("div.meters", mF0, mQ, mZ, mI, mV2)));
    setMode("series");
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["rezonans"] = [{ click: "=" + S.toF0 }, { wait: 3000 }, { slide: "label:" + S.rS, to: 47 }, { wait: 2000 }, { click: "=" + S.tank }, { wait: 1500 }, { click: "=" + S.toF0 }];
})();
