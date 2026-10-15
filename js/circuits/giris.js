/* Devre tanımları (veri): kapak ve 1–2. bölümler.
   Koordinatlar ızgara birimidir; parçaların pim konumları schematic.js'deki kütüphanede. */
window.CIRCUITS = window.CIRCUITS || {};

/* Kapak: iki transistörlü astable multivibratör. Her transistör sırayla doyuma girer,
   kondansatörler karşı transistörün bazını kesime iter; LED'ler sırayla yanar.
   f ≈ 1 / (1,38 · RB · C) */
CIRCUITS.astable = {
  title: "Astable multivibratör",
  method: "be",
  tran: { h: 1e-3, rate: 1 },
  tranInit: { uic: true },
  vRange: [0, 5],
  iRef: 0.012,
  parts: [
    { id: "V", type: "rail", at: [12, 0], V: 5 },
    { id: "R1", type: "resistor", at: [5, 3], rot: 90, R: 220 },
    { id: "LED1", type: "led", at: [5, 8], rot: 90, color: "kirmizi", label: "LED1" },
    { id: "RB2", type: "resistor", at: [10, 6], rot: 90, R: 47000, label: "RB2 47 kΩ" },
    { id: "RB1", type: "resistor", at: [14, 6], rot: 90, R: 47000, label: "RB1 47 kΩ" },
    { id: "R4", type: "resistor", at: [19, 3], rot: 90, R: 220 },
    { id: "LED2", type: "led", at: [19, 8], rot: 90, color: "kirmizi", label: "LED2" },
    { id: "C1", type: "capacitor", at: [8, 11], C: 10e-6, v0: 0.4, polar: true, lp: [0, -1.4] },
    { id: "C2", type: "capacitor", at: [16, 11], rot: 180, C: 10e-6, v0: 0, polar: true, lp: [0, -1.4] },
    { id: "Q1", type: "npn", at: [6, 14], rot: 180, flip: true, lp: [-3.2, 0] },
    { id: "Q2", type: "npn", at: [18, 14], lp: [3.2, 0] },
    { id: "GND", type: "ground", at: [12, 18] },
  ],
  wires: [
    [[5, 0], [19, 0]],
    [[5, 0], [5, 1]], [[10, 0], [10, 4]], [[14, 0], [14, 4]], [[19, 0], [19, 1]],
    [[5, 5], [5, 6]], [[5, 10], [5, 12]], [[5, 11], [6, 11]],
    [[19, 5], [19, 6]], [[19, 10], [19, 12]], [[18, 11], [19, 11]],
    [[10, 8], [10, 13], [16, 13], [16, 14]],
    [[14, 8], [14, 12], [8, 12], [8, 14]],
    [[5, 16], [5, 18], [19, 18], [19, 16]],
  ],
};

/* Ohm kanunu: pil + direnç + ampermetre */
CIRCUITS.ohm = {
  title: "Ohm kanunu devresi",
  iRef: 0.01,
  vRange: [0, 12],
  parts: [
    { id: "B1", type: "battery", at: [0, 4], rot: 90, V: 6, label: "B1" },
    { id: "A1", type: "ammeter", at: [5, 0], mp: [0, -1.8], label: false },
    { id: "R1", type: "resistor", at: [10, 4], rot: 90, R: 1000, Pmax: 5 },
  ],
  wires: [
    [[0, 2], [0, 0], [3, 0]],
    [[7, 0], [10, 0], [10, 2]],
    [[10, 6], [10, 8], [0, 8], [0, 6]],
  ],
};
