/* Dijital mantık çekirdeği
   - kapı fonksiyonları (0, 1, 'x' tanımsız, 'z' yüksek empedans)
   - olay tabanlı benzetim: yayılma gecikmeli kapılar, latch ve flip-flop'lar, saat üreteci
   - doğruluk tablosu, Boole ifadesi ayrıştırıcı, Quine–McCluskey basitleştirici
   - Karnaugh haritası yardımcıları (Gray kod düzeni, grup doğrulama)
   Tarayıcıda window.Logic, Node'da require(). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Logic = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------------- kapılar ---------------- */
  const isX = (v) => v !== 0 && v !== 1;
  function and(ins) { if (ins.includes(0)) return 0; return ins.some(isX) ? "x" : 1; }
  function or(ins) { if (ins.includes(1)) return 1; return ins.some(isX) ? "x" : 0; }
  function not(v) { return isX(v) ? "x" : 1 - v; }
  function xor(ins) { if (ins.some(isX)) return "x"; return ins.reduce((a, b) => a ^ b, 0); }
  const GATES = {
    BUF: (i) => (isX(i[0]) ? "x" : i[0]),
    NOT: (i) => not(i[0]),
    AND: and,
    OR: or,
    NAND: (i) => not(and(i)),
    NOR: (i) => not(or(i)),
    XOR: xor,
    XNOR: (i) => not(xor(i)),
  };

  /* ---------------- olay tabanlı benzetim ---------------- */
  function network(opts = {}) {
    const sig = {};      // ad → değer
    const hist = {};     // ad → [[t, v], ...] (zamanlama diyagramı için)
    const fan = {};      // ad → bu sinyali okuyan öğeler
    const elems = [];
    let queue = [];      // {t, name, v, seq}
    let now = 0, seq = 0;
    const maxEvents = opts.maxEvents || 200000;

    function signal(name, v = "x") {
      if (!(name in sig)) { sig[name] = v; hist[name] = [[0, v]]; fan[name] = []; }
      return name;
    }
    function schedule(name, v, t) {
      // aynı sinyal için daha sonraki bekleyen olayları geçersiz kıl (eylemsizlik gecikmesi yok, taşıma gecikmesi)
      queue.push({ t, name, v, seq: seq++ });
    }
    function record(name, v, t) {
      const h = hist[name];
      if (h.length && h[h.length - 1][0] === t) { h[h.length - 1][1] = v; if (h.length > 1 && h[h.length - 2][1] === v) h.pop(); }
      else if (!h.length || h[h.length - 1][1] !== v) h.push([t, v]);
    }
    function addElem(e) {
      elems.push(e);
      e.ins.forEach((n) => { signal(n); fan[n].push(e); });
      e.outs.forEach((n) => signal(n));
      return e;
    }

    const net = {
      signal,
      get time() { return now; },
      value: (n) => sig[n],
      values: () => ({ ...sig }),
      history: (n) => hist[n],
      histories: () => hist,
      elements: elems,
      // kapı: tür, giriş adları, çıkış adı, gecikme
      gate(type, ins, out, o = {}) {
        const f = GATES[type];
        if (!f) throw new Error("Bilinmeyen kapı: " + type);
        return addElem({ kind: "gate", type, ins, outs: [out], delay: o.delay ?? 1, id: o.id,
          eval(t) { schedule(out, f(ins.map((n) => sig[n])), t + this.delay); } });
      },
      // genel fonksiyon öğesi
      fn(ins, outs, f, o = {}) {
        return addElem({ kind: "fn", ins, outs, delay: o.delay ?? 1, id: o.id,
          eval(t) { const r = f(ins.map((n) => sig[n])); outs.forEach((n, k) => schedule(n, r[k], t + this.delay)); } });
      },
      // D latch: en = 1 iken saydam
      dlatch({ d, en, q, qn }, o = {}) {
        const outs = [q]; if (qn) outs.push(qn);
        return addElem({ kind: "dlatch", ins: [d, en], outs, delay: o.delay ?? 1, id: o.id,
          eval(t) {
            if (sig[en] === 1) { const v = isX(sig[d]) ? "x" : sig[d]; schedule(q, v, t + this.delay); if (qn) schedule(qn, not(v), t + this.delay); }
          } });
      },
      // kenar tetiklemeli flip-flop: tür D, T ya da JK. Yükselen kenarda (edge: -1 ise düşen) örnekler.
      // setup > 0 ise veri kenardan "setup" süre içinde değiştiyse çıkış tanımsız (x) olur.
      ff({ type = "D", d, t: tin, j, k, clk, q, qn, reset, set, init = 0 }, o = {}) {
        const ins = [clk]; [d, tin, j, k, reset, set].forEach((n) => n && ins.push(n));
        const outs = [q]; if (qn) outs.push(qn);
        signal(q, init); if (qn) signal(qn, not(init));
        const edge = o.edge || 1, setup = o.setup || 0;
        let lastClk = sig[clk] ?? 0;
        const lastChange = {};
        const e = addElem({ kind: "ff", type, ins, outs, delay: o.delay ?? 1, id: o.id, state: init,
          noteChange(n, t) { lastChange[n] = t; },
          eval(t, before) {
            const out = (v) => { this.state = v; schedule(q, v, t + this.delay); if (qn) schedule(qn, not(v), t + this.delay); };
            if (reset && sig[reset] === 1) { out(0); lastClk = sig[clk]; return; }
            if (set && sig[set] === 1) { out(1); lastClk = sig[clk]; return; }
            const c = sig[clk];
            const rising = edge > 0 ? lastClk === 0 && c === 1 : lastClk === 1 && c === 0;
            lastClk = c;
            if (!rising) return;
            // örnekleme: kenarla aynı anda değişen sinyallerin ÖNCEKİ değeri
            const val = (n) => (n in before ? before[n] : sig[n]);
            const cur = this.state;
            let nv;
            if (type === "D") nv = val(d);
            else if (type === "T") nv = val(tin) === 1 ? not(cur) : val(tin) === 0 ? cur : "x";
            else if (type === "JK") {
              const J = val(j), K = val(k);
              nv = isX(J) || isX(K) ? "x" : J && K ? not(cur) : J ? 1 : K ? 0 : cur;
            }
            const watch = type === "D" ? [d] : type === "T" ? [tin] : [j, k];
            if (setup && watch.some((n) => lastChange[n] != null && t - lastChange[n] < setup && lastChange[n] !== t)) nv = "x";
            out(isX(nv) ? "x" : nv);
          } });
        return e;
      },
      // saat üreteci: yarım periyotta bir değiştirir
      clock(name, period, o = {}) {
        signal(name, o.start ?? 0);
        const half = period / 2;
        const c = { name, period, next: (o.phase ?? half), running: true };
        clocks.push(c);
        return c;
      },
      // dış giriş: şimdi (ya da t anında) değer ata
      set(name, v, t = now) { signal(name); schedule(name, v, t); },
      // olayları t anına kadar işle
      run(until) {
        let count = 0;
        for (;;) {
          // sıradaki saat kenarlarını kuyruğa ekle
          for (const c of clocks) {
            while (c.running && c.next <= until) {
              const cur = pendingValue(c.name, c.next);
              schedule(c.name, cur === 1 ? 0 : 1, c.next);
              c.next += c.period / 2;
            }
          }
          if (!queue.length) break;
          queue.sort((a, b) => a.t - b.t || a.seq - b.seq);
          const t = queue[0].t;
          if (t > until) break;
          // bu andaki tüm olaylar
          const batch = [];
          while (queue.length && queue[0].t === t) batch.push(queue.shift());
          now = t;
          const before = {}, changed = new Set();
          for (const ev of batch) {
            if (!(ev.name in before)) before[ev.name] = sig[ev.name];
            sig[ev.name] = ev.v;
          }
          for (const n in before) {
            if (before[n] !== sig[n]) {
              changed.add(n); record(n, sig[n], t);
              fan[n].forEach((e) => e.noteChange && e.noteChange(n, t));
            }
          }
          const todo = new Set();
          changed.forEach((n) => fan[n].forEach((e) => todo.add(e)));
          todo.forEach((e) => e.eval(t, before));
          if ((count += batch.length) > maxEvents) throw new Error("Olay sınırı aşıldı (salınım?)");
        }
        now = Math.max(now, until);
        return net;
      },
      // tüm öğeleri bir kez değerlendir (başlangıç durumu)
      settle(t = 0) { elems.forEach((e) => { if (e.kind !== "ff") e.eval(now, {}); }); return net.run(now + (t || 100)); },
      clear() { queue = []; },
      pending: () => queue.length,
    };
    const clocks = [];
    // saat için: zaman t'de geçerli olacak değer (kuyruktaki son olay ya da mevcut değer)
    function pendingValue(name, t) {
      let v = sig[name], best = -Infinity;
      for (const ev of queue) if (ev.name === name && ev.t <= t && ev.t >= best) { best = ev.t; v = ev.v; }
      return v;
    }
    return net;
  }

  /* ---------------- hazır yapı taşları ---------------- */
  const build = {
    // tam toplayıcı: s = a ⊕ b ⊕ cin, cout = ab + cin(a ⊕ b)
    fullAdder(net, a, b, cin, s, cout, p, o = {}) {
      net.gate("XOR", [a, b], p + "x1", o);
      net.gate("XOR", [p + "x1", cin], s, o);
      net.gate("AND", [a, b], p + "a1", o);
      net.gate("AND", [p + "x1", cin], p + "a2", o);
      net.gate("OR", [p + "a1", p + "a2"], cout, o);
    },
    // n bitlik dalgalı elde toplayıcı: A0..An-1, B0..Bn-1 → S0..Sn-1, C(n)
    rippleAdder(net, n, o = {}) {
      net.signal("C0", 0);
      for (let i = 0; i < n; i++) build.fullAdder(net, "A" + i, "B" + i, "C" + i, "S" + i, "C" + (i + 1), "fa" + i + ".", o);
    },
    // NAND kapılarıyla XOR (4 kapı)
    xorFromNand(net, a, b, y, p = "n") {
      net.gate("NAND", [a, b], p + "1");
      net.gate("NAND", [a, p + "1"], p + "2");
      net.gate("NAND", [b, p + "1"], p + "3");
      net.gate("NAND", [p + "2", p + "3"], y);
    },
    // eşzamanlı n bitlik ikili sayaç (T flip-flop'larla; Ti = Q0·Q1·…·Qi-1)
    counter(net, n, clk, o = {}) {
      net.signal("one", 1);
      for (let i = 0; i < n; i++) {
        // T0 = 1, T1 = Q0, Ti = T(i-1) · Q(i-1)
        const t = i === 0 ? "one" : i === 1 ? "Q0" : "T" + i;
        if (i >= 2) net.gate("AND", [i === 2 ? "Q0" : "T" + (i - 1), "Q" + (i - 1)], "T" + i, { delay: 0.1 });
        net.ff({ type: "T", t, clk, q: "Q" + i, reset: o.reset }, { delay: o.delay ?? 1 });
      }
    },
  };

  /* ---------------- Boole ifadeleri ---------------- */
  // Desteklenen yazımlar: değil  ¬A, !A, ~A, A' ; ve  A·B, A*B, A&B, AB (yan yana) ; özel veya A⊕B, A^B ; veya A+B, A|B
  // Öncelik: değil > ve > özel veya > veya
  function parse(src) {
    const s = src.replace(/\s+/g, "");
    let i = 0;
    const peek = () => s[i];
    function err(m) { throw new Error(m + " (konum " + (i + 1) + ")"); }
    function parseOr() {
      const args = [parseXor()];
      while (peek() === "+" || peek() === "|" || peek() === "∨") { i++; args.push(parseXor()); }
      return args.length === 1 ? args[0] : { op: "or", args };
    }
    function parseXor() {
      const args = [parseAnd()];
      while (peek() === "⊕" || peek() === "^") { i++; args.push(parseAnd()); }
      return args.length === 1 ? args[0] : { op: "xor", args };
    }
    const startsAtom = (c) => c && (/[A-Za-z01(¬!~]/.test(c));
    function parseAnd() {
      const args = [parseNot()];
      for (;;) {
        if (peek() === "·" || peek() === "*" || peek() === "&" || peek() === "∧" || peek() === "⋅") { i++; args.push(parseNot()); }
        else if (startsAtom(peek())) args.push(parseNot());
        else break;
      }
      return args.length === 1 ? args[0] : { op: "and", args };
    }
    function parseNot() {
      if (peek() === "¬" || peek() === "!" || peek() === "~") { i++; return { op: "not", a: parseNot() }; }
      let a = parseAtom();
      while (peek() === "'" || peek() === "’") { i++; a = { op: "not", a }; }
      return a;
    }
    function parseAtom() {
      const c = peek();
      if (c === "(") { i++; const e = parseOr(); if (peek() !== ")") err("')' bekleniyordu"); i++; return e; }
      if (c === "0" || c === "1") { i++; return { op: "const", v: +c }; }
      if (c && /[A-Za-z]/.test(c)) {
        // tek harfli değişken, ardından isteğe bağlı rakam/alt simge (A1, B₀)
        let name = c; i++;
        while (i < s.length && /[0-9₀-₉]/.test(s[i])) name += s[i++];
        return { op: "var", name };
      }
      err(c ? "Beklenmeyen karakter '" + c + "'" : "İfade eksik");
    }
    if (!s) throw new Error("İfade boş");
    const ast = parseOr();
    if (i < s.length) err("Beklenmeyen karakter '" + s[i] + "'");
    return ast;
  }
  function evaluate(ast, env) {
    switch (ast.op) {
      case "const": return ast.v;
      case "var": { const v = env[ast.name]; if (v == null) throw new Error("Değişken yok: " + ast.name); return v ? 1 : 0; }
      case "not": return 1 - evaluate(ast.a, env);
      case "and": return ast.args.every((a) => evaluate(a, env)) ? 1 : 0;
      case "or": return ast.args.some((a) => evaluate(a, env)) ? 1 : 0;
      case "xor": return ast.args.reduce((x, a) => x ^ evaluate(a, env), 0);
    }
  }
  function variables(ast, out = new Set()) {
    if (ast.op === "var") out.add(ast.name);
    if (ast.a) variables(ast.a, out);
    if (ast.args) ast.args.forEach((a) => variables(a, out));
    return [...out].sort();
  }
  // ifadeyi metne çevir (değil için ' kullanılır)
  function show(ast, parent) {
    switch (ast.op) {
      case "const": return String(ast.v);
      case "var": return ast.name;
      case "not": { const inner = show(ast.a, "not"); return (ast.a.op === "var" || ast.a.op === "const" || ast.a.op === "not" ? inner : "(" + inner + ")") + "'"; }
      case "and": { const s = ast.args.map((a) => show(a, "and")).join("·"); return s; }
      case "xor": { const s = ast.args.map((a) => show(a, "xor")).join(" ⊕ "); return parent === "and" || parent === "not" ? "(" + s + ")" : s; }
      case "or": { const s = ast.args.map((a) => show(a, "or")).join(" + "); return parent && parent !== "or" ? "(" + s + ")" : s; }
    }
  }

  /* ---------------- doğruluk tablosu ---------------- */
  // satır sırası: ilk değişken en anlamlı bit (A B C: 000, 001, …)
  function truthTable(f, vars) {
    const n = vars.length, rows = [];
    for (let m = 0; m < 1 << n; m++) {
      const env = {};
      vars.forEach((v, k) => { env[v] = (m >> (n - 1 - k)) & 1; });
      const out = typeof f === "function" ? f(env, m) : evaluate(f, env);
      rows.push({ m, env, bits: vars.map((v) => env[v]), out });
    }
    return rows;
  }
  function minterms(f, vars) { return truthTable(f, vars).filter((r) => r.out === 1).map((r) => r.m); }

  /* ---------------- Quine–McCluskey ---------------- */
  // terim: { value, mask } — mask bitleri 1 olan konumlar "önemsiz" (-)
  const popcount = (x) => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };
  function covers(term, m) { return (m & ~term.mask) === (term.value & ~term.mask); }
  function primeImplicants(n, ones, dcs = []) {
    let groups = [...new Set([...ones, ...dcs])].map((m) => ({ value: m, mask: 0, used: false }));
    const primes = [];
    while (groups.length) {
      const next = new Map();
      for (let a = 0; a < groups.length; a++) for (let b = a + 1; b < groups.length; b++) {
        const A = groups[a], B = groups[b];
        if (A.mask !== B.mask) continue;
        const diff = A.value ^ B.value;
        if (popcount(diff) !== 1) continue;
        A.used = B.used = true;
        const t = { value: A.value & ~diff, mask: A.mask | diff, used: false };
        next.set(t.value + ":" + t.mask, t);
      }
      groups.forEach((g) => { if (!g.used) primes.push({ value: g.value & ~g.mask, mask: g.mask }); });
      groups = [...next.values()];
    }
    // yinelenenleri at
    const seen = new Set();
    return primes.filter((p) => { const k = p.value + ":" + p.mask; if (seen.has(k)) return false; seen.add(k); return true; });
  }
  const literals = (t, n) => n - popcount(t.mask);
  // en az terim, eşitlikte en az harf: temel asal çarpanlar + kalanlar için kapsamlı arama
  function minimize(n, ones, dcs = []) {
    ones = [...new Set(ones)].filter((m) => !dcs.includes(m));
    if (!ones.length) return [];
    const pis = primeImplicants(n, ones, dcs);
    const chosen = [];
    let left = new Set(ones);
    // temel asal çarpanlar
    for (const m of ones) {
      const c = pis.filter((p) => covers(p, m));
      if (c.length === 1 && !chosen.includes(c[0])) chosen.push(c[0]);
    }
    chosen.forEach((p) => [...left].forEach((m) => covers(p, m) && left.delete(m)));
    if (left.size) {
      const cand = pis.filter((p) => !chosen.includes(p) && [...left].some((m) => covers(p, m)));
      let best = null;
      // artan büyüklükte alt kümeleri dene (küçük n için yeterince hızlı)
      const L = cand.length;
      for (let size = 1; size <= L && !best; size++) {
        const idx = [];
        const rec = (start) => {
          if (idx.length === size) {
            const set = idx.map((i) => cand[i]);
            if ([...left].every((m) => set.some((p) => covers(p, m)))) {
              const cost = set.reduce((s, p) => s + literals(p, n), 0);
              if (!best || cost < best.cost) best = { set, cost };
            }
            return;
          }
          for (let i = start; i < L; i++) { idx.push(i); rec(i + 1); idx.pop(); }
        };
        rec(0);
      }
      chosen.push(...best.set);
    }
    // okunuş sırası: önce büyük gruplar
    return chosen.sort((a, b) => popcount(b.mask) - popcount(a.mask) || a.value - b.value);
  }
  function termToString(t, vars) {
    const n = vars.length;
    let s = "";
    for (let k = 0; k < n; k++) {
      const bit = 1 << (n - 1 - k);
      if (t.mask & bit) continue;
      s += vars[k] + (t.value & bit ? "" : "'");
    }
    return s || "1";
  }
  // terimin harf listesi: [{v:"A", neg:true}, …] (arayüzde üst çizgi için)
  function termLiterals(t, vars) {
    const n = vars.length, out = [];
    for (let k = 0; k < n; k++) {
      const bit = 1 << (n - 1 - k);
      if (!(t.mask & bit)) out.push({ v: vars[k], neg: !(t.value & bit) });
    }
    return out;
  }
  function sopString(terms, vars) { return terms.length ? terms.map((t) => termToString(t, vars)).join(" + ") : "0"; }
  function evalSop(terms, m) { return terms.some((t) => covers(t, m)) ? 1 : 0; }

  /* ---------------- Karnaugh haritası ---------------- */
  const GRAY = { 1: [0, 1], 2: [0, 1, 3, 2] };
  // n = 2, 3, 4 değişken. Satırlar ilk değişken(ler), sütunlar kalanlar.
  function kmapLayout(n, vars = ["A", "B", "C", "D"].slice(0, n)) {
    const rb = n === 4 ? 2 : 1, cb = n - rb;
    const rows = GRAY[rb], cols = GRAY[cb];
    const bin = (v, w) => v.toString(2).padStart(w, "0");
    return {
      n, vars, rowVars: vars.slice(0, rb), colVars: vars.slice(rb),
      rows: rows.map((r) => bin(r, rb)), cols: cols.map((c) => bin(c, cb)),
      cell(r, c) { return (rows[r] << cb) | cols[c]; },
      pos(m) { const r = m >> cb, c = m & ((1 << cb) - 1); return [rows.indexOf(r), cols.indexOf(c)]; },
      R: rows.length, C: cols.length,
    };
  }
  // seçilen hücrelerin geçerli bir grup olup olmadığını denetle
  function checkGroup(n, cells, values) {
    const set = [...new Set(cells)];
    const sz = set.length;
    if (!sz) return { ok: false, why: "Grup boş" };
    if (set.some((m) => values[m] === 0)) return { ok: false, why: "Grupta 0 olan hücre var; gruplar yalnızca 1 ve X hücrelerini kapsar" };
    if (!set.some((m) => values[m] === 1)) return { ok: false, why: "Grupta hiç 1 yok" };
    if (sz & (sz - 1)) return { ok: false, why: `${sz} hücre: grup büyüklüğü 1, 2, 4, 8 ya da 16 olmalı` };
    let andv = (1 << n) - 1, orv = 0;
    set.forEach((m) => { andv &= m; orv |= m; });
    const mask = andv ^ orv; // değişen bitler
    if (1 << popcount(mask) !== sz) return { ok: false, why: "Hücreler bir dikdörtgen oluşturmuyor (kenarlardan sarmalama serbest)" };
    return { ok: true, term: { value: andv & ~mask, mask } };
  }
  // bir terimin haritadaki hücreleri
  function termCells(n, t) { const out = []; for (let m = 0; m < 1 << n; m++) if (covers(t, m)) out.push(m); return out; }

  /* ---------------- ikili sayılar ---------------- */
  const toBits = (v, w) => Array.from({ length: w }, (_, k) => (v >> (w - 1 - k)) & 1);
  const fromBits = (b) => b.reduce((a, x) => a * 2 + x, 0);
  const gray = (v) => v ^ (v >> 1);

  /* 7 segment: 0–9 rakamları için a..g (abcdefg sırasıyla) */
  const SEG7 = {
    0: "1111110", 1: "0110000", 2: "1101101", 3: "1111001", 4: "0110011",
    5: "1011011", 6: "1011111", 7: "1110000", 8: "1111111", 9: "1111011",
  };

  return {
    GATES, isX, network, build,
    parse, evaluate, variables, show, truthTable, minterms,
    primeImplicants, minimize, covers, termToString, termLiterals, sopString, evalSop, literals, popcount,
    kmapLayout, checkGroup, termCells, toBits, fromBits, gray, SEG7,
  };
});
