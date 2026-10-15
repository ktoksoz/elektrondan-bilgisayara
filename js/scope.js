/* Osiloskop: zamanla değişen gerilimler için sitenin tek osiloskop görünümü.
   10 × 8 bölmeli ekran, kanal başına V/böl ve konum, s/böl, tetikleme (seviye, kenar),
   çalış/dur. Örnekler push(t, [v1, v2, …]) ile beslenir. */
(function () {
  const { C, FONT, h, rgba, canvas } = L;
  const T = STR.scope;
  const SEQ = [];
  for (let e = -6; e <= 1; e++) [1, 2, 5].forEach((m) => SEQ.push(+(m * 10 ** e).toPrecision(2)));
  const TSEQ = SEQ.filter((v) => v >= 1e-6 && v <= 1);
  const VSEQ = SEQ.filter((v) => v >= 1e-3 && v <= 20);
  const tfmt = (v) => Circuit.fmt(v, "s", 2);
  const vfmt = (v) => Circuit.fmt(v, "V", 2);

  function Scope(container, o = {}) {
    const chans = (o.channels || [{ name: T.ch + "1" }]).map((c, i) => ({
      color: [C.ch1, C.ch2, C.ch3, C.ch4][i], vdiv: 1, pos: 0, on: true, ...c,
    }));
    let tdiv = o.tdiv || 1e-3;
    const trig = { ch: 0, level: 0, edge: "rise", mode: "auto", ...(o.trigger || {}) };
    let running = true;
    const cap = o.capacity || 40000;
    const tb = new Float64Array(cap);
    const vb = chans.map(() => new Float64Array(cap));
    let n = 0, head = 0; // halka arabellek

    const wrap = h("div.scope", { style: o.style || null });
    const cv = h("canvas", { "aria-label": o.label || "Osiloskop ekranı", role: "img" });
    const screen = h("div.scope-screen", cv);
    wrap.append(screen);
    container.append(wrap);
    let cs = null;

    // kontroller
    const ctl = h("div.scope-ctl");
    function stepper(label, list, get, set, fmtv, aria) {
      const val = h("span.val");
      const show = () => (val.textContent = fmtv(get()));
      const mv = (d) => { const i = list.indexOf(get()); const j = Math.max(0, Math.min(list.length - 1, (i < 0 ? nearestIdx(list, get()) : i) + d)); set(list[j]); show(); draw(); };
      const el = h("span.stepper", h("span.lab", label),
        h("button.sbtn", { type: "button", "aria-label": aria + " azalt", onclick: () => mv(-1) }, "−"), val,
        h("button.sbtn", { type: "button", "aria-label": aria + " artır", onclick: () => mv(1) }, "+"));
      show();
      el.refresh = show;
      return el;
    }
    const nearestIdx = (list, v) => list.reduce((bi, x, i) => (Math.abs(Math.log(x / v)) < Math.abs(Math.log(list[bi] / v)) ? i : bi), 0);
    const steppers = [];
    if (o.controls !== false) {
      chans.forEach((c, i) => {
        if (c.fixed) return;
        const s = stepper([h("i.swatch", { style: { background: c.color } }), c.name], VSEQ, () => c.vdiv, (v) => (c.vdiv = v), (v) => vfmt(v) + "/b", c.name + " volt/bölme");
        steppers.push(s); ctl.append(s);
      });
      const ts = stepper(T.tdiv, TSEQ, () => tdiv, (v) => { tdiv = v; o.onTdiv && o.onTdiv(v); }, (v) => tfmt(v), "zaman/bölme");
      steppers.push(ts); ctl.append(ts);
      if (trig.mode !== "none") {
        const lv = L.slider({ label: T.trig, min: -12, max: 12, step: 0.05, value: trig.level, fmt: (v) => vfmt(v), oninput: (v) => { trig.level = v; draw(); }, width: "90px" });
        lv.input.setAttribute("aria-label", "Tetik seviyesi");
        ctl.append(lv);
      }
      const rs = L.btn(T.stop, () => { running = !running; rs.textContent = running ? T.stop : T.run; rs.classList.toggle("on", !running); });
      ctl.append(rs);
      wrap.append(ctl);
    }

    function push(t, vals) {
      if (!running) return;
      tb[head] = t;
      for (let k = 0; k < chans.length; k++) vb[k][head] = vals[k];
      head = (head + 1) % cap; if (n < cap) n++;
    }
    const at = (i) => (head - n + i + cap) % cap; // i: 0 = en eski
    function clear() { n = 0; head = 0; draw(); }

    // tetik noktasını bul: ekranın tamamını dolduracak veri bırakan en son kenar
    function findTrigger(win) {
      if (!n) return null;
      const tEnd = tb[at(n - 1)];
      if (trig.mode === "none") return tEnd - win;
      const ch = trig.ch, lvl = trig.level, rise = trig.edge === "rise";
      const pre = win * (o.pre ?? 0.1);
      for (let i = n - 2; i > 0; i--) {
        const a = vb[ch][at(i - 1)], b = vb[ch][at(i)];
        const ok = rise ? a < lvl && b >= lvl : a > lvl && b <= lvl;
        if (!ok) continue;
        const t0 = tb[at(i - 1)] + ((lvl - a) / (b - a || 1)) * (tb[at(i)] - tb[at(i - 1)]);
        if (t0 + win - pre <= tEnd) return t0 - pre;
      }
      return trig.mode === "auto" ? tEnd - win : null;
    }

    function draw() {
      if (!cs || !cs.w) return;
      const { ctx, w, h: H } = cs;
      ctx.clearRect(0, 0, w, H);
      ctx.fillStyle = "#06150f"; ctx.fillRect(0, 0, w, H);
      const m = 6, gw = w - 2 * m, gh = H - 2 * m, dx = gw / 10, dy = gh / 8;
      // ızgara
      ctx.strokeStyle = "rgba(170, 230, 200, 0.11)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) { ctx.moveTo(m + i * dx + 0.5, m); ctx.lineTo(m + i * dx + 0.5, m + gh); }
      for (let j = 0; j <= 8; j++) { ctx.moveTo(m, m + j * dy + 0.5); ctx.lineTo(m + gw, m + j * dy + 0.5); }
      ctx.stroke();
      ctx.strokeStyle = "rgba(170, 230, 200, 0.24)";
      ctx.beginPath(); ctx.moveTo(m + 5 * dx + 0.5, m); ctx.lineTo(m + 5 * dx + 0.5, m + gh); ctx.moveTo(m, m + 4 * dy + 0.5); ctx.lineTo(m + gw, m + 4 * dy + 0.5); ctx.stroke();
      // küçük çentikler
      ctx.beginPath();
      for (let i = 0; i < 50; i++) { const x = m + (i * gw) / 50 + 0.5; ctx.moveTo(x, m + 4 * dy - 3); ctx.lineTo(x, m + 4 * dy + 4); }
      for (let j = 0; j < 40; j++) { const y = m + (j * gh) / 40 + 0.5; ctx.moveTo(m + 5 * dx - 3, y); ctx.lineTo(m + 5 * dx + 4, y); }
      ctx.stroke();

      const win = 10 * tdiv;
      const t0 = findTrigger(win);
      const toX = (t) => m + ((t - t0) / win) * gw;
      const toY = (v, c) => m + gh / 2 - ((v / c.vdiv + c.pos) * dy);
      api.toX = toX; api.toY = toY; api.t0 = t0;
      if (t0 != null) {
        chans.forEach((c, k) => {
          if (!c.on) return;
          ctx.save();
          ctx.beginPath(); ctx.rect(m, m, gw, gh); ctx.clip();
          ctx.strokeStyle = c.color; ctx.lineWidth = 2; ctx.lineJoin = "round";
          ctx.shadowColor = c.color; ctx.shadowBlur = 8;
          ctx.beginPath();
          let started = false, lastX = -1e9;
          for (let i = 0; i < n; i++) {
            const j = at(i), t = tb[j];
            if (t < t0 - win * 0.02 || t > t0 + win * 1.02) continue;
            const x = toX(t), y = toY(vb[k][j], c);
            if (started && Math.abs(x - lastX) < 0.25 && i < n - 1) continue; // piksel başına bir nokta yeter
            if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
            lastX = x;
          }
          ctx.stroke();
          ctx.restore();
          // kanal sıfır işareti
          ctx.fillStyle = c.color;
          const zy = toY(0, c);
          ctx.beginPath(); ctx.moveTo(m, zy - 5); ctx.lineTo(m + 7, zy); ctx.lineTo(m, zy + 5); ctx.fill();
        });
        // tetik seviyesi
        if (trig.mode !== "none") {
          const c = chans[trig.ch], y = toY(trig.level, c);
          ctx.fillStyle = rgba(c.color, 0.8);
          ctx.beginPath(); ctx.moveTo(w - m, y - 5); ctx.lineTo(w - m - 7, y); ctx.lineTo(w - m, y + 5); ctx.fill();
        }
        if (o.overlay) { ctx.save(); o.overlay(ctx, api, { m, gw, gh, dx, dy }); ctx.restore(); }
      }
      // ekran yazıları
      ctx.font = `600 11px ${FONT.mono}`;
      ctx.textBaseline = "top"; ctx.textAlign = "left";
      let x = m + 6;
      chans.forEach((c) => { if (!c.on) return; ctx.fillStyle = c.color; const s = `${c.name} ${vfmt(c.vdiv)}/b`; ctx.fillText(s, x, m + 5); x += ctx.measureText(s).width + 14; });
      ctx.fillStyle = "rgba(220, 240, 230, 0.75)";
      ctx.textAlign = "right";
      ctx.fillText(`${tfmt(tdiv)}/b` + (running ? "" : "  ■ " + T.stop), w - m - 6, m + 5);
      if (t0 == null) { ctx.textAlign = "center"; ctx.fillText("Tetik bekleniyor…", w / 2, H / 2 - 6); }
    }

    cs = canvas(cv, () => draw());
    const api = {
      push, clear, draw,
      get channels() { return chans; },
      setVdiv(k, v) { chans[k].vdiv = v; steppers.forEach((s) => s.refresh()); draw(); },
      setTdiv(v) { tdiv = v; steppers.forEach((s) => s.refresh()); draw(); },
      get tdiv() { return tdiv; },
      trigger: trig,
      get running() { return running; },
      el: wrap,
    };
    return api;
  }
  Scope.TSEQ = TSEQ; Scope.VSEQ = VSEQ;
  window.Scope = Scope;

  /* Lojik analizör: sinyal geçmişlerini zamanlama diyagramı olarak çizer.
     1 = yüksek gerilim rengi, 0 = düşük; x tanımsız (taralı), z yüksek empedans (orta çizgi, kesikli). */
  function LogicAnalyzer(container, o = {}) {
    const cv = h("canvas", { "aria-label": o.label || STR.la.title, role: "img" });
    const box = h("div.la", cv);
    container.append(box);
    let cs = null;
    let src = null, t1 = 0;
    const win = () => o.window || 200;
    function draw() {
      if (!cs || !cs.w || !src) return;
      const { ctx, w, h: H } = cs;
      ctx.clearRect(0, 0, w, H);
      ctx.fillStyle = "#06150f"; ctx.fillRect(0, 0, w, H);
      const sigs = o.signals;
      const left = o.labelWidth || 54, right = 10, top = 8, rowH = Math.min(o.rowH || 40, (H - top - 18) / sigs.length);
      const tEnd = t1, tStart = tEnd - win();
      const toX = (t) => left + ((t - tStart) / win()) * (w - left - right);
      // zaman ızgarası
      ctx.strokeStyle = "rgba(170, 230, 200, 0.08)"; ctx.lineWidth = 1;
      const grid = o.grid || win() / 10;
      ctx.beginPath();
      for (let t = Math.ceil(tStart / grid) * grid; t <= tEnd; t += grid) { const x = Math.round(toX(t)) + 0.5; ctx.moveTo(x, top); ctx.lineTo(x, top + rowH * sigs.length); }
      ctx.stroke();
      sigs.forEach((s, r) => {
        const y0 = top + r * rowH, hi = y0 + rowH * 0.2, lo = y0 + rowH * 0.75, mid = (hi + lo) / 2;
        ctx.font = `600 12px ${FONT.mono}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillStyle = C.silk2;
        const lab = s.label || s.name;
        const ovl = lab.endsWith("'");
        ctx.fillText(ovl ? lab.slice(0, -1) : lab, 6, mid);
        if (ovl) { const tw = ctx.measureText(lab.slice(0, -1)).width; ctx.strokeStyle = C.silk2; ctx.beginPath(); ctx.moveTo(6, mid - 8); ctx.lineTo(6 + tw, mid - 8); ctx.stroke(); }
        const hist = (src.history(s.name) || []).slice();
        // pencere başındaki değer
        let segs = [];
        let cur = hist.length ? hist[0][1] : "x", curT = tStart;
        for (const [t, v] of hist) {
          if (t <= tStart) { cur = v; continue; }
          if (t > tEnd) break;
          segs.push([curT, t, cur]); cur = v; curT = t;
        }
        segs.push([curT, tEnd, cur]);
        segs.forEach(([a, b, v], i) => {
          const xa = toX(a), xb = toX(b);
          if (v === 1 || v === 0) {
            const y = v ? hi : lo;
            ctx.strokeStyle = v ? C.v1 : C.v0; ctx.lineWidth = 2.2;
            if (v) { ctx.fillStyle = rgba(C.v1, 0.12); ctx.fillRect(xa, hi, xb - xa, lo - hi); }
            ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
          } else if (v === "z") {
            ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
            ctx.beginPath(); ctx.moveTo(xa, mid); ctx.lineTo(xb, mid); ctx.stroke(); ctx.setLineDash([]);
          } else {
            ctx.fillStyle = rgba(C.muted, 0.25); ctx.fillRect(xa, hi, xb - xa, lo - hi);
            ctx.strokeStyle = rgba(C.muted, 0.6); ctx.lineWidth = 1;
            ctx.save(); ctx.beginPath(); ctx.rect(xa, hi, xb - xa, lo - hi); ctx.clip();
            for (let x = xa - (lo - hi); x < xb; x += 7) { ctx.beginPath(); ctx.moveTo(x, lo); ctx.lineTo(x + (lo - hi), hi); ctx.stroke(); }
            ctx.restore();
          }
          // kenar
          if (i > 0) {
            const pv = segs[i - 1][2];
            ctx.strokeStyle = C.silk2; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(xa, (pv === 1 ? hi : pv === 0 ? lo : mid)); ctx.lineTo(xa, (v === 1 ? hi : v === 0 ? lo : mid)); ctx.stroke();
            if (s.edges && pv === 0 && v === 1) { ctx.fillStyle = C.copper2; ctx.beginPath(); ctx.moveTo(xa - 4, hi - 6); ctx.lineTo(xa + 4, hi - 6); ctx.lineTo(xa, hi - 1); ctx.fill(); }
          }
        });
      });
      if (o.overlay) o.overlay(ctx, { toX, top, rowH, tStart, tEnd, w, H });
    }
    cs = canvas(cv, () => draw());
    return {
      show(net, t) { src = net; t1 = t ?? net.time; draw(); },
      draw, el: box,
      set window(v) { o.window = v; },
    };
  }
  window.LogicAnalyzer = LogicAnalyzer;
})();
