// Dijital mantık testleri: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const L = require("../js/logic.js");

const all = (n) => Array.from({ length: 1 << n }, (_, m) => L.toBits(m, n));

test("bütün kapıların doğruluk tabloları", () => {
  const expect = {
    AND: (a, b) => a & b, OR: (a, b) => a | b, NAND: (a, b) => 1 - (a & b), NOR: (a, b) => 1 - (a | b),
    XOR: (a, b) => a ^ b, XNOR: (a, b) => 1 - (a ^ b),
  };
  for (const [g, f] of Object.entries(expect)) for (const [a, b] of all(2)) assert.strictEqual(L.GATES[g]([a, b]), f(a, b), g + a + b);
  assert.strictEqual(L.GATES.NOT([0]), 1);
  assert.strictEqual(L.GATES.NOT([1]), 0);
  // üç girişli
  for (const [a, b, c] of all(3)) {
    assert.strictEqual(L.GATES.AND([a, b, c]), a & b & c);
    assert.strictEqual(L.GATES.XOR([a, b, c]), a ^ b ^ c);
  }
  // tanımsız değerler: 0 AND x = 0, 1 OR x = 1
  assert.strictEqual(L.GATES.AND([0, "x"]), 0);
  assert.strictEqual(L.GATES.OR([1, "z"]), 1);
  assert.strictEqual(L.GATES.AND([1, "x"]), "x");
});

test("De Morgan eşitlikleri (tüm girişler)", () => {
  for (const n of [2, 3, 4]) for (const bits of all(n)) {
    assert.strictEqual(L.GATES.NAND(bits), L.GATES.OR(bits.map((b) => 1 - b)));
    assert.strictEqual(L.GATES.NOR(bits), L.GATES.AND(bits.map((b) => 1 - b)));
  }
  // ifade ayrıştırıcı ile
  const a = L.parse("(AB)'"), b = L.parse("A' + B'");
  const c = L.parse("(A+B+C)'"), d = L.parse("A'B'C'");
  for (const [A, B, C] of all(3)) {
    assert.strictEqual(L.evaluate(a, { A, B }), L.evaluate(b, { A, B }));
    assert.strictEqual(L.evaluate(c, { A, B, C }), L.evaluate(d, { A, B, C }));
  }
});

test("NAND ile kurulan XOR, XOR'a eşit (olay tabanlı benzetim)", () => {
  for (const [a, b] of all(2)) {
    const net = L.network();
    net.signal("A", a); net.signal("B", b);
    L.build.xorFromNand(net, "A", "B", "Y");
    net.settle();
    assert.strictEqual(net.value("Y"), a ^ b, `${a}${b}`);
  }
});

test("ifade ayrıştırıcı: yazımlar ve öncelik", () => {
  const cases = [["AB+C", (A, B, C) => (A & B) | C], ["A·(B+C)", (A, B, C) => A & (B | C)], ["¬A + B⊕C", (A, B, C) => (1 - A) | (B ^ C)],
    ["A'B'C + ABC'", (A, B, C) => ((1 - A) & (1 - B) & C) | (A & B & (1 - C))], ["!(A&B)|C", (A, B, C) => (1 - (A & B)) | C], ["A^B^C", (A, B, C) => A ^ B ^ C]];
  for (const [src, f] of cases) {
    const ast = L.parse(src);
    for (const [A, B, C] of all(3)) assert.strictEqual(L.evaluate(ast, { A, B, C }), f(A, B, C), src);
  }
  assert.deepStrictEqual(L.variables(L.parse("C+AB")), ["A", "B", "C"]);
  assert.throws(() => L.parse("A+"), /eksik/);
  assert.throws(() => L.parse("A)"), /Beklenmeyen/);
});

test("Quine–McCluskey: bilinen örnekler", () => {
  // f = Σm(0,1,2,5,6,7) — klasik döngüsel örnek: 3 terim
  const r = L.minimize(3, [0, 1, 2, 5, 6, 7]);
  assert.strictEqual(r.length, 3);
  // f(A,B,C,D) = Σm(4,8,10,11,12,15) + d(9,14) → AB' + BC'D' + AC (ya da eşdeğeri), 3 terim
  const r2 = L.minimize(4, [4, 8, 10, 11, 12, 15], [9, 14]);
  assert.strictEqual(r2.length, 3);
  // hepsi 1 → "1"
  assert.strictEqual(L.sopString(L.minimize(2, [0, 1, 2, 3]), ["A", "B"]), "1");
  assert.strictEqual(L.sopString(L.minimize(2, []), ["A", "B"]), "0");
  // XOR basitleşmez
  assert.strictEqual(L.minimize(2, [1, 2]).length, 2);
});

test("Karnaugh basitleştirici: yüzlerce rastgele 3 ve 4 değişkenli fonksiyon", () => {
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let count = 0;
  for (const n of [3, 4]) for (let trial = 0; trial < 400; trial++) {
    const ones = [], dcs = [];
    for (let m = 0; m < 1 << n; m++) { const r = rnd(); if (r < 0.4) ones.push(m); else if (r < 0.5) dcs.push(m); }
    const terms = L.minimize(n, ones, dcs);
    for (let m = 0; m < 1 << n; m++) {
      if (dcs.includes(m)) continue;
      assert.strictEqual(L.evalSop(terms, m), ones.includes(m) ? 1 : 0, `n=${n} m=${m} ${JSON.stringify({ ones, dcs })}`);
    }
    // ifade metni geri ayrıştırılınca da aynı sonucu versin
    const vars = ["A", "B", "C", "D"].slice(0, n);
    const ast = L.parse(L.sopString(terms, vars));
    for (const r of L.truthTable(ast, vars)) if (!dcs.includes(r.m)) assert.strictEqual(r.out, ones.includes(r.m) ? 1 : 0);
    count++;
  }
  assert.strictEqual(count, 800);
});

test("Karnaugh düzeni ve grup denetimi", () => {
  const k = L.kmapLayout(4);
  assert.deepStrictEqual(k.cols, ["00", "01", "11", "10"]);
  // komşu hücreler tek bit farklı (sarmalama dahil)
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const m = k.cell(r, c);
    assert.strictEqual(L.popcount(m ^ k.cell(r, (c + 1) % 4)), 1);
    assert.strictEqual(L.popcount(m ^ k.cell((r + 1) % 4, c)), 1);
    assert.deepStrictEqual(k.pos(m), [r, c]);
  }
  const vals = Array(16).fill(1);
  // dört köşe geçerli bir grup (sarmalama)
  const corners = [k.cell(0, 0), k.cell(0, 3), k.cell(3, 0), k.cell(3, 3)];
  const g = L.checkGroup(4, corners, vals);
  assert.ok(g.ok);
  assert.strictEqual(L.termToString(g.term, ["A", "B", "C", "D"]), "B'D'");
  // üç hücre geçersiz
  assert.ok(!L.checkGroup(4, corners.slice(0, 3), vals).ok);
  // çapraz iki hücre geçersiz
  assert.ok(!L.checkGroup(4, [k.cell(0, 0), k.cell(1, 1)], vals).ok);
  // 0 içeren grup geçersiz
  const v2 = vals.slice(); v2[corners[0]] = 0;
  assert.ok(!L.checkGroup(4, corners, v2).ok);
});

test("4 bitlik toplayıcı: 256 giriş çiftinin hepsi (kapı düzeyinde)", () => {
  for (let a = 0; a < 16; a++) for (let b = 0; b < 16; b++) {
    const net = L.network();
    L.toBits(a, 4).reverse().forEach((v, i) => net.signal("A" + i, v));
    L.toBits(b, 4).reverse().forEach((v, i) => net.signal("B" + i, v));
    L.build.rippleAdder(net, 4);
    net.settle(200);
    const sum = [0, 1, 2, 3].reduce((s, i) => s + (net.value("S" + i) << i), 0) + (net.value("C4") << 4);
    assert.strictEqual(sum, a + b, `${a}+${b}`);
  }
});

test("dalgalı elde: en kötü durumda gecikme bit sayısıyla artar", () => {
  // 1111 + 0001: elde dört kat boyunca ilerler
  const net = L.network();
  [1, 1, 1, 1].forEach((v, i) => net.signal("A" + i, v));
  [0, 0, 0, 0].forEach((v, i) => net.signal("B" + i, v));
  L.build.rippleAdder(net, 4);
  net.settle(100);
  const t0 = net.time;
  net.set("B0", 1);
  net.run(t0 + 100);
  const h = net.history("C4");
  const tC4 = h[h.length - 1][0] - t0;
  const h1 = net.history("C1");
  const tC1 = h1[h1.length - 1][0] - t0;
  assert.ok(tC4 > tC1 * 2, `C1 ${tC1}, C4 ${tC4}`);
  assert.strictEqual(net.value("C4"), 1);
});

test("D flip-flop yalnızca yükselen kenarda veri alır", () => {
  const net = L.network();
  net.signal("D", 0); net.signal("CLK", 0);
  net.ff({ type: "D", d: "D", clk: "CLK", q: "Q", qn: "QN" });
  net.settle(10);
  const step = (name, v) => { net.set(name, v); net.run(net.time + 10); };
  step("D", 1); assert.strictEqual(net.value("Q"), 0, "saat yokken değişmez");
  step("CLK", 1); assert.strictEqual(net.value("Q"), 1, "yükselen kenarda alır");
  assert.strictEqual(net.value("QN"), 0);
  step("D", 0); assert.strictEqual(net.value("Q"), 1, "saat 1 iken veri değişse de tutar");
  step("CLK", 0); assert.strictEqual(net.value("Q"), 1, "düşen kenarda değişmez");
  step("CLK", 1); assert.strictEqual(net.value("Q"), 0);
  // kenarla aynı anda değişen veri: önceki değer örneklenir
  net.set("D", 1); net.set("CLK", 0); net.run(net.time + 10);
  net.set("D", 0); net.set("CLK", 1); net.run(net.time + 10);
  assert.strictEqual(net.value("Q"), 1);
});

test("D latch saydamdır, flip-flop değildir", () => {
  const net = L.network();
  net.signal("D", 0); net.signal("EN", 1);
  net.dlatch({ d: "D", en: "EN", q: "Q" });
  net.settle(10);
  net.set("D", 1); net.run(net.time + 10);
  assert.strictEqual(net.value("Q"), 1);
  net.set("EN", 0); net.run(net.time + 10);
  net.set("D", 0); net.run(net.time + 10);
  assert.strictEqual(net.value("Q"), 1, "kilitli");
});

test("set-up süresi ihlali tanımsız çıkış verir", () => {
  const net = L.network();
  net.signal("D", 0); net.signal("CLK", 0);
  net.ff({ type: "D", d: "D", clk: "CLK", q: "Q" }, { setup: 5 });
  net.settle(10);
  net.set("D", 1); net.run(net.time + 2); // kenardan 2 birim önce
  net.set("CLK", 1); net.run(net.time + 10);
  assert.strictEqual(net.value("Q"), "x");
});

test("4 bitlik sayaç 16 adımda başa döner", () => {
  const net = L.network();
  net.signal("CLK", 0);
  L.build.counter(net, 4, "CLK");
  net.settle(10);
  const read = () => [0, 1, 2, 3].reduce((s, i) => s + (net.value("Q" + i) << i), 0);
  const seq = [read()];
  for (let k = 0; k < 16; k++) {
    net.set("CLK", 1); net.run(net.time + 10);
    net.set("CLK", 0); net.run(net.time + 10);
    seq.push(read());
  }
  assert.deepStrictEqual(seq, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]);
});

test("saat üreteci ve T flip-flop frekansı ikiye böler", () => {
  const net = L.network();
  net.signal("one", 1);
  net.clock("CLK", 20);
  net.ff({ type: "T", t: "one", clk: "CLK", q: "Q" }, { delay: 1 });
  net.run(400);
  const rises = (n) => net.history(n).filter(([, v], i, h) => v === 1 && i > 0 && h[i - 1][1] === 0).length;
  assert.strictEqual(rises("CLK"), 20);
  assert.strictEqual(rises("Q"), 10);
});

test("JK flip-flop: J=K=1 durumu değiştirir", () => {
  const net = L.network();
  ["J", "K", "CLK"].forEach((n) => net.signal(n, 0));
  net.ff({ type: "JK", j: "J", k: "K", clk: "CLK", q: "Q" });
  net.settle(5);
  const pulse = () => { net.set("CLK", 1); net.run(net.time + 5); net.set("CLK", 0); net.run(net.time + 5); };
  net.set("J", 1); net.run(net.time + 5); pulse(); assert.strictEqual(net.value("Q"), 1);
  net.set("K", 1); net.run(net.time + 5); pulse(); assert.strictEqual(net.value("Q"), 0);
  pulse(); assert.strictEqual(net.value("Q"), 1);
  net.set("J", 0); net.run(net.time + 5); pulse(); assert.strictEqual(net.value("Q"), 0);
});

test("SR latch (iki NOR): tutma, kurma, silme; S=R=1 sonrası salınım", () => {
  const net = L.network({ maxEvents: 5000 });
  net.signal("S", 0); net.signal("R", 1);
  net.gate("NOR", ["R", "QN"], "Q");
  net.gate("NOR", ["S", "Q"], "QN");
  net.settle(20);
  assert.strictEqual(net.value("Q"), 0);
  net.set("R", 0); net.run(net.time + 20);
  assert.strictEqual(net.value("Q"), 0, "tutar");
  net.set("S", 1); net.run(net.time + 20);
  assert.strictEqual(net.value("Q"), 1, "kurar");
  net.set("S", 0); net.run(net.time + 20);
  assert.strictEqual(net.value("Q"), 1, "hatırlar");
  // yasak durum: ikisi de 0 olur
  net.set("S", 1); net.set("R", 1); net.run(net.time + 20);
  assert.strictEqual(net.value("Q"), 0); assert.strictEqual(net.value("QN"), 0);
  // ikisi aynı anda bırakılınca eşit gecikmeli kapılar salınır
  net.set("S", 0); net.set("R", 0); net.run(net.time + 40);
  const h = net.history("Q").filter(([t]) => t > net.time - 40);
  assert.ok(h.length >= 10, "salınım " + h.length);
});

test("7 segment tablosu ve ikili yardımcılar", () => {
  assert.strictEqual(L.SEG7[8], "1111111");
  assert.deepStrictEqual(L.toBits(5, 4), [0, 1, 0, 1]);
  assert.strictEqual(L.fromBits([1, 0, 1, 1]), 11);
  assert.deepStrictEqual([0, 1, 2, 3].map(L.gray), [0, 1, 3, 2]);
});
