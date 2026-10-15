/* Kapak ve ilk bölümlerin deneyleri */
(function () {
  const { C, FONT, h, slider, seg, btn, canvas, num, rgba } = L;
  const fmt = (v, u, d) => Circuit.fmt(v, u, d);
  window.GUIDES = window.GUIDES || {};
  const G = window.GUIDES;

  /* ---------- Kapak: canlı astable multivibratör ---------- */
  Demos.cover = function (stage, slide) {
    const fill = h("div.cover-sch");
    stage.append(fill);
    const def = JSON.parse(JSON.stringify(CIRCUITS.astable));
    const CS = [10e-6, 4.7e-6, 22e-6];
    let ci = 0;
    const sch = Schematic(fill, def, { maxUnit: 30 });
    const chip = h("p.cover-chip");
    stage.append(chip);
    // frekans formülden değil, benzetimden ölçülür: Q1 kollektörünün düşen kenarları arası süre
    let lastC = null, lastEdge = null, period = null;
    const c1 = sch.netOf("Q1", "c");
    sch.on("step", (t) => {
      const on = sch.v(c1) < 1;
      if (lastC === false && on) { if (lastEdge != null) period = t - lastEdge; lastEdge = t; show(); }
      lastC = on;
    });
    const show = () => {
      chip.innerHTML = `C1 = C2 = ${fmt(CS[ci], "F")} · f ${period ? "= " + num(1 / period, 2) + " Hz" : "ölçülüyor…"} <span>Devreye tıklayın: frekans değişir</span>`;
    };
    show();
    fill.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".sch-btn")) return;
      ci = (ci + 1) % CS.length;
      sch.set("C1", "C", CS[ci]); sch.set("C2", "C", CS[ci]);
      period = null; lastEdge = null; show();
    });
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };

  /* ---------- Ohm kanunu ---------- */
  Demos.ohm = function (stage) {
    const top = h("div.pane", { style: { flex: "1.25" } });
    const bottom = h("div.ohm-bottom");
    const graphPane = h("div.pane", h("span.pane-title", "Akım – gerilim (V–I) grafiği"));
    const gcv = h("canvas", { role: "img", "aria-label": "V–I grafiği" });
    graphPane.append(gcv);
    const tri = h("div.ohm-tri");
    bottom.append(graphPane, tri);
    const body = h("div.split", { style: { gridTemplateRows: "1.25fr 1fr" } }, top, bottom);
    stage.append(body);
    const def = JSON.parse(JSON.stringify(CIRCUITS.ohm));
    const sch = Schematic(top, def, { maxUnit: 26 });

    // üçgen hafıza aracı
    let hide = "I";
    const tbox = h("div.tri-box");
    tri.append(tbox);
    tbox.innerHTML = `<svg viewBox="0 0 200 170" aria-hidden="true">
      <path d="M100 8 L192 162 L8 162 Z" fill="none" stroke="${C.silk}" stroke-width="2"/>
      <line x1="46" y1="98" x2="154" y2="98" stroke="${C.silk}" stroke-width="2"/>
      <line x1="100" y1="98" x2="100" y2="162" stroke="${C.silk}" stroke-width="2"/></svg>`;
    const letters = { V: [50, 44], I: [28, 79], R: [72, 79] };
    const lb = {};
    Object.entries(letters).forEach(([k, [x, y]]) => {
      const b = h("button.tri-l", { type: "button", style: { left: x + "%", top: y + "%" }, "aria-label": k + " için formül", onclick: () => { hide = k; update(); } }, k);
      lb[k] = b; tbox.append(b);
    });
    const formula = h("p.tri-f");
    tri.append(formula);

    let V = 6, R = 1000;
    const vs = slider({ label: "Gerilim", min: 0, max: 12, step: 0.1, value: V, fmt: (v) => fmt(v, "V"), oninput: (v) => { V = v; sch.set("B1", "V", v); } });
    const rs = slider({ label: "Direnç", min: 10, max: 10000, step: 1, value: R, log: true, fmt: (v) => fmt(v, "Ω"), oninput: (v) => { R = v; sch.set("R1", "R", v); } });
    stage.append(h("div.controls", vs, rs));

    let gs;
    function drawGraph() {
      if (!gs || !gs.w) return;
      const { ctx, w, h: H } = gs;
      ctx.clearRect(0, 0, w, H);
      const l = 44, r = 12, t = 34, b = 26, gw = w - l - r, gh = H - t - b;
      const Imax = 0.06;
      const X = (v) => l + (v / 12) * gw, Y = (i) => t + gh - (Math.min(i, Imax * 1.04) / Imax) * gh;
      ctx.strokeStyle = rgba(C.silk, 0.1); ctx.lineWidth = 1; ctx.beginPath();
      for (let v = 0; v <= 12; v += 2) { ctx.moveTo(X(v), t); ctx.lineTo(X(v), t + gh); }
      for (let i = 0; i <= Imax + 1e-9; i += 0.01) { ctx.moveTo(l, Y(i)); ctx.lineTo(l + gw, Y(i)); }
      ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = `500 11px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let v = 0; v <= 12; v += 4) ctx.fillText(v + " V", X(v), t + gh + 6);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (let i = 0; i <= Imax + 1e-9; i += 0.02) ctx.fillText(Math.round(i * 1000) + " mA", l - 6, Y(i));
      // R doğrusu: eğim 1/R
      const Ihere = Math.abs(sch.sim.i("A1"));
      ctx.save(); ctx.beginPath(); ctx.rect(l, t, gw, gh); ctx.clip();
      ctx.strokeStyle = C.copper2; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(12), Y(12 / R)); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = C.copper2; ctx.textAlign = "left"; ctx.font = `600 12px ${FONT.display}`;
      ctx.fillText(`R = ${fmt(R, "Ω")}`, l + 8, t + 8);
      // çalışma noktası
      const px = X(V), py = Y(Ihere);
      ctx.strokeStyle = rgba(C.amp, 0.5); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px, t + gh); ctx.lineTo(px, py); ctx.lineTo(l, py); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.amp; ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2); ctx.fill();
      if (Ihere > Imax) { ctx.fillStyle = C.heat; ctx.textAlign = "right"; ctx.fillText("akım grafiğin dışında ↑", l + gw - 4, t + 8); }
    }
    gs = canvas(gcv, drawGraph);

    function update() {
      const I = Math.abs(sch.sim.i("A1"));
      const Vr = Math.abs(sch.sim.vAcross("R1"));
      Object.entries(lb).forEach(([k, b]) => b.classList.toggle("on", k === hide));
      const f = {
        V: `V = I · R = ${fmt(I, "A")} · ${fmt(R, "Ω")} = <b>${fmt(Vr, "V")}</b>`,
        I: `I = V / R = ${fmt(Vr, "V")} / ${fmt(R, "Ω")} = <b>${fmt(I, "A")}</b>`,
        R: `R = V / I = ${fmt(Vr, "V")} / ${fmt(I, "A")} = <b>${I > 1e-12 ? fmt(Vr / I, "Ω") : "—"}</b>`,
      }[hide];
      formula.innerHTML = f;
      drawGraph();
    }
    sch.on("change", update);
    update();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["ohm-kanunu"] = [{ slide: "label:Gerilim", to: 10 }, { wait: 700 }, { slide: "label:Direnç", to: 330 }, { wait: 500 }, { click: "=R" }];
})();
