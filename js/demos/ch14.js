/* 14. bölüm (büyük resim) deneyleri: mini bilgisayar, mikrodenetleyici, güvenlik */
(function () {
  window.STR = window.STR || {};

  const { C, FONT, h, slider, seg, btn, canvas, loop, num, rgba, clamp, lerp } = L;
  const S = STR.ch14;
  const fmt = (v, u, d) => Circuit.fmt(v, u, d);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const meter = (label) => { const b = h("b", "—"); const m = h("div.meter", h("small", { html: label }), b); m.val = b; m.lab = m.firstChild; return m; };
  const setFlag = (el, text, ok) => { el.innerHTML = text || ""; el.classList.toggle("ok", !!ok); };
  window.GUIDES = window.GUIDES || {};
  window.GUIDE_TARGETS = window.GUIDE_TARGETS || {};
  const G = window.GUIDES;

  /* =====================================================================
     Özel şema parçaları
     ===================================================================== */
  // kesikli dikdörtgen (yerel koordinat)
  function dashRect(g, x0, y0, x1, y1, col, dash = 0.5, gap = 0.32) {
    const edge = (a, b) => {
      const L0 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let s = 0; s < L0; s += dash + gap) {
        const e = Math.min(L0, s + dash);
        g.line([a[0] + ((b[0] - a[0]) * s) / L0, a[1] + ((b[1] - a[1]) * s) / L0], [a[0] + ((b[0] - a[0]) * e) / L0, a[1] + ((b[1] - a[1]) * e) / L0], { stroke: col, width: 1.5 });
      }
    };
    edge([x0, y0], [x1, y0]); edge([x1, y0], [x1, y1]); edge([x1, y1], [x0, y1]); edge([x0, y1], [x0, y0]);
  }
  // mikrodenetleyici gövdesi: yalnız çizim (çözücüde karşılığı yok)
  Schematic.PARTS.c14chip = {
    pins: {}, paths: [],
    boxFor: (p) => [-p.w / 2, -p.h / 2, p.w / 2, p.h / 2],
    draw(g, p) {
      const x0 = -p.w / 2, y0 = -p.h / 2;
      // sol kenarda süs bacaklar (DIP gövde)
      for (let y = y0 + 1; y < -y0 - 0.5; y += 1.2) g.line([x0 - 0.45, y], [x0, y], { stroke: rgba(C.silk, 0.35), width: 2 });
      g.rect(x0, y0, p.w, p.h, { fill: "#0b1712", stroke: C.silk });
      g.arcPath(0, y0, 0.55, 0, Math.PI, { stroke: rgba(C.silk, 0.6), width: 1.4 });
      g.text(p.text, [-0.3, -y0 - 2.5], { size: 0.6, color: C.silk, weight: 750 });
      g.text(p.sub, [-0.3, -y0 - 1.7], { size: 0.44, color: C.muted, weight: 600 });
      g.text("GND", [0, -y0 - 0.55], { size: 0.42, color: C.muted, weight: 650, font: "mono" });
    },
  };
  // kesikli çerçeve + başlık (yalnız çizim)
  Schematic.PARTS.c14box = {
    pins: {}, paths: [],
    boxFor: (p) => [-p.w / 2, -p.h / 2, p.w / 2, p.h / 2],
    draw(g, p) {
      const col = p.tone === "copper" ? rgba(C.copper2, 0.75) : rgba(C.silk, 0.42);
      dashRect(g, -p.w / 2, -p.h / 2, p.w / 2, p.h / 2, col);
      g.text(p.text, [-p.w / 2 + 0.2, -p.h / 2 - 0.55], { size: 0.52, color: p.tone === "copper" ? C.copper2 : C.silk2, weight: 650, align: "left" });
    },
  };
  // çıkış pini: iç dirençli gerilim kaynağı. o = pinin dış ucu, g = yongadaki toprak noktası (p.gnd ile)
  const srcPart = (look) => ({
    pinsFor: (p) => ({ o: look === "core" ? [2, 0] : [1.5, 0], g: p.gnd }),
    boxFor: () => (look === "core" ? [-1.8, -1.25, 1.4, 1.25] : [-1.7, -0.6, 1.5, 0.6]),
    paths: [{ term: 0, pts: look === "core" ? [[2, 0], [1.4, 0]] : [[1.5, 0], [0, 0]] }],
    elPins: ["o", "g"],
    el: (p, n) => [{ type: "V", id: p.id, n: [n("o"), n("g")], V: p.state ? p.V : 0, R: p.Rint || 0 }],
    draw(g, p, st) {
      const on = !!p.state;
      const col = on ? C.v1 : C.v0;
      if (look === "core") {
        g.lead([1.4, 0], [2, 0], "o");
        g.rect(-1.8, -1.25, 3.2, 2.5, { fill: "#0b1712", stroke: rgba(C.silk, 0.75) });
        g.text("çekirdek", [-0.2, -0.7], { size: 0.44, color: C.silk2, weight: 650 });
        g.text("iç sinyal", [-0.2, -0.05], { size: 0.4, color: C.muted, weight: 600 });
        g.text(on ? "1" : "0", [-0.2, 0.7], { size: 0.62, color: col, weight: 800, font: "mono" });
        return;
      }
      g.lead([0, 0], [1.5, 0], "o");
      g.rect(-0.18, -0.3, 0.36, 0.6, { fill: C.gold });
      g.text("D" + p.pin, [-1.05, 0], { size: 0.5, color: C.silk, weight: 700, font: "mono" });
      const txt = p.pwm != null ? "PWM" : on ? "HIGH" : "LOW";
      g.text(txt, [0.85, -0.55], { size: 0.4, color: p.pwm != null ? C.ch1 : col, weight: 750, font: "mono" });
    },
    info(p, sch) {
      const v = sch.v(sch.netOf(p.id, "o")) - sch.v(sch.netOf(p.id, "g"));
      return `<b>${fmt(v, "V")}</b> · ${fmt(Math.abs(sch.sim.i(p.id)), "A")}`;
    },
  });
  Schematic.PARTS.c14pin = srcPart("pin");
  Schematic.PARTS.c14core = srcPart("core");
  // şebeke kaynağı: etkin (RMS) değeriyle çözülür (doğru akım eşdeğeri)
  Schematic.PARTS.c14mains = {
    hide: 1.0, pins: { a: [-2, 0], b: [2, 0] }, paths: [{ term: 0, pts: [[-2, 0], [0, 0]] }, { term: 1, pts: [[2, 0], [0, 0]] }], box: [-1.1, -1.1, 1.1, 1.1],
    el: (p, n) => [{ type: "V", id: p.id, n: [n("a"), n("b")], V: p.V }],
    draw(g) {
      g.lead([-2, 0], [-1.1, 0], "a"); g.lead([1.1, 0], [2, 0], "b");
      g.circle(0, 0, 1.1, { stroke: C.silk, fill: "#2a1416" });
      const pts = [];
      for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([-0.6 + 1.2 * t, -0.38 * Math.sin(2 * Math.PI * t)]); }
      g.path(pts, { stroke: C.v1, width: 2 });
    },
  };

  // şemadaki bir noktanın etrafına ısı parıltısı
  function heatGlow(ctx, sch, at, P, Pref) {
    const a = clamp(P / Pref, 0, 1.3);
    if (a < 0.02) return;
    const [x, y] = sch.screenOf(at), u = sch.unit;
    const R = u * (1.6 + 2.4 * Math.min(1, a));
    const gr = ctx.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, rgba(C.heat, Math.min(0.8, 0.25 + 0.55 * a)));
    gr.addColorStop(0.55, rgba("#ff5a1a", 0.24 * Math.min(1, a)));
    gr.addColorStop(1, rgba(C.heat, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  }

  /* =====================================================================
     14.1 Yapı taşlarından bilgisayara: SAP-1 benzeri 8 bitlik bilgisayar
     ===================================================================== */
  // komut kümesi (Ben Eater'ın kodlarıyla aynı): üst 4 bit komut, alt 4 bit adres
  const OPS = { 0: "NOP", 1: "LDA", 2: "ADD", 3: "SUB", 4: "STA", 6: "JMP", 7: "JC", 14: "OUT", 15: "HLT" };
  const OPC = Object.fromEntries(Object.entries(OPS).map(([k, v]) => [v, +k]));
  const NOARG = new Set(["NOP", "OUT", "HLT"]);
  const ins = (op, a = 0) => (OPC[op] << 4) | a;
  const mnem = (v) => { const op = OPS[v >> 4]; if (!op) return "NOP"; return NOARG.has(op) ? op : op + " " + (v & 15); };
  // hazır programlar (veri): mem = 16 bayt, code = komut olarak okunan satırlar
  const PROGRAMS = {
    add: { code: 4, mem: [ins("LDA", 14), ins("ADD", 15), ins("OUT"), ins("HLT"), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 3] },
    count: { code: 3, mem: [ins("OUT"), ins("ADD", 15), ins("JMP", 0), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
    // x = Bellek[14], y = Bellek[15], t = Bellek[13]:  t = x + y; taşarsa dur; çıkışa yaz; x = y; y = t
    fib: { code: 11, mem: [ins("LDA", 14), ins("ADD", 15), ins("JC", 10), ins("OUT"), ins("STA", 13), ins("LDA", 15), ins("STA", 14), ins("LDA", 13), ins("STA", 15), ins("JMP", 0), ins("HLT"), 0, 0, 0, 1, 0] },
  };
  // mikro adımlar: her saat vuruşunda etkin denetim sinyalleri
  const FETCH = [["CO", "MI"], ["RO", "II", "CE"]];
  const EXEC = {
    LDA: () => [["IO", "MI"], ["RO", "AI"]],
    ADD: () => [["IO", "MI"], ["RO", "BI"], ["EO", "AI", "FI"]],
    SUB: () => [["IO", "MI"], ["RO", "BI"], ["SU", "EO", "AI", "FI"]],
    STA: () => [["IO", "MI"], ["AO", "RI"]],
    JMP: () => [["IO", "J"]],
    JC: (cf) => [cf ? ["IO", "J"] : []],
    OUT: () => [["AO", "OI"]],
    HLT: () => [["HLT"]],
    NOP: () => [],
  };
  const SIGS = ["HLT", "MI", "RI", "RO", "IO", "II", "AI", "AO", "EO", "SU", "BI", "OI", "CE", "CO", "J", "FI"];

  // ALU: 8 tam toplayıcılı dalgalı elde toplayıcı (Logic.build.rippleAdder) + çıkarma için 8 XOR
  function makeAlu() {
    let net, uses = 0;
    function build() {
      net = Logic.network();
      for (let i = 0; i < 8; i++) { net.signal("A" + i, 0); net.signal("R" + i, 0); }
      net.signal("SU", 0);
      for (let i = 0; i < 8; i++) net.gate("XOR", ["R" + i, "SU"], "B" + i);
      net.gate("BUF", ["SU"], "C0");
      Logic.build.rippleAdder(net, 8);
      net.settle();
      uses = 0;
    }
    build();
    let key = null, res = null;
    return function (a, b, su) {
      const k = a + "," + b + "," + su;
      if (k === key) return res;
      if (++uses > 400) build(); // geçmiş kayıtları büyümesin
      for (let i = 0; i < 8; i++) { net.set("A" + i, (a >> i) & 1); net.set("R" + i, (b >> i) & 1); }
      net.set("SU", su);
      net.run(net.time + 200);
      let s = 0;
      for (let i = 0; i < 8; i++) s |= (net.value("S" + i) === 1 ? 1 : 0) << i;
      key = k; res = { s, c: net.value("C8") === 1 ? 1 : 0 };
      return res;
    };
  }
  const bits = (v, n) => Logic.toBits(v, n).join("");

  Demos.c14cpu = function (stage) {
    const alu = makeAlu();
    const cv = h("canvas", { role: "img", "aria-label": "Mini bilgisayarın blok şeması" });
    const diag = h("div.pane.c14-diag", cv);
    const memRows = h("div.c14-mem-rows");
    const mem = h("div.c14-mem", h("div.c14-mem-h", h("b", S.memTitle), h("small", S.memHint)), memRows);
    const body = h("div.split.c14-cpu", diag, mem);
    const phase = h("span.c14-phase");
    const desc = h("span.c14-desc");
    const sigRow = h("div.c14-sigs");
    const outLine = h("span.c14-outs");
    const status = h("div.c14-status", h("div.c14-line", phase, desc), h("div.c14-line2", sigRow, outLine));
    stage.append(body, status);

    const sigEl = {};
    SIGS.forEach((s) => { sigEl[s] = h("span.c14-sig", { title: S.sigTip[s] }, s); sigRow.append(sigEl[s]); });

    /* --- işlemci durumu --- */
    let prog = "add";
    const cpu = { mem: [], pc: 0, mar: 0, ir: 0, a: 0, b: 0, out: 0, cf: 0, t: 0, halted: false, clocks: 0, outs: [], code: 4 };
    let pending = null;      // canlandırılan aktarım
    let lastWord = null, lastDesc = S.d.start, lastT = null, lastBus = null, lastSrc = null, lastDst = null;
    let mode = null;         // null | "run" | "instr"
    let acc = 0, hz = 2, pulse = 0;

    function load(k) {
      prog = k;
      cpu.mem = PROGRAMS[k].mem.slice();
      cpu.code = PROGRAMS[k].code;
      reset();
    }
    function reset() {
      Object.assign(cpu, { pc: 0, mar: 0, ir: 0, a: 0, b: 0, out: 0, cf: 0, t: 0, halted: false, clocks: 0, outs: [] });
      pending = null; lastWord = null; lastDesc = S.d.start; lastT = null; lastBus = null; lastSrc = null; lastDst = null;
      setMode(null);
      renderMem(); updateStatus(); draw();
    }
    // şimdiki adımın denetim sözcüğü
    function word() {
      if (cpu.t < FETCH.length) return FETCH[cpu.t];
      const op = OPS[cpu.ir >> 4] || "NOP";
      return EXEC[op](cpu.cf)[cpu.t - FETCH.length];
    }
    // bir saat vuruşu: aktarımı hazırla (değerler vuruş anındaki durumdan)
    function clock() {
      if (cpu.halted) return null;
      let w = word();
      if (!w) { cpu.t = 0; w = word(); }
      const su = w.includes("SU") ? 1 : 0;
      const r = alu(cpu.a, cpu.b, su);
      let bus = null, src = null, dst = null;
      if (w.includes("CO")) { bus = cpu.pc; src = "pc"; }
      if (w.includes("RO")) { bus = cpu.mem[cpu.mar]; src = "ram"; }
      if (w.includes("IO")) { bus = cpu.ir & 15; src = "ir"; }
      if (w.includes("AO")) { bus = cpu.a; src = "a"; }
      if (w.includes("EO")) { bus = r.s; src = "alu"; }
      const D = { MI: "mar", II: "ir", AI: "a", BI: "b", RI: "ram", OI: "out", J: "pc" };
      w.forEach((s) => { if (D[s]) dst = D[s]; });
      const op = OPS[cpu.ir >> 4] || "NOP";
      const key = w.filter((s) => s !== "SU" && s !== "FI").join("_");
      let d;
      switch (key) {
        case "CO_MI": d = S.d.CO_MI(cpu.pc); break;
        case "RO_II_CE": d = S.d.RO_II_CE(cpu.mar, bits(bus, 8).replace(/^(\d{4})/, "$1 "), (cpu.pc + 1) & 15, mnem(bus)); break;
        case "IO_MI": d = S.d.IO_MI(bus); break;
        case "RO_AI": d = S.d.RO_AI(cpu.mar, bus); break;
        case "RO_BI": d = S.d.RO_BI(cpu.mar, bus); break;
        case "EO_AI": {
          const sign = su ? "−" : "+";
          const over = !su && r.c ? S.d.overAdd : su && r.c ? S.d.overSub : "";
          d = S.d.EO_AI(sign, cpu.a, cpu.b, r.s, r.c, over); break;
        }
        case "AO_RI": d = S.d.AO_RI(bus, cpu.mar); break;
        case "AO_OI": d = S.d.AO_OI(bus); break;
        case "IO_J": d = S.d.IO_J(bus); break;
        case "HLT": d = S.d.HLT; break;
        default: d = op === "JC" ? S.d.JC_NO : S.d.NOP;
      }
      return { w, bus, src, dst, su, r, desc: d, t: cpu.t, op: cpu.t < 2 ? null : op };
    }
    // aktarımı uygula (saat kenarında yazmaçlar yükler)
    function commit(x) {
      const { w, bus, r } = x;
      if (w.includes("MI")) cpu.mar = bus & 15;
      if (w.includes("II")) cpu.ir = bus;
      if (w.includes("AI")) cpu.a = bus;
      if (w.includes("BI")) cpu.b = bus;
      if (w.includes("RI")) cpu.mem[cpu.mar] = bus;
      if (w.includes("OI")) { cpu.out = bus; cpu.outs.push(bus); if (cpu.outs.length > 40) cpu.outs.shift(); }
      if (w.includes("J")) cpu.pc = bus & 15;
      if (w.includes("CE")) cpu.pc = (cpu.pc + 1) & 15;
      if (w.includes("FI")) cpu.cf = r.c;
      if (w.includes("HLT")) { cpu.halted = true; setMode(null); }
      cpu.t++;
      cpu.clocks++;
      renderMem(); updateStatus();
    }
    function tick(dur) {
      if (pending) { commit(pending.x); pending = null; }
      const x = clock();
      if (!x) { updateStatus(); return; }
      lastWord = x.w; lastDesc = x.desc; lastT = x.t; lastBus = x.bus; lastSrc = x.src; lastDst = x.dst; lastOp = x.op;
      pulse = 1;
      pending = { x, t: 0, dur: L.reduced() ? 0.001 : dur };
      renderMem(); updateStatus();
    }
    let lastOp = null;
    function stepOnce() { setMode(null); tick(0.55); }
    function instrOnce() {
      if (cpu.halted) return;
      if (pending) { commit(pending.x); pending = null; }
      if (cpu.t >= 2 && !word()) cpu.t = 0; // önceki komut bitmişse yenisini getir
      setMode("instr"); acc = 1;
    }
    function setMode(m) {
      mode = m;
      runB.textContent = mode === "run" ? S.stop : S.run;
      runB.classList.toggle("on", mode === "run");
    }

    /* --- bellek görünümü: 16 satır, her bit tıklanabilir --- */
    const rowEls = [];
    for (let a = 0; a < 16; a++) {
      const bitsB = [];
      const row = h("div.c14-row", h("span.c14-ad", String(a)));
      const grp = [h("span.c14-bits.op"), h("span.c14-bits.arg")];
      for (let k = 7; k >= 0; k--) {
        const b = h("button.c14-bit", { type: "button", "aria-label": `Adres ${a}, bit ${k}`, onclick: () => { cpu.mem[a] ^= 1 << k; renderMem(); draw(); } });
        bitsB[k] = b; grp[k >= 4 ? 0 : 1].append(b);
      }
      const mn = h("span.c14-mn"), dec = h("span.c14-dec");
      row.append(grp[0], grp[1], mn, dec);
      rowEls.push({ row, bitsB, mn, dec });
      memRows.append(row);
    }
    function renderMem() {
      const accessed = lastWord && (lastWord.includes("RO") || lastWord.includes("RI"));
      rowEls.forEach((r, a) => {
        const v = cpu.mem[a];
        for (let k = 0; k < 8; k++) { const on = (v >> k) & 1; r.bitsB[k].classList.toggle("on", !!on); r.bitsB[k].textContent = on; }
        const isCode = a < cpu.code;
        r.mn.textContent = isCode ? mnem(v) : String(v);
        r.dec.textContent = isCode ? String(v) : "";
        r.row.classList.toggle("data", !isCode);
        r.row.classList.toggle("pc", a === cpu.pc);
        r.row.classList.toggle("mar", a === cpu.mar && !!accessed);
      });
    }

    function updateStatus() {
      const t = lastT;
      phase.textContent = t == null ? "T0" : `T${t} · ${t < 2 ? S.getir : S.yurut}${lastOp && t >= 2 ? " " + lastOp : ""}`;
      desc.innerHTML = lastDesc;
      SIGS.forEach((s) => sigEl[s].classList.toggle("on", !!(lastWord && lastWord.includes(s))));
      outLine.innerHTML = cpu.outs.length ? `${S.outs}: <b>${cpu.outs.slice(-12).join(" · ")}</b>` : `${S.clocks}: ${cpu.clocks}`;
    }

    /* --- blok şeması --- */
    let cs, LAY = null;
    function layout() {
      const { w, h: H } = cs;
      const pad = w < 520 ? 8 : 12, top = 10, bottom = 8;
      const busW = clamp(w * 0.075, 20, 32), stub = clamp(w * 0.035, 10, 22);
      const colW = (w - 2 * pad - busW - 2 * stub) / 2;
      const gapY = clamp(H * 0.018, 6, 12);
      const bh = (H - top - bottom - 4 * gapY) / 5;
      const xL = pad, xR = w - pad - colW, bx0 = xL + colW + stub, bx1 = bx0 + busW;
      const B = {};
      const L1 = ["clk", "mar", "ram", "ir", "ctl"], R1 = ["pc", "a", "alu", "b", "out"];
      L1.forEach((k, i) => (B[k] = { x: xL, y: top + i * (bh + gapY), w: colW, h: bh, side: -1 }));
      R1.forEach((k, i) => (B[k] = { x: xR, y: top + i * (bh + gapY), w: colW, h: bh, side: 1 }));
      LAY = { B, bx0, bx1, busW, stub, top, bh, gapY, H, w };
    }
    // bus'a bağlanan bloklar ve bağlantı genişliği
    const BUSLINK = { pc: 4, mar: 4, ram: 8, ir: 8, a: 8, alu: 8, b: 8, out: 8 };
    const linkY = (b) => b.y + b.h * 0.5;
    function stubEnds(k) {
      const b = LAY.B[k];
      const y = linkY(b);
      return b.side < 0 ? [[b.x + b.w, y], [LAY.bx0, y]] : [[b.x, y], [LAY.bx1, y]];
    }
    function rr(ctx, x, y, w, hh, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, hh, r) : ctx.rect(x, y, w, hh); }
    // LED sırası: 1 kırmızı, 0 mavi. Genişliğe sığmazsa aralık daralır. Son LED'in sağ kenarını döndürür.
    function leds(ctx, x, y, v, n, r, maxW) {
      const ex = n === 8 ? 0.6 : 0;
      let sp = r * 2.8;
      if (maxW && (n - 1 + ex) * sp + 2 * r > maxW) { sp = (maxW - 2 * r) / (n - 1 + ex); r = Math.min(r, sp * 0.42); }
      let cx = 0;
      for (let i = 0; i < n; i++) {
        const bit = (v >> (n - 1 - i)) & 1;
        cx = x + r + i * sp + (i >= 4 && n === 8 ? ex * sp : 0);
        if (bit) { ctx.fillStyle = rgba(C.v1, 0.22); ctx.beginPath(); ctx.arc(cx, y, r * 1.9, 0, Math.PI * 2); ctx.fill(); }
        ctx.beginPath(); ctx.arc(cx, y, r, 0, Math.PI * 2);
        ctx.fillStyle = bit ? C.v1 : rgba(C.v0, 0.55); ctx.fill();
      }
      return cx + r;
    }
    function seg7(ctx, x, y, w, hh, d) {
      const sg = Logic.SEG7[d] || "0000000";
      const t = Math.max(2, w * 0.16), on = C.v1, off = rgba(C.v1, 0.09);
      const H2 = hh / 2;
      const hs = (x0, y0, k) => { ctx.fillStyle = sg[k] === "1" ? on : off; ctx.beginPath(); ctx.moveTo(x0 + t * 0.5, y0); ctx.lineTo(x0 + t, y0 - t / 2); ctx.lineTo(x0 + w - t, y0 - t / 2); ctx.lineTo(x0 + w - t * 0.5, y0); ctx.lineTo(x0 + w - t, y0 + t / 2); ctx.lineTo(x0 + t, y0 + t / 2); ctx.closePath(); ctx.fill(); };
      const vs = (x0, y0, k) => { ctx.fillStyle = sg[k] === "1" ? on : off; ctx.beginPath(); ctx.moveTo(x0, y0 + t * 0.5); ctx.lineTo(x0 + t / 2, y0 + t); ctx.lineTo(x0 + t / 2, y0 + H2 - t); ctx.lineTo(x0, y0 + H2 - t * 0.5); ctx.lineTo(x0 - t / 2, y0 + H2 - t); ctx.lineTo(x0 - t / 2, y0 + t); ctx.closePath(); ctx.fill(); };
      hs(x, y, 0); vs(x + w, y, 1); vs(x + w, y + H2, 2); hs(x, y + hh, 3); vs(x, y + H2, 4); vs(x, y, 5); hs(x, y + H2, 6);
    }
    function draw() {
      if (!cs || !cs.w) return;
      layout();
      const { ctx, w, h: H } = cs;
      ctx.clearRect(0, 0, w, H);
      const { B, bx0, bx1, busW } = LAY;
      const small = w < 520;
      const p = pending ? L.ease(clamp(pending.t / pending.dur, 0, 1)) : 1;
      const live = !!pending;
      const src = live ? pending.x.src : null, dst = live ? pending.x.dst : null;
      const busVal = live && pending.x.bus != null ? pending.x.bus : null;

      // veri yolu: 8 hat. Sürülmüyorsa Z (kesikli gri)
      const lane = busW / 9;
      for (let i = 0; i < 8; i++) {
        const x = bx0 + lane * (i + 1);
        if (busVal == null) { ctx.strokeStyle = rgba(C.muted, 0.55); ctx.setLineDash([4, 4]); }
        else { ctx.strokeStyle = (busVal >> (7 - i)) & 1 ? C.v1 : C.v0; ctx.setLineDash([]); }
        ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, LAY.top); ctx.lineTo(x, LAY.top + 5 * LAY.bh + 4 * LAY.gapY); ctx.stroke();
      }
      ctx.setLineDash([]);
      // yol etiketi (dikey)
      ctx.save(); ctx.translate((bx0 + bx1) / 2, LAY.top + LAY.bh * 2.5 + LAY.gapY * 2); ctx.rotate(-Math.PI / 2);
      ctx.font = `700 ${small ? 9.5 : 10.5}px ${FONT.display}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const bl = `${S.bus} · ${busVal == null ? S.busZ : bits(busVal, 8)}`;
      const tw = ctx.measureText(bl).width + 12;
      ctx.fillStyle = "rgba(11,30,22,0.92)"; ctx.fillRect(-tw / 2, -8, tw, 16);
      ctx.fillStyle = busVal == null ? C.muted : C.silk; ctx.fillText(bl, 0, 0.5);
      ctx.restore();

      // blok–yol bağlantıları
      Object.entries(BUSLINK).forEach(([k, n]) => {
        const [a, b] = stubEnds(k);
        const act = k === src || k === dst;
        ctx.strokeStyle = act ? C.copper2 : rgba(C.silk, 0.22);
        ctx.lineWidth = n === 8 ? 6 : 3.5; ctx.lineCap = "butt";
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      });
      // yol dışı bağlantılar (oklar)
      const arrowV = (x, y0, y1, label, act) => {
        ctx.strokeStyle = act ? C.copper2 : rgba(C.silk, 0.4); ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1 - Math.sign(y1 - y0) * 4); ctx.stroke();
        const s = Math.sign(y1 - y0);
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x - 4, y1 - s * 6); ctx.lineTo(x + 4, y1 - s * 6); ctx.closePath(); ctx.fill();
        if (label && !small) { ctx.font = `600 9.5px ${FONT.mono}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = C.muted; ctx.fillText(label, x + 6, (y0 + y1) / 2); }
      };
      const ramAcc = live && (pending.x.w.includes("RO") || pending.x.w.includes("RI"));
      arrowV(B.mar.x + B.mar.w * 0.82, B.mar.y + B.mar.h, B.ram.y, "4", ramAcc);
      arrowV(B.ir.x + B.ir.w * 0.82, B.ir.y + B.ir.h, B.ctl.y, "4", live && pending.x.t >= 2);
      arrowV(B.a.x + B.a.w * 0.82, B.a.y + B.a.h, B.alu.y, "8", src === "alu");
      arrowV(B.b.x + B.b.w * 0.82, B.b.y, B.alu.y + B.alu.h, "8", src === "alu");

      // bloklar: başlık solda, değer sağda, bitler altta
      let outX = 0;
      Object.entries(B).forEach(([k, b]) => {
        const act = k === src ? "src" : k === dst ? "dst" : null;
        rr(ctx, b.x, b.y, b.w, b.h, 7);
        ctx.fillStyle = act ? "rgba(40,30,18,0.75)" : "rgba(6,21,15,0.62)"; ctx.fill();
        ctx.strokeStyle = act ? C.copper2 : rgba(C.silk, 0.2); ctx.lineWidth = act ? 2 : 1; ctx.stroke();
        if (k === "ctl" && cpu.halted) { ctx.strokeStyle = C.heat; ctx.lineWidth = 2; ctx.stroke(); }
        const narrow = b.w < 205;
        const fT = narrow ? 11.5 : 12.5, fV = clamp(b.h * 0.19, 12, 19);
        const ty = b.y + clamp(b.h * 0.2, 12, 20);
        let vw = 0;
        const value = (t, col) => {
          ctx.font = `700 ${fV}px ${FONT.mono}`; ctx.textAlign = "right"; ctx.textBaseline = "middle";
          ctx.fillStyle = col || C.silk; ctx.fillText(t, b.x + b.w - 10, ty + 1);
          vw = ctx.measureText(t).width;
        };
        const r = clamp(b.h * 0.085, 3.5, 7.5);
        const ly = b.y + b.h * 0.68;
        const lx = b.x + 10, lw = b.w - 20;
        switch (k) {
          case "pc": value(String(cpu.pc)); leds(ctx, lx, ly, cpu.pc, 4, r, lw); break;
          case "mar": value(String(cpu.mar)); leds(ctx, lx, ly, cpu.mar, 4, r, lw); break;
          case "a": value(String(cpu.a)); leds(ctx, lx, ly, cpu.a, 8, r, lw); break;
          case "b": value(String(cpu.b)); leds(ctx, lx, ly, cpu.b, 8, r, lw); break;
          case "ir": value(mnem(cpu.ir), C.copper2); leds(ctx, lx, ly, cpu.ir, 8, r, lw); break;
          case "ram": { const v = cpu.mem[cpu.mar]; value(`[${cpu.mar}] ${v}`); leds(ctx, lx, ly, v, 8, r, lw); break; }
          case "alu": {
            const su = live && pending.x.su ? 1 : 0;
            const q = alu(cpu.a, cpu.b, su);
            value(`${su ? "A−B" : "A+B"}=${q.s}`);
            const cw = 30;
            leds(ctx, lx, ly, q.s, 8, r, lw - cw);
            // elde bayrağı
            const fx = b.x + b.w - 10 - r;
            ctx.beginPath(); ctx.arc(fx, ly, r, 0, Math.PI * 2); ctx.fillStyle = cpu.cf ? C.v1 : rgba(C.v0, 0.55); ctx.fill();
            ctx.font = `700 ${narrow ? 10 : 11}px ${FONT.mono}`; ctx.textAlign = "right"; ctx.fillStyle = C.muted;
            ctx.fillText("C", fx - r - 4, ly + 0.5);
            break;
          }
          case "out": {
            // yedi segment kutusu başlığa yer bıraksın: kutu genişliği = 2,2 · dh + 22
            ctx.font = `650 ${fT}px ${FONT.display}`;
            const tW = ctx.measureText(S.blkShort.out).width + 26;
            const dh = Math.min(clamp(b.h * 0.5, 16, 40), (b.w - 20 - tW - 22) / 2.2), dw = dh * 0.5, gap = dw * 0.7;
            const boxW = 3 * dw + 2 * gap + 22;
            const x0 = b.x + b.w - 10 - boxW;
            outX = x0;
            const yc = b.y + b.h * 0.56;
            rr(ctx, x0, yc - dh / 2 - 8, boxW, dh + 16, 4); ctx.fillStyle = "#0a0f0c"; ctx.fill();
            const digits = String(cpu.out).padStart(3, " ").split("");
            digits.forEach((d, i) => seg7(ctx, x0 + 11 + i * (dw + gap), yc - dh / 2, dw, dh, d === " " ? -1 : +d));
            if (x0 - lx > 120) leds(ctx, lx, ly, cpu.out, 8, r, x0 - lx - 14);
            break;
          }
          case "clk": {
            value(cpu.halted ? "HLT" : mode === "run" ? fmt(hz, "Hz", 2) : S.tick(cpu.clocks), cpu.halted ? C.heat : C.silk);
            const ww = Math.min(110, lw), y0 = ly - r * 1.4, hh = r * 2.8;
            ctx.strokeStyle = pulse > 0.05 ? L.mix(C.muted, C.ch1, pulse) : C.muted; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(lx, y0 + hh);
            for (let i = 0; i < 4; i++) { const xx = lx + (i * ww) / 4; ctx.lineTo(xx, y0 + hh); ctx.lineTo(xx, y0); ctx.lineTo(xx + ww / 8, y0); ctx.lineTo(xx + ww / 8, y0 + hh); }
            ctx.lineTo(lx + ww, y0 + hh); ctx.stroke();
            break;
          }
          case "ctl": {
            value(OPS[cpu.ir >> 4] || "NOP", C.copper2);
            const cur = lastT == null ? -1 : lastT;
            const sw = Math.min(34, (lw - 12) / 5), sh = clamp(r * 2.8, 14, 20);
            for (let i = 0; i < 5; i++) {
              const x = lx + i * (sw + 3);
              rr(ctx, x, ly - sh / 2, sw, sh, 3);
              ctx.fillStyle = i === cur ? (i < 2 ? rgba(C.ch2, 0.85) : C.copper2) : rgba(C.silk, 0.08); ctx.fill();
              ctx.font = `700 ${narrow ? 9.5 : 10.5}px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = i === cur ? C.mask : C.muted;
              ctx.fillText("T" + i, x + sw / 2, ly + 0.5);
            }
            break;
          }
        }
        // başlık: yer varsa uzun adı, yoksa kısaltması
        ctx.font = `650 ${fT}px ${FONT.display}`; if ("fontStretch" in ctx) ctx.fontStretch = "semi-condensed";
        ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = act ? C.copper2 : C.silk2;
        const full = S.blk[k];
        const room = k === "out" ? outX - b.x - 16 : b.w - vw - 30;
        ctx.fillText(ctx.measureText(full).width <= room ? full : S.blkShort[k], b.x + 10, ty);
      });

      // aktarılan değer: kaynaktan yola, yol boyunca, yoldan hedefe
      if (live && src && dst && busVal != null) {
        const [s0, s1] = stubEnds(src), [d1, d0] = stubEnds(dst);
        const bxm = (bx0 + bx1) / 2;
        const pts = [s0, [bxm, s1[1]], [bxm, d0[1]], d1];
        const seglen = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
        const tot = seglen.reduce((a, b) => a + b, 0);
        let dd = p * tot, k = 0;
        while (k < seglen.length - 1 && dd > seglen[k]) { dd -= seglen[k]; k++; }
        const f = seglen[k] ? dd / seglen[k] : 1;
        const x = lerp(pts[k][0], pts[k + 1][0], f), y = lerp(pts[k][1], pts[k + 1][1], f);
        const n = BUSLINK[src] === 4 || BUSLINK[dst] === 4 || src === "ir" ? 4 : 8;
        const label = `${bits(busVal & (n === 4 ? 15 : 255), n)} = ${busVal & (n === 4 ? 15 : 255)}`;
        ctx.font = `700 ${small ? 10.5 : 12}px ${FONT.mono}`;
        const tw2 = ctx.measureText(label).width + 14;
        rr(ctx, x - tw2 / 2, y - 11, tw2, 22, 11);
        ctx.fillStyle = C.copper2; ctx.fill();
        ctx.fillStyle = C.mask; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, x, y + 0.5);
      }
    }
    cs = canvas(cv, draw);

    /* --- denetimler --- */
    const progSeg = seg(Object.entries(S.progs), prog, (k) => load(k), "Program");
    const stepB = btn(S.step, stepOnce, "primary");
    const instrB = btn(S.instr, instrOnce);
    const runB = btn(S.run, () => { if (cpu.halted) return; setMode(mode === "run" ? null : "run"); acc = 1 / hz; });
    const resetB = btn(S.reset, reset);
    const hzS = slider({ label: S.speed, min: 0.5, max: 40, step: 0.1, value: hz, log: true, fmt: (v) => fmt(v, "Hz", 2), oninput: (v) => { hz = v; } });
    stage.append(h("div.controls", progSeg, stepB, instrB, runB, resetB, hzS));

    const lp = loop((dt) => {
      pulse = Math.max(0, pulse - dt * 3);
      if (pending) {
        pending.t += dt;
        if (pending.t >= pending.dur) { commit(pending.x); pending = null; if (mode === "instr" && cpu.t >= 2 && !word()) setMode(null); }
      }
      if (mode === "run") {
        acc += dt;
        const per = 1 / hz;
        if (acc >= per) { acc = acc % per; tick(Math.min(0.5, per * 0.75)); }
      } else if (mode === "instr") {
        acc += dt;
        if (!pending && acc >= 0.22) {
          acc = 0;
          // komut bitti mi? (sıradaki adım yeni bir getirme)
          if (cpu.t >= 2 && !word()) { setMode(null); }
          else tick(0.2);
        }
      }
      draw();
    });

    load(prog);
    return { enter() { lp.start(); }, leave() { lp.stop(); setMode(null); } };
  };
  G["mini-bilgisayar"] = [{ click: "=Adım" }, { wait: 1100 }, { click: "=Adım" }, { wait: 1100 }, { click: "=Komut" }, { wait: 1600 }, { click: "=Çalıştır" }];
  GUIDE_TARGETS["mini-bilgisayar"] = "=Adım";

  /* =====================================================================
     14.2 Mikrodenetleyici: kod satırı → pin → LED; pinin içinde CMOS çıkış katı
     ===================================================================== */
  // programlar (veri): satır metinleri; {d:k} k numaralı bekleme parametresi; act: satırın etkisi
  const MPROGS = {
    blink: {
      circuit: "c14Blink", pins: [13],
      params: [{ label: S.pOn, v: 500, min: 50, max: 2000 }, { label: S.pOff, v: 500, min: 50, max: 2000 }],
      lines: [
        ["void setup() {"], ["  pinMode(13, OUTPUT);", { mode: 13 }], ["}"], [""],
        ["void loop() {"], ["  digitalWrite(13, HIGH);", { write: [13, 1] }], ["  delay(@0);", { delay: 0 }],
        ["  digitalWrite(13, LOW);", { write: [13, 0] }], ["  delay(@1);", { delay: 1 }], ["}"],
      ],
    },
    two: {
      circuit: "c14Two", pins: [12, 13],
      params: [{ label: S.pWait, v: 400, min: 50, max: 2000 }],
      lines: [
        ["void setup() {"], ["  pinMode(12, OUTPUT);", { mode: 12 }], ["  pinMode(13, OUTPUT);", { mode: 13 }], ["}"], [""],
        ["void loop() {"], ["  digitalWrite(12, HIGH);", { write: [12, 1] }], ["  digitalWrite(13, LOW);", { write: [13, 0] }], ["  delay(@0);", { delay: 0 }],
        ["  digitalWrite(12, LOW);", { write: [12, 0] }], ["  digitalWrite(13, HIGH);", { write: [13, 1] }], ["  delay(@0);", { delay: 0 }], ["}"],
      ],
    },
    fade: {
      circuit: "c14Fade", pins: [9],
      params: [{ label: S.pStep, v: 30, min: 5, max: 120 }],
      vars: { b: 0, adim: 5 },
      lines: [
        ["int b = 0;     // 0–255"], ["int adim = 5;"], [""],
        ["void setup() {"], ["  pinMode(9, OUTPUT);", { mode: 9 }], ["}"], [""],
        ["void loop() {"], ["  analogWrite(9, b);", { pwm: 9 }], ["  b = b + adim;", { fn: (v) => { v.b += v.adim; } }],
        ["  if (b <= 0 || b >= 255)", { fn: (v) => { if (v.b <= 0 || v.b >= 255) v.adim = -v.adim; } }], ["    adim = -adim;"],
        ["  delay(@0);", { delay: 0 }], ["}"],
      ],
    },
  };
  // ATmega328P'de 9. pinin PWM frekansı (Arduino varsayılanı): 16 MHz / 64 / 510
  const PWM9 = 16e6 / 64 / 510;

  Demos.c14mcu = function (stage) {
    const codeEl = h("div.c14-code");
    const varsEl = h("div.c14-vars");
    const codePane = h("div.c14-codepane", h("div.c14-code-h", S.codeTitle), codeEl, varsEl);
    const boardPane = h("div.pane.c14-board");
    const stagePane = h("div.pane.c14-board", { style: { display: "none" } });
    const zoomB = btn(S.zoomOn, () => setZoom(!zoom), "c14-zoom");
    const right = h("div.c14-right", boardPane, stagePane, zoomB);
    const body = h("div.split.c14-mcu", codePane, right);
    const meters = h("div.meters");
    const flag = h("span.flag");
    const strip = h("div.c14-strip", meters, flag);
    stage.append(body, strip);

    let progK = "blink", P = MPROGS.blink, sch = null, zoom = false, Rser = 220;
    const params = {};
    let vars = {}, pc = 0, wait = 0, loops = 0, inSetup = true, flash = {};
    const pins = {};
    const stageSch = Schematic(stagePane, clone(CIRCUITS.c14Stage), { maxUnit: 26 });

    // satır listesi: setup satırları bir kez, loop satırları sürekli
    let execList = [], loopStart = 0;
    function buildCode() {
      codeEl.innerHTML = "";
      P.lineEls = P.lines.map(([t], i) => {
        const txt = t.replace(/@(\d)/, (_, k) => `<span class="c14-num">${Math.round(params[k])}</span>`);
        const ln = h("div.c14-ln", h("span.c14-no", String(i + 1)), h("span.c14-tx", { html: hl(txt) }));
        codeEl.append(ln);
        return ln;
      });
      execList = []; loopStart = 0;
      let inLoop = false;
      P.lines.forEach(([t, a], i) => {
        if (t.startsWith("void loop")) { inLoop = true; loopStart = execList.length; }
        if (a) execList.push(i);
      });
      if (!inLoop) loopStart = 0;
    }
    // basit sözdizimi renklendirme
    function hl(t) {
      return t
        .replace(/(\/\/.*)$/, '<span class="c14-cm">$1</span>')
        .replace(/\b(void|int|if)\b/g, '<span class="c14-kw">$1</span>')
        .replace(/\b(pinMode|digitalWrite|analogWrite|delay|setup|loop)\b/g, '<span class="c14-fn">$1</span>')
        .replace(/\b(HIGH|LOW|OUTPUT)\b/g, '<span class="c14-k2">$1</span>');
    }
    function updateNums() {
      P.lineEls.forEach((ln, i) => {
        const m = P.lines[i][0].match(/@(\d)/);
        if (m) ln.querySelector(".c14-num").textContent = Math.round(params[m[1]]);
      });
    }

    let sliders = [];
    const ctlRow = h("div.controls");
    const progSeg = seg(Object.entries(S.mProgs), progK, (k) => setProg(k), "Program");
    const rS = slider({ label: S.rser, min: 47, max: 2200, step: 1, value: Rser, log: true, width: "96px", fmt: (v) => fmt(v, "Ω"), oninput: (v) => { Rser = v; applyR(); } });
    const paramBox = h("span.c14-params");
    ctlRow.append(progSeg, paramBox, rS);
    stage.append(ctlRow);

    function applyR() {
      P.pins.forEach((_, k) => sch.set("R" + (k + 1), { R: Rser, label: `R${k + 1} ${fmt(Rser, "Ω")}` }));
      stageSch.set("R1", { R: Rser, label: fmt(Rser, "Ω") });
      calcIon();
      updateMeters();
    }
    // pin 1 iken akım: devrenin kopyasında bütün pinler 1 yapılarak çözülür (PWM ve uyarı için)
    let Ion = 0;
    function calcIon() {
      if (!P.pins.length) return;
      const els = sch.sim.elements.map((e) => ({ ...e.p }));
      P.pins.forEach((_, k) => { els.find((e) => e.id === "P" + (k + 1)).V = 5; });
      const sim = Circuit.create({ elements: els });
      sim.dc();
      Ion = Math.max(...P.pins.map((_, k) => Math.abs(sim.i("A" + (k + 1)))));
    }

    function setProg(k) {
      progK = k; P = MPROGS[k];
      P.params.forEach((pp, i) => (params[i] = pp.v));
      sliders = P.params.map((pp, i) => slider({ label: pp.label, min: pp.min, max: pp.max, step: 1, value: params[i], log: true, width: "96px", fmt: (v) => Math.round(v) + " ms", oninput: (v) => { params[i] = v; updateNums(); } }));
      paramBox.replaceChildren(...sliders);
      boardPane.innerHTML = "";
      if (sch) sch.stop();
      sch = Schematic(boardPane, clone(CIRCUITS[P.circuit]), { maxUnit: 30 });
      sch.on("change", updateMeters);
      if (running) sch.start();
      stageSch.set("PAD", "text", "D" + P.pins[P.pins.length - 1]);
      meters.replaceChildren();
      P.meterEls = P.pins.map((pn) => { const m = meter(S.pinI(pn)); meters.append(m); return m; });
      P.vEl = meter(S.pinV(P.pins[P.pins.length - 1])); meters.append(P.vEl);
      if (k === "fade") { P.dEl = meter(S.duty); P.aEl = meter(S.avgI); meters.append(P.dEl, P.aEl); }
      buildCode();
      vars = clone(P.vars || {});
      Object.keys(pins).forEach((x) => delete pins[x]);
      pc = 0; wait = 0; loops = 0; flash = {};
      applyR();
      renderVars();
      highlight();
    }
    function setZoom(z) {
      zoom = z;
      boardPane.style.display = z ? "none" : "";
      stagePane.style.display = z ? "" : "none";
      zoomB.textContent = z ? S.zoomOff : S.zoomOn;
      zoomB.classList.toggle("on", z);
      requestAnimationFrame(() => { stageSch.layout(); sch.layout(); });
      updateMeters();
    }

    // pin seviyesini şemalara uygula
    function drivePin(pn, level, pwm) {
      const k = P.pins.indexOf(pn);
      if (k < 0) return;
      const id = "P" + (k + 1);
      const part = sch.part(id);
      if (part.state !== level || part.pwm !== pwm) sch.set(id, { state: level, pwm });
      if (k === P.pins.length - 1) {
        const core = stageSch.part("CORE");
        if (core.state !== 1 - level) stageSch.set("CORE", "state", 1 - level);
      }
    }
    // satır yürütme
    function exec(i) {
      const a = P.lines[i][1];
      flash[i] = 1;
      if (a.mode != null) pins[a.mode] = { level: 0, pwm: null };
      if (a.write) { const [pn, lv] = a.write; pins[pn] = { level: lv, pwm: null }; drivePin(pn, lv, null); }
      if (a.pwm != null) { const pn = a.pwm; pins[pn] = { level: 0, pwm: clamp(vars.b, 0, 255) }; }
      if (a.fn) a.fn(vars);
      if (a.delay != null) return params[a.delay] / 1000;
      return 0;
    }
    let running = false, dither = 0;
    const lp = loop((dt) => {
      // bekleme bitene kadar dur; bekleme olmayan satırlar anında yürür (gerçekte birkaç µs)
      wait -= dt;
      let guard = 0;
      while (wait <= 0 && guard++ < 50) {
        if (pc >= execList.length) { pc = loopStart; loops++; }
        const i = execList[pc++];
        const d = exec(i);
        cur = i;
        if (d > 0) { wait += d; break; }
      }
      // PWM: her karede görev oranı kadar "açık" (sigma-delta); göz ortalamayı görür
      P.pins.forEach((pn) => {
        const st = pins[pn];
        if (st && st.pwm != null) {
          dither += st.pwm / 255;
          const lv = dither >= 1 ? 1 : 0;
          if (lv) dither -= 1;
          drivePin(pn, lv, st.pwm);
        }
      });
      Object.keys(flash).forEach((k) => { flash[k] -= dt * 2.5; if (flash[k] <= 0) delete flash[k]; });
      highlight();
      renderVars();
    });
    let cur = -1;
    function highlight() {
      P.lineEls.forEach((ln, i) => {
        ln.classList.toggle("cur", i === cur);
        ln.style.setProperty("--fl", flash[i] && i !== cur ? flash[i].toFixed(2) : 0);
      });
    }
    function renderVars() {
      const v = Object.entries(vars).map(([k, x]) => `${k} = <b>${x}</b>`);
      v.push(`${S.loops}: <b>${loops}</b>`);
      varsEl.innerHTML = v.join(" · ");
    }
    function updateMeters() {
      if (!sch || !P.meterEls) return;
      P.pins.forEach((pn, k) => {
        const st = pins[pn];
        const pw = st && st.pwm != null;
        // PWM'de anlık akım kare kare değişir: "açıkken" akımı göster
        const I = pw ? Ion : Math.abs(sch.sim.i("A" + (k + 1)));
        P.meterEls[k].lab.innerHTML = pw ? S.pinIOn(pn) : S.pinI(pn);
        P.meterEls[k].val.textContent = fmt(I < 1e-9 ? 0 : I, "A");
      });
      const last = "P" + P.pins.length;
      const st = pins[P.pins[P.pins.length - 1]];
      const pw = st && st.pwm != null;
      P.vEl.val.textContent = pw ? "PWM" : fmt(sch.v(sch.netOf(last, "o")), "V");
      if (P.dEl) {
        const d = pw ? st.pwm / 255 : 0;
        P.dEl.val.textContent = "%" + num(d * 100, 0);
        P.aEl.val.textContent = fmt(d * Ion, "A");
      }
      const pre = pw ? S.pwmNote(num(PWM9, 0)) + " " : "";
      if (zoom) { setFlag(flag, pre + (sch.part(last).state ? S.stageHigh : S.stageLow), true); return; }
      // pin uyarısı: pin 1 iken akan akım (devrenin kopyasında çözüldü)
      const Is = fmt(Ion, "A");
      if (Ion > 0.04) setFlag(flag, pre + S.pinBad(Is), false);
      else if (Ion > 0.02) setFlag(flag, pre + S.pinWarn(Is), false);
      else setFlag(flag, pre + S.pinOk(Is), true);
    }
    stageSch.on("change", updateMeters);
    setProg(progK);
    return {
      enter() { running = true; sch.start(); stageSch.start(); lp.start(); },
      leave() { running = false; sch.stop(); stageSch.stop(); lp.stop(); },
    };
  };
  G["mikrodenetleyici"] = [{ slide: `label:${S.pOn}`, to: 150 }, { wait: 500 }, { slide: `label:${S.pOff}`, to: 150 }, { wait: 1500 }, { click: S.zoomOn }];

  /* =====================================================================
     14.3 Güvenlik: kısa devre edilen pil ve vücuttan geçen akım
     ===================================================================== */
  Demos.c14safe = function (stage) {
    const modeSeg = seg([["short", S.modeShort], ["body", S.modeBody]], "short", (k) => setMode(k), "Deney");
    const top = h("div.controls.top", modeSeg);
    // görünüm 1: pil
    const shPane = h("div.pane");
    const thCv = h("canvas", { role: "img", "aria-label": S.thermoTitle });
    const thPane = h("div.pane.c14-side", h("span.pane-title", S.thermoTitle), thCv);
    const v1 = h("div.split.c14-safe", shPane, thPane);
    const m1 = { I: meter(S.mI), Pin: meter(S.mPin), Pw: meter(S.mPw), Vt: meter(S.mVt) };
    const flag1 = h("span.flag");
    const strip1 = h("div.c14-strip", h("div.meters", ...Object.values(m1)), flag1);
    const cellSeg = seg(Object.entries(S.cells), "li", (k) => { cell = k; T = 25; rebuildShort(); }, "Pil");
    const fuseSeg = seg([["on", S.fuseOn], ["off", S.fuseOff]], "on", (k) => { fuse = k === "on"; rebuildShort(); }, "Sigorta");
    const shortB = btn(S.shortOn, () => sch1.set("SW", "closed", !sch1.part("SW").closed));
    const newFuseB = btn(S.fuseNew, () => { sch1.repair(); blownI = null; update1(); });
    const ctl1 = h("div.controls", cellSeg, fuseSeg, shortB, newFuseB);
    const view1 = h("div.c14-view", v1, strip1, ctl1);
    // görünüm 2: vücut
    const bdPane = h("div.pane");
    const barCv = h("canvas", { role: "img", "aria-label": S.barTitle });
    const barPane = h("div.pane.c14-side", h("span.pane-title", S.barTitle), barCv);
    const v2 = h("div.split.c14-safe", bdPane, barPane);
    const m2 = { I: meter(S.mBodyI), V: meter(S.mBodyV) };
    const flag2 = h("span.flag");
    const strip2 = h("div.c14-strip", h("div.meters", m2.I, m2.V), flag2);
    const srcSeg = seg(Object.entries(S.srcs), "usb", (k) => { src = k; rebuildBody(); }, "Kaynak");
    const rS = slider({ label: S.rbody, min: 500, max: 200000, step: 1, value: 100000, log: true, width: "110px", fmt: (v) => fmt(v, "Ω", 2), oninput: (v) => { sch2.set("BODY", "R", v); } });
    const dryB = btn(S.dry, () => rS.set(100000, true));
    const wetB = btn(S.wet, () => rS.set(1000, true));
    const ctl2 = h("div.controls", srcSeg, rS, dryB, wetB);
    const view2 = h("div.c14-view", { style: { display: "none" } }, v2, strip2, ctl2);
    stage.append(top, view1, view2);

    const CELLS = CIRCUITS.c14Cells;
    let cell = "li", fuse = true, src = "usb", T = 25, blownI = null, mode = "short";
    const def1 = clone(CIRCUITS.c14Short);
    const sch1 = Schematic(shPane, def1, {
      maxUnit: 28,
      overlay(ctx, s) { heatGlow(ctx, s, [0, 0.5], Math.abs(s.sim.p("RI")), 20); },
    });
    function rebuildShort() {
      const c = CELLS[cell];
      const closed = !!sch1.part("SW").closed;
      const d = clone(CIRCUITS.c14Short);
      d.vRange = [0, c.V];
      d.parts.find((p) => p.id === "B1").V = c.V;
      d.parts.find((p) => p.id === "B1").label = fmt(c.V, "V");
      d.parts.find((p) => p.id === "RI").R = c.Rint;
      d.parts.find((p) => p.id === "RI").label = "R iç " + fmt(c.Rint, "Ω");
      d.parts.find((p) => p.id === "CELL").text = S.cells[cell];
      d.parts.find((p) => p.id === "SW").closed = closed;
      if (!fuse) {
        d.parts = d.parts.filter((p) => p.id !== "F1");
        d.wires.push([[3, -3], [7, -3]]);
      }
      blownI = null;
      sch1.rebuild({ parts: d.parts, wires: d.wires, vRange: d.vRange });
    }
    // sigorta atınca: atmasaydı akacak akım (devrenin kopyasında sigorta sağlamken)
    sch1.on("burn", (p) => {
      if (p.type !== "fuse") return;
      const els = sch1.sim.elements.map((e) => ({ ...e.p }));
      els.find((e) => e.id === "F1").R = 0.05;
      const sim = Circuit.create({ elements: els }); sim.dc();
      blownI = Math.abs(sim.i("A1"));
    });
    sch1.on("change", () => update1());
    function update1() {
      const s = sch1;
      const I = Math.abs(s.sim.i("A1"));
      const Pin = Math.abs(s.sim.p("RI"));
      const closed = !!s.part("SW").closed;
      const Pw = closed ? Math.abs(s.sim.p("SW")) : 0;
      m1.I.val.textContent = fmt(I < 1e-9 ? 0 : I, "A");
      m1.Pin.val.textContent = fmt(Pin < 1e-12 ? 0 : Pin, "W");
      m1.Pw.val.textContent = fmt(Pw < 1e-12 ? 0 : Pw, "W");
      m1.Vt.val.textContent = fmt(s.v(s.netOf("RI", "a")) - s.v(s.netOf("B1", "b")), "V");
      shortB.textContent = closed ? S.shortOff : S.shortOn;
      shortB.classList.toggle("on", closed);
      const blown = s.part("F1") && s.part("F1").burnt;
      newFuseB.style.display = blown ? "" : "none";
      if (blown && blownI != null) setFlag(flag1, S.fuseBlown(fmt(blownI, "A")), true);
      else if (closed && I > 1) setFlag(flag1, S.shortFlag(fmt(I, "A"), fmt(Pin, "W")), false);
      else setFlag(flag1, S.normal, true);
    }
    // ısınma: pilin içindeki güç → sıcaklık (ısı kapasitesi ≈ 1 J/(g·K), çevreye kayıp τ ≈ 120 s)
    let thS;
    function drawThermo() {
      if (!thS || !thS.w) return;
      const { ctx, w, h: H } = thS;
      ctx.clearRect(0, 0, w, H);
      const c = CELLS[cell];
      const x = clamp(w * 0.3, 58, 80), top = 52, bot = H - 40, tw = 18;
      const TMAX = 200, Y = (t) => bot - ((clamp(t, 20, TMAX) - 20) / (TMAX - 20)) * (bot - top);
      // ölçek
      ctx.font = `500 10.5px ${FONT.mono}`; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillStyle = C.muted;
      for (let t = 25; t <= TMAX; t += 25) { ctx.fillText(t + " °C", x - 16, Y(t)); ctx.fillStyle = rgba(C.silk, 0.12); ctx.fillRect(x - 12, Y(t), 6, 1); ctx.fillStyle = C.muted; }
      // bölgeler
      const zones = [[60, S.hot.hot], [c.runaway ? 150 : 100, c.runaway ? S.hot.run : S.hot.leak]];
      ctx.textAlign = "left"; ctx.font = `600 11px ${FONT.display}`;
      zones.forEach(([t, txt]) => {
        ctx.strokeStyle = rgba(C.heat, 0.6); ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x - 4, Y(t)); ctx.lineTo(w - 10, Y(t)); ctx.stroke(); ctx.setLineDash([]);
        wrapText(ctx, txt, x + tw + 10, Y(t) - 9, w - x - tw - 22, 13, T >= t ? "#ffc08a" : rgba(C.silk2, 0.7));
      });
      // termometre
      ctx.fillStyle = "rgba(6,21,15,0.8)"; ctx.strokeStyle = rgba(C.silk, 0.4); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - tw / 2, top - 8, tw, bot - top + 16, tw / 2) : ctx.rect(x - tw / 2, top - 8, tw, bot - top + 16); ctx.fill(); ctx.stroke();
      const col = L.mix(C.v0, C.heat, clamp((T - 25) / 120, 0, 1));
      ctx.fillStyle = col; ctx.fillRect(x - tw / 2 + 4, Y(T), tw - 8, bot + 4 - Y(T));
      ctx.beginPath(); ctx.arc(x, bot + 14, 13, 0, Math.PI * 2); ctx.fill();
      ctx.font = `700 15px ${FONT.mono}`; ctx.textAlign = "left"; ctx.fillStyle = C.silk;
      ctx.fillText(T >= TMAX ? "≥ " + TMAX + " °C" : num(T, 0) + " °C", x + tw + 10, bot + 14);
    }
    function wrapText(ctx, t, x, y, maxW, lh, col) {
      ctx.fillStyle = col; ctx.textBaseline = "middle";
      const words = t.split(" "); let line = "", yy = y;
      const lines = [];
      words.forEach((wd) => { const tt = line ? line + " " + wd : wd; if (ctx.measureText(tt).width > maxW && line) { lines.push(line); line = wd; } else line = tt; });
      if (line) lines.push(line);
      // çizginin üstüne yaz: son satır çizgiye yakın
      yy = y - (lines.length - 1) * lh;
      lines.forEach((ln) => { ctx.fillText(ln, x, yy); yy += lh; });
    }
    thS = canvas(thCv, drawThermo);
    const lp1 = loop((dt) => {
      const c = CELLS[cell];
      const P = Math.abs(sch1.sim.p("RI"));
      T += (P / (c.m * 1.0) - (T - 25) / 120) * dt;
      T = Math.min(T, 400);
      drawThermo();
    });

    // vücut
    const def2 = clone(CIRCUITS.c14Body);
    const sch2 = Schematic(bdPane, def2, { maxUnit: 28 });
    function rebuildBody() {
      const d = clone(CIRCUITS.c14Body);
      const sp = d.parts.find((p) => p.id === "SRC");
      const V = { usb: 5, v9: 9, mains: 230 }[src];
      sp.V = V; sp.label = S.srcs[src];
      if (src === "mains") sp.type = "c14mains";
      d.parts.find((p) => p.id === "BODY").R = sch2.part("BODY").R;
      sch2.rebuild({ parts: d.parts, wires: d.wires, vRange: [0, V] });
    }
    sch2.on("change", () => update2());
    let barS;
    function update2() {
      const I = Math.abs(sch2.sim.i("A1"));
      m2.I.val.textContent = fmt(I, "A") + (src === "mains" ? " " + S.rms : "");
      m2.V.val.textContent = fmt(Math.abs(sch2.sim.vAcross("BODY")), "V");
      const zi = I < 5e-4 ? 0 : I < 0.01 ? 1 : I < 0.03 ? 2 : 3;
      const note = src === "mains" && sch2.part("BODY").R > 3000 ? " " + S.mainsNote : "";
      setFlag(flag2, S.zones[zi][0].toUpperCase() + S.zones[zi].slice(1) + "." + note, zi < 2 && !note);
      drawBar();
    }
    function drawBar() {
      if (!barS || !barS.w) return;
      const { ctx, w, h: H } = barS;
      ctx.clearRect(0, 0, w, H);
      const I = Math.abs(sch2.sim.i("A1"));
      const x = clamp(w * 0.3, 58, 76), top = 64, bot = H - 26, bw = 16;
      const lo = 1e-5, hi = 1;
      const Y = (i) => bot - ((Math.log10(clamp(i, lo, hi)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (bot - top);
      const edges = [lo, 5e-4, 0.01, 0.03, hi];
      const cols = [rgba(C.v0, 0.5), rgba(C.vmid, 0.55), rgba(C.heat, 0.6), rgba(C.v1, 0.75)];
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = cols[k]; ctx.fillRect(x - bw / 2, Y(edges[k + 1]), bw, Y(edges[k]) - Y(edges[k + 1]));
        ctx.font = `600 11.5px ${FONT.display}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillStyle = k === (I < 5e-4 ? 0 : I < 0.01 ? 1 : I < 0.03 ? 2 : 3) ? C.silk : rgba(C.silk2, 0.75);
        wrapText(ctx, S.zones[k], x + bw / 2 + 18, (Y(edges[k]) + Y(edges[k + 1])) / 2 + 6, w - x - bw - 28, 13, ctx.fillStyle);
      }
      ctx.font = `500 10px ${FONT.mono}`; ctx.textAlign = "right"; ctx.fillStyle = C.muted;
      [[1e-5, "10 µA"], [5e-4, "0,5 mA"], [0.01, "10 mA"], [0.03, "30 mA"], [1, "1 A"]].forEach(([i, t]) => ctx.fillText(t, x - bw / 2 - 6, Y(i)));
      // işaretçi
      const y = Y(Math.max(I, lo));
      ctx.fillStyle = C.amp; ctx.beginPath(); ctx.moveTo(x + bw / 2 + 2, y); ctx.lineTo(x + bw / 2 + 11, y - 6); ctx.lineTo(x + bw / 2 + 11, y + 6); ctx.closePath(); ctx.fill();
      ctx.fillRect(x - bw / 2 - 3, y - 1.5, bw + 6, 3);
    }
    barS = canvas(barCv, drawBar);

    function setMode(k) {
      mode = k;
      view1.style.display = k === "short" ? "" : "none";
      view2.style.display = k === "body" ? "" : "none";
      requestAnimationFrame(() => { sch1.layout(); sch2.layout(); drawBar(); drawThermo(); });
    }
    rebuildShort(); update1(); update2();
    return {
      enter() { sch1.start(); sch2.start(); lp1.start(); },
      leave() { sch1.stop(); sch2.stop(); lp1.stop(); },
    };
  };
  G["guvenlik"] = [{ click: S.shortOn }, { wait: 1600 }, { click: "=" + S.fuseOff }, { wait: 2500 }];
})();
