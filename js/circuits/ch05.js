/* Devre tanımları (veri): 5. bölüm, yarı iletkenler ve diyot.
   Koordinatlar ızgara birimidir. Diyot modelleri basitleştirilmiştir (Shockley + seri direnç). */
window.CIRCUITS = window.CIRCUITS || {};
(function () {

/* PN eklemi: pil (−5…+5 V) + 100 Ω + diyot. Pil eksiye dönünce diyot ters kutuplanır. */
CIRCUITS.c5Pn = {
  title: "PN eklemi kutuplama devresi",
  iRef: 0.02,
  vRange: [-5, 5],
  parts: [
    { id: "B1", type: "battery", at: [0, 4], rot: 90, V: 0 },
    { id: "R1", type: "resistor", at: [4, 0], R: 100 },
    { id: "A1", type: "ammeter", at: [11, 0], mp: [0, -1.8], label: false },
    { id: "D1", type: "diode", at: [15, 4], rot: 90, label: "D1 (P → N)" },
  ],
  wires: [
    [[0, 2], [0, 0], [2, 0]],
    [[6, 0], [9, 0]],
    [[13, 0], [15, 0], [15, 2]],
    [[15, 6], [15, 8], [0, 8], [0, 6]],
  ],
};

/* Diyot I–V: kaynak + seri direnç + ampermetre + diyot; voltmetre diyotun uçlarında.
   Ampermetre yalnız diyot kolunda: voltmetrenin akımı ölçüme karışmaz. */
CIRCUITS.c5Iv = {
  title: "Diyot I–V devresi",
  iRef: 0.015,
  vRange: [-5, 10],
  parts: [
    { id: "B1", type: "battery", at: [0, 5], rot: 90, V: 2 },
    { id: "R1", type: "resistor", at: [4, 0], R: 220 },
    { id: "VM", type: "voltmeter", at: [9, 6], rot: 90, label: false },
    { id: "A1", type: "ammeter", at: [14, 3], rot: 90, label: false },
    { id: "D1", type: "diode", at: [14, 8], rot: 90, label: "D1" },
  ],
  wires: [
    [[0, 3], [0, 0], [2, 0]],
    [[6, 0], [14, 0], [14, 1]],
    [[9, 0], [9, 4]],
    [[14, 5], [14, 6]],
    [[14, 10], [14, 12], [0, 12], [0, 7]],
    [[9, 8], [9, 12]],
  ],
};

/* Doğrultucular. "trafo" parçası js/demos/ch05.js'de tanımlı: sekonder sargı 12 V tepe, 50 Hz.
   Sağ taraf (yük, anahtar + filtre kondansatörü, KN2 probu) iki devrede aynıdır. */
const C5_WAVE = { type: "sin", amp: 12, freq: 50 };
const C5_RIGHT = [
  { id: "RL", type: "resistor", at: [17, 5], rot: 90, R: 1000, label: "RL" },
  { id: "S1", type: "switch", at: [21, 3], rot: 90, closed: false, label: "S1", hotLabel: "S1 kondansatör anahtarı" },
  { id: "C1", type: "capacitor", at: [21, 7], rot: 90, C: 220e-6, polar: true, label: "C1" },
  { id: "KN2", type: "probe", at: [23, 0], text: "KN2", color: "#5fe3ff" },
  { id: "GND", type: "ground", at: [9, 10] },
];
const C5_RIGHT_WIRES = [
  [[17, 0], [17, 3]], [[17, 7], [17, 10]],
  [[21, 0], [21, 1]], [[21, 9], [21, 10]],
];
CIRCUITS.c5Half = {
  title: "Yarım dalga doğrultucu",
  method: "be",
  tran: { h: 1e-4, rate: 0.05 },
  tranInit: { uic: true },
  iRef: 0.012,
  vRange: [-12, 12],
  parts: [
    { id: "T1", type: "trafo", at: [2, 5], wave: C5_WAVE, label: false },
    { id: "KN1", type: "text", at: [5.6, 3.6], text: "KN1", color: "#ffd75e", weight: 750, size: 0.58 },
    { id: "TAG", type: "text", at: [6.4, 6.4], text: "12 V tepe · 50 Hz", size: 0.5 },
    { id: "D1", type: "diode", at: [8, 0], label: "D1" },
    ...C5_RIGHT,
  ],
  wires: [
    [[3.5, 2], [3.5, 0], [6, 0]],
    [[10, 0], [23, 0]],
    [[3.5, 8], [3.5, 10], [21, 10]],
    ...C5_RIGHT_WIRES,
  ],
};
/* Köprü: dört diyot iki kol hâlinde; sekonder sargı kolların ortasına (A ve B) bağlanır.
   Her yarım periyotta iki diyot seri iletir, akım yükten hep aynı yönde geçer. */
CIRCUITS.c5Bridge = {
  title: "Tam dalga köprü doğrultucu",
  method: "be",
  tran: { h: 1e-4, rate: 0.05 },
  tranInit: { uic: true },
  iRef: 0.012,
  vRange: [-12, 12],
  parts: [
    { id: "D1", type: "diode", at: [3, 2], rot: 270, label: "D1", lp: [-1.7, 0] },
    { id: "D3", type: "diode", at: [3, 6], rot: 270, label: "D3", lp: [-1.7, 0] },
    { id: "D2", type: "diode", at: [13, 2], rot: 270, label: "D2", lp: [1.7, 0] },
    { id: "D4", type: "diode", at: [13, 6], rot: 270, label: "D4", lp: [1.7, 0] },
    { id: "T1", type: "trafo", at: [8, 5.5], rot: 270, wave: C5_WAVE, label: false },
    { id: "KN1", type: "text", at: [8, 2.6], text: "KN1", color: "#ffd75e", weight: 750, size: 0.58 },
    { id: "TAG", type: "text", at: [8, 1.6], text: "12 V tepe · 50 Hz", size: 0.5 },
    ...C5_RIGHT,
  ],
  wires: [
    [[3, 0], [23, 0]],
    [[3, 8], [3, 10], [21, 10]],
    [[13, 8], [13, 10]],
    [[3, 4], [5, 4]], [[11, 4], [13, 4]],
    ...C5_RIGHT_WIRES,
  ],
};

/* LED renkleri: aynı besleme, aynı 220 Ω, üç renk. Her kolda bir ampermetre. */
CIRCUITS.c5Led = {
  title: "LED renkleri devresi",
  iRef: 0.012,
  vRange: [0, 9],
  parts: [
    { id: "B1", type: "battery", at: [0, 7], rot: 90, V: 5 },
    ...[["kirmizi", 6, "Kırmızı"], ["yesil", 12, "Yeşil"], ["mavi", 18, "Mavi"]].flatMap(([c, x, name], k) => [
      { id: "A" + (k + 1), type: "ammeter", at: [x, 3], rot: 90, label: false },
      { id: "R" + (k + 1), type: "resistor", at: [x, 7], rot: 90, R: 220 },
      { id: "LED" + (k + 1), type: "led", at: [x, 11], rot: 90, color: c, label: name, lp: [2.4, 0] },
    ]),
    { id: "GND", type: "ground", at: [3, 15] },
  ],
  wires: [
    [[0, 5], [0, 0], [18, 0], [18, 1]],
    [[6, 0], [6, 1]], [[12, 0], [12, 1]],
    [[0, 9], [0, 15], [18, 15], [18, 13]],
    [[6, 13], [6, 15]], [[12, 13], [12, 15]],
  ],
};

/* Zener regülatörü: giriş − seri direnç − (5,1 V zener ∥ anahtarlı yük ∥ voltmetre). */
CIRCUITS.c5Zener = {
  title: "Zener regülatörü",
  iRef: 0.015,
  vRange: [0, 15],
  parts: [
    { id: "B1", type: "battery", at: [0, 4], rot: 90, V: 12, label: "Giriş" },
    { id: "RS", type: "resistor", at: [5, 0], R: 330, Pmax: 0.5, label: "RS 330 Ω" },
    { id: "DZ", type: "zener", at: [9, 4], rot: 270, Vz: 5.1, label: "DZ 5,1 V" },
    { id: "S1", type: "switch", at: [14, 2], rot: 90, closed: true, label: "S1", hotLabel: "S1 yük anahtarı" },
    { id: "RL", type: "resistor", at: [14, 6], rot: 90, R: 1000, label: "RL" },
    { id: "VM", type: "voltmeter", at: [19, 4], rot: 90, label: false },
    { id: "GND", type: "ground", at: [4, 8] },
  ],
  wires: [
    [[0, 2], [0, 0], [3, 0]],
    [[7, 0], [19, 0], [19, 2]],
    [[9, 0], [9, 2]], [[9, 6], [9, 8]],
    [[19, 6], [19, 8], [0, 8], [0, 6]],
  ],
};
})();
