/* 6. bölüm (BJT) ve 7. bölüm (MOSFET) deneyleri */
(function () {
  window.STR = window.STR || {};

  const { C, FONT, h, slider, seg, btn, canvas, loop, num, rgba, clamp, lerp } = L;
  const S = STR.ch06;
  const fmt = (v, u, d) => Circuit.fmt(v, u, d);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const meter = (label) => { const b = h("b", "—"); const m = h("div.meter", h("small", { html: label }), b); m.val = b; m.lab = m.firstChild; return m; };
  const REG = STR.sch.region;
  window.GUIDES = window.GUIDES || {};
  window.GUIDE_TARGETS = window.GUIDE_TARGETS || {};
  const G = window.GUIDES;

  /* ---------- Mikrodenetleyici pini: iç dirençli gerilim kaynağı ----------
     o: çıkış pini, g: toprak pini. closed = pin 1 (V), değilse 0 V. wave verilirse PWM. */
  Schematic.PARTS.c6mcu = {
    pins: { o: [3, 0], g: [0, 3] }, box: [-2.3, -1.8, 2.3, 1.8], hide: 0,
    paths: [{ term: 0, pts: [[3, 0], [2.3, 0]] }, { term: 1, pts: [[0, 3], [0, 1.8]] }],
    interactive: "toggle", elPins: ["o", "g"],
    el: (p, n) => [{ type: "V", id: p.id, n: [n("o"), n("g")], V: p.closed ? p.V : 0, R: p.Rint || 0, wave: p.closed ? p.wave : undefined }],
    draw(g, p, st) {
      g.lead([2.3, 0], [3, 0], "o"); g.lead([0, 1.8], [0, 3], "g");
      g.rect(-2.3, -1.8, 4.6, 3.6, { fill: "#0b1712", stroke: C.silk });
      // IC çentiği ve bacak izleri
      g.arcPath(-2.3, 0, 0.45, -Math.PI / 2, Math.PI / 2, { stroke: rgba(C.silk, 0.6), width: 1.4 });
      for (let k = -1; k <= 1; k++) { g.line([-1 + k * 0.9 + 0.9, -1.8], [-1 + k * 0.9 + 0.9, -2.15], { stroke: rgba(C.silk, 0.5), width: 1.6 }); }
      g.text(p.text || S.mcu, [0, -0.75], { size: 0.78, color: C.silk, weight: 800 });
      if (p.wave) {
        g.path([[-1.1, 0.95], [-0.7, 0.95], [-0.7, 0.35], [-0.2, 0.35], [-0.2, 0.95], [0.3, 0.95], [0.3, 0.35], [0.8, 0.35], [0.8, 0.95], [1.1, 0.95]], { stroke: C.ch1, width: 1.8 });
      } else {
        const on = !!p.closed;
        g.text(`${S.gpio} · ${on ? "1" : "0"}`, [0, 0.65], { size: 0.56, color: on ? C.v1 : "#8fb0ff", weight: 700, font: "mono" });
      }
      g.circle(1.75, 0, 0.2, { fill: st.netColor(p, "o") });
    },
    info(p, sch) {
      const v = sch.v(sch.netOf(p.id, "o")) - sch.v(sch.netOf(p.id, "g"));
      return `<b>${fmt(v, "V")}</b> · ${fmt(Math.abs(sch.sim.i(p.id)), "A")}`;
    },
  };

  // şemadaki bir noktanın etrafına ısı parıltısı (güç → renk/yarıçap)
  function heatGlow(ctx, sch, at, P, Pref) {
    const a = clamp(P / Pref, 0, 1.3);
    if (a < 0.02) return;
    const [x, y] = sch.screenOf(at), u = sch.unit;
    const R = u * (1.4 + 1.8 * Math.min(1, a));
    const gr = ctx.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, rgba(C.heat, Math.min(0.75, 0.25 + 0.5 * a)));
    gr.addColorStop(0.55, rgba("#ff5a1a", 0.22 * Math.min(1, a)));
    gr.addColorStop(1, rgba(C.heat, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  }
  const setFlag = (el, text, ok) => { el.textContent = text || ""; el.classList.toggle("ok", !!ok); };
  const regionText = (r) => REG[r] || r;

  /* =====================================================================
     6.1 Musluk benzetmesi
     ===================================================================== */
  Demos.c6musluk = function (stage) {
    const schPane = h("div.pane");
    const tapCv = h("canvas", { role: "img", "aria-label": S.tapTitle });
    const tapPane = h("div.pane.c6-tap", h("span.pane-title", S.tapTitle), tapCv);
    const grCv = h("canvas", { role: "img", "aria-label": S.graphTitle });
    const grPane = h("div.pane.c6-graph", h("span.pane-title", S.graphTitle), grCv);
    const right = h("div.c6-col", tapPane, grPane);
    const body = h("div.split.c6-two", schPane, right);
    const mIb = meter(S.ibM), mIc = meter(S.icM), mR = meter(S.ratio), mReg = meter(S.region);
    const flag = h("span.flag");
    const strip = h("div.c6-strip", h("div.meters", mIb, mIc, mR, mReg), flag);
    stage.append(body, strip);
    const sch = Schematic(schPane, clone(CIRCUITS.c6Musluk), { maxUnit: 30 });

    let Ib = 100, beta = 100;
    const ibS = slider({ label: S.ib, min: 0, max: 500, step: 1, value: Ib, fmt: (v) => fmt(v * 1e-6, "A"), oninput: (v) => { Ib = v; sch.set("IB", "I", v * 1e-6); } });
    const bS = slider({ label: S.beta, min: 20, max: 400, step: 5, value: beta, fmt: (v) => String(v), oninput: (v) => { beta = v; sch.set("Q1", "model", { bf: v }); sweep(); update(); } });
    stage.append(h("div.controls", ibS, bS));

    // I_C – I_B eğrisi: devrenin kopyasında baz akımını tara
    let curve = [];
    function sweep() {
      const els = sch.sim.elements.map((e) => ({ ...e.p }));
      const sim = Circuit.create({ elements: els });
      curve = [];
      for (let k = 0; k <= 60; k++) {
        const ib = (500e-6 * k) / 60;
        sim.set("IB", "I", ib); sim.dc();
        curve.push([ib, Math.max(0, sim.i("AC"))]);
      }
    }
    sweep();

    let gs;
    const IBMAX = 500e-6, ICMAX = 25e-3;
    function drawGraph() {
      if (!gs || !gs.w) return;
      const { ctx, w, h: H } = gs;
      ctx.clearRect(0, 0, w, H);
      const l = 50, r = 14, t = 30, b = 26, gw = w - l - r, gh = H - t - b;
      const X = (i) => l + (i / IBMAX) * gw, Y = (i) => t + gh - (Math.min(i, ICMAX * 1.05) / ICMAX) * gh;
      ctx.strokeStyle = rgba(C.silk, 0.1); ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i <= 5; i++) { ctx.moveTo(X(i * 1e-4), t); ctx.lineTo(X(i * 1e-4), t + gh); }
      for (let i = 0; i <= 5; i++) { ctx.moveTo(l, Y(i * 5e-3)); ctx.lineTo(l + gw, Y(i * 5e-3)); }
      ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `500 10.5px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let i = 0; i <= 5; i++) ctx.fillText(i * 100 + " µA", X(i * 1e-4), t + gh + 6);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let i = 0; i <= 5; i++) ctx.fillText(i * 5 + " mA", l - 6, Y(i * 5e-3));
      ctx.save(); ctx.beginPath(); ctx.rect(l, t, gw, gh); ctx.clip();
      // β·I_B doğrusu (doyum olmasaydı)
      ctx.strokeStyle = rgba(C.silk, 0.35); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
      const ibEnd = Math.min(IBMAX, (ICMAX * 1.05) / beta);
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(ibEnd), Y(beta * ibEnd)); ctx.stroke(); ctx.setLineDash([]);
      // ölçülen eğri
      ctx.strokeStyle = C.copper2; ctx.lineWidth = 2.5; ctx.beginPath();
      curve.forEach(([ib, ic], i) => (i ? ctx.lineTo(X(ib), Y(ic)) : ctx.moveTo(X(ib), Y(ic))));
      ctx.stroke();
      ctx.restore();
      ctx.font = `600 11.5px ${FONT.display}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = rgba(C.silk, 0.6);
      ctx.textAlign = "right";
      ctx.fillText(S.betaLine, X(ibEnd * 0.9) - 10, Y(beta * ibEnd * 0.9));
      // çalışma noktası
      const ib = Math.abs(sch.sim.i("AB")), ic = Math.abs(sch.sim.i("AC"));
      const px = X(ib), py = Y(ic);
      ctx.strokeStyle = rgba(C.amp, 0.5); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, t + gh); ctx.lineTo(px, py); ctx.lineTo(l, py); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.amp; ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2); ctx.fill();
    }
    gs = canvas(grCv, drawGraph);

    /* --- musluk çizimi: büyük boru (C→E), yük daralması, vana; küçük baz borusu --- */
    let ts;
    const parts = [];
    for (let i = 0; i < 46; i++) parts.push({ u: i / 46, r: Math.random() * 2 - 1, base: false });
    for (let i = 0; i < 12; i++) parts.push({ u: i / 12, r: Math.random() * 2 - 1, base: true });
    let open = 0, sat = false, icNow = 0, ibNow = 0;
    function tapDraw(dt) {
      if (!ts || !ts.w) return;
      const { ctx, w, h: H } = ts;
      ctx.clearRect(0, 0, w, H);
      const s = Math.min(w / 330, (H - 18) / 230), ox = (w - 330 * s) / 2 + 10 * s, oy = 22 + ((H - 22) - 230 * s) / 2;
      const P = (x, y) => [ox + x * s, oy + y * s];
      const cx = 200, half = 17, nar = 6, valveY = 118, baseY = 168;
      const halfAt = (y) => (y > 30 && y < 66 ? nar + (half - nar) * Math.min(1, Math.min(y - 30, 66 - y) / 10) : half);
      // borular: dış duvar ve su alanı
      const water = rgba(C.amp, 0.06 + 0.22 * clamp(icNow / 0.02, 0, 1));
      ctx.lineJoin = "round";
      const wall = (pts, fill) => {
        ctx.beginPath(); pts.forEach(([x, y], i) => { const [X, Y] = P(x, y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath();
        ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = C.silk; ctx.lineWidth = 2; ctx.stroke();
      };
      // ana boru (daralma ile)
      const left = [], rightP = [];
      for (let y = 0; y <= 230; y += 2) { if (y > baseY - 6 && y < baseY + 6) continue; left.push([cx - halfAt(y), y]); rightP.push([cx + halfAt(y), y]); }
      ctx.fillStyle = "#08180f";
      ctx.beginPath();
      [...left, ...rightP.reverse()].forEach(([x, y], i) => { const [X, Y] = P(x, y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.closePath(); ctx.fill(); ctx.fillStyle = water; ctx.fill();
      ctx.strokeStyle = C.silk; ctx.lineWidth = 2;
      const stroke = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => { const [X, Y] = P(x, y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.stroke(); };
      const L1 = [], L2 = [], R1 = [];
      for (let y = 0; y <= 230; y += 2) { (y < baseY - 6 ? L1 : y > baseY + 6 ? L2 : []).push([cx - halfAt(y), y]); R1.push([cx + halfAt(y), y]); }
      stroke(L1); stroke(L2); stroke(R1);
      // baz borusu (soldan, vananın altında ana boruya katılır)
      const bh = 6;
      ctx.fillStyle = "#08180f"; const [bx0, by0] = P(20, baseY - bh), [bx1, by1] = P(cx - half, baseY + bh);
      ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
      ctx.fillStyle = rgba(C.amp, 0.05 + 0.2 * clamp(ibNow / 3e-4, 0, 1)); ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
      stroke([[20, baseY - bh], [cx - half, baseY - bh]]); stroke([[20, baseY + bh], [cx - half, baseY + bh]]);
      // vana gövdesi ve sürgü
      const vh = 9;
      ctx.strokeStyle = C.silk; ctx.lineWidth = 2;
      const [vx0, vy0] = P(cx + half, valveY - vh - 3), [vx1, vy1] = P(cx + half + 62, valveY + vh + 3);
      ctx.fillStyle = "#0e2219"; ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0); ctx.strokeRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
      const plateL = cx - half + 2 * half * open;     // sürgünün sol kenarı
      const [px0, py0] = P(plateL, valveY - vh), [px1, py1] = P(cx + half + 58, valveY + vh);
      ctx.fillStyle = C.copper; ctx.fillRect(px0, py0, px1 - px0, py1 - py0);
      ctx.fillStyle = rgba("#1b0e03", 0.35); ctx.fillRect(px0, py0 + (py1 - py0) * 0.6, px1 - px0, (py1 - py0) * 0.4);
      // kontrol bağı: baz borusundaki çark → vana
      const wheelX = 110;
      const [wx, wy] = P(wheelX, baseY);
      const rod = [[wheelX, baseY - bh - 2], [wheelX, valveY + 34], [cx + half + 70, valveY + 34], [cx + half + 70, valveY], [cx + half + 58, valveY]];
      ctx.strokeStyle = rgba(C.copper2, 0.75); ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); stroke(rod); ctx.setLineDash([]);
      tapDraw.spin = (tapDraw.spin || 0) + dt * (ibNow / 1e-4) * 3;
      ctx.save(); ctx.translate(wx, wy); ctx.rotate(tapDraw.spin);
      ctx.strokeStyle = C.copper2; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(-bh * s * 0.85, 0); ctx.lineTo(bh * s * 0.85, 0); ctx.stroke(); }
      ctx.restore();
      // parçacıklar
      const vC = 0.55 * clamp(icNow / 0.02, 0, 1.3), vB = 0.5 * clamp(ibNow / 3e-4, 0, 1.3);
      ctx.fillStyle = C.amp;
      const rr = Math.max(1.6, 2.3 * s);
      parts.forEach((q) => {
        if (q.base) {
          q.u = (q.u + dt * vB * 0.9) % 1;
          // yatay: x 20 → cx-half, sonra ana boruda aşağı
          const L0 = cx - half - 20, L1v = 230 - baseY, tot = L0 + L1v;
          const d = q.u * tot;
          let x, y;
          if (d < L0) { x = 20 + d; y = baseY + q.r * (bh - 2); }
          else { y = baseY + (d - L0); x = cx + q.r * (half - 3); }
          if (vB < 0.002) return;
          const [X, Y] = P(x, y); ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(X, Y, rr * 0.8, 0, Math.PI * 2); ctx.fill();
        } else {
          q.u = (q.u + dt * vC * 0.6) % 1;
          if (vC < 0.002) return;
          const y = q.u * 230;
          let x0 = cx - halfAt(y) + 3, x1 = cx + halfAt(y) - 3;
          if (Math.abs(y - valveY) < vh) x1 = Math.max(x0, Math.min(x1, plateL - 3));
          const x = lerp(x0, x1, (q.r + 1) / 2);
          const [X, Y] = P(x, y); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(X, Y, rr, 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
      // yazılar
      ctx.font = `600 ${Math.max(10.5, 12 * s)}px ${FONT.display}`; ctx.textBaseline = "middle";
      ctx.fillStyle = C.silk2; ctx.textAlign = "left";
      const lab = (t, x, y, col, al = "left") => { const [X, Y] = P(x, y); ctx.fillStyle = col || C.silk2; ctx.textAlign = al; ctx.fillText(t, X, Y); };
      lab(S.tapC, cx + half + 8, 8);
      lab(S.tapLoad, cx + half + 8, 48, C.muted);
      lab(S.tapE, cx + half + 8, 222);
      lab(S.tapB, 22, baseY - bh - 10);
      ctx.font = `600 ${Math.max(10.5, 11.5 * s)}px ${FONT.mono}`;
      lab("IB = " + fmt(ibNow, "A"), 22, baseY + bh + 12, C.amp);
      lab("IC = " + fmt(icNow, "A"), cx - half - 8, 86, C.amp, "right");
      ctx.font = `700 ${Math.max(11, 12.5 * s)}px ${FONT.display}`;
      if (sat) { lab(S.tapOpen, cx + half + 8, valveY + vh + 16, C.gold); }
      else if (open < 0.01) lab(S.tapShut, cx + half + 8, valveY + vh + 16, C.muted);
      else lab(S.tapValve + " %" + Math.round(open * 100), cx + half + 8, valveY + vh + 16, C.silk2);
      if (sat) { ctx.strokeStyle = rgba(C.gold, 0.8); ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); const [a, b] = P(cx - nar - 6, 30), [c2, d2] = P(cx + nar + 6, 66); ctx.strokeRect(a, b, c2 - a, d2 - b); ctx.setLineDash([]); }
    }
    ts = canvas(tapCv, () => tapDraw(0));

    let icSat = 0.02;
    function update() {
      const ib = Math.abs(sch.sim.i("AB")), ic = Math.abs(sch.sim.i("AC"));
      const inf = sch.sim.info("Q1");
      ibNow = ib; icNow = ic;
      icSat = curve.length ? curve[curve.length - 1][1] : 0.02;
      sat = inf.region === "doyum";
      open = sat ? 1 : clamp(ic / (icSat || 1), 0, 1);
      mIb.val.textContent = fmt(ib, "A");
      mIc.val.textContent = fmt(ic, "A");
      mR.val.textContent = ib > 1e-7 ? num(ic / ib, 0) : "—";
      mReg.val.textContent = regionText(inf.region);
      setFlag(flag, sat ? S.satFlag : inf.region === "kesim" ? S.cutFlag : S.actFlag, !sat);
      drawGraph();
    }
    sch.on("change", update);
    update();
    const lp = loop((dt) => tapDraw(dt));
    return { enter() { sch.start(); lp.start(); }, leave() { sch.stop(); lp.stop(); }, sch };
  };
  G["bjt-musluk"] = [{ slide: "label:Baz akımı", to: 50 }, { wait: 600 }, { slide: "label:Baz akımı", to: 150 }, { wait: 700 }, { slide: "label:Baz akımı", to: 320 }];

  /* =====================================================================
     6.2 Anahtar olarak BJT (ana deney)
     ===================================================================== */
  const PIN_LIMIT = 0.01; // bu deneydeki pinin güvenli akım sınırı
  Demos.c6anahtar = function (stage) {
    let mode = "bjt", load = "motor", Rb = 4700, beta = 100, k = 5;
    const defOf = () => clone(CIRCUITS[mode === "bjt" ? (load === "motor" ? "c6SwMotor" : "c6SwLed") : (load === "motor" ? "c6DirMotor" : "c6DirLed")]);
    const prep = (d) => {
      d.parts.forEach((p) => {
        if (p.id === "RB") p.R = Rb;
        if (p.id === "Q1") p.model = { bf: beta };
        if (p.id === "MCU") p.closed = pinOn;
      });
      return d;
    };
    let pinOn = true;
    const schPane = h("div.pane");
    const calc = h("div.c6-calc");
    const body = h("div.split.c6-sw", schPane, calc);
    const modeSeg = seg([["bjt", S.modeBjt], ["dir", S.modeDir]], mode, (v) => { mode = v; rebuild(); }, "Bağlantı");
    const loadSeg = seg([["motor", S.loadMotor], ["led", S.loadLed]], load, (v) => { load = v; rebuild(); }, "Yük");
    const pinBtn = btn(S.pinOn, () => { pinOn = !pinOn; sch.set("MCU", "closed", pinOn); });
    stage.append(h("div.controls.top", modeSeg, loadSeg), body);
    const sch = Schematic(schPane, prep(defOf()), {
      maxUnit: 26,
      overlay(ctx, s) { if (mode === "bjt" && s.sim.byId.Q1) heatGlow(ctx, s, [13.6, 12], Math.abs(s.sim.p("Q1")), 0.5); },
    });

    // hesaplayıcı paneli
    const cIc = h("b"), cRaw = h("b"), cE = h("b.cu"), cIb = h("b"), cForm = h("p.c6-form");
    const kSeg = seg([[1, "×1"], [2, "×2"], [5, "×5"], [10, "×10"]], k, (v) => { k = v; calcUpdate(); }, S.calcK);
    const bS = slider({ label: S.beta, min: 50, max: 300, step: 5, value: beta, fmt: (v) => String(v), oninput: (v) => { beta = v; if (sch.sim.byId.Q1) sch.set("Q1", "model", { bf: v }); calcUpdate(); } });
    const apply = btn(S.calcApply, () => { const r = e12Down(rawRb()); rbS.set(r, true); }, "primary");
    calc.append(
      h("h4", S.calcTitle),
      h("div.c6-row", h("span", S.calcIc), cIc),
      h("div.c6-row.c6-col2", bS),
      h("div.c6-row.c6-col2", h("span", S.calcK), kSeg),
      cForm,
      h("div.c6-row", h("span", S.calcRaw), cRaw),
      h("div.c6-row", h("span", S.calcE12), cE),
      h("div.c6-row", h("span", S.calcIb), cIb),
      apply,
    );
    const mPin = meter(S.pinCur), mReg = meter(S.region), mVce = meter(S.vce), mIc = meter(S.ic), mP = meter(S.pq);
    const flag = h("span.flag"), pinFlag = h("span.flag");
    const strip = h("div.c6-strip", h("div.meters", mPin, mReg, mVce, mIc, mP), h("div.c6-flags", pinFlag, flag));
    const rbS = slider({ label: S.rb, min: 47, max: 100000, step: 1, value: Rb, log: true, fmt: (v) => fmt(v, "Ω"), oninput: (v) => { Rb = v; if (sch.sim.byId.RB) sch.set("RB", "R", v); calcUpdate(); } });
    stage.append(strip, h("div.controls", pinBtn, rbS, h("span.c6-lim", `${S.pinLimit}: ${fmt(PIN_LIMIT, "A")}`)));

    // yük akımı: transistör tam açıkken (V_CE ≈ 0,2 V) yükten geçecek akım — yük devresinin ayrı çözümü
    function loadCurrent() {
      const els = [{ type: "V", id: "V", n: ["vcc", "0"], V: 5 }, { type: "V", id: "VS", n: ["c", "0"], V: 0.2 }];
      if (load === "motor") els.push({ type: "R", id: "M", n: ["vcc", "c"], R: 25 });
      else {
        els.push({ type: "R", id: "R", n: ["vcc", "a"], R: 6.8 });
        els.push(...Schematic.PARTS.led.el({ id: "L", color: "beyaz" }, () => "").map((e) => ({ ...e, n: ["a", "c"] })));
      }
      const sim = Circuit.create({ elements: els }); sim.dc();
      return Math.abs(sim.i("VS"));
    }
    function e12Down(v) {
      let best = 0;
      for (let d = 0; d <= 6; d++) for (const m of Circuit.E12) { const c = +(m * 10 ** d).toPrecision(3); if (c <= v * (1 + 1e-9) && c > best) best = c; }
      return Math.max(best, 10);
    }
    const VPIN = 3.3, VBE = 0.7;
    let Iload = loadCurrent();
    const rawRb = () => (VPIN - VBE) / ((Iload / beta) * k);
    function calcUpdate() {
      cIc.textContent = fmt(Iload, "A");
      const r = rawRb(), e = e12Down(r);
      cForm.innerHTML = `R<sub>B</sub> = (${num(VPIN, 1)} − ${num(VBE, 1)}) V / (${k} · I<sub>C</sub> / β)`;
      cRaw.textContent = fmt(r, "Ω");
      cE.textContent = fmt(e, "Ω");
      cIb.textContent = fmt((VPIN - VBE) / e, "A");
      calc.classList.toggle("off", mode !== "bjt");
    }

    function rebuild() {
      Iload = loadCurrent();
      sch.rebuild(prep(defOf()));
      calcUpdate(); update();
    }
    function update() {
      const s = sch.sim;
      pinOn = !!sch.part("MCU").closed;
      pinBtn.textContent = pinOn ? S.pinOn : S.pinOff;
      pinBtn.classList.toggle("on", pinOn);
      const Ipin = Math.abs(s.i("A1"));
      const Vpin = sch.v(sch.netOf("MCU", "o"));
      mPin.val.textContent = fmt(Ipin, "A");
      if (Ipin > PIN_LIMIT) setFlag(pinFlag, S.overPin(fmt(Ipin, "A"), fmt(PIN_LIMIT, "A"), fmt(Vpin, "V")), false);
      else setFlag(pinFlag, pinOn ? S.okPin(fmt(Ipin, "A"), fmt(PIN_LIMIT, "A")) : "", true);
      mPin.classList.toggle("c6-bad", Ipin > PIN_LIMIT);
      if (mode === "bjt") {
        const inf = s.info("Q1");
        mReg.val.textContent = regionText(inf.region);
        mVce.val.textContent = fmt(inf.vce, "V");
        mIc.val.textContent = fmt(Math.abs(inf.Ic), "A");
        mP.val.textContent = fmt(Math.abs(s.p("Q1")), "W");
        [mReg, mVce, mP].forEach((m) => (m.style.display = ""));
        mIc.lab.innerHTML = S.ic;
        setFlag(flag, inf.region === "doyum" ? S.swSat : inf.region === "kesim" ? S.swCut : S.swAct, inf.region !== "aktif");
      } else {
        const ld = load === "motor" ? ["M1"] : ["RL", "LED1"];
        const Vl = ld.reduce((a, id) => a + Math.abs(s.vAcross(id)), 0);
        [mReg, mP].forEach((m) => (m.style.display = "none"));
        mVce.lab.innerHTML = S.pinV; mVce.val.textContent = fmt(Vpin, "V");
        mIc.lab.innerHTML = S.vload; mIc.val.textContent = fmt(Vl, "V");
        setFlag(flag, S.dirNote, false);
      }
      if (mode === "bjt") mVce.lab.innerHTML = S.vce;
    }
    sch.on("change", update);
    calcUpdate(); update();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["bjt-anahtar"] = [{ click: "=Doğrudan bağla" }, { wait: 1400 }, { click: "=Transistörle" }, { wait: 900 }, { click: "=Uygula" }];
  GUIDE_TARGETS["bjt-anahtar"] = "=Uygula";

  /* =====================================================================
     6.3 Ortak emetörlü yükselteç
     ===================================================================== */
  const vPick = (v) => Scope.VSEQ.find((x) => x >= v * 0.999) || Scope.VSEQ[Scope.VSEQ.length - 1];
  Demos.c6yukseltec = function (stage) {
    const schPane = h("div.pane");
    const scPane = h("div.pane.c6-scope");
    const body = h("div.split.c6-amp", schPane, scPane);
    const mG = meter(S.gain), mI = meter(S.vinPP), mO = meter(S.voutPP), mReg = meter(S.region);
    const flag = h("span.flag");
    const legend = h("div.legend", h("span", h("i", { style: { background: C.ch1 } }), S.scopeIn), h("span", h("i", { style: { background: C.ch2 } }), S.scopeOut));
    stage.append(body, h("div.c6-strip", h("div.meters", mG, mI, mO, mReg), h("div.c6-flags", legend, flag)));
    const sch = Schematic(schPane, clone(CIRCUITS.c6Amp), { maxUnit: 28 });
    const F = 1000;
    const nIn = sch.netOf("VIN", "a"), nOut = sch.netOf("RL", "a"), nC = sch.netOf("RC", "b");
    const sc = Scope(scPane, { channels: [{ name: "KN1", vdiv: 0.05 }, { name: "KN2", vdiv: 0.2 }], tdiv: 2e-4, trigger: { ch: 0, level: 0, edge: "rise", mode: "auto" } });

    let amp = 0.1, bypass = false;
    // periyot başına ölçüm: tepe-tepe, ortalama, bölge sayımları, faz (çarpım işareti)
    let acc = null, last = null, rescaleAt = 0;
    const newAcc = (pi) => ({ pi, inMin: 1e9, inMax: -1e9, outMin: 1e9, outMax: -1e9, vc: 0, n: 0, cut: 0, sat: 0, corr: 0 });
    sch.on("step", (t) => {
      const vi = sch.v(nIn), vo = sch.v(nOut);
      sc.push(t, [vi, vo]);
      const pi = Math.floor(t * F);
      if (!acc) acc = newAcc(pi);
      if (pi !== acc.pi) {
        if (acc.n > 20) last = { ppIn: acc.inMax - acc.inMin, ppOut: acc.outMax - acc.outMin, vc: acc.vc / acc.n, cut: acc.cut / acc.n, sat: acc.sat / acc.n, inv: acc.corr < 0 };
        if (last && rescaleAt && t >= rescaleAt) { sc.setVdiv(1, vPick(Math.min(last.ppOut, 12) / 5)); rescaleAt = 0; }
        acc = newAcc(pi);
      }
      acc.inMin = Math.min(acc.inMin, vi); acc.inMax = Math.max(acc.inMax, vi);
      acc.outMin = Math.min(acc.outMin, vo); acc.outMax = Math.max(acc.outMax, vo);
      acc.vc += sch.v(nC); acc.n++; acc.corr += vi * vo;
      const r = sch.sim.info("Q1").region;
      if (r === "kesim") acc.cut++; else if (r === "doyum") acc.sat++;
    });
    function rescale() {
      sc.setVdiv(0, vPick((2 * amp) / 5));
      const g = last && last.ppIn > 0 ? last.ppOut / last.ppIn : 4.4;
      sc.setVdiv(1, vPick(Math.min(2 * amp * g, 12) / 5));
      rescaleAt = sch.sim.t + 6 / F;
    }
    const aS = slider({ label: S.amp, min: 0.002, max: 2, step: 0.001, value: amp, log: true, fmt: (v) => fmt(v, "V"), oninput: (v) => { amp = v; sch.set("VIN", "wave", { type: "sin", amp: v, freq: F }); rescale(); } });
    const bSeg = seg([[false, S.byOff], [true, S.byOn]], bypass, (v) => { sch.set("SW", "closed", v); }, S.bypass);
    stage.append(h("div.controls", aS, h("label", S.bypass, bSeg)));

    function update() {
      const sw = !!sch.part("SW").closed;
      if (sw !== bypass) { bypass = sw; bSeg.set(sw); last = null; rescaleAt = 0; rescale(); }
      mReg.val.textContent = regionText(sch.sim.info("Q1").region);
      if (!last) return;
      const g = last.ppIn > 1e-6 ? last.ppOut / last.ppIn : 0;
      mG.val.textContent = (last.inv ? "−" : "") + num(g, g < 10 ? 1 : 0);
      mI.val.textContent = fmt(last.ppIn, "V");
      mO.val.textContent = fmt(last.ppOut, "V");
      const c = last.cut > 0.02, s = last.sat > 0.02;
      setFlag(flag, c && s ? S.clipBoth : s ? S.clipSat : c ? S.clipCut : S.clean, !(c || s));
    }
    sch.on("change", update);
    rescale(); update();
    const lp = loop(() => sc.draw());
    return { enter() { sch.start(); lp.start(); }, leave() { sch.stop(); lp.stop(); }, sch };
  };
  G["bjt-yukseltec"] = [{ slide: "label:Giriş genliği", to: 0.3 }, { wait: 1500 }, { slide: "label:Giriş genliği", to: 1.4 }];

  /* =====================================================================
     7.1 MOSFET: gerilimle kontrol, kanal oluşumu
     ===================================================================== */
  const MOS_TYPES = { ll: { Vt: 1.5, K: 4 }, std: { Vt: 3, K: 4 } };
  Demos.c7mosfet = function (stage) {
    let ch = "n", typ = "ll", Vg = 0;
    const defOf = () => {
      const d = clone(ch === "n" ? CIRCUITS.c7MosN : CIRCUITS.c7MosP);
      d.parts.forEach((p) => { if (p.id === "VG") p.V = Vg; if (p.id === "M1") p.model = { ...MOS_TYPES[typ] }; });
      return d;
    };
    const schPane = h("div.pane");
    const xsCv = h("canvas", { role: "img", "aria-label": S.xsTitle });
    const xsPane = h("div.pane.c7-xs", h("span.pane-title", S.xsTitle), xsCv);
    const grCv = h("canvas", { role: "img", "aria-label": S.idvgTitle });
    const grPane = h("div.pane.c6-graph", h("span.pane-title", S.idvgTitle), grCv);
    const body = h("div.split.c6-two.c7-mos", schPane, h("div.c6-col.c7-col", xsPane, grPane));
    const mV = meter(S.vgs), mI = meter(S.id), mR = meter(S.rds), mG = meter(S.ig), mReg = meter(S.region), mP = meter(S.pm);
    const flag = h("span.flag");
    stage.append(body, h("div.c6-strip", h("div.meters", mV, mI, mR, mG, mReg, mP), flag));
    const sch = Schematic(schPane, defOf(), {
      maxUnit: 30,
      overlay(ctx, s) { heatGlow(ctx, s, ch === "n" ? [11.6, 9] : [11.6, 4], Math.abs(s.sim.p("M1")), 0.6); },
    });
    const vS = slider({ label: S.vg, min: 0, max: 5, step: 0.05, value: Vg, fmt: (v) => fmt(v, "V"), oninput: (v) => { Vg = v; sch.set("VG", "V", v); } });
    const chSeg = seg([["n", S.chN], ["p", S.chP]], ch, (v) => { ch = v; sch.rebuild(defOf()); sweep(); update(); }, "Kanal");
    const tSeg = seg([["ll", S.typeLL], ["std", S.typeStd]], typ, (v) => { typ = v; sch.set("M1", "model", { ...MOS_TYPES[typ] }); }, "Tür");
    stage.append(h("div.controls", vS, chSeg, tSeg));

    // I_D – V_G eğrileri: devrenin kopyasında kapı gerilimini iki MOSFET türü için tara
    let curves = {};
    function sweep() {
      curves = {};
      Object.keys(MOS_TYPES).forEach((k) => {
        const sim = Circuit.create({ elements: sch.sim.elements.map((e) => ({ ...e.p })) });
        sim.set("M1", { ...MOS_TYPES[k] });
        curves[k] = [];
        for (let i = 0; i <= 100; i++) { const vg = (5 * i) / 100; sim.set("VG", "V", vg); sim.dc(); curves[k].push([vg, sim.info("M1").Id]); }
      });
    }
    sweep();
    let gs;
    function drawGraph() {
      if (!gs || !gs.w) return;
      const { ctx, w, h: H } = gs;
      ctx.clearRect(0, 0, w, H);
      const l = 50, r = 14, t = 30, b = 26, gw = w - l - r, gh = H - t - b, IM = 0.6;
      const X = (v) => l + (v / 5) * gw, Y = (i) => t + gh - (Math.min(i, IM) / IM) * gh;
      ctx.strokeStyle = rgba(C.silk, 0.1); ctx.lineWidth = 1; ctx.beginPath();
      for (let v = 0; v <= 5; v++) { ctx.moveTo(X(v), t); ctx.lineTo(X(v), t + gh); }
      for (let i = 0; i <= 3; i++) { ctx.moveTo(l, Y(i * 0.2)); ctx.lineTo(l + gw, Y(i * 0.2)); }
      ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `500 10.5px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let v = 0; v <= 5; v++) ctx.fillText(v + " V", X(v), t + gh + 6);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let i = 0; i <= 3; i++) ctx.fillText(fmt(i * 0.2, "A"), l - 6, Y(i * 0.2));
      // 3,3 V işareti
      ctx.strokeStyle = rgba(C.gold, 0.45); ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(X(3.3), t); ctx.lineTo(X(3.3), t + gh); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = rgba(C.gold, 0.8); ctx.font = `600 10.5px ${FONT.display}`; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(S.pin33, X(3.3) + 4, t + 2);
      Object.entries(curves).forEach(([k, pts]) => {
        const on = k === typ;
        ctx.strokeStyle = on ? C.copper2 : rgba(C.silk, 0.3); ctx.lineWidth = on ? 2.5 : 1.5;
        ctx.beginPath(); pts.forEach(([v, i], j) => (j ? ctx.lineTo(X(v), Y(i)) : ctx.moveTo(X(v), Y(i)))); ctx.stroke();
        // eğri etiketi: akımın yarıya ulaştığı yerde
        const half = pts.find(([, i]) => i > 0.25);
        if (half) { ctx.fillStyle = on ? C.copper2 : rgba(C.silk, 0.45); ctx.font = `600 11px ${FONT.display}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(k === "ll" ? S.typeLL : S.typeStd, X(half[0]) + 8, Y(half[1]) + 2); }
      });
      const px = X(Vg), py = Y(st.Id);
      ctx.fillStyle = C.amp; ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2); ctx.fill();
    }
    gs = canvas(grCv, drawGraph);

    let st = { vgs: 0, vov: 0, Id: 0, vS: 0, vG: 0, vD: 5 };
    function update() {
      const inf = sch.sim.info("M1");
      const vth = MOS_TYPES[typ].Vt;
      const nS = sch.netOf("M1", "s"), nD = sch.netOf("M1", "d"), nG = sch.netOf("M1", "g");
      st = { vgs: inf.vgs, vov: Math.max(0, inf.vgs - vth), Id: inf.Id, vS: sch.v(nS), vG: sch.v(nG), vD: sch.v(nD), region: inf.region, vth };
      mV.val.textContent = fmt(sch.v(nG) - sch.v(nS), "V");
      mI.val.textContent = fmt(inf.Id, "A");
      mR.val.textContent = inf.Id > 1e-4 ? fmt(Math.abs(inf.vds) / inf.Id, "Ω") : S.big;
      mG.val.textContent = fmt(Math.abs(sch.sim.i("AG")), "A");
      mReg.val.textContent = regionText(inf.region);
      mP.val.textContent = fmt(Math.abs(sch.sim.p("M1")), "W");
      const vthS = (ch === "n" ? "" : "−") + fmt(vth, "V");
      setFlag(flag, inf.region === "kesim" ? S.mosCut(vthS) : inf.region === "doğrusal" ? S.mosLin : S.mosSat, inf.region !== "doyum");
      drawGraph();
    }
    sch.on("change", update);
    update();

    /* kesit: gövde, kaynak/akaç kuyuları, oksit, kapı; kapı yükleri, tükenme bölgesi, kanal ve taşıyıcılar */
    let xs;
    const rnd = L.rng(7);
    const holes = Array.from({ length: 64 }, () => [rnd(), rnd()]);
    const wellQ = Array.from({ length: 34 }, () => [rnd(), rnd()]);
    const chQ = Array.from({ length: 26 }, () => [rnd(), rnd()]);
    let flowPh = 0;
    const DW = 340, DH = 218;
    function xsDraw(dt) {
      if (!xs || !xs.w) return;
      const { ctx, w, h: H } = xs;
      ctx.clearRect(0, 0, w, H);
      const s = Math.min(w / DW, (H - 26) / DH), ox = (w - DW * s) / 2, oy = 22 + (H - 22 - DH * s) / 2;
      const R = (x, y, ww, hh, fill, stroke) => { ctx.fillStyle = fill; ctx.fillRect(ox + x * s, oy + y * s, ww * s, hh * s); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.strokeRect(ox + x * s, oy + y * s, ww * s, hh * s); } };
      const T = (t, x, y, col, al = "center", sz = 11.5, wt = 600, font = FONT.display) => { ctx.font = `${wt} ${Math.max(10, sz * s)}px ${font}`; ctx.fillStyle = col; ctx.textAlign = al; ctx.textBaseline = "middle"; ctx.fillText(t, ox + x * s, oy + y * s); };
      const pch = ch === "p";
      const subY = 84, subH = 106, wellW = 72, wellH = 36, gx0 = 110, gx1 = 230, lblY = subY + subH - 13;
      // gövde ve kuyular (kalıp fotoğrafı renkleri)
      R(10, subY, 320, subH, pch ? "#26324a" : "#3a2a33");
      ctx.fillStyle = pch ? "#7c3346" : "#2f5687";
      [30, 240].forEach((x) => { ctx.beginPath(); const X = ox + x * s, Y = oy + subY * s, W = wellW * s, HH = wellH * s; ctx.moveTo(X, Y); ctx.lineTo(X, Y + HH - 10 * s); ctx.quadraticCurveTo(X, Y + HH, X + 10 * s, Y + HH); ctx.lineTo(X + W - 10 * s, Y + HH); ctx.quadraticCurveTo(X + W, Y + HH, X + W, Y + HH - 10 * s); ctx.lineTo(X + W, Y); ctx.fill(); });
      // tükenme bölgesi (kapı altı)
      const vgsAbs = pch ? -st.vgs : st.vgs;
      const vth = st.vth || 1.5;
      const dep = 24 * Math.sqrt(clamp(vgsAbs / vth, 0, 1));
      if (dep > 0.5) { ctx.fillStyle = "rgba(239,238,226,0.08)"; ctx.fillRect(ox + gx0 * s, oy + subY * s, (gx1 - gx0) * s, dep * s); }
      // gövdenin çoğunluk taşıyıcıları (yazı alanlarından uzak)
      holes.forEach(([a, b]) => {
        const x = 16 + a * 308, y = subY + 5 + b * (subH - 30);
        if ((x > 26 && x < 106 && y < subY + wellH + 17) || (x > 236 && x < 316 && y < subY + wellH + 17)) return;
        if (x > gx0 - 4 && x < gx1 + 4 && y < subY + Math.max(dep, 12) + 14) return;
        ctx.beginPath(); ctx.arc(ox + x * s, oy + y * s, 2.4 * s, 0, Math.PI * 2);
        if (pch) { ctx.fillStyle = "#8fb0ff"; ctx.fill(); } else { ctx.strokeStyle = "#ff9aa9"; ctx.lineWidth = 1.2; ctx.stroke(); }
      });
      // kuyulardaki taşıyıcılar
      const carrier = (x, y, r = 2.5) => { ctx.beginPath(); ctx.arc(ox + x * s, oy + y * s, r * s, 0, Math.PI * 2); if (pch) { ctx.strokeStyle = "#ffb3be"; ctx.lineWidth = 1.4; ctx.stroke(); } else { ctx.fillStyle = "#a9c4ff"; ctx.fill(); } };
      wellQ.forEach(([a, b], i) => { const x0 = i % 2 ? 240 : 30; carrier(x0 + 8 + a * (wellW - 16), subY + 5 + b * (wellH - 12)); });
      T(pch ? "p+" : "n+", 66, subY + wellH + 9, rgba(C.silk, 0.75), "center", 11, 700, FONT.mono);
      T(pch ? "p+" : "n+", 276, subY + wellH + 9, rgba(C.silk, 0.75), "center", 11, 700, FONT.mono);
      // inversiyon katmanı = kanal
      const vov = Math.max(0, vgsAbs - vth);
      const th = 9 * clamp(vov / 2, 0.15, 1);
      if (vov > 0.02) {
        ctx.fillStyle = rgba(pch ? "#ff9aa9" : "#8fb0ff", 0.18 + 0.3 * clamp(vov / 2, 0, 1));
        ctx.fillRect(ox + (gx0 - 6) * s, oy + subY * s, (gx1 - gx0 + 12) * s, (th + 2) * s);
        flowPh += dt * clamp(st.Id / 0.5, 0, 1.2) * 0.6;
        const nShow = Math.round(chQ.length * clamp(vov / 1.5, 0.15, 1));
        chQ.slice(0, nShow).forEach(([a, b]) => { const x = gx0 - 6 + (((a + flowPh) % 1) * (gx1 - gx0 + 12)); carrier(x, subY + 1.5 + b * th, 2.2); });
        T(S.xsCh, (gx0 + gx1) / 2, subY + Math.max(dep, th) + 16, C.silk, "center", 11, 700);
      } else T(S.xsNoCh, (gx0 + gx1) / 2, subY + Math.max(dep, 4) + 16, C.muted, "center", 11, 600);
      // oksit, kapı, kontaklar
      R(gx0 - 6, subY - 8, gx1 - gx0 + 12, 8, "rgba(205,220,212,0.6)");
      R(gx0, subY - 30, gx1 - gx0, 22, C.copper, "#f0b07a");
      R(48, subY - 14, 36, 14, "#9aa6a0"); R(258, subY - 14, 36, 14, "#9aa6a0");
      const nq = Math.round(clamp(Math.abs(st.vgs) / 5, 0, 1) * 9);
      for (let i = 0; i < nq; i++) T(pch ? "−" : "+", gx0 + 10 + i * ((gx1 - gx0 - 20) / 8), subY - 19, "#1b0e03", "center", 14, 800, FONT.mono);
      // uç bağlantıları ve gerilimleri
      const lead = (x, y0, v) => { ctx.strokeStyle = L.vcolor(v, 0, 5); ctx.lineWidth = Math.max(2, 3 * s); ctx.beginPath(); ctx.moveTo(ox + x * s, oy + y0 * s); ctx.lineTo(ox + x * s, oy + 16 * s); ctx.stroke(); };
      lead(66, subY - 14, st.vS); lead(170, subY - 30, st.vG); lead(276, subY - 14, st.vD);
      T(S.xsS, 66, 6, C.silk, "center", 11.5, 700); T(S.xsG, 170, 6, C.silk, "center", 11.5, 700); T(S.xsD, 276, 6, C.silk, "center", 11.5, 700);
      [[st.vS, 66], [st.vG, 170], [st.vD, 276]].forEach(([v, x]) => T(fmt(v, "V"), x + 7, 30, C.silk2, "left", 10.5, 600, FONT.mono));
      // alt satır: gövde türü ve eşik
      T(pch ? S.xsSubP : S.xsSub, 316, lblY, rgba(C.silk, 0.75), "right", 10.5, 600);
      T(`${S.vth} = ${pch ? "−" : ""}${fmt(vth, "V")}`, 22, lblY, C.gold, "left", 10.5, 600, FONT.mono);
      // açıklama satırı
      const ly = subY + subH + 14;
      R(40, ly - 3, 12, 6, "rgba(205,220,212,0.6)"); T(S.xsOx, 58, ly, C.silk2, "left", 10, 600);
      ctx.beginPath(); ctx.arc(ox + 162 * s, oy + ly * s, 2.5 * s, 0, Math.PI * 2); ctx.fillStyle = "#a9c4ff"; ctx.fill();
      T(S.xsElec, 169, ly, C.silk2, "left", 10, 600);
      ctx.beginPath(); ctx.arc(ox + 252 * s, oy + ly * s, 2.5 * s, 0, Math.PI * 2); ctx.strokeStyle = "#ff9aa9"; ctx.lineWidth = 1.3; ctx.stroke();
      T(S.xsHoles, 259, ly, C.silk2, "left", 10, 600);
    }
    xs = canvas(xsCv, () => xsDraw(0));
    const lp = loop((dt) => xsDraw(dt));
    return { enter() { sch.start(); lp.start(); }, leave() { sch.stop(); lp.stop(); }, sch };
  };
  G.mosfet = [{ slide: "label:Kapı gerilimi", to: 1.2 }, { wait: 700 }, { slide: "label:Kapı gerilimi", to: 3.3 }, { wait: 900 }, { click: "=Standart" }];

  /* =====================================================================
     7.2 PWM
     ===================================================================== */
  const SLOW = 0.5; // bir PWM periyodu ekranda kaç saniye sürsün
  Demos.c7pwm = function (stage) {
    let duty = 0.5, f = 1000, load = "led";
    const wave = () => ({ type: "square", low: 0, high: 5, freq: f, duty });
    const tranOf = () => ({ h: Math.min(1 / f / 200, 2e-5), rate: 1 / f / SLOW });
    const defOf = () => {
      const d = clone(load === "led" ? CIRCUITS.c7PwmLed : CIRCUITS.c7PwmMotor);
      d.parts.forEach((p) => { if (p.id === "MCU") p.wave = wave(); });
      d.tran = tranOf();
      return d;
    };
    const schPane = h("div.pane");
    const vzCv = h("canvas", { role: "img", "aria-label": S.eyeLed });
    const vzTitle = h("span.pane-title", S.eyeLed);
    const vzPane = h("div.pane.c7-vz", vzTitle, vzCv);
    const scPane = h("div.pane.c6-scope");
    const top = h("div.c7-pwm-top", schPane, vzPane);
    const body = h("div.split.c7-pwm", top, scPane);
    const mA = meter(S.avg), mD = meter(S.avgCalc), mI = meter(S.avgI), mT = meter(S.period);
    const slowChip = h("span.chip");
    const legend = h("div.legend", h("span", h("i", { style: { background: C.ch1 } }), S.pwmTitleK1), h("span", h("i", { style: { background: C.ch2 } }), S.pwmTitleK2));
    stage.append(body, h("div.c6-strip", h("div.meters", mA, mD, mI, mT), h("div.c6-flags", legend, slowChip)));
    const sch = Schematic(schPane, defOf(), { maxUnit: 24 });
    let avg = null, avgI = 0;
    const sc = Scope(scPane, {
      channels: [{ name: "KN1", vdiv: 2, pos: 0.6 }, { name: "KN2", vdiv: 2, pos: -3.4 }], tdiv: 2e-4, trigger: { ch: 0, level: 2.5, edge: "rise", mode: "auto" },
      overlay(ctx, scp, g) {
        if (avg == null) return;
        const c = scp.channels[0], y = scp.toY(avg, c);
        ctx.strokeStyle = rgba(C.ch1, 0.85); ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(g.m, y); ctx.lineTo(g.m + g.gw, y); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = `600 11px ${FONT.mono}`; ctx.fillStyle = C.ch1; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        ctx.fillText(`ort. ${fmt(avg, "V")}`, g.m + g.gw - 6, y - 3);
      },
    });
    // periyot ortalaması: yük gerilimi ve yük akımının zaman integrali / T
    let acc = null;
    const loadV = () => sch.v(sch.netOf("P2", "a")) - sch.v(sch.netOf("P3", "a"));
    const loadI = () => Math.abs(sch.sim.i(load === "led" ? "LED1" : "LM"));
    sch.on("step", (t) => {
      const vp = sch.v(sch.netOf("MCU", "o"));
      sc.push(t, [vp, loadV()]);
      const pi = Math.floor(t * f + 1e-9);
      if (!acc || pi !== acc.pi) {
        if (acc && acc.dt > 0.98 / f) { avg = acc.v / acc.dt; avgI = acc.i / acc.dt; }
        acc = { pi, v: 0, i: 0, dt: 0, tl: t };
      }
      const dt = t - acc.tl; acc.tl = t;
      acc.v += vp * dt; acc.i += loadI() * dt; acc.dt += dt;
    });
    function retime() {
      const tr = tranOf();
      sch.def.tran.h = tr.h; sch.def.tran.rate = tr.rate;
      const T = 1 / f, cands = Scope.TSEQ.filter((x) => x <= 0.3 * T);
      sc.setTdiv(cands.length ? cands[cands.length - 1] : Scope.TSEQ[0]);
      acc = null; avg = null;
      slowChip.textContent = S.slow(`${num(SLOW, 1)} s`) + ` (${fmt(T, "s")})`;
      mT.val.textContent = fmt(T, "s");
    }
    const dS = slider({ label: S.duty, min: 0, max: 100, step: 1, value: duty * 100, fmt: (v) => "%" + Math.round(v), oninput: (v) => { duty = v / 100; sch.set("MCU", "wave", wave()); acc = null; } });
    const fS = slider({ label: S.freq, min: 20, max: 5000, step: 1, value: f, log: true, fmt: (v) => fmt(v, "Hz"), oninput: (v) => { f = v; sch.set("MCU", "wave", wave()); retime(); } });
    const lSeg = seg([["led", S.lLed], ["motor", S.lMotor]], load, (v) => { load = v; sch.rebuild(defOf()); sc.clear(); acc = null; avg = null; vzTitle.textContent = v === "led" ? S.eyeLed : S.eyeMotor; }, "Yük");
    stage.append(h("div.controls", dS, fS, lSeg));
    retime();

    // gözün gördüğü parlaklık / motor hızı: ortalamaya eylemsizlikle yaklaşır
    let vz, bright = 0, speed = 0, ang = 0;
    function vzDraw(dt) {
      if (!vz || !vz.w) return;
      const { ctx, w, h: H } = vz;
      ctx.clearRect(0, 0, w, H);
      const cx = w / 2, cy = H * 0.4, r = Math.min(w, H) * 0.17;
      const target = avg == null ? 0 : load === "led" ? clamp(avgI / 0.02, 0, 1.2) : clamp(avg / 5, 0, 1.1);
      const k = 1 - Math.exp(-dt / 0.25);
      if (load === "led") {
        bright += (target - bright) * k;
        const col = Circuit.LED.kirmizi.color;
        if (bright > 0.01) {
          const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * (1.4 + 2.2 * bright));
          gr.addColorStop(0, rgba(col, 0.75 * Math.min(1, bright))); gr.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r * (1.4 + 2.2 * bright), 0, Math.PI * 2); ctx.fill();
        }
        // LED kubbesi ve bacakları
        ctx.fillStyle = L.mix(C.mask2, col, 0.25 + 0.75 * Math.min(1, bright));
        ctx.strokeStyle = C.silk; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy - r * 0.2, r * 0.8, Math.PI, 0); ctx.lineTo(cx + r * 0.8, cy + r * 0.7); ctx.lineTo(cx - r * 0.8, cy + r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillRect(cx - r * 0.95, cy + r * 0.7, r * 1.9, r * 0.18); ctx.strokeRect(cx - r * 0.95, cy + r * 0.7, r * 1.9, r * 0.18);
        ctx.strokeStyle = C.silk2; ctx.beginPath(); ctx.moveTo(cx - r * 0.35, cy + r * 0.9); ctx.lineTo(cx - r * 0.35, cy + r * 1.7); ctx.moveTo(cx + r * 0.35, cy + r * 0.9); ctx.lineTo(cx + r * 0.35, cy + r * 1.5); ctx.stroke();
        ctx.font = `600 12px ${FONT.mono}`; ctx.fillStyle = C.silk2; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(`ort. ${fmt(avgI, "A")}`, cx, cy + r * 1.85);
      } else {
        speed += (target - speed) * (1 - Math.exp(-dt / 0.6));
        ang += speed * dt * 9;
        ctx.strokeStyle = C.silk; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2); ctx.stroke();
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
        ctx.fillStyle = C.copper; ctx.strokeStyle = C.copper2;
        for (let i = 0; i < 3; i++) { ctx.rotate((Math.PI * 2) / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.5, -r * 0.35, r * 0.95, -r * 0.12); ctx.lineTo(r * 0.95, r * 0.14); ctx.quadraticCurveTo(r * 0.45, r * 0.1, 0, 0); ctx.fill(); }
        ctx.restore();
        ctx.fillStyle = C.mask; ctx.beginPath(); ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        // hız çubuğu
        const bw = Math.min(w * 0.7, 220), bx = cx - bw / 2, by = cy + r * 1.45;
        ctx.fillStyle = rgba(C.silk, 0.1); ctx.fillRect(bx, by, bw, 8);
        ctx.fillStyle = C.copper2; ctx.fillRect(bx, by, bw * clamp(speed, 0, 1), 8);
        ctx.font = `600 12px ${FONT.mono}`; ctx.fillStyle = C.silk2; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(`${S.rpm} %${Math.round(clamp(speed, 0, 1.1) * 100)} · ort. ${fmt(avgI, "A")}`, cx, by + 14);
      }
    }
    vz = canvas(vzCv, () => vzDraw(0));
    function update() {
      mA.val.textContent = avg == null ? "…" : fmt(avg, "V");
      mI.val.textContent = avg == null ? "…" : fmt(avgI, "A");
      mD.val.textContent = fmt(duty * 5, "V");
    }
    sch.on("change", update);
    update();
    const lp = loop((dt) => { sc.draw(); vzDraw(dt); });
    return { enter() { sch.start(); lp.start(); }, leave() { sch.stop(); lp.stop(); }, sch };
  };
  G.pwm = [{ slide: "label:Görev oranı", to: 20 }, { wait: 1800 }, { slide: "label:Görev oranı", to: 85 }];

  /* =====================================================================
     7.3 BJT mi, MOSFET mi?
     ===================================================================== */
  Demos.c7karsilastir = function (stage) {
    const T = STR.ch06.table, Q = STR.ch06.quiz;
    let view = "live", I = 0.5;
    const tabs = seg([["live", S.tabLive], ["table", S.tabTable], ["quiz", S.tabQuiz]], view, (v) => show(v), "Görünüm");
    stage.append(h("div.controls.top", tabs));
    // canlı karşılaştırma
    const schPane = h("div.pane");
    const ROWS = [["drv", S.drive], ["drop", S.drop], ["loss", S.loss], ["got", S.loadGot]];
    const cells = { bjt: {}, mos: {} };
    const grid = h("div.c7-cmp", h("span"), h("b.c7-ch", S.bjt), h("b.c7-ch", S.mos),
      ROWS.flatMap(([k, lab]) => [h("span.c7-lab", lab), ...["bjt", "mos"].map((sd) => (cells[sd][k] = h("span.c7-val", "—")))]));
    const live = h("div.c7-live", h("div.split.c7-live-sch", schPane), grid);
    const iS = slider({ label: S.iload, min: 0.1, max: 3, step: 0.05, value: I, fmt: (v) => fmt(v, "A"), oninput: (v) => { I = v; setLoad(); } });
    const liveCtl = h("div.controls", iS);
    // tablo
    const tbl = h("table.c7-tbl", h("thead", h("tr", T.head.map((t) => h("th", { html: t })))), h("tbody", T.rows.map((r) => h("tr", r.map((c, i) => h(i ? "td" : "th", { html: c }))))));
    const tableV = h("div.c7-tblwrap", tbl);
    // bilmece
    let qi = 0, score = 0, answered = false;
    const qText = h("p.c7-q"), qOpts = h("div.c7-opts"), qWhy = h("p.c7-why"), qNum = h("span.c7-qnum"), qScore = h("span.c7-score");
    const qNext = btn(S.qNext, () => { if (qi < Q.length - 1) { qi++; renderQ(); } else { qi = 0; score = 0; renderQ(); } }, "primary");
    const quizV = h("div.c7-quiz", h("div.c7-qhead", qNum, qScore), qText, qOpts, qWhy, h("div.c7-qfoot", qNext));
    function renderQ() {
      answered = false;
      const q = Q[qi];
      qNum.textContent = `${qi + 1} / ${Q.length}`;
      qScore.textContent = S.qScore(score, Q.length);
      qText.textContent = q.q;
      qWhy.innerHTML = ""; qWhy.className = "c7-why";
      qOpts.innerHTML = "";
      [["bjt", S.optBjt], ["mos", S.optMos], ["both", S.optBoth]].forEach(([k, lab]) => {
        const b = h("button.btn.c7-opt", { type: "button", onclick: () => answer(k, b) }, lab);
        b.dataset.k = k; qOpts.append(b);
      });
      qNext.textContent = qi < Q.length - 1 ? S.qNext : S.qAgain;
      qNext.disabled = true;
    }
    function answer(k, b) {
      if (answered) return;
      answered = true;
      const q = Q[qi], ok = k === q.a;
      if (ok) score++;
      qOpts.querySelectorAll("button").forEach((x) => { x.disabled = x !== b && x.dataset.k !== q.a; x.classList.toggle("right", x.dataset.k === q.a); x.classList.toggle("wrong", x === b && !ok); });
      qWhy.innerHTML = `<b>${ok ? S.qRight : S.qWrong}</b>${q.why}`;
      qWhy.classList.add(ok ? "ok" : "no");
      qScore.textContent = S.qScore(score, Q.length);
      qNext.disabled = false;
    }
    renderQ();
    const views = { live: [live, liveCtl], table: [tableV], quiz: [quizV] };
    Object.values(views).flat().forEach((el) => stage.append(el));
    function show(v) {
      view = v;
      Object.entries(views).forEach(([k, els]) => els.forEach((el) => (el.style.display = k === v ? "" : "none")));
      if (v === "live") sch.layout();
    }
    const sch = Schematic(schPane, clone(CIRCUITS.c7Cmp), {
      maxUnit: 24,
      overlay(ctx, s) { heatGlow(ctx, s, [10.6, 10], Math.abs(s.sim.p("Q1")), 1.2); heatGlow(ctx, s, [27.6, 10], Math.abs(s.sim.p("M1")), 1.2); },
    });
    function setLoad() { ["L1", "L2"].forEach((id) => sch.set(id, { R: 5 / I, Pnom: 5 * I })); }
    function update() {
      const s = sch.sim, q = s.info("Q1"), m = s.info("M1");
      const put = (c, drv, drop, loss, got) => { c.drv.textContent = fmt(drv, "A"); c.drop.textContent = fmt(drop, "V"); c.loss.textContent = fmt(loss, "W"); c.got.textContent = fmt(got, "A"); };
      const pb = Math.abs(s.p("Q1")), pm = Math.abs(s.p("M1"));
      put(cells.bjt, Math.abs(s.i("MCU1")), q.vce, pb, Math.abs(s.i("L1")));
      put(cells.mos, Math.abs(s.i("MCU2")), m.vds, pm, Math.abs(s.i("L2")));
      cells.bjt.loss.classList.toggle("hot", pb > 0.25); cells.mos.loss.classList.toggle("hot", pm > 0.25);
      cells.bjt.got.classList.toggle("low", Math.abs(s.i("L1")) < 0.95 * I);
    }
    sch.on("change", update);
    setLoad(); show("live"); update();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["bjt-mi-mosfet-mi"] = [{ slide: "label:Yük akımı", to: 1 }, { wait: 900 }, { slide: "label:Yük akımı", to: 2.2 }, { wait: 1200 }, { click: "=Hangisini seçerdin?" }];
})();
