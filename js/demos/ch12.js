/* 12. bölüm deneyleri: kombinasyonel devreler
   Yarım/tam toplayıcı, 4 bitlik dalgalı elde toplayıcı (kapı gecikmeli), çoklayıcı ve kod çözücü. */
window.STR = window.STR || {};

(function () {
  const { C, FONT, h, slider, seg, btn, canvas, num, rgba, clamp } = L;
  const S = STR.ch12;
  const clone = (d) => JSON.parse(JSON.stringify(d));
  window.GUIDES = window.GUIDES || {};
  const G = window.GUIDES;
  window.GUIDE_TARGETS = window.GUIDE_TARGETS || {};

  /* ---------------- özel parçalar ---------------- */
  // yazı (üst çizgi destekli): mantık ağına katılmaz
  Schematic.PARTS.c12lab = {
    pins: {}, paths: [], box: [-0.5, -0.5, 0.5, 0.5],
    draw(g, p) {
      const color = p.color === "copper" ? C.copper2 : p.muted ? C.muted : C.silk;
      g.text(p.text, [0, 0], { size: p.size || 0.6, color, align: p.align || "center", weight: 700, overline: !!p.ov });
    },
  };
  // tam toplayıcı bloğu: içinde Logic.build.fullAdder ile kurulan 5 kapı (2 XOR, 2 AND, 1 OR), her biri p.delay gecikmeli
  Schematic.PARTS.c12fa = {
    logic: true,
    pins: { a: [-1.5, -3], b: [1.5, -3], cin: [3, 0], cout: [-3, 0], s: [0, 3] },
    box: [-3, -3, 3, 3],
    logicEl(p, n, net) { Logic.build.fullAdder(net, n("a"), n("b"), n("cin"), n("s"), n("cout"), p.id + ":", { delay: p.delay ?? 1 }); },
    draw(g, p) {
      g.lead([-1.5, -3], [-1.5, -2], "a"); g.lead([1.5, -3], [1.5, -2], "b");
      g.lead([3, 0], [2, 0], "cin"); g.lead([-3, 0], [-2, 0], "cout"); g.lead([0, 3], [0, 2], "s");
      g.rect(-2, -2, 4, 4, { fill: C.mask2, stroke: C.silk });
      g.text(p.title || "TT", [0, 0.1], { size: 0.72, color: C.silk, weight: 750 });
      const o = { size: 0.42, color: C.silk2, weight: 650 };
      g.text("A", [-1.5, -1.5], o); g.text("B", [1.5, -1.5], o);
      g.text("S", [0, 1.5], o);
    },
  };
  // bellek hücresi: kelime hattı (en) 1 olunca seçilir ve içeriği okunur
  Schematic.PARTS.c12cell = {
    logic: true, pins: { en: [-3, 0] }, box: [-3, -1.5, 7, 1.5],
    logicEl() {},
    draw(g, p, st) {
      const on = st.logicVal(p, "en") === 1;
      g.lead([-3, 0], [-2, 0], "en");
      if (on) g.glow(2.5, 0, 5, { color: C.copper2, a: 0.55 });
      g.rect(-2, -1.3, 9, 2.6, { fill: on ? rgba(C.copper, 0.3) : C.mask2, stroke: on ? C.copper2 : rgba(C.silk, 0.55) });
      const ab = (p.addr >> 1) + "" + (p.addr & 1);
      g.text(ab, [-1.6, 0], { size: 0.5, color: on ? C.copper2 : C.muted, align: "left", font: "mono", weight: 700 });
      g.text(p.byte.toString(2).padStart(8, "0"), [2.85, 0], { size: 0.58, color: on ? C.silk : C.silk2, font: "mono", weight: on ? 750 : 500 });
      g.text(String.fromCharCode(p.byte), [6.45, 0], { size: 0.8, color: on ? C.copper2 : C.muted, weight: 800 });
    },
  };

  /* Bir devre tanımını verilen girişlerle (ayrı bir Logic ağında) çöz: doğruluk tabloları için.
     Şema bileşeninin kullandığı netlist çıkarımı ve parça mantığı aynen kullanılır. */
  function solver(def) {
    const X = Schematic.extract(def);
    return function (inVals) {
      const net = Logic.network();
      X.parts.forEach((p) => {
        const d = Schematic.PARTS[p.type];
        if (!d.logicEl) return;
        const q = p.type === "input" && p.id in inVals ? { ...p, value: inVals[p.id] } : p;
        d.logicEl(q, (pin) => X.pinNet[p.id + "." + pin], net);
      });
      net.settle(200);
      return (id, pin) => net.value(X.pinNet[id + "." + pin]);
    };
  }
  const bitTd = (v) => h("td", { class: v === 1 ? "b1" : v === 0 ? "b0" : "" }, v === 1 || v === 0 ? String(v) : "?");
  const bitSpan = (v, cls = "") => h("span.c12-bit" + (cls ? "." + cls : "") + (v === 1 ? ".b1" : v === 0 ? ".b0" : ".bx"), v === 1 || v === 0 ? String(v) : "·");
  function meter(label) {
    const b = h("b", "—"), unit = h("span.c12-unit");
    const el = h("div.meter", h("small", label), h("div", b, unit));
    el.set = (t, u = "") => { b.textContent = t; unit.textContent = u; };
    return el;
  }
  function toggleBtn(sch, id) {
    const b = btn(id, () => sch.set(id, "value", sch.part(id).value ? 0 : 1));
    b.classList.add("c12-tog");
    b.upd = () => { const v = sch.part(id).value ? 1 : 0; b.textContent = `${id} = ${v}`; b.classList.toggle("on", !!v); };
    return b;
  }

  /* =========================================================
     1) Yarım ve tam toplayıcı
     ========================================================= */
  Demos.c12Adder = function (stage) {
    const pane = h("div.pane.c12-sch");
    const layH = h("div.c12-layer"), layF = h("div.c12-layer");
    pane.append(layH, layF);
    const tbl = h("table.truth.c12-tt");
    const hand = h("div.c12-hand");
    const handNote = h("p.c12-note");
    const bottom = h("div.c12-bottom",
      h("div.c12-panel", h("span.c12-ptitle", S.tt), tbl),
      h("div.c12-panel", h("span.c12-ptitle", S.hand), hand, handNote));
    stage.append(h("div.split.c12-s1", pane, bottom));

    const defH = clone(CIRCUITS.c12Half), defF = clone(CIRCUITS.c12Full);
    const schH = Schematic(layH, defH, { maxUnit: 30 });
    const schF = Schematic(layF, defF, {
      maxUnit: 30,
      overlay(ctx, s) {
        // iki yarım toplayıcıyı kesikli çerçeveyle göster
        ctx.save();
        ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(C.gold, 0.55);
        ctx.font = `600 ${Math.max(10, 0.5 * s.unit)}px ${FONT.display}`; ctx.fillStyle = rgba(C.gold, 0.85);
        ctx.textAlign = "left"; ctx.textBaseline = "bottom";
        s.def.halves.forEach(([x0, y0, x1, y1], k) => {
          const [ax, ay] = s.screenOf([x0, y0]), [bx, by] = s.screenOf([x1, y1]);
          ctx.beginPath(); ctx.roundRect(ax, ay, bx - ax, by - ay, 6); ctx.stroke();
          ctx.fillText(`${S.halfBox} ${k + 1}`, ax + 4, ay - 3);
        });
        ctx.restore();
      },
    });
    const solveH = solver(defH), solveF = solver(defF);
    // doğruluk tabloları: devrenin kendisi her giriş birleşimi için çözülür
    const rowsH = [0, 1, 2, 3].map((m) => {
      const env = { A: m >> 1, B: m & 1 }, r = solveH(env);
      return { env, cout: r("Cout", "i"), s: r("S", "i") };
    });
    const rowsF = [0, 1, 2, 3, 4, 5, 6, 7].map((m) => {
      const env = { A: (m >> 2) & 1, B: (m >> 1) & 1, Cin: m & 1 }, r = solveF(env);
      return { env, cout: r("Cout", "i"), s: r("S", "i") };
    });

    let mode = "half";
    const bA = toggleBtn(schH, "A"), bB = toggleBtn(schH, "B");
    const fA = toggleBtn(schF, "A"), fB = toggleBtn(schF, "B"), fC = toggleBtn(schF, "Cin");
    const sg = seg([["half", S.half], ["full", S.full]], mode, (k) => setMode(k), S.mode);
    const halfBtns = h("div.c12-btns", bA, bB), fullBtns = h("div.c12-btns", fA, fB, fC);
    stage.append(h("div.controls", sg, halfBtns, fullBtns));

    let trs = [];
    function buildTable() {
      const full = mode === "full";
      const rows = full ? rowsF : rowsH;
      const ins = full ? ["A", "B", "Cin"] : ["A", "B"];
      trs = rows.map((r) => h("tr", ins.map((k) => bitTd(r.env[k])), h("td.c12-sep", ""), bitTd(r.cout), bitTd(r.s), h("td.c12-dec", String(2 * r.cout + r.s))));
      tbl.replaceChildren(
        h("thead", h("tr", ins.map((k) => h("th", k)), h("th.c12-sep", ""), h("th", "Cout"), h("th", "S"), h("th", S.dec))),
        h("tbody", trs));
      tbl.classList.toggle("c12-tt8", full);
    }
    function setMode(k) {
      mode = k;
      layH.style.display = k === "half" ? "" : "none";
      layF.style.display = k === "full" ? "" : "none";
      halfBtns.style.display = k === "half" ? "" : "none";
      fullBtns.style.display = k === "full" ? "" : "none";
      buildTable(); update();
    }
    function update() {
      const full = mode === "full", sch = full ? schF : schH;
      const a = sch.part("A").value ? 1 : 0, b = sch.part("B").value ? 1 : 0, ci = full ? (sch.part("Cin").value ? 1 : 0) : 0;
      // çıkışlar şemanın mantık ağından okunur
      const s = sch.v(sch.netOf("S", "i")), co = sch.v(sch.netOf("Cout", "i"));
      [bA, bB, fA, fB, fC].forEach((x) => x.upd());
      const idx = full ? (a << 2) | (b << 1) | ci : (a << 1) | b;
      trs.forEach((tr, i) => tr.classList.toggle("cur", i === idx));
      // elle toplama: işaret | 2'ler | 1'ler
      const cell = (t, cls = "") => h("span.c12-hc" + (cls ? "." + cls : ""), t);
      hand.replaceChildren(
        cell(""), cell(""), full ? h("span.c12-hc.c12-carry", bitSpan(ci), h("small", "Cin")) : cell(""), cell("", "c12-hl"),
        cell(""), cell(""), cell(bitSpan(a)), cell("A", "c12-hl"),
        cell("+", "c12-plus"), cell(""), cell(bitSpan(b)), cell("B", "c12-hl"),
        h("span.c12-rule"),
        cell(""), h("span.c12-hc.c12-res", bitSpan(co), h("small", "Cout")), h("span.c12-hc.c12-res", bitSpan(s), h("small", "S")), cell("", "c12-hl"),
      );
      const dec = 2 * co + s;
      const lhs = full ? `${a} + ${b} + ${ci}` : `${a} + ${b}`;
      handNote.replaceChildren(
        h("b", `${lhs} = ${dec}`), ` (${S.binary}: ${co}${s})`, h("br"), S.write(s, co));
    }
    schH.on("change", update); schF.on("change", update);
    setMode("half");
    return {
      enter() { schH.start(); schF.start(); },
      leave() { schH.stop(); schF.stop(); },
      schH, schF,
    };
  };
  G["tam-toplayici"] = [{ click: "=B" }, { wait: 1000 }, { click: "=B" }, { wait: 800 }, { click: "=" + S.full }, { wait: 1000 }, { click: "aria:Cin" }];

  /* =========================================================
     2) 4 bitlik dalgalı elde toplayıcı: kapı gecikmeleriyle elde dalgası
     ========================================================= */
  Demos.c12Ripple = function (stage) {
    const pane = h("div.pane.c12-sch");
    const laPane = h("div.pane.c12-la", h("span.pane-title", S.la));
    const sumGrid = h("div.c12-sum");
    const status = h("span.c12-status");
    const flag = h("span.flag.c12-flag");
    const mSettle = meter(S.mSettle), mMax = meter(S.mMax);
    const seqEl = h("p.c12-seq"), glEl = h("span.chip.c12-gl");
    const side = h("div.c12-side",
      h("div.c12-panel", sumGrid, h("div.c12-strow", status, flag)),
      h("div.meters", mSettle, mMax),
      h("div.c12-panel", h("div.c12-seqhead", h("span.c12-ptitle", S.seq), glEl), seqEl));
    stage.append(h("div.split.c12-s2", pane, h("div.c12-row2", laPane, side)));

    const def = clone(CIRCUITS.c12Rca);
    def.animate = true; def.rate = 2.5;
    let t0 = 0, maxSettle = 0;
    const sch = Schematic(pane, def, {
      maxUnit: 26,
      overlay(ctx, s) {
        // son bir kapı gecikmesi içinde içinde olay olan blokları bakır parıltıyla göster
        const now = s.net.time;
        for (let i = 0; i < 4; i++) {
          const id = "FA" + i;
          let tl = -1e9;
          [id + ":x1", id + ":a1", id + ":a2", s.netOf(id, "s"), s.netOf(id, "cout")].forEach((n) => {
            const hh = s.net.history(n); if (hh && hh.length) tl = Math.max(tl, hh[hh.length - 1][0]);
          });
          const a = tl > t0 ? clamp(1 - (now - tl) / 1.5, 0, 1) : 0;
          if (a <= 0) continue;
          const [x, y] = s.screenOf(s.part(id).at), u = s.unit;
          ctx.save();
          ctx.strokeStyle = rgba(C.copper2, 0.9 * a); ctx.lineWidth = 3;
          ctx.shadowColor = C.copper2; ctx.shadowBlur = 16 * a;
          ctx.beginPath(); ctx.roundRect(x - 2.35 * u, y - 2.35 * u, 4.7 * u, 4.7 * u, 6); ctx.stroke();
          ctx.restore();
        }
      },
    });
    const net = () => sch.net;
    const tBase = sch.net.time; // ilk kurulumun oturduğu an
    const nS = [0, 1, 2, 3].map((i) => sch.netOf("FA" + i, "s"));
    const nC = [1, 2, 3, 4].map((i) => sch.netOf("FA" + (i - 1), "cout"));
    const nIn = ["A0", "A1", "A2", "A3", "B0", "B1", "B2", "B3", "C0"].map((id) => sch.netOf(id, "o"));
    const outs = [...nS, nC[3]];
    const watch = [...nS, ...nC];

    // lojik analizör: tetiklemeli görünüm (giriş değişimi pencerenin başına yakın sabitlenir)
    const W = 22, PRE = 2;
    const la = LogicAnalyzer(laPane, {
      signals: [
        ...nC.map((n, i) => ({ name: n, label: "C" + (i + 1) })),
        ...nS.map((n, i) => ({ name: n, label: "S" + i })),
      ],
      window: W, grid: 1, labelWidth: 38, rowH: 30,
      overlay(ctx, g) {
        const now = net().time;
        const yb = g.top + g.rowH * 8;
        // henüz yaşanmamış zaman: karart
        if (now < g.tEnd) {
          const x = g.toX(now);
          ctx.fillStyle = "rgba(6,21,15,0.94)"; ctx.fillRect(x, 0, g.w - x, yb + 2);
          ctx.strokeStyle = rgba(C.copper2, 0.8); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x, g.top); ctx.lineTo(x, yb); ctx.stroke();
        }
        ctx.font = `600 10.5px ${FONT.mono}`; ctx.textBaseline = "top";
        const x0 = g.toX(t0);
        ctx.strokeStyle = rgba(C.silk, 0.6); ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, g.top); ctx.lineTo(x0, yb + 4); ctx.stroke(); ctx.setLineDash([]);
        const ym = yb + 10;
        ctx.textBaseline = "middle";
        ctx.fillStyle = C.silk2; ctx.textAlign = "right"; ctx.fillText(S.input, x0 - 4, ym);
        if (state.settled && state.settle > 0) {
          const x1 = g.toX(t0 + state.settle);
          ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x1, g.top); ctx.lineTo(x1, ym); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x0, ym); ctx.lineTo(x1, ym); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x0 + 6, ym - 3); ctx.lineTo(x0, ym); ctx.lineTo(x0 + 6, ym + 3); ctx.moveTo(x1 - 6, ym - 3); ctx.lineTo(x1, ym); ctx.lineTo(x1 - 6, ym + 3); ctx.stroke();
          ctx.fillStyle = C.gold; ctx.textAlign = "left";
          const t = S.settleLab(state.settle), tw = ctx.measureText(t).width;
          ctx.fillText(t, Math.min(x1 + 6, g.w - tw - 4), ym);
        }
      },
    });
    const src = { history: (n) => net().history(n) };

    const state = { settled: true, settle: 0 };
    const val = (n) => net().value(n);
    // t anındaki değer (geçmişten)
    function at(n, t) { const hh = net().history(n); let v = hh[0][1]; for (const [tt, vv] of hh) { if (tt <= t) v = vv; else break; } return v; }
    const word = (vals) => vals.reduce((acc, v, i) => acc + (v === 1 ? 1 << i : 0), 0);
    const known = (vals) => vals.every((v) => v === 0 || v === 1);

    function analyse() {
      const N = net();
      // tetik: girişlerin son değiştiği an
      let tin = 0;
      nIn.forEach((n) => { const hh = N.history(n); tin = Math.max(tin, hh[hh.length - 1][0]); });
      tin = Math.max(tin, tBase);
      if (tin !== t0) { t0 = tin; }
      let last = t0, glitch = 0;
      const times = new Set();
      watch.forEach((n) => {
        const hh = N.history(n);
        let cnt = 0;
        for (const [t] of hh) if (t > t0) { cnt++; times.add(t); last = Math.max(last, t); }
        const changed = at(n, t0) !== N.value(n) ? 1 : 0;
        glitch += Math.max(0, cnt - changed);
      });
      state.settled = N.pending() === 0;
      state.settle = last - t0;
      state.glitch = glitch;
      // çıkıştaki 5 bitlik değerin zaman içindeki dizisi
      const ts = [t0, ...[...times].sort((a, b) => a - b)];
      const seqv = [];
      ts.forEach((t) => { const vs = outs.map((n) => at(n, t)); const w = known(vs) ? word(vs) : null; if (seqv[seqv.length - 1] !== w) seqv.push(w); });
      state.seq = seqv;
      if (state.settled) maxSettle = Math.max(maxSettle, state.settle);
    }

    let lastSeqKey = "", lastGrid = "";
    function update() {
      analyse();
      const N = net();
      const a = [0, 1, 2, 3].map((i) => (sch.part("A" + i).value ? 1 : 0));
      const b = [0, 1, 2, 3].map((i) => (sch.part("B" + i).value ? 1 : 0));
      const c0 = sch.part("C0").value ? 1 : 0;
      const s = nS.map(val), c = nC.map(val);
      const res = [...s, c[3]];
      const A = word(a), B = word(b), R = known(res) ? word(res) : null;
      // elle toplama düzeni: etiket | işaret | bit4 bit3 bit2 bit1 bit0 | onluk
      const gkey = [a, b, c0, s, c, state.settled].join("|");
      if (gkey !== lastGrid) {
      lastGrid = gkey;
      const cell = (x, cls = "") => h("span" + (cls ? "." + cls : ""), x);
      const rowBits = (arr, lead = []) => [...lead, ...arr.slice().reverse().map((v) => cell(bitSpan(v)))];
      sumGrid.replaceChildren(
        cell(S.colCarry, "c12-sl"), cell(""), ...[c[3], c[2], c[1], c[0], c0].map((v) => cell(bitSpan(v, "sm"), "c12-cy")), cell(""),
        cell(S.colA, "c12-sl"), cell(""), cell(""), ...rowBits(a), cell("= " + A, "c12-sd"),
        cell(S.colB, "c12-sl"), cell("+", "c12-plus"), cell(""), ...rowBits(b), cell("= " + B, "c12-sd"),
        cell(""), h("span.c12-rule2"), cell(""),
        cell(S.colSum, "c12-sl"), cell(""), ...rowBits(res), cell("= " + (R == null ? "?" : R), "c12-sd.c12-sdR"),
      );
      sumGrid.classList.toggle("busy", !state.settled);
      }
      if (state.settled && t0 === tBase) {
        status.textContent = S.settled;
        status.className = "c12-status ok";
      } else if (state.settled) {
        const good = R === A + B + c0;
        status.textContent = `${S.settled} · ${S.gd(state.settle)}` + (good ? ` · ${S.ok}` : "");
        status.className = "c12-status ok";
      } else {
        status.textContent = `${S.busy} t = ${num(N.time - t0, 1)}`;
        status.className = "c12-status busy";
      }
      flag.textContent = state.settled && c[3] === 1 ? S.overflow : "";
      const fresh = t0 === tBase;
      mSettle.set(fresh ? "—" : state.settled ? num(state.settle, 0) : "…", state.settled && !fresh ? S.gdUnit : "");
      mMax.set(maxSettle ? num(maxSettle, 0) : "—", maxSettle ? S.gdUnit : "");
      glEl.textContent = `${S.mGlitch}: ${state.glitch}`;
      glEl.classList.toggle("hot", state.glitch > 0);
      const key = state.seq.join(",");
      if (key !== lastSeqKey) {
        lastSeqKey = key;
        const sq = state.seq.slice(-9);
        seqEl.replaceChildren(...sq.flatMap((v, i) => [
          i ? h("span.c12-arr", "→") : null,
          h("span" + (i === sq.length - 1 ? ".c12-fin" : i === 0 ? ".c12-ini" : ".c12-mid"), v == null ? "?" : String(v)),
        ]).filter(Boolean));
      }
      la.show(src, t0 - PRE + W);
    }
    sch.on("change", update);

    // giriş sayıları: aynı anda birden çok bit değişebilir (gerçek bir giriş değişimi gibi)
    function setNum(name, v) {
      for (let i = 0; i < 4; i++) { const bit = (v >> i) & 1; if ((sch.part(name + i).value ? 1 : 0) !== bit) sch.set(name + i, "value", bit); }
    }
    const getNum = (name) => [0, 1, 2, 3].reduce((acc, i) => acc + (sch.part(name + i).value ? 1 << i : 0), 0);
    let tm = 0;
    function worst() {
      clearTimeout(tm);
      setNum("A", 15); setNum("B", 0);
      if (sch.part("C0").value) sch.set("C0", "value", 0);
      net().run(net().time + 30); // önce bu durumda otursun
      update();
      tm = setTimeout(() => sch.set("B0", "value", 1), 450);
    }
    const rnd = L.rng(12);
    function random() { clearTimeout(tm); setNum("A", Math.floor(rnd() * 16)); setNum("B", Math.floor(rnd() * 16)); }
    const step = (name, d) => { clearTimeout(tm); setNum(name, (getNum(name) + d + 16) % 16); };
    const stepper = (name) => h("div.c12-stepper", h("span", name),
      h("button.btn", { type: "button", "aria-label": S.dec1(name), onclick: () => step(name, -1) }, "−"),
      h("button.btn", { type: "button", "aria-label": S.inc(name), onclick: () => step(name, 1) }, "+"));
    const sp = slider({ label: S.speed, min: 0.5, max: 12, step: 0.5, value: def.rate, fmt: S.speedFmt, oninput: (v) => { def.rate = v; } });
    const pb = btn(S.pause, () => { sch.pause(!sch.paused); pb.textContent = sch.paused ? S.resume : S.pause; pb.classList.toggle("on", sch.paused); });
    stage.append(h("div.controls", stepper("A"), stepper("B"), btn(S.worst, worst, "primary"), btn(S.random, random), sp, pb));
    update();
    return {
      enter() { sch.start(); },
      leave() { sch.stop(); clearTimeout(tm); },
      sch,
    };
  };
  G["dort-bit-toplayici"] = [{ click: S.worst }, { wait: 5200 }, { slide: "label:" + S.speed, to: 1.5 }, { wait: 400 }, { click: S.worst }];

  /* =========================================================
     3) Çoklayıcı (MUX) ve kod çözücü
     ========================================================= */
  Demos.c12MuxDec = function (stage) {
    const pane = h("div.pane.c12-sch");
    const layM = h("div.c12-layer"), layD = h("div.c12-layer");
    pane.append(layM, layD);
    const tbl = h("table.truth.c12-tt");
    const info = h("div.c12-info");
    const note = h("p.c12-note");
    const side = h("div.c12-bottom.c12-b3",
      h("div.c12-panel", info, note),
      h("div.c12-panel", h("span.c12-ptitle", S.tt), tbl));
    stage.append(h("div.split.c12-s3", pane, side));

    const defM = clone(CIRCUITS.c12Mux), defD = clone(CIRCUITS.c12Dec);
    const schM = Schematic(layM, defM, {
      maxUnit: 24,
      overlay(ctx, s) {
        const k = selIndex(s);
        if (k == null) return;
        const P = s.def.paths[k], u = s.unit;
        // seçilen veri yolunu tellerin altına bakır parıltı olarak çiz
        ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.strokeStyle = rgba(C.copper2, 0.32); ctx.lineWidth = Math.max(8, 0.75 * u); ctx.lineCap = "round"; ctx.lineJoin = "round";
        P.pts.forEach((pl) => { ctx.beginPath(); pl.forEach((q, i) => (i ? ctx.lineTo(...s.screenOf(q)) : ctx.moveTo(...s.screenOf(q)))); ctx.stroke(); });
        const [gx, gy] = s.screenOf(s.part(P.gate).at);
        const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 3 * u);
        gr.addColorStop(0, rgba(C.copper2, 0.38)); gr.addColorStop(1, rgba(C.copper2, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(gx, gy, 3 * u, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.font = `700 ${Math.max(10, 0.55 * u)}px ${FONT.display}`; ctx.fillStyle = C.copper2; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const [tx, ty] = s.screenOf([24, 5 * k - 2.05]);
        ctx.fillText(S.selected, tx, ty);
      },
    });
    const schD = Schematic(layD, defD, { maxUnit: 24 });
    const solveM = solver(defM), solveD = solver(defD);
    const vM = (id, pin) => schM.v(schM.netOf(id, pin));
    const vD = (id, pin) => schD.v(schD.netOf(id, pin));
    function selIndex(s = schM) {
      const s1 = s.v(s.netOf("S1", "o")), s0 = s.v(s.netOf("S0", "o"));
      return s1 === 1 || s1 === 0 ? (s1 << 1) | s0 : null;
    }

    let mode = "mux";
    const tS1 = toggleBtn(schM, "S1"), tS0 = toggleBtn(schM, "S0");
    const tA1 = toggleBtn(schD, "A1"), tA0 = toggleBtn(schD, "A0");
    const muxBtns = h("div.c12-btns", tS1, tS0), decBtns = h("div.c12-btns", tA1, tA0);
    const sg = seg([["mux", S.mux], ["dec", S.decoder]], mode, (k) => setMode(k), S.mode);
    stage.append(h("div.controls", sg, muxBtns, decBtns));

    let trs = [];
    function buildTable() {
      if (mode === "mux") {
        tbl.replaceChildren(h("thead", h("tr", h("th", "S1"), h("th", "S0"), h("th.c12-sep", ""), h("th", "Y"), h("th", ""))), h("tbody"));
      } else {
        // kod çözücü doğruluk tablosu: devre her adres için çözülür
        trs = [0, 1, 2, 3].map((m) => {
          const r = solveD({ A1: m >> 1, A0: m & 1 });
          return h("tr", bitTd(m >> 1), bitTd(m & 1), h("td.c12-sep", ""), [0, 1, 2, 3].map((k) => bitTd(r("M" + k, "en"))));
        });
        tbl.replaceChildren(
          h("thead", h("tr", h("th", "A1"), h("th", "A0"), h("th.c12-sep", ""), [0, 1, 2, 3].map((k) => h("th", "Y" + k)))),
          h("tbody", trs));
      }
    }
    function setMode(k) {
      mode = k;
      layM.style.display = k === "mux" ? "" : "none";
      layD.style.display = k === "dec" ? "" : "none";
      muxBtns.style.display = k === "mux" ? "" : "none";
      decBtns.style.display = k === "dec" ? "" : "none";
      buildTable(); update();
    }
    function update() {
      [tS1, tS0, tA1, tA0].forEach((b) => b.upd());
      if (mode === "mux") {
        const k = selIndex(), y = vM("Y", "i");
        const s1 = vM("S1", "o"), s0 = vM("S0", "o");
        info.replaceChildren(
          h("div.c12-big", h("span", S.muxSel(s1, s0, k)), h("span.c12-ybox", S.muxY + " = ", bitSpan(y))),
          h("div.c12-dline", [0, 1, 2, 3].map((i) => h("span.c12-dchip" + (i === k ? ".on" : ""), "D" + i + " ", bitSpan(vM("D" + i, "o"))))));
        note.textContent = S.muxNote;
        // işlev tablosu: her seçim için, mevcut veri girişleriyle devre çözülür
        const D = Object.fromEntries([0, 1, 2, 3].map((i) => ["D" + i, schM.part("D" + i).value ? 1 : 0]));
        const body = tbl.querySelector("tbody");
        body.replaceChildren(...[0, 1, 2, 3].map((m) => {
          const r = solveM({ ...D, S1: m >> 1, S0: m & 1 });
          const tr = h("tr", bitTd(m >> 1), bitTd(m & 1), h("td.c12-sep", ""), bitTd(r("Y", "i")), h("td.c12-fn", "= D" + m));
          if (m === k) tr.classList.add("cur");
          return tr;
        }));
      } else {
        const a1 = vD("A1", "o"), a0 = vD("A0", "o");
        const sel = [0, 1, 2, 3].filter((k) => vD("M" + k, "en") === 1);
        const cellP = sel.length === 1 ? schD.part("M" + sel[0]) : null;
        info.replaceChildren(
          h("div.c12-big", h("span", `${S.addr} A1 A0 = ${a1}${a0} → ${sel.map((k) => "Y" + k).join(", ") || "—"}`)),
          h("div.c12-read", h("small", S.readData + (cellP ? ` (${S.cell(a1 + "" + a0)})` : "")),
            h("b", cellP ? `${String.fromCharCode(cellP.byte)} · ${cellP.byte.toString(2).padStart(8, "0")}` : "—")));
        note.textContent = S.decNote;
        const idx = (a1 << 1) | a0;
        trs.forEach((tr, i) => tr.classList.toggle("cur", i === idx));
      }
    }
    schM.on("change", update); schD.on("change", update);
    setMode("mux");
    return {
      enter() { schM.start(); schD.start(); },
      leave() { schM.stop(); schD.stop(); },
      schM, schD,
    };
  };
  G["mux-kod-cozucu"] = [{ click: "=S1" }, { wait: 1000 }, { click: "=D2" }, { wait: 1000 }, { click: "=" + S.decoder }, { wait: 900 }, { click: "aria:A0" }];
})();
