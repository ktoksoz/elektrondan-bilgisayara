// Analog çözücü testleri: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const C = require("../js/circuit.js");

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} beklenen ${b}, bulunan ${a}`);

test("gerilim bölücü: 10 V, 1 kΩ + 1 kΩ → 5 V", () => {
  const s = C.create([
    { type: "V", id: "V1", n: ["a", "0"], V: 10 },
    { type: "R", id: "R1", n: ["a", "m"], R: 1000 },
    { type: "R", id: "R2", n: ["m", "0"], R: 1000 },
  ]);
  assert.ok(s.dc().ok);
  near(s.v("m"), 5, 1e-6);
  near(s.i("R1"), 5e-3, 1e-9, "akım");
  // kaynak 50 mW veriyor (negatif güç), dirençler 25'er mW harcıyor
  near(s.p("V1"), -0.05, 1e-9);
  near(s.p("R1"), 0.025, 1e-9);
});

test("paralel: 1 kΩ ∥ 1 kΩ → 500 Ω", () => {
  const s = C.create([
    { type: "I", id: "I1", n: ["0", "a"], I: 1e-3 }, // 1 mA a düğümüne
    { type: "R", id: "R1", n: ["a", "0"], R: 1000 },
    { type: "R", id: "R2", n: ["a", "0"], R: 1000 },
  ]);
  s.dc();
  near(s.v("a") / 1e-3, 500, 1e-6);
});

test("KCL ve KVL: iki kaynaklı köprülü devre", () => {
  const s = C.create([
    { type: "V", id: "V1", n: ["a", "0"], V: 12 },
    { type: "V", id: "V2", n: ["d", "0"], V: 5 },
    { type: "R", id: "R1", n: ["a", "b"], R: 1000 },
    { type: "R", id: "R2", n: ["b", "0"], R: 2200 },
    { type: "R", id: "R3", n: ["b", "c"], R: 470 },
    { type: "R", id: "R4", n: ["c", "d"], R: 1500 },
    { type: "R", id: "R5", n: ["c", "0"], R: 3300 },
    { type: "R", id: "R6", n: ["a", "c"], R: 6800 },
  ]);
  s.dc();
  // her düğümde akım toplamı sıfır
  s.kcl().forEach((q) => near(q.sum, 0, 1e-9 * q.scale, "KCL " + q.node));
  assert.ok(s.kclError() < 1e-9);
  // çevre a→b→c→a: gerilim düşümleri toplamı sıfır
  const loop = s.vAcross("R1") + s.vAcross("R3") - s.vAcross("R6");
  near(loop, 0, 1e-9, "KVL");
  // çevre 0→a→b→0 (kaynak + R1 + R2)
  near(-s.vAcross("V1") + s.vAcross("R1") + s.vAcross("R2"), 0, 1e-9, "KVL kaynaklı");
});

test("RC: τ = 1 ms; t = τ'da %63,2, t = 5τ'da %99,3", () => {
  for (const method of ["trap", "be"]) {
    const s = C.create({
      method,
      elements: [
        { type: "V", id: "V1", n: ["a", "0"], V: 1 },
        { type: "R", id: "R1", n: ["a", "b"], R: 1000 },
        { type: "C", id: "C1", n: ["b", "0"], C: 1e-6, v0: 0 },
      ],
    });
    s.tranInit({ uic: true });
    const h = 1e-6;
    let at1 = 0;
    for (let k = 1; k <= 5000; k++) {
      s.step(h);
      if (k === 1000) at1 = s.v("b");
    }
    near(at1, 1 - Math.exp(-1), method === "trap" ? 1e-4 : 1e-3, method + " τ");
    near(at1 * 100, 63.2, 0.1, method);
    near(s.v("b") * 100, 99.3, 0.1, method + " 5τ");
  }
});

test("bobin: RL akımı τ = L/R ile yükselir, açılınca gerilim sıçrar", () => {
  const s = C.create({
    method: "be",
    elements: [
      { type: "V", id: "V1", n: ["a", "0"], V: 10 },
      { type: "S", id: "S1", n: ["a", "b"], closed: true },
      { type: "R", id: "R1", n: ["b", "c"], R: 100 },
      { type: "L", id: "L1", n: ["c", "0"], L: 0.1 },
      { type: "R", id: "Rk", n: ["b", "0"], R: 10000 }, // anahtar açılınca akımın yolu
    ],
  });
  s.tranInit({ uic: true });
  for (let k = 0; k < 1000; k++) s.step(1e-6); // τ = 1 ms
  near(s.i("L1"), 0.1 * (1 - Math.exp(-1)), 2e-4, "τ anında");
  for (let k = 0; k < 9000; k++) s.step(1e-6);
  s.set("S1", "closed", false);
  s.step(1e-7);
  // bobin akımı (≈0,1 A) 10 kΩ'luk dirençten geçmeye zorlanır → yüzlerce volt
  assert.ok(Math.abs(s.v("b")) > 500, "sıçrama " + s.v("b"));
});

test("diyot: 1 mA civarında silisyum diyot ≈ 0,6–0,7 V", () => {
  const s = C.create([
    { type: "V", id: "V1", n: ["a", "0"], V: 5 },
    { type: "R", id: "R1", n: ["a", "d"], R: 4300 },
    { type: "D", id: "D1", n: ["d", "0"], ...C.models.si },
  ]);
  assert.ok(s.dc().ok);
  const I = s.i("D1");
  near(I, 1e-3, 1e-4, "akım");
  assert.ok(s.v("d") > 0.6 && s.v("d") < 0.7, "Vd=" + s.v("d"));
  // ters yönde neredeyse sıfır
  s.set("V1", "V", -5); s.dc();
  assert.ok(Math.abs(s.i("D1")) < 1e-9);
});

test("LED direnci: 5 V, 2 V LED, 10 mA → 300 Ω", () => {
  const R = (5 - 2) / 0.01;
  near(R, 300, 1e-9);
  const s = C.create([
    { type: "V", id: "V1", n: ["a", "0"], V: 5 },
    { type: "R", id: "R1", n: ["a", "d"], R },
    { type: "D", id: "LED", n: ["d", "0"], ...C.led(2.0) },
  ]);
  s.dc();
  near(s.i("LED"), 0.01, 1e-5, "LED akımı");
  near(C.nearestE(300), 330, 1e-9, "E12");
  near(C.nearestE(300, C.E12, true), 330, 1e-9);
  near(C.nearestE(4600), 4700, 1e-9);
});

test("Zener regülatör: 12 V girişten ≈ 5,1 V", () => {
  const s = C.create([
    { type: "V", id: "V1", n: ["a", "0"], V: 12 },
    { type: "R", id: "R1", n: ["a", "z"], R: 470 },
    { type: "D", id: "Z1", n: ["0", "z"], ...C.zener(5.1) },
    { type: "R", id: "RL", n: ["z", "0"], R: 2000 },
  ]);
  assert.ok(s.dc().ok);
  near(s.v("z"), 5.1, 0.25);
  s.set("V1", "V", 15); s.dc();
  near(s.v("z"), 5.1, 0.3);
});

test("opamp: eviren −Rf/Rin, evirmeyen 1 + Rf/Rg, rayda kırpılma", () => {
  for (const ideal of [true, false]) {
    const inv = C.create([
      { type: "V", id: "Vin", n: ["in", "0"], V: 0.5 },
      { type: "R", id: "Rin", n: ["in", "m"], R: 1000 },
      { type: "R", id: "Rf", n: ["m", "out"], R: 4700 },
      { type: "OA", id: "U1", n: ["0", "m", "out"], ideal, vpos: 12, vneg: -12 },
    ]);
    assert.ok(inv.dc().ok);
    near(inv.v("out"), -0.5 * 4.7, 1e-3, "eviren " + ideal);
    const non = C.create([
      { type: "V", id: "Vin", n: ["in", "0"], V: 0.5 },
      { type: "R", id: "Rg", n: ["m", "0"], R: 1000 },
      { type: "R", id: "Rf", n: ["m", "out"], R: 4700 },
      { type: "OA", id: "U1", n: ["in", "m", "out"], ideal, vpos: 12, vneg: -12 },
    ]);
    non.dc();
    near(non.v("out"), 0.5 * 5.7, 1e-3, "evirmeyen " + ideal);
  }
  // kırpılma: kazanç 10 × 2 V = 20 V isterken çıkış +12 V rayında kalır
  const clip = C.create([
    { type: "V", id: "Vin", n: ["in", "0"], V: 2 },
    { type: "R", id: "Rg", n: ["m", "0"], R: 1000 },
    { type: "R", id: "Rf", n: ["m", "out"], R: 9000 },
    { type: "OA", id: "U1", n: ["in", "m", "out"], vpos: 12, vneg: -12 },
  ]);
  assert.ok(clip.dc().ok);
  near(clip.v("out"), 12, 0.05, "kırpılma");
  assert.ok(clip.info("U1").clipped);
  // ray-ray olmayan opamp: 1,5 V pay
  clip.set("U1", "headroom", 1.5); clip.dc();
  near(clip.v("out"), 10.5, 0.05);
});

test("BJT: ortak emetörlü anahtar doyumda, V_CE ≈ 0,2 V", () => {
  const s = C.create([
    { type: "V", id: "Vcc", n: ["vcc", "0"], V: 5 },
    { type: "V", id: "Vin", n: ["in", "0"], V: 3.3 },
    { type: "R", id: "Rb", n: ["in", "b"], R: 1000 },
    { type: "R", id: "Rc", n: ["vcc", "c"], R: 100 },
    { type: "Q", id: "Q1", n: ["c", "b", "0"], ...C.models.npn },
  ]);
  assert.ok(s.dc().ok);
  const vce = s.v("c");
  assert.ok(vce > 0.05 && vce < 0.3, "Vce=" + vce);
  assert.strictEqual(s.info("Q1").region, "doyum");
  s.kcl().forEach((q) => near(q.sum, 0, 1e-9, "KCL " + q.node));
  // giriş 0 V → kesim, çıkış ≈ Vcc
  s.set("Vin", "V", 0); s.dc();
  near(s.v("c"), 5, 1e-3);
  assert.strictEqual(s.info("Q1").region, "kesim");
  // aktif bölge: küçük baz akımında Ic ≈ β·Ib
  s.set("Vin", "V", 0.75); s.set("Rb", "R", 10000); s.dc();
  const inf = s.info("Q1");
  assert.strictEqual(inf.region, "aktif");
  near(inf.Ic / inf.Ib, 100, 2);
});

test("PNP ve MOSFET bölgeleri", () => {
  // PNP yüksek taraf anahtarı
  const p = C.create([
    { type: "V", id: "Vcc", n: ["vcc", "0"], V: 5 },
    { type: "V", id: "Vin", n: ["in", "0"], V: 0 },
    { type: "R", id: "Rb", n: ["in", "b"], R: 2200 },
    { type: "R", id: "RL", n: ["c", "0"], R: 220 },
    { type: "Q", id: "Q1", n: ["c", "b", "vcc"], ...C.models.pnp },
  ]);
  assert.ok(p.dc().ok);
  assert.ok(p.v("c") > 4.7, "PNP açık " + p.v("c"));
  // N kanal MOSFET
  const m = C.create([
    { type: "V", id: "Vdd", n: ["vdd", "0"], V: 12 },
    { type: "V", id: "Vg", n: ["g", "0"], V: 0 },
    { type: "R", id: "RL", n: ["vdd", "d"], R: 100 },
    { type: "M", id: "M1", n: ["d", "g", "0"], ...C.models.nmos },
  ]);
  for (const [vg, region] of [[0, "kesim"], [1.7, "doyum"], [5, "doğrusal"]]) {
    m.set("Vg", "V", vg);
    assert.ok(m.dc().ok, "Vg=" + vg);
    assert.strictEqual(m.info("M1").region, region, "Vg=" + vg);
  }
  // doyumda kare yasası: Id = K/2 (Vgs − Vt)²
  m.set("Vg", "V", 1.7); m.dc();
  near(m.info("M1").Id, (2 / 2) * 0.2 * 0.2 * (1 + 0.01 * m.v("d")), 2e-3);
});

test("CMOS evirici: giriş 0 → çıkış Vdd, giriş Vdd → 0", () => {
  const s = C.create([
    { type: "V", id: "Vdd", n: ["vdd", "0"], V: 5 },
    { type: "V", id: "Vin", n: ["in", "0"], V: 0 },
    { type: "M", id: "MP", n: ["out", "in", "vdd"], ...C.models.pmos },
    { type: "M", id: "MN", n: ["out", "in", "0"], ...C.models.nmos },
  ]);
  for (let v = 0; v <= 5.0001; v += 0.05) {
    s.set("Vin", "V", v);
    assert.ok(s.dc().ok, "yakınsama " + v);
  }
  s.set("Vin", "V", 0); s.dc(); near(s.v("out"), 5, 0.01);
  s.set("Vin", "V", 5); s.dc(); near(s.v("out"), 0, 0.01);
  s.set("Vin", "V", 2.5); s.dc(); near(s.v("out"), 2.5, 0.2, "simetrik eşik");
});

test("Newton–Raphson: diyot devresi geniş aralıkta yakınsar", () => {
  const s = C.create([
    { type: "V", id: "V1", n: ["a", "0"], V: 0 },
    { type: "R", id: "R1", n: ["a", "d"], R: 10 },
    { type: "D", id: "D1", n: ["d", "0"], ...C.models.si },
  ]);
  for (let v = -50; v <= 50; v += 0.5) {
    s.set("V1", "V", v);
    assert.ok(s.dc().ok, "V=" + v);
    assert.ok(s.kclError() < 1e-6);
  }
});

test("yardımcılar: biçim ve renk kodu", () => {
  assert.strictEqual(C.fmt(0.0047, "A"), "4,7 mA");
  assert.strictEqual(C.fmt(4700, "Ω"), "4,7 kΩ");
  assert.strictEqual(C.fmt(1e-6, "F"), "1 µF");
  assert.strictEqual(C.fmt(-12, "V"), "−12 V");
  assert.deepStrictEqual(C.colorCode(4700), [4, 7, 2]);
  assert.deepStrictEqual(C.colorCode(10), [1, 0, 0]);
  assert.deepStrictEqual(C.colorCode(330), [3, 3, 1]);
});

test("astable multivibratör: geçici rejim yakınsar, KCL sağlanır, salınır", () => {
  const npn = C.models.npn;
  const s = C.create({ method: "be", elements: [
    { type: "V", id: "V", n: ["vcc", "0"], V: 5 },
    { type: "R", id: "R1", n: ["vcc", "l1"], R: 220 }, { type: "D", id: "LED1", n: ["l1", "c1"], ...C.led(2.0) },
    { type: "R", id: "R4", n: ["vcc", "l2"], R: 220 }, { type: "D", id: "LED2", n: ["l2", "c2"], ...C.led(2.0) },
    { type: "R", id: "RB2", n: ["vcc", "b2"], R: 47000 }, { type: "R", id: "RB1", n: ["vcc", "b1"], R: 47000 },
    { type: "C", id: "C1", n: ["c1", "b2"], C: 10e-6, v0: 0.4 }, { type: "C", id: "C2", n: ["b1", "c2"], C: 10e-6, v0: 0 },
    { type: "Q", id: "Q1", n: ["c1", "b1", "0"], ...npn }, { type: "Q", id: "Q2", n: ["c2", "b2", "0"], ...npn },
  ] });
  s.tranInit({ uic: true });
  let edges = 0, last = null, worst = 0;
  for (let k = 0; k < 4000; k++) {
    s.step(1e-3);
    assert.ok(s.converged, "adım " + k);
    worst = Math.max(worst, s.kclError());
    const on = s.v("c1") < 1;
    if (last !== null && on !== last) edges++;
    last = on;
  }
  assert.ok(worst < 1e-6, "KCL " + worst);
  assert.ok(edges >= 10, "salınım kenarı " + edges);
  // gizli eklem kapasiteleri kullanıcı listesinde görünmez
  assert.strictEqual(s.elements.length, 11);
});
