/* 8. bölüm: opamp deneyleri */
(function () {
  const { C, FONT, h, slider, seg, btn, canvas, num, rgba, mix, clamp } = L;
  const fmt = (v, u, d) => Circuit.fmt(v, u, d);
  window.STR = window.STR || {};
  const S = STR.ch08;
  window.GUIDES = window.GUIDES || {};
  window.GUIDE_TARGETS = window.GUIDE_TARGETS || {};
  const G = window.GUIDES;
  const clone = (name) => JSON.parse(JSON.stringify(CIRCUITS[name]));
  const legItem = (col, t) => h("span", h("i.c8-sw", { style: { background: col } }), t);
  // geçici rejimde parametre sıçrayınca Newton yanlış rayda takılabilir: çalışma noktasını
  // o anki zamanda yeniden çöz (kaynak adımlamalı DC). Devrede kondansatör yok, durum kaybolmaz.
  const reinit = (sch) => sch.sim.tranInit({ t0: sch.sim.t });
  // LCD ölçüm kutusu
  function meter(label) {
    const b = h("b", "—");
    const el = h("div.meter", h("small", label), b);
    el.set = (t) => { if (b.textContent !== t) b.textContent = t; };
    el.label = (t) => { el.firstChild.textContent = t; };
    return el;
  }

  /* ================= 8.1 Opamp nedir? ================= */
  Demos.c8Nedir = function (stage) {
    const top = h("div.pane");
    const graphPane = h("div.pane", h("span.pane-title", S.transferTitle));
    const gcv = h("canvas", { role: "img", "aria-label": S.transferTitle });
    graphPane.append(gcv);
    const m = { vp: meter(S.mVp), vm: meter(S.mVm), d: meter(S.mDiff), ad: meter(S.mAd), out: meter(S.mOut), iin: meter(S.mIin) };
    const flag = h("p.flag.c8-flag");
    const side = h("div.c8-side", h("div.meters.c8-grid2", Object.values(m)), flag);
    stage.append(h("div.split.c8-split", { style: { gridTemplateRows: "1.25fr 1fr" } }, top, h("div.c8-bottom", graphPane, side)));

    let fb = false, Vp = 2, Vm = 2.5, fine = 0;
    const A = CIRCUITS.c8Acik.parts.find((p) => p.id === "U1").A;
    const def = clone("c8Acik");
    def.parts.find((p) => p.id === "B1").V = Vp;
    def.parts.find((p) => p.id === "B2").V = Vm;
    const sch = Schematic(top, def, { maxUnit: 26 });

    // aktarım eğrisi: aynı opamp modeliyle ayrı bir benzetimde fark taranarak çıkarılır
    const U = CIRCUITS.c8Acik.parts.find((p) => p.id === "U1");
    const XR = 400e-6;
    const curve = (() => {
      const s = Circuit.create([
        { type: "V", id: "VD", n: ["p", "0"], V: 0 },
        { type: "OA", id: "U", n: ["p", "0", "o"], A: U.A, vpos: U.vpos, vneg: U.vneg, headroom: U.headroom },
        { type: "R", id: "RL", n: ["o", "0"], R: 10000 },
      ]);
      const pts = [];
      for (let k = 0; k <= 160; k++) { const vd = -XR + (2 * XR * k) / 160; s.set("VD", "V", vd); s.dc(); pts.push([vd, s.v("o")]); }
      return pts;
    })();

    const vps = slider({ label: S.vp, min: 0, max: 5, step: 0.01, value: Vp, fmt: (v) => fmt(v, "V"), oninput: (v) => { Vp = v; sch.set("B1", "V", Vp + fine); } });
    const vms = slider({ label: S.vm, min: 0, max: 5, step: 0.01, value: Vm, fmt: (v) => fmt(v, "V"), oninput: (v) => { Vm = v; if (!fb) sch.set("B2", "V", v); } });
    const fines = slider({ label: S.fine, min: -300e-6, max: 300e-6, step: 1e-6, value: 0, fmt: (v) => (Math.abs(v) < 5e-7 ? "0 µV" : (v > 0 ? "+" : "") + fmt(v, "V")), oninput: (v) => { fine = v; sch.set("B1", "V", Vp + fine); } });
    fines.classList.add("c8-fine");
    const vmText = vms.firstChild;
    const fbBtn = btn(S.fbOn, () => setFb(!fb), "primary");
    stage.append(h("div.controls", vps, vms, fines, h("span.spacer"), fbBtn));

    function setFb(on) {
      fb = on;
      const d = clone(on ? "c8Izleyici" : "c8Acik");
      d.parts.forEach((p) => { if (p.id === "B1") p.V = Vp + fine; if (p.id === "B2") p.V = Vm; });
      sch.rebuild({ title: d.title, parts: d.parts, wires: d.wires, bounds: d.bounds });
      fbBtn.textContent = on ? S.fbOff : S.fbOn;
      fbBtn.classList.toggle("primary", !on);
      vms.input.disabled = on;
      vms.classList.toggle("c8-dis", on);
      vmText.textContent = on ? S.vmFb : S.vm;
      vms.querySelector(".val").textContent = on ? "—" : fmt(Vm, "V");
      update();
    }

    let gs;
    function drawGraph() {
      if (!gs || !gs.w) return;
      const { ctx, w, h: H } = gs;
      ctx.clearRect(0, 0, w, H);
      const l = 48, r = 26, t = 30, b = 26, gw = w - l - r, gh = H - t - b;
      const Y0 = 12;
      const X = (v) => l + ((v + XR) / (2 * XR)) * gw, Y = (v) => t + gh / 2 - (v / Y0) * (gh / 2);
      ctx.strokeStyle = rgba(C.silk, 0.1); ctx.lineWidth = 1; ctx.beginPath();
      for (let k = -4; k <= 4; k++) { const x = X((k * XR) / 4); ctx.moveTo(x, t); ctx.lineTo(x, t + gh); }
      for (let v = -12; v <= 12; v += 6) { ctx.moveTo(l, Y(v)); ctx.lineTo(l + gw, Y(v)); }
      ctx.stroke();
      ctx.strokeStyle = rgba(C.silk, 0.32); ctx.beginPath(); ctx.moveTo(X(0), t); ctx.lineTo(X(0), t + gh); ctx.moveTo(l, Y(0)); ctx.lineTo(l + gw, Y(0)); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `500 10.5px ${FONT.mono}`;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let k = -4; k <= 4; k += 2) ctx.fillText((k === 0 ? "0" : fmt((k * XR) / 4, "V", 2)).replace(" ", " "), X((k * XR) / 4), t + gh + 6);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let v = -12; v <= 12; v += 6) ctx.fillText((v > 0 ? "+" : "") + num(v, 0) + " V", l - 6, Y(v));
      ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = C.muted;
      ctx.font = `600 11px ${FONT.display}`;
      ctx.fillText(S.axisOut + " ↑   " + S.axisDiff + " →", l + 6, t + 4);
      // ray çizgileri
      const [hi, lo] = [U.vpos - U.headroom, U.vneg + U.headroom];
      ctx.setLineDash([4, 4]); ctx.strokeStyle = rgba(C.v1, 0.5); ctx.beginPath(); ctx.moveTo(l, Y(hi)); ctx.lineTo(l + gw, Y(hi)); ctx.stroke();
      ctx.strokeStyle = rgba(C.v0, 0.6); ctx.beginPath(); ctx.moveTo(l, Y(lo)); ctx.lineTo(l + gw, Y(lo)); ctx.stroke(); ctx.setLineDash([]);
      // eğri: rengi çıkış gerilimine göre
      ctx.lineWidth = 3; ctx.lineCap = "round";
      for (let k = 1; k < curve.length; k++) {
        const [a, va] = curve[k - 1], [bb, vb] = curve[k];
        ctx.strokeStyle = L.vcolor((va + vb) / 2, -12, 12);
        ctx.beginPath(); ctx.moveTo(X(a), Y(va)); ctx.lineTo(X(bb), Y(vb)); ctx.stroke();
      }
      // doğrusal bölge işareti
      const lin = hi / A;
      ctx.fillStyle = rgba(C.gold, 0.08); ctx.fillRect(X(-lin), t, X(lin) - X(-lin), gh);
      // çalışma noktası
      const sim = sch.sim;
      const vd = sim.v(sch.netOf("U1", "p")) - sim.v(sch.netOf("U1", "m"));
      const vo = sim.v(sch.netOf("U1", "o"));
      const off = Math.abs(vd) > XR;
      const px = X(clamp(vd, -XR, XR)), py = Y(vo);
      ctx.strokeStyle = rgba(C.amp, 0.5); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px, Y(0)); ctx.lineTo(px, py); ctx.lineTo(l, py); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.amp; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.mask; ctx.lineWidth = 2; ctx.stroke();
      if (off) {
        ctx.fillStyle = C.amp; ctx.font = `600 11.5px ${FONT.display}`;
        ctx.textAlign = vd > 0 ? "right" : "left"; ctx.textBaseline = "middle";
        ctx.fillText((vd > 0 ? "" : "← ") + S.offGraph + (vd > 0 ? " →" : ""), vd > 0 ? px - 12 : px + 12, py + (vo > 0 ? 16 : -16));
      }
    }
    gs = canvas(gcv, drawGraph);

    function update() {
      const sim = sch.sim;
      const vp = sim.v(sch.netOf("U1", "p")), vm = sim.v(sch.netOf("U1", "m")), vo = sim.v(sch.netOf("U1", "o"));
      const vd = vp - vm;
      const it = sim.terminals("U1");
      m.vp.set(num(vp, 5) + " V");
      m.vm.set(num(vm, 5) + " V");
      m.d.set((vd > 0 ? "+" : "") + fmt(vd, "V"));
      m.ad.set(fmt(A * vd, "V"));
      m.out.set((vo > 0.0005 ? "+" : "") + fmt(vo, "V"));
      m.iin.set(fmt(Math.abs(it[0]) + Math.abs(it[1]), "A"));
      const inf = sim.info("U1");
      flag.classList.toggle("ok", !inf.clipped);
      flag.textContent = inf.clipped ? (vo > 0 ? S.railHi : S.railLo) : fb ? S.follow : S.linear;
      drawGraph();
    }
    sch.on("change", update);
    update();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["opamp-nedir"] = [{ slide: "label:V+", to: 2.6 }, { wait: 700 }, { slide: "label:V−", to: 3.2 }, { wait: 700 }, { click: "Geri besleme bağla" }];

  /* ================= 8.2 Karşılaştırıcı ================= */
  // LDR (ör. GL5528 sınıfı): 10 lux'ta ~15 kΩ, R ∝ lux^−0,7 (basitleştirilmiş)
  const ldrR = (lux) => Math.min(1e6, 15000 * Math.pow(lux / 10, -0.7));
  Demos.c8Karsilastirici = function (stage) {
    const top = h("div.pane");
    const scv = h("canvas", { role: "img", "aria-label": S.light });
    const m = { lux: meter(S.mLux), ldr: meter(S.mLdr), v1: meter(S.mVldr), v2: meter(S.mVref) };
    const skyPane = h("div.c8-col", h("div.pane.c8-sky", scv), h("div.meters.c8-grid2", Object.values(m)));
    const scopePane = h("div.pane.c8-scopepane");
    const flag = h("p.flag.c8-flag");
    const legend = h("p.c8-leg", legItem(C.ch1, S.legSensor), legItem(C.ch2, S.legThr), legItem(C.ch3, S.legOut), h("span.c8-legt", S.legLast));
    stage.append(h("div.split.c8-split", top, h("div.c8-bottom.c8-b2", skyPane, h("div.c8-col", scopePane, legend, flag))));

    let lux = 300, noiseOn = false, nz = 0, anim = null, tNow = 0;
    const def = clone("c8Karsilastirici");
    def.parts.find((p) => p.id === "LDR").R = ldrR(lux);
    const sch = Schematic(top, def, { maxUnit: 26 });
    const sc = Scope(scopePane, { style: {},
      channels: [{ name: "KN1", vdiv: 1, pos: -3, fixed: true }, { name: "KN2", vdiv: 1, pos: -3, fixed: true }, { name: "KN3", vdiv: 1, pos: -3, fixed: true }],
      tdiv: 1, trigger: { mode: "none" }, controls: false, capacity: 4000,
    });

    const luxS = slider({ label: S.light, min: 0.1, max: 1000, step: 0, value: lux, log: true, fmt: (v) => num(v, v < 10 ? 1 : 0) + " lux", oninput: (v) => { anim = null; lux = v; applyLux(); } });
    const thrS = slider({ label: S.thr, min: 0, max: 1, step: 0.01, value: 0.5, fmt: (v) => "%" + num(v * 100, 0), oninput: (v) => sch.set("P1", "pos", v) });
    const sunBtn = btn(S.dusk, () => {
      const dark = lux < 18;
      anim = { from: Math.log(lux), to: Math.log(dark ? 600 : 0.4), t: 0, dur: 6 };
    }, "primary");
    const nzBtn = btn(S.noise, () => { noiseOn = !noiseOn; nzBtn.classList.toggle("on", noiseOn); nzBtn.setAttribute("aria-pressed", noiseOn); if (!noiseOn) applyLux(); });
    nzBtn.setAttribute("aria-pressed", "false");
    stage.append(h("div.controls", luxS, thrS, h("span.spacer"), sunBtn, nzBtn));

    function applyLux() {
      const eff = noiseOn ? lux * (1 + nz) : lux;
      sch.set("LDR", "R", ldrR(eff));
    }
    const nets = () => [sch.netOf("U1", "p"), sch.netOf("U1", "m"), sch.netOf("U1", "o")];

    let ss;
    function drawSky() {
      if (!ss || !ss.w) return;
      const { ctx, w, h: H } = ss;
      ctx.clearRect(0, 0, w, H);
      const k = clamp(Math.log10(lux / 0.1) / 4, 0, 1); // 0 = gece, 1 = gündüz
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, mix("#081a22", "#3d6d6a", k));
      g.addColorStop(1, mix(C.mask, "#c9a95c", k * 0.75));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, 0, w, H, 8) : ctx.rect(0, 0, w, H); ctx.fill();
      // yıldızlar
      const r = L.rng(7);
      for (let i = 0; i < 40; i++) {
        const x = r() * w, y = r() * H * 0.6, a = (1 - k * 1.6) * (0.4 + 0.6 * r());
        if (a <= 0) continue;
        ctx.fillStyle = rgba(C.silk, a); ctx.fillRect(x, y, 1.6, 1.6);
      }
      // güneş yayı: alçalıp yükselir
      const sx = w * (0.18 + 0.64 * k), sy = H * (0.92 - 0.72 * Math.sin(k * Math.PI * 0.5));
      const rad = Math.min(w, H) * 0.09;
      if (k > 0.12) {
        const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad * 4);
        gl.addColorStop(0, rgba(C.gold, 0.55 * k)); gl.addColorStop(1, rgba(C.gold, 0));
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, sy, rad * 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = mix(C.copper, C.gold, k); ctx.beginPath(); ctx.arc(sx, sy, rad, 0, Math.PI * 2); ctx.fill();
      } else {
        // ay
        const mx = w * 0.78, my = H * 0.2;
        ctx.fillStyle = rgba(C.silk, 0.85); ctx.beginPath(); ctx.arc(mx, my, rad * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = mix("#081a22", "#3d6d6a", k); ctx.beginPath(); ctx.arc(mx + rad * 0.35, my - rad * 0.15, rad * 0.7, 0, Math.PI * 2); ctx.fill();
      }
      // ufuk
      ctx.fillStyle = rgba("#06150f", 0.55); ctx.fillRect(0, H * 0.86, w, H * 0.14);
      // ad
      const nm = S.luxNames.find(([v]) => lux < v)[1];
      ctx.fillStyle = k > 0.6 ? "#17200f" : C.silk; ctx.font = `700 13px ${FONT.display}`; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(nm, 10, 8);
    }
    ss = canvas(scv, drawSky);

    function update() {
      const sim = sch.sim;
      const [np, nm, no] = nets();
      const v1 = sim.v(np), v2 = sim.v(nm), vo = sim.v(no);
      const eff = noiseOn ? lux * (1 + nz) : lux;
      m.lux.set(num(eff, eff < 10 ? 1 : 0) + " lux");
      m.ldr.set(fmt(sim.get("LDR", "R"), "Ω"));
      m.v1.set(fmt(v1, "V"));
      m.v2.set(fmt(v2, "V"));
      const on = vo > 2.5;
      flag.classList.toggle("ok", !on);
      flag.textContent = on ? S.ledOn(vo) : S.ledOff(vo);
      sunBtn.textContent = lux < 18 ? S.dawn : S.dusk;
      const pos = sch.part("P1").pos;
      if (Math.abs(thrS.get() - pos) > 0.004) thrS.set(pos);
      drawSky();
    }
    sch.on("change", update);
    update();
    // ekran boş başlamasın: son 10 saniye bugünkü değerlerle dolu
    { const [np, nm, no] = nets(); for (let k = 0; k <= 100; k++) sc.push(-10 + k * 0.1, [sch.v(np), sch.v(nm), sch.v(no)]); }

    const tick = (dt) => {
      tNow += dt;
      if (anim) {
        anim.t += dt;
        const f = L.ease(Math.min(1, anim.t / anim.dur));
        lux = Math.exp(L.lerp(anim.from, anim.to, f));
        luxS.set(lux);
        applyLux();
        if (anim.t >= anim.dur) anim = null;
      }
      if (noiseOn) {
        // yavaş değişen rastgele dalgalanma + 100 Hz lamba titremesinin örneklenmiş hali
        nz = clamp(nz * 0.9 + (Math.random() - 0.5) * 0.12, -0.3, 0.3);
        applyLux();
      }
      const [np, nm, no] = nets();
      sc.push(tNow, [sch.v(np), sch.v(nm), sch.v(no)]);
      sc.draw();
    };
    const lp = L.loop(tick);
    return { enter() { sch.start(); lp.start(); }, leave() { sch.stop(); lp.stop(); anim = null; }, sch };
  };
  G["karsilastirici"] = [{ slide: "label:Işık", to: 40 }, { wait: 700 }, { slide: "label:Işık", to: 3 }, { wait: 600 }];

  /* ================= 8.3 Eviren / evirmeyen yükselteç ================= */
  Demos.c8Yukseltec = function (stage) {
    const top = h("div.pane");
    const scopePane = h("div.pane.c8-scopepane");
    const m = { gf: meter(S.gainF), gm: meter(S.gainM), pk: meter(S.outPk) };
    const fml = h("p.c8-fml");
    const flag = h("p.flag.c8-flag");
    const side = h("div.c8-side", fml, h("div.meters.c8-col1", m.gf, m.gm, m.pk), h("p.c8-hint", S.measHint), flag);
    stage.append(h("div.split.c8-split.c8-amp", top, h("div.c8-bottom.c8-b3", scopePane, side)));

    let mode = "inv", Rf = 47000, Rin = 10000, amp = 1, sup = 12;
    const sch = Schematic(top, clone("c8Eviren"), { maxUnit: 26, tick: () => sc.draw() });
    const sc = Scope(scopePane, { style: {},
      channels: [{ name: "KN1", vdiv: 5, pos: 0 }, { name: "KN2", vdiv: 5, pos: 0 }],
      tdiv: 2e-4, trigger: { ch: 0, level: 0, edge: "rise", mode: "auto" }, pre: 0, capacity: 6000,
      // çıkışın çıkabileceği sınırlar (ray − headroom): kırpılma burada olur
      overlay(ctx, s, g) {
        const hr = sch.part("U1").headroom || 0, c = s.channels[1];
        ctx.strokeStyle = rgba(C.ch2, 0.45); ctx.setLineDash([5, 5]); ctx.lineWidth = 1;
        ctx.font = `600 10.5px ${FONT.mono}`; ctx.fillStyle = rgba(C.ch2, 0.75); ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        [sup - hr, -sup + hr].forEach((v) => {
          const y = s.toY(v, c);
          if (y < g.m || y > g.m + g.gh) return;
          ctx.beginPath(); ctx.moveTo(g.m, y); ctx.lineTo(g.m + g.gw, y); ctx.stroke();
          ctx.fillText(S.railLab + " " + (v > 0 ? "+" : "") + fmt(v, "V"), g.m + g.gw - 6, y - 3);
        });
        ctx.setLineDash([]);
      },
    });
    let nIn, nOut;
    const setNets = () => { nIn = sch.netOf("VIN", "a"); nOut = sch.netOf("U1", "o"); };
    setNets();

    // ölçüm: her periyotta giriş/çıkış tepe değerleri ve işaret (faz)
    const f0 = 1000;
    let per = -1, acc = null, meas = null, clipSeen = false, skip = 1;
    const resetMeas = () => { acc = null; per = -1; skip = 1; reinit(sch); };
    sch.on("step", (t) => {
      if (!sch.sim.converged) reinit(sch);
      const vi = sch.sim.v(nIn), vo = sch.sim.v(nOut);
      sc.push(t, [vi, vo]);
      const k = Math.floor(t * f0 + 1e-9);
      if (k !== per) {
        if (acc && skip <= 0) { meas = acc; update(); }
        skip--;
        per = k; acc = { iMax: -1e9, iMin: 1e9, oMax: -1e9, oMin: 1e9, dot: 0, clip: false };
      }
      acc.iMax = Math.max(acc.iMax, vi); acc.iMin = Math.min(acc.iMin, vi);
      acc.oMax = Math.max(acc.oMax, vo); acc.oMin = Math.min(acc.oMin, vo);
      acc.dot += vi * vo;
      if (sch.sim.info("U1").clipped) acc.clip = true;
    });

    const modeSeg = seg([["inv", S.inv], ["non", S.noninv]], mode, (k) => { mode = k; rebuild(); }, "Yükselteç türü");
    const rfS = slider({ label: S.rf, min: 1000, max: 1e6, step: 100, value: Rf, log: true, fmt: (v) => fmt(v, "Ω"), oninput: (v) => { Rf = v; sch.set("RF", "R", v); resetMeas(); update(); } });
    const rinS = slider({ label: S.rin, min: 1000, max: 100000, step: 100, value: Rin, log: true, fmt: (v) => fmt(v, "Ω"), oninput: (v) => { Rin = v; sch.set(mode === "inv" ? "RIN" : "RG", "R", v); resetMeas(); update(); } });
    const ampS = slider({ label: S.amp, min: 0.05, max: 3, step: 0.05, value: amp, fmt: (v) => fmt(v, "V"), oninput: (v) => { amp = v; sch.set("VIN", "wave", { type: "sin", amp, freq: f0 }); resetMeas(); update(); } });
    const supSeg = seg([[5, "±5 V"], [12, "±12 V"], [15, "±15 V"]], sup, (k) => { sup = k; sch.set("U1", { vpos: k, vneg: -k }); sch.set("SUP", "text", `U1 · besleme ±${k} V`); resetMeas(); }, S.supply);
    const rinText = rinS.firstChild;
    stage.append(h("div.controls", modeSeg, rfS, rinS, ampS, h("label.c8-seglab", S.supply, supSeg)));

    function rebuild() {
      const d = clone(mode === "inv" ? "c8Eviren" : "c8Evirmeyen");
      d.parts.forEach((p) => {
        if (p.id === "RF") p.R = Rf;
        if (p.id === "RIN" || p.id === "RG") p.R = Rin;
        if (p.id === "VIN") p.wave = { type: "sin", amp, freq: f0 };
        if (p.id === "U1") { p.vpos = sup; p.vneg = -sup; }
        if (p.id === "SUP") p.text = `U1 · besleme ±${sup} V`;
      });
      sch.rebuild({ title: d.title, parts: d.parts, wires: d.wires, bounds: d.bounds });
      rinText.textContent = mode === "inv" ? S.rin : S.rg;
      setNets(); sc.clear(); resetMeas(); meas = null;
      update();
    }

    function update() {
      const gF = mode === "inv" ? -Rf / Rin : 1 + Rf / Rin;
      fml.innerHTML = mode === "inv"
        ? `Kazanç = −R<sub>f</sub> / R<sub>in</sub> = −${fmt(Rf, "Ω")} / ${fmt(Rin, "Ω")}`
        : `Kazanç = 1 + R<sub>f</sub> / R<sub>g</sub> = 1 + ${fmt(Rf, "Ω")} / ${fmt(Rin, "Ω")}`;
      m.gf.set((gF > 0 ? "+" : "−") + num(Math.abs(gF), Math.abs(gF) < 10 ? 2 : 1));
      if (!meas) { m.gm.set("…"); m.pk.set("…"); flag.textContent = ""; return; }
      const ipp = meas.iMax - meas.iMin, opp = meas.oMax - meas.oMin;
      const gM = (meas.dot >= 0 ? 1 : -1) * (opp / (ipp || 1));
      m.gm.set((gM > 0 ? "+" : "−") + num(Math.abs(gM), Math.abs(gM) < 10 ? 2 : 1));
      m.pk.set(`${fmt(meas.oMax, "V")} / ${fmt(meas.oMin, "V")}`);
      const clipped = meas.clip || Math.abs(gM) < 0.97 * Math.abs(gF);
      flag.classList.toggle("ok", !clipped);
      flag.textContent = clipped ? S.clip : S.noClip;
      m.gm.classList.toggle("c8-bad", clipped);
    }
    update();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["opamp-yukseltec"] = [{ slide: "label:Rf", to: 100000 }, { wait: 1600 }, { slide: "label:Rf", to: 330000 }, { wait: 1800 }, { click: "=Evirmeyen" }];

  /* ================= 8.4 Toplayıcı ve gerilim izleyici ================= */
  Demos.c8Toplayici = function (stage) {
    let mode = "mix";
    // --- mikser katmanı ---
    const mixTop = h("div.pane");
    const mixScope = h("div.pane.c8-scopepane");
    const mixFlag = h("p.flag.c8-flag");
    const mixLayer = h("div.split.c8-split.c8-mix", mixTop, h("div.c8-col", mixScope, mixFlag));
    // --- izleyici katmanı ---
    const bufTop = h("div.pane");
    const mb = { div: meter(S.mDiv), buf: meter(S.mBuf), iop: meter(S.mIop), il: meter(S.mIload) };
    const bufFlag = h("p.flag.c8-flag.ok");
    const bufLayer = h("div.split.c8-split.c8-buf", bufTop, h("div.c8-bufm", h("div.meters", Object.values(mb)), bufFlag));
    stage.append(mixLayer, bufLayer);

    const RF = 10000;
    let g1 = 1, g2 = 1, RL = 2200, loads = true;
    const mixDef = clone("c8Mikser");
    const sch = Schematic(mixTop, mixDef, { maxUnit: 24 });
    const bsch = Schematic(bufTop, clone("c8Tampon"), { maxUnit: 30 });
    const sc = Scope(mixScope, { style: {},
      channels: [{ name: "KN1", vdiv: 1, pos: 1.8 }, { name: "KN2", vdiv: 1, pos: 1.8 }, { name: "KN3", vdiv: 2, pos: -1.9 }],
      tdiv: 1e-3, trigger: { ch: 0, level: 0, edge: "rise", mode: "auto" }, pre: 0, capacity: 8000,
    });
    const nets = () => [sch.netOf("V1", "a"), sch.netOf("V2", "a"), sch.netOf("U1", "o")];
    let clipT = 0;
    sch.on("step", (t) => {
      if (!sch.sim.converged) reinit(sch);
      const [a, b, o] = nets();
      sc.push(t, [sch.sim.v(a), sch.sim.v(b), sch.sim.v(o)]);
      if (sch.sim.info("U1").clipped) clipT = 0.25;
    });

    const setR = (id, g) => { sch.set(id, { R: g > 0 ? RF / g : 1e9, label: id + " " + (g > 0 ? fmt(RF / g, "Ω") : S.off) }); reinit(sch); };
    setR("R1", g1); setR("R2", g2);
    const l1 = slider({ label: S.lev1, min: 0, max: 3, step: 0.1, value: g1, fmt: (v) => "×" + num(v, 1), oninput: (v) => { g1 = v; setR("R1", v); audioGain(); } });
    const l2 = slider({ label: S.lev2, min: 0, max: 3, step: 0.1, value: g2, fmt: (v) => "×" + num(v, 1), oninput: (v) => { g2 = v; setR("R2", v); audioGain(); } });

    // ses: iki osilatör, devredeki kazançlarla karışır; ±5 V beslemenin sınırı yumuşak kırpıcıyla
    let ac = null, nodes = null;
    const VMAX = 5 - CIRCUITS.c8Mikser.parts.find((p) => p.id === "U1").headroom;
    function audioGain() {
      if (!nodes) return;
      const t = ac.currentTime;
      nodes.g1.gain.setTargetAtTime((g1 * 1) / VMAX, t, 0.03);
      nodes.g2.gain.setTargetAtTime((g2 * 0.5) / VMAX, t, 0.03);
    }
    function audio(on) {
      if (on && !nodes) {
        try {
          ac = ac || new (window.AudioContext || window.webkitAudioContext)();
          const o1 = ac.createOscillator(), o2 = ac.createOscillator();
          o1.frequency.value = 200; o2.frequency.value = 1000;
          const g1n = ac.createGain(), g2n = ac.createGain(), ws = ac.createWaveShaper(), out = ac.createGain();
          const curve = new Float32Array(1025);
          for (let i = 0; i < 1025; i++) { const x = (i / 512 - 1) * 2; curve[i] = Math.max(-1, Math.min(1, x)); }
          ws.curve = curve;
          out.gain.value = 0.12;
          o1.connect(g1n); o2.connect(g2n); g1n.connect(ws); g2n.connect(ws); ws.connect(out); out.connect(ac.destination);
          o1.start(); o2.start();
          nodes = { o1, o2, g1: g1n, g2: g2n, out };
          ac.resume && ac.resume();
          audioGain();
        } catch (e) { nodes = null; }
      } else if (!on && nodes) {
        try { nodes.o1.stop(); nodes.o2.stop(); nodes.out.disconnect(); } catch (e) {}
        nodes = null;
      }
      lsBtn.textContent = nodes ? S.mute : S.listen;
      lsBtn.classList.toggle("on", !!nodes);
    }
    const lsBtn = btn(S.listen, () => audio(!nodes));
    const mixCtl = h("div.c8-ctl", l1, l2, lsBtn);

    // izleyici kontrolleri
    const rlS = slider({ label: S.load, min: 470, max: 100000, step: 10, value: RL, log: true, fmt: (v) => fmt(v, "Ω"), oninput: (v) => { RL = v; bsch.set("RL1", "R", v); bsch.set("RL2", "R", v); } });
    const ldBtn = btn(S.loadsOff, () => { loads = !loads; bsch.set("S1", "closed", loads); bsch.set("S2", "closed", loads); });
    const bufCtl = h("div.c8-ctl", rlS, ldBtn);

    const modeSeg = seg([["mix", S.mixer], ["buf", S.buffer]], mode, (k) => setMode(k), "Deney");
    stage.append(h("div.controls", modeSeg, mixCtl, bufCtl));

    function bufUpdate() {
      const s = bsch.sim;
      const v1 = s.vAcross("VM1"), v2 = s.vAcross("VM2");
      mb.div.set(fmt(v1, "V"));
      mb.buf.set(fmt(v2, "V"));
      const it = s.terminals("U1");
      mb.iop.set(fmt(Math.abs(it[0]), "A"));
      mb.il.set(fmt(Math.abs(s.i("RL2")), "A"));
      const p1 = bsch.part("S1").closed, p2 = bsch.part("S2").closed;
      loads = p1 && p2;
      bufFlag.classList.toggle("ok", !p1);
      bufFlag.textContent = p1 ? S.bufMsg(v1, v2) : S.bufMsgOff(v1);
      ldBtn.textContent = p1 || p2 ? S.loadsOff : S.loadsOn;
    }
    bsch.on("change", bufUpdate);
    bufUpdate();

    let fl = 0;
    const tickMix = (dt) => {
      clipT -= dt;
      const c = clipT > 0;
      if (c !== fl || !mixFlag.textContent) { fl = c; mixFlag.classList.toggle("ok", !c); mixFlag.textContent = c ? S.mixClip : S.mixOk; }
      sc.draw();
    };
    const lp = L.loop(tickMix);
    let active = false;
    function setMode(k) {
      mode = k;
      mixLayer.style.display = k === "mix" ? "" : "none";
      bufLayer.style.display = k === "buf" ? "" : "none";
      mixCtl.style.display = k === "mix" ? "" : "none";
      bufCtl.style.display = k === "buf" ? "" : "none";
      if (!active) return;
      if (k === "mix") { bsch.stop(); sch.start(); lp.start(); }
      else { sch.stop(); lp.stop(); audio(false); bsch.start(); }
    }
    setMode("mix");
    return {
      enter() { active = true; setMode(mode); },
      leave() { active = false; sch.stop(); bsch.stop(); lp.stop(); audio(false); },
      sch,
    };
  };
  G["toplayici-izleyici"] = [{ slide: "label:Kanal 2 seviyesi", to: 2.5 }, { wait: 1500 }, { click: "=Gerilim izleyici" }, { wait: 600 }, { slide: "label:Yük direnci", to: 1000 }];
})();
