/* 13. bölüm deneyleri (1–4): hafıza
   SR latch, D latch ve D flip-flop, T flip-flop ile sayaç, kaydırmalı yazmaç.
   Bütün değerler şemanın mantık benzetiminden (Logic.network) okunur. */
window.STR = window.STR || {};

(function () {
  const { C, FONT, h, slider, seg, btn, rgba } = L;
  const S = STR.ch13;
  window.GUIDES = window.GUIDES || {};
  const G = window.GUIDES;
  window.GUIDE_TARGETS = window.GUIDE_TARGETS || {};

  /* ---------- parça türleri ---------- */
  // saat kaynağı: değerini demo kodu net.set ile verir (hız, durdurma ve tek darbe için)
  Schematic.PARTS.c13clk = {
    logic: true, pins: { o: [1.5, 0] }, box: [-1.5, -0.9, 1.5, 0.9],
    logicEl(p, n, net) { net.signal(n("o"), 0); },
    draw(g, p, st) {
      const v = st.logicVal(p, "o");
      g.rect(-1.5, -0.8, 2.3, 1.6, { stroke: v === 1 ? C.v1 : C.silk, fill: v === 1 ? rgba(C.v1, 0.2) : C.mask2, r: 0.2 });
      g.path([[-1.2, 0.4], [-0.8, 0.4], [-0.8, -0.4], [-0.3, -0.4], [-0.3, 0.4], [0.2, 0.4], [0.2, -0.4], [0.5, -0.4]], { stroke: C.silk, width: 1.8 });
      g.lead([0.8, 0], [1.5, 0], "o");
    },
  };
  // şema yazısı (üst çizgi destekli)
  Schematic.PARTS.c13lab = {
    pins: {}, paths: [], box: [-0.5, -0.5, 0.5, 0.5],
    draw(g, p) { g.text(p.text, [0, 0], { size: p.size || 0.6, color: p.color || C.silk, align: p.align || "center", rot: true, weight: p.weight || 600, overline: p.overline }); },
  };

  /* ---------- ortak yardımcılar ---------- */
  const clone = (d) => {
    const c = JSON.parse(JSON.stringify(d));
    return c;
  };
  function meter(label) {
    const b = h("b", "—");
    const el = h("div.meter", h("small", label), b);
    el.set = (t) => { if (b.textContent !== t) b.textContent = t; };
    return el;
  }
  function laPane(title) {
    const el = h("div.c13-lawrap", h("span.c13-ptitle", title));
    return el;
  }
  const bitTxt = (v) => (v === 1 ? "1" : v === 0 ? "0" : "x");
  const bitCls = (v) => (v === 1 ? "b1" : v === 0 ? "b0" : "");
  // geçmişteki yükselen kenar anları
  function rises(hist, t0 = -Infinity) {
    const out = [];
    for (let k = 1; k < hist.length; k++) if (hist[k][1] === 1 && hist[k - 1][1] === 0 && hist[k][0] > t0) out.push(hist[k][0]);
    return out;
  }
  // geçmişte (t0, t1] aralığındaki değişim sayısı
  function changes(hist, t0) { let n = 0; for (let k = hist.length - 1; k > 0 && hist[k][0] > t0; k--) n++; return n; }

  /* Saat sürücüsü: kenarları birkaç kare ileriye kadar kuyruğa ekler (geçmişe olay yazılmaz).
     run=false iken saat 0'da durur; pulse() tek bir darbe verir. */
  function clockDriver(sch, id, half) {
    const d = { half, run: true, val: 0, next: 0, last: 0 };
    const nm = () => sch.netOf(id, "o");
    const horizon = () => sch.net.time + (sch.def.rate || 20) * 0.06;
    d.reset = () => { d.val = 0; d.last = sch.net.time; d.next = sch.net.time + d.half; };
    d.pump = () => {
      if (!d.run) return;
      const H = horizon();
      while (d.next <= H) { d.val ^= 1; sch.net.set(nm(), d.val, d.next); d.last = d.next; d.next += d.half; }
    };
    d.setRun = (r) => {
      if (r === d.run) return;
      d.run = r;
      if (!r) {
        if (d.val === 1) { d.val = 0; sch.net.set(nm(), 0, d.next); d.last = d.next; }
      } else d.next = Math.max(sch.net.time, d.last) + d.half;
    };
    d.pulse = () => {
      d.setRun(false);
      const t0 = Math.max(sch.net.time + 0.5, d.last + d.half * 0.5);
      const w = Math.min(d.half, 6);
      sch.net.set(nm(), 1, t0); sch.net.set(nm(), 0, t0 + w);
      d.last = t0 + w;
    };
    d.setHalf = (v) => { d.half = v; if (d.run) d.next = Math.min(d.next, d.last + v); };
    sch.on("step", d.pump);
    return d;
  }
  // saat kontrolleri: çalış/durdur, tek darbe, hız (Hz, gerçek zaman)
  function clockControls(sch, drv, f0, onChange) {
    const rate = sch.def.rate || 20;
    const toHalf = (f) => rate / (2 * f);
    drv.setHalf(toHalf(f0));
    const sg = seg([["run", S.run], ["stop", S.stop]], "run", (k) => { drv.setRun(k === "run"); }, S.clockAria);
    const pb = btn(S.pulse, () => { drv.pulse(); sg.set("stop"); });
    const sp = slider({ label: S.speed, min: 0.2, max: 3, step: 0.05, value: f0, width: "90px", fmt: (v) => L.num(v, 2) + " " + S.hz,
      oninput: (v) => { drv.setHalf(toHalf(v)); onChange && onChange(v); } });
    return { sg, pb, sp, sync() { sg.set(drv.run ? "run" : "stop"); } };
  }
  // ağı belirli değerlere zorla (açılıştaki durum) ve diyagramı düz çizgiyle doldur
  function prime(sch, force, warm) {
    const net = sch.net;
    Object.entries(force || {}).forEach(([n, v]) => net.set(n, v));
    net.run(net.time + 5);
    net.run(net.time + (warm || 0));
  }

  /* =========================================================
     1) SR latch: geri besleme ile hafıza
     ========================================================= */
  Demos.c13Sr = function (stage) {
    const top = h("div.pane.c13-sch");
    const rowsDef = [[0, 0, S.stHold], [1, 0, S.stSet], [0, 1, S.stReset], [1, 1, S.stBad]];
    const rows = rowsDef.map(([s, r, name]) => {
      const tds = [h("td", { class: bitCls(s) }, String(s)), h("td", { class: bitCls(r) }, String(r)), h("td", "—"), h("td", "—"), h("td.c13-st", "—")];
      return { s, r, name, tr: h("tr", ...tds), tds, seen: new Set() };
    });
    const tbl = h("table.truth.c13-tt", h("thead", h("tr", h("th", S.colS), h("th", S.colR), h("th", S.colQ), h("th", h("span.ovl", "Q")), h("th", S.colState))), h("tbody", rows.map((r) => r.tr)));
    const note = h("p.c13-note", S.srHint);
    const side = h("div.c13-panel", h("span.c13-ptitle", S.srTable), tbl, note);
    const la = laPane(S.la);
    stage.append(h("div.split.c13-sr", h("div.c13-row", top, side), la));

    const def = clone(CIRCUITS.c13Sr);
    const sch = Schematic(top, def, { maxUnit: 30 });
    const N = () => ({ S: sch.netOf("S", "o"), R: sch.netOf("R", "o"), Q: sch.netOf("G1", "o"), QN: sch.netOf("G2", "o") });
    const nn = N();
    const A = LogicAnalyzer(la, { signals: [{ name: nn.S, label: "S" }, { name: nn.R, label: "R" }, { name: nn.Q, label: "Q" }, { name: nn.QN, label: "Q'" }], window: 40, grid: 4, labelWidth: 40, rowH: 52 });
    // açılış: Q = 0, Q' = 1 (gerçek latch açılışta rastgele bir durumda uyanır)
    const init = () => prime(sch, { [nn.Q]: 0, [nn.QN]: 1 }, 40);
    init();

    const flag = h("span.flag.c13-flag", "");
    const rel = btn(S.release, () => { sch.set("S", "value", 0); sch.set("R", "value", 0); });
    const rst = btn(S.reset, () => { sch.reset(); init(); rows.forEach((r) => { r.seen.clear(); r.tds.slice(2).forEach((td) => { td.textContent = "—"; td.className = td.classList.contains("c13-st") ? "c13-st" : ""; }); }); update(); });
    stage.append(h("div.controls", rel, flag, h("span.spacer"), rst));

    let lastIn = "", since = 0;
    function update() {
      const net = sch.net, t = net.time;
      const s = sch.part("S").value ? 1 : 0, r = sch.part("R").value ? 1 : 0;
      const q = net.value(nn.Q), qn = net.value(nn.QN);
      const key = s + "" + r;
      if (key !== lastIn) { lastIn = key; since = t; }
      const settled = t - since > 3 && changes(net.history(nn.Q), t - 3) === 0 && changes(net.history(nn.QN), t - 3) === 0;
      const osc = !s && !r && changes(net.history(nn.Q), t - 6) >= 2;
      let txt, cls = "";
      if (osc) { txt = S.fOsc; }
      else if (!settled) { txt = S.fWait; cls = "ok"; }
      else if (s && r) txt = S.fBad;
      else if (s) { txt = S.fSet; cls = "ok"; }
      else if (r) { txt = S.fReset; cls = "ok"; }
      else { txt = q === 1 ? S.fHold1 : S.fHold0; cls = "ok"; }
      if (flag.textContent !== txt) flag.textContent = txt;
      flag.className = "flag c13-flag" + (cls ? " " + cls : "");
      rel.disabled = !(s && r);
      rows.forEach((row) => {
        const cur = row.s === s && row.r === r;
        row.tr.classList.toggle("cur", cur);
        if (cur && settled && !osc) {
          row.seen.add(q);
          const both = row.s === 0 && row.r === 0 && row.seen.has(0) && row.seen.has(1);
          row.tds[2].textContent = both ? S.prevQ : bitTxt(q); row.tds[2].className = both ? "c13-prev" : bitCls(q);
          row.tds[3].textContent = both ? S.prevQ : bitTxt(qn); row.tds[3].className = both ? "c13-prev" : bitCls(qn);
          row.tds[4].textContent = row.name;
        }
      });
      const mem = rows[0].seen.has(0) && rows[0].seen.has(1);
      note.textContent = mem ? S.srMem : S.srHint;
      note.classList.toggle("ok", mem);
      A.show(net, t);
    }
    sch.on("change", update);
    update();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["sr-latch"] = [{ click: "aria:S girişi" }, { wait: 1800 }, { click: "aria:S girişi" }, { wait: 1600 }, { click: "aria:R girişi" }, { wait: 1600 }, { click: "aria:R girişi" }];

  /* =========================================================
     2) D latch ve kenar tetiklemeli D flip-flop
     ========================================================= */
  Demos.c13Dff = function (stage) {
    const top = h("div.pane.c13-sch");
    const mD = meter(S.mD), mQL = meter(S.mQL), mQF = meter(S.mQF), mE = meter(S.mEdges);
    const la = laPane(S.la);
    stage.append(h("div.split.c13-dff", top, h("div.meters.c13-meters", mD, mQL, mQF, mE), la));

    const def = clone(CIRCUITS.c13Dff);
    const sch = Schematic(top, def, { maxUnit: 28 });
    let nn;
    const nets = () => ({ D: sch.netOf("D", "o"), C: sch.netOf("CLK", "o"), QL: sch.netOf("LAT", "q"), QLN: sch.netOf("LAT", "qn"), QF: sch.netOf("FF", "q") });
    nn = nets();
    let t0 = 0;
    const A = LogicAnalyzer(la, {
      signals: [{ name: nn.C, label: "CLK", edges: true }, { name: nn.D, label: "D" }, { name: nn.QL, label: S.laLatch }, { name: nn.QF, label: S.laFF }],
      window: 120, grid: 10, labelWidth: 66,
      overlay(ctx, g) {
        const net = sch.net, hc = net.history(nn.C);
        // latch satırı: EN = 1 aralıkları (saydam)
        const yL = g.top + 2 * g.rowH;
        ctx.fillStyle = rgba(C.gold, 0.08);
        let start = null;
        for (let k = 0; k <= hc.length; k++) {
          const e = hc[k];
          const t = e ? e[0] : g.tEnd, v = e ? e[1] : 0;
          if (v === 1 && start == null) start = t;
          else if (v !== 1 && start != null) {
            const xa = g.toX(Math.max(start, g.tStart)), xb = g.toX(Math.min(t, g.tEnd));
            if (xb > xa) {
              ctx.fillRect(xa, yL + 2, xb - xa, g.rowH - 4);
              if (xb - xa > 46) { ctx.fillStyle = rgba(C.gold, 0.75); ctx.font = `600 10px ${FONT.display}`; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(S.transp, (xa + xb) / 2, yL + 1); ctx.fillStyle = rgba(C.gold, 0.08); }
            }
            start = null;
          }
        }
        // yükselen kenarlar: D'nin örneklendiği an
        ctx.strokeStyle = rgba(C.copper2, 0.55); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        rises(hc, g.tStart).forEach((t) => {
          const x = Math.round(g.toX(t)) + 0.5;
          ctx.beginPath(); ctx.moveTo(x, g.top + g.rowH * 0.15); ctx.lineTo(x, g.top + 4 * g.rowH); ctx.stroke();
        });
        ctx.setLineDash([]);
      },
    });
    const init = () => { prime(sch, { [nn.QL]: 0, [nn.QLN]: 1 }, 120); t0 = sch.net.time; drv.reset(); };
    const drv = clockDriver(sch, "CLK", 8);
    init();
    const cc = clockControls(sch, drv, 0.6);
    let setupOn = false;
    const su = btn(S.setupOff, () => {
      setupOn = !setupOn;
      su.textContent = setupOn ? S.setupOn : S.setupOff;
      su.classList.toggle("on", setupOn);
      // kurulma süresi: D kenardan 3 birim (0,3 s) içinde değiştiyse çıkış belirsiz
      const ff = def.parts.find((p) => p.id === "FF");
      ff.setup = setupOn ? 3 : 0;
      def.parts.find((p) => p.id === "D").value = sch.part("D").value;
      sch.rebuild(); nn = nets(); init(); update();
    });
    const flag = h("span.flag.c13-flag", "");
    stage.append(h("div.controls", cc.sg, cc.pb, cc.sp, su, flag));

    function update() {
      const net = sch.net, t = net.time;
      const d = net.value(nn.D), c = net.value(nn.C), ql = net.value(nn.QL), qf = net.value(nn.QF);
      mD.set(bitTxt(d)); mQL.set(bitTxt(ql)); mQF.set(bitTxt(qf));
      mE.set(String(rises(net.history(nn.C), t0).length));
      const txt = qf !== 0 && qf !== 1 ? S.fdX : c === 1 ? S.fdLatch : S.fdHold;
      if (flag.textContent !== txt) flag.textContent = txt;
      flag.className = "flag c13-flag" + (qf !== 0 && qf !== 1 ? "" : " ok");
      A.show(net, t);
    }
    sch.on("change", update);
    update();
    return { enter() { cc.sync(); sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["d-flipflop"] = [{ click: "aria:D girişi" }, { wait: 2600 }, { click: "aria:D girişi" }, { wait: 2200 }, { click: "=" + S.pulse }];

  /* =========================================================
     3) T flip-flop ile frekans bölme ve 4 bitlik sayaç
     ========================================================= */
  // JK flip-flop tablosu: her J, K için Q = 0 ve Q = 1'den bir yükselen kenar sonrası
  function jkTable() {
    const next = (J, K, q0) => {
      const n = Logic.network();
      n.signal("J", J); n.signal("K", K); n.signal("C", 0);
      n.ff({ type: "JK", j: "J", k: "K", clk: "C", q: "Q", init: q0 });
      n.settle(1); n.set("C", 1, n.time + 1); n.run(n.time + 10);
      return n.value("Q");
    };
    return [[0, 0], [0, 1], [1, 0], [1, 1]].map(([J, K]) => {
      const a = next(J, K, 0), b = next(J, K, 1);
      const q = a === 0 && b === 1 ? "Q" : a === 1 && b === 0 ? "Q'" : String(a);
      const m = q === "Q" ? S.jkHold : q === "Q'" ? S.jkToggle : a === 1 ? S.jkSet : S.jkReset;
      return { J, K, q, m };
    });
  }
  Demos.c13Counter = function (stage) {
    const top = h("div.pane.c13-sch");
    const leds = [3, 2, 1, 0].map((i) => { const d = h("span.c13-led"); return { i, d, el: h("div.c13-ledc", d, h("small", "Q" + i)) }; });
    const mDec = meter(S.mDec), mBin = meter(S.mBin), mP = meter(S.mPulses);
    const wrapF = h("span.flag.ok.c13-wrap", "");
    const ledBox = h("div.c13-panel.c13-cnt", h("div.c13-leds", leds.map((l) => l.el)), h("div.meters", mBin, mDec, mP), wrapF);
    const jk = jkTable();
    const jkT = h("table.truth.c13-tt.c13-jk", h("thead", h("tr", h("th", "J"), h("th", "K"), h("th", "Q⁺"), h("th", S.jkMean))),
      h("tbody", jk.map((r) => h("tr", { class: r.J && r.K ? "cur" : null }, h("td", { class: bitCls(r.J) }, String(r.J)), h("td", { class: bitCls(r.K) }, String(r.K)),
        h("td.mono", r.q === "Q'" ? h("span.ovl", "Q") : r.q), h("td.c13-st", r.m)))));
    const jkBox = h("div.c13-panel.c13-jkbox", h("span.c13-ptitle", S.jkTitle), jkT, h("p.c13-note", S.jkNote));
    const la = laPane(S.la);
    stage.append(h("div.split.c13-cntsplit", top, h("div.c13-mid", ledBox, jkBox), la));

    const def = clone(CIRCUITS.c13Counter);
    const sch = Schematic(top, def, { maxUnit: 24 });
    const nC = sch.netOf("CLK", "o");
    const nQ = [0, 1, 2, 3].map((i) => sch.netOf("FF" + i, "q"));
    let t0 = 0, lastVal = 0, wrapUntil = -1;
    const ratioOf = (i) => {
      const net = sch.net;
      const r = rises(net.history(nQ[i]));
      if (r.length < 2) return null;
      const a = r[r.length - 2], b = r[r.length - 1];
      return rises(net.history(nC)).filter((t) => t > a && t <= b).length;
    };
    const sigs = [{ name: nC, label: "CLK", edges: true }, ...nQ.map((n, i) => ({ name: n, label: "Q" + i }))];
    const A = LogicAnalyzer(la, {
      signals: sigs, window: 160, grid: 8, labelWidth: 50, rowH: 46,
      overlay(ctx, g) {
        // ölçülen frekans oranı: Qi'nin son iki yükselen kenarı arasındaki saat darbeleri
        ctx.font = `700 10.5px ${FONT.mono}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        [null, 0, 1, 2, 3].forEach((i, r) => {
          const k = i == null ? 1 : ratioOf(i);
          const y = g.top + r * g.rowH + g.rowH * 0.47;
          ctx.fillStyle = k ? C.gold : C.muted;
          ctx.fillText(i == null ? "f" : k ? "f/" + k : "f/?", 6, y + 13);
        });
      },
    });
    const drv = clockDriver(sch, "CLK", 4);
    const init = () => { prime(sch, {}, 160); t0 = sch.net.time; lastVal = 0; drv.reset(); };
    init();
    const cc = clockControls(sch, drv, 1.5, (f) => { A.window = Math.min(480, Math.max(80, (20 * sch.def.rate) / f)); });
    A.window = (20 * sch.def.rate) / 1.5;
    const rst = btn(S.clear, () => { const run = drv.run; sch.reset(); init(); drv.run = run; cc.sync(); update(); });
    stage.append(h("div.controls", cc.sg, cc.pb, cc.sp, h("span.spacer"), rst));

    function update() {
      const net = sch.net, t = net.time;
      const bits = [3, 2, 1, 0].map((i) => net.value(nQ[i]));
      const ok = bits.every((b) => b === 0 || b === 1);
      const val = ok ? Logic.fromBits(bits) : null;
      leds.forEach((l) => l.d.classList.toggle("on", net.value(nQ[l.i]) === 1));
      mBin.set(bits.map(bitTxt).join(" "));
      mDec.set(val == null ? "—" : String(val));
      mP.set(String(rises(net.history(nC), t0).length));
      // dalgalı sayaçta bitler sırayla değişir (15 → 14 → 12 → 8 → 0); yalnız oturmuş değerler karşılaştırılır
      const still = nQ.every((n) => changes(net.history(n), t - 5) === 0);
      if (still && val != null) {
        if (val === 0 && lastVal === 15) wrapUntil = t + 4 * sch.def.rate;
        lastVal = val;
      }
      const w = t < wrapUntil ? S.wrap : "";
      if (wrapF.textContent !== w) wrapF.textContent = w;
      A.show(net, t);
    }
    sch.on("change", update);
    update();
    return { enter() { cc.sync(); sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["sayac"] = [{ slide: "label:" + S.speed, to: 3 }, { wait: 3500 }, { click: "=" + S.pulse }, { wait: 900 }, { click: "=" + S.pulse }];

  /* =========================================================
     4) Kaydırmalı yazmaç: seri giriş, halka ve Johnson sayacı
     ========================================================= */
  Demos.c13Shift = function (stage) {
    const top = h("div.pane.c13-sch");
    const leds = [0, 1, 2, 3].map((i) => { const d = h("span.c13-led.big"); return { i, d, el: h("div.c13-ledc", d, h("small", "Q" + i)) }; });
    const mPat = meter(S.mPattern), mPer = meter(S.mPeriod);
    const hint = h("p.c13-note", S.hintSerial);
    const la = laPane(S.la);
    const modeSlot = h("div.c13-col");
    stage.append(h("div.split.c13-shsplit", top, h("div.c13-shmid", h("div.c13-leds.c13-strip", leds.map((l) => l.el)), h("div.c13-col", modeSlot, h("div.meters", mPat, mPer)), hint), la));

    const DEFS = { seri: CIRCUITS.c13ShiftSerial, halka: CIRCUITS.c13ShiftRing, johnson: CIRCUITS.c13ShiftJohnson };
    let mode = "seri";
    const def = clone(DEFS.seri);
    const sch = Schematic(top, def, { maxUnit: 22 });
    let nC, nD, nQ, A, t0 = 0, start = null, period = null;
    const laBox = h("div.c13-labody");
    la.append(laBox);
    function wire() {
      nC = sch.netOf("CLK", "o");
      nD = sch.netOf("FF0", "d");
      nQ = [0, 1, 2, 3].map((i) => sch.netOf("FF" + i, "q"));
      laBox.innerHTML = "";
      A = LogicAnalyzer(laBox, { signals: [{ name: nC, label: "CLK", edges: true }, { name: nD, label: S.laData }, ...nQ.map((n, i) => ({ name: n, label: "Q" + i }))], window: 120, grid: 12, labelWidth: 44 });
    }
    const drv = clockDriver(sch, "CLK", 6);
    const init = () => {
      // açılış durumu: flip-flop'ların başlangıç değerleri (halkada Q0 = 1)
      const f = {};
      nQ.forEach((n, i) => { f[n] = sch.part("FF" + i).init || 0; });
      prime(sch, f, 120); t0 = sch.net.time; drv.reset(); start = null; period = null;
    };
    wire(); init();
    const cc = clockControls(sch, drv, 0.8);
    const md = seg([["seri", S.modeSerial], ["halka", S.modeRing], ["johnson", S.modeJohnson]], "seri", (k) => {
      mode = k;
      const run = drv.run;
      // schematic.js build() yerleşimi eski erişim düğmeleriyle yapar; kaldırılan parçanın (Veri) düğmesi hata verir
      top.querySelectorAll(".sch-hot .sch-btn").forEach((el) => el.remove());
      sch.rebuild(clone(DEFS[k]));
      wire(); init(); drv.run = run; cc.sync();
      hint.textContent = k === "seri" ? S.hintSerial : k === "halka" ? S.hintRing : S.hintJohnson;
      update();
    }, S.modeAria);
    const rst = btn(S.clear, () => { const run = drv.run; sch.reset(); wire(); init(); drv.run = run; cc.sync(); update(); });
    modeSlot.append(md);
    stage.append(h("div.controls", cc.sg, cc.pb, cc.sp, h("span.spacer"), rst));

    // desen her yükselen kenardan sonra kaydedilir; ilk desen tekrar görülünce periyot ölçülür
    let lastRise = 0, pats = [];
    function update() {
      const net = sch.net, t = net.time;
      const q = nQ.map((n) => net.value(n));
      leds.forEach((l) => l.d.classList.toggle("on", q[l.i] === 1));
      const pat = q.map(bitTxt).join("");
      mPat.set(q.map(bitTxt).join(" "));
      const r = rises(net.history(nC), t0);
      if (start == null) { pats = [pat]; start = pat; lastRise = 0; }
      // kenardan 1,2 birim sonra (flip-flop gecikmesi geçti) deseni oku
      if (r.length > lastRise && t - r[r.length - 1] > 1.2) {
        lastRise = r.length;
        if (mode !== "seri" && period == null) {
          const k = pats.indexOf(pat);
          if (k >= 0) period = pats.length - k; else pats.push(pat);
        }
      }
      mPer.set(mode === "seri" ? "—" : period ? period + " " + S.steps : "…");
      A.show(net, t);
    }
    sch.on("change", update);
    update();
    return { enter() { cc.sync(); sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["kaydirmali-yazmac"] = [{ click: "aria:Veri girişi" }, { wait: 2600 }, { click: "aria:Veri girişi" }, { wait: 3500 }, { click: "=" + S.modeJohnson }];
})();
