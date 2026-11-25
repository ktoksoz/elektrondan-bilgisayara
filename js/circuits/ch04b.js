/* Devre tanımları (veri): 4. bölüm, ikinci yarı: reaktans, empedans, hesaplayıcı, rezonans.
   Hepsi sinüs kaynaklı geçici rejim benzetimidir; adım boyu ve hız demo tarafından frekansa göre ayarlanır. */
window.CIRCUITS = window.CIRCUITS || {};

/* Reaktans: AC kaynağına tek eleman (direnç, kondansatör ya da bobin). X1 demo tarafından değiştirilir. */
CIRCUITS.c4react = {
  title: "AC kaynağı ve tek eleman",
  pad: 0.8, padTop: 1,
  method: "trap",
  tran: { h: 1e-4, rate: 0.01 },
  tranInit: { uic: true },
  vRange: [-5, 5],
  iRef: 0.004,
  parts: [
    { id: "V1", type: "vac", at: [0, 3], rot: 90, wave: { type: "sin", amp: 5, freq: 100 }, label: "V1 5 V tepe" },
    { id: "X1", type: "resistor", at: [9, 3], rot: 90, R: 1000 },
    { id: "GND", type: "ground", at: [4, 7] },
    { id: "P1", type: "probe", at: [2, -3], text: "KN1" },
  ],
  wires: [
    [[0, 1], [0, -1], [6, -1]],
    [[6, -1], [9, -1], [9, 1]],
    [[2, -1], [2, -3]],
    [[9, 5], [9, 7], [0, 7], [0, 5]],
  ],
};

/* Kara kutu: kaynak ve içi görünmeyen iki uçlu bir kutu (c4box, demo dosyasında tanımlı). */
CIRCUITS.c4box = {
  title: "Kara kutu",
  pad: 0.8, padTop: 1,
  method: "trap",
  tran: { h: 1e-5, rate: 0.001 },
  tranInit: { uic: true },
  vRange: [-5, 5],
  iRef: 0.01,
  parts: [
    { id: "V1", type: "vac", at: [0, 3], rot: 90, wave: { type: "sin", amp: 5, freq: 1000 }, label: "V1 5 V tepe" },
    { id: "X1", type: "c4box", at: [9, 3], kind: "A", open: false, label: false },
    { id: "GND", type: "ground", at: [4, 6] },
    { id: "P1", type: "probe", at: [2, -2], text: "KN1" },
  ],
  wires: [
    [[0, 1], [0, 0], [6, 0]],
    [[6, 0], [9, 0]],
    [[2, 0], [2, -2]],
    [[9, 6], [0, 6], [0, 5]],
  ],
};

/* Rezonans: seri RLC (KN2 kondansatör gerilimi) ve paralel LC tank (KN2 tank gerilimi). */
CIRCUITS.c4series = {
  title: "Seri RLC",
  pad: 0.8, padTop: 1,
  method: "trap",
  tran: { h: 5e-6, rate: 0.006 },
  tranInit: { uic: true },
  vRange: [-1, 1],
  iRef: 0.01,
  parts: [
    { id: "V1", type: "vac", at: [0, 3], rot: 90, wave: { type: "sin", amp: 1, freq: 1000 }, label: "V1 1 V tepe" },
    { id: "R1", type: "resistor", at: [4, 0], R: 10 },
    { id: "L1", type: "inductor", at: [9, 0], L: 0.01 },
    { id: "C1", type: "capacitor", at: [13, 3], rot: 90, C: 1e-6 },
    { id: "GND", type: "ground", at: [6, 6] },
    { id: "P1", type: "probe", at: [1, -2], text: "KN1" },
    { id: "P2", type: "probe", at: [15, 0], text: "KN2", color: "#5fe3ff" },
  ],
  wires: [
    [[0, 1], [0, 0], [2, 0]],
    [[1, 0], [1, -2]],
    [[6, 0], [7, 0]],
    [[11, 0], [13, 0], [13, 1]],
    [[13, 0], [15, 0]],
    [[13, 5], [13, 6], [0, 6], [0, 5]],
  ],
};
CIRCUITS.c4tank = {
  title: "Paralel LC tank devresi",
  pad: 0.8, padTop: 1,
  method: "trap",
  tran: { h: 5e-6, rate: 0.006 },
  tranInit: { uic: true },
  vRange: [-1, 1],
  iRef: 0.0005,
  parts: [
    { id: "V1", type: "vac", at: [0, 3], rot: 90, wave: { type: "sin", amp: 1, freq: 1000 }, label: "V1 1 V tepe" },
    { id: "R1", type: "resistor", at: [4, 0], R: 1000 },
    { id: "L1", type: "inductor", at: [9, 3], rot: 90, L: 0.01, Rs: 1 },
    { id: "C1", type: "capacitor", at: [13, 3], rot: 90, C: 1e-6 },
    { id: "GND", type: "ground", at: [6, 6] },
    { id: "P1", type: "probe", at: [1, -2], text: "KN1" },
    { id: "P2", type: "probe", at: [15, 0], text: "KN2", color: "#5fe3ff" },
  ],
  wires: [
    [[0, 1], [0, 0], [2, 0]],
    [[1, 0], [1, -2]],
    [[6, 0], [9, 0]],
    [[9, 0], [13, 0]],
    [[9, 0], [9, 1]],
    [[13, 0], [13, 1]],
    [[13, 0], [15, 0]],
    [[9, 5], [9, 6]],
    [[13, 5], [13, 6], [0, 6], [0, 5]],
  ],
};

/* Empedans hesaplayıcı: bağlantı biçimine ve devredeki elemanlara göre şema üretir.
   o = { A, f, R, L, C }, an = AC.analyze(...) sonucu: kondansatör gerilimi ve bobin akımı
   t = 0'daki kalıcı rejim değeriyle başlar (benzetim geçici rejim yaşamaz). */
CIRCUITS.c4calc = function (topo, an, o) {
  const T = 1 / o.f;
  const v0 = an.parts.C ? an.parts.C.V.im : 0, i0 = an.parts.L ? an.parts.L.I.im : 0;
  const mk = {
    R: (at, rot) => ({ id: "R1", type: "resistor", at, rot, R: o.R }),
    L: (at, rot) => ({ id: "L1", type: "inductor", at, rot, L: o.L, i0 }),
    C: (at, rot) => ({ id: "C1", type: "capacitor", at, rot, C: o.C, v0 }),
  };
  const parts = [], wires = [];
  const src = (y) => parts.push({ id: "V1", type: "vac", at: [0, y], rot: 90, wave: { type: "sin", amp: o.A, freq: o.f }, label: "V1" });
  if (topo === "seri") {
    src(4);
    const on = an.on;
    wires.push([[0, 2], [0, 0], [1, 0]]);
    on.forEach((k, i) => {
      const x = 3 + 5 * i;
      parts.push(mk[k]([x, 0], 0));
      if (i < on.length - 1) wires.push([[x + 2, 0], [x + 3, 0]]);
    });
    const xe = 3 + 5 * (on.length - 1) + 2;
    wires.push([[xe, 0], [xe + 1, 0], [xe + 1, 8], [0, 8], [0, 6]]);
    parts.push({ id: "GND", type: "ground", at: [Math.round((xe + 1) / 2), 8] });
  } else if (topo === "paralel") {
    src(4);
    const on = an.on, xs = on.map((k, i) => 5 + 4 * i), xl = xs[xs.length - 1];
    wires.push([[0, 2], [0, 0], [xl, 0]], [[0, 6], [0, 8], [xl, 8]]);
    on.forEach((k, i) => {
      const x = xs[i];
      parts.push(mk[k]([x, 4], 90));
      wires.push([[x, 0], [x, 2]], [[x, 6], [x, 8]]);
    });
    parts.push({ id: "GND", type: "ground", at: [2, 8] });
  } else if (topo === "r-lc") {
    src(4);
    parts.push(mk.R([3, 0], 0), mk.L([9, 4], 90), mk.C([13, 4], 90));
    wires.push([[0, 2], [0, 0], [1, 0]], [[5, 0], [9, 0]], [[9, 0], [13, 0]], [[9, 0], [9, 2]], [[13, 0], [13, 2]],
      [[9, 6], [9, 8]], [[13, 6], [13, 8], [0, 8], [0, 6]]);
    parts.push({ id: "GND", type: "ground", at: [4, 8] });
  } else {
    src(5);
    parts.push(mk.R([6, 3], 90), mk.L([6, 8], 90), mk.C([12, 5], 90));
    wires.push([[0, 3], [0, 0], [6, 0]], [[6, 0], [12, 0]], [[6, 0], [6, 1]], [[6, 5], [6, 6]], [[6, 10], [6, 11]],
      [[12, 0], [12, 3]], [[12, 7], [12, 11]], [[0, 7], [0, 11], [6, 11]], [[6, 11], [12, 11]]);
    parts.push({ id: "GND", type: "ground", at: [3, 11] });
  }
  const Ip = Math.max(1e-9, ...["R", "L", "C"].filter((k) => an.parts[k]).map((k) => window.AC.abs(an.parts[k].I)));
  return {
    title: "Empedans hesaplayıcı: " + topo,
    pad: 0.8, padTop: 1.2,
    method: "trap",
    tran: { h: T / 120, rate: T / 1.4 },
    tranInit: { uic: true },
    vRange: [-o.A, o.A],
    iRef: Ip * 0.6,
    parts, wires,
  };
};
