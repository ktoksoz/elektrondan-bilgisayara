/* 13. bölüm deneyleri (ikinci kısım): durum makinesi (trafik lambası) ve 555 saat üreteci. */
window.STR = window.STR || {};

(function () {
  const { C, FONT, h, slider, seg, btn, canvas, num, rgba, loop, vcolor, lcolor } = L;
  const S = STR.ch13b;
  const fmt = (v, u, d) => Circuit.fmt(v, u, d);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  window.GUIDES = window.GUIDES || {};
  const G = window.GUIDES;
  window.GUIDE_TARGETS = window.GUIDE_TARGETS || {};

  /* ======================================================================
     555 zamanlayıcı parçası (karma model)
     Analog kısım gerçekten çözülür: 3 × 5 kΩ bölücü (8 → 5 → iç düğüm → 1), deşarj anahtarı (7 → 1),
     itme-çekme çıkış katı (8 → 3 ve 3 → 1 anahtarları). Karşılaştırıcılar ve SR flip-flop ideal kabul
     edilir: demo her zaman adımından sonra 6, 2, 5 ve iç düğüm gerilimlerine bakıp anahtarları kurar.
     Pimler: 1 GND, 2 TRIG, 3 OUT, 4 RESET, 5 CTRL, 6 THR, 7 DIS, 8 VCC.
     ====================================================================== */
  const PIN555 = { gnd: [4, 8.5], trg: [-7, 2], out: [7, -1], rst: [0, -8.5], ctl: [7, -3.5], thr: [-7, -2], dis: [-7, -6], vcc: [4, -8.5] };
  const NUM555 = { gnd: "1", trg: "2", out: "3", rst: "4", ctl: "5", thr: "6", dis: "7", vcc: "8" };
  const NAME555 = { gnd: "GND", trg: "TRIG", out: "OUT", rst: "RESET", ctl: "CTRL", thr: "THR", dis: "DIS", vcc: "VCC" };
  const EDGE555 = { gnd: [4, 6.5], trg: [-5, 2], out: [5, -1], rst: [0, -6.5], ctl: [5, -3.5], thr: [-5, -2], dis: [-5, -6], vcc: [4, -6.5] };
  Schematic.PARTS.c13b555 = {
    pins: PIN555,
    box: [-5, -6.5, 5, 6.5],
    paths: [],
    hide: 5,
    el(p, n) {
      const q = p.q ? 1 : 0;
      return [
        { type: "S", id: p.id, n: [n("dis"), n("gnd")], closed: !q, ron: 5, roff: 1e9 },
        { type: "R", id: p.id + ".r1", n: [n("vcc"), n("ctl")], R: 5000 },
        { type: "R", id: p.id + ".r2", n: [n("ctl"), p.id + "_k"], R: 5000 },
        { type: "R", id: p.id + ".r3", n: [p.id + "_k", n("gnd")], R: 5000 },
        { type: "S", id: p.id + ".hi", n: [n("vcc"), n("out")], closed: !!q, ron: 20, roff: 1e9 },
        { type: "S", id: p.id + ".lo", n: [n("out"), n("gnd")], closed: !q, ron: 10, roff: 1e9 },
      ];
    },
    // sim.terminals bu parça için demoda 8 pimin toplam akımına genişletilir (akım noktaları doğru aksın)
    elPins: ["gnd", "trg", "out", "rst", "ctl", "thr", "dis", "vcc"],
    draw(g, p, st) {
      Object.keys(PIN555).forEach((k) => g.lead(PIN555[k], EDGE555[k], k));
      g.rect(-5, -6.5, 10, 13, { fill: C.mask2, stroke: C.silk, width: 2.2 });
      // yonga çentiği
      g.arcPath(-2.6, -6.5, 0.55, 0, Math.PI, { stroke: C.silk2, width: 1.6 });
      // bacak numaraları (gövde dışında); iç görünümde adlarıyla birlikte
      Object.keys(PIN555).forEach((k) => {
        const [x, y] = PIN555[k], [ex, ey] = EDGE555[k];
        const mx = (x + ex) / 2, my = (y + ey) / 2;
        const vert = x === ex;
        const t = p.inner ? NUM555[k] + " " + NAME555[k] : NUM555[k];
        // iç görünümde yazılar gövdeden dışarı doğru hizalanır
        const lft = k === "rst" && p.inner; // RESET yazısı VCC'ye çarpmasın: soluna
        const side = vert ? (lft ? "right" : "left") : !p.inner ? "center" : x < 0 ? "right" : "left";
        const at = vert ? [mx + (lft ? -0.4 : 0.4), my] : [p.inner ? (x < 0 ? ex - 0.2 : ex + 0.2) : mx, my - 0.45];
        g.text(t, at, { size: 0.5, color: p.inner ? C.silk2 : C.muted, weight: 700, font: "mono", align: side });
      });
      const v = p._v || { a: 6, b: 3, S: 0, R: 0, q: p.q ? 1 : 0, vcc: 9 };
      if (!p.inner) {
        const lab = (k, at, align) => g.text(NAME555[k], at, { size: 0.56, color: C.silk2, weight: 650, align, font: "mono" });
        lab("dis", [-4.6, -6 + 0.05], "left"); lab("thr", [-4.6, -2], "left"); lab("trg", [-4.6, 2], "left");
        lab("out", [4.6, -1], "right"); lab("ctl", [4.6, -3.5], "right");
        lab("vcc", [4, -5.85], "center"); lab("rst", [0, -5.85], "center"); lab("gnd", [4, 5.85], "center");
        g.text("555", [0.9, 0.9], { size: 2.2, color: C.silk, weight: 800 });
        g.text(S.chip, [0.9, 2.5], { size: 0.6, color: C.muted, weight: 600 });
        // flip-flop durumu: küçük gösterge
        const col = v.q ? C.v1 : C.v0;
        g.rect(0, -2.75, 1.8, 0.95, { fill: rgba(col, 0.2), stroke: col, width: 1.4 });
        g.text("Q=" + v.q, [0.9, -2.26], { size: 0.5, color: C.silk, weight: 700, font: "mono" });
        return;
      }
      /* --- iç yapı --- */
      const vmax = p._vmax || 9;
      const wcol = (volt) => vcolor(volt, 0, vmax);
      const lc = (x) => lcolor(x) || C.muted;
      const W = 2.2;
      const hopH = (y, x0, x1, hops, col) => {
        const r = 0.24;
        let x = x0;
        hops.slice().sort((a, b) => a - b).forEach((hx) => {
          g.path([[x, y], [hx - r, y]], { stroke: col, width: W });
          g.arcPath(hx, y, r, Math.PI, 2 * Math.PI, { stroke: col, width: W });
          x = hx + r;
        });
        g.path([[x, y], [x1, y]], { stroke: col, width: W });
      };
      const cA = st.netColor(p, "ctl"), cB = wcol(v.b), cV = st.netColor(p, "vcc"), cG = st.netColor(p, "gnd");
      // bölücü: 3 × 5 kΩ
      g.path([[4, -6.5], [4, -5.6]], { stroke: cV, width: W });
      g.path([[4, -4.4], [4, -3.5]], { stroke: cA, width: W });
      g.path([[4, -3.5], [4, -0.6]], { stroke: cA, width: W });
      g.path([[4, 0.6], [4, 4.4]], { stroke: cB, width: W });
      g.path([[4, 5.6], [4, 6.5]], { stroke: cG, width: W });
      [-5, 0, 5].forEach((cy) => g.rect(3.72, cy - 0.6, 0.56, 1.2, { fill: C.mask2, stroke: C.silk, width: 1.6 }));
      g.text("5k", [3.55, -5], { size: 0.42, color: C.muted, align: "right" });
      g.text("5k", [3.55, 0], { size: 0.42, color: C.muted, align: "right" });
      g.text("5k", [3.55, 5], { size: 0.42, color: C.muted, align: "right" });
      g.circle(4, -3.5, 0.13, { fill: cA }); g.circle(4, 3.5, 0.13, { fill: cB });
      g.text(S.thrHi, [3.55, -3.02], { size: 0.46, color: C.silk2, align: "right", weight: 650 });
      g.text(S.thrLo, [3.55, 3.05], { size: 0.46, color: C.silk2, align: "right", weight: 650 });
      // 5. bacak bölücünün ⅔ noktasına bağlı
      g.path([[5, -3.5], [4, -3.5]], { stroke: cA, width: W });
      // ⅔ hattı → üst karşılaştırıcı (−)
      hopH(-3.5, -4, 4, [0, 0.8], cA);
      g.path([[-4, -3.5], [-4, -3], [-3.5, -3]], { stroke: cA, width: W });
      // ⅓ hattı → alt karşılaştırıcı (+)
      g.path([[4, 3.5], [-4, 3.5], [-4, 3], [-3.5, 3]], { stroke: cB, width: W });
      // 6 ve 2 bacakları
      g.path([[-5, -2], [-3.5, -2]], { stroke: st.netColor(p, "thr"), width: W });
      g.path([[-5, 2], [-3.5, 2]], { stroke: st.netColor(p, "trg"), width: W });
      // karşılaştırıcılar
      const comp = (cy, topSign, botSign, out) => {
        g.poly([[-3.5, cy - 1.1], [-3.5, cy + 1.1], [-1.5, cy]], { fill: C.mask3, stroke: C.silk, width: 1.8 });
        g.text(topSign, [-3.12, cy - 0.5], { size: 0.55, color: C.silk, weight: 700 });
        g.text(botSign, [-3.12, cy + 0.5], { size: 0.55, color: C.silk, weight: 700 });
        if (out === 1) g.glow(-1.5, cy, 0.9, { color: C.v1, a: 0.5 });
      };
      comp(-2.5, "−", "+", v.R);
      comp(2.5, "−", "+", v.S);
      g.path([[-1.5, -2.5], [-1, -2.5], [-1, -0.75], [-0.5, -0.75]], { stroke: lc(v.R), width: W });
      g.path([[-1.5, 2.5], [-1, 2.5], [-1, 0.75], [-0.5, 0.75]], { stroke: lc(v.S), width: W });
      // SR flip-flop
      g.rect(-0.5, -1.5, 2.5, 3, { fill: C.mask3, stroke: C.silk, width: 1.8 });
      g.text("R", [-0.25, -0.75], { size: 0.5, color: C.silk, weight: 700, align: "left" });
      g.text("S", [-0.25, 0.75], { size: 0.5, color: C.silk, weight: 700, align: "left" });
      g.text("Q", [1.8, -0.95], { size: 0.5, color: C.silk, weight: 700, align: "right" });
      g.text("Q", [0.8, -1.02], { size: 0.5, color: C.silk, weight: 700 });
      g.line([0.65, -1.36], [0.95, -1.36], { stroke: C.silk, width: 1.2 });
      g.text("FF", [0.75, 0.75], { size: 0.5, color: C.muted, weight: 700 });
      const qn = v.q ? 0 : 1;
      // RESET (4) → flip-flop
      g.path([[0, -6.5], [0, -1.5]], { stroke: st.netColor(p, "rst"), width: W });
      // Q → çıkış katı → 3
      g.path([[2, -1], [2.5, -1]], { stroke: lc(v.q), width: W });
      g.poly([[2.5, -1.5], [2.5, -0.5], [3.35, -1]], { fill: C.mask3, stroke: C.silk, width: 1.6 });
      hopH(-1, 3.35, 5, [4], st.netColor(p, "out"));
      // Q' → deşarj transistörü
      g.path([[0.8, -1.5], [0.8, -5.2]], { stroke: lc(qn), width: W });
      hopH(-5.2, -1.4, 0.8, [0], lc(qn));
      // transistör (NPN, baz sağda)
      if (qn === 1) g.glow(-1.8, -5.2, 1.1, { color: C.copper2, a: 0.55 });
      g.line([-1.4, -5.8], [-1.4, -4.6], { stroke: C.silk, width: 2.6 });
      g.path([[-1.4, -5.45], [-2.2, -6], [-5, -6]], { stroke: st.netColor(p, "dis"), width: W });
      g.line([-1.4, -4.95], [-2.2, -4.45], { stroke: C.silk, width: W });
      g.arrow([-1.75, -4.67], [-2.2, -4.45], C.silk);
      g.path([[-2.2, -4.45], [-2.2, -4.15]], { stroke: cG, width: W });
      g.line([-2.55, -4.15], [-1.85, -4.15], { stroke: C.silk, width: 1.6 });
      g.line([-2.4, -3.97], [-2, -3.97], { stroke: C.silk, width: 1.6 });
    },
    info(p) {
      const v = p._v;
      if (!v) return "";
      return `<b>${S.tipOut}: ${v.q ? "1" : "0"}</b><br><small>${S.tipThr}</small> ${fmt(v.a, "V")} · ${fmt(v.b, "V")}<br><small>${S.tipDis}</small> ${v.q ? S.disOff : S.disOn}`;
    },
  };

  /* --- küçük yardımcılar --- */
  function meter(label) {
    const b = h("b", "—");
    const el = h("div.meter", h("small", label), b);
    el.set = (t) => { b.textContent = t; };
    return el;
  }
  function dashH(ctx, x0, x1, y, col) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore();
  }
  function tag(ctx, text, x, y, col) {
    ctx.font = `600 11px ${FONT.mono}`;
    const w = ctx.measureText(text).width + 8;
    ctx.fillStyle = "rgba(6,21,15,0.85)"; ctx.fillRect(x - 2, y - 8, w, 16);
    ctx.fillStyle = col; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(text, x + 2, y);
  }

  /* ======================================================================
     1) Durum makinesi: trafik lambası
     ====================================================================== */
  // durum kodu "Q1Q0" → ad; diyagramdaki sıra (saat yönünde)
  const ORDER = ["00", "01", "11", "10"];
  const NAMES = { "00": S.stK, "01": S.stKS, "11": S.stY, "10": S.stS };
  const LAMP = { r: "#ff3b3b", y: "#ffc93b", g: "#3dff86" };
  // devredeki kapıların denklemleri (şemadaki kapılarla birebir)
  const EQ = {
    d1: Logic.parse("Q0"),
    d0: Logic.parse("Q1' + Q0W'"),
    k: Logic.parse("Q1'"),
    s: Logic.parse("Q1 ^ Q0"),
    y: Logic.parse("Q1Q0"),
    yaya: Logic.parse("(Q1 + Q0)'"),
  };
  const evalRow = (q1, q0, w) => {
    const env = { Q1: q1, Q0: q0, W: w };
    const e = (k) => Logic.evaluate(EQ[k], env);
    return { next: "" + e("d1") + e("d0"), k: e("k"), s: e("s"), y: e("y"), yaya: e("yaya") };
  };

  Demos.c13bTrafik = function (stage) {
    const def = clone(CIRCUITS.c13bTrafik);
    const PERIOD = def.parts.find((p) => p.id === "CLK").period;
    const dcv = h("canvas", { role: "img", "aria-label": S.diagTitle });
    const diag = h("div.pane.c13b-diag", h("span.pane-title", S.diagTitle), dcv);
    // durum tablosu: satırlar Logic ile hesaplanır
    const rowsDef = [["00", null], ["01", null], ["11", 0], ["11", 1], ["10", null]];
    const tbody = h("tbody");
    const rows = rowsDef.map(([code, w]) => {
      const q1 = +code[0], q0 = +code[1];
      const r0 = evalRow(q1, q0, w ?? 0), r1 = evalRow(q1, q0, w ?? 1);
      const indep = w == null && JSON.stringify(r0) === JSON.stringify(r1); // W'den bağımsız mı (hesapla doğrula)
      const r = r0;
      const dots = h("span.c13b-dots",
        h("i", { class: r.k ? "on r" : "" }), h("i", { class: r.s ? "on y" : "" }), h("i", { class: r.y ? "on g" : "" }));
      const tr = h("tr",
        h("td.c13b-name", dots, h("span", NAMES[code])),
        h("td.c13b-bits", code.split("").map((b) => h("span", { class: b === "1" ? "b1" : "b0" }, b))),
        h("td", { class: w == null ? null : w ? "b1" : "b0" }, w == null ? (indep ? S.any : "?") : String(w)),
        h("td.c13b-bits", r.next.split("").map((b) => h("span", { class: b === "1" ? "b1" : "b0" }, b))),
        h("td", { class: r.yaya ? "c13b-walk" : "c13b-stop" }, r.yaya ? S.walk : S.wait));
      tr._code = code; tr._w = w;
      tbody.append(tr);
      return tr;
    });
    const table = h("table.truth.c13b-tab",
      h("thead", h("tr", h("th", S.colState), h("th", S.colQ), h("th", S.colW), h("th", S.colNext), h("th", S.colPed))), tbody);
    const req = h("p.c13b-req");
    const tabWrap = h("div.c13b-tabwrap", h("div.c13b-ptitle", S.tabTitle), table, req, h("p.c13b-note", S.tabNote));
    const row1 = h("div.c13b-row1", diag, tabWrap);
    const schPane = h("div.pane.c13b-schp", h("span.pane-title", S.schTitle));
    const schScroll = h("div.c13b-schscroll", schPane);
    const body = h("div.split.c13b-traf", row1, schScroll);
    stage.append(body);

    const sch = Schematic(schPane, def, { maxUnit: 24, tick: () => frame() });
    const N = {
      q0: sch.netOf("FF0", "q"), q1: sch.netOf("FF1", "q"), w: sch.netOf("LB", "o"), clk: sch.netOf("CLK", "o"),
      k: sch.netOf("FF1", "qn"), s: sch.netOf("GS", "o"), y: sch.netOf("GY", "o"), yaya: sch.netOf("GW", "o"),
    };
    const val = (k) => sch.v(N[k]);

    // denetimler
    let freq = 1;
    const fs = slider({ label: S.clockF, min: 0.2, max: 3, step: 0.1, value: freq, fmt: (v) => num(v, 1) + " Hz", oninput: (v) => { freq = v; def.rate = PERIOD * v; } });
    def.rate = PERIOD * freq;
    let relT = null;
    const press = () => {
      sch.set("P", "value", 1);
      clearTimeout(relT);
      relT = setTimeout(() => { relT = null; sch.set("P", "value", 0); }, 380);
    };
    const pedBtn = btn(S.ped, press, "primary");
    let paused = false;
    const pauseBtn = btn(S.pause, () => { paused = !paused; sch.pause(paused); pauseBtn.textContent = paused ? S.run : S.pause; pauseBtn.classList.toggle("on", paused); });
    const resetBtn = btn(S.reset, () => { clearTimeout(relT); relT = null; sch.reset(); last = null; anim = null; });
    stage.append(h("div.controls", fs, pedBtn, pauseBtn, resetBtn));

    // şemadaki P girişine tıklanırsa da düğme gibi davran (kısa basış)
    sch.on("change", () => { const p = sch.part("P"); if (p && p.value === 1 && !relT) relT = setTimeout(() => { relT = null; sch.set("P", "value", 0); }, 380); });

    // durum diyagramı
    let ds = null, last = null, anim = null, clkFlash = 0, lastClk = 0;
    const ease = L.ease;
    function nodePos(w, H) {
      const narrow = w < 420;
      const dx = w * (narrow ? 0.27 : 0.32), dy = H * 0.27, cx = w / 2, cy = H / 2 + 2;
      return { "00": [cx - dx, cy - dy], "01": [cx + dx, cy - dy], "11": [cx + dx, cy + dy], "10": [cx - dx, cy + dy], cx, cy, dx, dy };
    }
    // iki düğüm arası eğri (dışa doğru bombeli)
    function edgeCurve(P, a, b, r) {
      const [x0, y0] = P[a], [x1, y1] = P[b];
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      const ox = mx - P.cx, oy = my - P.cy, ol = Math.hypot(ox, oy) || 1;
      const bow = 0.16 * Math.hypot(x1 - x0, y1 - y0);
      const c = [mx + (ox / ol) * bow, my + (oy / ol) * bow];
      // uçları düğüm çemberinden kırp
      const trim = (p, q, d) => { const vx = q[0] - p[0], vy = q[1] - p[1], l = Math.hypot(vx, vy); return [p[0] + (vx / l) * d, p[1] + (vy / l) * d]; };
      return { s: trim([x0, y0], c, r + 3), c, e: trim([x1, y1], c, r + 7) };
    }
    const qpt = (E, t) => [(1 - t) * (1 - t) * E.s[0] + 2 * (1 - t) * t * E.c[0] + t * t * E.e[0], (1 - t) * (1 - t) * E.s[1] + 2 * (1 - t) * t * E.c[1] + t * t * E.e[1]];
    function arrowHead(ctx, E, col, s) {
      const [x, y] = E.e, ang = Math.atan2(y - E.c[1], x - E.c[0]);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * 4, y + Math.sin(ang) * 4);
      ctx.lineTo(x - s * Math.cos(ang - 0.42), y - s * Math.sin(ang - 0.42)); ctx.lineTo(x - s * Math.cos(ang + 0.42), y - s * Math.sin(ang + 0.42)); ctx.closePath(); ctx.fill();
    }
    function lamp(ctx, x, y, r, col, on) {
      if (on) {
        const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
        gr.addColorStop(0, rgba(col, 0.55)); gr.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = on ? col : rgba(col, 0.13);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = on ? rgba("#ffffff", 0.5) : rgba(col, 0.35); ctx.lineWidth = 1.2; ctx.stroke();
    }
    // yaya figürleri (basit çizim): duran ve yürüyen
    function figure(ctx, x, y, s, walking, col) {
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1.6, s * 0.16); ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(x, y - s * 0.62, s * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      if (walking) {
        ctx.moveTo(x, y - s * 0.42); ctx.lineTo(x - s * 0.04, y + s * 0.08);
        ctx.moveTo(x - s * 0.04, y + s * 0.08); ctx.lineTo(x - s * 0.3, y + s * 0.55);
        ctx.moveTo(x - s * 0.04, y + s * 0.08); ctx.lineTo(x + s * 0.28, y + s * 0.55);
        ctx.moveTo(x, y - s * 0.3); ctx.lineTo(x - s * 0.3, y - s * 0.02);
        ctx.moveTo(x, y - s * 0.3); ctx.lineTo(x + s * 0.3, y - s * 0.1);
      } else {
        ctx.moveTo(x, y - s * 0.42); ctx.lineTo(x, y + s * 0.1);
        ctx.moveTo(x, y + s * 0.1); ctx.lineTo(x - s * 0.12, y + s * 0.56);
        ctx.moveTo(x, y + s * 0.1); ctx.lineTo(x + s * 0.12, y + s * 0.56);
        ctx.moveTo(x, y - s * 0.32); ctx.lineTo(x - s * 0.2, y + s * 0.08);
        ctx.moveTo(x, y - s * 0.32); ctx.lineTo(x + s * 0.2, y + s * 0.08);
      }
      ctx.stroke();
    }
    function drawDiag(cur, w1) {
      if (!ds || !ds.w) return;
      const { ctx, w, h: H } = ds;
      ctx.clearRect(0, 0, w, H);
      const P = nodePos(w, H);
      const r = Math.max(26, Math.min(44, Math.min(w, H) * 0.115));
      const now = performance.now();
      // kenarlar
      const edges = [["00", "01"], ["01", "11"], ["11", "10"], ["10", "00"]];
      const active = anim && now - anim.t0 < anim.dur ? anim : null;
      edges.forEach(([a, b]) => {
        const E = edgeCurve(P, a, b, r);
        const hot = active && active.from === a && active.to === b;
        const col = hot ? C.copper2 : rgba(C.silk, 0.55);
        ctx.strokeStyle = col; ctx.lineWidth = hot ? 3 : 1.8;
        ctx.beginPath(); ctx.moveTo(...E.s); ctx.quadraticCurveTo(...E.c, ...E.e); ctx.stroke();
        arrowHead(ctx, E, col, 9);
        // etiket
        const m = qpt(E, 0.5);
        const lab = a === "11" ? S.lbW1 : S.lbClock;
        ctx.font = `600 ${Math.max(10, r * 0.3)}px ${FONT.display}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const ox = m[0] - P.cx, oy = m[1] - P.cy, ol = Math.hypot(ox, oy) || 1;
        const lx = m[0] + (ox / ol) * 13, ly = m[1] + (oy / ol) * 11;
        ctx.fillStyle = a === "11" ? (w1 ? C.copper2 : C.muted) : C.muted;
        ctx.fillText(lab, lx, ly);
        if (hot) { const t = ease(Math.min(1, (now - active.t0) / active.dur)); const [px, py] = qpt(E, t); ctx.fillStyle = C.amp; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill(); }
      });
      // yeşilde kalma döngüsü (W = 0)
      {
        const [x, y] = P["11"];
        const lr = r * 0.62, lx = x + r * 0.95, ly = y + r * 0.62;
        const hot = active && active.from === "11" && active.to === "11";
        const col = hot ? C.copper2 : rgba(C.silk, 0.55);
        ctx.strokeStyle = col; ctx.lineWidth = hot ? 3 : 1.8;
        ctx.beginPath(); ctx.arc(lx, ly, lr, -0.95 * Math.PI, 0.55 * Math.PI); ctx.stroke();
        const ea = 0.55 * Math.PI, ex = lx + lr * Math.cos(ea), ey = ly + lr * Math.sin(ea);
        arrowHead(ctx, { e: [ex, ey], c: [ex + 12, ey - 4] }, col, 9);
        ctx.fillStyle = !w1 ? C.copper2 : C.muted;
        ctx.font = `600 ${Math.max(10, r * 0.3)}px ${FONT.display}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(S.lbW0, lx + lr * 0.3, ly + lr + 4);
      }
      // düğümler
      ORDER.forEach((code) => {
        const [x, y] = P[code];
        const on = code === cur;
        const rr = evalRow(+code[0], +code[1], 0);
        if (on) {
          const gr = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 1.7);
          gr.addColorStop(0, rgba(C.copper2, 0.35)); gr.addColorStop(1, rgba(C.copper2, 0));
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = on ? "#1c5240" : C.mask2;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = on ? C.copper2 : rgba(C.silk, 0.7); ctx.lineWidth = on ? 3 : 1.8; ctx.stroke();
        // küçük lamba noktaları
        const lr = Math.max(3.2, r * 0.11);
        [["k", LAMP.r], ["s", LAMP.y], ["y", LAMP.g]].forEach(([k, col], i) => lamp(ctx, x + (i - 1) * lr * 2.8, y - r * 0.45, lr, col, !!rr[k]));
        ctx.fillStyle = C.silk; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = `700 ${Math.max(10, r * 0.3)}px ${FONT.display}`;
        if ("fontStretch" in ctx) ctx.fontStretch = "condensed";
        ctx.fillText(NAMES[code], x, y + r * 0.05);
        if ("fontStretch" in ctx) ctx.fontStretch = "normal";
        ctx.font = `700 ${Math.max(10, r * 0.32)}px ${FONT.mono}`;
        ctx.fillStyle = on ? C.copper2 : C.silk2;
        ctx.fillText(code, x, y + r * 0.48);
      });
      // ortada: araç lambası + yaya lambası (devrenin çıkışlarından)
      const k = val("k") === 1, sY = val("s") === 1, yG = val("y") === 1, walk = val("yaya") === 1;
      const avail = Math.min(2 * P.dx - 2 * r - 26, 2 * P.dy + r * 0.2);
      const s = Math.max(9, Math.min(17, avail / 6.4));
      const cx = P.cx, cy = P.cy;
      const hw = s * 1.5, hh = s * 4.9;
      const carX = cx - s * 1.9, pedX = cx + s * 1.9;
      ctx.fillStyle = "#0a1712"; ctx.strokeStyle = rgba(C.silk, 0.35); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.roundRect(carX - hw, cy - hh / 2, hw * 2, hh, 6); ctx.fill(); ctx.stroke();
      lamp(ctx, carX, cy - s * 1.55, s, LAMP.r, k); lamp(ctx, carX, cy, s, LAMP.y, sY); lamp(ctx, carX, cy + s * 1.55, s, LAMP.g, yG);
      const ph = hh;
      ctx.fillStyle = "#0a1712";
      ctx.beginPath(); ctx.roundRect(pedX - hw, cy - hh / 2, hw * 2, ph, 6); ctx.fill(); ctx.stroke();
      const py1 = cy - s * 1.15, py2 = cy + s * 1.15;
      lamp(ctx, pedX, py1, s, LAMP.r, !walk); lamp(ctx, pedX, py2, s, LAMP.g, walk);
      figure(ctx, pedX, py1, s * 1.15, false, !walk ? "#3a0c0c" : rgba(LAMP.r, 0.45));
      figure(ctx, pedX, py2, s * 1.15, true, walk ? "#063018" : rgba(LAMP.g, 0.45));
      // BEKLEYİN işareti (W = 1)
      const by = cy + hh / 2 + s * 0.95;
      ctx.font = `800 ${Math.max(9, s * 0.62)}px ${FONT.display}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const bw = ctx.measureText(S.waitSign).width + 10;
      ctx.fillStyle = w1 ? rgba(C.gold, 0.9) : rgba(C.gold, 0.08);
      ctx.beginPath(); ctx.roundRect(pedX - bw / 2, by - s * 0.55, bw, s * 1.1, 3); ctx.fill();
      ctx.fillStyle = w1 ? "#1a1406" : rgba(C.gold, 0.35); ctx.fillText(S.waitSign, pedX, by + 0.5);
      // saat göstergesi
      const ca = Math.max(0, 1 - (now - clkFlash) / 350);
      ctx.font = `600 11px ${FONT.mono}`; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillStyle = ca > 0 ? rgba(C.copper2, 0.4 + 0.6 * ca) : C.muted;
      ctx.fillText(S.edgeTick, w - 12, 16);
      ctx.fillStyle = val("clk") === 1 ? C.v1 : C.v0;
      ctx.beginPath(); ctx.arc(w - 12 - ctx.measureText(S.edgeTick).width - 9, 16, 4, 0, Math.PI * 2); ctx.fill();
    }
    ds = canvas(dcv, () => drawDiag(code(), val("w") === 1));
    const code = () => { const q1 = val("q1"), q0 = val("q0"); return (q1 === 1 ? "1" : q1 === 0 ? "0" : "x") + (q0 === 1 ? "1" : q0 === 0 ? "0" : "x"); };
    let lastRow = null, lastW = null;
    function frame() {
      const c = code(), w1 = val("w") === 1;
      const ck = val("clk");
      if (ck === 1 && lastClk !== 1) {
        clkFlash = performance.now();
        // saat kenarı: yeşilde kalındıysa döngüyü canlandır
        if (c === "11" && last === "11") anim = { from: "11", to: "11", t0: performance.now(), dur: 520 };
      }
      lastClk = ck;
      if (last && c !== last && ORDER.includes(c)) anim = { from: last, to: c, t0: performance.now(), dur: 520 };
      last = c;
      // tablo satırı
      const key = c + (c === "11" ? (w1 ? "1" : "0") : "");
      if (key !== lastRow || w1 !== lastW) {
        rows.forEach((tr) => tr.classList.toggle("cur", tr._code === c && (tr._w == null || tr._w === (w1 ? 1 : 0))));
        req.textContent = w1 ? S.reqOn : S.reqOff;
        req.classList.toggle("on", w1);
        lastRow = key; lastW = w1;
      }
      drawDiag(c, w1);
    }
    frame();
    return { enter() { sch.start(); }, leave() { sch.stop(); clearTimeout(relT); relT = null; if (sch.part("P").value) sch.set("P", "value", 0); }, sch };
  };
  G["trafik-lambasi"] = [
    { slide: "label:" + S.clockF, to: 2 }, { wait: 2600 },
    { click: "=" + S.ped }, { wait: 900 },
  ];
  window.GUIDE_TARGETS["trafik-lambasi"] = "css:.c13b-traf .controls .btn.primary";

  /* ======================================================================
     2) Saat sinyali: 555 astable
     ====================================================================== */
  Demos.c13b555 = function (stage) {
    const def = clone(CIRCUITS.c13b555);
    const U = def.parts.find((p) => p.type === "c13b555");
    U.q = 1;
    const schPane = h("div.pane.c13b-555sch", h("span.pane-title", S.schTitle555));
    const mF = meter(S.mF), mFf = meter(S.mFf), mD = meter(S.mD), mDf = meter(S.mDf), mHL = meter(S.mHL);
    const chip = h("span.chip.c13b-time");
    const side = h("div.c13b-side", h("div.meters", mF, mFf, mD, mDf, mHL), chip);
    const top = h("div.c13b-555top", schPane, side);
    const sbox = h("div.c13b-scope", h("div.c13b-ptitle", S.scopeTitle));
    const body = h("div.split.c13b-555", top, sbox);
    stage.append(body);

    let meas = null;
    const sc = Scope(sbox, {
      channels: [{ name: "KN1", vdiv: 1, pos: -6.2 }, { name: "KN2", vdiv: 5, pos: 0.6 }],
      tdiv: 0.1, trigger: { ch: 1, level: 4.5, edge: "rise", mode: "auto" }, pre: 0.08, style: { flex: "1" },
      overlay(ctx, api, g) {
        if (api.t0 == null) return;
        const v = sch.part("U1")._v;
        if (!v) return;
        const ch = api.channels[0], x0 = g.m, x1 = g.m + g.gw;
        const ya = api.toY(v.a, ch), yb = api.toY(v.b, ch);
        dashH(ctx, x0, x1, ya, rgba(C.copper2, 0.75)); dashH(ctx, x0, x1, yb, rgba(C.copper2, 0.75));
        const right = x1 - 98;
        tag(ctx, S.thrHi + " " + fmt(v.a, "V", 2), right, ya - 10, C.copper2);
        tag(ctx, S.thrLo + " " + fmt(v.b, "V", 2), right, yb - 10, C.copper2);
      },
    });
    const sch = Schematic(schPane, def, { maxUnit: 24, tick() { sc.draw(); } });
    const p = sch.part("U1");
    p._vmax = def.vRange[1];
    // 555 bloğunun sekiz pimindeki toplam akım (akım noktaları için)
    function patch() {
      const sim = sch.sim, orig = sim.terminals;
      const id = p.id;
      sim.terminals = (eid) => {
        if (eid !== id) return orig(eid);
        const d = orig(id)[0], r1 = orig(id + ".r1")[0], r2 = orig(id + ".r2")[0], r3 = orig(id + ".r3")[0];
        const hi = orig(id + ".hi")[0], lo = orig(id + ".lo")[0];
        // sıra: gnd, trg, out, rst, ctl, thr, dis, vcc (elPins)
        return [-d - r3 - lo, 0, -hi + lo, 0, -r1 + r2, 0, d, r1 + hi];
      };
    }
    patch();
    const nets = {
      vcc: sch.netOf("U1", "vcc"), a: sch.netOf("U1", "ctl"), b: "U1_k", thr: sch.netOf("U1", "thr"),
      trg: sch.netOf("U1", "trg"), rst: sch.netOf("U1", "rst"), out: sch.netOf("U1", "out"),
    };
    const apply = () => {
      const s = sch.sim, q = p.q ? 1 : 0;
      s.set("U1", "closed", !q); s.set("U1.hi", "closed", !!q); s.set("U1.lo", "closed", !q);
      // anahtarlar değişti: aynı anda (1 ns sonra) yeniden çöz, gösterilen gerilim ve akımlar tutarlı olsun
      s.step(1e-9);
    };

    // ölçüm: çıkışın yükselen kenarları arası süre (benzetimden)
    let lastRise = 0, highT = null, skip = 0;
    const resetMeas = (sk, t0) => { lastRise = t0 ?? null; highT = null; meas = null; skip = sk; };
    function edge(q, t) {
      if (q === 1) {
        if (lastRise != null && highT != null) {
          if (skip > 0) skip--;
          else { const P = t - lastRise; meas = { P, high: highT, low: P - highT }; }
        }
        lastRise = t; highT = null;
      } else if (lastRise != null) highT = t - lastRise;
    }
    sch.on("step", (t) => {
      const s = sch.sim;
      const a = s.v(nets.a), b = s.v(nets.b), vth = s.v(nets.thr), vtr = s.v(nets.trg), vr = s.v(nets.rst), vcc = s.v(nets.vcc);
      // ideal karşılaştırıcılar ve SR flip-flop (tetik baskın, RESET < 0,7 V çıkışı sıfırlar)
      const Sx = vtr < b ? 1 : 0, Rx = vth > a ? 1 : 0;
      let q = p.q ? 1 : 0;
      if (vr < 0.7) q = 0; else if (Sx) q = 1; else if (Rx) q = 0;
      p._v = { a, b, S: Sx, R: Rx, q, vcc };
      if (q !== (p.q ? 1 : 0)) { p.q = q; apply(); edge(q, t); }
      sc.push(t, [vth, s.v(nets.out)]);
    });

    // değerler ve zaman ölçeği
    let RA = 10000, RB = 47000, Cv = 10e-6, Vcc = 9;
    const TD = [...Scope.TSEQ, 2, 5];
    function retime() {
      // adım ve hız seçimi: periyodun formülle kabaca tahmini yalnız benzetim ayarı içindir
      const Pest = Math.LN2 * (RA + 2 * RB) * Cv;
      def.tran.h = Pest / 800;
      const Pd = Math.min(2.5, Math.max(0.4, Pest));
      def.tran.rate = Pest / Pd;
      const want = (Pest * 2.6) / 10;
      const td = TD.find((x) => x >= want * 0.999) || TD[TD.length - 1];
      if (td !== sc.tdiv) sc.setTdiv(td);
      const k = def.tran.rate;
      chip.textContent = Math.abs(k - 1) < 1e-9 ? S.realTime : k < 1 ? S.slower(fmtK(1 / k)) : S.faster(fmtK(k));
    }
    const fmtK = (x) => (x >= 100 ? Math.round(x).toLocaleString("tr-TR") : num(x, x < 10 ? 1 : 0));
    function show() {
      const ff = 1.44 / ((RA + 2 * RB) * Cv), df = (RA + RB) / (RA + 2 * RB);
      mFf.set(fmt(ff, "Hz")); mDf.set("%" + num(df * 100, 1));
      if (meas) {
        mF.set(fmt(1 / meas.P, "Hz")); mD.set("%" + num((meas.high / meas.P) * 100, 1));
        mHL.set(fmt(meas.high, "s", 2) + " / " + fmt(meas.low, "s", 2));
      } else { mF.set(S.measuring); mD.set(S.measuring); mHL.set("—"); }
    }
    const rA = slider({ label: S.ra, min: 1000, max: 100000, step: 100, value: RA, log: true, fmt: (v) => fmt(v, "Ω"), oninput: (v) => { RA = v; retime(); sch.set("RA", "R", v); resetMeas(0); show(); } });
    const rB = slider({ label: S.rb, min: 1000, max: 100000, step: 100, value: RB, log: true, fmt: (v) => fmt(v, "Ω"), oninput: (v) => { RB = v; retime(); sch.set("RB", "R", v); resetMeas(0); show(); } });
    const cS = slider({ label: S.cap, min: 1e-7, max: 1e-4, step: 1e-9, value: Cv, log: true, fmt: (v) => fmt(v, "F"), oninput: (v) => { Cv = v; retime(); sch.set("C", "C", v); resetMeas(0); show(); } });
    // KN1 ölçeği: ⅓–⅔ Vcc aralığı ekranın alt yarısında kalsın
    const scale1 = () => { const vd = Vcc <= 6 ? 0.5 : 1; sc.channels[0].pos = -(Vcc / 3) / vd - 3.2; sc.setVdiv(0, vd); };
    const vSeg = seg([[5, "5 V"], [9, "9 V"], [12, "12 V"]], Vcc, (v) => { Vcc = v; sch.set("V", "V", v); scale1(); resetMeas(0); show(); }, S.vcc);
    const innerBtn = btn(S.inner, () => { p.inner = !p.inner; innerBtn.classList.toggle("on", !!p.inner); innerBtn.textContent = p.inner ? S.outer : S.inner; sch.draw(); });
    // baştan: kondansatör ⅓ Vcc'den başlar (ilk periyot da temiz bir periyottur)
    const restart = () => { sch.sim.set("C", "v0", Vcc / 3); sch.sim.set("CC", "v0", (2 * Vcc) / 3); sch.reset(); p.q = 1; apply(); sc.clear(); resetMeas(0, sch.sim.t); show(); };
    const resetBtn = btn(S.restart, restart);
    stage.append(h("div.controls.c13b-ctl", rA, rB, cS, h("label", S.vcc, vSeg), innerBtn, resetBtn));
    retime();
    restart();
    sch.on("change", show);
    show();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["saat-555"] = [
    { click: "=" + S.inner }, { wait: 1800 },
    { slide: "label:" + S.rb, to: 4700 }, { wait: 1500 },
    { slide: "label:" + S.cap, to: 4.7e-6 }, { wait: 800 },
  ];
})();
