/* Devre tanımları (veri): 1. bölüm (elektrik nedir?) ve 2. bölümün güç, LED ve renk kodu slaytları.
   Koordinatlar ızgara birimidir; parçaların pim konumları schematic.js'deki kütüphanede. */
window.CIRCUITS = window.CIRCUITS || {};

/* Su benzetmesi: pil + ampermetre + direnç + anahtar. Su devresi aynı yerleşimi taklit eder:
   pil ↔ pompa (sol), ampermetre ↔ debimetre (üst), direnç ↔ daralma (sağ), anahtar ↔ vana (alt). */
CIRCUITS.c1su = {
  title: "Su benzetmesi devresi",
  iRef: 0.012,
  vRange: [0, 12],
  parts: [
    { id: "B1", type: "battery", at: [0, 4], rot: 90, V: 6, label: "B1 pil", lp: [-2.4, 0] },
    { id: "A1", type: "ammeter", at: [5, 0], mp: [0, -1.8], label: false },
    { id: "R1", type: "resistor", at: [10, 4], rot: 90, R: 1000 },
    { id: "S1", type: "switch", at: [5, 8], closed: true, label: "S1 anahtar", lp: [0, 1.4], hotLabel: "Anahtar S1" },
  ],
  wires: [
    [[0, 2], [0, 0], [3, 0]],
    [[7, 0], [10, 0], [10, 2]],
    [[10, 6], [10, 8], [7, 8]],
    [[3, 8], [0, 8], [0, 6]],
  ],
};

/* Akımın yönü: pil + anahtar + lamba. loop: elektron çiziminin izlediği kapalı yol
   (geleneksel akım yönünde: pilin artı ucundan çıkar, lambadan geçer, eksi uca döner). */
CIRCUITS.c1yon = {
  title: "Akım yönü devresi",
  iRef: 0.25,
  vRange: [0, 12],
  parts: [
    { id: "B1", type: "battery", at: [0, 4], rot: 90, V: 6, label: "B1", lp: [-2.2, 0] },
    { id: "S1", type: "switch", at: [5, 0], closed: true, label: "S1", lp: [0, 1.5], hotLabel: "Anahtar S1" },
    { id: "LA1", type: "lamp", at: [10, 4], rot: 90, R: 12, Pnom: 6, label: "Lamba 12 Ω" },
  ],
  wires: [
    [[0, 2], [0, 0], [3, 0]],
    [[7, 0], [10, 0], [10, 2]],
    [[10, 6], [10, 8], [0, 8], [0, 6]],
  ],
  bounds: [-3, -3.4, 13, 9],
  loop: [[0, 2], [0, 0], [10, 0], [10, 8], [0, 8], [0, 2]],
  // elektron noktalarının çizilmediği gövdeler: [x, y, yarıçap]
  bodies: [[0, 4, 0.5], [10, 4, 0.95], [5, 0, 1.0]],
};

/* İletken / yalıtkan / yarı iletken: pil + koruma direnci + malzeme numunesi + ampermetre.
   Numunenin direnci R = ρ·L/A (L = 1 cm, A = 1 mm²); ρ malzemeye ve sıcaklığa göre demo kodunda hesaplanır. */
CIRCUITS.c1numune = {
  title: "Malzeme numunesi devresi",
  iRef: 0.02,
  vRange: [0, 10],
  parts: [
    { id: "B1", type: "battery", at: [0, 4], rot: 90, V: 5, label: "B1", lp: [-2.2, 0] },
    { id: "RK", type: "resistor", at: [5, 0], R: 100, label: "Koruma 100 Ω" },
    { id: "N1", type: "c1sample", at: [10, 4], rot: 90, R: 1.7e-4, mat: "bakir", label: "Bakır", lp: [2.9, 0] },
    { id: "A1", type: "ammeter", at: [5, 8], rot: 180, mp: [0, 1.8], label: false },
  ],
  wires: [
    [[0, 2], [0, 0], [3, 0]],
    [[7, 0], [10, 0], [10, 2]],
    [[10, 6], [10, 8], [7, 8]],
    [[3, 8], [0, 8], [0, 6]],
  ],
};

/* Güç ve ısı: ayarlı besleme + ampermetre + güç sınırlı direnç + paralel voltmetre */
CIRCUITS.c1guc = {
  title: "Güç ve ısı devresi",
  iRef: 0.05,
  vRange: [0, 40],
  parts: [
    { id: "B1", type: "battery", at: [0, 4], rot: 90, V: 5, label: "Besleme", lp: [-2.8, 0] },
    { id: "A1", type: "ammeter", at: [5, 0], mp: [0, -1.8], label: false },
    { id: "R1", type: "resistor", at: [10, 4], rot: 90, R: 100, Pmax: 0.25, lp: [-2.6, 0] },
    { id: "V1", type: "voltmeter", at: [15, 4], rot: 90, mp: [-2.4, 0], label: false },
  ],
  wires: [
    [[0, 2], [0, 0], [3, 0]],
    [[7, 0], [15, 0], [15, 2]],
    [[10, 2], [10, 0]],
    [[15, 6], [15, 8], [0, 8], [0, 6]],
    [[10, 6], [10, 8]],
  ],
};

/* LED direnci: besleme + seri direnç + LED + ampermetre. Direnç çıkarılınca R1 yerine düz tel konur. */
CIRCUITS.c1led = {
  title: "LED ve seri direnç devresi",
  iRef: 0.012,
  vRange: [0, 12],
  parts: [
    { id: "B1", type: "battery", at: [0, 4], rot: 90, V: 5, label: "Besleme", lp: [-2.8, 0] },
    { id: "R1", type: "resistor", at: [5, 0], R: 330, Pmax: 0.25 },
    { id: "LED1", type: "led", at: [10, 4], rot: 90, color: "kirmizi", label: "LED1" },
    { id: "A1", type: "ammeter", at: [5, 8], rot: 180, mp: [0, 1.8], label: false },
  ],
  wires: [
    [[0, 2], [0, 0], [3, 0]],
    [[7, 0], [10, 0], [10, 2]],
    [[10, 6], [10, 8], [7, 8]],
    [[3, 8], [0, 8], [0, 6]],
  ],
  // "Direnci çıkar": R1 yerine konan tel
  bypass: [[3, 0], [7, 0]],
};

/* Renk kodu: okunan direnç bir ohmmetre gibi 1 V ile ölçülür (doğrulama) */
CIRCUITS.c1olcum = {
  title: "Renk kodu ölçümü",
  iRef: 0.001,
  vRange: [0, 1],
  parts: [
    { id: "B1", type: "battery", at: [0, 4], rot: 90, V: 1, label: "1 V", lp: [-2, 0] },
    { id: "A1", type: "ammeter", at: [5, 0], mp: [0, -1.8], label: false },
    { id: "RX", type: "resistor", at: [10, 4], rot: 90, R: 1000, label: "Rx" },
  ],
  wires: [
    [[0, 2], [0, 0], [3, 0]],
    [[7, 0], [10, 0], [10, 2]],
    [[10, 6], [10, 8], [0, 8], [0, 6]],
  ],
};
