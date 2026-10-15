/* 4. bölüm deneyleri: kondansatör, bobin, AC ve frekans, RC filtre.
   Hepsi geçici rejim benzetimidir; ekrandaki her sayı benzetimden ölçülür. */
(function () {
  window.STR = window.STR || {};
  const S = STR.ch04;
  const { C, FONT, h, slider, seg, btn, canvas, num, rgba } = L;
  const fmt = (v, u, d) => Circuit.fmt(v, u, d);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  window.GUIDES = window.GUIDES || {};
  const G = window.GUIDES;
  const TSEQ = Scope.TSEQ;
  const tdivFor = (t) => TSEQ.find((v) => v >= t * 0.999) || TSEQ[TSEQ.length - 1];
  const tdivNear = (t) => TSEQ.reduce((b, v) => (Math.abs(Math.log(v / t)) < Math.abs(Math.log(b / t)) ? v : b), TSEQ[0]);
  const VSEQ = Scope.VSEQ;
  // çok küçük değerleri (ör. 1e-15 V) sıfır göster
  const fz = (v, u, d) => fmt(Math.abs(v) < 1e-6 ? 0 : v, u, d);
  const meter = (label) => { const b = h("b", "—"); const m = h("div.meter", h("small", label), b); m.val = b; return m; };

  /* ---------------- özel parçalar ---------------- */
  const P = Schematic.PARTS;
  // iki konumlu anahtar (SPDT). Ortak uç w; "Şarj" konumu (closed) w–a, "Deşarj" w–b.
  // Çözücüde 3 uçlu potansiyometre gibi: biri 1 mΩ, diğeri 1 TΩ.
  P.c4spdt = {
    pins: { a: [-2, -1], w: [2, 0], b: [-2, 1] }, box: [-1.6, -1.7, 1.4, 1.7], interactive: "toggle", hide: 0,
    paths: [{ term: 0, pts: [[-2, -1], [-1, -1]] }, { term: 1, pts: [[2, 0], [1, 0]] }, { term: 2, pts: [[-2, 1], [-1, 1]] }],
    elPins: ["a", "w", "b"],
    el: (p, n) => [{ type: "POT", id: p.id, n: [n("a"), n("w"), n("b")], R: 1e12, pos: p.closed ? 0 : 1 }],
    draw(g, p) {
      g.lead([-2, -1], [-1, -1], "a"); g.lead([-2, 1], [-1, 1], "b"); g.lead([2, 0], [1, 0], "w");
      g.circle(-1, -1, 0.16, { fill: C.silk }); g.circle(-1, 1, 0.16, { fill: C.silk }); g.circle(1, 0, 0.16, { fill: C.silk });
      g.line([1, 0], p.closed ? [-0.95, -0.92] : [-0.95, 0.92], { stroke: C.copper2, width: 2.8 });
      g.text(S.charge.toLocaleLowerCase("tr"), [-0.4, -1.5], { size: 0.5, color: p.closed ? C.copper2 : C.muted });
      g.text(S.discharge.toLocaleLowerCase("tr"), [-0.4, 1.5], { size: 0.5, color: p.closed ? C.muted : C.copper2 });
    },
    info: (p) => `<b>${p.closed ? S.charge : S.discharge}</b>`,
  };
  // ısıl eylemsizlikli lamba: parlaklık p._pf (benzetim zamanında süzülmüş güç) ile çizilir
  P.c4lamp = {
    ...P.lamp,
    el: (p, n) => [{ type: "R", id: p.id, n: [n("a"), n("b")], R: p.R }],
    draw(g, p) {
      g.lead([-2, 0], [-0.85, 0], "a"); g.lead([0.85, 0], [2, 0], "b");
      const lv = Math.min(1.2, (p._pf || 0) / (p.Pnom || 1));
      if (lv > 0.02) g.glow(0, 0, 1 + 2.2 * lv, { color: "#ffd98a", a: Math.min(0.9, lv) });
      g.circle(0, 0, 0.85, { stroke: C.silk, fill: lv > 0.02 ? rgba("#ffd98a", Math.min(0.8, lv)) : C.mask2 });
      g.line([-0.6, -0.6], [0.6, 0.6], { stroke: C.silk, width: 1.8 }); g.line([-0.6, 0.6], [0.6, -0.6], { stroke: C.silk, width: 1.8 });
    },
  };

  // yardımcı: osiloskop kutusu
  function scopeBox() { return h("div.c4-scope"); }
  function dashH(ctx, x0, x1, y, col, dash = [5, 4]) { ctx.strokeStyle = col; ctx.setLineDash(dash); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.setLineDash([]); }
  function dashV(ctx, x, y0, y1, col, dash = [5, 4]) { ctx.strokeStyle = col; ctx.setLineDash(dash); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); ctx.setLineDash([]); }
  function tag(ctx, text, x, y, col, align = "left", base = "bottom") {
    ctx.font = `600 11px ${FONT.mono}`; ctx.textAlign = align; ctx.textBaseline = base;
    const w = ctx.measureText(text).width, bx = align === "left" ? x : align === "right" ? x - w : x - w / 2;
    const by = base === "bottom" ? y - 15 : base === "top" ? y : y - 7.5;
    ctx.fillStyle = "rgba(6,21,15,0.82)"; ctx.fillRect(bx - 3, by, w + 6, 15);
    ctx.fillStyle = col; ctx.fillText(text, x, y + (base === "bottom" ? -2 : base === "top" ? 2 : 0));
  }

  /* =====================================================================
     1) Kondansatör: RC şarj / deşarj, levhalardaki yük, τ işaretleri
     ===================================================================== */
  Demos.c4cap = function (stage) {
    const schPane = h("div.pane", h("span.pane-title", S.sch));
    const plCv = h("canvas", { role: "img", "aria-label": S.plates });
    const plPane = h("div.pane.c4-plates", h("span.pane-title", S.plates), plCv);
    const sbox = scopeBox();
    const row = h("div.c4-row.c4-row-cap", schPane, plPane);
    stage.append(h("div.split.c4-split", { style: { gridTemplateRows: "1.2fr 1fr" } }, row, sbox));

    const def = clone(CIRCUITS.c4rc);
    const Vb = def.parts.find((p) => p.id === "B1").V;
    let R = 10000, Cap = 100e-6;
    let ev = { none: true, t: 0, v0: 0, target: 0, charging: false, done: true, vtau: null };
    let lastClosed = false, prevT = 0, prevV = 0;
    const net = () => sch.netOf("C1", "a");

    const sc = Scope(sbox, {
      channels: [{ name: "KN1", vdiv: 1, pos: -2.5 }], tdiv: 1, trigger: { mode: "none" }, style: { flex: "1" },
      overlay(ctx, api, g) {
        if (api.t0 == null || ev.none) return;
        const tau = R * Cap, ch = api.channels[0];
        const x0 = g.m, x1 = g.m + g.gw;
        // %63 hedef çizgisi (şarjda yukarı, deşarjda %36,8)
        const lvl = ev.v0 + 0.632 * (ev.target - ev.v0);
        const y = api.toY(lvl, ch);
        dashH(ctx, x0, x1, y, rgba(C.copper2, 0.7));
        tag(ctx, (ev.charging ? S.pct63 : S.pct37) + " · " + fmt(lvl, "V"), x0 + 14, y, C.copper2);
        // τ, 2τ … 5τ işaretleri
        for (let k = 1; k <= 5; k++) {
          const x = api.toX(ev.t + k * tau);
          if (x < x0 || x > x1) continue;
          dashV(ctx, x, g.m, g.m + g.gh, rgba(C.silk, k === 1 ? 0.55 : 0.22), k === 1 ? [5, 4] : [2, 5]);
          tag(ctx, k === 1 ? "τ" : k + "τ", x, g.m + g.gh - 4, k === 1 ? C.silk : C.muted, "center");
        }
        // başlangıç işareti
        const xs = api.toX(ev.t);
        if (xs >= x0 && xs <= x1) dashV(ctx, xs, g.m, g.m + g.gh, rgba(C.ch1, 0.35), [2, 3]);
        if (ev.vtau != null) {
          const xt = api.toX(ev.t + tau), yt = api.toY(ev.vtau, ch);
          if (xt >= x0 && xt <= x1) { ctx.fillStyle = C.amp; ctx.beginPath(); ctx.arc(xt, yt, 5, 0, Math.PI * 2); ctx.fill(); }
        }
      },
    });

    const sch = Schematic(schPane, def, {
      maxUnit: 34,
      tick() { drawPlates(); sc.draw(); },
    });

    function newEvent(closed) {
      const v = sch.v(net());
      ev = { t: sch.sim.t, v0: v, target: closed ? Vb : 0, charging: closed, done: false, vtau: null };
      mTau.val.textContent = S.waiting;
    }
    sch.on("step", (t) => {
      const v = sch.v(net());
      sc.push(t, [v]);
      if (!ev.done) {
        const tt = ev.t + R * Cap;
        if (t >= tt) {
          ev.vtau = prevV + ((v - prevV) * (tt - prevT)) / ((t - prevT) || 1);
          ev.done = true;
          const pct = (ev.vtau - ev.v0) / ((ev.target - ev.v0) || 1);
          const rem = ev.charging ? pct : 1 - pct;
          mTau.val.textContent = `${fmt(ev.vtau, "V")} (%${num(rem * 100, 1)})`;
        }
      }
      prevT = t; prevV = v;
    });
    sch.on("change", () => {
      const cl = !!sch.part("S1").closed;
      if (cl !== lastClosed) { lastClosed = cl; sw.set(cl ? "on" : "off"); newEvent(cl); }
      mV.val.textContent = fz(sch.v(net()), "V");
    });

    // zaman ölçeği: τ küçükse ağır çekim (τ ekranda en az 0,5 s sürsün)
    function retime(restart) {
      const tau = R * Cap;
      const rate = Math.min(1, tau / 0.5);
      def.tran.rate = rate;
      def.tran.h = tau / 150;
      sc.setTdiv(tdivFor(tau));
      mT.val.textContent = fmt(tau, "s");
      slowEl.textContent = rate < 1 ? S.slow(num(1 / rate, 0)) : S.realtime;
      if (restart) newEvent(lastClosed);
    }

    const sw = seg([["on", S.charge], ["off", S.discharge]], "off", (k) => sch.set("S1", "closed", k === "on"), S.chargeAria);
    const rs = slider({ label: S.R, min: 1000, max: 22000, step: 0, value: R, log: true, fmt: (v) => fmt(Circuit.nearestE(v), "Ω"),
      oninput: (v) => { R = Circuit.nearestE(v); sch.set("R1", "R", R); retime(true); } });
    const cs = slider({ label: S.C, min: 1e-6, max: 100e-6, step: 0, value: Cap, log: true, fmt: (v) => fmt(Circuit.nearestE(v), "F"),
      oninput: (v) => { Cap = Circuit.nearestE(v); sch.set("C1", "C", Cap); retime(true); } });
    const mV = meter(S.vc), mT = meter(S.tau), mTau = meter(S.atTau);
    const slowEl = h("span.c4-note");
    stage.append(h("div.controls.c4-tight", sw, rs, cs, h("div.meters", mV, mT, mTau), slowEl));
    retime(false);

    // levhalar: + yükler üst levhada, − yükler alt levhada; sayıları gerilimle orantılı
    let ps;
    function drawPlates() {
      if (!ps || !ps.w) return;
      const { ctx, w, h: H } = ps;
      ctx.clearRect(0, 0, w, H);
      const v = sch.v(net()), frac = Math.max(0, Math.min(1, v / Vb));
      const cx = w / 2, pw = Math.min(w * 0.72, 260), gap = Math.min(H * 0.26, 80), th = 9;
      const yT = H * 0.44 - gap / 2, yB = H * 0.44 + gap / 2;
      // alan çizgileri
      const nf = 7;
      for (let i = 0; i < nf; i++) {
        const x = cx - pw / 2 + (pw * (i + 0.5)) / nf;
        ctx.strokeStyle = rgba(C.gold, 0.08 + 0.5 * frac); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x, yT + th / 2 + 14); ctx.lineTo(x, yB - th / 2 - 16); ctx.stroke();
        if (frac > 0.04) { ctx.fillStyle = rgba(C.gold, 0.08 + 0.5 * frac); ctx.beginPath(); ctx.moveTo(x - 4, yB - th / 2 - 22); ctx.lineTo(x + 4, yB - th / 2 - 22); ctx.lineTo(x, yB - th / 2 - 15); ctx.fill(); }
      }
      // levhalar ve uçları
      ctx.fillStyle = C.copper; ctx.fillRect(cx - pw / 2, yT - th / 2, pw, th); ctx.fillRect(cx - pw / 2, yB - th / 2, pw, th);
      ctx.strokeStyle = L.vcolor(v, 0, Vb); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, yT - th / 2); ctx.lineTo(cx, yT - 34); ctx.stroke();
      ctx.strokeStyle = L.vcolor(0, 0, Vb); ctx.beginPath(); ctx.moveTo(cx, yB + th / 2); ctx.lineTo(cx, yB + 34); ctx.stroke();
      // yükler
      const N = 14, n = Math.round(N * frac);
      ctx.font = `700 15px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (let i = 0; i < n; i++) {
        const x = cx - pw / 2 + (pw * (i + 0.5)) / N;
        ctx.fillStyle = C.v1; ctx.fillText("+", x, yT + th / 2 + 8);
        ctx.fillStyle = C.v0; ctx.fillText("−", x, yB - th / 2 - 9);
      }
      ctx.font = `600 12px ${FONT.mono}`; ctx.fillStyle = C.silk2; ctx.textBaseline = "top";
      const q = Cap * v;
      ctx.fillText(`${S.charge2} = ${fmt(Cap, "F")} · ${fz(v, "V")}`, cx, yB + 44);
      ctx.fillStyle = C.copper2; ctx.font = `700 13px ${FONT.mono}`;
      ctx.fillText(`Q = ${fz(q, "C")}`, cx, yB + 62);
    }
    ps = canvas(plCv, drawPlates);

    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["kondansator"] = [{ click: "=" + S.charge }, { wait: 3200 }, { click: "=" + S.discharge }, { wait: 2500 }, { slide: "label:" + S.R, to: 2200 }, { click: "=" + S.charge }];

  /* =====================================================================
     2) Bobin: anahtar açılınca gerilim sıçraması ve serbest geçiş diyodu
     ===================================================================== */
  Demos.c4coil = function (stage) {
    const schPane = h("div.pane", h("span.pane-title", S.sch));
    const sbox = scopeBox();
    stage.append(h("div.split.c4-split", { style: { gridTemplateRows: "0.95fr 1.05fr" } }, schPane, sbox));

    const base = clone(CIRCUITS.c4coil), dio = CIRCUITS.c4coilDiode;
    const Vb = base.parts.find((p) => p.id === "B1").V;
    let diode = false, closed = false;
    let peak = null, peakT = 0, sparkUntil = 0, lastSparkV = 0;
    // bobin akımı geçmişi (osiloskopta ikinci iz olarak çizilir)
    const CAP = 30000, it = new Float64Array(CAP), iv = new Float64Array(CAP);
    let ih = 0, inn = 0;
    const I_DIV = 0.025;

    const sc = Scope(sbox, {
      channels: [{ name: "KN1", vdiv: 50, pos: -3 }], tdiv: 5e-3, trigger: { mode: "none" }, style: { flex: "1" },
      overlay(ctx, api, g) {
        if (api.t0 == null) return;
        const ch = api.channels[0];
        const y0 = api.toY(0, ch);
        // akım izi: aynı sıfır çizgisi, 25 mA/bölme
        ctx.save(); ctx.beginPath(); ctx.rect(g.m, g.m, g.gw, g.gh); ctx.clip();
        ctx.strokeStyle = C.amp; ctx.lineWidth = 1.6; ctx.setLineDash([]);
        ctx.beginPath();
        let started = false, lx = -1e9;
        for (let k = 0; k < inn; k++) {
          const j = (ih - inn + k + CAP) % CAP;
          const x = api.toX(it[j]);
          if (x < g.m - 2 || (started && x - lx < 0.6 && k < inn - 1)) continue;
          const y = y0 - (iv[j] / I_DIV) * g.dy;
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
          lx = x;
        }
        ctx.stroke(); ctx.restore();
        tag(ctx, `— ${S.iTrace} ${fmt(I_DIV, "A")}/b`, g.m + g.gw - 6, g.m + 34, C.amp, "right");
        // tepe etiketi
        if (peak != null) {
          const x = api.toX(peakT);
          if (x > g.m && x < g.m + g.gw) {
            const y = api.toY(peak, ch);
            const yy = Math.max(g.m + 24, Math.min(g.m + g.gh - 4, y));
            const txt = (y < g.m ? "↑ " : "") + fmt(peak, "V", 3);
            const right = x > g.m + g.gw - 90;
            tag(ctx, txt, right ? x - 8 : x + 8, yy + 8, C.ch1, right ? "right" : "left", "middle");
          }
        }
      },
    });

    let sch;
    function makeDef() {
      const d = clone(base);
      d.parts.find((p) => p.id === "S1").closed = closed;
      if (diode) { d.parts.push(...clone(dio.parts)); d.wires.push(...clone(dio.wires)); }
      return d;
    }
    const swPos = () => { const a = sch.screenOf([14, 4]), b = sch.screenOf([14, 6]); return [a, b]; };
    sch = Schematic(schPane, makeDef(), {
      maxUnit: 38,
      overlay(ctx, s) {
        // röle bobini çerçevesi
        const a = s.screenOf([1.5, 1.3]), b = s.screenOf([11.5, 4.5]);
        ctx.strokeStyle = rgba(C.silk, 0.35); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
        ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); ctx.setLineDash([]);
        ctx.font = `600 ${Math.max(10, 0.5 * s.unit)}px ${FONT.display}`; ctx.fillStyle = C.muted; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        ctx.fillText(S.coilBox, b[0] - 5, b[1] - 3);
        // kıvılcım
        const now = performance.now();
        if (now < sparkUntil) {
          const [p, q] = swPos(), u = s.unit;
          const fade = Math.min(1, (sparkUntil - now) / 300);
          ctx.strokeStyle = `rgba(255,236,170,${0.9 * fade})`; ctx.lineWidth = 2; ctx.shadowColor = "#ffd27a"; ctx.shadowBlur = 14;
          for (let k = 0; k < 2; k++) {
            ctx.beginPath();
            const segs = 6;
            for (let i = 0; i <= segs; i++) {
              const t = i / segs, x = p[0] + 0.55 * u + (i % 2 ? 1 : -1) * (0.25 + Math.random() * 0.35) * u * (i && i < segs ? 1 : 0), y = p[1] + (q[1] - p[1]) * t;
              i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
        }
      },
      tick() { sc.draw(); },
    });
    const netX = () => sch.netOf("S1", "a");

    sch.on("step", (t) => {
      const v = sch.v(netX()), i = sch.sim.i("L1");
      sc.push(t, [v]);
      it[ih] = t; iv[ih] = i; ih = (ih + 1) % CAP; if (inn < CAP) inn++;
      if (!closed && peak != null && v > peak) { peak = v; peakT = t; }
      if (v - Vb > 30) { sparkUntil = performance.now() + 650; lastSparkV = Math.max(lastSparkV, v); }
    });
    sch.on("change", () => {
      const cl = !!sch.part("S1").closed;
      if (cl !== closed) {
        closed = cl;
        if (!cl) { peak = sch.v(netX()); peakT = sch.sim.t; lastSparkV = 0; }
        swb.textContent = closed ? S.swOpen : S.swClose;
        swb.classList.toggle("primary", !closed);
      }
      mI.val.textContent = fmt(Math.abs(sch.sim.i("L1")), "A");
      mV.val.textContent = fz(sch.v(netX()), "V");
      if (peak != null) mP.val.textContent = fmt(peak, "V");
      const sparking = performance.now() < sparkUntil;
      flag.textContent = sparking ? S.spark(fmt(lastSparkV, "V")) : diode && peak != null && peak > Vb + 0.2 && sch.sim.t - peakT < 0.03 ? S.clamp(fmt(peak, "V")) : "";
      flag.classList.toggle("ok", !sparking);
    });

    const swb = btn(S.swClose, () => sch.set("S1", "closed", !closed), "primary");
    const dseg = seg([["off", S.noDiode], ["on", S.diode]], "off", (k) => {
      diode = k === "on";
      sch.rebuild(makeDef());
      peak = null; inn = 0; sc.clear();
      sc.setVdiv(0, diode ? 5 : 50);
    });
    const mI = meter(S.iCoil), mV = meter(S.vSw), mP = meter(S.spike);
    const flag = h("span.flag");
    stage.append(h("div.controls.c4-tight", swb, dseg, h("div.meters", mI, mV, mP), flag));

    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  // anahtar düğmesinin yazısı duruma göre değişir ("Anahtarı kapat" / "Anahtarı aç"); önek ile bulunur
  G["bobin"] = [{ click: "Anahtarı" }, { wait: 1800 }, { click: "Anahtarı" }, { wait: 1800 }, { click: "=" + S.diode }, { click: "Anahtarı" }];

  /* =====================================================================
     3) AC ve frekans: sinüs, tepe, tepeden tepeye, RMS; eşdeğer DC lamba
     ===================================================================== */
  Demos.c4ac = function (stage) {
    const schPane = h("div.pane", h("span.pane-title", S.sch));
    const sbox = scopeBox();
    sbox.classList.add("c4-notrig");
    stage.append(h("div.split.c4-split", { style: { gridTemplateRows: "0.9fr 1.1fr" } }, schPane, sbox));
    const def = clone(CIRCUITS.c4ac);
    const src = def.parts.find((p) => p.id === "V1");
    let f = src.wave.freq, A = src.wave.amp, slow = false;
    // periyot başına ölçüm
    let acc = null, lastCross = null, prevV = 0, meas = null;
    const TH = 0.04; // lamba telinin ısıl zaman sabiti (s, benzetim zamanı)

    const sc = Scope(sbox, {
      channels: [{ name: "KN1", vdiv: 2, pos: 0 }, { name: "KN2", vdiv: 2, pos: 0 }], tdiv: 0.1,
      trigger: { ch: 0, level: 0, edge: "rise", mode: "auto" }, pre: 0.1, style: { flex: "1" },
      overlay(ctx, api, g) {
        if (api.t0 == null || !meas) return;
        const ch = api.channels[0], x0 = g.m, x1 = g.m + g.gw;
        const yp = api.toY(meas.vmax, ch), yn = api.toY(meas.vmin, ch), yr = api.toY(meas.rms, ch);
        dashH(ctx, x0, x1, yp, rgba(C.ch1, 0.45)); dashH(ctx, x0, x1, yn, rgba(C.ch1, 0.25));
        tag(ctx, "Vp " + fmt(meas.vmax, "V"), x0 + 14, yp, C.ch1);
        tag(ctx, "Vrms " + fmt(meas.rms, "V"), x0 + 14, yr, C.ch2);
        // periyot ve tepeden tepeye okları (tetik noktasından itibaren)
        const win = 10 * api.tdiv, tt = api.t0 + win * 0.1;
        const xa = api.toX(tt), xb = api.toX(tt + meas.T);
        if (xb < x1) {
          const y = g.m + g.gh - 26;
          ctx.strokeStyle = C.silk; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
          [[xa, 1], [xb, -1]].forEach(([x, d]) => { ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 7 * d, y - 4); ctx.lineTo(x + 7 * d, y + 4); ctx.fillStyle = C.silk; ctx.fill(); });
          tag(ctx, "T = " + fmt(meas.T, "s"), (xa + xb) / 2, y - 6, C.silk, "center");
          const xv = api.toX(tt + meas.T * 0.75 + meas.T * 0.5);
          if (xv < x1 - 30) {
            ctx.beginPath(); ctx.moveTo(xv, yp); ctx.lineTo(xv, yn); ctx.stroke();
            tag(ctx, "Vpp " + fmt(meas.vmax - meas.vmin, "V"), xv + 6, (yp + yn) / 2, C.silk, "left", "middle");
          }
        }
      },
    });
    const sch = Schematic(schPane, def, { maxUnit: 28, tick() { sc.draw(); } });
    const la1 = sch.part("La1"), la2 = sch.part("La2");
    la1._pf = 0; la2._pf = 0;

    sch.on("step", (t) => {
      const sim = sch.sim, h0 = def.tran.h;
      const v = sim.v(sch.netOf("V1", "a")), vd = sim.v(sch.netOf("B1", "a"));
      sc.push(t, [v, vd]);
      const p1 = Math.abs(sim.p("La1")), p2 = Math.abs(sim.p("La2"));
      const k = Math.min(1, h0 / TH);
      la1._pf += (p1 - la1._pf) * k; la2._pf += (p2 - la2._pf) * k;
      if (acc) { acc.n++; acc.dt += h0; acc.v2 += v * v * h0; acc.p += p1 * h0; acc.vmax = Math.max(acc.vmax, v); acc.vmin = Math.min(acc.vmin, v); }
      if (prevV < 0 && v >= 0) {
        const tc = t - h0 * (v / ((v - prevV) || 1));
        if (acc && lastCross != null && acc.n > 8) {
          const T = tc - lastCross;
          meas = { T, f: 1 / T, rms: Math.sqrt(acc.v2 / acc.dt), vmax: acc.vmax, vmin: acc.vmin, pac: acc.p / acc.dt };
          if (Math.abs(sch.part("B1").V - meas.rms) > 1e-3) sch.set("B1", "V", meas.rms);
        }
        lastCross = tc; acc = { n: 0, dt: 0, v2: 0, p: 0, vmax: -1e9, vmin: 1e9 };
      }
      prevV = v;
    });
    sch.on("change", () => {
      if (!meas) return;
      mF.val.textContent = `${fmt(meas.f, "Hz")} · ${fmt(meas.T, "s")}`;
      mP.val.textContent = `${fmt(meas.vmax, "V")} · ${fmt(meas.vmax - meas.vmin, "V")}`;
      mR.val.textContent = fmt(meas.rms, "V");
      mPw.val.textContent = `${fmt(meas.pac, "W")} · ${fmt(Math.abs(sch.sim.p("La2")), "W")}`;
    });

    function retime() {
      const T = 1 / f;
      def.tran.h = Math.min(5e-3, Math.max(1e-4, T / 100));
      def.tran.rate = slow ? 1 / 25 : 1;
      sc.setTdiv(tdivNear((2.4 * T) / 10));
      acc = null; lastCross = null;
    }
    function setWave() {
      sch.set("V1", "wave", { type: "sin", amp: A, freq: f });
      // ilk ölçüm gelene kadar DC pil tepe/√2 (kaynağın değerinden)
      if (!meas) sch.set("B1", "V", A / Math.SQRT2);
      const vd = VSEQ.find((v) => v >= A / 3.4) || VSEQ[VSEQ.length - 1];
      sc.setVdiv(0, vd); sc.setVdiv(1, vd);
      retime();
     
    }
    const fs = slider({ label: S.freq, min: 0.5, max: 100, step: 0.1, value: f, log: true, fmt: (v) => fmt(v, "Hz"), oninput: (v) => { f = v; setWave(); } });
    const as = slider({ label: S.amp, min: 1, max: 10, step: 0.1, value: A, fmt: (v) => fmt(v, "V"), oninput: (v) => { A = v; setWave(); } });
    const mainsB = btn(S.mains, () => { f = 50; fs.set(50); setWave(); });
    const slowB = btn(S.slowmo, () => { slow = !slow; slowB.classList.toggle("on", slow); retime(); });
    const mF = meter(S.freq + " · " + S.period), mP = meter(S.vp), mR = meter(S.vrms), mPw = meter(S.pw);
    stage.append(h("div.controls.c4-tight", fs, as, mainsB, slowB, h("div.meters", mF, mP, mR, mPw)));
    setWave();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["ac-frekans"] = [{ slide: "label:" + S.amp, to: 6 }, { wait: 600 }, { slide: "label:" + S.freq, to: 1 }, { wait: 2600 }, { click: "=" + S.mains }, { click: "=" + S.slowmo }];

  /* =====================================================================
     4) RC alçak geçiren filtre: osiloskop, ölçülen Bode eğrisi, Web Audio
     ===================================================================== */
  // tek frekansta benzetimle kazanç ölçümü: 3 periyot, son periyotta tek frekanslı DFT
  function measureGain(R, Cv, f) {
    const sim = Circuit.create({
      method: "be",
      elements: [
        { type: "V", id: "V", n: ["in", "0"], wave: { type: "sin", amp: 1, freq: f, phase: Math.PI / 2 } },
        { type: "R", id: "R", n: ["in", "out"], R },
        { type: "C", id: "C", n: ["out", "0"], C: Cv },
      ],
    });
    sim.tranInit({ uic: true });
    const N = 120, T = 1 / f, hh = T / N, w = 2 * Math.PI * f;
    let ir = 0, ii = 0, or = 0, oi = 0;
    for (let k = 1; k <= 3 * N; k++) {
      sim.step(hh);
      if (k > 2 * N) {
        const t = sim.t, c = Math.cos(w * t), s = Math.sin(w * t);
        const vi = sim.v("in"), vo = sim.v("out");
        ir += vi * c; ii -= vi * s; or += vo * c; oi -= vo * s;
      }
    }
    const den = ir * ir + ii * ii;
    const hr = (or * ir + oi * ii) / den, hi = (oi * ir - or * ii) / den;
    return { gain: Math.hypot(hr, hi), phase: Math.atan2(hi, hr) };
  }

  Demos.c4lpf = function (stage) {
    const schPane = h("div.pane", h("span.pane-title", S.sch));
    const bCv = h("canvas", { role: "img", "aria-label": S.bode });
    const bPane = h("div.pane", h("span.pane-title", S.bode), bCv);
    const sbox = scopeBox();
    sbox.classList.add("c4-notrig");
    stage.append(h("div.split.c4-split", { style: { gridTemplateRows: "1fr 1.05fr" } }, h("div.c4-row", schPane, bPane), sbox));

    const def = clone(CIRCUITS.c4lpf);
    const Cv = def.parts.find((p) => p.id === "C1").C;
    let f = def.parts.find((p) => p.id === "V1").wave.freq, R = 1000;
    let sweep = [], live = null;
    let acc = null, prevV = 0, lastCross = null;
    const FMIN = 10, FMAX = 20000;
    const fcOf = () => 1 / (2 * Math.PI * R * Cv);

    const sc = Scope(sbox, {
      channels: [{ name: "KN1", vdiv: 0.5, pos: 0 }, { name: "KN2", vdiv: 0.5, pos: 0 }], tdiv: 2e-4,
      trigger: { ch: 0, level: 0, edge: "rise", mode: "auto" }, style: { flex: "1" },
    });
    const sch = Schematic(schPane, def, { maxUnit: 26, tick() { sc.draw(); } });
    const nIn = sch.netOf("V1", "a"), nOut = sch.netOf("C1", "a");

    sch.on("step", (t) => {
      const sim = sch.sim, hh = def.tran.h;
      const vi = sim.v(nIn), vo = sim.v(nOut);
      sc.push(t, [vi, vo]);
      if (acc) {
        const w = 2 * Math.PI * f, c = Math.cos(w * t), s = Math.sin(w * t);
        acc.ir += vi * c; acc.ii -= vi * s; acc.or += vo * c; acc.oi -= vo * s; acc.n++;
      }
      if (prevV < 0 && vi >= 0) {
        if (acc && lastCross != null && acc.n > 20) {
          const den = acc.ir * acc.ir + acc.ii * acc.ii;
          const hr = (acc.or * acc.ir + acc.oi * acc.ii) / den, hi = (acc.oi * acc.ir - acc.or * acc.ii) / den;
          live = { f, gain: Math.hypot(hr, hi), phase: Math.atan2(hi, hr) };
          showLive();
        }
        lastCross = t;
        acc = { ir: 0, ii: 0, or: 0, oi: 0, n: 0 };
      }
      prevV = vi;
    });

    function showLive() {
      if (!live) return;
      const db = 20 * Math.log10(live.gain);
      mG.val.textContent = `${num(live.gain, 3)} · ${Math.abs(db) < 0.05 ? "0" : num(db, 1)} dB`;
      mPh.val.textContent = `${num((live.phase * 180) / Math.PI, 0)}°`;
      drawBode();
    }
    function retime() {
      const T = 1 / f, tau = R * Cv;
      def.tran.h = T / 120;
      def.tran.rate = Math.max(6 * T, 2 * tau);
      sc.setTdiv(tdivFor((2.5 * T) / 10));
      acc = null; lastCross = null; live = null;
      mG.val.textContent = mPh.val.textContent = S.waiting;
    }
    let sweepTimer = 0;
    function resweep() {
      clearTimeout(sweepTimer);
      sweepTimer = setTimeout(() => {
        sweep = [];
        for (let k = 0; k <= 36; k++) { const ff = FMIN * Math.pow(FMAX / FMIN, k / 36); sweep.push({ f: ff, ...measureGain(R, Cv, ff) }); }
        drawBode();
      }, 60);
    }

    let bs;
    function drawBode() {
      if (!bs || !bs.w) return;
      const { ctx, w, h: H } = bs;
      ctx.clearRect(0, 0, w, H);
      const l = 48, r = 16, t = 46, b = 24, gw = w - l - r, gh = H - t - b, DB = -40;
      const X = (ff) => l + (Math.log(ff / FMIN) / Math.log(FMAX / FMIN)) * gw;
      const Y = (db) => t + (Math.max(DB, Math.min(3, db)) / DB) * gh;
      ctx.strokeStyle = rgba(C.silk, 0.1); ctx.lineWidth = 1; ctx.beginPath();
      [10, 100, 1000, 10000].forEach((d) => { for (let m = 1; m < 10; m++) { const ff = d * m; if (ff > FMAX) break; const x = Math.round(X(ff)) + 0.5; ctx.moveTo(x, t); ctx.lineTo(x, t + gh); } });
      for (let db = 0; db >= DB; db -= 10) { const y = Math.round(Y(db)) + 0.5; ctx.moveTo(l, y); ctx.lineTo(l + gw, y); }
      ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `500 11px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      [[10, "10 Hz"], [100, "100 Hz"], [1000, "1 kHz"], [10000, "10 kHz"]].forEach(([ff, s]) => ctx.fillText(s, X(ff), t + gh + 6));
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let db = 0; db >= DB; db -= 10) ctx.fillText(db + " dB", l - 6, Y(db));
      // −3 dB ve kesim frekansı
      const fc = fcOf();
      dashH(ctx, l, l + gw, Y(-3), rgba(C.copper2, 0.4), [3, 4]);
      if (fc >= FMIN && fc <= FMAX) { dashV(ctx, X(fc), t, t + gh, rgba(C.copper2, 0.7)); tag(ctx, "fc " + fmt(fc, "Hz"), X(fc) + 5, t + 4, C.copper2, "left", "top"); }
      // ölçülen eğri
      if (sweep.length) {
        ctx.strokeStyle = C.copper2; ctx.lineWidth = 2.2; ctx.beginPath();
        sweep.forEach((q, i) => { const x = X(q.f), y = Y(20 * Math.log10(q.gain)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
        ctx.fillStyle = C.copper2;
        sweep.forEach((q) => { ctx.beginPath(); ctx.arc(X(q.f), Y(20 * Math.log10(q.gain)), 2.2, 0, Math.PI * 2); ctx.fill(); });
      }
      // şu anki frekans
      const x = X(f);
      dashV(ctx, x, t, t + gh, rgba(C.ch2, 0.6), [2, 3]);
      if (live) {
        const y = Y(20 * Math.log10(live.gain));
        ctx.fillStyle = C.amp; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.mask; ctx.lineWidth = 2; ctx.stroke();
      }
    }
    bs = canvas(bCv, drawBode);

    /* --- Web Audio: birinci dereceden IIR alçak geçiren (RC'nin çift doğrusal dönüşümü) --- */
    let ac = null, srcNode = null, iir = null, out = null, playing = false, filtOn = true, kind = "saw";
    function iirFor(ctxA) {
      const K = Math.tan((Math.PI * Math.min(fcOf(), ctxA.sampleRate * 0.45)) / ctxA.sampleRate);
      const b0 = K / (1 + K), a1 = (K - 1) / (K + 1);
      return ctxA.createIIRFilter([b0, b0], [1, a1]);
    }
    function makeSource() {
      if (kind === "saw") { const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = 110; return o; }
      const n = ac.sampleRate * 2, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; return s;
    }
    function route() {
      if (!playing) return;
      try { srcNode.disconnect(); } catch (e) {}
      if (iir) { try { iir.disconnect(); } catch (e) {} }
      if (filtOn) { iir = iirFor(ac); srcNode.connect(iir); iir.connect(out); } else srcNode.connect(out);
    }
    function startAudio() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { audioMsg.textContent = S.noAudio; return; }
      if (!ac) ac = new AC();
      ac.resume && ac.resume();
      out = ac.createGain(); out.gain.value = kind === "saw" ? 0.07 : 0.1; out.connect(ac.destination);
      srcNode = makeSource(); srcNode.start();
      playing = true; route();
      playB.textContent = S.stop; playB.classList.add("on");
    }
    function stopAudio() {
      if (!playing) return;
      playing = false;
      try { srcNode.stop(); srcNode.disconnect(); } catch (e) {}
      try { out.disconnect(); } catch (e) {}
      if (iir) { try { iir.disconnect(); } catch (e) {} iir = null; }
      playB.textContent = S.play; playB.classList.remove("on");
    }
    const playB = btn(S.play, () => (playing ? stopAudio() : startAudio()), "");
    const fseg = seg([["on", S.filtOn], ["off", S.filtOff]], "on", (k) => { filtOn = k === "on"; route(); });
    const kseg = seg([["saw", S.saw], ["noise", S.noise]], "saw", (k) => { kind = k; if (playing) { stopAudio(); startAudio(); } });
    const audioMsg = h("span.c4-note");

    const fsl = slider({ label: S.freq, min: FMIN, max: FMAX, step: 1, value: f, log: true, fmt: (v) => fmt(v, "Hz"),
      oninput: (v) => { f = v; sch.set("V1", "wave", { type: "sin", amp: 1, freq: f }); retime(); drawBode(); } });
    const rsl = slider({ label: S.R, min: 220, max: 22000, step: 0, value: R, log: true, fmt: (v) => fmt(Circuit.nearestE(v), "Ω"),
      oninput: (v) => { R = Circuit.nearestE(v); sch.set("R1", "R", R); mFc.val.textContent = fmt(fcOf(), "Hz"); retime(); resweep(); route(); } });
    const mFc = meter(S.fc), mG = meter(S.gain), mPh = meter(S.phase);
    stage.append(h("div.controls.c4-tight", fsl, rsl, h("div.meters", mFc, mG, mPh)));
    stage.append(h("div.controls.c4-audio", playB, fseg, kseg, audioMsg));
    mFc.val.textContent = fmt(fcOf(), "Hz");
    retime(); resweep();
    return { enter() { sch.start(); }, leave() { sch.stop(); stopAudio(); }, sch };
  };
  G["rc-filtre"] = [{ slide: "label:" + S.freq, to: 1600 }, { wait: 1500 }, { slide: "label:" + S.freq, to: 8000 }, { wait: 1500 }, { slide: "label:" + S.R, to: 4700 }];
})();
