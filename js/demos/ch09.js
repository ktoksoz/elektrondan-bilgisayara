/* 9. bölüm deneyleri: analogdan dijitale köprü
   Transistörlü NOT kapısı, CMOS evirici, gürültü payları, CMOS NAND. */
window.STR = window.STR || {};

(function () {
  const { C, FONT, h, slider, seg, btn, canvas, num, rgba, loop, vcolor } = L;
  const S = STR.ch09;
  const fmt = (v, u, d) => Circuit.fmt(v, u, d);
  window.GUIDES = window.GUIDES || {};
  const G = window.GUIDES;
  window.GUIDE_TARGETS = window.GUIDE_TARGETS || {};

  // TTL giriş eşikleri: 0,8 V altı 0, 2 V üstü 1, arası tanımsız
  const VIL = 0.8, VIH = 2.0;
  const level = (v) => (v <= VIL ? 0 : v >= VIH ? 1 : null);
  const lvColor = (l) => (l === 1 ? C.v1 : l === 0 ? C.v0 : C.muted);

  /* Şemaya bağlı, tıklanabilir mantık kaynağı: 0 V ya da V (ör. 5 V) veren gerilim kaynağı.
     Mantık "input" parçası gibi görünür ama analog çözücüde gerçek bir kaynaktır. */
  Schematic.PARTS.c9src = {
    pins: { o: [1, 0] }, box: [-1.6, -0.8, 1, 0.8], interactive: "toggle",
    paths: [{ term: 0, pts: [[1, 0], [0.1, 0]] }],
    el: (p, n) => [{ type: "V", id: p.id, n: [n("o"), "0"], V: p.closed ? (p.V ?? 5) : 0 }],
    elPins: ["o", null],
    draw(g, p) {
      const v = p.closed ? 1 : 0;
      g.rect(-1.5, -0.7, 1.6, 1.4, { fill: rgba(v ? C.v1 : C.v0, 0.22), stroke: v ? C.v1 : C.v0 });
      g.text(String(v), [-0.7, 0.03], { size: 0.9, color: C.silk, weight: 800, font: "mono" });
      g.lead([0.1, 0], [1, 0], "o");
    },
    info(p, sch) { return `<b>${fmt(p.closed ? (p.V ?? 5) : 0, "V")}</b> · ${p.closed ? "1" : "0"}`; },
  };

  /* --- çizim yardımcıları --- */
  function badge(ctx, x, y, lv, u, text) {
    const col = lvColor(lv);
    const s = Math.max(16, u * 1.1);
    ctx.font = `800 ${Math.round(s * 0.62)}px ${FONT.mono}`;
    const t = text ?? (lv === 1 ? "1" : lv === 0 ? "0" : "?");
    const w = Math.max(s, ctx.measureText(t).width + s * 0.5);
    if (lv === 1) {
      const gr = ctx.createRadialGradient(x, y, 0, x, y, s * 1.4);
      gr.addColorStop(0, rgba(C.v1, 0.35)); gr.addColorStop(1, rgba(C.v1, 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, s * 1.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - s / 2, w, s, 4);
    ctx.fillStyle = lv == null ? rgba(C.muted, 0.18) : rgba(col, 0.25); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = col;
    ctx.setLineDash(lv == null ? [4, 3] : []); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.silk; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(t, x, y + 1);
  }
  // transistör adı + açık/kapalı etiketi, iletimdeyse kanal parıltısı
  function mosTag(ctx, sch, id, at, name, align = "left") {
    const inf = sch.sim.info(id);
    const on = inf.region && inf.region !== "kesim";
    const u = sch.unit;
    const p = sch.part(id);
    if (on) {
      const [cx, cy] = sch.screenOf(p.at);
      const k = Math.min(1, 0.35 + Math.max(0, inf.vgs - 1) / 3);
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, u * 2.2);
      gr.addColorStop(0, rgba(C.copper2, 0.32 * k)); gr.addColorStop(1, rgba(C.copper2, 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, u * 2.2, 0, Math.PI * 2); ctx.fill();
    }
    const [x, y] = sch.screenOf(at);
    const fs = Math.max(11, 0.6 * u);
    ctx.textAlign = align; ctx.textBaseline = "middle";
    ctx.font = `650 ${fs}px ${FONT.display}`;
    ctx.fillStyle = C.silk2; ctx.fillText(name, x, y - fs * 0.6);
    ctx.font = `700 ${fs}px ${FONT.display}`;
    ctx.fillStyle = on ? C.copper2 : C.muted; ctx.fillText(on ? S.on : S.off, x, y + fs * 0.6);
  }
  function meter(label) {
    const b = h("b", "—");
    const el = h("div.meter", h("small", label), b);
    el.set = (t) => { b.textContent = t; };
    return el;
  }
  // grafik çerçevesi: ızgara + eksen yazıları; dönüş: X(), Y() dönüştürücüleri
  function frame(ctx, w, H, { l = 44, r = 12, t = 30, b = 24, x0, x1, y0, y1, xt, yt, xf, yf }) {
    const gw = w - l - r, gh = H - t - b;
    const X = (v) => l + ((v - x0) / (x1 - x0)) * gw;
    const Y = (v) => t + gh - ((v - y0) / (y1 - y0)) * gh;
    ctx.strokeStyle = rgba(C.silk, 0.09); ctx.lineWidth = 1; ctx.beginPath();
    xt.forEach((v) => { ctx.moveTo(X(v), t); ctx.lineTo(X(v), t + gh); });
    yt.forEach((v) => { ctx.moveTo(l, Y(v)); ctx.lineTo(l + gw, Y(v)); });
    ctx.stroke();
    ctx.strokeStyle = rgba(C.silk, 0.35); ctx.beginPath(); ctx.moveTo(l, t); ctx.lineTo(l, t + gh); ctx.lineTo(l + gw, t + gh); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = `500 10.5px ${FONT.mono}`;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    xt.forEach((v) => ctx.fillText(xf(v), X(v), t + gh + 5));
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    yt.forEach((v) => ctx.fillText(yf(v), l - 6, Y(v)));
    return { X, Y, l, t, gw, gh };
  }

  /* =========================================================
     1) Transistörlü NOT kapısı
     ========================================================= */
  Demos.c9Not = function (stage) {
    const top = h("div.pane");
    const rows = [0, 1].map((k) => {
      const tds = [h("td", { class: k ? "b1" : "b0" }, String(k)), h("td", "—"), h("td", "—"), h("td", "?")];
      return { tr: h("tr", ...tds), tds, done: false };
    });
    const tbl = h("table.truth.c9-tt",
      h("thead", h("tr", h("th", S.colIn), h("th", S.colVin), h("th", S.colVout), h("th", S.colOut))),
      h("tbody", rows.map((r) => r.tr)));
    const note = h("p.c9-note", S.ttHint);
    const tPanel = h("div.c9-panel", h("span.c9-ptitle", S.ttTitle), tbl, note);
    const mVin = meter(S.mVin), mVout = meter(S.mVout), mIb = meter(S.mIb), mIc = meter(S.mIc), mQ = meter(S.mQ), mP = meter(S.mP);
    const mPanel = h("div.c9-panel", h("div.meters", mVin, mVout, mIb, mIc, mQ, mP));
    const bottom = h("div.c9-bottom", tPanel, mPanel);
    stage.append(h("div.split.c9-split", top, bottom));

    const def = JSON.parse(JSON.stringify(CIRCUITS.c9Rtl));
    let vin = 0;
    const sch = Schematic(top, def, {
      maxUnit: 30,
      overlay(ctx, s) {
        const u = s.unit;
        const [ix, iy] = s.screenOf([-2.4, 4]);
        badge(ctx, ix, iy, level(vin), u);
        const vo = s.v(s.netOf("RC", "b"));
        const [ox, oy] = s.screenOf([16.2, -1]);
        badge(ctx, ox, oy, level(vo), u);
      },
    });

    const vs = slider({ label: S.vin, min: 0, max: 5, step: 0.05, value: 0, fmt: (v) => fmt(v, "V"), oninput: (v) => setVin(v, true) });
    const sg = seg([["0", S.in0], ["1", S.in1]], "0", (k) => { setVin(k === "1" ? 5 : 0); vs.set(vin); }, S.inAria);
    stage.append(h("div.controls", vs, sg));

    function setVin(v, fromSlider) {
      vin = v;
      sch.set("Giriş", "V", v);
      if (fromSlider) sg.set(v <= VIL ? "0" : v >= VIH ? "1" : null);
    }
    function update() {
      const sim = sch.sim;
      const vo = sch.v(sch.netOf("RC", "b"));
      const inf = sim.info("Q1");
      mVin.set(fmt(vin, "V")); mVout.set(fmt(vo, "V"));
      mIb.set(fmt(Math.abs(inf.Ib), "A")); mIc.set(fmt(Math.abs(inf.Ic), "A"));
      mQ.set(STR.sch.region[inf.region] || inf.region);
      mP.set(fmt(Math.abs(sim.p("VCC")), "W"));
      const li = level(vin), lo = level(vo);
      rows.forEach((r, k) => {
        r.tr.classList.toggle("cur", li === k);
        if (li === k) {
          r.done = true;
          r.tds[1].textContent = fmt(vin, "V");
          r.tds[2].textContent = fmt(vo, "V");
          r.tds[3].textContent = lo == null ? "?" : String(lo);
          r.tds[3].className = lo === 1 ? "b1" : lo === 0 ? "b0" : "";
        }
      });
      note.textContent = rows.every((r) => r.done) ? S.ttDone : li == null ? S.ttUndef : S.ttHint;
      note.classList.toggle("ok", rows.every((r) => r.done));
    }
    sch.on("change", update);
    update();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["transistorlu-not"] = [{ slide: "label:" + S.vin, to: 5 }, { wait: 900 }, { slide: "label:" + S.vin, to: 0 }, { wait: 700 }, { click: "=" + S.in1 }];

  /* =========================================================
     2) CMOS evirici: aktarım eğrisi ve geçiş akımı
     ========================================================= */
  Demos.c9Cmos = function (stage) {
    const top = h("div.pane");
    const mVin = meter(S.mVin), mVout = meter(S.mVout), mI = meter(S.mIdd), mP = meter(S.mPow);
    const side = h("div.c9-side", h("div.meters", mVin, mVout, mI, mP));
    const topRow = h("div.c9-toprow", top, side);
    const tPane = h("div.pane", h("span.pane-title", S.transfer));
    const iPane = h("div.pane", h("span.pane-title", S.idd));
    const tcv = h("canvas", { role: "img", "aria-label": S.transfer });
    const icv = h("canvas", { role: "img", "aria-label": S.idd });
    tPane.append(tcv); iPane.append(icv);
    const charts = h("div.c9-charts", tPane, iPane);
    stage.append(h("div.split.c9-split2", topRow, charts));

    const def = JSON.parse(JSON.stringify(CIRCUITS.c9Cmos));
    let vin = 0;
    const sch = Schematic(top, def, {
      maxUnit: 28,
      overlay(ctx, s) {
        mosTag(ctx, s, "P1", [11.4, 0], "PMOS P1");
        mosTag(ctx, s, "N1", [11.4, 6], "NMOS N1");
        const vo = s.v(s.netOf("N1", "d"));
        const [ox, oy] = s.screenOf([16.4, 5]);
        badge(ctx, ox, oy, level(vo), s.unit);
      },
    });
    const VDD = sch.part("VDD").V;

    // aktarım eğrisi: aynı devrenin çözücüsünde girişi 0 → VDD tarayarak
    const sw = Circuit.create(sch.sim.elements.map((e) => ({ ...e.p })));
    const SW = [];
    for (let k = 0; k <= 250; k++) {
      const v = (VDD * k) / 250;
      sw.set("Giriş", "V", v); sw.dc();
      const rp = sw.info("P1").region, rn = sw.info("N1").region;
      SW.push({ v, vo: sw.v(sch.netOf("N1", "d")), i: Math.abs(sw.i("IDD")), pOn: rp !== "kesim", nOn: rn !== "kesim", ok: sw.converged, kcl: sw.kclError() });
    }
    Demos.c9Cmos.lastSweep = SW;
    const Ipk = Math.max(...SW.map((q) => q.i));
    const pk = SW.find((q) => q.i === Ipk);
    // eşik (VM): V çıkış = V giriş
    let VM = VDD / 2;
    for (let k = 1; k < SW.length; k++) if (SW[k - 1].vo - SW[k - 1].v > 0 && SW[k].vo - SW[k].v <= 0) { VM = SW[k].v; break; }
    const bothA = SW.find((q) => q.pOn && q.nOn), bothB = [...SW].reverse().find((q) => q.pOn && q.nOn);

    function shadeRegions(ctx, f) {
      if (!bothA) return;
      ctx.fillStyle = rgba(C.vmid, 0.13);
      ctx.fillRect(f.X(bothA.v), f.t, f.X(bothB.v) - f.X(bothA.v), f.gh);
      ctx.strokeStyle = rgba(C.vmid, 0.55); ctx.setLineDash([3, 4]); ctx.beginPath();
      [bothA.v, bothB.v].forEach((v) => { ctx.moveTo(f.X(v), f.t); ctx.lineTo(f.X(v), f.t + f.gh); });
      ctx.stroke(); ctx.setLineDash([]);
    }
    let ts, is;
    const ticks = [0, 1, 2, 3, 4, 5];
    function drawT() {
      if (!ts || !ts.w) return;
      const { ctx, w, h: H } = ts;
      ctx.clearRect(0, 0, w, H);
      const f = frame(ctx, w, H, { x0: 0, x1: VDD, y0: 0, y1: VDD, xt: ticks, yt: ticks, xf: (v) => v + " V", yf: (v) => v + " V", l: 40 });
      shadeRegions(ctx, f);
      ctx.font = `600 10.5px ${FONT.display}`; ctx.textBaseline = "top"; ctx.textAlign = "center";
      if (bothA) {
        ctx.fillStyle = rgba(C.silk, 0.75); ctx.textAlign = "left"; ctx.fillText(S.both, f.X(bothA.v) + 6, f.Y(VDD * 0.72)); ctx.textAlign = "center";
        ctx.fillStyle = C.muted;
        if (f.X(bothA.v) - f.l > 60) ctx.fillText(S.onlyP, (f.l + f.X(bothA.v)) / 2, f.t + f.gh - 16);
        if (f.l + f.gw - f.X(bothB.v) > 60) ctx.fillText(S.onlyN, (f.X(bothB.v) + f.l + f.gw) / 2, f.t + 6);
      }
      // y = x köşegeni ve eşik
      ctx.strokeStyle = rgba(C.silk, 0.22); ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(f.X(0), f.Y(0)); ctx.lineTo(f.X(VDD), f.Y(VDD)); ctx.stroke(); ctx.setLineDash([]);
      // eğri: çıkış gerilimine göre renkli
      ctx.lineWidth = 3; ctx.lineCap = "round";
      for (let k = 1; k < SW.length; k++) {
        ctx.strokeStyle = vcolor((SW[k].vo + SW[k - 1].vo) / 2, 0, VDD);
        ctx.beginPath(); ctx.moveTo(f.X(SW[k - 1].v), f.Y(SW[k - 1].vo)); ctx.lineTo(f.X(SW[k].v), f.Y(SW[k].vo)); ctx.stroke();
      }
      ctx.fillStyle = C.silk2; ctx.beginPath(); ctx.arc(f.X(VM), f.Y(VM), 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.font = `600 11px ${FONT.display}`; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText(`${S.vm} ${fmt(VM, "V")}`, f.X(VM) + 7, f.Y(VM) - 3);
      // çalışma noktası
      const vo = sch.v(sch.netOf("N1", "d"));
      const px = f.X(vin), py = f.Y(vo);
      ctx.strokeStyle = rgba(C.amp, 0.5); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(px, f.t + f.gh); ctx.lineTo(px, py); ctx.lineTo(f.l, py); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.amp; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
    }
    function drawI() {
      if (!is || !is.w) return;
      const { ctx, w, h: H } = is;
      ctx.clearRect(0, 0, w, H);
      const top = Math.ceil((Ipk * 1.2) / 1e-4) * 1e-4;
      const yt = [0, top / 2, top];
      const f = frame(ctx, w, H, { x0: 0, x1: VDD, y0: 0, y1: top, xt: ticks, yt, xf: (v) => v + " V", yf: (v) => fmt(v, "A", 2), l: 54 });
      shadeRegions(ctx, f);
      ctx.beginPath(); ctx.moveTo(f.X(0), f.Y(0));
      SW.forEach((q) => ctx.lineTo(f.X(q.v), f.Y(q.i)));
      ctx.lineTo(f.X(VDD), f.Y(0)); ctx.closePath();
      ctx.fillStyle = rgba(C.heat, 0.16); ctx.fill();
      ctx.strokeStyle = C.heat; ctx.lineWidth = 2.5; ctx.beginPath();
      SW.forEach((q, k) => (k ? ctx.lineTo(f.X(q.v), f.Y(q.i)) : ctx.moveTo(f.X(q.v), f.Y(q.i))));
      ctx.stroke();
      ctx.fillStyle = C.heat; ctx.font = `600 11px ${FONT.display}`; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText(`${S.peak} ${fmt(Ipk, "A")}`, f.X(pk.v) + 8, f.Y(Ipk) + 4);
      const I = Math.abs(sch.sim.i("IDD"));
      const px = f.X(vin), py = f.Y(Math.min(I, top));
      ctx.strokeStyle = rgba(C.amp, 0.5); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(px, f.t + f.gh); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.amp; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
    }
    ts = canvas(tcv, drawT);
    is = canvas(icv, drawI);

    let sweeping = false, sweepT = 0;
    const vs = slider({ label: S.vin, min: 0, max: VDD, step: 0.01, value: 0, fmt: (v) => fmt(v, "V"), oninput: (v) => { stopSweep(); setVin(v); } });
    const sb = btn(S.sweep, () => { if (sweeping) stopSweep(); else { sweeping = true; sweepT = 0; sb.textContent = S.stopSweep; sb.classList.add("on"); } });
    stage.append(h("div.controls", vs, sb));
    function stopSweep() { sweeping = false; sb.textContent = S.sweep; sb.classList.remove("on"); }
    function setVin(v) { vin = v; sch.set("Giriş", "V", v); }
    function update() {
      const vo = sch.v(sch.netOf("N1", "d"));
      const I = Math.abs(sch.sim.i("IDD"));
      mVin.set(fmt(vin, "V")); mVout.set(fmt(vo, "V")); mI.set(fmt(I, "A")); mP.set(fmt(I * VDD, "W"));
      drawT(); drawI();
    }
    sch.on("change", update);
    const lp = loop((dt) => {
      if (!sweeping) return;
      sweepT += dt;
      const ph = (sweepT / 7) % 1; // 7 s: 0 → VDD → 0
      const v = Math.round(VDD * (ph < 0.5 ? 2 * ph : 2 - 2 * ph) * 100) / 100;
      vs.set(v); setVin(v);
    });
    update();
    return { enter() { sch.start(); lp.start(); }, leave() { sch.stop(); lp.stop(); stopSweep(); }, sch };
  };
  G["cmos-evirici"] = [{ slide: "label:" + S.vin, to: 2.5 }, { wait: 900 }, { slide: "label:" + S.vin, to: 4.2 }, { wait: 500 }];

  /* =========================================================
     3) Gürültü payları
     ========================================================= */
  // JEDEC JESD8C (3,3 V LVCMOS) ve standart 5 V TTL (74LS) garanti seviyeleri
  const FAMS = {
    ttl: { VDD: 5, VOH: 2.4, VOL: 0.4, VIH: 2.0, VIL: 0.8, kRatio: 17.2 }, // 74HCT gibi TTL uyumlu CMOS alıcı
    lv: { VDD: 3.3, VOH: 3.1, VOL: 0.2, VIH: 2.0, VIL: 0.8, kRatio: 1 },
  };
  Demos.c9Noise = function (stage) {
    const lvPane = h("div.pane.c9-lvpane");
    const lcv = h("canvas", { role: "img", "aria-label": "Mantık seviyeleri" });
    lvPane.append(lcv);
    const scPane = h("div.pane.c9-scpane", h("span.pane-title", S.scopeTitle));
    const chips = h("div.c9-chips");
    const body = h("div.split.c9-noise", lvPane, h("div.c9-scwrap", scPane, chips));
    stage.append(body);

    let fk = "ttl", F = FAMS.ttl, A = 0.3, Vt = 1.0;
    const rnd = L.rng(9);
    // alıcı aktarım tablosu (çözücüyle)
    let RX = null;
    function buildRx() {
      const def = JSON.parse(JSON.stringify(CIRCUITS.c9Receiver));
      def.elements.find((e) => e.id === "VDD").V = F.VDD;
      const p1 = def.elements.find((e) => e.id === "P1"); p1.K = p1.K / F.kRatio;
      const sim = Circuit.create(def.elements);
      const lo = -4, hi = F.VDD + 4, n = Math.round((hi - lo) / 0.01);
      const out = new Float64Array(n + 1);
      let thr = null, prev = null, bad = 0, kcl = 0;
      for (let k = 0; k <= n; k++) {
        const v = lo + k * 0.01;
        sim.set("VIN", "V", v); sim.dc();
        if (!sim.converged) bad++;
        kcl = Math.max(kcl, sim.kclError());
        out[k] = sim.v("out");
        if (prev != null && thr == null && prev < F.VDD / 2 && out[k] >= F.VDD / 2) thr = v;
        prev = out[k];
      }
      RX = { lo, step: 0.01, out, n, thr, bad, kcl };
      Demos.c9Noise.lastRx = RX;
    }
    const rx = (v) => {
      const x = (Math.max(RX.lo, Math.min(RX.lo + RX.n * RX.step, v)) - RX.lo) / RX.step;
      const k = Math.min(RX.n - 1, Math.floor(x)), f = x - k;
      return RX.out[k] * (1 - f) + RX.out[k + 1] * f;
    };

    // osiloskop
    const TB = 1e-6, SPB = 40, DT = TB / SPB, RATE = 3.2e-6; // 1 µs bit süresi, gerçek saniyede 3,2 bit
    let sc;
    function makeScope() {
      if (sc) sc.el.remove();
      const vd = F.VDD / 2.5;
      sc = Scope(scPane, {
        channels: [{ name: "Giriş", vdiv: vd, pos: -0.2 }, { name: "Alıcı", vdiv: F.VDD / 1.8, pos: -3.8 }],
        tdiv: TB, trigger: { mode: "none" }, controls: false, label: S.scopeTitle, style: { flex: "1" },
        overlay: scopeOverlay,
      });
    }
    // sinyal üretimi
    let t = 0, bit = 1, bitStart = 0, bitErr = false, vprev = 0, nBits = 0, nErr = 0;
    const bits = []; // {t0, b, err}
    function newBit() {
      if (t > 0) {
        bits.push({ t0: bitStart, b: bit, err: bitErr });
        nBits++; if (bitErr) nErr++;
        if (bits.length > 40) bits.shift();
      }
      bitStart = t; bitErr = false;
      bit = rnd() < 0.5 ? 0 : 1;
    }
    function sample() {
      if (t - bitStart >= TB - 1e-15) newBit();
      const target = bit ? F.VOH : F.VOL;
      const clean = vprev + (target - vprev) * 0.45; // sonlu yükselme süresi
      vprev = clean;
      const v = clean + A * (2 * rnd() - 1);
      const o = rx(v);
      const ph = (t - bitStart) / TB;
      if (ph > 0.2 && (o > F.VDD / 2 ? 1 : 0) !== bit) bitErr = true;
      sc.push(t, [v, o]);
      t += DT;
    }
    function scopeOverlay(ctx, s, g) {
      const ch = s.channels[0];
      const yIH = s.toY(F.VIH, ch), yIL = s.toY(F.VIL, ch);
      ctx.fillStyle = rgba(C.muted, 0.14); ctx.fillRect(g.m, yIH, g.gw, yIL - yIH);
      ctx.strokeStyle = rgba(C.silk, 0.45); ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(g.m, yIH); ctx.lineTo(g.m + g.gw, yIH); ctx.moveTo(g.m, yIL); ctx.lineTo(g.m + g.gw, yIL); ctx.stroke();
      ctx.setLineDash([]);
      const tag = (t, x, y, col, font) => {
        ctx.font = font || `600 10.5px ${FONT.mono}`;
        const w = ctx.measureText(t).width + 8;
        ctx.fillStyle = "rgba(6,21,15,0.82)"; ctx.fillRect(x - w, y - 8, w, 16);
        ctx.fillStyle = col; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(t, x - 4, y + 0.5);
      };
      const xr = g.m + g.gw - 4;
      tag(`VIH ${num(F.VIH, 1)} V`, xr, yIH - 9, C.silk2);
      tag(`VIL ${num(F.VIL, 1)} V`, xr, yIL + 9, C.silk2);
      tag(S.forbidden, g.m + 4 + 90, (yIH + yIL) / 2, rgba(C.silk, 0.75), `600 10.5px ${FONT.display}`);
      if (RX.thr != null) {
        const yt = s.toY(RX.thr, ch);
        ctx.strokeStyle = rgba(C.copper2, 0.7); ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(g.m, yt); ctx.lineTo(g.m + g.gw, yt); ctx.stroke(); ctx.setLineDash([]);
        tag(`${S.thr} ${fmt(RX.thr, "V", 2)}`, xr - 98, (yIH + yIL) / 2, C.copper2);
      }
      // bitler: gönderilen bit ve hatalar
      const all = bits.concat([{ t0: bitStart, b: bit, err: bitErr, cur: true }]);
      ctx.font = `700 12px ${FONT.mono}`; ctx.textBaseline = "middle"; ctx.textAlign = "center";
      all.forEach((q) => {
        const xa = s.toX(q.t0), xb = s.toX(q.t0 + TB);
        if (xb < g.m || xa > g.m + g.gw) return;
        if (q.err) { ctx.fillStyle = rgba(C.heat, 0.2); ctx.fillRect(Math.max(g.m, xa), g.m + 22, Math.min(xb, g.m + g.gw) - Math.max(g.m, xa), g.gh - 22); }
        const xc = (xa + xb) / 2;
        if (xc < g.m + 8 || xc > g.m + g.gw - 8) return;
        ctx.fillStyle = q.err ? C.heat : q.b ? C.v1 : C.v0;
        ctx.fillText(String(q.b), xc, g.m + 30);
      });
    }

    function drawLv() {
      if (!ls || !ls.w) return;
      const { ctx, w, h: H } = ls;
      ctx.clearRect(0, 0, w, H);
      const t0 = 30, b0 = 22, top = F.VDD + 0.35;
      const Y = (v) => t0 + (H - t0 - b0) * (1 - v / top);
      const l = 40, colW = Math.min(64, (w - l - 30) * 0.28);
      const xs = l + 6, xr = w - colW - 10;
      // eksen
      ctx.fillStyle = C.muted; ctx.font = `500 10.5px ${FONT.mono}`; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let v = 0; v <= F.VDD + 1e-9; v += 1) ctx.fillText(v + " V", l - 4, Y(v));
      ctx.strokeStyle = rgba(C.silk, 0.08); ctx.beginPath();
      for (let v = 0; v <= F.VDD + 1e-9; v += 1) { ctx.moveTo(l, Y(v)); ctx.lineTo(w - 8, Y(v)); }
      ctx.stroke();
      ctx.font = `650 11px ${FONT.display}`; ctx.textAlign = "center"; ctx.fillStyle = C.silk2; ctx.textBaseline = "top";
      ctx.fillText(S.sender, xs + colW / 2, 6); ctx.fillText(S.receiver, xr + colW / 2, 6);
      const band = (x, v0, v1, col, a, hatch) => {
        const y0 = Y(v1), y1 = Y(v0);
        ctx.fillStyle = rgba(col, a); ctx.fillRect(x, y0, colW, y1 - y0);
        if (hatch) {
          ctx.save(); ctx.beginPath(); ctx.rect(x, y0, colW, y1 - y0); ctx.clip();
          ctx.strokeStyle = rgba(C.silk, 0.18); ctx.lineWidth = 1;
          for (let k = -colW; k < y1 - y0 + colW; k += 7) { ctx.beginPath(); ctx.moveTo(x, y0 + k); ctx.lineTo(x + colW, y0 + k - colW); ctx.stroke(); }
          ctx.restore();
        }
        ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y0 + 0.5, colW - 1, y1 - y0 - 1);
      };
      band(xs, F.VOH, F.VDD, C.v1, 0.28); band(xs, 0, F.VOL, C.v0, 0.32);
      band(xr, F.VIH, F.VDD, C.v1, 0.28); band(xr, 0, F.VIL, C.v0, 0.32); band(xr, F.VIL, F.VIH, C.muted, 0.12, true);
      ctx.font = `650 10.5px ${FONT.display}`; ctx.textBaseline = "middle"; ctx.fillStyle = C.silk;
      ctx.fillText(S.g1, xs + colW / 2, (Y(F.VOH) + Y(F.VDD)) / 2);
      ctx.fillText(S.reads1, xr + colW / 2, (Y(F.VIH) + Y(F.VDD)) / 2);
      ctx.fillText(S.reads0, xr + colW / 2, (Y(F.VIL) + Y(0)) / 2);
      ctx.fillStyle = C.silk2; ctx.fillText(S.undef, xr + colW / 2, (Y(F.VIL) + Y(F.VIH)) / 2);
      // gürültü bandı: gönderici seviyesi ± A
      const xa = xs + colW, xb = xr;
      [[F.VOH, F.VIH, true], [F.VOL, F.VIL, false]].forEach(([vo, vi, hi]) => {
        const over = hi ? vo - A < vi : vo + A > vi;
        ctx.fillStyle = rgba(over ? C.heat : C.ch1, 0.16);
        ctx.fillRect(xa, Y(vo + A), xb - xa, Y(vo - A) - Y(vo + A));
        ctx.strokeStyle = rgba(over ? C.heat : C.ch1, 0.6); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(xa, Y(vo)); ctx.lineTo(xb, Y(vo)); ctx.stroke(); ctx.setLineDash([]);
        // pay oku
        const mx = xa + (xb - xa) * 0.5;
        ctx.strokeStyle = C.gold; ctx.fillStyle = C.gold; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(mx, Y(vo)); ctx.lineTo(mx, Y(vi)); ctx.stroke();
        [Y(vo), Y(vi)].forEach((yy) => { ctx.beginPath(); ctx.moveTo(mx - 5, yy); ctx.lineTo(mx + 5, yy); ctx.stroke(); });
        ctx.font = `700 11px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const lab = `${hi ? "NMH" : "NML"} ${num(Math.abs(vo - vi), 1)} V`;
        const ym = (Y(vo) + Y(vi)) / 2;
        const tw = ctx.measureText(lab).width + 8;
        ctx.fillStyle = "rgba(12,42,32,0.85)"; ctx.fillRect(mx - tw / 2, ym - 8, tw, 16);
        ctx.fillStyle = C.gold; ctx.fillText(lab, mx, ym);
      });
      // seviye yazıları
      ctx.font = `600 10px ${FONT.mono}`; ctx.fillStyle = C.silk2; ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      [["VOH", F.VOH], ["VOL", F.VOL]].forEach(([n, v]) => ctx.fillText(`${n} ${num(v, 1)}`, xs + colW + 4, Y(v) + (n === "VOH" ? -7 : 7)));
      ctx.textAlign = "right";
      [["VIH", F.VIH], ["VIL", F.VIL]].forEach(([n, v]) => ctx.fillText(`${n} ${num(v, 1)}`, xr - 4, Y(v) + (n === "VIH" ? 7 : -7)));
      // test gerilimi
      const lv = Vt >= F.VIH ? 1 : Vt <= F.VIL ? 0 : null;
      const yv = Y(Math.min(Vt, top));
      ctx.strokeStyle = C.amp; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xr - 6, yv); ctx.lineTo(xr + colW + 6, yv); ctx.stroke();
      ctx.fillStyle = C.amp; ctx.beginPath(); ctx.moveTo(xr + colW + 6, yv); ctx.lineTo(xr + colW + 13, yv - 5); ctx.lineTo(xr + colW + 13, yv + 5); ctx.fill();
      verdict.textContent = (lv === 1 ? S.verdict1 : lv === 0 ? S.verdict0 : S.verdictX) + ` (${fmt(Vt, "V")})`;
      verdict.className = "c9-verdict " + (lv === 1 ? "v1" : lv === 0 ? "v0" : "vx");
    }
    const verdict = h("span.c9-verdict");
    const cMargin = h("span.chip"), cErr = h("span.chip"), cSafe = h("span.flag");
    chips.append(verdict, cMargin, cErr, cSafe);
    let ls = canvas(lcv, drawLv);

    function updChips() {
      const NMH = F.VOH - F.VIH, NML = F.VIL - F.VOL;
      cMargin.textContent = `${S.margin}: NMH ${num(NMH, 1)} V · NML ${num(NML, 1)} V`;
      cErr.textContent = `${S.errors}: ${nErr} / ${nBits}` + (nBits ? ` · ${S.ber} %${num((100 * nErr) / nBits, 1)}` : "");
      cErr.classList.toggle("hot", nErr > 0);
      const safe = A < Math.min(NMH, NML);
      cSafe.textContent = safe ? S.safe : S.risky;
      cSafe.classList.toggle("ok", safe);
    }
    function resetCount() { nBits = 0; nErr = 0; bitErr = false; bits.length = 0; updChips(); }
    function setFam(k) {
      fk = k; F = FAMS[k];
      buildRx(); makeScope();
      t = 0; bitStart = 0; vprev = F.VOL; bits.length = 0;
      ns.input.max = F.VDD / 2;
      if (A > F.VDD / 2) { A = F.VDD / 2; ns.set(A); }
      resetCount(); drawLv();
    }
    const fs = seg([["ttl", S.famTTL], ["lv", S.famLV]], fk, setFam, S.fam);
    const ns = slider({ label: S.noise, min: 0, max: 2.5, step: 0.05, value: A, fmt: (v) => fmt(v, "V"), oninput: (v) => { A = v; resetCount(); drawLv(); } });
    const vt = slider({ label: S.test, min: 0, max: 5, step: 0.05, value: Vt, fmt: (v) => fmt(v, "V"), oninput: (v) => { Vt = v; drawLv(); } });
    stage.append(h("div.controls", fs, ns, vt, btn(S.reset, resetCount)));
    setFam("ttl");

    let acc = 0, chipT = 0;
    const lp = loop((dt) => {
      acc += dt * RATE;
      let k = 0;
      while (acc >= DT && k < 400) { sample(); acc -= DT; k++; }
      sc.draw();
      chipT += dt;
      if (chipT > 0.2) { chipT = 0; updChips(); }
    });
    return { enter() { lp.start(); }, leave() { lp.stop(); } };
  };
  G["gurultu-paylari"] = [{ slide: "label:" + S.noise, to: 0.35 }, { wait: 1500 }, { slide: "label:" + S.noise, to: 1.1 }, { wait: 800 }];

  /* =========================================================
     4) CMOS NAND
     ========================================================= */
  Demos.c9Nand = function (stage) {
    const top = h("div.pane");
    const rows = [0, 1, 2, 3].map((k) => {
      const a = k >> 1, b = k & 1;
      const tds = [h("td", { class: a ? "b1" : "b0" }, String(a)), h("td", { class: b ? "b1" : "b0" }, String(b)), h("td", "?"), h("td", "—")];
      return { tr: h("tr", ...tds), tds, a, b };
    });
    const tbl = h("table.truth.c9-tt",
      h("thead", h("tr", h("th", "A"), h("th", "B"), h("th", "Y"), h("th", S.colVout))),
      h("tbody", rows.map((r) => r.tr)));
    const mY = meter(S.mY), mI = meter(S.mI);
    const side = h("div.c9-side.c9-nside",
      h("div.c9-panel", h("span.c9-ptitle", S.nandTT), tbl),
      h("div.meters", mY, mI),
      h("p.c9-count", h("b", S.count), h("br"), S.m1));
    stage.append(h("div.split.c9-nand", top, side));

    const def = JSON.parse(JSON.stringify(CIRCUITS.c9Nand));
    const sch = Schematic(top, def, {
      maxUnit: 34,
      overlay(ctx, s) {
        mosTag(ctx, s, "PA", [0.6, -4.6], "PA", "left");
        mosTag(ctx, s, "PB", [13.4, -4.6], "PB", "right");
        mosTag(ctx, s, "NA", [4.8, 2.2], "NA", "right");
        mosTag(ctx, s, "NB", [11.2, 10.2], "NB", "left");
        const vo = s.v(s.netOf("NA", "d"));
        const [ox, oy] = s.screenOf([14, 2.6]);
        badge(ctx, ox, oy, level(vo), s.unit);
      },
    });
    const ab = btn("A: 0", () => sch.set("A", "closed", !sch.part("A").closed));
    const bb = btn("B: 0", () => sch.set("B", "closed", !sch.part("B").closed));
    stage.append(h("div.controls", ab, bb));
    function update() {
      const a = sch.part("A").closed ? 1 : 0, b = sch.part("B").closed ? 1 : 0;
      ab.textContent = "A: " + a; bb.textContent = "B: " + b;
      ab.classList.toggle("on", !!a); bb.classList.toggle("on", !!b);
      const vo = sch.v(sch.netOf("NA", "d"));
      const lo = level(vo);
      mY.set(fmt(vo, "V")); mI.set(fmt(Math.abs(sch.sim.i("VDD")), "A"));
      rows.forEach((r) => {
        const cur = r.a === a && r.b === b;
        r.tr.classList.toggle("cur", cur);
        if (cur) {
          r.tds[2].textContent = lo == null ? "?" : String(lo);
          r.tds[2].className = lo === 1 ? "b1" : lo === 0 ? "b0" : "";
          r.tds[3].textContent = fmt(vo, "V");
        }
      });
    }
    sch.on("change", update);
    update();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["cmos-nand"] = [{ click: S.aBtn }, { wait: 900 }, { click: S.bBtn }, { wait: 900 }, { click: S.aBtn }];
})();
