/* 10. bölüm deneyleri: mantık kapıları ve Boole cebiri
   İkili sayılar, temel kapılar, De Morgan, NAND bulmacası, perceptron ve XOR. */
window.STR = window.STR || {};

(function () {
  const { C, FONT, h, slider, seg, btn, canvas, num, rgba, loop, lerp, clamp, ease } = L;
  const S = STR.ch10;
  window.GUIDES = window.GUIDES || {};
  const G = window.GUIDES;
  window.GUIDE_TARGETS = window.GUIDE_TARGETS || {};
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const lc = (v) => L.lcolor(v) || C.muted;

  /* İki yollu (vavien) anahtar: ortak uç c, iki kontak t0 / t1.
     Çözücüde 3 uçlu potansiyometre olarak kurulur: konum 0 → c–t0 kısa, c–t1 açık; konum 1 tersi. */
  Schematic.PARTS.c10spdt = {
    pins: { c: [-2, 0], t0: [2, -1], t1: [2, 1] }, box: [-1.4, -1.5, 1.4, 1.5], interactive: "toggle",
    paths: [{ term: 0, pts: [[2, -1], [1, -1]] }, { term: 1, pts: [[-2, 0], [-1, 0]] }, { term: 2, pts: [[2, 1], [1, 1]] }],
    el: (p, n) => [{ type: "POT", id: p.id, n: [n("t0"), n("c"), n("t1")], R: 1e12, pos: p.closed ? 1 : 0 }],
    elPins: ["t0", "c", "t1"],
    draw(g, p) {
      g.lead([-2, 0], [-1, 0], "c"); g.lead([1, -1], [2, -1], "t0"); g.lead([1, 1], [2, 1], "t1");
      [[-1, 0], [1, -1], [1, 1]].forEach(([x, y]) => g.circle(x, y, 0.16, { fill: C.silk }));
      g.line([-1, 0], p.closed ? [0.92, 0.93] : [0.92, -0.93], { stroke: C.copper2, width: 2.8 });
    },
    info(p, sch) { return `<b>${p.closed ? "1" : "0"}</b> · ${Circuit.fmt(Math.abs(sch.sim.terminals(p.id)[1]), "A")}`; },
  };

  function meter(label) {
    const b = h("b", "—");
    const el = h("div.meter", h("small", label), b);
    el.set = (t) => { b.textContent = t; };
    return el;
  }
  function chip(cls = "") { return h("span.chip" + cls); }
  // ANSI AND gövdesi (+ isteğe bağlı çıkış kabarcığı) — Schematic'teki çizimle aynı ölçüler
  function andPath(ctx, x, y, u, hh = 1.5) {
    ctx.beginPath();
    ctx.moveTo(x - 1.5 * u, y - hh * u); ctx.lineTo(x, y - hh * u);
    ctx.arc(x, y, hh * u, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x - 1.5 * u, y + hh * u); ctx.closePath();
  }
  function strokeBody(ctx, u) {
    ctx.fillStyle = C.mask2; ctx.fill();
    ctx.strokeStyle = C.silk; ctx.lineWidth = Math.max(1, (2 * u) / 20); ctx.lineJoin = "round"; ctx.stroke();
  }
  function bubbleAt(ctx, x, y, u, r = 0.25) {
    ctx.beginPath(); ctx.arc(x, y, r * u, 0, Math.PI * 2);
    strokeBody(ctx, u);
  }
  function wireLine(ctx, pts, v, u) {
    ctx.strokeStyle = lc(v); ctx.lineWidth = Math.max(1.5, (3 * u) / 20); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.setLineDash(v === 0 || v === 1 ? [] : [u * 0.25, u * 0.2]);
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.setLineDash([]);
  }
  // NAND editörü dikey yerleşimde x ↔ y yer değiştirir; yazılar yine dik çizilir
  let SWAP = false;
  function txt(ctx, s, x, y) {
    if (!SWAP) return ctx.fillText(s, x, y);
    ctx.save(); ctx.transform(0, 1, 1, 0, 0, 0); ctx.textAlign = "center"; ctx.fillText(s, y, x); ctx.restore();
  }
  // mantık giriş kutusu (Schematic "input" parçası gibi)
  function inBox(ctx, x, y, u, v, name) {
    ctx.beginPath(); ctx.roundRect(x - 1.5 * u, y - 0.7 * u, 1.6 * u, 1.4 * u, 0.25 * u);
    ctx.fillStyle = rgba(v ? C.v1 : C.v0, 0.22); ctx.fill();
    ctx.strokeStyle = v ? C.v1 : C.v0; ctx.lineWidth = Math.max(1, (2 * u) / 20); ctx.stroke();
    ctx.fillStyle = C.silk; ctx.font = `800 ${Math.max(9, 0.9 * u)}px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    txt(ctx, String(v), x - 0.7 * u, y + 1);
    if (name) { ctx.font = `700 ${Math.max(11, 0.75 * u)}px ${FONT.display}`; ctx.fillStyle = C.silk2; txt(ctx, name, x - 2.4 * u, y + 1); }
  }
  function outLamp(ctx, x, y, u, v, name) {
    const col = v === 1 ? C.v1 : v === 0 ? C.v0 : C.muted;
    if (v === 1) {
      const gr = ctx.createRadialGradient(x, y, 0, x, y, 1.6 * u);
      gr.addColorStop(0, rgba(C.v1, 0.33)); gr.addColorStop(1, rgba(C.v1, 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 1.6 * u, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, y, 0.7 * u, 0, Math.PI * 2);
    ctx.fillStyle = v === 1 ? C.v1 : rgba(col, 0.25); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, (2 * u) / 20);
    ctx.setLineDash(v === 0 || v === 1 ? [] : [3, 3]); ctx.stroke(); ctx.setLineDash([]);
    if (name) { ctx.font = `700 ${Math.max(11, 0.75 * u)}px ${FONT.display}`; ctx.fillStyle = C.silk2; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(name, x + 1.1 * u, y + 1); }
  }
  // gizli, konumlandırılmış erişilebilir düğme (tuval üzerindeki tıklanabilir yerler için)
  function hotBtn(label, onclick) {
    const b = h("button.c10-hot", { type: "button", "aria-label": label, onclick }, h("span.c10-sr", label));
    b.place = (x, y, w, hh) => Object.assign(b.style, { left: x - w / 2 + "px", top: y - hh / 2 + "px", width: w + "px", height: hh + "px", display: "" });
    b.hide = () => { b.style.display = "none"; };
    return b;
  }

  /* =========================================================
     1) İkili sayılar: 8 anahtarlı bir bayt
     ========================================================= */
  Demos.c10Binary = function (stage) {
    const W = 8;
    let bits = Logic.toBits(42, W);
    let busy = false;
    const grid = h("div.c10-byte");
    const cols = [];
    const body = h("div.c10-dip", h("span.c10-dipon", "ON"));
    for (let i = 0; i < W; i++) {
      const k = W - 1 - i, pv = 1 << k;
      const pvEl = h("div.c10-pv", h("b", String(pv)), h("small", "2", h("sup", String(k))));
      const led = h("div.c10-led");
      const dig = h("div.c10-dig", "0");
      const sw = h("button.c10-sw", { type: "button", "aria-label": S.bit(k, pv), onclick: () => { if (busy) return; bits[i] ^= 1; flag(""); update(); } },
        h("span.c10-knob"), h("span.c10-swn", String(i + 1)));
      [pvEl, led, dig].forEach((el, r) => { el.style.gridColumn = String(i + 1); el.style.gridRow = String([1, 2, 4][r]); grid.append(el); });
      body.append(sw);
      cols.push({ pvEl, led, dig, sw });
    }
    body.style.gridColumn = "1 / span 8"; body.style.gridRow = "3";
    grid.append(body);
    const nib = [0, 1].map((k) => {
      const el = h("div.c10-nib", h("b", "0"), h("small", S.nibble));
      el.style.gridColumn = `${1 + 4 * k} / span 4`; el.style.gridRow = "5";
      grid.append(el); return el;
    });
    const sum = h("p.c10-sum");
    const mDec = meter(S.dec), mHex = meter(S.hex), mBin = meter(S.bin), mSig = meter(S.signed);
    const fl = h("span.flag");
    const wrap = h("div.c10-bin", grid, sum, h("div.meters.c10-binm", mDec, mHex, mBin, mSig), fl);
    stage.append(wrap);

    const inp = h("input.c10-num", { type: "number", min: 0, max: 255, step: 1, value: 42, "aria-label": S.decIn, inputmode: "numeric" });
    inp.addEventListener("input", () => {
      const n = Math.floor(+inp.value);
      if (!isFinite(n) || inp.value === "") return;
      if (n < 0 || n > 255) { flag(S.tooBig); return; }
      bits = Logic.toBits(n, W); flag(""); update(true);
    });
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    // +1 / −1: sağdan sola elde (borç) dalgası
    async function ripple(dir) {
      if (busy) return;
      busy = true; flag("");
      for (let i = W - 1; ; i--) {
        if (i < 0) { flag(dir > 0 ? S.overflow : S.underflow); break; }
        const c = cols[i];
        const flip = dir > 0 ? bits[i] === 1 : bits[i] === 0; // devam eden elde / borç
        bits[i] ^= 1;
        cols.forEach((cc) => cc.led.classList.remove("carry"));
        c.led.classList.add("carry");
        update();
        await sleep(L.reduced() ? 40 : 190);
        if (!flip) break;
      }
      cols.forEach((cc) => cc.led.classList.remove("carry"));
      busy = false;
    }
    function double() {
      if (busy) return;
      const lost = bits[0];
      bits = bits.slice(1).concat([0]);
      flag(lost ? S.shiftLost : "");
      grid.classList.remove("shift"); void grid.offsetWidth; grid.classList.add("shift");
      update();
    }
    function flag(t) { fl.textContent = t; }
    stage.append(h("div.controls", btn(S.plus, () => ripple(1), "primary"), btn(S.minus, () => ripple(-1)), btn(S.dbl, double),
      btn(S.clear, () => { if (busy) return; bits = Logic.toBits(0, W); flag(""); update(); }), h("label", S.decIn, inp)));

    function update(fromInput) {
      const v = Logic.fromBits(bits);
      bits.forEach((b, i) => {
        const c = cols[i];
        c.sw.classList.toggle("on", !!b); c.sw.setAttribute("aria-pressed", b ? "true" : "false");
        c.led.classList.toggle("on", !!b);
        c.dig.textContent = String(b); c.dig.className = "c10-dig " + (b ? "b1" : "b0");
        c.pvEl.classList.toggle("on", !!b);
      });
      const terms = bits.map((b, i) => (b ? 1 << (W - 1 - i) : 0)).filter(Boolean);
      sum.innerHTML = terms.length ? terms.map((t) => `<b>${t}</b>`).join(" + ") + ` = <span>${v}</span>` : S.sumZero;
      const hi = Logic.fromBits(bits.slice(0, 4)), lo = Logic.fromBits(bits.slice(4));
      nib[0].firstChild.textContent = hi.toString(16).toUpperCase();
      nib[1].firstChild.textContent = lo.toString(16).toUpperCase();
      mDec.set(String(v));
      mHex.set("0x" + v.toString(16).toUpperCase().padStart(2, "0"));
      mBin.set(bits.slice(0, 4).join("") + " " + bits.slice(4).join(""));
      mSig.set(String(v >= 128 ? v - 256 : v).replace("-", "−"));
      if (!fromInput) inp.value = v;
    }
    update();
    return { enter() {}, leave() {} };
  };
  G["ikili-sayilar"] = [{ click: "aria:" + S.bit(0, 1) }, { wait: 500 }, { click: "=" + S.plus }, { wait: 1100 }, { click: "=" + S.dbl }];

  /* =========================================================
     2) Temel kapılar: sembol, doğruluk tablosu, anahtar devresi
     ========================================================= */
  Demos.c10Gates = function (stage) {
    const KEYS = ["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR"];
    let g = "AND", style = "ansi", a = 0, b = 0, sync = false;
    const lpane = h("div.pane.c10-gpane", h("span.pane-title", S.symbol));
    const apane = h("div.pane.c10-gpane", h("span.pane-title", S.electric));
    const name = h("h3.c10-gname"), trn = h("span.c10-gtr"), expr = h("p.c10-gexpr"), desc = h("p.c10-gdesc"), edesc = h("p.c10-gedesc");
    const cY = chip(), cLed = chip();
    const info = h("div.c10-ginfo", h("div.c10-ghead", name, trn), expr, desc, edesc, h("div.c10-chips", cY, cLed));
    const tbody = h("tbody");
    const thead = h("thead");
    const table = h("table.truth.c10-tt", thead, tbody);
    const tpanel = h("div.c10-tpanel", h("span.c10-ptitle", S.tt), table, h("p.c10-hint", S.ttRowHint));
    stage.append(h("div.controls.top.c10-gctl",
      seg(KEYS.map((k) => [k, k]), g, setGate, S.gateAria),
      h("span.spacer"),
      seg([["ansi", S.ansi], ["iec", S.iec]], style, (k) => { style = k; Lg.rebuild(logicDef()); update(); }, S.styleAria)));
    stage.append(h("div.split.c10-gates", lpane, apane, info, tpanel));

    function logicDef() {
      const d = clone(g === "NOT" ? CIRCUITS.c10Gate1 : CIRCUITS.c10Gate2);
      d.parts.forEach((p) => {
        if (p.id === "G") { p.type = g.toLowerCase(); p.style = style; }
        if (p.id === "A") p.value = a;
        if (p.id === "B") p.value = b;
      });
      return d;
    }
    function analogDef() {
      const d = clone(CIRCUITS["c10Sw" + g[0] + g.slice(1).toLowerCase()]);
      d.parts.forEach((p) => { if (p.id === "SA") p.closed = !!a; if (p.id === "SB") p.closed = !!b; });
      d.pad = 0.5; d.padTop = 1.2;
      return d;
    }
    const Lg = Schematic(lpane, logicDef(), {
      maxUnit: 44,
      overlay(ctx, s) {
        const u = s.unit;
        ctx.textBaseline = "middle"; ctx.font = `700 ${Math.max(12, 0.8 * u)}px ${FONT.display}`; ctx.fillStyle = C.silk2;
        ctx.textAlign = "right";
        ["A", "B"].forEach((id) => { const p = s.part(id); if (!p) return; const [x, y] = s.screenOf([p.at[0] - 1.9, p.at[1]]); ctx.fillText(id, x, y); });
        const py = s.part("Y"); const [yx, yy] = s.screenOf([py.at[0] + 1.6, py.at[1]]);
        ctx.textAlign = "left"; ctx.fillText("Y", yx, yy);
        const [gx, gy] = s.screenOf([0, 2.35]);
        ctx.textAlign = "center"; ctx.font = `650 ${Math.max(11, 0.55 * u)}px ${FONT.display}`; ctx.fillStyle = C.muted;
        ctx.fillText(g + " · " + S.gates[g].tr, gx, gy);
      },
    });
    const El = Schematic(apane, analogDef(), { maxUnit: 30 });

    Lg.on("change", () => {
      if (sync) return;
      const na = Lg.part("A").value ? 1 : 0, nb = Lg.part("B") ? (Lg.part("B").value ? 1 : 0) : b;
      if (na !== a || nb !== b) {
        a = na; b = nb; sync = true;
        El.set("SA", "closed", !!a); if (El.part("SB")) El.set("SB", "closed", !!b);
        sync = false;
      }
      update();
    });
    El.on("change", () => {
      if (sync) return;
      const na = El.part("SA").closed ? 1 : 0, nb = El.part("SB") ? (El.part("SB").closed ? 1 : 0) : b;
      if (na !== a || nb !== b) {
        a = na; b = nb; sync = true;
        Lg.set("A", "value", a); if (Lg.part("B")) Lg.set("B", "value", b);
        sync = false;
      }
      update();
    });
    function setAB(na, nb) {
      sync = true;
      a = na; b = nb;
      Lg.set("A", "value", a); if (Lg.part("B")) Lg.set("B", "value", b);
      El.set("SA", "closed", !!a); if (El.part("SB")) El.set("SB", "closed", !!b);
      sync = false;
      update();
    }
    let rows = [];
    function buildTable() {
      const vars = g === "NOT" ? ["A"] : ["A", "B"];
      const tt = Logic.truthTable((env) => Logic.GATES[g](vars.map((v) => env[v])), vars);
      thead.innerHTML = ""; tbody.innerHTML = "";
      thead.append(h("tr", ...vars.map((v) => h("th", v)), h("th", "Y")));
      rows = tt.map((r) => {
        const tr = h("tr", { tabindex: 0, onclick: () => setAB(r.env.A, vars.length > 1 ? r.env.B : b), onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tr.click(); } } },
          ...r.bits.map((x) => h("td", { class: x ? "b1" : "b0" }, String(x))), h("td.c10-y", { class: r.out ? "b1" : "b0" }, String(r.out)));
        return { tr, r };
      });
      tbody.append(...rows.map((x) => x.tr));
    }
    function setGate(k) {
      g = k;
      sync = true;
      Lg.rebuild(logicDef()); El.rebuild(analogDef());
      sync = false;
      buildTable(); update();
    }
    function update() {
      const I = S.gates[g];
      name.textContent = g; trn.textContent = I.tr;
      expr.innerHTML = I.expr; desc.textContent = I.d; edesc.textContent = I.e;
      const y = Lg.net.value(Lg.netOf("Y", "i"));
      const on = El.sim.i("LED") > 1e-3;
      cY.textContent = S.yOut(y); cY.className = "chip c10-c" + y;
      cLed.textContent = on ? S.ledOn : S.ledOff; cLed.className = "chip " + (on ? "c10-c1" : "c10-c0");
      rows.forEach(({ tr, r }) => tr.classList.toggle("cur", r.env.A === a && (g === "NOT" || r.env.B === b)));
    }
    buildTable(); update();
    return { enter() { Lg.start(); El.start(); }, leave() { Lg.stop(); El.stop(); } };
  };
  G["temel-kapilar"] = [{ click: S.aIn }, { wait: 600 }, { click: S.bIn }, { wait: 900 }, { click: "=OR" }, { wait: 600 }, { click: S.aIn }];

  /* =========================================================
     3) Boole cebiri ve De Morgan
     ========================================================= */
  Demos.c10DeMorgan = function (stage) {
    // --- ifade karşılaştırma ---
    const i1 = h("input.c10-expr", { type: "text", "aria-label": S.e1, spellcheck: "false", autocomplete: "off", autocapitalize: "characters" });
    const i2 = h("input.c10-expr", { type: "text", "aria-label": S.e2, spellcheck: "false", autocomplete: "off", autocapitalize: "characters" });
    const er1 = h("small.c10-err"), er2 = h("small.c10-err");
    const verdict = h("p.c10-verdict");
    const thead = h("thead"), tbody = h("tbody");
    const table = h("table.truth.c10-tt.c10-cmp", thead, tbody);
    const pre = h("div.c10-presets", { role: "group", "aria-label": S.presetAria });
    const presetBtns = S.presets.map(([lab, e1, e2]) => {
      const bt = h("button.c10-pre", { type: "button", onclick: () => { i1.value = e1; i2.value = e2; compare(); } }, lab);
      pre.append(bt); return bt;
    });
    const left = h("div.c10-dmleft",
      pre,
      h("label.c10-el", h("span", S.e1), i1, er1),
      h("label.c10-el", h("span", S.e2), i2, er2),
      h("p.c10-hint", S.syntax),
      verdict,
      h("div.c10-tscroll", table));
    // --- kabarcık itme ---
    const bpane = h("div.pane.c10-bpane", h("span.pane-title", S.bubbleTitle));
    const cv = h("canvas", { role: "img", "aria-label": S.bubbleTitle });
    bpane.append(cv);
    const bA = hotBtn(S.aIn, () => { A ^= 1; drawB(); syncBtns(); });
    const bB = hotBtn(S.bIn, () => { B ^= 1; drawB(); syncBtns(); });
    bpane.append(bA, bB);
    const same = h("p.c10-same");
    const abRow = h("div.c10-abrow");
    const right = h("div.c10-dmright", bpane, abRow, same);
    stage.append(h("div.split.c10-dm", left, right));

    let A = 1, B = 0, law = "nand", t = 0, playing = false, playDir = 1;
    const tbtnA = btn("A: 1", () => { A ^= 1; drawB(); syncBtns(); });
    const tbtnB = btn("B: 0", () => { B ^= 1; drawB(); syncBtns(); });
    const sl = slider({ label: S.bubble, min: 0, max: 1, step: 0.01, value: 0, fmt: (v) => "%" + Math.round(v * 100), oninput: (v) => { t = v; playing = false; drawB(); } });
    const pb = btn(S.play, () => { playing = true; playDir = t > 0.5 ? -1 : 1; lp.start(); });
    abRow.append(tbtnA, tbtnB);
    stage.append(h("div.controls", seg([["nand", S.law1], ["nor", S.law2]], law, (k) => { law = k; drawB(); }, S.lawAria), sl, pb));
    function syncBtns() {
      tbtnA.textContent = "A: " + A; tbtnB.textContent = "B: " + B;
      tbtnA.classList.toggle("on", !!A); tbtnB.classList.toggle("on", !!B);
    }

    function setErr(el, inp, m) { el.textContent = m || ""; inp.classList.toggle("bad", !!m); }
    function compare() {
      let a1, a2;
      try { a1 = Logic.parse(i1.value); setErr(er1, i1); } catch (e) { setErr(er1, i1, e.message); }
      try { a2 = Logic.parse(i2.value); setErr(er2, i2); } catch (e) { setErr(er2, i2, e.message); }
      presetBtns.forEach((bt, k) => bt.classList.toggle("on", S.presets[k][1] === i1.value && S.presets[k][2] === i2.value));
      thead.innerHTML = ""; tbody.innerHTML = "";
      if (!a1 || !a2) { verdict.textContent = ""; verdict.className = "c10-verdict"; return; }
      const vars = [...new Set([...Logic.variables(a1), ...Logic.variables(a2)])].sort();
      if (vars.length > 4) { verdict.textContent = S.tooMany; verdict.className = "c10-verdict bad"; return; }
      const t1 = Logic.truthTable(a1, vars), t2 = Logic.truthTable(a2, vars);
      thead.append(h("tr", ...vars.map((v) => h("th", v)), h("th.c10-sep", S.e1), h("th", S.e2)));
      let diff = 0;
      t1.forEach((r, k) => {
        const o2 = t2[k].out, d = r.out !== o2;
        if (d) diff++;
        tbody.append(h("tr" + (d ? ".c10-diff" : ""), ...r.bits.map((x) => h("td", { class: x ? "b1" : "b0" }, String(x))),
          h("td.c10-sep", { class: r.out ? "b1" : "b0" }, String(r.out)), h("td", { class: o2 ? "b1" : "b0" }, String(o2)),
          h("td.c10-mark", d ? "≠" : "")));
      });
      verdict.textContent = diff ? S.neq(diff, t1.length) : S.eq(t1.length);
      verdict.className = "c10-verdict " + (diff ? "bad" : "good");
    }
    [i1, i2].forEach((el) => el.addEventListener("input", compare));
    i1.value = S.presets[0][1]; i2.value = S.presets[0][2];
    compare();

    // --- çizim: kapı biçimi AND ↔ OR arasında nokta nokta karışır ---
    const NA = 10, NB = 20, NC = 12;
    function quad(p0, p1, p2, n, out) { for (let k = 0; k < n; k++) { const s = k / n; out.push([(1 - s) * (1 - s) * p0[0] + 2 * s * (1 - s) * p1[0] + s * s * p2[0], (1 - s) * (1 - s) * p0[1] + 2 * s * (1 - s) * p1[1] + s * s * p2[1]]); } }
    function andOutline(hh) {
      const o = [];
      for (let k = 0; k < NA; k++) o.push([-1.5 + (1.5 * k) / NA, -hh]);
      for (let k = 0; k < NB * 2; k++) { const an = -Math.PI / 2 + (Math.PI * k) / (NB * 2); o.push([hh * Math.cos(an), hh * Math.sin(an)]); }
      for (let k = 0; k < NA; k++) o.push([0 - (1.5 * k) / NA, hh]);
      for (let k = 0; k < NC; k++) o.push([-1.5, hh - (2 * hh * k) / NC]);
      return o;
    }
    function orOutline(hh) {
      const o = [];
      quad([-1.5, -hh], [0.2, -hh], [1.5, 0], NA + NB, o);
      quad([1.5, 0], [0.2, hh], [-1.5, hh], NA + NB, o);
      quad([-1.5, hh], [-0.8, 0], [-1.5, -hh], NC, o);
      return o;
    }
    const OA = andOutline(1.5), OO = orOutline(1.5);
    let bs = null;
    function drawB() {
      if (!bs || !bs.w) return;
      const { ctx, w, h: H } = bs;
      ctx.clearRect(0, 0, w, H);
      const u = clamp(Math.min(w / 19, (H - 60) / 8), 10, 34);
      const cx = w / 2, cy = 30 + (H - 70) / 2 + 6;
      const X = (x) => cx + x * u, Y = (y) => cy + y * u;
      const s = ease(clamp((t - 0.25) / 0.5, 0, 1));
      // biçimler: nand: AND→OR, nor: OR→AND
      const from = law === "nand" ? OA : OO, to = law === "nand" ? OO : OA;
      const astA = Logic.parse(law === "nand" ? "(A·B)'" : "(A+B)'"), astB = Logic.parse(law === "nand" ? "A' + B'" : "A'·B'");
      const env = { A, B };
      const y1 = Logic.evaluate(astA, env), y2 = Logic.evaluate(astB, env);
      // kabarcık konumları
      const xin = lerp(law === "nand" ? -1.5 : -1.3, law === "nand" ? -1.3 : -1.5, s);
      const p1 = clamp(t / 0.3, 0, 1), p2 = clamp((t - 0.3) / 0.7, 0, 1);
      const bub = (sgn) => (t < 0.3 ? [lerp(1.75, 0.1, ease(p1)), 0] : [lerp(0.1, xin - 0.25, ease(p2)), lerp(0, sgn, ease(p2))]);
      const inBub = t >= 0.3 && bub(-1)[0] < xin - 0.05;
      // teller
      const ins = [["A", A, -1], ["B", B, 1]];
      ins.forEach(([nm, v, yy]) => {
        const bx = bub(yy)[0];
        if (inBub) {
          wireLine(ctx, [[X(-6), Y(yy)], [X(bx - 0.25), Y(yy)]], v, u);
          wireLine(ctx, [[X(bx + 0.25), Y(yy)], [X(xin), Y(yy)]], 1 - v, u);
        } else wireLine(ctx, [[X(-6), Y(yy)], [X(xin), Y(yy)]], v, u);
      });
      const yv = t < 0.5 ? y1 : y2;
      wireLine(ctx, [[X(t < 0.3 ? 2 : 1.5), Y(0)], [X(5.3), Y(0)]], yv, u);
      // gövde
      ctx.beginPath();
      from.forEach((q, k) => { const x = X(lerp(q[0], to[k][0], s)), y = Y(lerp(q[1], to[k][1], s)); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath(); strokeBody(ctx, u);
      // kabarcıklar
      if (t < 0.3) bubbleAt(ctx, X(bub(0)[0]), Y(0), u, 0.25 * (1 - 0.25 * p1));
      else { const r = 0.25 * (0.75 + 0.25 * p2); bubbleAt(ctx, X(bub(-1)[0]), Y(bub(-1)[1]), u, r); bubbleAt(ctx, X(bub(1)[0]), Y(bub(1)[1]), u, r); }
      // girişler ve çıkış
      ins.forEach(([nm, v, yy]) => inBox(ctx, X(-6.1), Y(yy), u, v, nm));
      outLamp(ctx, X(6), Y(0), u, yv, "Y");
      bA.place(X(-6.8), Y(-1), 2 * u, 1.6 * u); bB.place(X(-6.8), Y(1), 2 * u, 1.6 * u);
      // ifade
      const txt = Logic.show(t < 0.5 ? astA : astB);
      ctx.font = `600 ${Math.max(13, 0.75 * u)}px ${FONT.mono}`; ctx.fillStyle = C.silk; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Y = " + txt, cx, Y(2.9));
      ctx.font = `650 ${Math.max(11, 0.5 * u)}px ${FONT.display}`; ctx.fillStyle = C.muted;
      ctx.fillText(t < 0.5 ? (law === "nand" ? "NAND" : "NOR") : (law === "nand" ? "OR + ters girişler" : "AND + ters girişler"), cx, Y(-2.5));
      same.textContent = S.bothSame(y1 === y2 ? y1 : "?");
      same.className = "c10-same " + (y1 === y2 ? "good" : "bad");
    }
    bs = canvas(cv, drawB);
    syncBtns();
    const lp = loop((dt) => {
      if (!playing) { lp.stop(); return; }
      t = clamp(t + playDir * dt * 0.45, 0, 1);
      sl.set(t);
      if (t === 0 || t === 1) playing = false;
      drawB();
    });
    return { enter() { drawB(); }, leave() { playing = false; lp.stop(); } };
  };
  G["de-morgan"] = [{ click: "=Tuzak" }, { wait: 1000 }, { click: "=De Morgan 1" }, { wait: 600 }, { slide: "label:" + S.bubble, to: 1 }, { wait: 500 }, { click: "B: 0" }];

  /* =========================================================
     4) NAND evrenseldir: yalnız NAND ile kur
     ========================================================= */
  Demos.c10Nand = function (stage) {
    const TG = {
      NOT: { expr: "A'", vars: ["A"], min: 1 },
      AND: { expr: "A·B", vars: ["A", "B"], min: 2 },
      OR: { expr: "A+B", vars: ["A", "B"], min: 3 },
      XOR: { expr: "A⊕B", vars: ["A", "B"], min: 4 },
    };
    const NS = 6;
    const COLX = [6, 13, 20], ROWY = [2, 7];
    const slotPos = (k) => [COLX[k >> 1], ROWY[k & 1]];
    const gname = (k) => "N" + (k + 1);
    const state = {};
    Object.keys(TG).forEach((k) => (state[k] = { gates: new Set(), wires: new Map() }));
    let tg = "NOT", pending = null, selected = null, msg = S.hintStart, msgCls = "";
    const inVal = { A: 0, B: 0 };
    const st = () => state[tg];

    const pane = h("div.pane.c10-npane");
    const cv = h("canvas", { role: "img", "aria-label": "NAND devre editörü" });
    const hot = h("div.c10-hotlayer");
    pane.append(cv, hot);
    const thead = h("thead"), tbody = h("tbody");
    const table = h("table.truth.c10-tt", thead, tbody);
    const status = h("p.c10-nstatus");
    const cnt = h("span.chip.c10-cnt");
    const hintEl = h("p.c10-hint");
    const side = h("div.c10-nside", h("div.c10-nrow", cnt), hintEl, status, table);
    const delBtn = btn(S.del, () => { if (selected != null) removeGate(selected); });
    stage.append(h("div.controls.top.c10-nctl", seg(Object.keys(TG).map((k) => [k, k]), tg, setTarget, S.targetAria), h("span.spacer"),
      delBtn, btn(S.reset, () => { state[tg] = { gates: new Set(), wires: new Map() }; pending = selected = null; say(S.hintStart); refresh(); }),
      btn(S.solve, showSolution)));
    stage.append(h("div.split.c10-nand", pane, side));

    // --- erişilebilir sıcak noktalar ---
    const H = { slot: [], body: [], pa: [], pb: [], po: [] };
    for (let k = 0; k < NS; k++) {
      H.slot.push(hotBtn(S.addAt(k + 1), () => addGate(k)));
      H.body.push(hotBtn(S.gateBody(gname(k)), () => { selected = selected === k ? null : k; pending = null; if (selected != null) say(S.sel(gname(k))); refresh(); }));
      H.pa.push(hotBtn(S.pinIn(gname(k), 1), () => pin({ kind: "sink", id: "g" + k + ".a" })));
      H.pb.push(hotBtn(S.pinIn(gname(k), 2), () => pin({ kind: "sink", id: "g" + k + ".b" })));
      H.po.push(hotBtn(S.pinOut(gname(k)), () => pin({ kind: "src", id: "g" + k })));
    }
    const hA = hotBtn(S.srcPin("A"), () => pin({ kind: "src", id: "A" }));
    const hB = hotBtn(S.srcPin("B"), () => pin({ kind: "src", id: "B" }));
    const tA = hotBtn(S.toggleIn("A"), () => { inVal.A ^= 1; refresh(); });
    const tB = hotBtn(S.toggleIn("B"), () => { inVal.B ^= 1; refresh(); });
    const hY = hotBtn(S.yPin, () => pin({ kind: "sink", id: "Y" }));
    // sıra: gövde ve yuvalar altta, uçlar üstte
    hot.append(...H.slot, ...H.body, tA, tB, ...H.pa, ...H.pb, ...H.po, hA, hB, hY);

    function say(t, cls = "") { msg = t; msgCls = cls; }
    function setTarget(k) { tg = k; pending = selected = null; say(S.hintStart); refresh(); }
    function addGate(k) {
      if (st().gates.has(k)) return;
      if (st().gates.size >= NS) { say(S.full); refresh(); return; }
      st().gates.add(k); selected = null; refresh();
    }
    function removeGate(k) {
      const s = st();
      s.gates.delete(k);
      for (const [snk, src] of [...s.wires]) if (src === "g" + k || snk.startsWith("g" + k + ".")) s.wires.delete(snk);
      selected = null; pending = null; refresh();
    }
    // src kapısından snk kapısına giden bir yol var mı? (döngü denetimi)
    function reaches(from, to) {
      const s = st(), seen = new Set(), q = [from];
      while (q.length) {
        const g = q.shift();
        if (g === to) return true;
        if (seen.has(g)) continue;
        seen.add(g);
        for (const [snk, src] of s.wires) if (src === g && snk[0] === "g") q.push(snk.split(".")[0]);
      }
      return false;
    }
    function connect(src, snk) {
      const s = st();
      if (src[0] === "g" && snk[0] === "g") { const gs = snk.split(".")[0]; if (gs === src || reaches(gs, src)) { say(S.loop, "bad"); return; } }
      s.wires.set(snk, src); say(S.hintStart);
    }
    function pin(p) {
      selected = null;
      const s = st();
      if (!pending) {
        if (p.kind === "sink" && s.wires.has(p.id)) { s.wires.delete(p.id); say(S.removed); refresh(); return; }
        pending = p; say(S.hintPend);
      } else if (pending.id === p.id) { pending = null; say(S.hintStart); }
      else if (pending.kind !== p.kind) {
        const src = p.kind === "src" ? p.id : pending.id, snk = p.kind === "sink" ? p.id : pending.id;
        pending = null; connect(src, snk);
      } else { pending = p; say(S.hintPend); }
      refresh();
    }
    function showSolution() {
      const sol = CIRCUITS.c10NandSolutions[tg];
      state[tg] = { gates: new Set(sol.gates), wires: new Map(sol.wires.map(([a, b]) => [b, a])) };
      pending = selected = null; say(S.why[tg], "good"); refresh();
    }

    // --- benzetim: Logic.network ile tüm giriş birleşimleri ---
    function simulate(env) {
      const s = st(), net = Logic.network();
      net.signal("A", env.A ?? 0); net.signal("B", env.B ?? 0);
      for (const k of s.gates) {
        const ins = ["a", "b"].map((pn) => s.wires.get("g" + k + "." + pn) || net.signal("nc" + k + pn, "x"));
        net.gate("NAND", ins, "g" + k, { delay: 1 });
      }
      net.settle(40);
      const val = (n) => net.value(n);
      const ysrc = s.wires.get("Y");
      return { val, y: ysrc ? val(ysrc) : "x" };
    }

    // --- yerleşim ve kablolama ---
    let cs = null, u = 20, ox = 0, oy = 0;
    const WX0 = -2.4, WX1 = 27.6, WY0 = -0.9, WY1 = 9.6;
    const SX = (x) => ox + x * u, SY = (y) => oy + y * u;
    const inY = () => (tg === "NOT" ? { A: 4.5 } : { A: 2, B: 7 });
    const YP = [25, 4.5];
    function srcPos(id) { if (id === "A" || id === "B") return [1, inY()[id]]; const [x, y] = slotPos(+id.slice(1)); return [x + 2.5, y]; }
    function snkPos(id) { if (id === "Y") return YP; const [g, pn] = id.split("."); const [x, y] = slotPos(+g.slice(1)); return [x - 2.5, y + (pn === "a" ? -1 : 1)]; }
    // sütun aralıkları: 0 girişler|1. sütun, 1, 2, 3 son sütun|Y
    const GAP = [[1, 3.5], [8.5, 10.5], [15.5, 17.5], [22.5, 25]];
    const colOfSrc = (id) => (id === "A" || id === "B" ? -1 : +id.slice(1) >> 1);
    const colOfSnk = (id) => (id === "Y" ? 3 : +id.split(".")[0].slice(1) >> 1);
    const ORDER = ["A", "B", "g0", "g1", "g2", "g3", "g4", "g5"];
    function routes() {
      const s = st(), list = [];
      for (const [snk, src] of s.wires) list.push({ snk, src, g1: colOfSrc(src) + 1, g2: colOfSnk(snk) });
      // her aralıkta ve orta kanalda kaynak başına bir şerit
      const lanes = GAP.map(() => new Set()), chan = new Set();
      list.forEach((w) => { lanes[w.g1].add(w.src); if (w.g1 !== w.g2) { lanes[w.g2].add(w.src); chan.add(w.src); } });
      const laneX = (gi, src) => { const arr = ORDER.filter((x) => lanes[gi].has(x)), [a, b] = GAP[gi]; return a + ((arr.indexOf(src) + 1) * (b - a)) / (arr.length + 1); };
      const chArr = ORDER.filter((x) => chan.has(x));
      const chY = (src) => 4.5 + (chArr.indexOf(src) - (chArr.length - 1) / 2) * 0.42;
      list.forEach((w) => {
        const S0 = srcPos(w.src), T = snkPos(w.snk), x1 = laneX(w.g1, w.src);
        if (w.g1 === w.g2) w.pts = [S0, [x1, S0[1]], [x1, T[1]], T];
        else { const x2 = laneX(w.g2, w.src), yc = chY(w.src); w.pts = [S0, [x1, S0[1]], [x1, yc], [x2, yc], [x2, T[1]], T]; }
      });
      return list;
    }
    // aynı ağdaki parçalardan bağlantı noktaları (≥ 3 kol)
    function junctions(list) {
      const by = {};
      list.forEach((w) => (by[w.src] = by[w.src] || []).push(w.pts));
      const dots = [];
      for (const src in by) {
        const polys = by[src];
        if (polys.length < 2) continue;
        const verts = [];
        polys.forEach((P) => P.forEach((q) => verts.push(q)));
        const K = (q) => Math.round(q[0] * 100) + "," + Math.round(q[1] * 100);
        const pieces = new Set();
        polys.forEach((P) => {
          for (let i = 0; i + 1 < P.length; i++) {
            const [a, b] = [P[i], P[i + 1]];
            const on = verts.filter((q) => {
              if (Math.abs(a[0] - b[0]) < 1e-6) return Math.abs(q[0] - a[0]) < 1e-6 && q[1] > Math.min(a[1], b[1]) + 1e-6 && q[1] < Math.max(a[1], b[1]) - 1e-6;
              return Math.abs(q[1] - a[1]) < 1e-6 && q[0] > Math.min(a[0], b[0]) + 1e-6 && q[0] < Math.max(a[0], b[0]) - 1e-6;
            }).sort((p1, p2) => Math.hypot(p1[0] - a[0], p1[1] - a[1]) - Math.hypot(p2[0] - a[0], p2[1] - a[1]));
            const ch = [a, ...on, b];
            for (let j = 0; j + 1 < ch.length; j++) { const k1 = K(ch[j]), k2 = K(ch[j + 1]); if (k1 !== k2) pieces.add(k1 < k2 ? k1 + "|" + k2 : k2 + "|" + k1); }
          }
        });
        const deg = {};
        pieces.forEach((pc) => pc.split("|").forEach((k) => (deg[k] = (deg[k] || 0) + 1)));
        for (const k in deg) if (deg[k] >= 3) { const [x, y] = k.split(",").map((v) => +v / 100); dots.push({ src, at: [x, y] }); }
      }
      return dots;
    }

    let cur = null, tt = null, rowsEl = [];
    function evaluateAll() {
      const T = TG[tg];
      const target = Logic.parse(T.expr);
      tt = Logic.truthTable(target, T.vars).map((r) => ({ ...r, got: simulate(r.env).y }));
      cur = simulate(tg === "NOT" ? { A: inVal.A } : inVal);
    }
    function refresh() {
      evaluateAll();
      const T = TG[tg], s = st();
      cnt.textContent = S.count(s.gates.size, T.min);
      thead.innerHTML = ""; tbody.innerHTML = "";
      thead.append(h("tr", ...T.vars.map((v) => h("th", v)), h("th.c10-sep", S.colT), h("th", S.colC)));
      const curM = T.vars.reduce((m, v) => m * 2 + inVal[v], 0);
      tt.forEach((r) => {
        const okr = r.got === r.out;
        tbody.append(h("tr" + (r.m === curM ? ".cur" : "") + (okr ? "" : ".c10-diff"), ...r.bits.map((x) => h("td", { class: x ? "b1" : "b0" }, String(x))),
          h("td.c10-sep", { class: r.out ? "b1" : "b0" }, String(r.out)),
          h("td", { class: r.got === 1 ? "b1" : r.got === 0 ? "b0" : "c10-x" }, r.got === 1 || r.got === 0 ? String(r.got) : "?"),
          h("td.c10-mark", okr ? "✓" : "≠")));
      });
      const good = tt.filter((r) => r.got === r.out).length;
      let stx, cls;
      if (good === tt.length) {
        stx = S.ok(s.gates.size, tg) + " " + (s.gates.size <= T.min ? S.best : S.better(T.min)); cls = "good";
      } else { stx = (s.wires.has("Y") ? "" : S.noY + " ") + S.partial(good, tt.length); cls = ""; }
      status.textContent = stx; status.className = "c10-nstatus " + cls;
      delBtn.disabled = selected == null;
      hintEl.textContent = msg; hintEl.className = "c10-hint " + msgCls;
      render();
    }

    let portrait = false;
    const pl = (b, x, y, w, hh) => (portrait ? b.place(y, x, hh, w) : b.place(x, y, w, hh));
    function layout() {
      if (!cs || !cs.w) return;
      portrait = cs.h > cs.w;
      const W = portrait ? cs.h : cs.w, Hh = portrait ? cs.w : cs.h;
      u = Math.min((W - 16) / (WX1 - WX0), (Hh - 16) / (WY1 - WY0));
      ox = W / 2 - ((WX0 + WX1) / 2) * u; oy = Hh / 2 - ((WY0 + WY1) / 2) * u;
      render();
    }
    function render() {
      if (!cs || !cs.w) return;
      const { ctx, w, h: Hh } = cs;
      ctx.clearRect(0, 0, w, Hh);
      ctx.save();
      if (portrait) { ctx.transform(0, 1, 1, 0, 0, 0); SWAP = true; }
      const s = st(), T = TG[tg];
      const v = (n) => (n === "A" || n === "B" ? inVal[n] : cur.val(n));
      // boş yuvalar
      for (let k = 0; k < NS; k++) {
        const [x, y] = slotPos(k);
        if (s.gates.has(k)) continue;
        ctx.setLineDash([u * 0.3, u * 0.25]); ctx.strokeStyle = rgba(C.silk, 0.22); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect(SX(x - 2.2), SY(y - 1.6), 4.4 * u, 3.2 * u, 0.4 * u); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = rgba(C.silk, 0.38); ctx.font = `600 ${Math.max(10, 0.55 * u)}px ${FONT.display}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        txt(ctx, "+ NAND", SX(x), SY(y));
      }
      // teller
      const list = routes();
      list.forEach((wr) => wireLine(ctx, wr.pts.map(([x, y]) => [SX(x), SY(y)]), v(wr.src), u));
      junctions(list).forEach((d) => { const c = lc(v(d.src)); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(SX(d.at[0]), SY(d.at[1]), Math.max(2.5, 0.2 * u), 0, Math.PI * 2); ctx.fill(); });
      // kapılar
      for (const k of s.gates) {
        const [x, y] = slotPos(k), sx = SX(x), sy = SY(y);
        const ov = cur.val("g" + k);
        ["a", "b"].forEach((pn) => { const yy = y + (pn === "a" ? -1 : 1); const src = s.wires.get("g" + k + "." + pn); wireLine(ctx, [[SX(x - 2.5), SY(yy)], [SX(x - 1.5), SY(yy)]], src ? v(src) : "x", u); });
        wireLine(ctx, [[SX(x + 2), sy], [SX(x + 2.5), sy]], ov, u);
        if (selected === k) { ctx.fillStyle = rgba(C.copper, 0.16); ctx.beginPath(); ctx.roundRect(SX(x - 2.1), SY(y - 1.9), 4.4 * u, 3.8 * u, 0.4 * u); ctx.fill(); ctx.strokeStyle = C.copper2; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]); }
        andPath(ctx, sx, sy, u); strokeBody(ctx, u);
        bubbleAt(ctx, SX(x + 1.75), sy, u);
        ctx.fillStyle = C.muted; ctx.font = `650 ${Math.max(10, 0.52 * u)}px ${FONT.display}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        txt(ctx, gname(k), SX(x - 0.2), sy + 1);
        // uç halkaları: bağlı değilse boş
        [["a", -1], ["b", 1]].forEach(([pn, dy]) => { if (!s.wires.has("g" + k + "." + pn)) pinRing(SX(x - 2.5), SY(y + dy), false); });
      }
      // girişler ve çıkış
      Object.entries(inY()).forEach(([n, y]) => { wireLine(ctx, [[SX(0.1), SY(y)], [SX(1), SY(y)]], inVal[n], u); inBox(ctx, SX(0), SY(y), u, inVal[n], n); });
      const yv = cur.y;
      wireLine(ctx, [[SX(25), SY(4.5)], [SX(25.6), SY(4.5)]], s.wires.has("Y") ? yv : "x", u);
      outLamp(ctx, SX(26.3), SY(4.5), u, yv, null);
      ctx.fillStyle = C.silk2; ctx.font = `700 ${Math.max(11, 0.75 * u)}px ${FONT.display}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      txt(ctx, "Y", SX(26.3), SY(3));
      if (!s.wires.has("Y")) pinRing(SX(25), SY(4.5), false);
      ctx.fillStyle = C.muted; ctx.font = `500 ${Math.max(10, 0.55 * u)}px ${FONT.mono}`;
      txt(ctx, T.expr.replace("⊕", " ⊕ ").replace("·", " · ").replace("+", " + "), SX(26.3), SY(6.2));
      // bekleyen uç
      if (pending) { const P = pending.kind === "src" ? srcPos(pending.id) : snkPos(pending.id); pinRing(SX(P[0]), SY(P[1]), true); }
      ctx.restore(); SWAP = false;
      placeHot();
    }
    function pinRing(x, y, on) {
      const ctx = cs.ctx;
      ctx.beginPath(); ctx.arc(x, y, Math.max(4, (on ? 0.42 : 0.26) * u), 0, Math.PI * 2);
      ctx.fillStyle = on ? rgba(C.copper2, 0.3) : C.mask2; ctx.fill();
      ctx.strokeStyle = on ? C.copper2 : rgba(C.silk, 0.7); ctx.lineWidth = on ? 2.2 : 1.4; ctx.stroke();
    }
    function placeHot() {
      const s = st(), pinS = Math.max(26, 1.5 * u);
      for (let k = 0; k < NS; k++) {
        const [x, y] = slotPos(k), has = s.gates.has(k);
        if (has) { H.slot[k].hide(); pl(H.body[k], SX(x + 0.1), SY(y), 3 * u, 3 * u); pl(H.pa[k], SX(x - 2.5), SY(y - 1), pinS, Math.min(pinS, 1.9 * u)); pl(H.pb[k], SX(x - 2.5), SY(y + 1), pinS, Math.min(pinS, 1.9 * u)); pl(H.po[k], SX(x + 2.5), SY(y), pinS, pinS); }
        else { pl(H.slot[k], SX(x), SY(y), 4.4 * u, 3.2 * u); [H.body, H.pa, H.pb, H.po].forEach((arr) => arr[k].hide()); }
        H.body[k].classList.toggle("on", selected === k);
      }
      const iy = inY();
      pl(hA, SX(1), SY(iy.A), pinS, pinS); pl(tA, SX(-0.7), SY(iy.A), 1.8 * u, 1.6 * u);
      if (iy.B != null) { pl(hB, SX(1), SY(iy.B), pinS, pinS); pl(tB, SX(-0.7), SY(iy.B), 1.8 * u, 1.6 * u); } else { hB.hide(); tB.hide(); }
      pl(hY, SX(25.3), SY(4.5), pinS, pinS);
      [...hot.children].forEach((b) => b.classList.toggle("pend", !!pending && b === pendingBtn()));
    }
    function pendingBtn() {
      if (!pending) return null;
      const id = pending.id;
      if (id === "A") return hA; if (id === "B") return hB; if (id === "Y") return hY;
      if (pending.kind === "src") return H.po[+id.slice(1)];
      const [g, pn] = id.split("."); return (pn === "a" ? H.pa : H.pb)[+g.slice(1)];
    }
    cs = canvas(cv, layout);
    refresh();
    return { enter() { layout(); }, leave() {} };
  };
  G["nand-evrensel"] = [
    { click: "=NOT" }, { click: "=" + S.reset },
    { click: "aria:" + S.addAt(3) }, { click: "aria:" + S.srcPin("A") }, { click: "aria:" + S.pinIn("N3", 1) },
    { click: "aria:" + S.srcPin("A") }, { click: "aria:" + S.pinIn("N3", 2) },
    { click: "aria:" + S.pinOut("N3") }, { click: "aria:" + S.yPin },
  ];
  GUIDE_TARGETS["nand-evrensel"] = "aria:" + S.addAt(3);

  /* =========================================================
     5) Perceptron: AND ve OR öğrenilir, XOR öğrenilemez
     ========================================================= */
  Demos.c10Perceptron = function (stage) {
    const PTS = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const FN = { AND: (a, b) => a & b, OR: (a, b) => a | b, NAND: (a, b) => 1 - (a & b), XOR: (a, b) => a ^ b };
    const ETA = 0.25, MAXE = 25;
    let fk = "AND", w1 = -0.4, w2 = 1, bb = -0.6, two = false;
    let learning = false, idx = 0, epoch = 0, epochErr = 0, hist = [], focus = -1, anim = null, note = "", noteCls = "", timer = 0;
    const ppane = h("div.pane.c10-ppane");
    const pcv = h("canvas", { role: "img", "aria-label": S.plotAria });
    ppane.append(pcv);
    const formula = h("p.c10-pform");
    const cEp = chip(), cErr = chip(), cRight = chip();
    const noteEl = h("p.c10-pnote");
    const histEl = h("div.c10-hist", { "aria-label": S.histTitle });
    const sw1 = slider({ label: S.w1, min: -2, max: 2, step: 0.05, value: w1, fmt: (v) => num(v, 2), oninput: (v) => { w1 = v; manual(); } });
    const sw2 = slider({ label: S.w2, min: -2, max: 2, step: 0.05, value: w2, fmt: (v) => num(v, 2), oninput: (v) => { w2 = v; manual(); } });
    const sb = slider({ label: S.bias, min: -2, max: 2, step: 0.05, value: bb, fmt: (v) => num(v, 2), oninput: (v) => { bb = v; manual(); } });
    const lb = btn(S.learn, () => (learning ? stopLearn() : startLearn()), "primary");
    const stb = btn(S.stepBtn, () => { stopLearn(); stepOnce(); });
    const twoBtn = btn(S.layers, () => { two = !two; twoBtn.classList.toggle("on", two); drawP(); });
    const fseg = seg(Object.keys(FN).map((k) => [k, k]), fk, (k) => { fk = k; stopLearn(); resetRun(); twoBtn.style.display = k === "XOR" ? "" : "none"; if (k !== "XOR") two = false; twoBtn.classList.toggle("on", two); drawP(); }, S.pTarget);
    const side = h("div.c10-pside",
      h("div.c10-pfn", h("span.c10-ptitle", S.pTarget), fseg),
      formula,
      h("div.c10-psl", sw1, sw2, sb),
      h("div.c10-pbtns", lb, stb, btn(S.resetW, () => { stopLearn(); const r = Math.random; setW(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1); resetRun(); drawP(); }), twoBtn),
      h("div.c10-chips", cEp, cErr, cRight),
      h("div.c10-histwrap", h("span.c10-ptitle", S.histTitle), histEl),
      noteEl);
    const npane = h("div.pane.c10-xpane", h("span.pane-title", S.netTitle));
    stage.append(h("div.split.c10-perc", ppane, side, npane));
    twoBtn.style.display = "none";

    const net = Schematic(npane, clone(CIRCUITS.c10XorNet), {
      maxUnit: 30,
      overlay(ctx, s) {
        const u = s.unit;
        ctx.textBaseline = "middle"; ctx.font = `700 ${Math.max(12, 0.75 * u)}px ${FONT.display}`; ctx.fillStyle = C.silk2; ctx.textAlign = "right";
        [["A", [-1.9, 0]], ["B", [-1.9, 6]]].forEach(([t, p]) => { const [x, y] = s.screenOf(p); ctx.fillText(t, x, y); });
        ctx.textAlign = "left"; const [yx, yy] = s.screenOf([23.6, 3]); ctx.fillText("Y", yx, yy);
        ctx.textAlign = "center"; ctx.font = `650 ${Math.max(10, 0.5 * u)}px ${FONT.display}`; ctx.fillStyle = C.muted;
        [["OR", [8, -2.1]], ["NAND", [8, 7.9]], ["AND", [16, 0.9]]].forEach(([t, p]) => { const [x, y] = s.screenOf(p); ctx.fillText(t, x, y); });
      },
    });
    net.on("change", () => drawP());

    function setW(a, b, c) { w1 = Math.round(a * 100) / 100; w2 = Math.round(b * 100) / 100; bb = Math.round(c * 100) / 100; sw1.set(w1); sw2.set(w2); sb.set(bb); }
    const out = (x, y, W = [w1, w2, bb]) => (W[0] * x + W[1] * y + W[2] >= 0 ? 1 : 0);
    function manual() { stopLearn(); resetRun(); drawP(); }
    function resetRun() { idx = 0; epoch = 0; epochErr = 0; hist = []; focus = -1; note = ""; noteCls = ""; anim = null; }
    function startLearn() {
      if (epoch >= MAXE || (hist.length && hist[hist.length - 1] === 0)) resetRun();
      learning = true; lb.textContent = S.stop; lb.classList.remove("primary");
    }
    function stopLearn() { learning = false; lb.textContent = S.learn; lb.classList.add("primary"); }
    // perceptron öğrenme kuralı: w ← w + η (t − y) x, b ← b + η (t − y)
    function stepOnce() {
      finishAnim();
      if (epoch >= MAXE || (hist.length && hist[hist.length - 1] === 0 && idx === 0)) return;
      const [x, y] = PTS[idx];
      const t = FN[fk](x, y), o = out(x, y), e = t - o;
      focus = idx;
      const lab = x + "," + y;
      if (e) {
        epochErr++;
        anim = { from: [w1, w2, bb], to: [w1 + ETA * e * x, w2 + ETA * e * y, bb + ETA * e], k: 0 };
        note = S.upd(lab, o, t); noteCls = "";
      } else { note = S.okp(lab); noteCls = ""; }
      idx++;
      if (idx === 4) {
        idx = 0; epoch++; hist.push(epochErr);
        if (epochErr === 0) { note = S.conv(epoch); noteCls = "good"; stopLearn(); }
        else if (epoch >= MAXE) { note = S.noConv(epoch); noteCls = "bad"; stopLearn(); }
        epochErr = 0;
      }
      if (!anim || L.reduced()) finishAnim();
      drawP();
    }
    function finishAnim() { if (anim) { setW(...anim.to); anim = null; } }

    let ps = null;
    function drawP() {
      if (!ps || !ps.w) return;
      const { ctx, w, h: Hh } = ps;
      ctx.clearRect(0, 0, w, Hh);
      const W = anim ? anim.from.map((v, k) => lerp(v, anim.to[k], ease(anim.k))) : [w1, w2, bb];
      const side = Math.min(w - 50, Hh - 46), x0 = (w - side) / 2 + 14, y0 = (Hh - side) / 2 - 12;
      const D0 = -0.3, D1 = 1.3;
      const X = (v) => x0 + ((v - D0) / (D1 - D0)) * side, Y = (v) => y0 + side - ((v - D0) / (D1 - D0)) * side;
      // yarı düzlemler
      const corners = [[D0, D0], [D1, D0], [D1, D1], [D0, D1]];
      const clipPoly = (Wt, keep) => {
        const f = (p) => Wt[0] * p[0] + Wt[1] * p[1] + Wt[2];
        const res = [];
        for (let i = 0; i < 4; i++) {
          const P = corners[i], Q = corners[(i + 1) % 4], fp = f(P), fq = f(Q);
          const inP = keep ? fp >= 0 : fp < 0, inQ = keep ? fq >= 0 : fq < 0;
          if (inP) res.push(P);
          if (inP !== inQ) { const s = fp / (fp - fq); res.push([P[0] + s * (Q[0] - P[0]), P[1] + s * (Q[1] - P[1])]); }
        }
        return res;
      };
      const fillPoly = (poly, col) => { if (poly.length < 3) return; ctx.beginPath(); poly.forEach((p, k) => (k ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
      ctx.fillStyle = rgba(C.mask, 0.55); ctx.fillRect(X(D0), Y(D1), side, side);
      const NETS = two ? [[1, 1, -0.5], [-1, -1, 1.5]] : null;
      if (two) {
        // iki doğrunun arası (OR = 1 ve NAND = 1): XOR = 1
        fillPoly(bandPoly(), rgba(C.v1, 0.24));
        fillPoly(clipPoly([1, 1, -0.5], false), rgba(C.v0, 0.12));
        fillPoly(clipPoly([-1, -1, 1.5], false), rgba(C.v0, 0.12));
      } else {
        fillPoly(clipPoly(W, true), rgba(C.v1, 0.2));
        fillPoly(clipPoly(W, false), rgba(C.v0, 0.12));
      }
      function bandPoly() {
        // OR ≥ 0 bölgesini NAND ≥ 0 ile kırp
        const f2 = (p) => -p[0] - p[1] + 1.5;
        const a = clipPoly([1, 1, -0.5], true), res = [];
        for (let i = 0; i < a.length; i++) {
          const P = a[i], Q = a[(i + 1) % a.length], fp = f2(P), fq = f2(Q);
          if (fp >= 0) res.push(P);
          if ((fp >= 0) !== (fq >= 0)) { const s = fp / (fp - fq); res.push([P[0] + s * (Q[0] - P[0]), P[1] + s * (Q[1] - P[1])]); }
        }
        return res;
      }
      // ızgara ve eksenler
      ctx.strokeStyle = rgba(C.silk, 0.08); ctx.lineWidth = 1; ctx.beginPath();
      [0, 0.5, 1].forEach((v) => { ctx.moveTo(X(v), Y(D0)); ctx.lineTo(X(v), Y(D1)); ctx.moveTo(X(D0), Y(v)); ctx.lineTo(X(D1), Y(v)); });
      ctx.stroke();
      ctx.strokeStyle = rgba(C.silk, 0.3); ctx.strokeRect(X(D0), Y(D1), side, side);
      ctx.fillStyle = C.muted; ctx.font = `500 11px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      [0, 1].forEach((v) => ctx.fillText(String(v), X(v), Y(D0) + 5));
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      [0, 1].forEach((v) => ctx.fillText(String(v), X(D0) - 6, Y(v)));
      ctx.font = `600 12px ${FONT.display}`; ctx.fillStyle = C.silk2;
      ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText("x1 (A) →", X(0.5), Y(D0) + 20);
      ctx.save(); ctx.translate(X(D0) - 22, Y(0.5)); ctx.rotate(-Math.PI / 2); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("x2 (B) →", 0, 0); ctx.restore();
      // karar doğruları
      const lineOf = (Wt, col, lab, dash) => {
        const [a, b, c] = Wt;
        let P = [];
        if (Math.abs(b) > 1e-9) P = [[D0, -(a * D0 + c) / b], [D1, -(a * D1 + c) / b]];
        else if (Math.abs(a) > 1e-9) P = [[-c / a, D0], [-c / a, D1]];
        if (!P.length) return;
        ctx.save(); ctx.beginPath(); ctx.rect(X(D0), Y(D1), side, side); ctx.clip();
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.setLineDash(dash || []);
        ctx.beginPath(); ctx.moveTo(X(P[0][0]), Y(P[0][1])); ctx.lineTo(X(P[1][0]), Y(P[1][1])); ctx.stroke(); ctx.setLineDash([]);
        // normal ok: 1 tarafını gösterir
        const n = Math.hypot(a, b) || 1, mx = clamp((P[0][0] + P[1][0]) / 2, 0.1, 0.9);
        const my = Math.abs(b) > 1e-9 ? -(a * mx + c) / b : 0.5;
        if (my > D0 && my < D1) {
          const ax = X(mx), ay = Y(my), dx = (a / n) * 26, dy = -(b / n) * 26;
          ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + dx, ay + dy); ctx.stroke();
          const an = Math.atan2(dy, dx); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(ax + dx, ay + dy);
          ctx.lineTo(ax + dx - 8 * Math.cos(an - 0.45), ay + dy - 8 * Math.sin(an - 0.45)); ctx.lineTo(ax + dx - 8 * Math.cos(an + 0.45), ay + dy - 8 * Math.sin(an + 0.45)); ctx.fill();
          if (lab) { ctx.font = `650 12px ${FONT.display}`; ctx.fillStyle = col; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(lab, ax + dx * 1.9, ay + dy * 1.9); }
        }
        ctx.restore();
      };
      if (two) { lineOf(NETS[0], C.copper2, S.orLine, [7, 5]); lineOf(NETS[1], C.gold, S.nandLine, [7, 5]); }
      else lineOf(W, C.copper2);
      // noktalar
      const nA = net.part("A").value ? 1 : 0, nB = net.part("B").value ? 1 : 0;
      let right = 0;
      PTS.forEach(([x, y], k) => {
        const t = FN[fk](x, y);
        const o = two ? (out(x, y, NETS[0]) & out(x, y, NETS[1])) : out(x, y, W);
        if (o === t) right++;
        const sx = X(x), sy = Y(y), r = 13;
        if (fk === "XOR" && x === nA && y === nB) { ctx.strokeStyle = rgba(C.silk, 0.5); ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(sx, sy, r + 10, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        if (k === focus) { ctx.strokeStyle = C.amp; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(sx, sy, r + 6, 0, Math.PI * 2); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = t ? C.v1 : C.v0; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = o === t ? C.silk : C.heat; ctx.stroke();
        ctx.fillStyle = C.silk; ctx.font = `800 12px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(t), sx, sy + 1);
        if (o !== t) { ctx.fillStyle = C.heat; ctx.font = `800 13px ${FONT.display}`; ctx.fillText("×", sx + r + 7, sy - r - 2); }
        ctx.fillStyle = C.muted; ctx.font = `500 10.5px ${FONT.mono}`; ctx.fillText(`(${x},${y})`, sx, sy + r + 12);
      });
      if (two) { ctx.fillStyle = C.silk2; ctx.font = `600 12px ${FONT.display}`; ctx.textAlign = "center"; ctx.fillText(S.band, X(0.5), Y(0.5) - 2); }
      // okunuşlar
      const f = (v) => num(Math.abs(v), 2);
      formula.innerHTML = two ? `y = AND( OR(x1, x2), NAND(x1, x2) )` :
        `y = 1, eğer <b>${num(W[0], 2)}</b>·x1 ${W[1] < 0 ? "−" : "+"} <b>${f(W[1])}</b>·x2 ${W[2] < 0 ? "−" : "+"} <b>${f(W[2])}</b> ≥ 0`;
      cEp.textContent = S.epoch(epoch + (idx ? 1 : 0));
      cErr.textContent = S.errs(hist.length && !idx ? hist[hist.length - 1] : epochErr);
      cRight.textContent = S.right(right); cRight.className = "chip " + (right === 4 ? "ok" : "");
      noteEl.textContent = note; noteEl.className = "c10-pnote " + noteCls;
      histEl.innerHTML = "";
      hist.slice(-MAXE).forEach((e) => histEl.append(h("span", { style: { height: (4 + e * 9) + "px" }, class: e ? "" : "zero", title: String(e) })));
    }
    ps = canvas(pcv, drawP);
    const lp = loop((dt) => {
      if (anim) { anim.k += dt / 0.16; if (anim.k >= 1) finishAnim(); drawP(); }
      if (learning && !anim) { timer += dt; if (timer > 0.12) { timer = 0; stepOnce(); } }
    });
    return { enter() { net.start(); lp.start(); drawP(); }, leave() { net.stop(); lp.stop(); stopLearn(); } };
  };
  G["perceptron-xor"] = [{ click: "=AND" }, { click: "=" + S.learn }, { wait: 5600 }, { click: "=XOR" }, { click: "=" + S.learn }, { wait: 2500 }];
})();
