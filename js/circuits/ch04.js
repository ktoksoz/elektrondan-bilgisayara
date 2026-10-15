/* Devre tanımları (veri): 4. bölüm — zaman: kondansatör ve bobin.
   Hepsi geçici rejimde (tran) çalışır; adım boyu ve hız demo tarafından değere göre ayarlanır. */
window.CIRCUITS = window.CIRCUITS || {};

/* RC şarj / deşarj: pil, iki konumlu anahtar (c4spdt), direnç, kondansatör.
   Anahtar "Şarj" konumunda direnci pile, "Deşarj" konumunda toprağa bağlar; τ = R·C iki yönde de aynı. */
CIRCUITS.c4rc = {
  title: "RC şarj ve deşarj devresi",
  pad: 0.6, padTop: 1,
  method: "trap",
  tran: { h: 5e-3, rate: 1 },
  tranInit: { uic: true },
  vRange: [0, 5],
  iRef: 0.0005,
  parts: [
    { id: "B1", type: "battery", at: [0, 5], rot: 90, V: 5, lp: [-2.4, 0] },
    { id: "S1", type: "c4spdt", at: [5, 3], closed: false, hotLabel: "S1 anahtarı", label: false },
    { id: "R1", type: "resistor", at: [9, 3], R: 10000 },
    { id: "C1", type: "capacitor", at: [13, 5], rot: 90, C: 100e-6, v0: 0 },
    { id: "GND", type: "ground", at: [7, 8] },
    { id: "P1", type: "probe", at: [15, 3], text: "KN1" },
  ],
  wires: [
    [[0, 3], [0, 2], [3, 2]],
    [[3, 4], [3, 8]],
    [[11, 3], [15, 3]],
    [[13, 7], [13, 8], [0, 8], [0, 7]],
  ],
};

/* Röle bobini: pil + bobin (L ve sargı direnci) + alttan anahtar. Anahtar açıkken uçları arasında
   2,2 kΩ'luk bir "kaçak" yol vardır (roff); yoksa ideal modelde sıçrama sonsuz olurdu.
   c4coilDiode: aynı devre + bobine ters paralel serbest geçiş diyodu. */
CIRCUITS.c4coil = {
  title: "Röle bobini ve anahtar",
  pad: 0.8, padTop: 1,
  method: "be",
  tran: { h: 2e-6, rate: 0.01 },
  tranInit: { uic: false },
  vRange: [0, 12],
  iRef: 0.1,
  parts: [
    { id: "B1", type: "battery", at: [0, 5], rot: 90, V: 12, lp: [-2.6, 0] },
    { id: "L1", type: "inductor", at: [4, 3], L: 0.5 },
    { id: "RL", type: "resistor", at: [9, 3], R: 120, label: "R 120 Ω" },
    { id: "S1", type: "switch", at: [14, 5], rot: 90, closed: false, roff: 2200, hotLabel: "S1 anahtarı", label: "S1", lp: [2.2, 0] },
    { id: "GND", type: "ground", at: [7, 7] },
    { id: "P1", type: "probe", at: [17, 3], text: "KN1" },
  ],
  wires: [
    [[0, 3], [2, 3]],
    [[6, 3], [7, 3]],
    [[11, 3], [17, 3]],
    [[14, 7], [0, 7]],
  ],
};
CIRCUITS.c4coilDiode = {
  parts: [{ id: "D1", type: "diode", at: [8, 0], rot: 180, label: "D1" }],
  wires: [[[1, 3], [1, 0], [6, 0]], [[10, 0], [12, 0], [12, 3]]],
};

/* AC kaynağı ile lamba, yanında aynı lambayı süren DC pil (değeri ölçülen RMS'e eşitlenir). */
CIRCUITS.c4ac = {
  title: "AC ve eşdeğer DC lamba",
  method: "trap",
  tran: { h: 2e-4, rate: 1 },
  tranInit: { uic: true },
  vRange: [-10, 10],
  iRef: 0.1,
  parts: [
    { id: "V1", type: "vac", at: [0, 4], rot: 90, wave: { type: "sin", amp: 10, freq: 2 }, label: "V1 AC" },
    { id: "La1", type: "c4lamp", at: [6, 4], rot: 90, R: 100, Pnom: 0.5, label: "La1" },
    { id: "G1", type: "ground", at: [3, 8] },
    { id: "P1", type: "probe", at: [8, 0], text: "KN1" },
    { id: "B1", type: "battery", at: [13, 4], rot: 90, V: 7.07, label: "B1 DC" },
    { id: "La2", type: "c4lamp", at: [19, 4], rot: 90, R: 100, Pnom: 0.5, label: "La2" },
    { id: "G2", type: "ground", at: [16, 8] },
    { id: "P2", type: "probe", at: [21, 0], text: "KN2", color: "#5fe3ff" },
  ],
  wires: [
    [[0, 2], [0, 0], [8, 0]], [[6, 0], [6, 2]],
    [[0, 6], [0, 8], [6, 8], [6, 6]],
    [[13, 2], [13, 0], [21, 0]], [[19, 0], [19, 2]],
    [[13, 6], [13, 8], [19, 8], [19, 6]],
  ],
};

/* RC alçak geçiren filtre: sinüs kaynağı → R → çıkış düğümü → C → toprak. */
CIRCUITS.c4lpf = {
  title: "RC alçak geçiren filtre",
  method: "be",
  tran: { h: 2e-5, rate: 0.01 },
  tranInit: { uic: true },
  vRange: [-1, 1],
  iRef: 0.0004,
  parts: [
    { id: "V1", type: "vac", at: [0, 3], rot: 90, wave: { type: "sin", amp: 1, freq: 500 }, label: "Giriş" },
    { id: "R1", type: "resistor", at: [5, 0], R: 1000 },
    { id: "C1", type: "capacitor", at: [10, 2], rot: 90, C: 100e-9 },
    { id: "G1", type: "ground", at: [5, 6] },
    { id: "P1", type: "probe", at: [2, -2], text: "KN1" },
    { id: "P2", type: "probe", at: [12, 0], text: "KN2", color: "#5fe3ff" },
  ],
  wires: [
    [[0, 1], [0, 0], [3, 0]],
    [[2, 0], [2, -2]],
    [[7, 0], [12, 0]],
    [[0, 5], [0, 6], [10, 6], [10, 4]],
  ],
};
