/* 1. bölüm (elektrik nedir?) ve 2. bölümün güç, LED direnci ve renk kodu deneyleri */
(function () {
  const { C, FONT, h, slider, seg, btn, canvas, loop, num, rgba, clamp, lerp, vcolor } = L;
  const fmt = (v, u, d) => Circuit.fmt(v, u, d);
  const clone = (k) => JSON.parse(JSON.stringify(CIRCUITS[k]));
  window.GUIDES = window.GUIDES || {};
  window.GUIDE_TARGETS = window.GUIDE_TARGETS || {};
  const G = window.GUIDES;

  /* ---------- arayüz metinleri (ileride js/strings.js'e taşınacak) ---------- */
  const T = STR.ch01;

  // bilimsel gösterim: 3,1·10¹⁸
  const SUP = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
  function sci(v, d = 2) {
    if (!(v > 0) || !isFinite(v)) return "0";
    const e = Math.floor(Math.log10(v)), m = v / 10 ** e;
    return num(m, d - 1) + "·10" + String(e).split("").map((c) => SUP[c]).join("");
  }
  // aynısı HTML üst simgeyle (göstergelerde)
  function sciH(v, d = 2) {
    if (!(v > 0) || !isFinite(v)) return "0";
    const e = Math.floor(Math.log10(v)), m = v / 10 ** e;
    if (e >= -2 && e <= 3) return num(v, Math.max(0, d - 1 - e));
    return num(m, d - 1) + "·10<sup>" + String(e).replace("-", "−") + "</sup>";
  }
  // çok büyük/küçük değerler için okunur biçim (HTML)
  const big = (v, u) => (Math.abs(v) >= 1e9 || (Math.abs(v) < 1e-12 && v !== 0) ? sciH(Math.abs(v)) + " " + u : fmt(v, u));
  const meter = (label) => { const b = h("b", "—"); const el = h("div.meter", h("small", label), b); el.val = b; return el; };

  /* ======================================================================
     1) Su benzetmesi: pompa = pil, debimetre = ampermetre, daralma = direnç, vana = anahtar
     ====================================================================== */
  Demos.c1su = function (stage) {
    const wPane = h("div.pane.c1-water", h("span.pane-title", T.waterTitle));
    const wcv = h("canvas", { role: "img", "aria-label": T.waterAria });
    wPane.append(wcv);
    const why = h("div.c1-why", { hidden: true });
    why.append(h("h3", T.whyTitle), h("ul", T.why.map(([tag, t, d]) => h("li", h("span.c1-tag" + (tag === "tutar" ? ".ok" : ""), tag), h("b", t), h("p", d)))));
    wPane.append(why);
    const sPane = h("div.pane", h("span.pane-title", T.elecTitle));
    stage.append(h("div.split.h2.c1-su", wPane, sPane));
    const sch = Schematic(sPane, clone("c1su"), { maxUnit: 30 });

    const vs = slider({ label: T.vLabel, min: 0, max: 12, step: 0.1, value: 6, fmt: (v) => fmt(v, "V"), oninput: (v) => sch.set("B1", "V", v) });
    const rs = slider({ label: T.rLabel, min: 100, max: 10000, step: 1, value: 1000, log: true, fmt: (v) => fmt(v, "Ω"), oninput: (v) => { sch.set("R1", "R", v); dirty = true; } });
    const whyBtn = btn(T.whyBtn, () => {
      const on = why.hidden;
      why.hidden = !on;
      whyBtn.textContent = on ? T.whyBack : T.whyBtn;
      whyBtn.classList.toggle("on", on);
    });
    stage.append(h("div.controls", vs, rs, h("span.spacer"), whyBtn));

    /* --- su devresi geometrisi: yuvarlatılmış dikdörtgen bir boru, saat yönünde (geleneksel akım yönü) --- */
    let ws, geo = null, dirty = true, cache = null;
    const parts = [];
    const VMAX = 12, IREF = 0.006;
    function build() {
      const { w, h: H } = ws;
      const x0 = Math.max(34, w * 0.14), x1 = w - Math.max(34, w * 0.14);
      const y0 = Math.max(48, H * 0.17), y1 = H - Math.max(40, H * 0.13);
      const pw = clamp(Math.min(w, H) * 0.034, 7, 15);
      const rc = Math.min(pw * 2.6, (x1 - x0) / 4, (y1 - y0) / 4);
      const raw = [[x0, y1 - rc]];
      const arc = (cx, cy, a0, a1) => { for (let i = 0; i <= 14; i++) { const a = a0 + ((a1 - a0) * i) / 14; raw.push([cx + rc * Math.cos(a), cy + rc * Math.sin(a)]); } };
      arc(x0 + rc, y0 + rc, Math.PI, 1.5 * Math.PI); arc(x1 - rc, y0 + rc, 1.5 * Math.PI, 2 * Math.PI);
      arc(x1 - rc, y1 - rc, 0, 0.5 * Math.PI); arc(x0 + rc, y1 - rc, 0.5 * Math.PI, Math.PI);
      const cum = [0];
      for (let i = 0; i + 1 < raw.length; i++) cum.push(cum[i] + Math.hypot(raw[i + 1][0] - raw[i][0], raw[i + 1][1] - raw[i][1]));
      const Lt = cum[cum.length - 1], n = Math.ceil(Lt / 2.5);
      const S = [];
      let j = 0;
      for (let k = 0; k < n; k++) {
        const s = (k * Lt) / n;
        while (j < raw.length - 2 && cum[j + 1] < s) j++;
        const A = raw[j], B = raw[j + 1], t = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
        const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1;
        S.push({ x: A[0] + dx * t, y: A[1] + dy * t, nx: -dy / l, ny: dx / l, s, w: pw, p: 0 });
      }
      const near = (x, y) => S.reduce((b, q, i) => (Math.hypot(q.x - x, q.y - y) < Math.hypot(S[b].x - x, S[b].y - y) ? i : b), 0);
      const ym = (y0 + y1) / 2, xm = (x0 + x1) / 2;
      geo = { x0, x1, y0, y1, xm, ym, pw, S, Lt, n, iP: near(x0, ym), iM: near(xm, y0), iR: near(x1, ym), iV: near(xm, y1), lc: (y1 - y0) * 0.17 };
      dirty = true;
      if (!parts.length) for (let k = 0; k < 170; k++) parts.push({ q: Math.random(), f: (Math.random() * 2 - 1) * 0.72 });
    }
    // daralma ve basınç (renk) hesapları: R değişince ya da anahtar değişince
    function shape() {
      const { S, pw, iP, iR, iV, lc } = geo;
      const R = sch.part("R1").R;
      const k = lerp(0.82, 0.16, clamp((Math.log10(R) - 2) / 2, 0, 1));
      const vTop = sch.v(sch.netOf("R1", "a")), vBot = sch.v(sch.netOf("R1", "b"));
      const sP = S[iP].s, sR = S[iR].s, sV = S[iV].s, pr = pw * 2.4;
      const open = !sch.part("S1").closed;
      let q = 0;
      geo.cumQ = [0];
      S.forEach((pt, i) => {
        const s = pt.s, d = s - sR;
        let b = 0;
        if (Math.abs(d) < lc) { const t = Math.abs(d) / lc; b = t < 0.45 ? 1 : 1 - L.ease((t - 0.45) / 0.55); }
        pt.w = pw * (1 - (1 - k) * b);
        let p;
        if (s < sP - pr) p = 0;
        else if (s < sP + pr) p = lerp(0, vTop, (s - sP + pr) / (2 * pr));
        else if (s < sR - lc * 0.6) p = vTop;
        else if (s < sR + lc * 0.6) p = lerp(vTop, vBot, (s - sR + lc * 0.6) / (1.2 * lc));
        else if (s < sV - (open ? 0 : 6)) p = vBot;
        else if (!open && s < sV + 6) p = lerp(vBot, 0, (s - sV + 6) / 12);
        else p = open ? (s < sV ? vBot : 0) : 0;
        pt.p = p;
        q += pt.w * (geo.Lt / geo.n);
        geo.cumQ.push(q);
      });
      geo.Q = q;
      // boru ve su: önbellek tuvaline
      if (!cache) cache = document.createElement("canvas");
      const dpr = ws.dpr;
      cache.width = Math.round(ws.w * dpr); cache.height = Math.round(ws.h * dpr);
      const c = cache.getContext("2d");
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const side = (sg) => S.map((pt) => [pt.x + pt.nx * (pt.w + 2) * sg, pt.y + pt.ny * (pt.w + 2) * sg]);
      const out = side(1), inn = side(-1);
      for (let i = 0; i < S.length; i++) {
        const i2 = (i + 1) % S.length;
        c.fillStyle = vcolor(S[i].p, 0, VMAX, 0.62);
        c.beginPath(); c.moveTo(...out[i]); c.lineTo(...out[i2]); c.lineTo(...inn[i2]); c.lineTo(...inn[i]); c.closePath(); c.fill();
      }
      c.strokeStyle = rgba(C.silk, 0.85); c.lineWidth = 2.2; c.lineJoin = "round";
      [out, inn].forEach((pts) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p))); c.closePath(); c.stroke(); });
      dirty = false;
    }
    // hacim koordinatı q → örnek indisi (dar yerde parçacıklar hızlanır, debi her yerde aynı)
    function idxOfQ(qq) {
      const a = geo.cumQ; let lo = 0, hi = a.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m] <= qq) lo = m; else hi = m; }
      return Math.min(lo, geo.S.length - 1);
    }
    let aPump = 0, aWheel = 0;
    function draw(dt) {
      if (!ws || !ws.w) return;
      if (!geo || geo.w !== ws.w || geo.h !== ws.h) { build(); geo.w = ws.w; geo.h = ws.h; }
      if (dirty) shape();
      const { ctx, w, h: H } = ws;
      const { S, pw } = geo;
      const I = Math.abs(sch.sim.i("A1"));
      const r = Math.min(14, I / IREF);
      aPump += r * 2.2 * dt; aWheel += r * 2.6 * dt;
      ctx.clearRect(0, 0, w, H);
      ctx.drawImage(cache, 0, 0, w, H);
      // su parçacıkları
      const rate = r * pw * 2 * 34 * dt;
      ctx.fillStyle = "rgba(226,242,255,0.88)";
      const rad = Math.max(1.5, pw * 0.15);
      parts.forEach((pa) => {
        pa.q = (pa.q + rate / geo.Q) % 1;
        const pt = S[idxOfQ(pa.q * geo.Q)];
        ctx.beginPath(); ctx.arc(pt.x + pt.nx * pa.f * pt.w, pt.y + pt.ny * pa.f * pt.w, rad, 0, Math.PI * 2); ctx.fill();
      });
      // pompa
      const P = S[geo.iP], pr = pw * 2.3;
      ctx.fillStyle = C.mask3; ctx.strokeStyle = C.silk; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(P.x, P.y, pr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.copper2; ctx.lineWidth = 2.4;
      for (let k = 0; k < 4; k++) {
        const a = aPump + (k * Math.PI) / 2;
        ctx.beginPath(); ctx.moveTo(P.x, P.y);
        ctx.quadraticCurveTo(P.x + Math.cos(a + 0.6) * pr * 0.55, P.y + Math.sin(a + 0.6) * pr * 0.55, P.x + Math.cos(a) * pr * 0.78, P.y + Math.sin(a) * pr * 0.78);
        ctx.stroke();
      }
      ctx.fillStyle = C.silk; ctx.beginPath(); ctx.arc(P.x, P.y, 2.5, 0, Math.PI * 2); ctx.fill();
      // pompanın itme yönü (yukarı)
      ctx.fillStyle = C.silk;
      ctx.beginPath(); ctx.moveTo(P.x, P.y - pr - 9); ctx.lineTo(P.x - 6, P.y - pr - 1); ctx.lineTo(P.x + 6, P.y - pr - 1); ctx.closePath(); ctx.fill();
      // debimetre: çark
      const M = S[geo.iM], mr = pw * 1.9;
      ctx.fillStyle = C.mask3; ctx.strokeStyle = C.silk; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(M.x, M.y, mr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = C.amp; ctx.lineWidth = 2;
      for (let k = 0; k < 6; k++) { const a = aWheel + (k * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(M.x, M.y); ctx.lineTo(M.x + Math.cos(a) * mr * 0.8, M.y + Math.sin(a) * mr * 0.8); ctx.stroke(); }
      // vana
      const Vv = S[geo.iV], open = !sch.part("S1").closed, vr = pw * 1.25;
      ctx.fillStyle = C.mask3; ctx.strokeStyle = C.silk; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(Vv.x - vr * 1.4, Vv.y - vr); ctx.lineTo(Vv.x - vr * 1.4, Vv.y + vr); ctx.lineTo(Vv.x + vr * 1.4, Vv.y - vr); ctx.lineTo(Vv.x + vr * 1.4, Vv.y + vr); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(Vv.x, Vv.y); ctx.lineTo(Vv.x, Vv.y - vr * 2.4); ctx.stroke();
      ctx.strokeStyle = open ? C.heat : C.copper2; ctx.lineWidth = 3.2;
      ctx.beginPath();
      if (open) { ctx.moveTo(Vv.x - vr * 0.2, Vv.y - vr * 2.4 - vr * 1.1); ctx.lineTo(Vv.x + vr * 0.2, Vv.y - vr * 2.4 + vr * 0.2); }
      else { ctx.moveTo(Vv.x - vr * 1.3, Vv.y - vr * 2.4); ctx.lineTo(Vv.x + vr * 1.3, Vv.y - vr * 2.4); }
      ctx.stroke();
      // etiketler (çevrenin içinde)
      const fs = clamp(w / 34, 11, 14);
      const lab = (x, y, t1, t2, al = "left") => {
        ctx.textAlign = al; ctx.textBaseline = "middle";
        ctx.font = `700 ${fs}px ${FONT.display}`; ctx.fillStyle = C.silk; ctx.fillText(t1, x, y);
        ctx.font = `500 ${fs * 0.92}px ${FONT.display}`; ctx.fillStyle = C.muted; ctx.fillText(t2, x, y + fs * 1.25);
      };
      lab(P.x + pr + 10, P.y - fs * 0.6, T.pump, T.pumpEq);
      lab(M.x, M.y + mr + fs * 1.1, T.meter, T.meterEq, "center");
      lab(geo.x1 - pw * 2.2, geo.ym - fs * 0.6, T.narrow, T.narrowEq, "right");
      lab(Vv.x, Vv.y - vr * 2.4 - fs * 2.9, T.valve + " " + T.valveEq, sch.part("S1").closed ? T.valveOpen : T.valveShut, "center");
      // debi okuması ve renk açıklaması
      ctx.textAlign = "center"; ctx.font = `600 ${fs * 0.95}px ${FONT.mono}`; ctx.fillStyle = C.amp;
      ctx.fillText(`${T.flow}: ${fmt(I, "A")}`, M.x, M.y - mr - fs * 0.9);
      ctx.textAlign = "left"; ctx.font = `500 ${fs * 0.85}px ${FONT.display}`; ctx.fillStyle = C.muted;
      ctx.fillText(T.pressure, 10, H - 12);
      const gx = 10 + ctx.measureText(T.pressure).width + 8;
      const gr = ctx.createLinearGradient(gx, 0, gx + 60, 0);
      gr.addColorStop(0, C.v0); gr.addColorStop(0.5, C.vmid); gr.addColorStop(1, C.v1);
      ctx.fillStyle = gr; ctx.fillRect(gx, H - 15, 60, 6);
    }
    ws = canvas(wcv, () => { geo = null; });
    // vanaya tıklamak anahtarı değiştirir
    wcv.addEventListener("pointerdown", (e) => {
      if (!geo) return;
      const r = wcv.getBoundingClientRect(), V = geo.S[geo.iV];
      if (Math.hypot(e.clientX - r.left - V.x, e.clientY - r.top - (V.y - geo.pw * 1.4)) < geo.pw * 3.6) sch.set("S1", "closed", !sch.part("S1").closed);
    });
    wcv.addEventListener("pointermove", (e) => {
      if (!geo) return;
      const r = wcv.getBoundingClientRect(), V = geo.S[geo.iV];
      wcv.style.cursor = Math.hypot(e.clientX - r.left - V.x, e.clientY - r.top - (V.y - geo.pw * 1.4)) < geo.pw * 3.6 ? "pointer" : "default";
    });
    sch.on("change", () => { dirty = true; });
    const lp = loop((dt) => draw(dt));
    return { enter() { sch.start(); lp.start(); }, leave() { sch.stop(); lp.stop(); }, sch };
  };
  G["su-benzetmesi"] = [{ slide: "label:" + T.vLabel, to: 11 }, { wait: 900 }, { slide: "label:" + T.rLabel, to: 4700 }, { wait: 900 }, { click: "=" + T.whyBtn }];

  /* ======================================================================
     2) Akımın yönü: geleneksel akım ve elektronlar
     ====================================================================== */
  Demos.c1yon = function (stage) {
    const top = h("div.pane", { style: { flex: "1" } });
    const meters = h("div.meters.c1-meters");
    const mI = meter(T.mCurrent), mE = meter(T.mElPerS), mD = meter(T.mDrift), mT = meter(T.mMeter);
    meters.append(mI, mE, mD, mT);
    stage.append(h("div.split.c1-yon", { style: { gridTemplateRows: "1fr auto" } }, top, meters));
    const def = clone("c1yon");
    let mode = "geleneksel";
    let ePh = 0;
    const ECOL = "#a8e6ff";
    const sch = Schematic(top, def, {
      maxUnit: 34,
      tick(dt, s) {
        const I = s.sim.i("LA1");
        const sp = clamp((I / def.iRef) * 3, -14, 14);
        ePh -= sp * dt; // elektronlar geleneksel akımın tersine
      },
      overlay(ctx, s) {
        const u = s.unit;
        const I = Math.abs(s.sim.i("LA1"));
        const showE = mode !== "geleneksel", showC = mode !== "elektron";
        // elektron noktaları kapalı yol boyunca
        if (showE && I > 1e-6) {
          const pts = def.loop;
          const r = Math.max(2.4, 0.19 * u);
          let acc = 0;
          for (let j = 0; j + 1 < pts.length; j++) {
            const A = pts[j], B = pts[j + 1], len = Math.hypot(B[0] - A[0], B[1] - A[1]);
            let sp = (((ePh - acc + 0.5) % 1) + 1) % 1;
            for (; sp < len; sp += 1) {
              const t = sp / len, x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t;
              if (def.bodies.some(([bx, by, br]) => Math.abs(x - bx) < br && Math.abs(y - by) < br)) continue;
              const [sx, sy] = s.screenOf([x, y]);
              ctx.fillStyle = ECOL; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
              ctx.strokeStyle = C.mask; ctx.lineWidth = Math.max(1.2, r * 0.35);
              ctx.beginPath(); ctx.moveTo(sx - r * 0.5, sy); ctx.lineTo(sx + r * 0.5, sy); ctx.stroke();
            }
            acc += len;
          }
        }
        // yön okları üst telin üstünde
        const fs = Math.max(11, 0.55 * u);
        const arrow = (y, dir, col, txt) => {
          const [ax, ay] = s.screenOf([3.2, y]), [bx] = s.screenOf([6.8, y]);
          const x0 = dir > 0 ? ax : bx, x1 = dir > 0 ? bx : ax;
          ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(x0, ay); ctx.lineTo(x1, ay); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x1, ay); ctx.lineTo(x1 - dir * 10, ay - 6); ctx.lineTo(x1 - dir * 10, ay + 6); ctx.closePath(); ctx.fill();
          ctx.font = `700 ${fs}px ${FONT.display}`; ctx.textAlign = dir > 0 ? "right" : "left"; ctx.textBaseline = "middle";
          ctx.fillText(txt, dir > 0 ? x0 - 8 : x0 + 8, ay);
        };
        if (I > 1e-6) {
          if (showC) arrow(mode === "ikisi" ? -2.6 : -2.2, 1, C.amp, T.convTag);
          if (showE) arrow(mode === "ikisi" ? -1.5 : -2.2, -1, ECOL, T.elecTag);
        }
        // pil uçları
        ctx.font = `800 ${Math.max(14, 0.85 * u)}px ${FONT.display}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const [px, py] = s.screenOf([-1.25, 2.9]), [mx, my] = s.screenOf([-1.25, 5.1]);
        ctx.fillStyle = C.v1; ctx.fillText("+", px, py);
        ctx.fillStyle = C.v0; ctx.fillText("−", mx, my);
      },
    });
    const segm = seg([["geleneksel", T.dirConv], ["elektron", T.dirElec], ["ikisi", T.dirBoth]], mode, (k) => {
      mode = k; def.dots = k !== "elektron"; sch.draw();
    }, "Akım gösterimi");
    segm.classList.add("c1-yonseg");
    const vs = slider({ label: T.vLabel, min: 0, max: 12, step: 0.1, value: 6, fmt: (v) => fmt(v, "V"), oninput: (v) => sch.set("B1", "V", v) });
    stage.append(h("div.controls", segm, vs));
    const n = 8.5e28, e = 1.602e-19, A = 1e-6;
    function update() {
      const I = Math.abs(sch.sim.i("LA1"));
      mI.val.textContent = fmt(I, "A");
      if (I < 1e-6) { mE.val.textContent = "0"; mD.val.textContent = "0 mm/s"; mT.val.textContent = T.noCurrent; return; }
      mE.val.innerHTML = sciH(I / e);
      const v = I / (n * e * A); // m/s
      mD.val.textContent = num(v * 1000, v * 1000 < 0.01 ? 4 : 3) + " mm/s";
      const t = 1 / v;
      mT.val.textContent = t > 7200 ? num(t / 3600, 1) + " " + T.hours : num(t / 60, 0) + " " + T.minutes;
    }
    sch.on("change", update);
    update();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["akim-yonu"] = [{ click: "=" + T.dirElec }, { wait: 1600 }, { click: "=" + T.dirBoth }, { wait: 900 }, { slide: "label:" + T.vLabel, to: 12 }];

  /* ======================================================================
     3) İletken, yalıtkan, yarı iletken: atom düzeyinde serbest elektronlar
     ====================================================================== */
  // Numune: L = 1 cm, A = 1 mm² → R = ρ · 10⁴ (1/m)
  const GEOM = 0.01 / 1e-6;
  const MATS = {
    bakir: { name: T.matCu, fill: "#b8733f", dot: "#f0b07a" },
    cam: { name: T.matGlass, fill: "#5f8f8a", dot: "#b9e0da" },
    silisyum: { name: T.matSi, fill: "#5c6878", dot: "#aab6c8" },
  };
  // özdirenç (Ω·m), T kelvin. Bakır: 1,68·10⁻⁸ (20 °C), sıcaklık katsayısı 0,0039/K.
  // Cam: 10¹⁰–10¹⁴ arası; orta değer 10¹². Saf silisyum: ~2,3·10³ (300 K);
  // n_i ∝ T^1,5 · e^(−Eg/2kT), Eg = 1,12 eV; hareketlilik ∝ T^−2,4 (basitleştirilmiş).
  const KB = 8.617e-5, EG = 1.12;
  const niRatio = (TK) => Math.pow(TK / 300, 1.5) * Math.exp((-EG / (2 * KB)) * (1 / TK - 1 / 300));
  function rho(mat, TK) {
    if (mat === "bakir") return 1.68e-8 * (1 + 0.0039 * (TK - 293.15));
    if (mat === "cam") return 1e12;
    return 2.3e3 / (niRatio(TK) * Math.pow(TK / 300, -2.4));
  }
  const ni300 = 1e10; // cm⁻³, saf silisyum, oda sıcaklığı

  Schematic.PARTS.c1sample = {
    hide: 1.4, pins: { a: [-2, 0], b: [2, 0] }, box: [-1.35, -0.75, 1.35, 0.75],
    paths: [{ term: 0, pts: [[-2, 0], [0, 0]] }, { term: 1, pts: [[2, 0], [0, 0]] }],
    el: (p, n) => [{ type: "R", id: p.id, n: [n("a"), n("b")], R: p.R }],
    draw(g, p) {
      const m = MATS[p.mat] || MATS.bakir;
      g.lead([-2, 0], [-1.3, 0], "a"); g.lead([1.3, 0], [2, 0], "b");
      g.rect(-1.3, -0.72, 0.2, 1.44, { fill: C.copper });
      g.rect(1.1, -0.72, 0.2, 1.44, { fill: C.copper });
      g.rect(-1.1, -0.55, 2.2, 1.1, { fill: m.fill, stroke: C.silk, width: 1.6 });
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) g.circle(-0.8 + i * 0.4, -0.3 + j * 0.3, 0.05, { fill: m.dot });
    },
  };

  Demos.c1malzeme = function (stage) {
    const latPane = h("div.pane.c1-lat", h("span.pane-title", T.latTitle));
    const lcv = h("canvas", { role: "img", "aria-label": T.latTitle });
    latPane.append(lcv);
    const cap = h("p.c1-cap");
    const legend = h("div.legend.c1-legend");
    const schPane = h("div.pane");
    const mRho = meter(T.mRho), mR = meter(T.mRs), mI = meter(T.mI), mN = meter(T.mN);
    const side = h("div.c1-side", h("div.meters.c1-meters", mRho, mR, mI, mN), cap, legend);
    const bottom = h("div.c1-matbot", schPane, side);
    stage.append(h("div.split.c1-matsplit", { style: { gridTemplateRows: "1.25fr 1fr" } }, latPane, bottom));
    const def = clone("c1numune");
    const sch = Schematic(schPane, def, { maxUnit: 30 });

    let mat = "bakir", V = 5, TC = 25;
    const ms = seg([["bakir", T.matCu], ["cam", T.matGlass], ["silisyum", T.matSi]], mat, (k) => { mat = k; apply(); }, "Malzeme");
    const vs = slider({ label: T.vLabel, min: 0, max: 10, step: 0.1, value: V, fmt: (v) => fmt(v, "V"), oninput: (v) => { V = v; sch.set("B1", "V", v); } });
    const ts = slider({ label: T.tLabel, min: -40, max: 200, step: 1, value: TC, fmt: (v) => num(v, 0) + " °C", oninput: (v) => { TC = v; apply(); } });
    stage.append(h("div.controls", ms, vs, ts));

    function apply() {
      ts.style.display = mat === "silisyum" ? "" : "none";
      const TK = mat === "silisyum" ? TC + 273.15 : 293.15;
      sch.set("N1", { mat, R: rho(mat, TK) * GEOM, label: MATS[mat].name });
      cap.textContent = { bakir: T.capCu, cam: T.capGlass, silisyum: T.capSi }[mat];
      legend.innerHTML = "";
      const it = (cls, t) => h("span", h("i.c1-lg." + cls), t);
      if (mat === "bakir") legend.append(it("ion", T.lgIon), it("free", T.lgFree));
      if (mat === "cam") legend.append(it("ion", T.lgIon), it("bound", T.lgBound));
      if (mat === "silisyum") legend.append(it("bound", T.lgBound), it("free", T.lgFree), it("hole", T.lgHole), h("span.c1-note", T.logNote));
      sync();
    }
    function update() {
      const TK = mat === "silisyum" ? TC + 273.15 : 293.15;
      const r = rho(mat, TK);
      mRho.val.innerHTML = sciH(r) + " Ω·m";
      mR.val.innerHTML = big(sch.part("N1").R, "Ω");
      const I = Math.abs(sch.sim.i("A1"));
      mI.val.innerHTML = I < 1e-18 ? "0 A" : big(I, "A");
      mN.val.innerHTML = mat === "bakir" ? sciH(8.5e22) + " cm<sup>−3</sup>" : mat === "cam" ? T.fewCarriers : sciH(ni300 * niRatio(TK)) + " cm<sup>−3</sup>";
    }
    sch.on("change", update);

    /* --- kafes animasyonu --- */
    let ls, lat = null;
    const rnd = L.rng(7);
    function buildLat() {
      const { w, h: H } = ls;
      const ex = 26; // elektrot kalınlığı + boşluk
      const left = ex + 14, right = w - ex - 14, topY = 34, botY = H - 16;
      const sp = clamp(Math.min((right - left) / 9, (botY - topY) / 4.2), 34, 62);
      const cols = Math.max(4, Math.floor((right - left) / sp)), rows = Math.max(3, Math.floor((botY - topY) / sp));
      const ox = left + (right - left - (cols - 1) * sp) / 2, oy = topY + (botY - topY - (rows - 1) * sp) / 2;
      const atoms = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) atoms.push({ i, j, x: ox + i * sp, y: oy + j * sp, jx: (rnd() - 0.5) * sp * 0.42, jy: (rnd() - 0.5) * sp * 0.42, ph: rnd() * 6.28 });
      const bonds = [];
      atoms.forEach((a, k) => {
        if (a.i + 1 < cols) bonds.push({ a: k, b: k + 1 });
        if (a.j + 1 < rows) bonds.push({ a: k, b: k + cols });
      });
      lat = { w, H, ex, left, right, topY, botY, sp, cols, rows, atoms, bonds, free: [], holes: [] };
      lat.free = atoms.map((a) => newE(a.x + sp / 2, a.y + (rnd() - 0.5) * sp));
    }
    function newE(x, y) { const a = rnd() * 6.28; return { x, y, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, t: rnd() * 0.2 }; }
    // silisyumda görünen serbest elektron sayısı: logaritmik ölçek (gerçek oran 10¹⁰ cm⁻³ düzeyinde)
    function siCount(TK) { return Math.round(clamp(2 + 3 * Math.log10(niRatio(TK)), 0, 16)); }
    function sync() {
      if (!lat) return;
      if (mat === "silisyum") {
        const want = siCount(TC + 273.15);
        while (lat.holes.length < want) {
          const bi = Math.floor(rnd() * lat.bonds.length);
          if (lat.holes.some((hh) => hh.b === bi)) continue;
          const B = lat.bonds[bi], A1 = lat.atoms[B.a], A2 = lat.atoms[B.b];
          lat.holes.push({ b: bi, t: rnd() });
          lat.siFree = lat.siFree || [];
          lat.siFree.push(newE((A1.x + A2.x) / 2, (A1.y + A2.y) / 2));
        }
        while (lat.holes.length > want) { lat.holes.pop(); lat.siFree.pop(); }
      }
    }
    let tt = 0;
    function drawLat(dt) {
      if (!ls || !ls.w) return;
      if (!lat || lat.w !== ls.w || lat.H !== ls.H) { lat = null; buildLat(); lat.siFree = []; sync(); }
      const { ctx, w, h: H } = ls;
      const { ex, left, right, topY, botY, sp, atoms, bonds } = lat;
      tt += dt;
      ctx.clearRect(0, 0, w, H);
      // elektrotlar: solda eksi, sağda artı uç
      const Vn = V / 10;
      const ecol = (v) => vcolor(v, 0, 10);
      ctx.fillStyle = ecol(0); ctx.fillRect(8, topY - 10, ex - 8, botY - topY + 10);
      ctx.fillStyle = ecol(V); ctx.fillRect(w - ex, topY - 10, ex - 8, botY - topY + 10);
      ctx.fillStyle = C.mask; ctx.font = `800 18px ${FONT.display}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("−", 8 + (ex - 8) / 2, (topY + botY) / 2); ctx.fillText("+", w - ex + (ex - 8) / 2, (topY + botY) / 2);
      const rA = sp * 0.17;
      if (mat === "bakir") {
        atoms.forEach((a) => {
          const wob = Math.sin(tt * 9 + a.ph) * 1.2;
          ctx.fillStyle = rgba(C.copper, 0.5); ctx.strokeStyle = rgba(C.copper2, 0.9); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(a.x + wob, a.y, rA, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = C.silk; ctx.font = `700 ${rA * 1.2}px ${FONT.display}`; ctx.fillText("+", a.x + wob, a.y + 0.5);
        });
        moveFree(lat.free, 70 * Vn, dt);
        drawFree(lat.free);
      } else if (mat === "cam") {
        // düzensiz (amorf) ağ
        ctx.strokeStyle = rgba(C.silk, 0.18); ctx.lineWidth = 1.4;
        bonds.forEach((b) => { const A = atoms[b.a], B = atoms[b.b]; ctx.beginPath(); ctx.moveTo(A.x + A.jx, A.y + A.jy); ctx.lineTo(B.x + B.jx, B.y + B.jy); ctx.stroke(); });
        atoms.forEach((a) => {
          const x = a.x + a.jx, y = a.y + a.jy;
          ctx.fillStyle = rgba("#7fb8b0", 0.45); ctx.strokeStyle = rgba("#b9e0da", 0.8); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(x, y, rA * 0.95, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          // bağlı elektron: alan onu artı uca doğru biraz çeker (kutuplanma)
          const r = rA * 1.75, ang = tt * 3 + a.ph, sh = Vn * rA * 0.8;
          ctx.strokeStyle = rgba(C.silk, 0.14); ctx.beginPath(); ctx.arc(x + sh, y, r, 0, Math.PI * 2); ctx.stroke();
          dotE(x + sh + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.9, false);
        });
      } else {
        // kristal: her bağda iki elektron; boşluklarda biri eksik
        const holeAt = new Map(lat.holes.map((hh) => [hh.b, hh]));
        bonds.forEach((b, bi) => {
          const A = atoms[b.a], B = atoms[b.b];
          const dx = B.x - A.x, dy = B.y - A.y, l = Math.hypot(dx, dy), nx = -dy / l * 3, ny = dx / l * 3;
          ctx.strokeStyle = rgba(C.silk, 0.2); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(A.x + nx, A.y + ny); ctx.lineTo(B.x + nx, B.y + ny); ctx.moveTo(A.x - nx, A.y - ny); ctx.lineTo(B.x - nx, B.y - ny); ctx.stroke();
          const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, ox = dx / l * 5, oy = dy / l * 5;
          if (holeAt.has(bi)) { dotE(mx - ox, my - oy, false); holeDraw(mx + ox, my + oy); }
          else { dotE(mx - ox, my - oy, false); dotE(mx + ox, my + oy, false); }
        });
        atoms.forEach((a) => {
          ctx.fillStyle = rgba("#8494aa", 0.55); ctx.strokeStyle = rgba("#c4cfdf", 0.9); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(a.x, a.y, rA, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = C.silk; ctx.font = `700 ${rA * 0.9}px ${FONT.display}`; ctx.fillText("Si", a.x, a.y + 0.5);
        });
        // boşluklar alan yönünde (artıdan eksiye) komşu bağlara atlar
        lat.holes.forEach((hh) => {
          hh.t += dt * (0.5 + 2.2 * Vn);
          if (hh.t < 1) return;
          hh.t = 0;
          const B = bonds[hh.b], cx = (atoms[B.a].x + atoms[B.b].x) / 2, cy = (atoms[B.a].y + atoms[B.b].y) / 2;
          const cands = bonds.map((bb, k) => ({ k, x: (atoms[bb.a].x + atoms[bb.b].x) / 2, y: (atoms[bb.a].y + atoms[bb.b].y) / 2 }))
            .filter((q) => q.k !== hh.b && Math.hypot(q.x - cx, q.y - cy) < sp * 0.8 && !lat.holes.some((o) => o.b === q.k));
          // eksi uca varan boşluk orada bir elektronla dolar; artı uçtan yenisi girer
          if (Vn > 0.02 && cx < left + sp * 0.6) {
            const rightB = bonds.map((bb, k) => k).filter((k) => (atoms[bonds[k].a].x + atoms[bonds[k].b].x) / 2 > lat.right - sp * 0.6 && !lat.holes.some((o) => o.b === k));
            if (rightB.length) hh.b = rightB[Math.floor(rnd() * rightB.length)];
            return;
          }
          if (!cands.length) return;
          // alan varsa çoğunlukla eksi uca (sola) doğru
          cands.sort((p1, p2) => p1.x - p2.x);
          const pick = rnd() < 0.25 + 0.6 * Vn ? cands[0] : cands[Math.floor(rnd() * cands.length)];
          hh.b = pick.k;
        });
        moveFree(lat.siFree, 70 * Vn, dt);
        drawFree(lat.siFree);
      }
      // geleneksel akım yönü notu
      if (V > 0.05 && mat !== "cam") {
        ctx.fillStyle = C.muted; ctx.font = `600 11px ${FONT.display}`; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        ctx.fillText(T.driftNote, w - ex - 10, H - 2);
      }
    }
    function moveFree(arr, drift, dt) {
      const { ex, topY, botY } = lat, w = lat.w;
      arr.forEach((e) => {
        e.t -= dt;
        if (e.t < 0) { const a = rnd() * 6.28, s = 60 + rnd() * 60; e.vx = Math.cos(a) * s; e.vy = Math.sin(a) * s; e.t = 0.08 + rnd() * 0.18; }
        e.x += (e.vx + drift) * dt; e.y += e.vy * dt;
        if (e.y < topY - 8) { e.y = topY - 8; e.vy = Math.abs(e.vy); }
        if (e.y > botY + 2) { e.y = botY + 2; e.vy = -Math.abs(e.vy); }
        if (e.x > w - ex - 4) e.x = ex + 6;
        if (e.x < ex + 4) e.x = drift > 0.5 ? ex + 6 : w - ex - 6;
      });
    }
    function dotE(x, y, free) {
      const ctx = ls.ctx;
      ctx.fillStyle = free ? "#a8e6ff" : rgba("#a8e6ff", 0.55);
      ctx.beginPath(); ctx.arc(x, y, free ? 3.6 : 2.4, 0, Math.PI * 2); ctx.fill();
    }
    function drawFree(arr) { arr.forEach((e) => dotE(e.x, e.y, true)); }
    function holeDraw(x, y) {
      const ctx = ls.ctx;
      ctx.strokeStyle = C.gold; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(x, y, 3.8, 0, Math.PI * 2); ctx.stroke();
    }
    ls = canvas(lcv, () => { lat = null; });
    const lp = loop((dt) => drawLat(dt));
    apply();
    return { enter() { sch.start(); lp.start(); }, leave() { sch.stop(); lp.stop(); }, sch };
  };
  G["iletken-yalitkan"] = [{ click: "=" + T.matGlass }, { wait: 1300 }, { click: "=" + T.matSi }, { wait: 800 }, { slide: "label:" + T.tLabel, to: 150 }];

  /* ======================================================================
     4) Güç ve ısı: P = V·I = I²·R; güç sınırı ve yanan direnç
     ====================================================================== */
  // gövde ölçüleri (mm): yaygın karbon/metal film ve 5 W seramik (çimento) dirençler
  const RATINGS = [
    { k: "0.25", P: 0.25, t: "¼ W", m: "0,25 W", L: 6.3, D: 2.4 },
    { k: "0.5", P: 0.5, t: "½ W", m: "0,5 W", L: 9, D: 3.2 },
    { k: "1", P: 1, t: "1 W", m: "1 W", L: 11.5, D: 4.5 },
    { k: "5", P: 5, t: "5 W", m: "5 W", L: 22, D: 9.5, box: true },
  ];
  Demos.c1guc = function (stage) {
    const top = h("div.pane");
    const physPane = h("div.pane.c1-phys", h("span.pane-title", T.realSize));
    const pcv = h("canvas", { role: "img", "aria-label": T.realSize });
    physPane.append(pcv);
    const mV = meter(T.mV), mI = meter(T.mCurrent), mP = meter(T.mP), mPm = meter(T.mPmax), mE = meter(T.mE);
    const flag = h("span.flag");
    const side = h("div.c1-side", h("div.meters.c1-meters", mV, mI, mP, mPm, mE), flag);
    stage.append(h("div.split.c1-gucsplit", { style: { gridTemplateRows: "1.15fr 1fr" } }, top, h("div.c1-gucbot", physPane, side)));
    const def = clone("c1guc");
    const sch = Schematic(top, def, { maxUnit: 26 });
    let rt = RATINGS[0], R = 100;
    const label = () => `R1 ${fmt(R, "Ω")} · ${rt.t}`;
    sch.set("R1", "label", label());
    const vs = slider({ label: T.supply, min: 0, max: 40, step: 0.1, value: 5, fmt: (v) => fmt(v, "V"), oninput: (v) => sch.set("B1", "V", v) });
    const rs = slider({ label: T.rLabel, min: 10, max: 1000, step: 1, value: R, log: true, fmt: (v) => fmt(v, "Ω"), oninput: (v) => { R = v; sch.set("R1", { R: v, label: label() }); } });
    const rsg = seg(RATINGS.map((r) => [r.k, r.t]), rt.k, (k) => { rt = RATINGS.find((r) => r.k === k); sch.set("R1", { Pmax: rt.P, label: label() }); }, T.rating);
    const rep = btn(T.repair, () => sch.repair(), "primary");
    stage.append(h("div.controls", vs, rs, h("span.c1-lab", T.rating, rsg), rep));

    function update() {
      const p = sch.part("R1");
      const V = Math.abs(sch.sim.vAcross("V1")), I = Math.abs(sch.sim.i("A1")), P = Math.abs(sch.sim.p("R1"));
      mV.val.textContent = fmt(V, "V"); mI.val.textContent = fmt(I, "A"); mP.val.textContent = fmt(P, "W");
      mPm.val.textContent = rt.m; mE.val.textContent = fmt(P * 1, "Wh");
      flag.className = "flag" + (p.burnt || P > rt.P ? "" : " ok");
      flag.textContent = p.burnt ? T.burnFlag : P > rt.P ? T.hotFlag : T.okFlag;
      rep.style.display = p.burnt ? "" : "none";
    }
    sch.on("change", update);
    update();

    // gerçek boyutlu gövde ve güç çubuğu
    let ps;
    function drawPhys() {
      if (!ps || !ps.w) return;
      const { ctx, w, h: H } = ps;
      ctx.clearRect(0, 0, w, H);
      const p = sch.part("R1");
      const P = p.burnt ? 0 : Math.abs(sch.sim.p("R1"));
      const ratio = P / rt.P;
      const barH = 42, areaH = H - barH - 24;
      const scale = Math.min((w - 40) / (22 + 14), (areaH - 10) / 13); // px/mm, 5 W gövdesi sığsın
      const cx = w / 2, cy = 22 + areaH / 2;
      const Lb = rt.L * scale, Db = rt.D * scale;
      // ısı parıltısı
      const heat = clamp((ratio - 0.15) / 1.1, 0, 1);
      if (heat > 0 && !p.burnt) {
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Lb * 0.9 + 20);
        gr.addColorStop(0, rgba(C.heat, 0.5 * heat)); gr.addColorStop(1, rgba(C.heat, 0));
        ctx.fillStyle = gr; ctx.fillRect(0, 0, w, areaH + 24);
      }
      // bacaklar
      ctx.strokeStyle = "#b9bdb4"; ctx.lineWidth = Math.max(1.5, 0.6 * scale);
      ctx.beginPath(); ctx.moveTo(cx - Lb / 2 - 7 * scale, cy); ctx.lineTo(cx + Lb / 2 + 7 * scale, cy); ctx.stroke();
      // gövde
      const base = rt.box ? "#e9e6dc" : "#d8c49a";
      const body = p.burnt ? "#2a211b" : L.mix(base, "#ff5a1a", Math.min(1, heat * 0.85));
      ctx.fillStyle = body; ctx.strokeStyle = rgba("#000000", 0.35); ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (rt.box) ctx.roundRect(cx - Lb / 2, cy - Db / 2, Lb, Db, 2 * scale);
      else ctx.roundRect(cx - Lb / 2, cy - Db / 2, Lb, Db, Db / 2.2);
      ctx.fill(); ctx.stroke();
      // renk şeritleri (karbon dirençlerde) ya da baskı (seramikte)
      if (!p.burnt) {
        if (rt.box) {
          ctx.fillStyle = "#3a3a3a"; ctx.font = `700 ${Math.max(9, 2.6 * scale)}px ${FONT.mono}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(`5W ${fmt(R, "Ω").replace(" ", "")}`, cx, cy);
        } else {
          const [d1, d2, ex] = Circuit.colorCode(R);
          const cols = [BAND_HEX[d1], BAND_HEX[d2], BAND_HEX[ex] || "#c9a43a", "#c9a43a"];
          const xs = [-0.3, -0.15, 0, 0.3];
          cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(cx + xs[i] * Lb - Lb * 0.035, cy - Db / 2 + 0.5, Lb * 0.07, Db - 1); });
        }
      }
      // ısı dalgaları
      if (heat > 0.25 && !p.burnt) {
        ctx.strokeStyle = rgba("#ffd0a0", 0.35 * heat); ctx.lineWidth = 1.5;
        const t = performance.now() / 1000;
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          for (let y = 0; y < 26; y += 2) { const x = cx + k * Lb * 0.3 + Math.sin(y * 0.4 - t * 6 + k) * 3; const yy = cy - Db / 2 - 6 - y; y ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
          ctx.stroke();
        }
      }
      ctx.fillStyle = C.muted; ctx.font = `500 11px ${FONT.display}`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText(`${rt.t} ${T.body}: ${num(rt.L, 1)} × ${num(rt.D, 1)} mm`, cx, cy + Db / 2 + 20);
      // güç çubuğu: 0 … 250 %
      const bx = 18, bw = w - 36, by = H - barH + 8, bh = 10;
      const X = (f) => bx + (Math.min(f, 2.5) / 2.5) * bw;
      ctx.fillStyle = rgba(C.silk, 0.1); ctx.fillRect(bx, by, bw, bh);
      const gr2 = ctx.createLinearGradient(bx, 0, X(2.5), 0);
      gr2.addColorStop(0, C.v0); gr2.addColorStop(0.4, C.gold); gr2.addColorStop(0.8, C.heat); gr2.addColorStop(1, C.v1);
      ctx.fillStyle = gr2; ctx.fillRect(bx, by, X(ratio) - bx, bh);
      ctx.strokeStyle = C.silk; ctx.lineWidth = 1.5;
      [[1, T.pRated], [2, T.pBurn]].forEach(([f, t]) => {
        ctx.beginPath(); ctx.moveTo(X(f), by - 4); ctx.lineTo(X(f), by + bh + 4); ctx.stroke();
        ctx.fillStyle = C.silk2; ctx.font = `600 11px ${FONT.display}`; ctx.textAlign = "center"; ctx.fillText(t, X(f), by + bh + 17);
      });
      ctx.textAlign = "left"; ctx.fillStyle = C.muted; ctx.fillText(`${T.pAxis}: ${num(ratio * 100, 0)} %`, bx, by - 7);
    }
    ps = canvas(pcv, drawPhys);
    const lp = loop(() => drawPhys());
    return { enter() { sch.start(); lp.start(); }, leave() { sch.stop(); lp.stop(); }, sch };
  };
  G["guc-ve-isi"] = [{ slide: "label:" + T.supply, to: 6.5 }, { wait: 900 }, { slide: "label:" + T.supply, to: 9 }, { wait: 1600 }, { click: "=1 W" }];
  GUIDE_TARGETS["guc-ve-isi"] = "label:" + T.supply;

  /* ======================================================================
     5) LED direnci hesabı
     ====================================================================== */
  Demos.c1led = function (stage) {
    const top = h("div.pane");
    const calc = h("div.c1-calc");
    stage.append(h("div.split.c1-ledsplit", { style: { gridTemplateRows: "1fr auto" } }, top, calc));
    const base = clone("c1led");
    const def = clone("c1led");
    const sch = Schematic(top, def, { maxUnit: 30 });
    let Vs = 5, col = "kirmizi", Iw = 0.01, up = true, removed = false;
    const sup = seg([["3.3", "3,3 V"], ["5", "5 V"], ["9", "9 V"], ["12", "12 V"]], "5", (k) => { Vs = +k; sch.set("B1", "V", Vs); apply(); }, T.vsLabel);
    const leds = seg(Object.entries(Circuit.LED).map(([k, c]) => [k, c.name]), col, (k) => { col = k; sch.set("LED1", "color", k); apply(); }, T.ledLabel);
    [...leds.querySelectorAll("button")].forEach((b, i) => { const c = Object.values(Circuit.LED)[i].color; b.prepend(h("i.c1-dot", { style: { background: c } })); });
    const is = slider({ label: T.iLabel, min: 5, max: 20, step: 1, value: 10, fmt: (v) => num(v, 0) + " mA", oninput: (v) => { Iw = v / 1000; apply(); } });
    const pick = seg([["near", T.pickNear], ["up", T.pickUp]], "up", (k) => { up = k === "up"; apply(); }, "E12 seçimi");
    const rem = btn(T.removeR, () => { removed = !removed; rebuild(); });
    const rep = btn(T.repair, () => sch.repair(), "primary");
    stage.append(h("div.controls", h("span.c1-lab", T.vsLabel, sup), h("span.c1-lab", T.ledLabel, leds), is, pick, rem, rep));

    let Rcalc = 0, Rnear = 0, Rup = 0;
    function rebuild() {
      const parts = base.parts.filter((p) => !(removed && p.id === "R1")).map((p) => ({ ...p }));
      parts.find((p) => p.id === "B1").V = Vs;
      parts.find((p) => p.id === "LED1").color = col;
      const wires = base.wires.concat(removed ? [base.bypass] : []);
      sch.rebuild({ parts, wires });
      rem.textContent = removed ? T.putR : T.removeR;
      rem.classList.toggle("on", removed);
      apply();
    }
    function apply() {
      const Vf = Circuit.LED[col].Vf;
      Rcalc = (Vs - Vf) / Iw;
      Rnear = Circuit.nearestE(Rcalc);
      Rup = Circuit.nearestE(Rcalc, Circuit.E12, true);
      if (!removed) sch.set("R1", { R: up ? Rup : Rnear, label: `R1 ${fmt(up ? Rup : Rnear, "Ω")}` });
      else sch.solve();
    }
    function update() {
      const Vf = Circuit.LED[col].Vf;
      const led = sch.part("LED1");
      const I = Math.abs(sch.sim.i("LED1")), Vl = Math.abs(sch.sim.vAcross("LED1"));
      const hasR = !!sch.part("R1");
      const PR = hasR ? Math.abs(sch.sim.p("R1")) : 0;
      const Ruse = up ? Rup : Rnear;
      let s = `<p class="c1-f"><span>${T.cR}</span> R = (V<sub>s</sub> − V<sub>f</sub>) / I = (${fmt(Vs, "V")} − ${fmt(Vf, "V")}) / ${fmt(Iw, "A")} = <b>${fmt(Rcalc, "Ω")}</b></p>`;
      s += `<p class="c1-f"><span>${T.cE12}</span> ${T.nearShort}: <b class="${up ? "" : "sel"}">${fmt(Rnear, "Ω")}</b> · ${T.upShort}: <b class="${up ? "sel" : ""}">${fmt(Rup, "Ω")}</b></p>`;
      if (hasR) s += `<p class="c1-f"><span>${T.cReal}</span> ${fmt(Ruse, "Ω")} ile I = <b>${fmt(I, "A")}</b> · V<sub>LED</sub> = ${fmt(Vl, "V")}</p>` +
        `<p class="c1-f"><span>${T.cPow}</span> P = I²·R = <b>${fmt(PR, "W")}</b> · ${PR < 0.125 ? T.quarterOk : T.quarterNo}</p>`;
      else s += `<p class="c1-f"><span>${T.cReal}</span> ${T.noR} → I = <b>${led.burnt ? "0 A" : fmt(I, "A")}</b></p>`;
      if (led.burnt) s += `<p class="flag">${T.ledBurn}</p>`;
      else if (I > 0.03) s += `<p class="flag">${T.ledHigh}: ${fmt(I, "A")}</p>`;
      calc.innerHTML = s;
      rep.style.display = led.burnt ? "" : "none";
    }
    sch.on("change", update);
    apply();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["led-direnci"] = [{ click: "=9 V" }, { wait: 700 }, { click: "=" + Circuit.LED.mavi.name }, { wait: 700 }, { slide: "label:" + T.iLabel, to: 15 }, { wait: 900 }, { click: "=" + T.removeR }];

  /* ======================================================================
     6) Direnç renk kodu oyunu
     ====================================================================== */
  const BAND_HEX = ["#1a1a1a", "#7a4a26", "#d9302c", "#f08a1e", "#f2d43a", "#3fa34a", "#2f6fd6", "#8a4fc8", "#8d8d8d", "#f4f4f0"];
  const GOLD = "#c9a43a";
  Demos.c1renk = function (stage) {
    const rPane = h("div.pane.c1-rpane");
    const rcv = h("canvas", { role: "img", "aria-label": "Renk kodlu direnç" });
    rPane.append(rcv);
    const quiz = h("div.c1-quiz");
    const schPane = h("div.pane.c1-ohm");
    const mid = h("div.c1-mid", quiz, schPane);
    const table = h("div.c1-table");
    stage.append(h("div.split.c1-renk", { style: { gridTemplateRows: "minmax(120px,1fr) auto auto" } }, rPane, mid, table));
    const def = clone("c1olcum");
    def.parts[0].V = 0;
    const sch = Schematic(schPane, def, { maxUnit: 18 });
    const measure = h("p.c1-meas");
    schPane.append(measure);

    let mode = "oku", R = 4700, bands = [4, 7, 2], picked = [null, null, null], sel = 0, answered = false;
    let score = 0, tries = 0, streak = 0, firstPick = true;
    const scoreEl = h("span.readout");
    const ms = seg([["oku", T.modeRead], ["sec", T.modePick]], mode, (k) => { mode = k; round(); }, "Oyun türü");
    const nb = btn(T.newR, () => round(), "primary");
    const cb = btn(T.check, () => { if (mode === "sec" && picked.every((p) => p != null)) answer(valueOf(picked) === R); });
    stage.append(h("div.controls", ms, cb, nb, h("span.spacer"), scoreEl));

    // renk tablosu (seçme kipinde palet olarak da çalışır)
    const chips = Circuit.BANDS.map((name, d) => {
      const b = h("button.c1-chip", { type: "button", "aria-label": `${T.colorAria} ${name}`, onclick: () => choose(d) },
        h("i", { style: { background: BAND_HEX[d] } }), h("b", String(d)), h("span", name), h("small", "×" + fmt(10 ** d, "").replace(" ", "")));
      table.append(b); return b;
    });
    table.append(h("div.c1-chip.gold", h("i", { style: { background: GOLD } }), h("b", "±5%"), h("span", "altın"), h("small", "altın")));

    const valueOf = (bs) => (bs[0] * 10 + bs[1]) * 10 ** bs[2];
    const e12vals = [];
    for (let d = 1; d <= 5; d++) Circuit.E12.forEach((m) => e12vals.push(+(m * 10 ** d).toPrecision(3)));
    const randR = () => e12vals[Math.floor(Math.random() * e12vals.length)];
    const explain = (bs) => `${Circuit.BANDS[bs[0]]} ${bs[0]}, ${Circuit.BANDS[bs[1]]} ${bs[1]}, ${Circuit.BANDS[bs[2]]} ×${fmt(10 ** bs[2], "").trim()} → ${bs[0]}${bs[1]} × ${fmt(10 ** bs[2], "").trim()} = ${fmt(valueOf(bs), "Ω")}`;

    function round() {
      answered = false;
      R = mode === "sec" && firstPick ? 1000 : randR();
      if (mode === "sec") firstPick = false;
      bands = Circuit.colorCode(R);
      picked = [null, null, null]; sel = 0;
      sch.set("B1", "V", 0);
      measure.textContent = T.measureWait;
      chips.forEach((c) => (c.disabled = mode !== "sec"));
      cb.disabled = true;
      table.classList.toggle("pal", mode === "sec");
      quiz.innerHTML = "";
      if (mode === "oku") {
        quiz.append(h("p.c1-q", T.whichValue));
        const opts = new Set([R]);
        const swapped = (bands[1] * 10 + bands[0]) * 10 ** bands[2];
        const alt = [R * 10, R / 10, bands[1] ? swapped : null, randR(), randR(), randR(), randR()];
        for (const a of alt) { if (opts.size >= 4) break; if (a && a >= 10 && a <= 1e7) opts.add(+a.toPrecision(3)); }
        while (opts.size < 4) opts.add(randR());
        const row = h("div.c1-opts");
        [...opts].sort(() => Math.random() - 0.5).forEach((v) => row.append(h("button.btn.c1-opt", { type: "button", onclick: (e) => answer(v === R, e.currentTarget) }, fmt(v, "Ω"))));
        quiz.append(row);
      } else {
        quiz.append(h("p.c1-q", `${T.target}: `, h("b.c1-big", fmt(R, "Ω"))), h("p.c1-hint", T.pickHint));
      }
      quiz.append(h("p.c1-fb", { "aria-live": "polite" }));
      drawR();
      showScore();
    }
    function choose(d) {
      if (mode !== "sec" || answered) return;
      picked[sel] = d;
      const empty = picked.indexOf(null);
      sel = empty >= 0 ? empty : Math.min(2, sel + 1);
      cb.disabled = empty >= 0;
      drawR();
    }
    function answer(ok, el) {
      if (answered) return;
      answered = true; tries++;
      if (ok) { score++; streak++; } else streak = 0;
      const fb = quiz.querySelector(".c1-fb");
      fb.className = "c1-fb " + (ok ? "ok" : "no");
      fb.innerHTML = `<b>${ok ? T.right : T.wrong}</b> ` + explain(bands);
      if (el) el.classList.add(ok ? "good" : "bad");
      quiz.querySelectorAll(".c1-opt").forEach((b) => { b.disabled = true; if (b.textContent === fmt(R, "Ω")) b.classList.add("good"); });
      // ölçüm: 1 V uygula, akımdan R = V / I
      sch.set("RX", "R", R); sch.set("B1", "V", 1);
      const I = Math.abs(sch.sim.i("A1"));
      measure.textContent = `${T.measure}${fmt(I, "A")} = ${fmt(1 / I, "Ω")}`;
      if (mode === "sec") picked = bands.slice();
      cb.disabled = true;
      drawR(); showScore();
    }
    function showScore() { scoreEl.innerHTML = `${T.score} <b>${score}/${tries}</b> · ${T.streak} <b>${streak}</b>`; }

    // direnç çizimi
    let rs, bandBoxes = [];
    function drawR() {
      if (!rs || !rs.w) return;
      const { ctx, w, h: H } = rs;
      ctx.clearRect(0, 0, w, H);
      const Lb = Math.min(w * 0.74, H * 2.3, 640), Db = Lb * 0.27;
      const cx = w / 2, cy = H / 2 + 4;
      // bacaklar
      const lg = ctx.createLinearGradient(0, cy - 3, 0, cy + 3);
      lg.addColorStop(0, "#e8ebe4"); lg.addColorStop(1, "#8d928a");
      ctx.fillStyle = lg; ctx.fillRect(18, cy - Math.max(2, Db * 0.045), w - 36, Math.max(4, Db * 0.09));
      // gövde: iki uçta şişkin "kemik" biçimi
      const x0 = cx - Lb / 2, x1 = cx + Lb / 2, bulge = Lb * 0.17, r1 = Db / 2, r2 = Db * 0.39;
      ctx.beginPath();
      ctx.moveTo(x0 + bulge * 0.5, cy - r1);
      ctx.bezierCurveTo(x0 + bulge, cy - r1, x0 + bulge, cy - r2, x0 + bulge * 1.25, cy - r2);
      ctx.lineTo(x1 - bulge * 1.25, cy - r2);
      ctx.bezierCurveTo(x1 - bulge, cy - r2, x1 - bulge, cy - r1, x1 - bulge * 0.5, cy - r1);
      ctx.bezierCurveTo(x1 + 2, cy - r1, x1 + 2, cy + r1, x1 - bulge * 0.5, cy + r1);
      ctx.bezierCurveTo(x1 - bulge, cy + r1, x1 - bulge, cy + r2, x1 - bulge * 1.25, cy + r2);
      ctx.lineTo(x0 + bulge * 1.25, cy + r2);
      ctx.bezierCurveTo(x0 + bulge, cy + r2, x0 + bulge, cy + r1, x0 + bulge * 0.5, cy + r1);
      ctx.bezierCurveTo(x0 - 2, cy + r1, x0 - 2, cy - r1, x0 + bulge * 0.5, cy - r1);
      ctx.closePath();
      const bg = ctx.createLinearGradient(0, cy - r1, 0, cy + r1);
      bg.addColorStop(0, "#f1dfb6"); bg.addColorStop(0.35, "#d9bf8a"); bg.addColorStop(1, "#9c8053");
      ctx.fillStyle = bg; ctx.fill();
      ctx.save(); ctx.clip();
      const shown = mode === "oku" ? bands : picked;
      const bx = [x0 + bulge * 0.62, x0 + bulge * 1.55, x0 + bulge * 2.25, x1 - bulge * 0.62];
      const bw = Lb * 0.06;
      bandBoxes = [];
      bx.forEach((x, i) => {
        const d = i < 3 ? shown[i] : "g";
        const c = d === "g" ? GOLD : d == null ? null : BAND_HEX[d];
        if (c) {
          const g2 = ctx.createLinearGradient(0, cy - r1, 0, cy + r1);
          g2.addColorStop(0, L.mix(c, "#ffffff", 0.25)); g2.addColorStop(0.4, c); g2.addColorStop(1, L.mix(c, "#000000", 0.35));
          ctx.fillStyle = g2; ctx.fillRect(x - bw / 2, cy - r1 - 2, bw, 2 * r1 + 4);
        }
        if (i < 3) bandBoxes.push([x - bw, cy - r1 - 10, bw * 2, 2 * r1 + 20]);
      });
      // parlama
      const sh = ctx.createLinearGradient(0, cy - r1, 0, cy);
      sh.addColorStop(0, "rgba(255,255,255,0.35)"); sh.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sh; ctx.fillRect(x0, cy - r1, Lb, r1 * 0.7);
      ctx.restore();
      // seçme kipinde boş şerit çerçeveleri ve seçili şerit
      if (mode === "sec") {
        bx.slice(0, 3).forEach((x, i) => {
          ctx.setLineDash(picked[i] == null ? [4, 3] : []);
          ctx.strokeStyle = i === sel && !answered ? C.copper2 : rgba(C.silk, 0.55); ctx.lineWidth = i === sel && !answered ? 2.5 : 1.2;
          ctx.strokeRect(x - bw / 2 - 3, cy - r1 - 7, bw + 6, 2 * r1 + 14);
          ctx.setLineDash([]);
        });
      }
      // şerit adları
      ctx.fillStyle = C.muted; ctx.font = `600 ${clamp(w / 70, 10, 13)}px ${FONT.display}`; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ["1.", "2.", T.mult, T.tol].forEach((t, i) => ctx.fillText(t, bx[i], cy + r1 + 12));
    }
    rs = canvas(rcv, drawR);
    rcv.addEventListener("pointerdown", (e) => {
      if (mode !== "sec" || answered) return;
      const r = rcv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      bandBoxes.forEach(([bx0, by0, bw0, bh0], i) => { if (x >= bx0 && x <= bx0 + bw0 && y >= by0 && y <= by0 + bh0) { sel = i; drawR(); } });
    });
    round();
    return { enter() { sch.start(); drawR(); }, leave() { sch.stop(); }, sch };
  };
  G["renk-kodu"] = [{ click: "=" + T.modePick }, { wait: 600 }, { click: "aria:" + T.colorAria + " kahverengi" }, { click: "aria:" + T.colorAria + " siyah" }, { click: "aria:" + T.colorAria + " kırmızı" }, { wait: 400 }, { click: "=" + T.check }];
})();
