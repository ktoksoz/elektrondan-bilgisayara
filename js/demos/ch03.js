/* 3. bölüm: devre analizi deneyleri (seri/paralel, gerilim bölücü, KCL, KVL, multimetre) */
(function () {
  const { C, FONT, h, slider, seg, btn, canvas, num, rgba } = L;
  const fmt = (v, u, d) => Circuit.fmt(v, u, d);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  window.GUIDES = window.GUIDES || {};
  window.GUIDE_TARGETS = window.GUIDE_TARGETS || {};
  const G = window.GUIDES;

  /* Arayüz metinleri (ileride js/strings.js'e taşınacak) */
  const S = (STR.ch03 = {
    sp: {
      battery: "Pil gerilimi", add: "+ Direnç ekle", allSeries: "Hepsi seri", allParallel: "Hepsi paralel",
      series: "Seri", parallel: "Paralel", first: "ilk direnç", remove: "çıkar", up: "büyüt", down: "küçült",
      listTitle: "Dirençler: her biri bir öncekine seri ya da paralel", placement: "bağlantı",
      req: "Eşdeğer direnç", measured: "Ölçüm", formula: "Formül", maxNote: "En fazla 5 direnç",
    },
    div: {
      pos: "Konum", vin: "Giriş gerilimi", rl: "Yük direnci", connect: "Yük bağla", disconnect: "Yükü ayır",
      graph: "Çıkış gerilimi – potansiyometre konumu", unloaded: "yüksüz", loaded: "yüklü",
      mUnl: "Yüksüz çıkış", mLd: "Yüklü çıkış", mDrop: "Düşüş", mIL: "Yük akımı",
      noteOff: "Yük bağlı değil. Yük bağlansaydı çıkış bu kadar olurdu:", noteOn: "Yük alt yarıya paralel bağlandı:",
    },
    kcl: {
      modes: [["akim", "Akımlar"], ["denklem", "Düğüm denklemleri"], ["thev", "Thevenin"]],
      v1: "V1", v2: "V2", r4: "R4",
      node: "X düğümü", inn: "Giren", out: "Çıkan", into: "giriyor", outof: "çıkıyor", zero: "akım yok",
      sum: "Toplam (giren − çıkan)", branch: { A1: "V1–R1 kolu", A2: "V2–R2 kolu", A3: "R3 kolu", A4: "R4 kolu" },
      load: "yük", thevTitle: "Thevenin eşdeğeri: aynı yük, tek kaynak + tek direnç",
      mOrig: "Asıl devrede yük akımı", mEq: "Eşdeğerde yük akımı", mVth: "Vth (açık devre)", mIsc: "Isc (kısa devre)", mRth: "Rth = Vth / Isc",
      same: "Yük aynı akımı çekiyor: fark", open: "S1 açık: yük bağlı değil, iki devrede de akım sıfır.",
    },
    kvl: {
      loops: [["sol", "Sol çevre"], ["sag", "Sağ çevre"], ["dis", "Dış çevre"]],
      v1: "V1", v2: "V2", r2: "R2", pause: "Duraklat", play: "Yürüt", restart: "Baştan",
      profile: "Gezginin yolu boyunca gerilim (düğüm gerilimi)", ledger: "Çevre boyunca toplam",
      rise: "yükselir", drop: "düşer", total: "Toplam", back: "Başladığı yere döndü: toplam sıfır.", start: "başlangıç",
    },
    mm: {
      places: [["R1", "R1'in iki ucu"], ["L1", "Lambanın iki ucu"], ["B1", "Pilin iki ucu"], ["seri", "Devreyi açıp araya"]],
      modes: [["off", "Kapalı", "Kademe: Kapalı"], ["V", "V", "Kademe: Gerilim (V)"], ["A", "mA", "Kademe: Akım (mA)"], ["R", "Ω", "Kademe: Direnç (Ω)"]],
      powerOn: "Gücü aç", powerOff: "Gücü kes", fuse: "Sigortayı değiştir", probes: "Problar",
      ann: { V: "DC V", A: "DC mA", R: "Ω", off: "" }, fuseTag: "sigorta", blownTag: "sigorta attı",
      msg: {
        off: "Kademe anahtarı kapalı. Bir ölçüm kademesi seçin.",
        vOk: "Doğru bağlantı: voltmetre, ölçtüğü parçaya paralel bağlanır. İç direnci çok büyük (10 MΩ), devreyi neredeyse hiç etkilemez.",
        vSeri: "Voltmetre seri bağlandı: 10 MΩ'luk iç direnci akımı neredeyse durdurdu ({I}). Lamba söndü; ekrandaki değer pilin gerilimine yakın.",
        aOk: "Doğru bağlantı: ampermetre devreyi açıp araya, seri bağlanır. Devrenin bütün akımı aletin içinden geçer.",
        aBlown: "Sigorta attı! Ampermetrenin iç direnci neredeyse 0 Ω'dur. Paralel bağlanınca ölçtüğü parçayı kısa devre eder ve büyük bir akım çeker; aleti sigorta korudu.",
        aShort: "Ampermetre lambayı kısa devre etti: akım lambanın yerine aletin içinden geçiyor, lamba söndü. Okunan değer devrenin gerçek akımı değil.",
        aDead: "Sigorta atık: ampermetre hiçbir şey ölçemez. Önce sigortayı değiştirin.",
        rOk: "Doğru: güç kapalı, ohmmetre parçanın iki ucunda. Alet küçük bir akım gönderip gerilime bakar: R = V / I.",
        rPower: "Güç açıkken direnç ölçülmez! Ohmmetre kendi küçük akımını gönderip gerilime bakar; devredeki pil bu gerilimi bozar, okunan değer yanlış.",
        rBat: "Pilin direnci ohmmetreyle ölçülmez: pilin kendi gerilimi ölçümü bozar.",
        rSeri: "Ohmmetre devreyi açıp araya değil, parçanın iki ucuna bağlanır. Burada açık anahtar yüzünden sonsuz (OL) görünüyor.",
        rSeriOn: "Ohmmetre devreyi açıp araya bağlanmaz; üstelik güç açık, okunan değer anlamsız.",
      },
    },
  });

  // işaretli değer: artı işareti de yazılır; eps altı sıfır sayılır
  const sgn = (v, u, eps = u === "A" ? 1e-9 : 5e-4) => (Math.abs(v) < eps ? "0 " + u : (v > 0 ? "+" : "") + fmt(v, u));
  const meter = (label) => { const b = h("b", "—"); const m = h("div.meter", h("small", label), b); m.val = b; return m; };

  /* ================= 3.1 Seri ve paralel ================= */
  Demos.c3seriParalel = function (stage) {
    const T = S.sp;
    const base = clone(CIRCUITS.c3seriParalel);
    const LY = base.layout;
    const VALS = [100, 150, 220, 330, 470, 680, 1000, 1500, 2200, 3300, 4700, 6800, 10000];
    const MAX = 5;
    const list = [];
    base.start.forEach((g) => g.forEach((R, k) => list.push({ R, par: k > 0 })));

    const top = h("div.pane");
    const listBox = h("div.c3-rlist");
    const eqBox = h("div.c3-eq");
    stage.append(h("div.split.c3-sp-split", top, h("div.c3-sp-bottom", listBox, eqBox)));

    function groups() {
      const gs = [];
      list.forEach((r, i) => { r.id = "R" + (i + 1); if (r.par && gs.length) gs[gs.length - 1].push(r); else gs.push([r]); });
      return gs;
    }
    // gruplar soldan sağa seri; grubun içindeki dirençler alt alta, iki bara arasında paralel
    function makeDef() {
      const gs = groups();
      const parts = clone(CIRCUITS.c3seriParalel.parts), wires = clone(CIRCUITS.c3seriParalel.wires);
      let x = LY.x0;
      wires.push([[5, 0], [x, 0]]);
      const maxk = Math.max(...gs.map((g) => g.length));
      gs.forEach((g, gi) => {
        g.forEach((r, j) => {
          const y = j * LY.row;
          parts.push({ id: r.id, type: "resistor", at: [x + 3, y], R: r.R });
          wires.push([[x, y], [x + 1, y]], [[x + 5, y], [x + 6, y]]);
        });
        if (g.length > 1) { const yb = (g.length - 1) * LY.row; wires.push([[x, 0], [x, yb]], [[x + 6, 0], [x + 6, yb]]); }
        if (gi < gs.length - 1) wires.push([[x + 6, 0], [x + LY.pitch, 0]]);
        x += LY.pitch;
      });
      const E = x - LY.pitch + 6, D = Math.max(LY.minBottom, (maxk - 1) * LY.row + 3);
      wires.push([[E, 0], [E + 1, 0], [E + 1, D], [0, D], [0, 7]]);
      return { parts, wires };
    }
    Object.assign(base, makeDef());
    const sch = Schematic(top, base, {
      maxUnit: 26,
      overlay(ctx, sc) {
        // her direncin altında kendi akımı
        const u = sc.unit;
        ctx.font = `600 ${Math.max(10, 0.5 * u)}px ${FONT.mono}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = C.amp;
        list.forEach((r) => {
          const p = sc.part(r.id);
          if (!p) return;
          const [x, y] = sc.screenOf([p.at[0], p.at[1] + 1.05]);
          ctx.fillText(fmt(Math.abs(sc.sim.i(r.id)), "A"), x, y);
        });
      },
    });

    const rebuild = () => { sch.rebuild(makeDef()); renderList(); };
    function setPar(i, v) { list[i].par = v; rebuild(); }
    function stepR(i, d) {
      const k = VALS.indexOf(list[i].R);
      list[i].R = VALS[L.clamp((k < 0 ? 6 : k) + d, 0, VALS.length - 1)];
      sch.set(list[i].id, "R", list[i].R);
      renderList();
    }
    function removeR(i) { list.splice(i, 1); if (list.length) list[0].par = false; rebuild(); }

    function renderList() {
      listBox.innerHTML = "";
      listBox.append(h("div.c3-cap", T.listTitle));
      list.forEach((r, i) => {
        const row = h("div.c3-rrow");
        row.append(h("b.c3-rid", r.id));
        if (i > 0) {
          const mk = (v, lab) => h("button", { type: "button", class: r.par === v ? "on" : null, "aria-pressed": r.par === v ? "true" : "false", "aria-label": r.id + " " + lab.toLowerCase(), onclick: () => setPar(i, v) }, lab);
          row.append(h("div.c3-sw", { role: "group", "aria-label": r.id + " " + T.placement }, mk(false, T.series), mk(true, T.parallel)));
        } else row.append(h("span.c3-first", T.first));
        row.append(h("span.c3-step",
          h("button.sbtn", { type: "button", "aria-label": r.id + " " + T.down, onclick: () => stepR(i, -1) }, "−"),
          h("span.c3-rv", fmt(r.R, "Ω")),
          h("button.sbtn", { type: "button", "aria-label": r.id + " " + T.up, onclick: () => stepR(i, 1) }, "+")));
        row.append(h("button.c3-x", { type: "button", "aria-label": r.id + " " + T.remove, title: T.remove, disabled: list.length < 2 }, "×"));
        row.lastChild.addEventListener("click", () => removeR(i));
        listBox.append(row);
      });
      addB.disabled = list.length >= MAX;
      addB.title = list.length >= MAX ? T.maxNote : "";
    }

    function update() {
      const gs = groups();
      const gv = gs.map((g) => 1 / g.reduce((s, r) => s + 1 / r.R, 0));
      const Req = gv.reduce((a, b) => a + b, 0);
      const V = sch.sim.vAcross("B1"), I = sch.sim.i("A1");
      const names = gs.map((g) => { const t = g.map((r) => r.id).join(" || "); return g.length > 1 && gs.length > 1 ? "(" + t + ")" : t; });
      let s = `<div class="c3-cap">${T.req}</div><p class="c3-f">R<sub>eş</sub> = ${names.join(" + ")}</p>`;
      gs.forEach((g, k) => {
        if (g.length < 2) return;
        s += `<p class="c3-f c3-sub">1 / (${g.map((r) => "1/" + fmt(r.R, "Ω")).join(" + ")}) = ${fmt(gv[k], "Ω")}</p>`;
      });
      if (gs.length > 1) s += `<p class="c3-f">R<sub>eş</sub> = ${gv.map((v) => fmt(v, "Ω")).join(" + ")}</p>`;
      s += `<p class="c3-f c3-big">${T.formula}: <b>${fmt(Req, "Ω")}</b></p>`;
      s += `<p class="c3-f c3-big">${T.measured}: ${fmt(V, "V")} / ${fmt(I, "A")} = <b>${I > 1e-12 ? fmt(V / I, "Ω") : "—"}</b></p>`;
      eqBox.innerHTML = s;
    }
    sch.on("change", update);

    const vs = slider({ label: T.battery, min: 1, max: 12, step: 0.5, value: 9, fmt: (v) => fmt(v, "V"), oninput: (v) => sch.set("B1", "V", v) });
    const addB = btn(T.add, () => { if (list.length < MAX) { list.push({ R: 1000, par: false }); rebuild(); } }, "primary");
    const serB = btn(T.allSeries, () => { list.forEach((r) => (r.par = false)); rebuild(); });
    const parB = btn(T.allParallel, () => { list.forEach((r, i) => (r.par = i > 0)); rebuild(); });
    stage.append(h("div.controls", vs, addB, serB, parB));
    renderList();
    update();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["seri-paralel"] = [{ click: "aria:R3 seri" }, { wait: 900 }, { click: "aria:R2 paralel" }, { wait: 900 }, { click: "=Hepsi paralel" }];

  /* ================= 3.2 Gerilim bölücü ================= */
  Demos.c3bolucu = function (stage) {
    const T = S.div;
    const top = h("div.pane");
    const gPane = h("div.pane", h("span.pane-title", T.graph));
    const gcv = h("canvas", { role: "img", "aria-label": T.graph });
    gPane.append(gcv);
    const mUnl = meter(T.mUnl), mLd = meter(T.mLd), mDrop = meter(T.mDrop), mIL = meter(T.mIL);
    const note = h("p.c3-note");
    const side = h("div.c3-side", h("div.meters", mUnl, mLd, mDrop, mIL), note);
    stage.append(h("div.split.c3-div-split", top, h("div.c3-div-bottom", gPane, side)));
    const def = clone(CIRCUITS.c3bolucu);
    const Rp = def.parts.find((p) => p.id === "P1").R;
    const sch = Schematic(top, def, { maxUnit: 25 });
    let Vin = 10, RL = 10000;
    const k = () => 1 - (sch.part("P1").pos ?? 0.5); // çıkış oranı: 0 alt uç, 1 üst uç
    const loaded = () => !!sch.part("S1").closed;

    // karşılaştırma ve grafik için ayrı, küçük bir çözücü: aynı bölücü, yük isteğe bağlı
    const aux = Circuit.create({ elements: [
      { type: "V", id: "B", n: ["in", "0"], V: Vin },
      { type: "POT", id: "P", n: ["in", "w", "0"], R: Rp, pos: 0.5 },
      { type: "S", id: "S", n: ["w", "x"], closed: false },
      { type: "R", id: "L", n: ["x", "0"], R: RL },
    ] });
    function auxOut(kk, withLoad) {
      aux.set("B", "V", Vin); aux.set("P", "pos", 1 - kk); aux.set("S", "closed", withLoad); aux.set("L", "R", RL);
      aux.dc();
      return { v: aux.v("w"), i: aux.i("L") };
    }

    let gs, curve = { u: [], l: [] };
    function sweep() {
      curve = { u: [], l: [] };
      for (let i = 0; i <= 50; i++) { const kk = i / 50; curve.u.push(auxOut(kk, false).v); curve.l.push(auxOut(kk, true).v); }
    }
    function drawGraph() {
      if (!gs || !gs.w) return;
      const { ctx, w, h: H } = gs;
      ctx.clearRect(0, 0, w, H);
      const l = 46, r = 14, t = 30, b = 26, gw = w - l - r, gh = H - t - b;
      const vmax = Math.max(1, Math.ceil(Vin));
      const X = (kk) => l + kk * gw, Y = (v) => t + gh - (v / vmax) * gh;
      ctx.strokeStyle = rgba(C.silk, 0.1); ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i <= 4; i++) { ctx.moveTo(X(i / 4), t); ctx.lineTo(X(i / 4), t + gh); ctx.moveTo(l, Y((vmax * i) / 4)); ctx.lineTo(l + gw, Y((vmax * i) / 4)); }
      ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `500 11px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let i = 0; i <= 4; i++) ctx.fillText("%" + i * 25, X(i / 4), t + gh + 6);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let i = 0; i <= 4; i += 2) ctx.fillText(num((vmax * i) / 4, 1) + " V", l - 6, Y((vmax * i) / 4));
      const line = (arr, col, dash, wd) => {
        ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.setLineDash(dash); ctx.beginPath();
        arr.forEach((v, i) => (i ? ctx.lineTo(X(i / 50), Y(v)) : ctx.moveTo(X(0), Y(v)))); ctx.stroke(); ctx.setLineDash([]);
      };
      const on = loaded();
      line(curve.u, on ? rgba(C.silk, 0.55) : C.silk, on ? [5, 4] : [], 2);
      line(curve.l, on ? C.copper2 : rgba(C.copper2, 0.5), on ? [] : [5, 4], 2.4);
      // lejant
      ctx.font = `600 12px ${FONT.display}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = C.silk; ctx.fillText("— " + T.unloaded, l + 8, t + 6);
      ctx.fillStyle = C.copper2; ctx.fillText("— " + T.loaded + " (RL = " + fmt(RL, "Ω") + ")", l + 8, t + 22);
      // çalışma noktası: ölçülen çıkış
      const kk = k(), v = sch.sim.vAcross("VM");
      const px = X(kk), py = Y(v);
      ctx.strokeStyle = rgba(C.amp, 0.5); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px, t + gh); ctx.lineTo(px, py); ctx.lineTo(l, py); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.amp; ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2); ctx.fill();
    }
    gs = canvas(gcv, drawGraph);

    function update() {
      const kk = k(), on = loaded();
      if (Math.abs(ks.get() - kk) > 1e-6) ks.set(kk);
      const vm = sch.sim.vAcross("VM");
      let unl, ld, il;
      if (on) { unl = auxOut(kk, false).v; ld = vm; il = sch.sim.i("RL"); }
      else { unl = vm; const o = auxOut(kk, true); ld = o.v; il = o.i; }
      mUnl.val.textContent = fmt(unl, "V");
      mLd.val.textContent = fmt(ld, "V");
      mDrop.val.textContent = unl > 1e-6 ? "%" + num(((unl - ld) / unl) * 100, 1) : "—";
      mIL.val.textContent = fmt(Math.abs(il), "A");
      mLd.classList.toggle("c3-dim", !on); mUnl.classList.toggle("c3-dim", on);
      const R1 = Rp * (1 - kk), R2 = Rp * kk, par = R2 > 0 ? 1 / (1 / R2 + 1 / RL) : 0;
      note.innerHTML = `R1 (üst) = ${fmt(R1, "Ω")} · R2 (alt) = ${fmt(R2, "Ω")}<br>${on ? T.noteOn : T.noteOff} R2 || RL = ${fmt(par, "Ω")}`;
      loadB.textContent = on ? T.disconnect : T.connect;
      loadB.classList.toggle("on", on);
      drawGraph();
    }
    const ks = slider({ label: T.pos, min: 0, max: 1, step: 0.01, value: 0.5, fmt: (v) => "%" + Math.round(v * 100), oninput: (v) => sch.set("P1", "pos", 1 - v) });
    const vs = slider({ label: T.vin, min: 0, max: 12, step: 0.1, value: Vin, fmt: (v) => fmt(v, "V"), oninput: (v) => { Vin = v; sweep(); sch.set("B1", "V", v); } });
    const rs = slider({ label: T.rl, min: 100, max: 100000, step: 1, log: true, value: RL, fmt: (v) => fmt(v, "Ω"), oninput: (v) => { RL = v; sweep(); sch.set("RL", "R", v); } });
    const loadB = btn(T.connect, () => sch.set("S1", "closed", !loaded()));
    stage.append(h("div.controls", ks, vs, rs, loadB));
    sweep();
    sch.on("change", update);
    update();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["gerilim-bolucu"] = [{ slide: "label:Konum", to: 0.7 }, { wait: 500 }, { click: "Yük bağla" }, { wait: 900 }, { slide: "label:Yük direnci", to: 1500 }];

  /* ================= 3.3 KCL, düğüm denklemleri, Thevenin ================= */
  Demos.c3kcl = function (stage) {
    const T = S.kcl;
    let mode = "akim";
    const def = clone(CIRCUITS.c3kcl);
    const top = h("div.pane");
    const pAkim = h("div.c3-junction"), pDen = h("div.c3-steps"), pThev = h("div.c3-thev");
    const thevPane = h("div.pane", h("span.pane-title", T.thevTitle));
    const mOrig = meter(T.mOrig), mEq = meter(T.mEq), mVth = meter(T.mVth), mIsc = meter(T.mIsc), mRth = meter(T.mRth);
    const thevFlag = h("p.c3-note");
    pThev.append(thevPane, h("div.c3-side", h("div.meters", mOrig, mEq), h("div.meters", mVth, mIsc, mRth), thevFlag));
    const bottom = h("div.c3-kcl-bottom", pAkim, pDen, pThev);
    stage.append(h("div.split.c3-kcl-split", top, bottom));

    const sch = Schematic(top, def, {
      maxUnit: 24,
      overlay(ctx, sc) {
        if (mode !== "thev") return;
        const b = def.loadBox;
        const [x0, y0] = sc.screenOf([b[0], b[1]]), [x1, y1] = sc.screenOf([b[2], b[3]]);
        ctx.strokeStyle = C.copper2; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.setLineDash([]);
        ctx.fillStyle = C.copper2; ctx.font = `700 ${Math.max(11, 0.6 * sc.unit)}px ${FONT.display}`;
        ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText(T.load, x1 - 4, y0 + 4);
      },
    });
    const eq = Schematic(thevPane, clone(CIRCUITS.c3thev), { maxUnit: 22 });
    const AM = ["A1", "A2", "A3", "A4"];
    const val = (id) => sch.part(id)[id[0] === "V" ? "V" : "R"];

    // Thevenin: yük (R4 kolu) çıkarılınca X düğümünün açık devre gerilimi ve kısa devre akımı
    function thevenin() {
      const els = (extra) => [
        { type: "V", id: "V1", n: ["p1", "0"], V: val("V1") }, { type: "R", id: "R1", n: ["p1", "x"], R: val("R1") },
        { type: "V", id: "V2", n: ["p2", "0"], V: val("V2") }, { type: "R", id: "R2", n: ["x", "p2"], R: val("R2") },
        { type: "R", id: "R3", n: ["x", "0"], R: val("R3") }, ...extra];
      const so = Circuit.create({ elements: els([]) }); so.dc();
      const ss = Circuit.create({ elements: els([{ type: "V", id: "SC", n: ["x", "0"], V: 0 }]) }); ss.dc();
      const Vth = so.v("x"), Isc = ss.i("SC");
      let Rth;
      if (Math.abs(Isc) > 1e-12) Rth = Vth / Isc;
      else { // kaynaklar sıfırken: X'e 1 mA basıp gerilime bak
        const st = Circuit.create({ elements: els([{ type: "I", id: "IT", n: ["0", "x"], I: 1e-3 }]).map((e) => (e.type === "V" ? { ...e, V: 0 } : e)) }); st.dc();
        Rth = st.v("x") / 1e-3;
      }
      return { Vth, Isc, Rth };
    }

    const fixed = (v, d = 3) => { const s = v.toFixed(d).replace(".", ",").replace("-", "−"); return /^−0,0+$/.test(s) ? s.slice(1) : s; };
    function updAkim() {
      const I = AM.map((id) => sch.sim.i(id));
      const inn = I.map((v, k) => [AM[k], v]).filter(([, v]) => v > 1e-9);
      const out = I.map((v, k) => [AM[k], -v]).filter(([, v]) => v > 1e-9);
      const tin = inn.reduce((s, [, v]) => s + v, 0), tout = out.reduce((s, [, v]) => s + v, 0);
      const mx = Math.max(tin, tout, 1e-9);
      const bar = (arr, cls) => `<div class="c3-bar ${cls}">${arr.map(([id, v]) => `<span style="flex:${v / mx}"><i>${id}</i></span>`).join("")}<em style="flex:${Math.max(0, 1 - arr.reduce((s, [, v]) => s + v, 0) / mx)}"></em></div>`;
      const sum = I.reduce((a, b) => a + b, 0);
      pAkim.innerHTML = `<div class="c3-cap">${T.node}</div>
        <div class="c3-barrow"><b>${T.inn}</b>${bar(inn, "in")}<span class="mono">${fmt(tin, "A")}</span></div>
        <div class="c3-barrow"><b>${T.out}</b>${bar(out, "out")}<span class="mono">${fmt(tout, "A")}</span></div>
        <table class="c3-tab">${AM.map((id, k) => `<tr><td><b>${id}</b> ${T.branch[id]}</td><td class="mono">${sgn(I[k], "A")}</td><td>${Math.abs(I[k]) < 1e-9 ? T.zero : I[k] > 0 ? "→ X, " + T.into : "X →, " + T.outof}</td></tr>`).join("")}</table>
        <p class="c3-sum">${T.sum}: <b class="mono">${fixed(sum * 1000)} mA</b></p>`;
    }
    function updDen() {
      const v1 = val("V1"), v2 = val("V2"), r1 = val("R1"), r2 = val("R2"), r3 = val("R3"), r4 = val("R4");
      const on = sch.part("S1").closed;
      const vx = sch.v(sch.netOf("R1", "b"));
      const G = 1 / r1 + 1 / r2 + 1 / r3 + (on ? 1 / r4 : 0), J = v1 / r1 + v2 / r2;
      const V = (x) => fmt(x, "V"), R = (x) => fmt(x, "Ω");
      pDen.innerHTML = `<ol>
        <li>Alt hattı <b>toprak</b> (0 V) seçiyoruz. Bilinmeyen tek düğüm X; gerilimine V<sub>X</sub> diyoruz.</li>
        <li>X'te KCL: kollardan X'e giren akımların toplamı sıfır. Her kolun akımı Ohm kanunuyla yazılır:
          <span class="c3-f">(V1 − V<sub>X</sub>)/R1 + (V2 − V<sub>X</sub>)/R2 − V<sub>X</sub>/R3${on ? " − V<sub>X</sub>/R4" : ""} = 0</span>
          <span class="c3-f">(${V(v1)} − V<sub>X</sub>)/${R(r1)} + (${V(v2)} − V<sub>X</sub>)/${R(r2)} − V<sub>X</sub>/${R(r3)}${on ? " − V<sub>X</sub>/" + R(r4) : ""} = 0</span></li>
        <li>V<sub>X</sub>'i yalnız bırakınca:
          <span class="c3-f">V<sub>X</sub> = (V1/R1 + V2/R2) / (1/R1 + 1/R2 + 1/R3${on ? " + 1/R4" : ""}) = ${fmt(J, "A")} / ${fmt(G, "S")} = <b>${V(J / G)}</b></span></li>
        <li>Simülatörün bulduğu: <b class="mono">V<sub>X</sub> = ${fmt(vx, "V", 4)}</b>. Aynı sonuç: <span class="mono">js/circuit.js</span> her devreyi bu yöntemle, düğüm gerilimi analiziyle (MNA) çözer; çok düğümlü devrede bu denklemler bir matris olur.</li>
      </ol>`;
    }
    function updThev() {
      const th = thevenin();
      const on = sch.part("S1").closed;
      eq.set("Vth", "V", th.Vth); eq.set("Rth", "R", th.Rth); eq.set("RL", "R", val("R4")); eq.set("S", "closed", on);
      const io = -sch.sim.i("A4"), ie = eq.sim.i("A");
      mOrig.val.textContent = fmt(io, "A"); mEq.val.textContent = fmt(ie, "A");
      mVth.val.textContent = fmt(th.Vth, "V"); mIsc.val.textContent = fmt(th.Isc, "A"); mRth.val.textContent = fmt(th.Rth, "Ω");
      thevFlag.innerHTML = on ? `${T.same} <b class="mono">${fixed((io - ie) * 1000)} mA</b>` : T.open;
    }
    function update() { if (mode === "akim") updAkim(); else if (mode === "denklem") updDen(); else updThev(); }
    sch.on("change", update);

    const ms = seg(T.modes, mode, (m) => setMode(m), "Görünüm");
    function setMode(m) {
      mode = m;
      pAkim.hidden = m !== "akim"; pDen.hidden = m !== "denklem"; pThev.hidden = m !== "thev";
      bottom.dataset.mode = m;
      if (m === "thev") eq.start(); else eq.stop();
      update(); sch.draw();
    }
    const s1 = slider({ label: T.v1, min: 0, max: 12, step: 0.1, value: 9, fmt: (v) => fmt(v, "V"), oninput: (v) => sch.set("V1", "V", v) });
    const s2 = slider({ label: T.v2, min: 0, max: 12, step: 0.1, value: 5, fmt: (v) => fmt(v, "V"), oninput: (v) => sch.set("V2", "V", v) });
    const s4 = slider({ label: T.r4, min: 100, max: 10000, step: 1, log: true, value: 1000, fmt: (v) => fmt(v, "Ω"), oninput: (v) => sch.set("R4", "R", v) });
    stage.append(h("div.controls", ms, s1, s2, s4));
    setMode("akim");
    return { enter() { sch.start(); if (mode === "thev") eq.start(); }, leave() { sch.stop(); eq.stop(); }, sch, eq };
  };
  G["kcl"] = [{ slide: "label:V2", to: 2 }, { wait: 700 }, { click: "S1" }, { wait: 900 }, { click: "S1" }, { wait: 500 }, { click: "=Thevenin" }];

  /* ================= 3.4 KVL: çevrede dolaşan gezgin ================= */
  Demos.c3kvl = function (stage) {
    const T = S.kvl;
    const def = clone(CIRCUITS.c3kvl);
    let loopKey = "sol";
    const top = h("div.pane");
    const prof = h("div.pane", h("span.pane-title", T.profile));
    const pcv = h("canvas", { role: "img", "aria-label": T.profile });
    prof.append(pcv);
    const ledger = h("div.c3-ledger");
    stage.append(h("div.split.c3-kvl-split", top, h("div.c3-kvl-bottom", prof, ledger)));

    let path = null;
    const tr = { s: 0, pause: 0.8, visited: 0, done: false, playing: !L.reduced() };
    const key = (p) => Math.round(p[0] * 2) / 2 + "," + Math.round(p[1] * 2) / 2;
    const comps = () => path.segs.filter((g) => g.part);

    const sch = Schematic(top, def, { maxUnit: 26, overlay: drawOverlay, tick });

    function buildPath() {
      const X = sch.extract, segs = [];
      let cur = null;
      const push = (B, part) => {
        if (cur) { const len = Math.hypot(B[0] - cur[0], B[1] - cur[1]); if (len > 1e-9) segs.push({ A: cur, B, len, part }); }
        cur = B;
      };
      def.loops[loopKey].forEach((it) => {
        if (Array.isArray(it)) push(it, null);
        else { push(X.pinWorld[it.p + "." + it.from], null); push(X.pinWorld[it.p + "." + it.to], it); }
      });
      let s = 0;
      segs.forEach((g) => { g.s0 = s; s += g.len; });
      path = { segs, total: s };
      refreshV();
    }
    // her yol parçasının iki ucundaki düğüm gerilimi (çözücüden)
    function refreshV() {
      const X = sch.extract;
      path.segs.forEach((g) => {
        if (g.part) { g.vA = sch.v(sch.netOf(g.part.p, g.part.from)); g.vB = sch.v(sch.netOf(g.part.p, g.part.to)); }
        else { const q = X.pts.get(key(g.A)); g.vA = g.vB = q ? sch.v(q.net) : 0; }
      });
    }
    function restart() { tr.s = 0; tr.visited = 0; tr.done = false; tr.pause = 0.6; updateLedger(); }
    function posAt(s) {
      const g = path.segs.find((q) => s <= q.s0 + q.len + 1e-9) || path.segs[path.segs.length - 1];
      const t = L.clamp((s - g.s0) / g.len, 0, 1);
      return { p: [g.A[0] + (g.B[0] - g.A[0]) * t, g.A[1] + (g.B[1] - g.A[1]) * t], v: g.vA + (g.vB - g.vA) * t };
    }
    function tick(dt) {
      if (path && tr.playing) {
        if (tr.pause > 0) { tr.pause -= dt; if (tr.pause <= 0 && tr.done) restart(); }
        else {
          let s = tr.s + 5.5 * dt;
          const next = comps()[tr.visited];
          if (next && s >= next.s0 + next.len / 2) { s = next.s0 + next.len / 2; tr.visited++; tr.pause = 1.5; updateLedger(); }
          else if (!next && s >= path.total) { s = path.total; tr.done = true; tr.pause = 2.8; updateLedger(); }
          tr.s = s;
        }
      }
      drawProfile();
    }

    function drawOverlay(ctx, sc) {
      if (!path) return;
      const u = sc.unit;
      // seçili çevre: yarı saydam bakır şerit
      ctx.strokeStyle = rgba(C.copper, 0.22); ctx.lineWidth = Math.max(6, 0.7 * u); ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath();
      path.segs.forEach((g, i) => { const A = sc.screenOf(g.A), B = sc.screenOf(g.B); if (!i) ctx.moveTo(...A); ctx.lineTo(...B); });
      ctx.stroke();
      // ziyaret edilen parçaların etiketleri
      ctx.font = `700 ${Math.max(10, 0.56 * u)}px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      comps().forEach((g, k) => {
        if (k >= tr.visited) return;
        const p = sc.part(g.part.p), off = def.tags[g.part.p] || [0, 1.4];
        const [x, y] = sc.screenOf([p.at[0] + off[0], p.at[1] + off[1]]);
        const txt = sgn(g.vB - g.vA, "V"), w = ctx.measureText(txt).width + 12, hh = Math.max(16, 0.9 * u);
        const cur = k === tr.visited - 1 && tr.pause > 0 && !tr.done;
        ctx.fillStyle = "#b7c3a0"; ctx.strokeStyle = cur ? C.copper2 : "#2a2f26"; ctx.lineWidth = cur ? 2.5 : 2;
        ctx.beginPath(); ctx.roundRect(x - w / 2, y - hh / 2, w, hh, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#17200f"; ctx.fillText(txt, x, y + 1);
      });
      // gezgin
      const { p } = posAt(tr.s);
      const [x, y] = sc.screenOf(p), r = Math.max(6, 0.42 * u);
      ctx.fillStyle = rgba(C.copper2, 0.25); ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.silk; ctx.strokeStyle = C.copper; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    let ps;
    function drawProfile() {
      if (!ps || !ps.w || !path) return;
      const { ctx, w, h: H } = ps;
      ctx.clearRect(0, 0, w, H);
      const l = 46, r = 14, t = 30, b = 30, gw = w - l - r, gh = H - t - b;
      let lo = 0, hi = 1;
      path.segs.forEach((g) => { lo = Math.min(lo, g.vA, g.vB); hi = Math.max(hi, g.vA, g.vB); });
      hi = Math.ceil(hi + 0.5); lo = Math.floor(lo);
      const X = (s) => l + (s / path.total) * gw, Y = (v) => t + gh - ((v - lo) / (hi - lo)) * gh;
      ctx.strokeStyle = rgba(C.silk, 0.1); ctx.lineWidth = 1; ctx.beginPath();
      const stepV = hi - lo > 8 ? 3 : hi - lo > 4 ? 2 : 1;
      for (let v = lo; v <= hi; v += stepV) { ctx.moveTo(l, Y(v)); ctx.lineTo(l + gw, Y(v)); }
      ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `500 11px ${FONT.mono}`; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let v = lo; v <= hi; v += stepV) ctx.fillText(v + " V", l - 6, Y(v));
      // parçalar x ekseninde
      ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.font = `600 11px ${FONT.display}`;
      comps().forEach((g, k) => {
        ctx.fillStyle = rgba(C.silk, 0.05); ctx.fillRect(X(g.s0), t, X(g.s0 + g.len) - X(g.s0), gh);
        ctx.fillStyle = k < tr.visited ? C.silk : C.muted; ctx.fillText(g.part.p, X(g.s0 + g.len / 2), t + gh + 6);
      });
      // başlangıç seviyesi
      const v0 = path.segs[0].vA;
      ctx.strokeStyle = rgba(C.copper2, 0.5); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(l, Y(v0)); ctx.lineTo(l + gw, Y(v0)); ctx.stroke(); ctx.setLineDash([]);
      const prof = (upto, col, wd) => {
        ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.lineJoin = "round"; ctx.beginPath();
        ctx.moveTo(X(0), Y(v0));
        for (const g of path.segs) {
          if (g.s0 >= upto) break;
          const e = Math.min(upto, g.s0 + g.len), tt = (e - g.s0) / g.len;
          ctx.lineTo(X(g.s0), Y(g.vA)); ctx.lineTo(X(e), Y(g.vA + (g.vB - g.vA) * tt));
        }
        ctx.stroke();
      };
      prof(path.total, rgba(C.silk, 0.22), 2);
      prof(tr.s, C.copper2, 3);
      const { v } = posAt(tr.s);
      ctx.fillStyle = C.silk; ctx.strokeStyle = C.copper; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(X(tr.s), Y(v), 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.silk; ctx.font = `600 12px ${FONT.mono}`; ctx.textAlign = X(tr.s) > l + gw - 70 ? "right" : "left"; ctx.textBaseline = "bottom";
      ctx.fillText(fmt(v, "V"), X(tr.s) + (ctx.textAlign === "left" ? 9 : -9), Y(v) - 6);
    }
    ps = canvas(pcv, drawProfile);

    function updateLedger() {
      if (!path) return;
      let sum = 0;
      const rows = comps().map((g, k) => {
        const d = g.vB - g.vA, seen = k < tr.visited;
        if (seen) sum += d;
        const cur = k === tr.visited - 1 && !tr.done;
        return `<tr class="${seen ? "seen" : ""}${cur ? " cur" : ""}"><td><b>${g.part.p}</b></td><td>${seen ? (Math.abs(d) < 5e-4 ? "" : d > 0 ? T.rise : T.drop) : ""}</td><td class="mono">${seen ? sgn(d, "V") : "…"}</td></tr>`;
      });
      if (Math.abs(sum) < 1e-9) sum = 0;
      ledger.innerHTML = `<div class="c3-cap">${T.ledger}</div><table class="c3-tab">${rows.join("")}
        <tr class="tot"><td><b>${T.total}</b></td><td></td><td class="mono"><b>${sgn(sum, "V")}</b></td></tr></table>
        <p class="c3-note ${tr.done ? "ok" : ""}">${tr.done ? T.back : ""}</p>`;
    }
    sch.on("change", () => { if (path) { refreshV(); updateLedger(); } });

    const ls = seg(T.loops, loopKey, (k) => { loopKey = k; buildPath(); restart(); }, "Çevre");
    const s1 = slider({ label: T.v1, min: 0, max: 12, step: 0.1, value: 9, fmt: (v) => fmt(v, "V"), oninput: (v) => sch.set("V1", "V", v) });
    const s2 = slider({ label: T.v2, min: 0, max: 12, step: 0.1, value: 3, fmt: (v) => fmt(v, "V"), oninput: (v) => sch.set("V2", "V", v) });
    const s3 = slider({ label: T.r2, min: 100, max: 10000, step: 1, log: true, value: 2200, fmt: (v) => fmt(v, "Ω"), oninput: (v) => sch.set("R2", "R", v) });
    const pb = btn(tr.playing ? T.pause : T.play, () => { tr.playing = !tr.playing; pb.textContent = tr.playing ? T.pause : T.play; });
    const rb = btn(T.restart, () => { restart(); });
    stage.append(h("div.controls", ls, s1, s2, s3, pb, rb));
    buildPath();
    updateLedger();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["kvl"] = [{ click: "=Sağ çevre" }, { wait: 2500 }, { slide: "label:V2", to: 8 }, { wait: 1500 }, { click: "=Dış çevre" }];

  /* ================= 3.5 Multimetre ================= */
  // ölçü aleti: a = kırmızı prob, b = siyah prob (COM). Kademeye göre iç yapısı değişir.
  Schematic.PARTS.c3meter = {
    hide: 0.9, pins: { a: [-2, 0], b: [2, 0] }, box: [-1.1, -1, 1.1, 1],
    paths: [{ term: 0, pts: [[-2, 0], [0, 0]] }, { term: 1, pts: [[2, 0], [0, 0]] }],
    el(p, n) {
      const ab = [n("a"), n("b")];
      if (p.mode === "V") return [{ type: "R", id: p.id, n: ab, R: 1e7 }];      // voltmetre: 10 MΩ
      if (p.mode === "A") return [{ type: "V", id: p.id, n: ab, V: 0 }];        // ampermetre: ~0 Ω
      if (p.mode === "R") return [{ type: "I", id: p.id, n: ab, I: -1e-3 }];    // ohmmetre: kırmızı uçtan 1 mA verir
      return [{ type: "R", id: p.id, n: ab, R: 1e12 }];
    },
    draw(g, p) {
      g.lead([-2, 0], [-0.9, 0], "a"); g.lead([0.9, 0], [2, 0], "b");
      g.circle(0, 0, 0.9, { stroke: C.silk, fill: C.mask3 });
      g.text({ V: "V", A: "A", R: "Ω" }[p.mode] || "–", [0, 0.04], { size: 0.95, color: C.silk, weight: 800 });
      g.circle(-1.5, 0, 0.22, { fill: C.v1 });
      g.circle(1.5, 0, 0.22, { fill: "#111511", stroke: C.silk2, width: 1.2 });
    },
  };

  // sigortanın yerini tutan düz prob kablosu (A dışındaki kademelerde). Kimliği hep "F1" kalır:
  // schematic.js'nin duman efekti, yanmış parçayı yeniden kurulumdan sonra da kimliğiyle arıyor.
  Schematic.PARTS.c3lead = {
    hide: 0, pins: { a: [-2, 0], b: [2, 0] }, box: [-0.05, -0.05, 0.05, 0.05],
    paths: [{ term: 0, pts: [[-2, 0], [0, 0]] }, { term: 1, pts: [[2, 0], [0, 0]] }],
    el: (p, n) => [{ type: "R", id: p.id, n: [n("a"), n("b")], R: 1e-3 }],
    draw(g) { g.lead([-2, 0], [0, 0], "a"); g.lead([0, 0], [2, 0], "b"); },
  };

  Demos.c3multimetre = function (stage) {
    const T = S.mm;
    const B = CIRCUITS.c3multimetre;
    let place = "R1", mode = "V", power = true, blown = false;

    const top = h("div.pane");
    // çizilmiş multimetre
    const dig = h("b.c3-dig", "0,00"), unit = h("span.c3-unit", "V"), ann = h("span.c3-ann", "");
    const lcd = h("div.c3-lcd", ann, h("div.c3-read", dig, unit));
    const knob = h("div.c3-knob", h("i"));
    const dial = h("div.c3-dial", knob);
    const ANG = { off: -66, V: -22, A: 22, R: 66 };
    const modeBtns = {};
    T.modes.forEach(([k, lab, aria]) => {
      const a = (ANG[k] * Math.PI) / 180;
      const b = h("button.c3-mode", { type: "button", "aria-label": aria, style: { left: `calc(50% + ${Math.sin(a) * 62}px)`, top: `calc(60% - ${Math.cos(a) * 58}px)` }, onclick: () => setMode(k) }, lab);
      modeBtns[k] = b; dial.append(b);
    });
    const jA = h("span.c3-jack", h("i"), "mA"), jC = h("span.c3-jack.com", h("i"), "COM"), jV = h("span.c3-jack", h("i"), "VΩ");
    const fuseTag = h("span.c3-fusetag");
    const dmm = h("div.c3-dmm", { role: "group", "aria-label": "Multimetre" },
      h("div.c3-dmm-face", lcd, dial, h("div.c3-jacks", jA, jC, jV, fuseTag)));
    const msg = h("p.flag.c3-msg");
    stage.append(h("div.split.c3-mm-split", top, h("div.c3-mm-bottom", dmm, msg)));

    function makeDef() {
      const P = B.placements[place];
      const parts = clone(B.parts), wires = clone(B.wires);
      if (P.cut != null) wires.splice(P.cut, 1);
      parts.find((p) => p.id === "S1").closed = power;
      parts.push({ id: "M", type: "c3meter", at: P.meter.at, rot: P.meter.rot || 0, mode, label: false });
      if (mode === "A") parts.push({ id: "F1", type: "fuse", at: P.fuse.at, rot: P.fuse.rot || 0, rating: B.fuseRating, burnt: blown, label: "F1 " + fmt(B.fuseRating, "A"), lp: P.fuse.rot ? [-2.4, 0] : [0, -1.1] });
      // sigorta yalnızca mA girişinde; diğer kademelerde prob kablosu düz devam eder
      else parts.push({ id: "F1", type: "c3lead", at: P.fuse.at, rot: P.fuse.rot || 0, label: false });
      wires.push(...clone(P.wires));
      return { parts, wires };
    }
    const def = { ...clone(B), placements: undefined, ...makeDef() };
    const sch = Schematic(top, def, { maxUnit: 24 });
    const rebuild = () => sch.rebuild(makeDef());

    function lcdText(v, u) {
      const a = Math.abs(v);
      let n, un;
      if (u === "V") [n, un] = a >= 1 ? [v.toFixed(2), "V"] : [(v * 1e3).toFixed(1), "mV"];
      else if (u === "A") [n, un] = a >= 1 ? [v.toFixed(2), "A"] : a >= 1e-3 ? [(v * 1e3).toFixed(1), "mA"] : [(v * 1e6).toFixed(1), "µA"];
      else [n, un] = a >= 1e6 ? [(v / 1e6).toFixed(2), "MΩ"] : a >= 1e3 ? [(v / 1e3).toFixed(2), "kΩ"] : [v.toFixed(1), "Ω"];
      n = n.replace(".", ",").replace("-", "−");
      if (/^−0,0+$/.test(n)) n = n.slice(1);
      return [n, un];
    }
    function update() {
      const sw = sch.part("S1");
      if (sw && sw.closed !== power) power = sw.closed;
      const par = place !== "seri";
      let text = "", u = "", ok = false, m;
      if (mode === "off") { m = T.msg.off; ok = true; }
      else if (mode === "V") {
        [text, u] = lcdText(sch.sim.vAcross("M"), "V");
        if (par) { m = T.msg.vOk; ok = true; } else m = T.msg.vSeri.replace("{I}", fmt(Math.abs(sch.sim.i("R1")), "A"));
      } else if (mode === "A") {
        [text, u] = lcdText(blown ? 0 : sch.sim.i("M"), "A");
        if (blown) m = par ? T.msg.aBlown : T.msg.aDead;
        else if (par) m = T.msg.aShort;
        else { m = T.msg.aOk; ok = true; }
      } else {
        const r = sch.sim.vAcross("M") / 1e-3;
        if (r > 4e7 || r < 0) { text = "OL"; u = r < 0 ? "Ω" : "MΩ"; } else [text, u] = lcdText(r, "Ω");
        if (place === "B1") m = T.msg.rBat;
        else if (!par) m = power ? T.msg.rSeriOn : T.msg.rSeri;
        else if (power) m = T.msg.rPower;
        else { m = T.msg.rOk; ok = true; }
      }
      dig.textContent = mode === "off" ? "" : text;
      unit.textContent = mode === "off" ? "" : u;
      ann.textContent = T.ann[mode];
      lcd.classList.toggle("off", mode === "off");
      msg.textContent = m;
      msg.classList.toggle("ok", ok);
      knob.style.transform = `rotate(${ANG[mode]}deg)`;
      Object.entries(modeBtns).forEach(([k, b]) => { b.classList.toggle("on", k === mode); b.setAttribute("aria-pressed", k === mode); });
      jA.classList.toggle("plug", mode === "A"); jV.classList.toggle("plug", mode === "V" || mode === "R"); jC.classList.toggle("plug", mode !== "off");
      fuseTag.textContent = blown ? T.blownTag : T.fuseTag + " " + fmt(B.fuseRating, "A");
      fuseTag.classList.toggle("blown", blown);
      powB.textContent = power ? T.powerOff : T.powerOn;
      fuseB.hidden = !blown;
    }
    sch.on("burn", (p) => { if (p.id === "F1") blown = true; });
    sch.on("change", update);
    function setMode(k) { mode = k; rebuild(); }

    const ps = seg(T.places, place, (k) => { place = k; rebuild(); }, T.probes);
    ps.classList.add("c3-wrapseg");
    const powB = btn(T.powerOff, () => { power = !power; sch.set("S1", "closed", power); });
    // sigorta değişirken alet kapatılır: kısa devre duruyorsa yenisi de hemen atardı
    const fuseB = btn(T.fuse, () => { blown = false; mode = "off"; rebuild(); }, "primary");
    stage.append(h("div.controls", h("span.c3-lab", T.probes), ps, powB, fuseB));
    update();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["multimetre"] = [{ click: "aria:Kademe: Akım (mA)" }, { wait: 600 }, { click: "=Devreyi açıp araya" }, { wait: 1400 }, { click: "=R1'in iki ucu" }];
  GUIDE_TARGETS["multimetre"] = "aria:Kademe: Akım (mA)";
})();
