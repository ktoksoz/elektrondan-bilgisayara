/* Şema bileşeni: bütün devre çizimleri buradan geçer.
   - Devre veri olarak tanımlanır: parçalar (ızgara koordinatı, dönüş) + teller (nokta listeleri).
   - Düğümler (net'ler) çizilen tel geometrisinden çıkarılır; çözücünün devre listesi de bu
     düğümlerden kurulur. Yani ekranda çizilen devre ile hesaplanan devre aynı veridir.
   - Analog (circuit.js) ve mantık (logic.js) devreleri aynı çizim diliyle gösterilir.
   - Teller gerilime göre renklenir (L.vcolor), akım tel üzerinde akan noktalarla gösterilir
     (hız akımla orantılı, yön geleneksel akım yönü). Fareyle tele/parçaya gelince multimetre balonu.
   Semboller: dirençler IEC kutu, kapılar ANSI/IEEE ayırt edici biçim (style:"iec" ile dikdörtgen). */
(function () {
  const { C, FONT, h, vcolor, lcolor, rgba, canvas, loop } = L;
  const T = STR.sch;
  const fmt = (v, u, d) => Circuit.fmt(v, u, d);

  /* ---------------- geometri ---------------- */
  // dönüş saat yönünde (ekranda y aşağı): 90 = aşağı bakar
  function rot([x, y], r = 0, flip = false) {
    if (flip) y = -y;
    switch (((r % 360) + 360) % 360) {
      case 90: return [-y, x];
      case 180: return [-x, -y];
      case 270: return [y, -x];
      default: return [x, y];
    }
  }
  const key = (p) => Math.round(p[0] * 2) / 2 + "," + Math.round(p[1] * 2) / 2;
  const addp = (a, b) => [a[0] + b[0], a[1] + b[1]];

  /* ---------------- parça kütüphanesi ---------------- */
  // pins: yerel koordinatlar; el(p, net) → çözücü bileşenleri; draw(g, p, st); paths: akım noktası yolları
  const TWO = { a: [-2, 0], b: [2, 0] };
  const twoPaths = [{ term: 0, pts: [[-2, 0], [0, 0]] }, { term: 1, pts: [[2, 0], [0, 0]] }];
  const PARTS = {};

  function valueLabel(p) {
    switch (p.type) {
      case "resistor": return fmt(p.R, "Ω");
      case "pot": return fmt(p.R, "Ω");
      case "battery": case "vdc": return fmt(p.V, "V");
      case "capacitor": return fmt(p.C, "F");
      case "inductor": return fmt(p.L, "H");
      case "isource": return fmt(p.I, "A");
      default: return "";
    }
  }

  PARTS.resistor = {
    hide: 1.0, pins: TWO, paths: twoPaths, box: [-1.2, -0.6, 1.2, 0.6],
    el: (p, n) => [{ type: "R", id: p.id, n: [n("a"), n("b")], R: p.burnt ? 1e10 : p.R }],
    draw(g, p, st) {
      g.lead([-2, 0], [-1, 0], "a"); g.lead([1, 0], [2, 0], "b");
      const heat = st.heat(p);
      if (p.style === "ansi") {
        g.path([[-1, 0], [-0.83, -0.4], [-0.5, 0.4], [-0.17, -0.4], [0.17, 0.4], [0.5, -0.4], [0.83, 0.4], [1, 0]], { stroke: heat.stroke });
        if (heat.a > 0) g.glow(0, 0, 1.4, heat);
      } else {
        g.rect(-1, -0.36, 2, 0.72, { fill: heat.fill, stroke: heat.stroke });
        if (heat.a > 0) g.glow(0, 0, 1.5, heat);
      }
      if (p.burnt) g.char(0, 0);
    },
  };
  PARTS.pot = {
    hide: 1.0, pins: { a: [-2, 0], b: [2, 0], w: [0, -2] }, box: [-1.2, -2, 1.2, 0.6],
    paths: [{ term: 0, pts: [[-2, 0], [0, 0]] }, { term: 2, pts: [[2, 0], [0, 0]] }, { term: 1, pts: [[0, -2], [0, -0.5]] }],
    el: (p, n) => [{ type: "POT", id: p.id, n: [n("a"), n("w"), n("b")], R: p.R, pos: p.pos ?? 0.5 }],
    draw(g, p, st) {
      g.lead([-2, 0], [-1, 0], "a"); g.lead([1, 0], [2, 0], "b");
      g.rect(-1, -0.36, 2, 0.72, { stroke: C.silk });
      const x = -0.85 + 1.7 * (p.pos ?? 0.5);
      g.lead([0, -2], [0, -1.3], "w");
      g.path([[0, -1.3], [x, -1.3], [x, -0.45]], { stroke: st.netColor(p, "w"), width: 2.4 });
      g.arrow([x, -0.95], [x, -0.42], st.netColor(p, "w"));
    },
  };
  // pil / DC kaynak: a = artı, b = eksi
  PARTS.battery = {
    hide: 0.3, pins: TWO, paths: twoPaths, box: [-0.8, -1, 0.8, 1],
    el: (p, n) => [{ type: "V", id: p.id, n: [n("a"), n("b")], V: p.V, R: p.Rint || 0 }],
    draw(g, p) {
      g.lead([-2, 0], [-0.22, 0], "a"); g.lead([0.22, 0], [2, 0], "b");
      g.line([-0.22, -0.95], [-0.22, 0.95], { stroke: C.silk, width: 2.4 });
      g.line([0.22, -0.48], [0.22, 0.48], { stroke: C.silk, width: 5 });
      g.text("+", [-0.75, -0.7], { size: 0.62, color: C.silk2 });
    },
  };
  PARTS.vac = {
    hide: 1.0, pins: TWO, paths: twoPaths, box: [-1, -1, 1, 1],
    el: (p, n) => [{ type: "V", id: p.id, n: [n("a"), n("b")], V: 0, wave: p.wave }],
    draw(g, p) {
      g.lead([-2, 0], [-1, 0], "a"); g.lead([1, 0], [2, 0], "b");
      g.circle(0, 0, 1, { stroke: C.silk });
      const pts = [];
      const w = p.wave || {};
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, x = -0.6 + 1.2 * t;
        const y = w.type === "square" ? (t < 0.5 ? -0.35 : 0.35) : w.type === "tri" ? 0.35 - 0.7 * Math.abs(2 * t - 1) : -0.35 * Math.sin(2 * Math.PI * t);
        pts.push([x, y]);
      }
      if (w.type === "square") pts.splice(12, 0, [0, -0.35], [0, 0.35]);
      g.path(pts, { stroke: C.silk, width: 1.8 });
      g.text("+", [-1.35, -0.75], { size: 0.55, color: C.silk2 });
    },
  };
  PARTS.isource = {
    hide: 1.0, pins: TWO, paths: twoPaths, box: [-1, -1, 1, 1],
    el: (p, n) => [{ type: "I", id: p.id, n: [n("a"), n("b")], I: p.I }],
    draw(g) {
      g.lead([-2, 0], [-1, 0], "a"); g.lead([1, 0], [2, 0], "b");
      g.circle(0, 0, 1, { stroke: C.silk });
      g.line([-0.55, 0], [0.4, 0], { stroke: C.silk, width: 2 });
      g.arrow([-0.2, 0], [0.6, 0], C.silk);
    },
  };
  PARTS.capacitor = {
    hide: 0.3, pins: TWO, paths: twoPaths, box: [-0.6, -1, 0.6, 1],
    el: (p, n) => [{ type: "C", id: p.id, n: [n("a"), n("b")], C: p.C, v0: p.v0 || 0 }],
    draw(g, p) {
      g.lead([-2, 0], [-0.22, 0], "a"); g.lead([0.22, 0], [2, 0], "b");
      g.line([-0.22, -0.85], [-0.22, 0.85], { stroke: C.silk, width: 2.6 });
      if (p.polar) {
        g.arcPath(1.1, 0, 1.3, Math.PI * 0.82, Math.PI * 1.18, { stroke: C.silk, width: 2.6 });
        g.text("+", [-0.7, -0.75], { size: 0.55, color: C.silk2 });
      } else g.line([0.22, -0.85], [0.22, 0.85], { stroke: C.silk, width: 2.6 });
    },
  };
  PARTS.inductor = {
    hide: 1.25, pins: TWO, paths: twoPaths, box: [-1.3, -0.7, 1.3, 0.3],
    el: (p, n) => [{ type: "L", id: p.id, n: [n("a"), n("b")], L: p.L, Rs: p.Rs || 0, i0: p.i0 || 0 }],
    draw(g) {
      g.lead([-2, 0], [-1.2, 0], "a"); g.lead([1.2, 0], [2, 0], "b");
      for (let k = 0; k < 4; k++) g.arcPath(-0.9 + 0.6 * k, 0, 0.3, Math.PI, 2 * Math.PI, { stroke: C.silk, width: 2.2 });
    },
  };
  function diodeBody(g, p, st, kind) {
    g.lead([-2, 0], [-0.55, 0], "a"); g.lead([0.55, 0], [2, 0], "b");
    const fill = kind === "led" ? st.ledFill(p) : C.mask2;
    g.poly([[-0.55, -0.6], [-0.55, 0.6], [0.55, 0]], { fill, stroke: C.silk });
    if (kind === "zener") g.path([[0.35, -0.75], [0.55, -0.6], [0.55, 0.6], [0.75, 0.75]], { stroke: C.silk, width: 2.4 });
    else g.line([0.55, -0.62], [0.55, 0.62], { stroke: C.silk, width: 2.4 });
  }
  PARTS.diode = {
    hide: 0.55, pins: TWO, paths: twoPaths, box: [-0.8, -0.8, 0.8, 0.8],
    el: (p, n) => [{ type: "D", id: p.id, n: [n("a"), n("b")], ...(p.model || Circuit.models.si) }],
    draw: (g, p, st) => diodeBody(g, p, st, "diode"),
  };
  PARTS.zener = {
    hide: 0.55, pins: TWO, paths: twoPaths, box: [-0.8, -0.8, 0.8, 0.8],
    el: (p, n) => [{ type: "D", id: p.id, n: [n("a"), n("b")], ...Circuit.zener(p.Vz || 5.1) }],
    draw: (g, p, st) => diodeBody(g, p, st, "zener"),
  };
  PARTS.led = {
    hide: 0.55, pins: TWO, paths: twoPaths, box: [-0.8, -1.4, 1.2, 0.8],
    el(p, n) {
      const c = Circuit.LED[p.color || "kirmizi"];
      const prm = Circuit.led(p.Vf || c.Vf);
      if (p.burnt) prm.Rs = 1e10;
      return [{ type: "D", id: p.id, n: [n("a"), n("b")], ...prm }];
    },
    draw(g, p, st) {
      diodeBody(g, p, st, "led");
      const col = (Circuit.LED[p.color || "kirmizi"] || {}).color || C.v1;
      const on = st.ledLevel(p);
      g.arrow([0.05, -0.75], [0.55, -1.3], on > 0.05 ? col : C.silk2);
      g.arrow([0.45, -0.6], [0.95, -1.15], on > 0.05 ? col : C.silk2);
      if (on > 0.02 && !p.burnt) g.glow(0, 0, 1.2 + 1.6 * on, { color: col, a: Math.min(0.85, on) });
      if (p.burnt) g.char(0, 0);
    },
  };
  PARTS.lamp = {
    hide: 0.85, pins: TWO, paths: twoPaths, box: [-1, -1, 1, 1],
    el: (p, n) => [{ type: "R", id: p.id, n: [n("a"), n("b")], R: p.burnt ? 1e10 : p.R || 50 }],
    draw(g, p, st) {
      g.lead([-2, 0], [-0.85, 0], "a"); g.lead([0.85, 0], [2, 0], "b");
      const lv = st.powerLevel(p);
      if (lv > 0.02 && !p.burnt) g.glow(0, 0, 1 + 2.2 * lv, { color: "#ffd98a", a: Math.min(0.9, lv) });
      g.circle(0, 0, 0.85, { stroke: C.silk, fill: lv > 0.02 ? rgba("#ffd98a", Math.min(0.8, lv)) : C.mask2 });
      g.line([-0.6, -0.6], [0.6, 0.6], { stroke: C.silk, width: 1.8 }); g.line([-0.6, 0.6], [0.6, -0.6], { stroke: C.silk, width: 1.8 });
    },
  };
  PARTS.motor = {
    hide: 1.0, pins: TWO, paths: twoPaths, box: [-1.1, -1.1, 1.1, 1.1],
    el: (p, n) => [{ type: "R", id: p.id, n: [n("a"), n("b")], R: p.R || 20 }],
    draw(g, p, st) {
      g.lead([-2, 0], [-1, 0], "a"); g.lead([1, 0], [2, 0], "b");
      g.circle(0, 0, 1, { stroke: C.silk });
      const a = st.spin(p);
      g.line([0, 0], [0.75 * Math.cos(a), 0.75 * Math.sin(a)], { stroke: rgba(C.copper2, 0.8), width: 2 });
      g.text("M", [0, 0.05], { size: 0.9, color: C.silk, weight: 800 });
    },
  };
  PARTS.ldr = {
    hide: 1.2, pins: TWO, paths: twoPaths, box: [-1.3, -1.6, 1.3, 1.3],
    el: (p, n) => [{ type: "R", id: p.id, n: [n("a"), n("b")], R: p.R }],
    draw(g) {
      g.lead([-2, 0], [-0.8, 0], "a"); g.lead([0.8, 0], [2, 0], "b");
      g.circle(0, 0, 1.2, { stroke: C.silk });
      g.rect(-0.8, -0.3, 1.6, 0.6, { stroke: C.silk });
      g.arrow([-1.3, -1.6], [-0.55, -0.75], C.gold); g.arrow([-0.6, -1.75], [0.15, -0.9], C.gold);
    },
  };
  PARTS.fuse = {
    hide: 1.0, pins: TWO, paths: twoPaths, box: [-1, -0.5, 1, 0.5],
    el: (p, n) => [{ type: "R", id: p.id, n: [n("a"), n("b")], R: p.burnt ? 1e10 : 0.05 }],
    draw(g, p) {
      g.lead([-2, 0], [-1, 0], "a"); g.lead([1, 0], [2, 0], "b");
      g.rect(-1, -0.32, 2, 0.64, { stroke: C.silk });
      if (p.burnt) { g.line([-1, 0], [-0.25, 0.1], { stroke: C.silk2, width: 1.6 }); g.line([0.25, -0.1], [1, 0], { stroke: C.silk2, width: 1.6 }); }
      else g.line([-1, 0], [1, 0], { stroke: C.silk, width: 1.6 });
    },
  };
  // ölçü aletleri
  PARTS.ammeter = {
    hide: 0.9, pins: TWO, paths: twoPaths, box: [-1, -1, 1, 1], meter: "A",
    el: (p, n) => [{ type: "V", id: p.id, n: [n("a"), n("b")], V: 0 }],
    draw(g, p) {
      g.lead([-2, 0], [-0.9, 0], "a"); g.lead([0.9, 0], [2, 0], "b");
      g.circle(0, 0, 0.9, { stroke: C.silk, fill: C.mask3 });
      g.text("A", [0, 0.04], { size: 0.95, color: C.silk, weight: 800 });
    },
  };
  PARTS.voltmeter = {
    pins: TWO, paths: [], box: [-1, -1, 1, 1], meter: "V",
    el: (p, n) => [{ type: "R", id: p.id, n: [n("a"), n("b")], R: 1e7 }],
    draw(g) {
      g.lead([-2, 0], [-0.9, 0], "a"); g.lead([0.9, 0], [2, 0], "b");
      g.circle(0, 0, 0.9, { stroke: C.silk, fill: C.mask3 });
      g.text("V", [0, 0.04], { size: 0.95, color: C.silk, weight: 800 });
    },
  };
  // anahtar: tıklanınca açılır/kapanır
  PARTS.switch = {
    pins: TWO, paths: twoPaths, box: [-1.3, -1.2, 1.3, 0.5], interactive: "toggle",
    el: (p, n) => [{ type: "S", id: p.id, n: [n("a"), n("b")], closed: !!p.closed, ron: p.ron ?? 1e-3, roff: p.roff ?? 1e12 }],
    draw(g, p) {
      g.lead([-2, 0], [-1, 0], "a"); g.lead([1, 0], [2, 0], "b");
      g.circle(-1, 0, 0.16, { fill: C.silk }); g.circle(1, 0, 0.16, { fill: C.silk });
      const end = p.closed ? [1, -0.05] : [0.75, -1.05];
      g.line([-1, 0], end, { stroke: C.copper2, width: 2.8 });
    },
  };
  PARTS.button = {
    pins: TWO, paths: twoPaths, box: [-1.3, -1.4, 1.3, 0.5], interactive: "momentary",
    el: (p, n) => [{ type: "S", id: p.id, n: [n("a"), n("b")], closed: !!p.closed, ron: p.ron ?? 1e-3, roff: p.roff ?? 1e12 }],
    draw(g, p) {
      g.lead([-2, 0], [-1, 0], "a"); g.lead([1, 0], [2, 0], "b");
      g.circle(-1, 0, 0.16, { fill: C.silk }); g.circle(1, 0, 0.16, { fill: C.silk });
      const y = p.closed ? -0.1 : -0.6;
      g.line([-1.1, y], [1.1, y], { stroke: C.copper2, width: 2.8 });
      g.line([0, y], [0, y - 0.7], { stroke: C.copper2, width: 2.2 });
    },
  };
  // toprak ve besleme rayı
  PARTS.ground = {
    pins: { a: [0, 0] }, paths: [], box: [-0.8, 0, 0.8, 1.3], fixedNet: "0",
    el: () => [],
    draw(g) {
      g.lead([0, 0], [0, 0.6], "a");
      g.line([-0.75, 0.6], [0.75, 0.6], { stroke: C.silk, width: 2.2 });
      g.line([-0.48, 0.88], [0.48, 0.88], { stroke: C.silk, width: 2.2 });
      g.line([-0.2, 1.16], [0.2, 1.16], { stroke: C.silk, width: 2.2 });
    },
  };
  PARTS.rail = {
    pins: { a: [0, 0] }, paths: [{ term: 0, pts: [[0, 0], [0, -0.7]] }], box: [-1, -1.6, 1, 0],
    el: (p, n, first) => (first ? [{ type: "V", id: p.id, n: [n("a"), "0"], V: p.V }] : []),
    draw(g, p) {
      g.lead([0, 0], [0, -0.7], "a");
      g.line([-0.7, -0.7], [0.7, -0.7], { stroke: C.silk, width: 2.4 });
      g.text(p.text || (p.V >= 0 ? "+" : "") + Circuit.fmt(p.V, "V"), [0, -1.25], { size: 0.62, color: C.silk, weight: 650, rot: true });
    },
  };
  // ağ etiketi: aynı adlı etiketler aynı düğümdür
  PARTS.label = {
    pins: { a: [0, 0] }, paths: [], box: [-0.5, -0.5, 2.5, 0.5],
    el: () => [],
    draw(g, p, st) {
      const c = st.netColor(p, "a");
      g.circle(0, 0, 0.18, { fill: c });
      g.text(p.text || p.net, [0.4, 0], { size: 0.6, color: C.silk, align: "left", weight: 650, rot: true });
    },
  };
  // osiloskop probu
  PARTS.probe = {
    pins: { a: [0, 0] }, paths: [], box: [-0.4, -0.4, 2.4, 0.4],
    el: () => [],
    draw(g, p) {
      const col = p.color || C.ch1;
      g.circle(0, 0, 0.22, { fill: col });
      g.text(p.text || "KN1", [0.45, 0], { size: 0.58, color: col, align: "left", weight: 750, rot: true });
    },
  };
  PARTS.text = {
    pins: {}, paths: [], box: [-0.5, -0.5, 0.5, 0.5], el: () => [],
    draw(g, p) { g.text(p.text, [0, 0], { size: p.size || 0.6, color: p.color || C.silk2, align: p.align || "center", rot: true, weight: p.weight || 500 }); },
  };

  /* transistörler. BJT: b sol, c üst, e alt (NPN). PNP'de e üst, c alt. */
  function bjtDraw(g, p, st, pnp) {
    const top = pnp ? "e" : "c", bot = pnp ? "c" : "e";
    g.lead([-2, 0], [-0.35, 0], "b");
    g.lead([1, -2], [1, -1.05], top); g.lead([1, 2], [1, 1.05], bot);
    g.circle(0.35, 0, 1.15, { stroke: rgba(C.silk, 0.85), width: 1.6 });
    g.line([-0.35, -0.7], [-0.35, 0.7], { stroke: C.silk, width: 3 });
    g.line([-0.35, -0.35], [1, -1.05], { stroke: C.silk, width: 2.2 });
    g.line([-0.35, 0.35], [1, 1.05], { stroke: C.silk, width: 2.2 });
    if (pnp) g.arrow([0.95, -1.02], [-0.25, -0.4], C.silk);
    else g.arrow([-0.2, 0.43], [0.95, 1.02], C.silk);
  }
  const bjtPaths = (pnp) => [
    { term: 0, pts: pnp ? [[1, 2], [1, 1.05], [-0.35, 0.35]] : [[1, -2], [1, -1.05], [-0.35, -0.35]] },
    { term: 1, pts: [[-2, 0], [-0.35, 0]] },
    { term: 2, pts: pnp ? [[1, -2], [1, -1.05], [-0.35, -0.35]] : [[1, 2], [1, 1.05], [-0.35, 0.35]] },
  ];
  PARTS.npn = {
    pins: { b: [-2, 0], c: [1, -2], e: [1, 2] }, paths: bjtPaths(false), box: [-0.9, -1.3, 1.6, 1.3],
    el: (p, n) => [{ type: "Q", id: p.id, n: [n("c"), n("b"), n("e")], ...Circuit.models.npn, ...(p.model || {}) }],
    draw: (g, p, st) => bjtDraw(g, p, st, false),
  };
  PARTS.pnp = {
    pins: { b: [-2, 0], e: [1, -2], c: [1, 2] }, paths: bjtPaths(true), box: [-0.9, -1.3, 1.6, 1.3],
    el: (p, n) => [{ type: "Q", id: p.id, n: [n("c"), n("b"), n("e")], ...Circuit.models.pnp, ...(p.model || {}) }],
    draw: (g, p, st) => bjtDraw(g, p, st, true),
  };
  /* MOSFET (zenginleştirme, gövde kaynağa bağlı): g sol, d üst (N) / s üst (P) */
  function mosDraw(g, p, st, pch) {
    const top = pch ? "s" : "d", bot = pch ? "d" : "s";
    g.lead([-2, 0], [-0.7, 0], "g");
    g.line([-0.7, -0.75], [-0.7, 0.75], { stroke: C.silk, width: 2.4 });
    // kanal: üç parça (zenginleştirme tipi); açıkken parlar
    const on = st.mosOn(p);
    const chc = on ? C.copper2 : C.silk;
    [[-0.95, -0.45], [-0.25, 0.25], [0.45, 0.95]].forEach(([a, b]) => g.line([-0.35, a], [-0.35, b], { stroke: chc, width: 3 }));
    g.lead([1, -2], [1, -0.7], top); g.lead([1, 2], [1, 0.7], bot);
    g.line([-0.35, -0.7], [1, -0.7], { stroke: C.silk, width: 2.2 });
    g.line([-0.35, 0.7], [1, 0.7], { stroke: C.silk, width: 2.2 });
    g.line([-0.35, 0], [1, 0], { stroke: C.silk, width: 2.2 });
    g.line([1, 0], [1, pch ? -0.7 : 0.7], { stroke: C.silk, width: 2.2 });
    if (pch) g.arrow([-0.25, 0], [0.6, 0], C.silk); else g.arrow([0.75, 0], [-0.2, 0], C.silk);
  }
  const mosPaths = (pch) => [
    { term: 0, pts: pch ? [[1, 2], [1, 0.7], [-0.35, 0.7]] : [[1, -2], [1, -0.7], [-0.35, -0.7]] },
    { term: 1, pts: [] },
    { term: 2, pts: pch ? [[1, -2], [1, -0.7], [-0.35, -0.7]] : [[1, 2], [1, 0.7], [-0.35, 0.7]] },
  ];
  PARTS.nmos = {
    pins: { g: [-2, 0], d: [1, -2], s: [1, 2] }, paths: mosPaths(false), box: [-1, -1.1, 1.3, 1.1],
    el: (p, n) => [{ type: "M", id: p.id, n: [n("d"), n("g"), n("s")], ...Circuit.models.nmos, ...(p.model || {}) }],
    draw: (g, p, st) => mosDraw(g, p, st, false),
  };
  PARTS.pmos = {
    pins: { g: [-2, 0], s: [1, -2], d: [1, 2] }, paths: mosPaths(true), box: [-1, -1.1, 1.3, 1.1],
    el: (p, n) => [{ type: "M", id: p.id, n: [n("d"), n("g"), n("s")], ...Circuit.models.pmos, ...(p.model || {}) }],
    draw: (g, p, st) => mosDraw(g, p, st, true),
  };
  /* opamp: − üstte, + altta (flip ile yer değiştirir), çıkış sağda */
  PARTS.opamp = {
    pins: { m: [-3, -1], p: [-3, 1], o: [3, 0] }, box: [-2.2, -2.1, 2.2, 2.1],
    paths: [{ term: 2, pts: [[3, 0], [2, 0]] }],
    el: (p, n) => [{ type: "OA", id: p.id, n: [n("p"), n("m"), n("o")], ideal: !!p.ideal, A: p.A ?? 1e5, vpos: p.vpos ?? 12, vneg: p.vneg ?? -12, headroom: p.headroom ?? 0 }],
    draw(g, p) {
      g.lead([-3, -1], [-2, -1], "m"); g.lead([-3, 1], [-2, 1], "p"); g.lead([2, 0], [3, 0], "o");
      g.poly([[-2, -2], [-2, 2], [2, 0]], { fill: C.mask2, stroke: C.silk });
      // flip: rot() y eksenini aynaladığı için + ve − birlikte yer değiştirir
      g.text("−", [-1.45, -1], { size: 0.8, color: C.silk, weight: 700 });
      g.text("+", [-1.45, 1], { size: 0.8, color: C.silk, weight: 700 });
    },
  };

  /* ---------------- mantık parçaları ---------------- */
  const GATE_TYPES = ["and", "or", "nand", "nor", "xor", "xnor"];
  // giriş pimleri: 2 girişte y = ±1, daha fazlasında birer birim arayla
  function gateGeom(n) {
    const ins = {};
    if (n === 2) { ins.i0 = [-3, -1]; ins.i1 = [-3, 1]; }
    else for (let k = 0; k < n; k++) ins["i" + k] = [-3, -(n - 1) / 2 + k];
    return { hh: Math.max(1.5, n / 2), ins };
  }
  function gateShape(g, kind, hh, iec) {
    const neg = kind === "nand" || kind === "nor" || kind === "xnor" || kind === "not";
    const xr = kind === "not" || kind === "buf" ? 1.2 : 1.5;
    const st = { fill: C.mask2, stroke: C.silk };
    if (iec) {
      g.rect(-1.5, -hh, 3, 2 * hh, st);
      const sym = { and: "&", nand: "&", or: "≥1", nor: "≥1", xor: "=1", xnor: "=1", not: "1", buf: "1" }[kind];
      g.text(sym, [0, -hh + 0.75], { size: 0.8, color: C.silk, weight: 700 });
      if (neg) g.circle(1.5 + 0.25, 0, 0.25, st);
      return 1.5 + (neg ? 0.5 : 0);
    }
    if (kind === "not" || kind === "buf") {
      g.poly([[-1.2, -1.1], [-1.2, 1.1], [0.9, 0]], st);
      if (kind === "not") g.circle(1.15, 0, 0.25, st);
      return kind === "not" ? 1.4 : 0.9;
    }
    if (kind === "and" || kind === "nand") {
      g.shape((c, u) => {
        c.moveTo(-1.5, -hh); c.lineTo(0, -hh); c.arc(0, 0, hh, -Math.PI / 2, Math.PI / 2); c.lineTo(-1.5, hh); c.closePath();
      }, st);
    } else {
      const x0 = -1.5;
      g.shape((c) => {
        c.moveTo(x0, -hh);
        c.quadraticCurveTo(0.2, -hh, xr, 0);
        c.quadraticCurveTo(0.2, hh, x0, hh);
        c.quadraticCurveTo(x0 + 0.7, 0, x0, -hh);
        c.closePath();
      }, st);
      if (kind === "xor" || kind === "xnor") g.shape((c) => { c.moveTo(x0 - 0.4, -hh); c.quadraticCurveTo(x0 + 0.3, 0, x0 - 0.4, hh); }, { stroke: C.silk });
    }
    const right = kind === "and" || kind === "nand" ? hh : xr;
    if (neg) { g.circle(right + 0.25, 0, 0.25, st); return right + 0.5; }
    return right;
  }
  GATE_TYPES.forEach((kind) => {
    PARTS[kind] = {
      logic: true,
      pinsFor(p) { const { ins } = gateGeom(p.n || 2); return { ...ins, o: [3, 0] }; },
      boxFor(p) { const { hh } = gateGeom(p.n || 2); return [-3, -hh, 3, hh]; },
      logicEl(p, n, net) { const k = p.n || 2; net.gate(kind.toUpperCase(), Array.from({ length: k }, (_, i) => n("i" + i)), n("o"), { delay: p.delay ?? 1, id: p.id }); },
      draw(g, p) {
        const k = p.n || 2, { hh, ins } = gateGeom(k);
        const right = gateShape(g, kind, hh, p.style === "iec");
        const xin = kind === "or" || kind === "nor" || kind === "xor" || kind === "xnor" ? -1.5 + (p.style === "iec" ? 0 : 0.25) : -1.5;
        Object.keys(ins).forEach((pn) => g.lead(ins[pn], [xin - (kind.includes("xor") && p.style !== "iec" ? 0.4 : 0), ins[pn][1]], pn));
        g.lead([right, 0], [3, 0], "o");
      },
    };
  });
  ["not", "buf"].forEach((kind) => {
    PARTS[kind] = {
      logic: true, pins: { i0: [-2, 0], o: [2, 0] }, box: [-2, -1.2, 2, 1.2],
      logicEl(p, n, net) { net.gate(kind.toUpperCase(), [n("i0")], n("o"), { delay: p.delay ?? 1, id: p.id }); },
      draw(g, p) {
        const right = p.style === "iec" ? gateShape(g, kind, 1.1, true) : gateShape(g, kind, 1.1, false);
        g.lead([-2, 0], [p.style === "iec" ? -1.5 : -1.2, 0], "i0"); g.lead([right, 0], [2, 0], "o");
      },
    };
  });
  // giriş anahtarı (0/1), tıklanabilir
  PARTS.input = {
    logic: true, pins: { o: [1, 0] }, box: [-1.6, -0.8, 1, 0.8], interactive: "toggle",
    logicEl(p, n, net) { net.signal(n("o"), p.value ? 1 : 0); net.set(n("o"), p.value ? 1 : 0, 0); },
    draw(g, p) {
      const v = p.value ? 1 : 0;
      g.rect(-1.5, -0.7, 1.6, 1.4, { fill: rgba(v ? C.v1 : C.v0, 0.22), stroke: v ? C.v1 : C.v0, r: 0.25 });
      g.text(String(v), [-0.7, 0.03], { size: 0.9, color: C.silk, weight: 800, font: "mono" });
      g.lead([0.1, 0], [1, 0], "o");
    },
  };
  // çıkış lambası
  PARTS.output = {
    logic: true, pins: { i: [-1, 0] }, box: [-1, -0.8, 1.2, 0.8],
    logicEl() {},
    draw(g, p, st) {
      const v = st.logicVal(p, "i");
      g.lead([-1, 0], [-0.25, 0], "i");
      const col = v === 1 ? C.v1 : v === 0 ? C.v0 : C.muted;
      if (v === 1) g.glow(0.45, 0, 1.6, { color: C.v1, a: 0.6 });
      g.circle(0.45, 0, 0.7, { fill: v === 1 ? C.v1 : rgba(col, 0.25), stroke: col });
    },
  };
  PARTS.clock = {
    logic: true, pins: { o: [1.5, 0] }, box: [-1.5, -0.9, 1.5, 0.9],
    logicEl(p, n, net) { net.clock(n("o"), p.period || 20, { start: 0 }); },
    draw(g) {
      g.rect(-1.5, -0.8, 2.3, 1.6, { stroke: C.silk, fill: C.mask2, r: 0.2 });
      g.path([[-1.2, 0.4], [-0.8, 0.4], [-0.8, -0.4], [-0.3, -0.4], [-0.3, 0.4], [0.2, 0.4], [0.2, -0.4], [0.5, -0.4]], { stroke: C.silk, width: 1.8 });
      g.lead([0.8, 0], [1.5, 0], "o");
    },
  };
  // kutu biçimli bloklar: flip-flop, latch, MUX, kod çözücü vb.
  function boxPart(def) {
    return {
      logic: true,
      pinsFor: (p) => def.pins(p),
      boxFor: (p) => def.box(p),
      logicEl: def.logicEl,
      draw(g, p) {
        const [x0, y0, x1, y1] = def.body(p);
        g.rect(x0, y0, x1 - x0, y1 - y0, { fill: C.mask2, stroke: C.silk, r: 0.15 });
        g.text(p.title || def.title, [(x0 + x1) / 2, y0 + 0.65], { size: 0.62, color: C.silk2, weight: 700, rot: true });
        const pins = def.pins(p);
        for (const [pn, pos] of Object.entries(pins)) {
          const inside = [pos[0] < x0 ? x0 : pos[0] > x1 ? x1 : pos[0], pos[1] < y0 ? y0 : pos[1] > y1 ? y1 : pos[1]];
          g.lead(pos, inside, pn);
          const lab = (def.labels && def.labels[pn]) || pn.toUpperCase();
          if (pn === "clk") g.path([[x0, pos[1] - 0.35], [x0 + 0.45, pos[1]], [x0, pos[1] + 0.35]], { stroke: C.silk, width: 1.6 });
          else {
            const left = pos[0] < x0, right = pos[0] > x1;
            const tp = [left ? x0 + 0.3 : right ? x1 - 0.3 : pos[0], pos[1] < y0 ? y0 + 0.45 : pos[1] > y1 ? y1 - 0.45 : pos[1]];
            const t = String(lab);
            const ovl = t.endsWith("'");
            g.text(ovl ? t.slice(0, -1) : t, tp, { size: 0.55, color: C.silk, align: left ? "left" : right ? "right" : "center", weight: 650, rot: true, overline: ovl });
          }
        }
      },
    };
  }
  PARTS.dff = boxPart({
    title: "D", pins: () => ({ d: [-3, -1], clk: [-3, 1], q: [3, -1], qn: [3, 1] }), labels: { qn: "Q'" },
    box: () => [-3, -2.2, 3, 2.2], body: () => [-2, -2.2, 2, 2.2],
    logicEl(p, n, net) { net.ff({ type: "D", d: n("d"), clk: n("clk"), q: n("q"), qn: n("qn"), init: p.init || 0 }, { delay: p.delay ?? 1, setup: p.setup }); },
  });
  PARTS.tff = boxPart({
    title: "T", pins: () => ({ t: [-3, -1], clk: [-3, 1], q: [3, -1], qn: [3, 1] }), labels: { qn: "Q'" },
    box: () => [-3, -2.2, 3, 2.2], body: () => [-2, -2.2, 2, 2.2],
    logicEl(p, n, net) { net.ff({ type: "T", t: n("t"), clk: n("clk"), q: n("q"), qn: n("qn"), init: p.init || 0 }, { delay: p.delay ?? 1 }); },
  });
  PARTS.jkff = boxPart({
    title: "JK", pins: () => ({ j: [-3, -1], clk: [-3, 0], k: [-3, 1], q: [3, -1], qn: [3, 1] }), labels: { qn: "Q'" },
    box: () => [-3, -2.2, 3, 2.2], body: () => [-2, -2.2, 2, 2.2],
    logicEl(p, n, net) { net.ff({ type: "JK", j: n("j"), k: n("k"), clk: n("clk"), q: n("q"), qn: n("qn"), init: p.init || 0 }, { delay: p.delay ?? 1 }); },
  });
  PARTS.dlatch = boxPart({
    title: "D latch", pins: () => ({ d: [-3, -1], en: [-3, 1], q: [3, -1], qn: [3, 1] }), labels: { qn: "Q'", en: "EN" },
    box: () => [-3, -2.2, 3, 2.2], body: () => [-2, -2.2, 2, 2.2],
    logicEl(p, n, net) { net.dlatch({ d: n("d"), en: n("en"), q: n("q"), qn: n("qn") }, { delay: p.delay ?? 1 }); },
  });
  // genel kutu: p.ins, p.outs (adlar), p.fn(girişler) → çıkışlar
  PARTS.block = boxPart({
    title: "",
    pins(p) {
      const o = {}, ni = p.ins.length, no = p.outs.length, hgt = Math.max(ni, no);
      p.ins.forEach((nm, k) => (o[nm] = [-3, -(hgt - 1) + 2 * k + (hgt - ni)]));
      p.outs.forEach((nm, k) => (o[nm] = [3, -(hgt - 1) + 2 * k + (hgt - no)]));
      return o;
    },
    labels: null,
    box(p) { const hgt = Math.max(p.ins.length, p.outs.length); return [-3, -hgt - 0.6, 3, hgt + 0.2]; },
    body(p) { const hgt = Math.max(p.ins.length, p.outs.length); return [-2, -hgt - 0.6, 2, hgt + 0.2]; },
    logicEl(p, n, net) { net.fn(p.ins.map(n), p.outs.map(n), p.fn, { delay: p.delay ?? 1, id: p.id }); },
  });

  const pinsOf = (p) => { const d = PARTS[p.type]; return d.pinsFor ? d.pinsFor(p) : d.pins; };
  const boxOf = (p) => { const d = PARTS[p.type]; return d.boxFor ? d.boxFor(p) : d.box; };

  /* ---------------- netlist çıkarımı ---------------- */
  // Bağlantı kuralı: tel köşeleri ve uçları bağlanır; bir uç/pim başka bir telin ortasına
  // düşerse (T bağlantı) o tel bölünür ve bağlanır. Kesişen teller köşe yoksa bağlı değildir.
  function extract(def) {
    const parts = def.parts.map((p) => ({ ...p }));
    const pinWorld = {}; // "R1.a" → [x,y]
    parts.forEach((p) => {
      if (!PARTS[p.type]) throw new Error("Bilinmeyen parça: " + p.type);
      for (const [pn, lp] of Object.entries(pinsOf(p))) pinWorld[p.id + "." + pn] = addp(p.at, rot(lp, p.rot, p.flip));
    });
    // noktalar
    const pts = new Map();
    const pt = (p) => { const k = key(p); if (!pts.has(k)) pts.set(k, { k, p: [Math.round(p[0] * 2) / 2, Math.round(p[1] * 2) / 2], pins: [], deg: 0 }); return pts.get(k); };
    Object.entries(pinWorld).forEach(([nm, p]) => pt(p).pins.push(nm));
    let segs = [];
    (def.wires || []).forEach((w, wi) => { for (let i = 0; i + 1 < w.length; i++) { pt(w[i]); pt(w[i + 1]); segs.push([key(w[i]), key(w[i + 1]), wi]); } });
    // T bağlantıları: segment içine düşen noktalar
    const all = [...pts.values()];
    const split = [];
    segs.forEach(([a, b, wi]) => {
      const A = pts.get(a).p, B = pts.get(b).p;
      const inner = all.filter((q) => {
        if (q.k === a || q.k === b) return false;
        const [x, y] = q.p;
        if (A[0] === B[0]) return x === A[0] && y > Math.min(A[1], B[1]) && y < Math.max(A[1], B[1]);
        if (A[1] === B[1]) return y === A[1] && x > Math.min(A[0], B[0]) && x < Math.max(A[0], B[0]);
        return false;
      }).sort((q1, q2) => Math.hypot(q1.p[0] - A[0], q1.p[1] - A[1]) - Math.hypot(q2.p[0] - A[0], q2.p[1] - A[1]));
      const chain = [a, ...inner.map((q) => q.k), b];
      for (let i = 0; i + 1 < chain.length; i++) split.push([chain[i], chain[i + 1], wi]);
    });
    segs = split.filter(([a, b]) => a !== b);
    // birleşim-bul
    const parent = new Map([...pts.keys()].map((k) => [k, k]));
    const find = (k) => { while (parent.get(k) !== k) { parent.set(k, parent.get(parent.get(k))); k = parent.get(k); } return k; };
    const unite = (a, b) => { a = find(a); b = find(b); if (a !== b) parent.set(a, b); };
    segs.forEach(([a, b]) => { unite(a, b); pts.get(a).deg++; pts.get(b).deg++; });
    // aynı adlı etiketler / raylar birleşir
    const named = {};
    parts.forEach((p) => {
      const nm = PARTS[p.type].fixedNet || p.net || (p.type === "rail" ? "rail:" + (p.netName || p.V) : null);
      if (!nm) return;
      const k = key(pinWorld[p.id + ".a"]);
      if (named[nm]) unite(k, named[nm]); else named[nm] = k;
    });
    // toprak çizilmemişse ilk kaynağın eksi ucu 0 V kabul edilir
    if (!named["0"]) {
      const src = parts.find((p) => ["battery", "vac", "isource"].includes(p.type));
      if (src) named["0"] = key(pinWorld[src.id + ".b"]);
    }
    // düğüm adları
    const netName = new Map();
    let auto = 0;
    Object.entries(named).forEach(([nm, k]) => netName.set(find(k), nm === "0" ? "0" : nm.startsWith("rail:") ? "vcc" + nm.slice(5).replace(/[^\w.-]/g, "") : nm));
    const nameOf = (k) => { const r = find(k); if (!netName.has(r)) netName.set(r, "n" + ++auto); return netName.get(r); };
    pts.forEach((q) => { q.net = nameOf(q.k); q.deg += q.pins.length; });
    const pinNet = {};
    Object.entries(pinWorld).forEach(([nm, p]) => (pinNet[nm] = nameOf(key(p))));
    // uyarılar: hiçbir şeye bağlanmayan pim ya da tel ucu
    const warnings = [];
    pts.forEach((q) => {
      if (q.deg === 1 && !q.pins.length) warnings.push("Boşta tel ucu " + q.k);
      if (q.pins.length === 1 && q.deg === 1) {
        const [pid] = q.pins[0].split(".");
        const pp = parts.find((x) => x.id === pid);
        if (!["ground", "rail", "label", "probe", "text"].includes(pp.type) && !def.allowFloating) warnings.push("Bağlanmamış pim " + q.pins[0]);
      }
    });
    return { parts, pinWorld, pts, segs, pinNet, warnings, nets: [...new Set(Object.values(pinNet))] };
  }

  /* ---------------- bileşen ---------------- */
  function Schematic(container, def, opts = {}) {
    const kind = def.kind || (def.parts.some((p) => PARTS[p.type] && PARTS[p.type].logic) ? "logic" : "analog");
    const wrap = h("div.sch", { style: { position: "absolute", inset: "0" } });
    const cv = h("canvas", { "aria-label": def.title || "Devre şeması", role: "img" });
    const tip = h("div.dmm");
    const hot = h("div.sch-hot", { style: { position: "absolute", inset: "0", pointerEvents: "none" } });
    wrap.append(cv, hot, tip);
    container.append(wrap);
    cv.style.touchAction = "pan-y";

    let X, parts, byId, sim = null, net = null;
    const listeners = { change: [], step: [], burn: [] };
    const emit = (n, ...a) => listeners[n].forEach((f) => f(...a));
    const vr = def.vRange || null;
    let vmin = 0, vmax = 5;
    const iRef = def.iRef || opts.iRef || 0.01;
    const st = { flows: new Map(), phase: new Map(), smoke: [], spin: {}, burnT: {}, sparks: [] };

    function build() {
      X = extract(def);
      parts = X.parts;
      byId = Object.fromEntries(parts.map((p) => [p.id, p]));
      if (X.warnings.length && !def.quiet) console.warn("Şema uyarısı (" + (def.title || def.id || "?") + "):", X.warnings.join("; "));
      if (kind === "analog") {
        const els = [];
        const seenNet = new Set();
        parts.forEach((p) => {
          const d = PARTS[p.type];
          if (!d.el) return;
          const n = (pin) => X.pinNet[p.id + "." + pin];
          let first = true;
          if (p.type === "rail") { const nn = n("a"); first = !seenNet.has(nn); seenNet.add(nn); }
          els.push(...d.el(p, n, first));
        });
        sim = Circuit.create({ elements: els, method: def.method || "trap" });
        // gerilim skalası: devredeki kaynakların aralığı
        if (vr) [vmin, vmax] = vr;
        else {
          let lo = 0, hi = 0;
          parts.forEach((p) => {
            if (p.type === "rail" || p.type === "battery") { lo = Math.min(lo, p.V); hi = Math.max(hi, p.V); }
            if (p.type === "opamp") { lo = Math.min(lo, p.vneg ?? -12); hi = Math.max(hi, p.vpos ?? 12); }
            if (p.type === "vac" && p.wave) { const a = (p.wave.amp || 0) + Math.abs(p.wave.offset || 0); lo = Math.min(lo, -a); hi = Math.max(hi, a, p.wave.high || 0); }
          });
          vmin = lo; vmax = hi || 5;
        }
      } else {
        net = Logic.network({ maxEvents: def.maxEvents || 20000 });
        parts.forEach((p) => {
          const d = PARTS[p.type];
          if (d.logicEl) d.logicEl(p, (pin) => X.pinNet[p.id + "." + pin], net);
        });
        net.settle(def.settle || 50);
      }
      makeHot();
      layout();
    }

    /* --- yerleşim: çizimi tuvale sığdır --- */
    let u = 20, ox = 0, oy = 0, cs = null;
    function bounds() {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      const add = ([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
      parts.forEach((p) => {
        const b = boxOf(p);
        [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]].forEach((c) => add(addp(p.at, rot(c, p.rot, p.flip))));
        Object.keys(pinsOf(p)).forEach((pn) => add(X.pinWorld[p.id + "." + pn]));
        if (p.label !== false && PARTS[p.type].el && !["ground", "rail", "label", "probe", "text"].includes(p.type)) {
          const lp = labelPos(p); add([lp[0] - 1.6, lp[1] - 0.5]); add([lp[0] + 1.6, lp[1] + 0.5]);
        }
      });
      X.pts.forEach((q) => add(q.p));
      if (def.bounds) { add([def.bounds[0], def.bounds[1]]); add([def.bounds[2], def.bounds[3]]); }
      return [x0, y0, x1, y1];
    }
    function layout() {
      if (!cs || !cs.w) return;
      const [x0, y0, x1, y1] = bounds();
      const pad = def.pad ?? 1.2, top = (def.padTop ?? 1.4);
      const W = cs.w, H = cs.h;
      u = Math.min((W - 24) / (x1 - x0 + 2 * pad), (H - 24) / (y1 - y0 + pad + top));
      u = Math.max(7, Math.min(u, def.maxUnit || opts.maxUnit || 34));
      ox = W / 2 - ((x0 + x1) / 2) * u;
      oy = (H + (top - pad) * u * 0.5) / 2 - ((y0 + y1) / 2) * u;
      placeHot();
      draw();
    }
    const toScreen = ([x, y]) => [ox + x * u, oy + y * u];
    const toWorld = (sx, sy) => [(sx - ox) / u, (sy - oy) / u];

    /* --- çözüm ve akış --- */
    const netV = (nm) => (kind === "analog" ? (nm === "0" ? 0 : sim.v(nm)) : net.value(nm));
    function computeFlows() {
      st.flows.clear();
      if (kind !== "analog") return;
      // her noktada tel ağından çıkıp pimlere giren akım
      const demand = new Map();
      parts.forEach((p) => {
        const d = PARTS[p.type];
        if (!d.el) return;
        const els = sim.byId[p.id];
        if (!els) return;
        const cur = sim.terminals(p.id);
        const pinNames = elementPins(p);
        pinNames.forEach((pn, k) => {
          if (!pn) return;
          const kk = key(X.pinWorld[p.id + "." + pn]);
          demand.set(kk, (demand.get(kk) || 0) + cur[k]);
        });
      });
      // her düğümün tel ağacı üzerinde yaprak budama ile segment akımları
      const adj = new Map();
      X.segs.forEach(([a, b], i) => {
        if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []);
        adj.get(a).push([b, i]); adj.get(b).push([a, i]);
      });
      const visited = new Set();
      for (const start of adj.keys()) {
        if (visited.has(start)) continue;
        // kapsayan ağaç (BFS)
        const order = [], par = new Map([[start, null]]);
        const q = [start]; visited.add(start);
        while (q.length) {
          const v = q.shift(); order.push(v);
          for (const [w, si] of adj.get(v)) if (!visited.has(w)) { visited.add(w); par.set(w, [v, si]); q.push(w); }
        }
        const sub = new Map();
        for (let i = order.length - 1; i >= 0; i--) {
          const v = order[i];
          const need = (demand.get(v) || 0) + (sub.get(v) || 0); // v'den aşağı çekilen akım
          const pr = par.get(v);
          if (!pr) continue;
          const [pv, si] = pr;
          // akış pv → v yönünde need kadar
          const [a] = X.segs[si];
          st.flows.set(si, a === pv ? need : -need);
          sub.set(pv, (sub.get(pv) || 0) + need);
        }
      }
    }
    // çözücü terminal sırasıyla eşleşen pim adları
    function elementPins(p) {
      if (PARTS[p.type].elPins) return PARTS[p.type].elPins;
      switch (p.type) {
        case "pot": return ["a", "w", "b"];
        case "npn": case "pnp": return ["c", "b", "e"];
        case "nmos": case "pmos": return ["d", "g", "s"];
        case "opamp": return ["p", "m", "o"];
        case "rail": return ["a", null];
        default: return Object.keys(pinsOf(p));
      }
    }

    function solve() {
      if (kind === "analog") {
        if (!def.tran) sim.dc();
        computeFlows();
        checkBurn();
      }
      emit("change", api);
      draw();
    }

    /* --- güç ve yanma --- */
    function checkBurn(dtReal = 0) {
      parts.forEach((p) => {
        if (p.burnt) return;
        let over = 0;
        if (p.type === "resistor" && p.Pmax) over = Math.abs(sim.p(p.id)) / p.Pmax;
        if (p.type === "led") over = Math.abs(sim.i(p.id)) / (p.Imax || 0.03);
        if (p.type === "fuse") over = Math.abs(sim.i(p.id)) / (p.rating || 0.2);
        if (p.type === "lamp" && p.Pmax) over = Math.abs(sim.p(p.id)) / p.Pmax;
        const lim = p.type === "fuse" ? 1 : p.type === "led" ? 2.5 : 2;
        if (over > lim) {
          st.burnT[p.id] = (st.burnT[p.id] || 0) + (dtReal || 0.0001);
          const need = p.type === "fuse" || over > lim * 4 ? 0 : 0.8;
          if (st.burnT[p.id] >= need) burn(p);
        } else st.burnT[p.id] = 0;
      });
    }
    function burn(p) {
      p.burnt = true;
      const [x, y] = p.at;
      for (let i = 0; i < 26; i++) st.sparks.push({ x, y, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 8, life: 0.5 + Math.random() * 0.4 });
      st.smokeUntil = (st.smokeUntil || {});
      st.smokeUntil[p.id] = performance.now() + 4500;
      syncPart(p);
      if (kind === "analog" && !def.tran) sim.dc();
      computeFlows();
      emit("burn", p);
      emit("change", api);
    }
    // parçanın çözücü parametrelerini yeniden hesapla
    function syncPart(p) {
      if (kind !== "analog") return;
      const d = PARTS[p.type];
      const n = (pin) => X.pinNet[p.id + "." + pin];
      const els = d.el(p, n, true);
      els.forEach((e) => { if (sim.byId[e.id]) { const { type, id, n: nn, ...prm } = e; sim.set(e.id, prm); } });
    }

    /* --- çizim --- */
    const heatOf = (p) => {
      if (kind !== "analog" || !p.Pmax) return { a: 0, fill: C.mask2, stroke: C.silk };
      const P = Math.abs(sim.p(p.id)), r = Math.min(1.6, P / p.Pmax);
      if (r < 0.15 || p.burnt) return { a: 0, fill: p.burnt ? "#1a1410" : C.mask2, stroke: p.burnt ? "#5a4a3a" : C.silk };
      const a = Math.min(1, (r - 0.15) / 1.1);
      return { a, color: C.heat, fill: L.mix(C.mask2, "#ff6a1a", Math.min(1, a * 0.9)), stroke: L.mix(C.silk, "#ffd0a0", a) };
    };
    const drawState = {
      heat: heatOf,
      netColor(p, pin) { return wireColor(X.pinNet[p.id + "." + pin]); },
      ledLevel(p) { if (kind !== "analog" || p.burnt) return 0; return Math.max(0, Math.min(1.4, sim.i(p.id) / (p.Iref || 0.015))); },
      ledFill(p) {
        const lv = this.ledLevel(p);
        const col = (Circuit.LED[p.color || "kirmizi"] || {}).color || C.v1;
        if (p.burnt) return "#221a14";
        return lv > 0.02 ? L.mix(L.C.mask2, col, Math.min(1, 0.25 + lv)) : rgba(col, 0.18);
      },
      powerLevel(p) { if (kind !== "analog") return 0; return Math.min(1.2, Math.abs(sim.p(p.id)) / (p.Pnom || 1)); },
      spin(p) { return st.spin[p.id] || 0; },
      mosOn(p) { if (kind !== "analog") return false; const r = sim.info(p.id).region; return r && r !== "kesim"; },
      logicVal(p, pin) { return kind === "logic" ? net.value(X.pinNet[p.id + "." + pin]) : null; },
    };
    function wireColor(nm) {
      if (kind === "analog") return vcolor(netV(nm), vmin, vmax);
      const v = net.value(nm);
      return lcolor(v) || C.muted;
    }
    function isUndef(nm) { if (kind !== "logic") return false; const v = net.value(nm); return v !== 0 && v !== 1; }

    // çizim yardımcıları (yerel koordinat, ızgara birimi)
    function makeG(ctx, p) {
      const tr = (lp) => toScreen(addp(p.at, rot(lp, p.rot, p.flip)));
      const lw = (w) => Math.max(1, (w || 2) * u / 20);
      const g = {
        lead(a, b, pin) {
          const nm = X.pinNet[p.id + "." + pin];
          const und = isUndef(nm);
          ctx.strokeStyle = wireColor(nm); ctx.lineWidth = lw(3); ctx.lineCap = "round";
          ctx.setLineDash(und ? [u * 0.25, u * 0.2] : []);
          ctx.beginPath(); ctx.moveTo(...tr(a)); ctx.lineTo(...tr(b)); ctx.stroke(); ctx.setLineDash([]);
        },
        line(a, b, o = {}) { ctx.strokeStyle = o.stroke || C.silk; ctx.lineWidth = lw(o.width); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(...tr(a)); ctx.lineTo(...tr(b)); ctx.stroke(); },
        path(pts, o = {}) { ctx.strokeStyle = o.stroke || C.silk; ctx.lineWidth = lw(o.width || 2); ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(...tr(q)) : ctx.moveTo(...tr(q)))); ctx.stroke(); },
        poly(pts, o = {}) {
          ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(...tr(q)) : ctx.moveTo(...tr(q)))); ctx.closePath();
          if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
          if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = lw(o.width || 2); ctx.lineJoin = "round"; ctx.stroke(); }
        },
        rect(x, y, w, hh, o = {}) {
          g.poly([[x, y], [x + w, y], [x + w, y + hh], [x, y + hh]], o);
        },
        circle(x, y, r, o = {}) {
          const [sx, sy] = tr([x, y]);
          ctx.beginPath(); ctx.arc(sx, sy, r * u, 0, Math.PI * 2);
          if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
          if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = lw(o.width || 2); ctx.stroke(); }
        },
        arcPath(x, y, r, a0, a1, o = {}) {
          const pts = [];
          for (let i = 0; i <= 16; i++) { const a = a0 + ((a1 - a0) * i) / 16; pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
          g.path(pts, o);
        },
        // yerel koordinatlarda serbest şekil (dönüş uygulanır)
        shape(fn, o = {}) {
          ctx.save();
          const [sx, sy] = toScreen(p.at);
          ctx.translate(sx, sy);
          ctx.rotate(((p.rot || 0) * Math.PI) / 180);
          ctx.scale(u, p.flip ? -u : u);
          ctx.beginPath(); fn(ctx, u);
          ctx.restore();
          if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
          if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = lw(o.width || 2); ctx.lineJoin = "round"; ctx.stroke(); }
        },
        arrow(a, b, col) {
          const A = tr(a), B = tr(b);
          const ang = Math.atan2(B[1] - A[1], B[0] - A[0]), s = u * 0.32;
          ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw(1.6);
          ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(...B);
          ctx.lineTo(B[0] - s * Math.cos(ang - 0.45), B[1] - s * Math.sin(ang - 0.45));
          ctx.lineTo(B[0] - s * Math.cos(ang + 0.45), B[1] - s * Math.sin(ang + 0.45));
          ctx.closePath(); ctx.fill();
        },
        text(t, at, o = {}) {
          // o.rot: metin döndürülmez, yalnız konumu döner
          const [sx, sy] = tr(at);
          ctx.fillStyle = o.color || C.silk;
          const fam = o.font === "mono" ? FONT.mono : FONT.display;
          ctx.font = `${o.weight || 600} ${Math.max(9, (o.size || 0.6) * u)}px ${fam}`;
          if ("fontStretch" in ctx) ctx.fontStretch = o.font === "mono" ? "normal" : "semi-condensed";
          ctx.textAlign = o.align || "center"; ctx.textBaseline = "middle";
          ctx.fillText(t, sx, sy);
          if (o.overline) {
            const w = ctx.measureText(t).width, x0 = o.align === "left" ? sx : o.align === "right" ? sx - w : sx - w / 2;
            const yy = sy - (o.size || 0.6) * u * 0.55;
            ctx.strokeStyle = o.color || C.silk; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + w, yy); ctx.stroke();
          }
        },
        glow(x, y, r, o) {
          const [sx, sy] = tr([x, y]);
          const R = r * u;
          const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
          gr.addColorStop(0, rgba(o.color || C.heat, 0.55 * (o.a ?? 1)));
          gr.addColorStop(1, rgba(o.color || C.heat, 0));
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.fill();
        },
        char(x, y) {
          const [sx, sy] = tr([x, y]);
          ctx.fillStyle = "rgba(20,14,10,0.85)";
          ctx.beginPath(); ctx.ellipse(sx, sy, u * 1.1, u * 0.5, 0.2, 0, Math.PI * 2); ctx.fill();
        },
      };
      return g;
    }
    function labelPos(p) {
      const b = boxOf(p);
      const vertical = (p.rot || 0) % 180 !== 0;
      if (p.lp) return addp(p.at, p.lp);
      if (vertical) return addp(p.at, [Math.max(Math.abs(b[1]), Math.abs(b[3])) + 0.5 + 1.2, 0]);
      return addp(p.at, [0, -Math.max(Math.abs(b[1]), 0.6) - 0.55]);
    }

    let raf = 0;
    function draw() {
      if (!cs || !cs.w) return;
      const ctx = cs.ctx;
      ctx.clearRect(0, 0, cs.w, cs.h);
      // teller
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      X.segs.forEach(([a, b], i) => {
        const A = X.pts.get(a), B = X.pts.get(b);
        const und = isUndef(A.net);
        ctx.strokeStyle = wireColor(A.net);
        ctx.lineWidth = Math.max(1.5, 3 * u / 20);
        ctx.setLineDash(und ? [u * 0.25, u * 0.2] : []);
        ctx.beginPath(); ctx.moveTo(...toScreen(A.p)); ctx.lineTo(...toScreen(B.p)); ctx.stroke();
      });
      ctx.setLineDash([]);
      // parçalar
      parts.forEach((p) => {
        const g = makeG(ctx, p);
        PARTS[p.type].draw(g, p, drawState);
        // etiket
        if (p.label !== false && PARTS[p.type].el && !["ground", "rail", "label", "probe", "text"].includes(p.type)) {
          const lp = labelPos(p);
          const txt = p.label || [p.id, p.showValue === false ? "" : valueLabel(p)].filter(Boolean).join(" ");
          const [sx, sy] = toScreen(lp);
          ctx.font = `600 ${Math.max(10, 0.6 * u)}px ${FONT.display}`;
          if ("fontStretch" in ctx) ctx.fontStretch = "semi-condensed";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillStyle = C.silk2; ctx.fillText(txt, sx, sy);
        }
        // ölçü aleti okuması
        if (kind === "analog" && PARTS[p.type].meter) {
          // açık devredeki pA düzeyi kaçak (açık anahtar direnci, GMIN) gerçek ölçü aletinde görünmez: 0 göster
          const Im = sim.i(p.id), Vm = sim.vAcross(p.id);
          const val = PARTS[p.type].meter === "A" ? Circuit.fmt(Math.abs(Im) < iRef * 1e-7 ? 0 : Im, "A") : Circuit.fmt(Math.abs(Vm) < 1e-9 ? 0 : Vm, "V");
          const [sx, sy] = toScreen(addp(p.at, p.mp || rot([0, 1.75], (p.rot || 0) % 180 ? 270 : 0)));
          ctx.font = `600 ${Math.max(10, 0.58 * u)}px ${FONT.mono}`;
          const w = ctx.measureText(val).width + 10, hh = Math.max(14, 0.85 * u);
          ctx.fillStyle = "#b7c3a0"; ctx.strokeStyle = "#2a2f26"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sx - w / 2, sy - hh / 2, w, hh, 3) : ctx.rect(sx - w / 2, sy - hh / 2, w, hh); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#17200f"; ctx.textAlign = "center"; ctx.fillText(val, sx, sy + 1);
        }
      });
      // bağlantı noktaları
      X.pts.forEach((q) => {
        if (q.deg >= 3) {
          const [sx, sy] = toScreen(q.p);
          ctx.fillStyle = wireColor(q.net);
          ctx.beginPath(); ctx.arc(sx, sy, Math.max(2.5, 0.2 * u), 0, Math.PI * 2); ctx.fill();
        }
      });
      if (kind === "analog" && opts.dots !== false && def.dots !== false) drawDots(ctx);
      drawFx(ctx);
      if (hover) drawHover(ctx);
      if (opts.overlay) opts.overlay(ctx, api);
    }

    /* --- akım noktaları --- */
    const SPACING = 1; // ızgara birimi
    const speedOf = (I) => Math.max(-14, Math.min(14, (I / iRef) * (def.dotSpeed || 3))); // birim/s
    function drawDots(ctx) {
      ctx.fillStyle = C.amp;
      const r = Math.max(1.6, 0.13 * u);
      const thr = iRef * 1e-3;
      const dot = (A, B, ph) => {
        const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
        if (len < 1e-6) return;
        let s = ((ph % SPACING) + SPACING) % SPACING;
        for (; s < len; s += SPACING) {
          const t = s / len;
          const [sx, sy] = toScreen([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
          ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        }
      };
      X.segs.forEach(([a, b], i) => {
        const f = st.flows.get(i) || 0;
        if (Math.abs(f) < thr) return;
        dot(X.pts.get(a).p, X.pts.get(b).p, st.phase.get("s" + i) || 0);
      });
      parts.forEach((p) => {
        const d = PARTS[p.type];
        if (!d.paths || !d.el || !sim.byId[p.id]) return;
        const cur = sim.terminals(p.id);
        const hide = d.hide || 0; // gövdenin içinde nokta çizme (yerel |x| < hide)
        d.paths.forEach((pth, k) => {
          const I = cur[pth.term];
          if (!pth.pts.length || Math.abs(I) < thr) return;
          let ph = st.phase.get(p.id + ":" + k) || 0;
          for (let j = 0; j + 1 < pth.pts.length; j++) {
            const A = pth.pts[j], B = pth.pts[j + 1];
            const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
            let sp = ((ph % SPACING) + SPACING) % SPACING;
            for (; sp < len; sp += SPACING) {
              const t = sp / len, lx = A[0] + (B[0] - A[0]) * t, ly = A[1] + (B[1] - A[1]) * t;
              if (Math.abs(lx) < hide && Math.abs(ly) < 1.2) continue;
              const [sx, sy] = toScreen(addp(p.at, rot([lx, ly], p.rot, p.flip)));
              ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
            }
            ph -= len;
          }
        });
      });
    }
    function advanceDots(dt) {
      if (kind !== "analog") return;
      X.segs.forEach((s, i) => { const k = "s" + i; st.phase.set(k, (st.phase.get(k) || 0) + speedOf(st.flows.get(i) || 0) * dt); });
      parts.forEach((p) => {
        const d = PARTS[p.type];
        if (!d.paths || !d.el || !sim.byId[p.id]) return;
        const cur = sim.terminals(p.id);
        d.paths.forEach((pth, k) => { const kk = p.id + ":" + k; st.phase.set(kk, (st.phase.get(kk) || 0) + speedOf(cur[pth.term]) * dt); });
        if (p.type === "motor") st.spin[p.id] = (st.spin[p.id] || 0) + sim.i(p.id) * 60 * dt;
      });
    }

    /* --- duman ve kıvılcım --- */
    function drawFx(ctx) {
      const now = performance.now();
      st.smoke.forEach((s) => {
        const [sx, sy] = toScreen([s.x, s.y]);
        const R = s.r * u;
        const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
        gr.addColorStop(0, `rgba(170,175,165,${0.35 * s.life})`); gr.addColorStop(1, "rgba(170,175,165,0)");
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.fill();
      });
      st.sparks.forEach((s) => {
        const [sx, sy] = toScreen([s.x, s.y]);
        ctx.fillStyle = `rgba(255,${180 + Math.random() * 60 | 0},90,${Math.min(1, s.life * 2)})`;
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      });
      void now;
    }
    function advanceFx(dt) {
      const now = performance.now();
      if (st.smokeUntil) for (const [id, until] of Object.entries(st.smokeUntil)) {
        if (now > until) continue;
        const p = byId[id];
        if (!p) continue; // parça yeniden kurulumda kaldırılmış olabilir
        if (Math.random() < 0.5) st.smoke.push({ x: p.at[0] + (Math.random() - 0.5), y: p.at[1] - 0.3, vx: (Math.random() - 0.5) * 0.6, vy: -1.4 - Math.random(), r: 0.5 + Math.random() * 0.5, life: 1 });
      }
      st.smoke.forEach((s) => { s.x += s.vx * dt; s.y += s.vy * dt; s.r += 0.9 * dt; s.life -= 0.45 * dt; });
      st.smoke = st.smoke.filter((s) => s.life > 0);
      st.sparks.forEach((s) => { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 18 * dt; s.life -= dt; });
      st.sparks = st.sparks.filter((s) => s.life > 0);
    }

    /* --- multimetre balonu --- */
    let hover = null;
    function pick(sx, sy) {
      const [wx, wy] = toWorld(sx, sy);
      // önce parçalar
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (!PARTS[p.type].el && !PARTS[p.type].logic) continue;
        if (["ground", "text"].includes(p.type)) continue;
        const b = boxOf(p);
        const corners = [[b[0], b[1]], [b[2], b[3]]].map((c) => addp(p.at, rot(c, p.rot, p.flip)));
        const x0 = Math.min(corners[0][0], corners[1][0]), x1 = Math.max(corners[0][0], corners[1][0]);
        const y0 = Math.min(corners[0][1], corners[1][1]), y1 = Math.max(corners[0][1], corners[1][1]);
        if (wx >= x0 && wx <= x1 && wy >= y0 && wy <= y1) return { part: p };
      }
      // sonra teller (pim uçları dahil)
      let best = null, bd = 0.45;
      X.segs.forEach(([a, b], i) => {
        const A = X.pts.get(a).p, B = X.pts.get(b).p;
        const dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((wx - A[0]) * dx + (wy - A[1]) * dy) / L2));
        const d = Math.hypot(wx - A[0] - t * dx, wy - A[1] - t * dy);
        if (d < bd) { bd = d; best = { seg: i, net: X.pts.get(a).net, at: [A[0] + t * dx, A[1] + t * dy] }; }
      });
      return best;
    }
    function tipHtml(hv) {
      if (hv.seg != null || hv.net) {
        if (kind === "logic") {
          const v = net.value(hv.net);
          return `<small>${T.wire}</small><b>${v === 1 ? T.logic1 : v === 0 ? T.logic0 : v === "z" ? T.logicZ : T.logicX}</b>`;
        }
        const V = netV(hv.net), I = Math.abs(st.flows.get(hv.seg) || 0);
        return `<small>${hv.net === "0" ? T.ground : T.node} · ${T.voltage}</small><b>${Circuit.fmt(V, "V")}</b>` +
          (I > iRef * 1e-4 ? `<br><small>${T.current}</small>${Circuit.fmt(I, "A")}` : "");
      }
      const p = hv.part;
      if (kind === "logic") {
        const pins = pinsOf(p);
        return `<small>${p.id}</small>` + Object.keys(pins).map((pn) => `${pn.toUpperCase()}=${net.value(X.pinNet[p.id + "." + pn])}`).join("  ");
      }
      let s = `<small>${p.label || p.id}</small>`;
      if (PARTS[p.type].info) return s + PARTS[p.type].info(p, api);
      const two = sim.byId[p.id] && sim.byId[p.id].m.terms === 2;
      if (two && p.type !== "rail") {
        s += `<b>${Circuit.fmt(Math.abs(sim.vAcross(p.id)), "V")}</b> · ${Circuit.fmt(Math.abs(sim.i(p.id)), "A")}`;
        const P = sim.p(p.id);
        if (Math.abs(P) > 1e-6) s += `<br><small>${T.power}</small>${Circuit.fmt(Math.abs(P), "W")}`;
        if (p.burnt) s += `<br><b>${p.type === "fuse" ? T.blown : T.burnt}</b>`;
      } else if (p.type === "npn" || p.type === "pnp") {
        const inf = sim.info(p.id);
        s += `<b>${T.region[inf.region] || inf.region}</b><br>I<sub>C</sub> ${Circuit.fmt(Math.abs(inf.Ic), "A")} · I<sub>B</sub> ${Circuit.fmt(Math.abs(inf.Ib), "A")}<br>V<sub>CE</sub> ${Circuit.fmt(inf.vce, "V")}`;
      } else if (p.type === "nmos" || p.type === "pmos") {
        const inf = sim.info(p.id);
        s += `<b>${T.region[inf.region] || inf.region}</b><br>I<sub>D</sub> ${Circuit.fmt(inf.Id, "A")} · V<sub>GS</sub> ${Circuit.fmt(inf.vgs, "V")}`;
      } else if (p.type === "opamp") {
        s += `<b>${Circuit.fmt(sim.v(X.pinNet[p.id + ".o"]), "V")}</b><br><small>V+ ${Circuit.fmt(netV(X.pinNet[p.id + ".p"]), "V")} · V− ${Circuit.fmt(netV(X.pinNet[p.id + ".m"]), "V")}</small>`;
      } else if (p.type === "rail") {
        s += `<b>${Circuit.fmt(p.V, "V")}</b> · ${Circuit.fmt(Math.abs(sim.i(p.id)), "A")}`;
      } else if (p.type === "pot") {
        s += `<b>${Circuit.fmt(netV(X.pinNet[p.id + ".w"]), "V")}</b>`;
      }
      return s;
    }
    function drawHover(ctx) {
      if (hover.part) {
        const p = hover.part, b = boxOf(p);
        const c = [[b[0], b[1]], [b[2], b[3]]].map((q) => toScreen(addp(p.at, rot(q, p.rot, p.flip))));
        ctx.strokeStyle = rgba(C.copper2, 0.7); ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
        ctx.strokeRect(Math.min(c[0][0], c[1][0]) - 3, Math.min(c[0][1], c[1][1]) - 3, Math.abs(c[1][0] - c[0][0]) + 6, Math.abs(c[1][1] - c[0][1]) + 6);
        ctx.setLineDash([]);
      } else if (hover.seg != null) {
        const [sx, sy] = toScreen(hover.at);
        ctx.strokeStyle = C.silk; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.stroke();
      }
    }
    function updateTip() {
      if (!hover) { tip.classList.remove("on"); return; }
      tip.innerHTML = tipHtml(hover);
      let at;
      if (hover.part) { const b = boxOf(hover.part); at = toScreen(addp(hover.part.at, [0, Math.min(b[1], -0.8)])); }
      else at = toScreen(hover.at);
      tip.style.left = Math.max(70, Math.min(cs.w - 70, at[0])) + "px";
      tip.style.top = Math.max(60, at[1]) + "px";
      tip.classList.add("on");
    }
    cv.addEventListener("pointermove", (e) => {
      if (dragPot) return;
      const r = cv.getBoundingClientRect();
      hover = pick(e.clientX - r.left, e.clientY - r.top);
      cv.style.cursor = hover && hover.part && (PARTS[hover.part.type].interactive || hover.part.type === "pot") ? "pointer" : "default";
      updateTip(); if (!running) draw();
    });
    cv.addEventListener("pointerleave", () => { hover = null; updateTip(); if (!running) draw(); });

    /* --- etkileşim: anahtar, buton, potansiyometre, giriş --- */
    let dragPot = null;
    cv.addEventListener("pointerdown", (e) => {
      const r = cv.getBoundingClientRect();
      const hv = pick(e.clientX - r.left, e.clientY - r.top);
      if (!hv || !hv.part) { if (e.pointerType !== "mouse") { hover = hv; updateTip(); draw(); } return; }
      const p = hv.part;
      if (p.type === "pot" && !p.locked) {
        dragPot = { p, x: e.clientX, pos: p.pos ?? 0.5 };
        cv.setPointerCapture(e.pointerId);
        e.preventDefault();
      } else if (PARTS[p.type].interactive) { activate(p, true); e.preventDefault(); }
      if (e.pointerType !== "mouse") { hover = hv; updateTip(); }
    });
    cv.addEventListener("pointermove", (e) => {
      if (!dragPot) return;
      const d = (e.clientX - dragPot.x) / (u * 2);
      api.set(dragPot.p.id, "pos", Math.max(0, Math.min(1, dragPot.pos + d)));
      hover = { part: dragPot.p }; updateTip();
    });
    const endDrag = () => { dragPot = null; parts.filter((p) => p.type === "button" && p.closed).forEach((p) => activate(p, false)); };
    cv.addEventListener("pointerup", endDrag);
    cv.addEventListener("pointercancel", endDrag);

    function activate(p, down) {
      const it = PARTS[p.type].interactive;
      if (p.locked) return;
      if (it === "toggle") {
        if (!down) return;
        if (p.type === "input") api.set(p.id, "value", p.value ? 0 : 1);
        else api.set(p.id, "closed", !p.closed);
      } else if (it === "momentary") api.set(p.id, "closed", !!down);
    }
    // erişilebilirlik ve rehber için görünmez düğmeler
    function makeHot() {
      hot.innerHTML = "";
      parts.forEach((p) => {
        const it = PARTS[p.type].interactive;
        if (!it || p.locked) return;
        const name = p.hotLabel || p.label || p.id;
        const b = h("button.sch-btn", { type: "button", "aria-label": name, style: { position: "absolute", pointerEvents: "auto", background: "transparent", border: 0, borderRadius: "8px", cursor: "pointer", padding: 0 } },
          h("span", { style: { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" } }, name));
        b.dataset.part = p.id;
        if (it === "momentary") {
          b.addEventListener("pointerdown", (e) => { activate(p, true); b.setPointerCapture && b.setPointerCapture(e.pointerId); });
          b.addEventListener("pointerup", () => activate(p, false));
          b.addEventListener("pointercancel", () => activate(p, false));
          b.addEventListener("click", (e) => { if (e.detail === 0 || !e.isTrusted) { activate(p, true); setTimeout(() => activate(p, false), 600); } });
          b.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); activate(p, true); } });
          b.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") activate(p, false); });
        } else b.addEventListener("click", () => activate(p, true));
        b.addEventListener("mouseenter", () => { hover = { part: p }; updateTip(); if (!running) draw(); });
        b.addEventListener("mouseleave", () => { hover = null; updateTip(); if (!running) draw(); });
        hot.append(b);
      });
    }
    function placeHot() {
      hot.querySelectorAll(".sch-btn").forEach((b) => {
        const p = byId[b.dataset.part];
        if (!p) return;
        const bx = boxOf(p);
        const c = [[bx[0], bx[1]], [bx[2], bx[3]]].map((q) => toScreen(addp(p.at, rot(q, p.rot, p.flip))));
        Object.assign(b.style, {
          left: Math.min(c[0][0], c[1][0]) + "px", top: Math.min(c[0][1], c[1][1]) + "px",
          width: Math.abs(c[1][0] - c[0][0]) + "px", height: Math.abs(c[1][1] - c[0][1]) + "px",
        });
      });
    }

    /* --- animasyon döngüsü --- */
    let running = false;
    const lp = loop((dt) => {
      if (kind === "analog" && def.tran && !paused) {
        const tr = def.tran;
        let n = Math.round((tr.rate * dt) / tr.h);
        n = Math.max(1, Math.min(n, tr.maxSteps || 600));
        for (let k = 0; k < n; k++) {
          sim.step(tr.h);
          // yakınsamayan adım (ör. opamp raylar arasında takıldı): o andaki durumdan çalışma noktasını yeniden kur
          if (!sim.converged) sim.tranInit({ t0: sim.t });
          emit("step", sim.t, api);
        }
        computeFlows();
        checkBurn(dt);
        emit("change", api);
      } else if (kind === "analog") checkBurn(dt);
      if (kind === "logic" && def.animate && !paused) {
        net.run(net.time + dt * (def.rate || 20));
        emit("step", net.time, api);
        emit("change", api);
      }
      advanceDots(dt);
      advanceFx(dt);
      if (opts.tick) opts.tick(dt, api);
      draw();
      if (hover) updateTip();
    });
    let paused = false;

    const api = {
      def, kind,
      get sim() { return sim; },
      get net() { return net; },
      get parts() { return parts; },
      get extract() { return X; },
      part: (id) => byId[id],
      netOf: (id, pin) => X.pinNet[id + "." + pin],
      v: (nm) => netV(nm),
      // parça özelliğini değiştir ve yeniden çöz
      set(id, k, v) {
        const p = byId[id];
        if (!p) throw new Error("Parça yok: " + id);
        if (typeof k === "object") Object.assign(p, k); else p[k] = v;
        if (kind === "analog") {
          syncPart(p);
          // geçici rejimde yeni değer hemen bir adım uygulanır (gösterilen akımlar tutarlı kalsın)
          if (def.tran) { sim.step(def.tran.h); if (!sim.converged) sim.tranInit({ t0: sim.t }); emit("step", sim.t, api); }
          solve();
        }
        else {
          if (p.type === "input") { net.set(X.pinNet[p.id + ".o"], p.value ? 1 : 0); if (!def.animate) net.run(net.time + (def.settle || 50)); }
          emit("change", api); draw();
        }
        return api;
      },
      // parçayı geri yükle (yanmış dirençler vb.)
      repair() {
        parts.forEach((p) => { if (p.burnt) { p.burnt = false; syncPart(p); } });
        st.smoke = []; st.sparks = []; st.smokeUntil = {}; st.burnT = {};
        solve();
      },
      // devreyi baştan kur (parça ekleme/çıkarma, bağlantı değiştirme)
      rebuild(newDef) { if (newDef) Object.assign(def, newDef); st.smokeUntil = {}; st.burnT = {}; build(); if (kind === "analog" && def.tran) sim.tranInit(def.tranInit || {}); solve(); },
      solve, draw, layout,
      reset() { if (kind === "analog" && def.tran) { sim.tranInit(def.tranInit || {}); } else if (kind === "logic") build(); solve(); },
      start() { running = true; lp.start(); },
      stop() { running = false; lp.stop(); hover = null; tip.classList.remove("on"); },
      pause(v) { paused = v; },
      get paused() { return paused; },
      on(n, f) { listeners[n].push(f); return api; },
      screenOf: (pt) => toScreen(pt),
      canvas: cv,
      get unit() { return u; },
      flowOf: (si) => st.flows.get(si) || 0,
    };
    cs = canvas(cv, () => layout());
    build();
    if (kind === "analog" && def.tran) sim.tranInit(def.tranInit || {});
    solve();
    wrap._sch = api;
    (window.__schematics = window.__schematics || []).push(api);
    return api;
  }

  Schematic.PARTS = PARTS;
  Schematic.extract = extract;
  window.Schematic = Schematic;
})();
