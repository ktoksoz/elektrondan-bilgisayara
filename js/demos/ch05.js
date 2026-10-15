/* 5. bölüm deneyleri: PN eklemi, diyot I–V eğrisi, doğrultucu, LED renkleri ve Zener regülatörü.
   Ekrandaki her akım/gerilim Circuit çözücüsünden (şemanın sim'i ya da bağımsız tarama) gelir. */
(function () {
  const { C, FONT, h, slider, seg, btn, canvas, num, rgba, loop, clamp } = L;
  const fmt = (v, u, d) => Circuit.fmt(v, u, d);
  const clone = (x) => JSON.parse(JSON.stringify(x));

  const T = STR.ch05;
  window.GUIDES = window.GUIDES || {};
  const G = window.GUIDES;

  function meter(label) {
    const b = h("b", "—");
    const el = h("div.meter", h("small", label), b);
    el.set = (t) => { b.textContent = t; };
    return el;
  }

  /* ---------- trafo sekonderi: 12 V tepe sinüs kaynağı ----------
     Birincil sargı yalnız çizimdir (şebeke benzetilmez). Köprüde sekonder topraktan yalıtılmıştır;
     her iki diyot da kesimdeyken uçların ortak gerilimi tanımsız kalmasın diye her sekonder ucu
     ile toprak arasında 10 MΩ yalıtım kaçağı vardır (akımı ~1 µA, ölçümleri etkilemez). */
  Schematic.PARTS.trafo = {
    hide: 0, pins: { a: [1.5, -3], b: [1.5, 3] }, box: [-3.1, -3, 2.1, 3],
    paths: [{ term: 0, pts: [[1.5, -3], [1.5, -1.6]] }, { term: 1, pts: [[1.5, 3], [1.5, 1.6]] }],
    el: (p, n) => [
      { type: "V", id: p.id, n: [n("a"), n("b")], V: 0, wave: p.wave },
      { type: "R", id: p.id + ".ka", n: [n("a"), "0"], R: 1e7 },
      { type: "R", id: p.id + ".kb", n: [n("b"), "0"], R: 1e7 },
    ],
    elPins: ["a", "b"],
    draw(g) {
      g.lead([1.5, -3], [1.5, -1.6], "a"); g.lead([1.5, 3], [1.5, 1.6], "b");
      for (let k = 0; k < 4; k++) g.arcPath(1.5, -1.2 + 0.8 * k, 0.4, Math.PI / 2, Math.PI * 1.5, { stroke: C.silk, width: 2.2 });
      g.line([0.28, -1.9], [0.28, 1.9], { stroke: C.silk, width: 1.8 });
      g.line([-0.28, -1.9], [-0.28, 1.9], { stroke: C.silk, width: 1.8 });
      const mc = rgba(C.silk, 0.45);
      for (let k = 0; k < 4; k++) g.arcPath(-1.5, -1.2 + 0.8 * k, 0.4, -Math.PI / 2, Math.PI / 2, { stroke: mc, width: 2 });
      g.path([[-1.5, -1.6], [-1.5, -2.2], [-2.6, -2.2]], { stroke: mc, width: 1.8 });
      g.path([[-1.5, 1.6], [-1.5, 2.2], [-2.6, 2.2]], { stroke: mc, width: 1.8 });
      g.circle(-2.6, -2.2, 0.16, { stroke: mc, width: 1.6 }); g.circle(-2.6, 2.2, 0.16, { stroke: mc, width: 1.6 });
      g.text(T.mains, [-2.35, 0], { size: 0.5, color: C.muted, weight: 600, rot: true });
      g.text("+", [2.1, -2.3], { size: 0.55, color: C.silk2, rot: true });
    },
    info(p, sch) {
      return `<b>${fmt(Math.abs(sch.sim.vAcross(p.id)), "V")}</b> · ${fmt(Math.abs(sch.sim.i(p.id)), "A")}<br><small>${T.trafoTip}</small>`;
    },
  };

  /* =============== 1. PN eklemi =============== */
  const VBI = 0.75;   // eklemin yerleşik gerilimi (silisyumda tipik ~0,7 V); bölge genişliği ∝ √(VBI − V_D)
  const W0 = 0.075;   // dengede yarı genişlik (çubuk genişliğine oranla), çizim ölçeği
  const halfW = (vd) => W0 * Math.sqrt(Math.max(0.02, VBI - vd) / VBI);

  Demos.c5pn = function (stage) {
    const top = h("div.pane.c5-crystal");
    const cv = h("canvas", { role: "img", "aria-label": T.pnAria });
    top.append(cv);
    const schPane = h("div.pane");
    const mV = meter(T.mVd), mI = meter(T.mI), mW = meter(T.mW);
    const status = h("p.c5-status");
    const side = h("div.c5-side", h("div.meters", mV, mI, mW), status);
    const bottom = h("div.c5-bottom", schPane, side);
    stage.append(h("div.split.c5-split", { style: { gridTemplateRows: "1.45fr 1fr" } }, top, bottom));
    const sch = Schematic(schPane, clone(CIRCUITS.c5Pn), { maxUnit: 22 });

    const bs = slider({ label: T.battery, min: -5, max: 5, step: 0.05, value: 0, fmt: (v) => fmt(v, "V"), oninput: (v) => sch.set("B1", "V", v) });
    const rb = btn(T.reform, () => reform());
    stage.append(h("div.controls", bs, h("span.spacer"), rb));

    // taşıyıcılar: her katkı atomunun (iyonun) bir taşıyıcısı var; iyon tükenme bölgesine düşünce taşıyıcısı gider
    const NX = 30, NY = 7, rnd = L.rng(5);
    const sites = [];
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
      const p = i < NX / 2;
      const hx = (i + 0.5 + (rnd() - 0.5) * 0.35) / NX, hy = (j + 0.5 + (rnd() - 0.5) * 0.5) / NY;
      sites.push({ p, hx, hy, ox: (rnd() - 0.5) * 0.02, oy: (rnd() - 0.5) * 0.05, vx: 0, vy: 0, a: 1, mode: "home", x: hx, y: hy });
    }
    const flows = [], flashes = [];
    let wCur = 0, form = 0, spawnAcc = 0, Vd = 0, I = 0;

    function reform() {
      sites.forEach((s) => { s.mode = "home"; s.a = 1; });
      wCur = 0; form = 0; flows.length = 0;
    }
    function update() {
      Vd = sch.sim.vAcross("D1"); I = sch.sim.i("D1");
      mV.set(fmt(Vd, "V")); mI.set(fmt(I, "A"));
      mW.set("×" + num(halfW(Vd) / W0, 2));
      status.textContent = I > 1e-5 ? T.sForward : Vd > 0.02 ? T.sWeak : Vd < -0.02 ? T.sReverse : T.sZero;
      status.classList.toggle("on", I > 1e-5);
    }
    sch.on("change", update);
    update();

    let cs;
    const geo = () => {
      const { w, h: H } = cs;
      const x0 = 34, x1 = w - 34, y0 = 44, y1 = Math.max(y0 + 90, H - 76);
      return { w, H, x0, x1, y0, y1, bw: x1 - x0, bh: y1 - y0 };
    };
    function step(dt) {
      form = Math.min(1, form + dt / 1.6);
      const target = halfW(Vd) * L.ease(form);
      wCur += (target - wCur) * Math.min(1, dt * 4);
      for (const s of sites) {
        const covered = Math.abs(s.hx - 0.5) > wCur;
        // ısıl titreşim: yuvanın çevresinde rastgele yürüyüş
        s.vx += (rnd() - 0.5) * 0.5 * dt; s.vy += (rnd() - 0.5) * 1.2 * dt;
        s.vx *= 0.9; s.vy *= 0.9;
        s.ox = clamp(s.ox + s.vx * dt * 3, -0.014, 0.014); s.oy = clamp(s.oy + s.vy * dt * 3, -0.05, 0.05);
        if (s.mode === "home") {
          s.x = s.hx + s.ox; s.y = s.hy + s.oy;
          s.a = Math.min(1, s.a + dt * 2.5);
          if (!covered) { s.mode = "leave"; }
        } else if (s.mode === "leave") {
          // eklem yüzeyine doğru sürüklen, karşı taşıyıcıyla birleş
          const tx = 0.5 + (s.p ? -0.004 : 0.004);
          s.x += (tx - s.x) * Math.min(1, dt * 5) + (s.p ? 1 : -1) * 0.02 * dt;
          if (Math.abs(s.x - tx) < 0.006 || (s.p ? s.x > tx : s.x < tx)) {
            s.mode = "gone"; s.a = 0;
            if (s.p) flashes.push({ x: 0.5, y: s.y, t: 0 });
          }
        } else if (covered) { s.mode = "home"; s.a = 0; s.x = s.hx + s.ox; s.y = s.hy + s.oy; }
      }
      // ileri akım: kontaklardan gelen elektron ve boşluk çiftleri eklemin yakınında birleşir
      const rate = I > 1e-6 && form > 0.95 ? 2 + 26 * clamp(Math.log10(I / 1e-6) / 4.6, 0, 1) : 0;
      spawnAcc += rate * dt;
      while (spawnAcc >= 1 && flows.length < 70) {
        spawnAcc -= 1;
        const y = 0.08 + rnd() * 0.84, xm = 0.5 + (rnd() - 0.5) * 2 * Math.max(0.12, wCur * 1.6), dur = 1.3 + rnd() * 0.6;
        flows.push({ y, y2: clamp(y + (rnd() - 0.5) * 0.15, 0.06, 0.94), xm, dur, t: 0 });
      }
      if (spawnAcc > 1) spawnAcc = 1;
      for (let k = flows.length - 1; k >= 0; k--) {
        const f = flows[k]; f.t += dt;
        if (f.t >= f.dur) { flashes.push({ x: f.xm, y: (f.y + f.y2) / 2, t: 0 }); flows.splice(k, 1); }
      }
      for (let k = flashes.length - 1; k >= 0; k--) { flashes[k].t += dt; if (flashes[k].t > 0.5) flashes.splice(k, 1); }
    }

    function draw() {
      if (!cs || !cs.w) return;
      const { ctx } = cs;
      const g = geo();
      const { w, H, x0, y0, bw, bh, y1 } = g;
      const X = (u) => x0 + u * bw, Y = (v) => y0 + v * bh;
      ctx.clearRect(0, 0, w, H);
      // bölge zeminleri
      ctx.fillStyle = rgba(C.v1, 0.07); ctx.fillRect(X(0), y0, bw / 2, bh);
      ctx.fillStyle = rgba(C.v0, 0.09); ctx.fillRect(X(0.5), y0, bw / 2, bh);
      // tükenme bölgesi
      const dl = X(0.5 - wCur), dr = X(0.5 + wCur);
      ctx.fillStyle = rgba(C.mask, 0.75); ctx.fillRect(dl, y0, dr - dl, bh);
      ctx.strokeStyle = rgba(C.silk, 0.4); ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(dl + 0.5, y0); ctx.lineTo(dl + 0.5, y1); ctx.moveTo(dr + 0.5, y0); ctx.lineTo(dr + 0.5, y1); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = rgba(C.silk, 0.3); ctx.strokeRect(X(0) + 0.5, y0 + 0.5, bw, bh);
      ctx.strokeStyle = rgba(C.silk, 0.18); ctx.beginPath(); ctx.moveTo(X(0.5) + 0.5, y0); ctx.lineTo(X(0.5) + 0.5, y1); ctx.stroke();
      const cell = Math.min(bw / NX, bh / NY);
      const ir = Math.max(3, cell * 0.2), cr = Math.max(2.6, cell * 0.16), dense = cell < 15;
      // sabit iyonlar
      ctx.lineWidth = 1.4;
      for (const s of sites) {
        const inside = Math.abs(s.hx - 0.5) < wCur;
        const col = s.p ? C.v0 : C.v1;
        const a = inside ? 0.95 : dense ? 0.08 : 0.2;
        const sx = X(s.hx), sy = Y(s.hy);
        ctx.strokeStyle = rgba(col, a);
        ctx.strokeRect(sx - ir, sy - ir, ir * 2, ir * 2);
        ctx.beginPath(); ctx.moveTo(sx - ir * 0.55, sy); ctx.lineTo(sx + ir * 0.55, sy);
        if (!s.p) { ctx.moveTo(sx, sy - ir * 0.55); ctx.lineTo(sx, sy + ir * 0.55); }
        ctx.stroke();
      }
      // yerleşik taşıyıcılar
      for (const s of sites) {
        if (s.a <= 0.01) continue;
        const sx = X(s.x), sy = Y(clamp(s.y, 0.04, 0.96));
        const cx = clamp(sx + (s.p ? -1 : 1) * ir * 1.7, X(0) + cr + 2, X(1) - cr - 2);
        if (s.p) { ctx.strokeStyle = rgba(C.v1, s.a); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, sy, cr, 0, Math.PI * 2); ctx.stroke(); }
        else { ctx.fillStyle = rgba("#8fb4ff", s.a); ctx.beginPath(); ctx.arc(cx, sy, cr, 0, Math.PI * 2); ctx.fill(); }
      }
      // akım taşıyan çiftler
      for (const f of flows) {
        const u = L.ease(Math.min(1, f.t / f.dur));
        const xe = 1 - (1 - f.xm) * u, xh = f.xm * u;
        const ye = f.y + (f.y2 - f.y) * u * 0.5, yh = f.y2 + (f.y - f.y2) * u * 0.5;
        ctx.fillStyle = "#b8ceff"; ctx.beginPath(); ctx.arc(X(xe), Y(ye), cr, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#ff8496"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(xh), Y(yh), cr, 0, Math.PI * 2); ctx.stroke();
      }
      for (const fl of flashes) {
        const k = fl.t / 0.5, R = cell * (0.25 + 0.6 * k);
        const gr = ctx.createRadialGradient(X(fl.x), Y(fl.y), 0, X(fl.x), Y(fl.y), R);
        gr.addColorStop(0, rgba(C.amp, 0.85 * (1 - k))); gr.addColorStop(1, rgba(C.amp, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(X(fl.x), Y(fl.y), R, 0, Math.PI * 2); ctx.fill();
      }
      // kontaklar ve kutup işaretleri
      ctx.fillStyle = C.copper; ctx.fillRect(x0 - 12, y0, 10, bh); ctx.fillRect(x0 + bw + 2, y0, 10, bh);
      const Vb = bs.get();
      ctx.font = `800 15px ${FONT.display}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (Math.abs(Vb) > 0.02) {
        ctx.fillStyle = Vb > 0 ? C.v1 : C.v0; ctx.fillText(Vb > 0 ? "+" : "−", x0 - 7, y0 - 12);
        ctx.fillStyle = Vb > 0 ? C.v0 : C.v1; ctx.fillText(Vb > 0 ? "−" : "+", x0 + bw + 7, y0 - 12);
      }
      // başlıklar
      ctx.font = `650 13px ${FONT.display}`; ctx.fillStyle = C.silk;
      ctx.textAlign = "left"; ctx.fillText(T.pType, x0 + 18, y0 - 13);
      ctx.textAlign = "right"; ctx.fillText(T.nType, x0 + bw - 18, y0 - 13);
      // tükenme bölgesi etiketi ve elektrik alanı oku (N'deki + iyonlardan P'deki − iyonlara)
      ctx.textAlign = "center"; ctx.font = `600 12px ${FONT.display}`;
      const midX = X(0.5);
      if (dr - dl > 26) {
        ctx.strokeStyle = C.gold; ctx.fillStyle = C.gold; ctx.lineWidth = 1.6;
        const ay = y1 + 12;
        ctx.beginPath(); ctx.moveTo(dr - 4, ay); ctx.lineTo(dl + 8, ay); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dl + 3, ay); ctx.lineTo(dl + 10, ay - 4); ctx.lineTo(dl + 10, ay + 4); ctx.fill();
        ctx.fillText(T.field, midX, ay + 12);
      }
      ctx.fillStyle = C.silk2; ctx.fillText(T.depletion, midX, y0 - 13 + (w < 520 ? -16 : 0));
      // enerji engeli şeridi
      const by0 = y1 + 30, byh = Math.max(24, H - by0 - 6);
      const bar = clamp((VBI - Vd) / (VBI + 5), 0.02, 1);
      const lo = by0 + byh - 3, hiY = lo - (byh - 6) * (0.15 + 0.85 * Math.sqrt(bar));
      ctx.strokeStyle = C.copper2; ctx.lineWidth = 2.2; ctx.beginPath();
      ctx.moveTo(X(0), hiY); ctx.lineTo(dl, hiY);
      ctx.bezierCurveTo(midX, hiY, midX, lo, dr, lo); ctx.lineTo(X(1), lo); ctx.stroke();
      ctx.font = `600 11px ${FONT.display}`; ctx.fillStyle = C.muted; ctx.textAlign = "left";
      ctx.fillText(T.barrier, X(0) + 4, lo - 2 > hiY + 14 ? lo - 4 : hiY - 8);
      // uç adları
      ctx.textAlign = "center"; ctx.fillStyle = C.muted;
      ctx.fillText(T.anode, x0 - 7, y1 + 12); ctx.fillText(T.cathode, x0 + bw + 7, y1 + 12);
    }
    cs = canvas(cv, draw);
    const lp = loop((dt) => { step(dt); draw(); });
    return {
      enter() { sch.start(); lp.start(); },
      leave() { sch.stop(); lp.stop(); },
      sch,
    };
  };
  G["pn-eklemi"] = [{ wait: 500 }, { slide: "label:" + T.battery, to: 3 }, { wait: 1800 }, { slide: "label:" + T.battery, to: -4 }];

  /* =============== 2. Diyot I–V eğrisi =============== */
  const DMODELS = {
    si: Circuit.models.si,
    // küçük sinyal Schottky diyot (basitleştirilmiş): düşük eşik, daha büyük ters kaçak
    sk: { Is: 3e-8, N: 1.05, Rs: 0.1 },
  };
  // eğriyi çözücünün kendi diyotuyla tara: gerilim kaynağı doğrudan diyotun uçlarında
  function sweepDiode(model, v0, v1, n) {
    const s = Circuit.create([{ type: "V", id: "V", n: ["a", "0"], V: v0 }, { type: "D", id: "D", n: ["a", "0"], ...model }]);
    const out = [];
    for (let k = 0; k <= n; k++) { const v = v0 + ((v1 - v0) * k) / n; s.set("V", "V", v); s.dc(); out.push([v, s.i("D")]); if (s.i("D") > 2) break; }
    return out;
  }
  const IVC = {};
  const ivCurve = (k) => IVC[k] || (IVC[k] = sweepDiode(DMODELS[k], -1, 1, 500));

  Demos.c5iv = function (stage) {
    const gPane = h("div.pane", h("span.pane-title", T.ivTitle));
    const gcv = h("canvas", { role: "img", "aria-label": T.ivAria });
    gPane.append(gcv);
    const schPane = h("div.pane");
    const mV = meter(T.mVd), mI = meter(T.mId), mS = meter(T.mShock);
    const status = h("p.c5-status");
    const side = h("div.c5-side", h("div.meters", mV, mI, mS), status);
    const bottom = h("div.c5-bottom", schPane, side);
    stage.append(h("div.split.c5-split", { style: { gridTemplateRows: "1.25fr 1fr" } }, gPane, bottom));
    const def = clone(CIRCUITS.c5Iv);
    const sch = Schematic(schPane, def, { maxUnit: 22 });
    let kind = "si", logY = false;

    const vs = slider({ label: T.source, min: -5, max: 10, step: 0.05, value: 2, fmt: (v) => fmt(v, "V"), oninput: (v) => sch.set("B1", "V", v) });
    const ms = seg([["si", T.si], ["sk", T.sk]], kind, (k) => { kind = k; sch.set("D1", "model", DMODELS[k]); }, "Diyot türü");
    const ls = seg([["lin", T.lin], ["log", T.log]], "lin", (k) => { logY = k === "log"; drawG(); }, "Akım ekseni");
    stage.append(h("div.controls", vs, ms, ls));

    let gs;
    const VMIN = -1, VMAX = 1, ILO = -0.004, IHI = 0.05, LMIN = -13, LMAX = -1;
    function drawG() {
      if (!gs || !gs.w) return;
      const { ctx, w, h: H } = gs;
      ctx.clearRect(0, 0, w, H);
      const l = 58, r = 14, t = 40, b = 28, gw = w - l - r, gh = H - t - b;
      const X = (v) => l + ((v - VMIN) / (VMAX - VMIN)) * gw;
      const Y = logY
        ? (i) => t + gh - ((Math.log10(Math.max(Math.abs(i), 1e-15)) - LMIN) / (LMAX - LMIN)) * gh
        : (i) => t + gh - ((i - ILO) / (IHI - ILO)) * gh;
      // ızgara
      ctx.strokeStyle = rgba(C.silk, 0.09); ctx.lineWidth = 1; ctx.beginPath();
      for (let v = VMIN; v <= VMAX + 1e-9; v += 0.25) { ctx.moveTo(X(v) + 0.5, t); ctx.lineTo(X(v) + 0.5, t + gh); }
      if (logY) for (let e = LMIN; e <= LMAX; e++) { ctx.moveTo(l, Y(10 ** e) + 0.5); ctx.lineTo(l + gw, Y(10 ** e) + 0.5); }
      else for (let i = 0; i <= IHI + 1e-9; i += 0.01) { ctx.moveTo(l, Y(i) + 0.5); ctx.lineTo(l + gw, Y(i) + 0.5); }
      ctx.stroke();
      // eksenler
      ctx.strokeStyle = rgba(C.silk, 0.35); ctx.beginPath();
      ctx.moveTo(X(0) + 0.5, t); ctx.lineTo(X(0) + 0.5, t + gh);
      if (!logY) { ctx.moveTo(l, Y(0) + 0.5); ctx.lineTo(l + gw, Y(0) + 0.5); }
      ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `500 11px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let v = VMIN; v <= VMAX + 1e-9; v += 0.5) ctx.fillText(num(v, 1) + " V", X(v), t + gh + 7);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      if (logY) for (let e = LMIN + 1; e <= LMAX; e += 3) ctx.fillText(fmt(10 ** e, "A", 1), l - 6, Y(10 ** e));
      else for (let i = 0; i <= IHI + 1e-9; i += 0.01) ctx.fillText(Math.round(i * 1000) + " mA", l - 6, Y(i));
      if (logY) { ctx.textAlign = "left"; ctx.fillStyle = C.silk2; ctx.fillText("|I|", l + 6, t + 8); }
      ctx.save(); ctx.beginPath(); ctx.rect(l, t, gw, gh); ctx.clip();
      // yük doğrusu: I = (V_kaynak − V) / R
      const Vs = vs.get(), R = sch.part("R1").R;
      if (!logY && Vs > 0) {
        ctx.strokeStyle = rgba(C.silk, 0.32); ctx.setLineDash([5, 5]); ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(X(VMIN), Y((Vs - VMIN) / R)); ctx.lineTo(X(VMAX), Y((Vs - VMAX) / R)); ctx.stroke(); ctx.setLineDash([]);
      }
      // eğriler: seçili olan bakır, diğeri soluk
      ["si", "sk"].sort((a) => (a === kind ? 1 : -1)).forEach((k) => {
        const pts = ivCurve(k);
        ctx.strokeStyle = k === kind ? C.copper2 : rgba(C.silk, 0.22); ctx.lineWidth = k === kind ? 2.6 : 1.6;
        ctx.beginPath();
        pts.forEach(([v, i], j) => { const y = clamp(Y(i), t - 40, t + gh + 40); j ? ctx.lineTo(X(v), y) : ctx.moveTo(X(v), y); });
        ctx.stroke();
      });
      // 1 mA noktası (eğriden ara değerle)
      const pts = ivCurve(kind);
      let vk = null;
      for (let j = 1; j < pts.length; j++) if (pts[j - 1][1] < 1e-3 && pts[j][1] >= 1e-3) {
        const [va, ia] = pts[j - 1], [vb, ib] = pts[j];
        vk = va + ((1e-3 - ia) / (ib - ia)) * (vb - va); break;
      }
      if (vk != null) {
        ctx.strokeStyle = rgba(C.gold, 0.55); ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(vk) + 0.5, t); ctx.lineTo(X(vk) + 0.5, t + gh); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.gold; ctx.font = `600 11px ${FONT.display}`; ctx.textAlign = "right"; ctx.textBaseline = "top";
        ctx.fillText(`${T.knee}: ${fmt(vk, "V")}`, X(vk) - 5, t + 6);
      }
      ctx.restore();
      // çalışma noktası
      const Vd = sch.sim.vAcross("D1"), I = sch.sim.i("D1");
      let px = X(Vd), py = Y(I);
      ctx.font = `600 12px ${FONT.display}`; ctx.textBaseline = "middle";
      if (Vd < VMIN) { px = l + 6; ctx.fillStyle = C.amp; ctx.textAlign = "left"; ctx.fillText("← " + T.offLeft + ` (${fmt(Vd, "V")})`, l + 16, Math.min(py, t + gh - 12)); }
      if (py < t) { py = t + 4; ctx.fillStyle = C.heat; ctx.textAlign = "right"; ctx.fillText(T.offTop, l + gw - 6, t + 10); }
      ctx.strokeStyle = rgba(C.amp, 0.5); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, t + gh); ctx.lineTo(px, py); ctx.lineTo(l, py); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.amp; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.mask; ctx.lineWidth = 2; ctx.stroke();
    }
    gs = canvas(gcv, drawG);

    function update() {
      const Vd = sch.sim.vAcross("D1"), I = sch.sim.i("D1");
      const m = DMODELS[kind];
      // Shockley denklemi, eklem gerilimiyle (seri direnç düşümü çıkarılmış)
      const vj = Vd - I * (m.Rs || 0);
      const Ish = m.Is * (Math.exp(vj / ((m.N || 1) * Circuit.VT)) - 1);
      mV.set(fmt(Vd, "V")); mI.set(fmt(I, "A")); mS.set(fmt(Ish, "A"));
      status.textContent = Vd < 0 ? T.rOff : I < 1e-3 ? T.rSub : T.rOn;
      status.classList.toggle("on", I >= 1e-3);
      drawG();
    }
    sch.on("change", update);
    update();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["diyot-iv"] = [{ slide: "label:" + T.source, to: 0.4 }, { wait: 900 }, { slide: "label:" + T.source, to: 6 }, { wait: 900 }, { click: "=" + T.log }];

  /* =============== 3. Doğrultucu =============== */
  Demos.c5rect = function (stage) {
    const schPane = h("div.pane");
    const scPane = h("div.pane.c5-scope");
    const mR = meter(T.mRipple), mD = meter(T.mDc), mP = meter(T.mPeak), mL = meter(T.mIl), mE = meter(T.mEst);
    const side = h("div.c5-side.c5-side-narrow", h("div.meters", mR, mD, mP, mL, mE));
    const bottom = h("div.c5-bottom.c5-bottom-scope", scPane, side);
    stage.append(h("div.split.c5-split", { style: { gridTemplateRows: "1.05fr 1fr" } }, schPane, bottom));

    let mode = "half", Cval = 220e-6, Rval = 1000, capOn = false;
    const defFor = (m) => {
      const d = clone(m === "half" ? CIRCUITS.c5Half : CIRCUITS.c5Bridge);
      d.parts.forEach((p) => { if (p.id === "C1") p.C = Cval; if (p.id === "RL") p.R = Rval; if (p.id === "S1") p.closed = capOn; });
      return d;
    };
    let rip = null, per = -1, acc = null;
    const sc = Scope(scPane, {
      label: T.scopeAria, style: {}, // style verilmezse scope.js h(..., {style: null}) ile hata veriyor
      channels: [{ name: "KN1", vdiv: 5, pos: 1.5 }, { name: "KN2", vdiv: 5, pos: -3.5 }],
      tdiv: 5e-3, trigger: { ch: 0, level: 0, edge: "rise", mode: "auto" },
      overlay(ctx, s, gd) {
        if (!rip || rip.vpp > 6) return;
        const c = s.channels[1], ya = s.toY(rip.vmax, c), yb = s.toY(rip.vmin, c);
        ctx.strokeStyle = rgba(C.ch2, 0.6); ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gd.m, ya); ctx.lineTo(gd.m + gd.gw, ya); ctx.moveTo(gd.m, yb); ctx.lineTo(gd.m + gd.gw, yb); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = C.ch2; ctx.font = `600 11px ${FONT.mono}`; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        ctx.fillText("Vpp " + fmt(rip.vpp, "V"), gd.m + gd.gw - 6, ya - 3);
      },
    });
    const slow = h("span.c5-slow", T.slow);
    scPane.append(slow);
    const sch = Schematic(schPane, defFor(mode), { maxUnit: 22, tick: () => sc.draw() });

    function resetMeas() { rip = null; per = -1; acc = null; showMeas(); }
    // geçici rejimde bir değer değişince çözüm bir sonraki adıma kadar eski kalır; hemen bir adım at
    const settle = () => { sch.sim.step(sch.def.tran.h); sch.solve(); };
    sch.on("step", (t) => {
      const vin = sch.sim.vAcross("T1"), vo = sch.v(sch.netOf("RL", "a")), il = sch.sim.i("RL");
      sc.push(t, [vin, vo]);
      // her 20 ms'lik periyotta en büyük, en küçük ve ortalama çıkış
      const k = Math.floor(t * 50 + 1e-9);
      if (k !== per) {
        if (acc && acc.n > 100) { rip = { vpp: acc.mx - acc.mn, vmax: acc.mx, vmin: acc.mn, vdc: acc.s / acc.n, idc: acc.i / acc.n }; showMeas(); }
        per = k; acc = { mx: -Infinity, mn: Infinity, s: 0, i: 0, n: 0 };
      }
      acc.mx = Math.max(acc.mx, vo); acc.mn = Math.min(acc.mn, vo); acc.s += vo; acc.i += il; acc.n++;
    });
    function showMeas() {
      if (!rip) { [mR, mD, mP, mL, mE].forEach((m) => m.set(T.wait)); return; }
      mR.set(fmt(rip.vpp, "V")); mD.set(fmt(rip.vdc, "V")); mP.set(fmt(rip.vmax, "V")); mL.set(fmt(rip.idc, "A"));
      // kaba tahmin: dalgalanma ≈ I / (f_r · C); f_r yarım dalgada 50 Hz, köprüde 100 Hz
      const fr = mode === "half" ? 50 : 100;
      mE.set(capOn ? fmt(rip.idc / (fr * Cval), "V") : "—");
    }

    const ms = seg([["half", T.half], ["full", T.full]], mode, (m) => { mode = m; sch.rebuild(defFor(m)); sc.clear(); resetMeas(); }, "Doğrultucu türü");
    const cb = btn(T.capOff, () => sch.set("S1", "closed", !sch.part("S1").closed));
    const csl = slider({ label: T.cap, min: 10e-6, max: 2200e-6, step: 1e-6, value: Cval, log: true, fmt: (v) => num(v * 1e6, 0) + " µF", oninput: (v) => { Cval = v; sch.set("C1", "C", v); settle(); resetMeas(); } });
    const rsl = slider({ label: T.load, min: 100, max: 10000, step: 1, value: Rval, log: true, fmt: (v) => fmt(v, "Ω"), oninput: (v) => { Rval = v; sch.set("RL", "R", v); settle(); resetMeas(); } });
    stage.append(h("div.controls", ms, cb, csl, rsl));
    sch.on("change", () => {
      const on = !!sch.part("S1").closed;
      if (on !== capOn) { capOn = on; settle(); resetMeas(); }
      cb.textContent = capOn ? T.capOn : T.capOff;
      cb.classList.toggle("on", capOn);
    });
    resetMeas();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch, sc };
  };
  G["dogrultucu"] = [{ wait: 1200 }, { click: "=" + T.full }, { wait: 1600 }, { click: "=" + T.capOff }, { wait: 1400 }, { slide: "label:" + T.cap, to: 1000e-6 }];

  /* =============== 4. LED renkleri ve Zener =============== */
  const LEDS = [["LED1", "kirmizi"], ["LED2", "yesil"], ["LED3", "mavi"]];
  const HC = 1239.84; // h·c, eV·nm: foton enerjisi E = 1239,84 / λ(nm)

  // Zener eğrisi: aynı devreyi bağımsız bir çözücüde yük direncini tarayarak çıkar
  function zenerSweep(vin, rs) {
    const s = Circuit.create([
      { type: "V", id: "B", n: ["in", "0"], V: vin }, { type: "R", id: "RS", n: ["in", "o"], R: rs },
      { type: "D", id: "Z", n: ["0", "o"], ...Circuit.zener(5.1) },
      { type: "R", id: "RL", n: ["o", "0"], R: 1e6 }, { type: "R", id: "VM", n: ["o", "0"], R: 1e7 },
    ]);
    const out = [];
    for (let k = 0; k <= 160; k++) {
      const rl = 1e5 * Math.pow(10 / 1e5, k / 160);
      s.set("RL", "R", rl); s.dc();
      out.push({ il: s.i("RL"), vo: s.v("o"), iz: -s.i("Z") });
    }
    return out;
  }

  Demos.c5ledz = function (stage) {
    // LED görünümü
    const lSch = h("div.pane"), lPane = h("div.pane", h("span.pane-title", T.ledAria));
    const lcv = h("canvas", { role: "img", "aria-label": T.ledAria });
    lPane.append(lcv);
    const vLed = h("div.split.c5-split.c5-view", { style: { gridTemplateRows: "1.35fr 1fr" } }, lSch, lPane);
    // Zener görünümü
    const zSch = h("div.pane"), zPane = h("div.pane", h("span.pane-title", T.zTitle));
    const zcv = h("canvas", { role: "img", "aria-label": T.zAria });
    zPane.append(zcv);
    const mVo = meter(T.mVout), mIz = meter(T.mIz), mIl = meter(T.mIload), mPz = meter(T.mPz);
    const zStatus = h("p.c5-status");
    const zSide = h("div.c5-side.c5-side-narrow", h("div.meters", mVo, mIz, mIl, mPz), zStatus);
    const vZen = h("div.split.c5-split.c5-view", { style: { gridTemplateRows: "1.2fr 1fr" } }, zSch, h("div.c5-bottom.c5-bottom-scope", zPane, zSide));
    stage.append(vLed, vZen);

    const sl = Schematic(lSch, clone(CIRCUITS.c5Led), { maxUnit: 20 });
    const sz = Schematic(zSch, clone(CIRCUITS.c5Zener), { maxUnit: 22 });
    let mode = "led", active = false;

    const sup = slider({ label: T.supply, min: 0, max: 9, step: 0.05, value: 5, fmt: (v) => fmt(v, "V"), oninput: (v) => sl.set("B1", "V", v) });
    const vin = slider({ label: T.vin, min: 7, max: 15, step: 0.05, value: 12, fmt: (v) => fmt(v, "V"), oninput: (v) => { sz.set("B1", "V", v); zCurve = null; drawZ(); } });
    const rl = slider({ label: T.load, min: 47, max: 10000, step: 1, value: 1000, log: true, fmt: (v) => fmt(v, "Ω"), oninput: (v) => sz.set("RL", "R", v) });
    const gLed = h("span.c5-grp", sup), gZen = h("span.c5-grp", vin, rl);
    const ms = seg([["led", T.modeLed], ["zener", T.modeZener]], mode, (m) => setMode(m), "Deney");
    stage.append(h("div.controls", ms, gLed, gZen));

    function setMode(m) {
      mode = m;
      vLed.hidden = m !== "led"; vZen.hidden = m !== "zener";
      gLed.hidden = m !== "led"; gZen.hidden = m !== "zener";
      if (active) { (m === "led" ? sz : sl).stop(); (m === "led" ? sl : sz).start(); }
      requestAnimationFrame(() => { ls && ls.fit(); zs && zs.fit(); drawL(); drawZ(); });
    }

    /* foton enerjisi ve LED gerilimi */
    let ls;
    function drawL() {
      if (!ls || !ls.w) return;
      const { ctx, w, h: H } = ls;
      ctx.clearRect(0, 0, w, H);
      const narrow = w < 560;
      const l = 46, r = 12, t = 44, b = narrow ? 72 : 56, gw = w - l - r, gh = H - t - b;
      const EMAX = 3.5, Y = (e) => t + gh - (e / EMAX) * gh;
      ctx.strokeStyle = rgba(C.silk, 0.09); ctx.lineWidth = 1; ctx.beginPath();
      for (let e = 0; e <= EMAX + 1e-9; e += 0.5) { ctx.moveTo(l, Y(e) + 0.5); ctx.lineTo(l + gw, Y(e) + 0.5); }
      ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `500 11px ${FONT.mono}`; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let e = 0; e <= EMAX + 1e-9; e += 1) ctx.fillText(num(e, 0), l - 8, Y(e));
      ctx.save(); ctx.translate(12, t + gh / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.font = `600 11px ${FONT.display}`; ctx.fillText(T.eVaxis, 0, 0); ctx.restore();
      // gösterge: renkli = foton enerjisi, çerçeveli = ölçülen LED gerilimi
      ctx.font = `600 11px ${FONT.display}`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
      let lx = Math.max(l, w - 300), ly = 16;
      if (w < 520) { lx = l; ly = 30; }
      ctx.fillStyle = rgba(C.silk, 0.7); ctx.fillRect(lx, ly - 5, 14, 10);
      ctx.fillStyle = C.silk2; ctx.fillText(T.photon + " (eV)", lx + 20, ly);
      const lx2 = lx + 34 + ctx.measureText(T.photon + " (eV)").width;
      ctx.strokeStyle = C.silk; ctx.lineWidth = 1.4; ctx.strokeRect(lx2 + 0.5, ly - 4.5, 13, 9);
      ctx.fillText(T.ledV + " (V)", lx2 + 20, ly);
      const colW = gw / 3;
      LEDS.forEach(([id, c], k) => {
        const info = Circuit.LED[c];
        const E = HC / info.nm;
        const Vf = sl.sim.vAcross(id), I = sl.sim.i(id);
        const cx = l + colW * (k + 0.5), bw = Math.min(46, colW * 0.28);
        // foton enerjisi sütunu
        const gr = ctx.createLinearGradient(0, Y(E), 0, Y(0));
        gr.addColorStop(0, rgba(info.color, 0.85)); gr.addColorStop(1, rgba(info.color, 0.15));
        ctx.fillStyle = gr; ctx.fillRect(cx - bw - 4, Y(E), bw, Y(0) - Y(E));
        // ölçülen LED gerilimi sütunu
        ctx.strokeStyle = C.silk; ctx.lineWidth = 1.6;
        const yv = Y(clamp(Vf, 0, EMAX));
        ctx.strokeRect(cx + 4 + 0.5, yv + 0.5, bw, Y(0) - yv);
        ctx.fillStyle = rgba(C.silk, 0.08); ctx.fillRect(cx + 4, yv, bw, Y(0) - yv);
        // ışık: akımla parlaklık
        const lv = clamp(I / 0.015, 0, 1.4);
        if (lv > 0.01) {
          const R = 8 + 16 * lv, gy = Y(EMAX) + 4;
          const g2 = ctx.createRadialGradient(cx, gy + 4, 0, cx, gy + 4, R);
          g2.addColorStop(0, rgba(info.color, Math.min(0.9, 0.25 + lv * 0.6))); g2.addColorStop(1, rgba(info.color, 0));
          ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, gy + 4, R, 0, Math.PI * 2); ctx.fill();
        }
        ctx.textBaseline = "top"; ctx.textAlign = "center";
        ctx.font = `650 12px ${FONT.display}`; ctx.fillStyle = C.silk;
        ctx.fillText(colW > 150 ? `${info.name} · ${info.nm} nm` : info.name, cx, Y(0) + 6);
        ctx.font = `500 11px ${FONT.mono}`;
        const e1 = num(E, 2) + " eV", e2 = fmt(Vf, "V"), sep = " | ";
        const w1 = ctx.measureText(e1).width, w2 = ctx.measureText(sep).width, w3 = ctx.measureText(e2).width;
        let yy = Y(0) + 22;
        if (narrow) {
          ctx.fillStyle = info.color; ctx.fillText(e1, cx, yy); yy += 15;
          ctx.fillStyle = C.silk; ctx.fillText(e2, cx, yy);
        } else {
          let x = cx - (w1 + w2 + w3) / 2;
          ctx.textAlign = "left";
          ctx.fillStyle = info.color; ctx.fillText(e1, x, yy); x += w1;
          ctx.fillStyle = C.muted; ctx.fillText(sep, x, yy); x += w2;
          ctx.fillStyle = C.silk; ctx.fillText(e2, x, yy);
          ctx.textAlign = "center";
        }
        ctx.fillStyle = C.amp; ctx.fillText(fmt(I, "A"), cx, yy + 15);
      });
    }
    ls = canvas(lcv, drawL);
    sl.on("change", drawL);

    /* Zener: çıkış gerilimi – yük akımı */
    let zs, zCurve = null;
    function drawZ() {
      if (!zs || !zs.w) return;
      const { ctx, w, h: H } = zs;
      ctx.clearRect(0, 0, w, H);
      if (!zCurve) zCurve = zenerSweep(vin.get(), sz.part("RS").R);
      const l = 48, r = 26, t = 30, b = 28, gw = w - l - r, gh = H - t - b;
      const IMAX = 0.05, VMAX = 8;
      const X = (i) => l + (i / IMAX) * gw, Y = (v) => t + gh - (v / VMAX) * gh;
      ctx.strokeStyle = rgba(C.silk, 0.09); ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i <= IMAX + 1e-9; i += 0.01) { ctx.moveTo(X(i) + 0.5, t); ctx.lineTo(X(i) + 0.5, t + gh); }
      for (let v = 0; v <= VMAX; v += 2) { ctx.moveTo(l, Y(v) + 0.5); ctx.lineTo(l + gw, Y(v) + 0.5); }
      ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `500 11px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let i = 0; i <= IMAX + 1e-9; i += 0.01) ctx.fillText(Math.round(i * 1000) + " mA", X(i), t + gh + 7);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let v = 0; v <= VMAX; v += 2) ctx.fillText(v + " V", l - 6, Y(v));
      // regülasyon sınırı: zener akımının 1 mA'in altına düştüğü yük akımı
      const lim = zCurve.find((q) => q.iz < 1e-3);
      ctx.save(); ctx.beginPath(); ctx.rect(l, t, gw, gh); ctx.clip();
      if (lim) {
        ctx.fillStyle = rgba(C.heat, 0.07); ctx.fillRect(X(lim.il), t, l + gw - X(lim.il), gh);
        ctx.strokeStyle = rgba(C.heat, 0.6); ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(X(lim.il) + 0.5, t); ctx.lineTo(X(lim.il) + 0.5, t + gh); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.strokeStyle = C.copper2; ctx.lineWidth = 2.6; ctx.beginPath();
      zCurve.forEach((q, j) => (j ? ctx.lineTo(X(q.il), Y(q.vo)) : ctx.moveTo(X(q.il), Y(q.vo))));
      ctx.stroke();
      ctx.restore();
      if (lim) {
        ctx.fillStyle = C.heat; ctx.font = `600 11px ${FONT.display}`; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(`${T.zLimit} ≈ ${fmt(lim.il, "A", 2)}`, Math.min(X(lim.il) + 6, l + gw - 90), t + 6);
      }
      const ilNow = sz.part("S1").closed ? sz.sim.i("RL") : 0, voNow = sz.v(sz.netOf("DZ", "b"));
      const px = X(Math.min(ilNow, IMAX)), py = Y(voNow);
      ctx.strokeStyle = rgba(C.amp, 0.5); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, t + gh); ctx.lineTo(px, py); ctx.lineTo(l, py); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.amp; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.mask; ctx.lineWidth = 2; ctx.stroke();
    }
    zs = canvas(zcv, drawZ);
    function updZ() {
      const vo = sz.v(sz.netOf("DZ", "b")), iz = -sz.sim.i("DZ");
      const closed = sz.part("S1").closed, il = closed ? sz.sim.i("RL") : 0;
      mVo.set(fmt(vo, "V")); mIz.set(fmt(iz, "A")); mIl.set(fmt(il, "A")); mPz.set(fmt(Math.abs(sz.sim.p("DZ")), "W"));
      const ok = iz >= 1e-3;
      const irs = sz.sim.i("RS");
      zStatus.textContent = !closed ? T.zOpen : ok ? T.zOk : irs < 2e-3 && il < 0.012 ? T.zIn : T.zLow;
      zStatus.classList.toggle("on", ok);
      zStatus.classList.toggle("bad", !ok);
      drawZ();
    }
    sz.on("change", updZ);
    updZ();
    setMode("led");
    return {
      enter() { active = true; (mode === "led" ? sl : sz).start(); },
      leave() { active = false; sl.stop(); sz.stop(); },
      sl, sz,
    };
  };
  G["led-zener"] = [{ slide: "label:" + T.supply, to: 2.6 }, { wait: 1400 }, { slide: "label:" + T.supply, to: 6 }, { wait: 900 }, { click: "=" + T.modeZener }, { slide: "label:" + T.load, to: 150 }];
})();
