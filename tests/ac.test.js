// AC hesabı testleri: karmaşık sayılar, empedans formülleri ve çözücüyle (geçici rejim) karşılaştırma.
const test = require("node:test");
const assert = require("node:assert");
const AC = require("../js/ac.js");
const Circuit = require("../js/circuit.js");

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} beklenen ${b}, bulunan ${a}`);
const rel = (a, b, r, msg) => assert.ok(Math.abs(a - b) <= r * Math.abs(b), `${msg || ""} beklenen ${b}, bulunan ${a}`);

test("karmaşık aritmetik", () => {
  const a = AC.cx(3, 4), b = AC.cx(1, -2);
  near(AC.abs(a), 5, 1e-12);
  const q = AC.div(AC.mul(a, b), b);
  near(q.re, 3, 1e-12); near(q.im, 4, 1e-12);
  const p = AC.polar(2, Math.PI / 2);
  near(p.re, 0, 1e-12); near(p.im, 2, 1e-12);
});

test("reaktans formülleri: 1 kHz'te 10 mH ≈ 62,8 Ω, 1 µF ≈ 159 Ω", () => {
  near(AC.reactL(10e-3, 1000), 62.83, 0.01);
  near(AC.reactC(1e-6, 1000), 159.15, 0.01);
  near(AC.f0(10e-3, 1e-6), 1591.5, 0.1);
});

test("seri RLC: Z = R + j(XL − XC), rezonansta Z = R", () => {
  const o = { A: 10, f: 1000, R: 100, L: 10e-3, C: 1e-6 };
  const a = AC.analyze("seri", o);
  near(a.Z.re, 100, 1e-9);
  near(a.Z.im, AC.reactL(o.L, o.f) - AC.reactC(o.C, o.f), 1e-9);
  const r = AC.analyze("seri", { ...o, f: AC.f0(o.L, o.C) });
  near(r.Z.im, 0, 1e-9); near(AC.abs(r.I), 0.1, 1e-9);
  // KVL fazörlerle: VR + VL + VC = V
  const s = AC.sum(a.chainV.map((c) => c.v));
  near(s.re, 10, 1e-9); near(s.im, 0, 1e-9);
  // güç yalnızca dirençte harcanır: P = ½ |I|² R
  near(a.P, 0.5 * AC.abs(a.I) ** 2 * 100, 1e-12);
});

test("paralel: KCL fazörlerle ve 1/Z = Σ 1/Zk", () => {
  const o = { A: 5, f: 500, R: 220, L: 47e-3, C: 2.2e-6 };
  const a = AC.analyze("paralel", o);
  const s = AC.sum(a.chainI.map((c) => c.v));
  near(s.re, a.I.re, 1e-12); near(s.im, a.I.im, 1e-12);
  const y = AC.add(AC.add(AC.inv(AC.zR(220)), AC.inv(AC.zL(47e-3, a.w))), AC.inv(AC.zC(2.2e-6, a.w)));
  const z = AC.inv(y);
  near(a.Z.re, z.re, 1e-9); near(a.Z.im, z.im, 1e-9);
});

test("seçilmeyen eleman: seride kısa devre, paralelde açık devre", () => {
  const o = { A: 1, f: 1000, R: 100, L: 10e-3, C: 1e-6 };
  const s = AC.analyze("seri", { ...o, use: { R: true, L: false, C: false } });
  near(s.Z.re, 100, 1e-9); near(s.Z.im, 0, 1e-9);
  const p = AC.analyze("paralel", { ...o, use: { R: true, L: false, C: false } });
  near(p.Z.re, 100, 1e-9); near(p.Z.im, 0, 1e-9);
});

// çözücüde kalıcı rejimden başlat, son periyotta DFT ile V ve I fazörlerini ölç
function measure(topo, o) {
  const an = AC.analyze(topo, o);
  const sim = Circuit.create({ method: "trap", elements: AC.netlist(topo, o, an) });
  sim.tranInit({ uic: true });
  const N = 400, T = 1 / o.f, h = T / N;
  const ts = [], vs = [], is = [];
  for (let k = 1; k <= 3 * N; k++) {
    sim.step(h);
    if (k > 2 * N) { ts.push(sim.t); vs.push(sim.v("in")); is.push(-sim.i("V")); }
  }
  const V = AC.phasorOf(ts, vs, o.f), I = AC.phasorOf(ts, is, o.f);
  return { an, V, I, Z: AC.div(V, I) };
}

for (const topo of AC.TOPOS) {
  test(`çözücü ile aynı: ${topo}`, () => {
    for (const f of [200, 1000, 4000]) {
      const o = { A: 10, f, R: 150, L: 22e-3, C: 1e-6 };
      const m = measure(topo, o);
      rel(AC.abs(m.Z), AC.abs(m.an.Z), 0.01, `${topo} ${f} Hz |Z|`);
      near(AC.arg(m.Z), m.an.phi, 0.01, `${topo} ${f} Hz faz`);
    }
  });
}
