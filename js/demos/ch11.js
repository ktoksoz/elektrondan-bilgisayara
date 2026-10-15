/* 11. bölüm deneyleri: Karnaugh haritaları
   Doğruluk tablosundan mintermlere, Karnaugh haritası (2–4 değişken, Gray sırası, sarmalama, X),
   7 segment kod çözücü. Bütün ifadeler, gruplar ve denetimler Logic (logic.js) ile hesaplanır. */
window.STR = window.STR || {};

(function () {
  const { C, h, seg, btn, rgba, loop } = L;
  const S = STR.ch11;
  window.GUIDES = window.GUIDES || {};
  window.GUIDE_TARGETS = window.GUIDE_TARGETS || {};
  const G = window.GUIDES;

  // grup / minterm renkleri: sitenin kanal renkleri ve onların karışımları (mantık kırmızısı ve mavisi hariç)
  const hexMix = (a, b) => "#" + [1, 3, 5].map((i) => Math.round((parseInt(a.substr(i, 2), 16) + parseInt(b.substr(i, 2), 16)) / 2).toString(16).padStart(2, "0")).join("");
  const PAL = [C.ch2, C.ch3, C.ch4, C.ch1, C.copper2, hexMix(C.ch2, C.ch3), hexMix(C.ch2, C.ch4), C.silk];
  const VARS4 = ["A", "B", "C", "D"];
  const bitsOf = (m, n) => Logic.toBits(m, n).join("");
  const lits = (t, n) => Logic.literals(t, n);
  const costOf = (terms, n) => ({ t: terms.length, l: terms.reduce((s, t) => s + lits(t, n), 0) });
  const termSpan = (t, vars, col, tag = "span") => h(tag + ".c11-term", { style: { "--c": col } }, Logic.termToString(t, vars));
  const ns = (tag, attrs = {}) => { const e = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  // ifade metnini ayrıştırıp bütün girişlerde değerlendir (Logic.parse/evaluate)
  function evalExpr(expr, vars, m) {
    const ast = typeof expr === "string" ? Logic.parse(expr) : expr;
    const env = {};
    vars.forEach((v, k) => { env[v] = (m >> (vars.length - 1 - k)) & 1; });
    return Logic.evaluate(ast, env);
  }

  /* =====================================================================
     Karnaugh haritası bileşeni
     ===================================================================== */
  let kmUid = 0;
  function KMap(host, o = {}) {
    const uid = "c11km" + ++kmUid;
    const st = {
      n: o.n || 4, values: [], groups: [], pending: new Set(), mode: o.mode || "grp", order: "gray", lesson: false,
      focus: null, cur: null, s: 60, hl: -1, showMiss: true, lastWhy: null,
    };
    const el = h("div.c11-km");
    const grid = h("div.c11-grid");
    const colh = h("div.c11-colh"), rowh = h("div.c11-rowh"), corner = h("div.c11-corner"), bars = h("div.c11-bars");
    const svg = ns("svg", { class: "c11-gsvg", "aria-hidden": "true" });
    el.append(corner, colh, rowh, grid, bars);
    host.append(el);
    let cells = [];
    let drag = null;
    const emit = (why) => { st.lastWhy = why; o.onchange && o.onchange(why); };

    const dims = () => { const n = st.n, rb = n === 4 ? 2 : 1, cb = n - rb; return { n, rb, cb, R: 1 << rb, C: 1 << cb }; };
    const codes = (bits) => (bits === 1 ? [0, 1] : st.order === "gray" ? [0, 1, 3, 2] : [0, 1, 2, 3]);
    function geom() {
      const d = dims();
      return { ...d, rows: codes(d.rb), cols: codes(d.cb), vars: VARS4.slice(0, d.n) };
    }
    const mAt = (g, r, c) => (g.rows[r] << g.cb) | g.cols[c];
    const posOf = (g, m) => [g.rows.indexOf(m >> g.cb), g.cols.indexOf(m & ((1 << g.cb) - 1))];
    const LAB = 40;
    const padR = (g) => 10 + 17 * g.rb, padB = (g) => 10 + 17 * g.cb;

    function setN(n, values) {
      st.n = n;
      st.values = values ? values.slice() : new Array(1 << n).fill(0);
      st.groups = []; st.pending.clear(); st.focus = null;
      buildCells();
      layout();
      emit("n");
    }
    function buildCells() {
      grid.innerHTML = "";
      const N = 1 << st.n;
      cells = Array.from({ length: N }, (_, m) => {
        const b = h("button.c11-cell", { type: "button" }, h("span.c11-mi", String(m)), h("span.c11-v"), h("span.c11-nb"));
        b.dataset.m = m;
        b.addEventListener("click", (e) => {
          // fare/dokunma pointer olaylarıyla işlenir; burada yalnız klavye ve programatik tıklama
          if (e.detail !== 0) return;
          if (st.mode === "val" && o.editable !== false) cycle(m);
          else togglePending(m);
        });
        b.addEventListener("focus", () => { if (st.lesson) { st.focus = m; renderCells(); } });
        grid.append(b);
        return b;
      });
      grid.append(svg);
    }

    function layout() {
      const g = geom();
      const W = host.clientWidth, Hh = host.clientHeight;
      const narrow = window.matchMedia("(max-width: 860px)").matches;
      const availH = narrow || Hh < 140 ? Infinity : Hh - 8;
      let s = Math.min((W - 8 - LAB - padR(g)) / g.C, (availH - LAB - padB(g)) / g.R, o.maxCell || 92);
      s = Math.max(34, Math.floor(s));
      st.s = s;
      const gw = g.C * s, gh = g.R * s;
      Object.assign(el.style, { width: LAB + gw + padR(g) + "px", height: LAB + gh + padB(g) + "px", "--s": s + "px" });
      Object.assign(grid.style, { left: LAB + "px", top: LAB + "px", width: gw + "px", height: gh + "px" });
      el.style.setProperty("--s", s + "px");
      svg.setAttribute("viewBox", `0 0 ${g.C} ${g.R}`);
      svg.setAttribute("width", gw); svg.setAttribute("height", gh);
      for (let r = 0; r < g.R; r++) for (let c = 0; c < g.C; c++) {
        const b = cells[mAt(g, r, c)];
        b.style.width = b.style.height = s + "px";
        b.style.transform = `translate(${c * s}px, ${r * s}px)`;
      }
      renderHeaders(g);
      renderCells();
      renderGroups();
    }

    /* --- başlıklar: Gray kodları, köşe, değişken çubukları, komşuluk etiketleri --- */
    function renderHeaders(g) {
      const s = st.s;
      colh.innerHTML = ""; rowh.innerHTML = ""; bars.innerHTML = "";
      Object.assign(colh.style, { left: LAB + "px", top: "0px", width: g.C * s + "px", height: LAB + "px" });
      Object.assign(rowh.style, { left: "0px", top: LAB + "px", width: LAB + "px", height: g.R * s + "px" });
      const lab = (code, bits) => {
        const sp = h("span.c11-code");
        bitsOf(code, bits).split("").forEach((ch) => sp.append(h("i", ch)));
        return sp;
      };
      g.cols.forEach((code, c) => { const e = lab(code, g.cb); Object.assign(e.style, { left: (c + 0.5) * s + "px", top: LAB - 15 + "px" }); colh.append(e); });
      g.rows.forEach((code, r) => { const e = lab(code, g.rb); Object.assign(e.style, { left: LAB - 20 + "px", top: (r + 0.5) * s + "px" }); rowh.append(e); });
      // komşu kod çiftleri arasında değişen bitler (yalnız "Neden Gray?" açıkken)
      if (st.lesson) {
        const pairs = (arr, bits, isCol) => {
          const N = arr.length;
          if (N < 2) return;
          for (let i = 0; i < N; i++) {
            const a = arr[i], b = arr[(i + 1) % N];
            if (N === 2 && i === 1) break; // iki kodda sarmalanan çift aynı çift
            const diff = a ^ b, k = Logic.popcount(diff);
            const vs = (isCol ? g.vars.slice(g.rb) : g.vars.slice(0, g.rb)).filter((_, j) => diff & (1 << (bits - 1 - j))).join("");
            const wrap = i === N - 1;
            const mk = (pos) => {
              const e = h("span.c11-pair" + (k > 1 ? ".bad" : "") + (isCol ? "" : ".r"), { title: k > 1 ? S.pairTwo : S.pairOne }, (wrap ? "↺" : "") + vs);
              if (isCol) Object.assign(e.style, { left: pos * s + "px", top: LAB - 33 + "px" });
              else Object.assign(e.style, { left: "3px", top: pos * s + "px" });
              (isCol ? colh : rowh).append(e);
            };
            mk(wrap ? N : i + 1); // sarmalanan çift (son → ilk) haritanın dış kenarında
          }
        };
        pairs(g.cols, g.cb, true);
        pairs(g.rows, g.rb, false);
      }
      // köşe: satır ve sütun değişkenleri
      corner.innerHTML = "";
      Object.assign(corner.style, { width: LAB + "px", height: LAB + "px" });
      corner.append(h("span.c11-rv", g.vars.slice(0, g.rb).join("")), h("span.c11-cv", g.vars.slice(g.rb).join("")));
      // değişken çubukları: değişkenin 1 olduğu satır/sütunlar (serigrafi çizgileri)
      Object.assign(bars.style, { left: "0px", top: "0px", width: "100%", height: "100%" });
      const runsOf = (idx) => {
        const out = [];
        idx.forEach((i) => { const last = out[out.length - 1]; if (last && last[1] === i - 1) last[1] = i; else out.push([i, i]); });
        return out;
      };
      g.vars.slice(g.rb).forEach((v, j) => {
        const bit = 1 << (g.cb - 1 - j);
        const idx = g.cols.map((code, c) => (code & bit ? c : -1)).filter((c) => c >= 0);
        const y = LAB + g.R * s + 10 + 17 * j;
        runsOf(idx).forEach(([a, b], k) => {
          bars.append(h("i.c11-bar.h", { style: { left: LAB + a * s + 6 + "px", top: y + 6 + "px", width: (b - a + 1) * s - 12 + "px" } }));
          if (k === 0) bars.append(h("b.c11-barl", { style: { left: LAB + a * s - 9 + "px", top: y + "px" } }, v));
        });
      });
      g.vars.slice(0, g.rb).forEach((v, j) => {
        const bit = 1 << (g.rb - 1 - j);
        const idx = g.rows.map((code, r) => (code & bit ? r : -1)).filter((r) => r >= 0);
        const x = LAB + g.C * s + 10 + 17 * j;
        runsOf(idx).forEach(([a, b], k) => {
          bars.append(h("i.c11-bar.v", { style: { left: x + 6 + "px", top: LAB + a * s + 6 + "px", height: (b - a + 1) * s - 12 + "px" } }));
          if (k === 0) bars.append(h("b.c11-barl", { style: { left: x + 1 + "px", top: LAB + a * s - 14 + "px" } }, v));
        });
      });
    }

    /* --- hücreler --- */
    function coveredSet() { const s = new Set(); st.groups.forEach((gr) => gr.cells.forEach((m) => s.add(m))); return s; }
    function renderCells() {
      const g = geom();
      const cov = coveredSet();
      const showMiss = st.showMiss && st.groups.length > 0;
      // odak hücresinin görünür komşuları (sarmalamalı)
      const nb = new Map();
      if (st.lesson && st.focus != null && st.focus < cells.length) {
        const [r, c] = posOf(g, st.focus);
        const cand = [[r, c - 1], [r, c + 1], [r - 1, c], [r + 1, c]].map(([rr, cc]) => [(rr + g.R) % g.R, (cc + g.C) % g.C]);
        cand.forEach(([rr, cc]) => {
          const m2 = mAt(g, rr, cc);
          if (m2 === st.focus) return;
          const diff = m2 ^ st.focus;
          nb.set(m2, { vs: g.vars.filter((_, j) => diff & (1 << (g.n - 1 - j))).join(""), k: Logic.popcount(diff) });
        });
      }
      cells.forEach((b, m) => {
        const v = st.values[m];
        b.classList.toggle("v1", v === 1); b.classList.toggle("v0", v === 0); b.classList.toggle("vx", v === "x");
        b.querySelector(".c11-v").textContent = v === "x" ? "X" : String(v);
        b.classList.toggle("sel", st.pending.has(m));
        b.classList.toggle("miss", showMiss && v === 1 && !cov.has(m));
        b.classList.toggle("cur", st.cur === m);
        b.classList.toggle("focus", st.lesson && st.focus === m);
        const t = nb.get(m);
        const tag = b.querySelector(".c11-nb");
        tag.textContent = t ? t.vs : "";
        b.classList.toggle("nb", !!t); b.classList.toggle("nb2", !!t && t.k > 1);
        b.setAttribute("aria-label", S.cellAria(m, bitsOf(m, g.n), v === "x" ? "X" : v));
        b.setAttribute("aria-pressed", st.pending.has(m) ? "true" : "false");
      });
      grid.classList.toggle("grp", st.mode === "grp");
    }

    /* --- gruplar: yuvarlatılmış dikdörtgenler; sarmalayanlar kenardan taşar --- */
    function pieces(g, cellsArr) {
      const rs = [...new Set(cellsArr.map((m) => posOf(g, m)[0]))].sort((a, b) => a - b);
      const cs = [...new Set(cellsArr.map((m) => posOf(g, m)[1]))].sort((a, b) => a - b);
      const runs = (idx, N) => {
        const out = [];
        idx.forEach((i) => { const last = out[out.length - 1]; if (last && last.b === i - 1) last.b = i; else out.push({ a: i, b: i }); });
        if (st.order === "gray" && out.length === 2 && out[0].a === 0 && out[1].b === N - 1) { out[0].openA = true; out[1].openB = true; }
        return out;
      };
      const R = runs(rs, g.R), Cc = runs(cs, g.C);
      const out = [];
      R.forEach((rr) => Cc.forEach((cc) => out.push({ r: rr, c: cc })));
      return out;
    }
    function rectOf(p, inset) {
      const x0 = p.c.openA ? p.c.a - 0.8 : p.c.a + inset, x1 = p.c.openB ? p.c.b + 1.8 : p.c.b + 1 - inset;
      const y0 = p.r.openA ? p.r.a - 0.8 : p.r.a + inset, y1 = p.r.openB ? p.r.b + 1.8 : p.r.b + 1 - inset;
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    function renderGroups() {
      const g = geom();
      svg.innerHTML = "";
      const defs = ns("defs");
      const cp = ns("clipPath", { id: uid + "clip" });
      cp.append(ns("rect", { x: -0.14, y: -0.14, width: g.C + 0.28, height: g.R + 0.28 }));
      defs.append(cp); svg.append(defs);
      const root = ns("g", { "clip-path": `url(#${uid}clip)` });
      svg.append(root);
      st.groups.forEach((gr, k) => {
        const col = PAL[gr.ci % PAL.length];
        const inset = 0.07 + 0.06 * (k % 4);
        pieces(g, gr.cells).forEach((p) => {
          const q = rectOf(p, inset);
          root.append(ns("rect", {
            x: q.x, y: q.y, width: q.w, height: q.h, rx: 0.3, ry: 0.3,
            fill: rgba(col, st.hl === k ? 0.22 : 0.11), stroke: col, "stroke-width": st.hl === k ? 4.5 : 2.6,
            "vector-effect": "non-scaling-stroke", class: "c11-grp",
          }));
        });
      });
      // bekleyen seçim geçerliyse önizleme
      if (st.pending.size) {
        const res = Logic.checkGroup(g.n, [...st.pending], st.values);
        if (res.ok) pieces(g, [...st.pending]).forEach((p) => {
          const q = rectOf(p, 0.04);
          root.append(ns("rect", { x: q.x, y: q.y, width: q.w, height: q.h, rx: 0.3, ry: 0.3, fill: rgba(C.silk, 0.06), stroke: C.silk, "stroke-width": 2, "stroke-dasharray": "6 5", "vector-effect": "non-scaling-stroke" }));
        });
      }
    }

    /* --- etkileşim --- */
    function cycle(m) {
      const v = st.values[m];
      st.values[m] = v === 0 ? 1 : v === 1 ? (o.allowX === false ? 0 : "x") : 0;
      const before = st.groups.length;
      st.groups = st.groups.filter((gr) => Logic.checkGroup(st.n, gr.cells, st.values).ok);
      st.dropped = before - st.groups.length;
      st.solved = false;
      renderCells(); renderGroups();
      emit("value");
    }
    function togglePending(m) {
      if (st.pending.has(m)) st.pending.delete(m); else st.pending.add(m);
      renderCells(); renderGroups();
      emit("pending");
    }
    function cellAt(x, y, clamp) {
      const r = grid.getBoundingClientRect(), g = geom();
      let c = Math.floor((x - r.left) / st.s), rr = Math.floor((y - r.top) / st.s);
      if (!clamp && (c < 0 || rr < 0 || c >= g.C || rr >= g.R)) return null;
      c = Math.max(0, Math.min(g.C - 1, c)); rr = Math.max(0, Math.min(g.R - 1, rr));
      return { r: rr, c, m: mAt(g, rr, c) };
    }
    function rectCells(a, b) {
      const g = geom(), out = [];
      for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++) for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) out.push(mAt(g, r, c));
      return out;
    }
    grid.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      const at = cellAt(e.clientX, e.clientY, false);
      if (!at) return;
      e.preventDefault();
      if (st.lesson) st.focus = at.m;
      if (st.mode === "val" && o.editable !== false) { cycle(at.m); return; }
      drag = { a: at, b: at, moved: false, prev: new Set(st.pending) };
      try { grid.setPointerCapture(e.pointerId); } catch (err) {}
    });
    grid.addEventListener("pointermove", (e) => {
      if (!drag) {
        if (st.lesson && e.pointerType === "mouse") {
          const at = cellAt(e.clientX, e.clientY, false);
          const f = at ? at.m : null;
          if (f !== st.focus && f != null) { st.focus = f; renderCells(); }
        }
        return;
      }
      const at = cellAt(e.clientX, e.clientY, true);
      if (at.m === drag.b.m && drag.moved) return;
      if (at.m !== drag.a.m) drag.moved = true;
      if (!drag.moved) return;
      drag.b = at;
      st.pending = new Set(rectCells(drag.a, drag.b));
      renderCells(); renderGroups();
      emit("pending");
    });
    const endDrag = (e) => {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved) { togglePending(d.a.m); return; }
      // sürükleyerek seçilen geçerli dikdörtgen hemen grup olur
      const res = Logic.checkGroup(st.n, [...st.pending], st.values);
      if (res.ok) addPending(); else emit("pending");
    };
    grid.addEventListener("pointerup", endDrag);
    grid.addEventListener("pointercancel", () => { drag = null; });
    grid.addEventListener("pointerleave", () => { if (st.lesson && !drag) { st.focus = null; renderCells(); } });

    function freeColor() {
      const used = new Set(st.groups.map((g) => g.ci));
      for (let i = 0; i < 64; i++) if (!used.has(i)) return i;
      return st.groups.length;
    }
    function addPending() {
      const res = Logic.checkGroup(st.n, [...st.pending], st.values);
      if (!res.ok) { emit("pending"); return res; }
      const key = res.term.value + ":" + res.term.mask;
      if (st.groups.some((g) => g.term.value + ":" + g.term.mask === key)) { st.pending.clear(); renderCells(); renderGroups(); emit("dup"); return res; }
      st.groups.push({ cells: Logic.termCells(st.n, res.term), term: res.term, ci: freeColor(), src: "user" });
      st.solved = false;
      st.lastAdded = res.term;
      st.pending.clear();
      renderCells(); renderGroups();
      emit("added");
      return res;
    }
    function setTerms(terms, src) {
      st.groups = terms.map((t, i) => ({ cells: Logic.termCells(st.n, t), term: t, ci: i, src }));
      st.pending.clear();
      st.solved = src === "solve";
      renderCells(); renderGroups();
      emit(src || "terms");
    }

    // durum özeti: geçerlilik, örtme, en basit ifade, doğruluk tablosu denetimi
    function info() {
      const n = st.n, vars = VARS4.slice(0, n), N = 1 << n;
      const ones = [], dcs = [];
      st.values.forEach((v, m) => { if (v === 1) ones.push(m); else if (v === "x") dcs.push(m); });
      const terms = st.groups.map((g) => g.term);
      const cov = coveredSet();
      const missing = ones.filter((m) => !cov.has(m));
      const minimal = Logic.minimize(n, ones, dcs);
      const expr = Logic.sopString(terms, vars);
      const ast = Logic.parse(expr);
      let match = 0, defined = 0;
      for (let m = 0; m < N; m++) { if (st.values[m] === "x") continue; defined++; if (evalExpr(ast, vars, m) === st.values[m]) match++; }
      const pis = ones.length ? Logic.primeImplicants(n, ones, dcs) : [];
      const tags = st.groups.map((g, k) => {
        const others = new Set(); st.groups.forEach((g2, k2) => { if (k2 !== k) g2.cells.forEach((m) => others.add(m)); });
        const red = g.cells.filter((m) => st.values[m] === 1).every((m) => others.has(m));
        const grow = pis.some((p) => p.mask !== g.term.mask && (p.mask & g.term.mask) === g.term.mask && Logic.covers(p, g.term.value));
        return { red, grow };
      });
      const pend = st.pending.size ? Logic.checkGroup(n, [...st.pending], st.values) : null;
      return { n, vars, ones, dcs, terms, missing, minimal, expr, match, defined, xs: dcs.length, tags, pend, mine: costOf(terms, n), best: costOf(minimal, n) };
    }

    const api = {
      el, grid, st, setN, layout, info, addPending, setTerms,
      get values() { return st.values; },
      get groups() { return st.groups; },
      setValues(v) { st.values = v.slice(); st.groups = []; st.pending.clear(); st.solved = false; renderCells(); renderGroups(); emit("values"); },
      setMode(m) { st.mode = m; st.pending.clear(); renderCells(); renderGroups(); emit("mode"); },
      setOrder(ord) {
        st.order = ord;
        // hücreler yalnız sıra değişiminde kayarak yer değiştirir
        svg.classList.add("fade"); grid.classList.add("reorder");
        layout();
        setTimeout(() => { svg.classList.remove("fade"); grid.classList.remove("reorder"); }, 480);
        emit("order");
      },
      setLesson(b) { st.lesson = b; if (!b) st.focus = null; el.classList.toggle("lesson", b); layout(); },
      clearPending() { st.pending.clear(); renderCells(); renderGroups(); emit("pending"); },
      clearGroups() { st.groups = []; st.pending.clear(); st.solved = false; renderCells(); renderGroups(); emit("clear"); },
      removeGroup(k) { st.groups.splice(k, 1); st.solved = false; st.hl = -1; renderCells(); renderGroups(); emit("remove"); },
      highlight(k) { st.hl = k; renderGroups(); },
      setCurrent(m) { st.cur = m; renderCells(); },
      colorOf: (k) => PAL[st.groups[k].ci % PAL.length],
    };
    new ResizeObserver(() => layout()).observe(host);
    setN(st.n, o.values);
    return api;
  }

  // haritanın grup listesi: renkli terimler (tıklayınca grup silinir), ipucu etiketleri
  function exprLine(box, km, inf, lhs, opts = {}) {
    box.innerHTML = "";
    box.append(h("span.c11-lhs", lhs + " = "));
    if (!km.groups.length) { box.append(h("span.c11-none", inf.ones.length ? S.noGroups : "0")); return; }
    km.groups.forEach((g, k) => {
      if (k) box.append(h("span.c11-plus", " + "));
      const t = termSpan(g.term, inf.vars, km.colorOf(k), opts.static ? "span" : "button");
      if (!opts.static) {
        t.type = "button";
        t.setAttribute("aria-label", S.removeAria(Logic.termToString(g.term, inf.vars)));
        t.append(h("small.c11-x", "×"));
        t.addEventListener("click", () => km.removeGroup(k));
        t.addEventListener("mouseenter", () => km.highlight(k));
        t.addEventListener("mouseleave", () => km.highlight(-1));
        t.addEventListener("focus", () => km.highlight(k));
        t.addEventListener("blur", () => km.highlight(-1));
      }
      const tg = inf.tags[k];
      if (tg && !opts.static && !km.st.solved) {
        if (tg.red) t.append(h("em.c11-tag", { title: S.tagRedT }, S.tagRed));
        else if (tg.grow) t.append(h("em.c11-tag", { title: S.tagGrowT }, S.tagGrow));
      }
      box.append(t);
    });
  }
  function pendingMsg(km, inf) {
    const p = inf.pend;
    if (!p) return null;
    if (p.ok) return { ok: true, text: S.okGroup(km.st.pending.size, Logic.termToString(p.term, inf.vars), lits(p.term, inf.n)) };
    // ikili sırada "dikdörtgen değil" nedeni yanıltıcı olur: yan yana görünen hücreler
    if (km.st.order === "bin" && /dikdörtgen/.test(p.why)) return { ok: false, text: S.binNote };
    return { ok: false, text: p.why };
  }
  function verdict(inf) {
    if (!inf.ones.length) return { ok: true, text: S.noOnes };
    if (!inf.terms.length) return { ok: null, text: S.coverAll };
    if (inf.missing.length) return { ok: false, text: S.missing(inf.missing.length) };
    if (inf.mine.t === inf.best.t && inf.mine.l === inf.best.l) return { ok: true, text: S.best(inf.best.t, inf.best.l) };
    return { ok: null, text: S.better(inf.best.t, inf.best.l) };
  }
  const msgEl = (p, m) => { p.textContent = m ? m.text : ""; p.className = "c11-msg" + (m ? (m.ok === true ? " ok" : m.ok === false ? " bad" : "") : ""); };

  /* =====================================================================
     1) Doğruluk tablosundan ifadeye: mintermler ve kanonik SOP devresi
     ===================================================================== */
  Demos.c11Minterm = function (stage) {
    const vars = ["A", "B", "C"];
    let Y = [0, 0, 0, 1, 0, 1, 1, 1]; // çoğunluk
    const rows = [];
    const tbody = h("tbody");
    for (let m = 0; m < 8; m++) {
      const bits = Logic.toBits(m, 3);
      const yb = h("button.c11-yb", { type: "button", "aria-label": S.yAria(m) });
      yb.addEventListener("click", () => { Y[m] = Y[m] ? 0 : 1; rebuild(); });
      const term = h("span.c11-term", { style: { "--c": PAL[m] } }, Logic.termToString({ value: m, mask: 0 }, vars));
      const tds = bits.map((b) => h("td.bit", { class: b ? "b1" : "b0" }, String(b)));
      const tr = h("tr", ...tds, h("td.yc", yb), h("td.tc", term));
      tds.forEach((td) => { td.setAttribute("role", "button"); td.setAttribute("aria-label", S.rowAria(bits.join(""))); td.tabIndex = -1; td.addEventListener("click", () => setInputs(m)); });
      tbody.append(tr);
      rows.push({ tr, yb, term });
    }
    const tbl = h("table.truth.c11-tt", h("thead", h("tr", h("th", "A"), h("th", "B"), h("th", "C"), h("th", "Y"), h("th", S.colTerm))), tbody);
    const ttPanel = h("div.c11-ttp", h("span.c11-ptitle", S.ttTitle), tbl, h("p.c11-hint", S.ttHint));
    const schPane = h("div.pane.c11-schp", h("span.pane-title", S.circuitTitle));
    const sop = h("div.c11-sop");
    const mG = h("div.meter", h("small", S.mGates), h("b", "—"));
    const mI = h("div.meter", h("small", S.mInputs), h("b", "—"));
    const gatesNote = h("p.c11-gnote");
    const rowChip = h("p.c11-msg");
    const allChip = h("p.c11-msg");
    const tease = h("a.c11-tease", { href: "#karnaugh" });
    ttPanel.append(h("div.c11-minfo", h("div.meters", mG, mI), gatesNote));
    stage.append(h("div.split.c11-mt", ttPanel, h("div.c11-mright", schPane, sop, h("div.c11-minfo", rowChip, allChip, tease))));
    const P = (k, ones) => btn(k, () => { Y = [0, 1, 2, 3, 4, 5, 6, 7].map((m) => (ones.includes(m) ? 1 : 0)); rebuild(); });
    stage.append(h("div.controls", h("span.c11-clab", S.presets), P(S.majority, [3, 5, 6, 7]), P(S.xor3, [1, 2, 4, 7]), P(S.only7, [7]), P(S.allZero, [])));

    // devre: tabandaki girişlere her minterm için bir VE kapısı, en sona VEYA
    function sopDef(ms) {
      const def = JSON.parse(JSON.stringify(CIRCUITS.c11Minterm));
      const g = def.geo, M = ms.length;
      const yOf = (j) => g.y0 + g.pitch * j;
      const yc = M ? yOf(0) + (g.pitch * (M - 1)) / 2 : 0;
      const wires = [], last = {};
      ms.forEach((m, j) => {
        const y = yOf(j);
        def.parts.push({ id: "G" + j, type: "and", n: 3, at: [g.andX, y] });
        def.parts.push({ id: "TG" + j, type: "text", at: [g.andX - 0.25, y], text: Logic.termToString({ value: m, mask: 0 }, vars), size: 0.74, color: PAL[m], weight: 700 });
        for (let k = 0; k < 3; k++) {
          const bit = (m >> (2 - k)) & 1, x = g.rail[k][bit ? 0 : 1], yy = y - 1 + k;
          wires.push([[x, yy], [g.andX - 3, yy]]);
          last[k + "_" + bit] = Math.max(last[k + "_" + bit] ?? -1, yy);
        }
      });
      let nots = 0;
      for (let k = 0; k < 3; k++) {
        const [xT, xF] = g.rail[k], inX = 5 * k + 1;
        const useT = last[k + "_1"] != null, useF = last[k + "_0"] != null;
        if (useF) {
          nots++;
          wires.push([[inX, 0], [xF, 0], [xF, g.notIn]]);
          wires.push([[xF, g.notOut], [xF, last[k + "_0"]]]);
          def.parts.push({ id: "TN" + k, type: "text", at: [xF + 0.95, g.notOut + 0.55], text: vars[k] + "'", size: 0.62, color: C.muted, weight: 600 });
          if (useT) wires.push([[xT, 0], [xT, last[k + "_1"]]]);
        } else {
          def.parts = def.parts.filter((p) => p.id !== "N" + vars[k]);
          if (useT) wires.push([[inX, 0], [xT, 0], [xT, last[k + "_1"]]]);
        }
      }
      const out = def.parts.find((p) => p.id === "Y"), outT = def.parts.find((p) => p.id === "TY");
      if (M >= 2) {
        def.parts.push({ id: "OR", type: "or", n: M, at: [g.orX, yc] });
        ms.forEach((m, j) => {
          // VEYA giriş pimleri: 2 girişte ±1, daha fazlasında birer birim arayla (schematic gateGeom)
          const y = yOf(j), py = yc + (M === 2 ? 2 * j - 1 : -(M - 1) / 2 + j), d = Math.abs(j - (M - 1) / 2);
          if (Math.abs(py - y) < 1e-9) wires.push([[g.andX + 3, y], [g.orX - 3, py]]);
          else { const xv = g.fanX + d; wires.push([[g.andX + 3, y], [xv, y], [xv, py], [g.orX - 3, py]]); }
        });
        wires.push([[g.orX + 3, yc], [g.outX - 1, yc]]);
      } else if (M === 1) {
        wires.push([[g.andX + 3, yc], [g.outX - 1, yc]]);
      } else {
        // hiç 1 yok: çıkış sabit 0'a bağlı; girişler hiçbir şeye bağlı değil (bilerek)
        def.parts.push({ id: "K0", type: "input", at: [g.outX - 5, 0], value: 0, locked: true });
        def.parts.push({ id: "TK", type: "text", at: [g.outX - 5.7, -1.45], text: "0", size: 0.8, color: C.muted, weight: 700 });
        wires.push([[g.outX - 4, 0], [g.outX - 1, 0]]);
        def.allowFloating = true;
      }
      out.at = [g.outX, yc]; outT.at = [g.textX ?? g.outX + 2.2, yc];
      def.wires = wires;
      return { def, nots, ands: M, or: M >= 2 ? 1 : 0 };
    }

    const first = sopDef([3, 5, 6, 7]);
    const sch = Schematic(schPane, first.def, { maxUnit: 22 });
    let busy = false;
    const inVal = () => ["A", "B", "C"].map((id) => (sch.part(id).value ? 1 : 0));
    function setInputs(m) {
      busy = true;
      Logic.toBits(m, 3).forEach((b, k) => { if ((sch.part(vars[k]).value ? 1 : 0) !== b) sch.set(vars[k], "value", b); });
      busy = false;
      update();
    }
    let counts = first;
    let allOk = 8;
    function rebuild() {
      const keep = inVal();
      const ms = Y.map((y, m) => (y ? m : -1)).filter((m) => m >= 0);
      const r = sopDef(ms);
      counts = r;
      busy = true;
      r.def.parts.forEach((p) => { const k = vars.indexOf(p.id); if (k >= 0) p.value = keep[k]; });
      sch.rebuild(r.def);
      sch.layout(); // yeni tıklama düğmeleri yerleşsin (rebuild önce yerleşimi, sonra düğmeleri kuruyor)
      busy = false;
      allOk = verifyAll();
      update();
    }
    // devrenin 8 girişin hepsinde tabloyla aynı olduğunu ağ üzerinde ölç
    function verifyAll() {
      const net = sch.net, keep = inVal();
      const nA = vars.map((v) => sch.netOf(v, "o")), nY = sch.netOf("Y", "i");
      let ok = 0;
      for (let m = 0; m < 8; m++) {
        Logic.toBits(m, 3).forEach((b, k) => net.set(nA[k], b));
        net.run(net.time + 60);
        if (net.value(nY) === Y[m]) ok++;
      }
      keep.forEach((b, k) => net.set(nA[k], b));
      net.run(net.time + 60);
      sch.draw();
      return ok;
    }
    function update() {
      if (busy) return;
      const cur = Logic.fromBits(inVal());
      const yv = sch.v(sch.netOf("Y", "i"));
      const ms = Y.map((y, m) => (y ? m : -1)).filter((m) => m >= 0);
      rows.forEach((r, m) => {
        r.tr.classList.toggle("cur", m === cur);
        r.tr.classList.toggle("on", !!Y[m]);
        r.yb.textContent = String(Y[m]);
        r.yb.className = "c11-yb " + (Y[m] ? "b1" : "b0");
      });
      sop.innerHTML = "";
      sop.append(h("span.c11-lhs", "Y = "));
      if (!ms.length) sop.append(h("span.c11-none", "0"));
      ms.forEach((m, j) => {
        if (j) sop.append(h("span.c11-plus", " + "));
        sop.append(h("span.c11-term" + (m === cur ? ".hot" : ""), { style: { "--c": PAL[m] } }, Logic.termToString({ value: m, mask: 0 }, vars)));
      });
      const ng = counts.nots + counts.ands + counts.or;
      mG.querySelector("b").textContent = String(ng);
      mI.querySelector("b").textContent = String(counts.nots + 3 * counts.ands + (counts.or ? counts.ands : 0));
      gatesNote.textContent = S.gatesOf(counts.nots, counts.ands, counts.or);
      const ok = yv === Y[cur];
      msgEl(rowChip, { ok, text: S.rowNow(bitsOf(cur, 3), yv, Y[cur]) + (ok ? " ✓" : " ✗") });
      msgEl(allChip, { ok: allOk === 8, text: S.allRows(allOk) + (allOk === 8 ? " ✓" : "") });
      // en basit hâl: Quine–McCluskey (sonraki slaytın konusu)
      const min = Logic.minimize(3, ms);
      const negs = new Set();
      min.forEach((t) => Logic.termLiterals(t, vars).forEach((l) => l.neg && negs.add(l.v)));
      const mg = negs.size + min.filter((t) => lits(t, 3) >= 2).length + (min.length >= 2 ? 1 : 0);
      if (!ms.length) tease.textContent = S.zero;
      else if (mg < ng) tease.textContent = S.shorter(mg, Logic.sopString(min, vars));
      else tease.textContent = S.shortest;
      tease.classList.toggle("dim", mg >= ng);
    }
    sch.on("change", update);
    allOk = verifyAll();
    update();
    return { enter() { sch.start(); }, leave() { sch.stop(); }, sch };
  };
  G["minterm"] = [{ click: "aria:" + S.yAria(0) }, { wait: 700 }, { click: "aria:A girişi" }, { wait: 500 }, { click: "aria:B girişi" }];

  /* =====================================================================
     2) Karnaugh haritası (ana deney)
     ===================================================================== */
  const PRESET = {
    2: { ones: [1, 2, 3], dcs: [] },          // A + B
    3: { ones: [0, 2, 4, 5, 6], dcs: [] },    // C' + AB'  (sarmalayan sütunlar)
    4: { ones: [0, 2, 5, 7, 8, 10, 13], dcs: [15] }, // B'D' + BD (köşeler + X)
  };
  const presetValues = (n) => { const p = PRESET[n]; return Array.from({ length: 1 << n }, (_, m) => (p.dcs.includes(m) ? "x" : p.ones.includes(m) ? 1 : 0)); };

  Demos.c11Kmap = function (stage) {
    let n = 4, km = null;
    const mapPane = h("div.c11-mappane");
    const msg = h("p.c11-msg");
    const lesson = h("p.c11-lesson");
    const expr = h("div.c11-expr");
    const stats = h("p.c11-stats");
    const verd = h("p.c11-msg");
    const tt = h("p.c11-tt2");
    const solved = h("p.c11-solved");
    const side = h("div.c11-side",
      h("span.c11-ptitle", S.yours), expr, stats, verd, tt, solved, msg, lesson);
    const nSeg = seg([[2, S.n2], [3, S.n3], [4, S.n4]], n, (k) => { n = k; km.setN(n, presetValues(n)); }, "Değişken sayısı");
    const modeSeg = seg([["val", S.modeVal], ["grp", S.modeGrp]], "grp", (k) => km.setMode(k), "Mod");
    const orderSeg = seg([["gray", S.orderGray], ["bin", S.orderBin]], "gray", (k) => km.setOrder(k), "Sıra");
    orderSeg.classList.add("c11-order");
    const whyB = btn(S.why, () => {
      const on = !km.st.lesson;
      km.setLesson(on);
      whyB.classList.toggle("on", on);
      orderSeg.style.display = on ? "" : "none";
      if (!on && km.st.order !== "gray") { km.setOrder("gray"); orderSeg.set("gray"); }
      update();
    });
    orderSeg.style.display = "none";
    const randB = btn(S.random, () => {
      const N = 1 << n;
      let v;
      do v = Array.from({ length: N }, () => { const r = Math.random(); return r < 0.42 ? 1 : r < (n >= 3 ? 0.53 : 0.42) ? "x" : 0; });
      while (v.filter((x) => x === 1).length < 2);
      km.setValues(v);
    });
    stage.append(h("div.controls.top.c11-top", nSeg, modeSeg, randB, whyB, orderSeg));
    stage.append(h("div.split.c11-kgrid", mapPane, side));
    const addB = btn(S.add, () => km.addPending());
    const clrS = btn(S.clearSel, () => km.clearPending());
    const clrG = btn(S.clearGroups, () => km.clearGroups());
    const solveB = btn(S.solve, () => { const inf = km.info(); km.setTerms(inf.minimal, "solve"); }, "primary");
    stage.append(h("div.controls", addB, clrS, clrG, h("span.spacer"), solveB));

    km = KMap(mapPane, { n, values: presetValues(n), mode: "grp", onchange: () => update() });
    function update() {
      if (!km) return;
      const inf = km.info();
      exprLine(expr, km, inf, "F");
      stats.textContent = km.groups.length ? S.stats(inf.mine.t, inf.mine.l) : "";
      msgEl(verd, verdict(inf));
      tt.textContent = km.groups.length || !inf.ones.length ? S.ttCheck(inf.match, inf.defined, inf.xs) : "";
      solved.textContent = km.st.solved ? S.solved : "";
      let m = pendingMsg(km, inf);
      const why = km.st.lastWhy;
      if (!m && why === "added" && km.st.lastAdded) m = { ok: true, text: S.okAdded(Logic.termToString(km.st.lastAdded, inf.vars)) };
      if (!m && why === "dup") m = { ok: false, text: S.dupGroup };
      if (!m && why === "value" && km.st.dropped) m = { ok: false, text: S.dropped(km.st.dropped) };
      if (!m) m = { ok: null, text: km.st.mode === "val" ? S.hintVal : S.hintGrp };
      msgEl(msg, m);
      lesson.textContent = km.st.lesson ? (km.st.order === "bin" ? S.lessonBin : S.lesson) : "";
      lesson.style.display = km.st.lesson ? "" : "none";
      addB.disabled = !(inf.pend && inf.pend.ok);
      clrS.disabled = !km.st.pending.size;
      clrG.disabled = !km.groups.length;
      if (nSeg && km.st.n !== n) nSeg.set(km.st.n);
      modeSeg.set(km.st.mode);
    }
    update();
    return { enter() { km.layout(); }, leave() {}, km };
  };
  // 4 değişkenli haritanın ortasındaki 2×2 grubu sürükle, sonra Çöz
  G["karnaugh"] = [
    { draw: "css:.c11-grid", path: [[0.375, 0.375], [0.5, 0.5], [0.625, 0.625]] },
    { wait: 900 },
    { click: "aria:" + S.cellAria(0, "0000", 1) },
    { click: "aria:" + S.cellAria(2, "0010", 1) },
    { click: "=" + S.add },
    { wait: 700 },
    { click: "=" + S.solve },
  ];

  /* =====================================================================
     3) Uygulama: 7 segment kod çözücü
     ===================================================================== */
  const SEGS = "abcdefg";
  // segment çokgenleri (100 × 170 kutusunda; uçları sivri altıgenler)
  function segPolys() {
    const t = 13, gp = 2.6, L0 = 14, R0 = 86, T0 = 12, M0 = 86, B0 = 160;
    const hz = (x1, x2, y) => [[x1, y], [x1 + t / 2, y - t / 2], [x2 - t / 2, y - t / 2], [x2, y], [x2 - t / 2, y + t / 2], [x1 + t / 2, y + t / 2]];
    const vt = (x, y1, y2) => [[x, y1], [x + t / 2, y1 + t / 2], [x + t / 2, y2 - t / 2], [x, y2], [x - t / 2, y2 - t / 2], [x - t / 2, y1 + t / 2]];
    return {
      a: hz(L0 + gp, R0 - gp, T0), b: vt(R0, T0 + gp, M0 - gp), c: vt(R0, M0 + gp, B0 - gp), d: hz(L0 + gp, R0 - gp, B0),
      e: vt(L0, M0 + gp, B0 - gp), f: vt(L0, T0 + gp, M0 - gp), g: hz(L0 + gp, R0 - gp, M0),
    };
  }
  const SEG_LABEL = { a: [50, -4], b: [101, 46], c: [101, 124], d: [50, 180], e: [-1, 124], f: [-1, 46], g: [50, 64] };

  Demos.c11Seg = function (stage) {
    let v = 5, sel = "a", useX = true, km = null;
    // her segment için: 0–9 tablosu (SEG7), 10–15 önemsiz
    const onesOf = (s) => { const k = SEGS.indexOf(s); return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => Logic.SEG7[d][k] === "1"); };
    const DCS = [10, 11, 12, 13, 14, 15];
    const MIN = {};
    SEGS.split("").forEach((s) => { MIN[s] = { x: Logic.minimize(4, onesOf(s), DCS), z: Logic.minimize(4, onesOf(s), []) }; });
    const mapValues = (s) => Array.from({ length: 16 }, (_, m) => (m >= 10 ? (useX ? "x" : 0) : onesOf(s).includes(m) ? 1 : 0));

    // --- ekran ---
    const P = segPolys();
    const disp = ns("svg", { viewBox: "-22 -24 144 222", class: "c11-7seg", role: "img", "aria-label": "7 segment gösterge" });
    const defs = ns("defs");
    const flt = ns("filter", { id: "c11glow", x: "-50%", y: "-50%", width: "200%", height: "200%" });
    flt.append(ns("feGaussianBlur", { stdDeviation: "4", result: "b" }));
    const mg = ns("feMerge"); mg.append(ns("feMergeNode", { in: "b" }), ns("feMergeNode", { in: "SourceGraphic" }));
    flt.append(mg); defs.append(flt); disp.append(defs);
    const body = ns("g", { transform: "skewX(-7) translate(10 0)" });
    disp.append(body);
    const segEl = {};
    SEGS.split("").forEach((s) => {
      const poly = ns("polygon", { points: P[s].map((p) => p.join(",")).join(" "), class: "c11-sg" });
      const hit = ns("polygon", { points: P[s].map((p) => p.join(",")).join(" "), class: "c11-sghit", tabindex: "0", role: "button", "aria-label": S.segAria(s) });
      hit.addEventListener("click", () => pick(s));
      hit.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(s); } });
      const lab = ns("text", { x: SEG_LABEL[s][0], y: SEG_LABEL[s][1], class: "c11-sgl" }); lab.textContent = s;
      body.append(poly, lab, hit);
      segEl[s] = { poly, lab };
    });
    const dispWrap = h("div.c11-dispw", disp);

    // --- giriş bitleri ---
    const bitBtns = VARS4.map((name, k) => {
      const b = h("button.c11-bit", { type: "button", "aria-label": S.bitAria(name) }, h("b"), h("small", name + " · " + (8 >> k)));
      b.addEventListener("click", () => { v ^= 8 >> k; refresh(); });
      return b;
    });
    const plus = btn(S.plus1, () => { v = (v + 1) % 16; refresh(); });
    let auto = false, acc = 0;
    const countB = btn(S.count, () => { auto = !auto; countB.textContent = auto ? S.stop : S.count; countB.classList.toggle("on", auto); });
    const inRead = h("p.c11-inread");
    const funny = h("p.c11-msg");
    const chk = h("p.c11-msg");
    const list = h("div.c11-elist");
    const total = h("p.c11-hint");
    const left = h("div.c11-left", dispWrap, h("div.c11-bits", ...bitBtns, plus, countB), inRead, funny,
      h("div.c11-elw", h("span.c11-ptitle", S.exprTitle), list, chk, total));

    // --- harita ---
    const mapTitle = h("span.c11-ptitle");
    const mapPane = h("div.c11-mappane.c11-segmap");
    const expr = h("div.c11-expr");
    const verd = h("p.c11-msg");
    const cmpX = h("p.c11-cmp"), cmpZ = h("p.c11-cmp");
    const addB = btn(S.add, () => km.addPending());
    const clrG = btn(S.clearGroups, () => km.clearGroups());
    const solveB = btn(S.solve, () => { km.setTerms(MIN[sel][useX ? "x" : "z"], "solve"); }, "primary");
    const right = h("div.c11-right", mapTitle, mapPane, expr, verd, h("div.c11-cmpw", cmpX, cmpZ));
    const segSeg = seg(SEGS.split("").map((s) => [s, s]), sel, (s) => pick(s), S.segPick);
    const xSeg = seg([["x", S.xFree], ["z", S.xZero]], "x", (k) => { useX = k === "x"; km.setValues(mapValues(sel)); refresh(); }, S.useX);
    stage.append(h("div.controls.top.c11-top", h("span.c11-lg", h("span.c11-clab", S.segPick), segSeg), h("span.c11-lg", h("span.c11-clab", S.useX), xSeg)));
    stage.append(h("div.split.c11-sgrid", left, right));
    stage.append(h("div.controls", addB, clrG, h("span.spacer"), solveB));

    km = KMap(mapPane, { n: 4, values: mapValues(sel), mode: "grp", editable: false, maxCell: 74, onchange: () => refresh() });

    function pick(s) { sel = s; segSeg.set(s); km.setValues(mapValues(s)); refresh(); }
    // ekranı süren ifade: seçili segmentte ziyaretçinin grupları bütün 1'leri örtüyorsa onlar, değilse en basit ifade
    function exprsNow() {
      const out = {};
      const inf = km.info();
      SEGS.split("").forEach((s) => {
        let terms = MIN[s][useX ? "x" : "z"], src = "min";
        if (s === sel && km.groups.length && !inf.missing.length && !km.st.solved) { terms = inf.terms; src = "mine"; }
        const str = Logic.sopString(terms, VARS4);
        out[s] = { terms, src, str, ast: Logic.parse(str) };
      });
      return out;
    }
    function refresh() {
      if (!km) return;
      const E = exprsNow();
      // ekran: yedi ifade Logic.evaluate ile bu girişte hesaplanır
      SEGS.split("").forEach((s) => {
        const on = evalExpr(E[s].ast, VARS4, v) === 1;
        segEl[s].poly.classList.toggle("on", on);
        segEl[s].poly.classList.toggle("sel", s === sel);
        segEl[s].lab.classList.toggle("sel", s === sel);
      });
      const bits = Logic.toBits(v, 4);
      bitBtns.forEach((b, k) => { b.querySelector("b").textContent = bits[k]; b.classList.toggle("b1", !!bits[k]); });
      inRead.textContent = S.inputIs(bits.join(""), v);
      if (v >= 10) msgEl(funny, { ok: false, text: useX ? S.funnyX : S.funnyZero }); else msgEl(funny, { ok: null, text: S.digitOk });
      let ok = 0;
      for (let d = 0; d < 10; d++) SEGS.split("").forEach((s, k) => { if (String(evalExpr(E[s].ast, VARS4, d)) === Logic.SEG7[d][k]) ok++; });
      msgEl(chk, { ok: ok === 70, text: S.check09(ok) + (ok === 70 ? " ✓" : "") });
      km.setCurrent(v);
      // harita paneli
      const inf = km.info();
      mapTitle.textContent = useX ? S.segMap(sel) : S.segMap0(sel);
      exprLine(expr, km, inf, sel);
      msgEl(verd, verdict(inf));
      const cx = costOf(MIN[sel].x, 4), cz = costOf(MIN[sel].z, 4);
      const line = (p, label, terms, c, active) => {
        p.innerHTML = "";
        p.classList.toggle("on", active);
        p.append(h("b", label), " ", h("span.mono", sel + " = " + Logic.sopString(terms, VARS4)), h("small", S.cmp(c.t, c.l)));
      };
      line(cmpX, S.withX, MIN[sel].x, cx, useX);
      line(cmpZ, S.noX, MIN[sel].z, cz, !useX);
      let a = 0, b = 0, c = 0, d = 0;
      SEGS.split("").forEach((s) => { const p = costOf(MIN[s].x, 4), q = costOf(MIN[s].z, 4); a += p.t; b += p.l; c += q.t; d += q.l; });
      total.textContent = S.total(a, b, c, d);
      // yedi ifadenin listesi
      list.innerHTML = "";
      SEGS.split("").forEach((s) => {
        const on = evalExpr(E[s].ast, VARS4, v) === 1;
        const r = h("button.c11-erow" + (s === sel ? ".sel" : "") + (on ? ".lit" : ""), { type: "button", "aria-label": S.segAria(s) },
          h("b", s), h("span.mono", E[s].str), h("small", E[s].src === "mine" ? S.mine : S.min));
        r.addEventListener("click", () => pick(s));
        list.append(r);
      });
      addB.disabled = !(inf.pend && inf.pend.ok);
      clrG.disabled = !km.groups.length;
    }
    const lp = loop((dt) => {
      if (!auto) return;
      acc += dt;
      if (acc > 0.9) { acc = 0; v = (v + 1) % 16; refresh(); }
    });
    refresh();
    return { enter() { km.layout(); lp.start(); }, leave() { lp.stop(); auto = false; countB.textContent = S.count; countB.classList.remove("on"); }, km };
  };
  G["yedi-segment"] = [
    { click: "=" + S.solve },
    { wait: 800 },
    { click: "=" + S.xZero },
    { wait: 500 },
    { click: "=" + S.solve },
  ];
})();
