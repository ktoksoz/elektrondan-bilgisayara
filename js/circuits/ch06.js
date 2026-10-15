/* Devre tanımları (veri): 6. bölüm (BJT) ve 7. bölüm (MOSFET).
   "c6mcu" parçası js/demos/ch06.js'de tanımlanır: iç dirençli bir mikrodenetleyici pini. */
window.CIRCUITS = window.CIRCUITS || {};

/* 6.1 Musluk: küçük baz akımı (akım kaynağı) büyük kollektör akımını kontrol eder */
CIRCUITS.c6Musluk = {
  title: "BJT musluk devresi",
  iRef: 0.012,
  vRange: [0, 9],
  parts: [
    { id: "VCC", type: "rail", at: [12, 0], V: 9 },
    { id: "VCC2", type: "rail", at: [4, 2], V: 9 },
    { id: "RC", type: "resistor", at: [12, 3], rot: 90, R: 330, label: "RC 330 Ω" },
    { id: "LED1", type: "led", at: [12, 8], rot: 90, color: "kirmizi", label: "LED" },
    { id: "AC", type: "ammeter", at: [12, 13], rot: 90, label: false, mp: [2.4, 0] },
    { id: "IB", type: "isource", at: [4, 6], rot: 90, I: 100e-6, label: "IB", lp: [-2.6, 0] },
    { id: "AB", type: "ammeter", at: [4, 12], rot: 90, label: false, mp: [-2.4, 0] },
    { id: "Q1", type: "npn", at: [11, 18], label: "Q1", lp: [2.8, 0.2] },
    { id: "GND", type: "ground", at: [12, 22] },
  ],
  wires: [
    [[12, 0], [12, 1]], [[12, 5], [12, 6]], [[12, 10], [12, 11]], [[12, 15], [12, 16]], [[12, 20], [12, 22]],
    [[4, 2], [4, 4]], [[4, 8], [4, 10]], [[4, 14], [4, 18], [9, 18]],
  ],
};

/* 6.2 Anahtar olarak BJT. Ortak yerleşim: MCU pini solda, transistör (12. satırda) ortada,
   yük üstte. Aynı "bounds" ile modlar arasında çizim ölçeği değişmez. */
const C6_SW_BOUNDS = [-3, -1.5, 20, 17.5];
const C6_PIN = [
  { id: "MCU", type: "c6mcu", at: [0, 12], V: 3.3, Rint: 40, closed: true, hotLabel: "Pin", label: false },
  { id: "GND1", type: "ground", at: [0, 15] },
  { id: "A1", type: "ammeter", at: [5, 12], label: false, mp: [0, -1.8] },
];
CIRCUITS.c6SwMotor = {
  title: "BJT anahtar — motor",
  iRef: 0.1,
  vRange: [0, 5],
  bounds: C6_SW_BOUNDS,
  parts: C6_PIN.concat([
    { id: "RB", type: "resistor", at: [9, 12], R: 1000 },
    { id: "Q1", type: "npn", at: [13, 12], label: "Q1", lp: [-0.6, 2.8] },
    { id: "GND2", type: "ground", at: [14, 15] },
    { id: "VCC", type: "rail", at: [14, 1], V: 5 },
    { id: "M1", type: "motor", at: [14, 6], rot: 90, R: 25, label: "Motor 25 Ω", lp: [-3.6, 0] },
    { id: "D1", type: "diode", at: [18, 6], rot: 270, label: "D1", lp: [1.8, 0] },
  ]),
  wires: [
    [[14, 14], [14, 15]],
    [[14, 1], [14, 4]], [[14, 8], [14, 10]],
    [[14, 2], [18, 2], [18, 4]], [[18, 8], [18, 9], [14, 9]],
  ],
};
CIRCUITS.c6SwLed = {
  title: "BJT anahtar — güç LED'i",
  iRef: 0.1,
  vRange: [0, 5],
  bounds: C6_SW_BOUNDS,
  parts: C6_PIN.concat([
    { id: "RB", type: "resistor", at: [9, 12], R: 1000 },
    { id: "Q1", type: "npn", at: [13, 12], label: "Q1", lp: [-0.6, 2.8] },
    { id: "GND2", type: "ground", at: [14, 15] },
    { id: "VCC", type: "rail", at: [14, 1], V: 5 },
    { id: "RL", type: "resistor", at: [14, 4], rot: 90, R: 6.8, label: "6,8 Ω" },
    { id: "LED1", type: "led", at: [14, 8], rot: 90, color: "beyaz", Imax: 0.35, Iref: 0.2, label: "1 W LED", lp: [3.2, 0] },
  ]),
  wires: [[[14, 14], [14, 15]], [[14, 1], [14, 2]]],
};
/* "Doğrudan bağla": aynı yük transistörsüz, doğrudan pine */
CIRCUITS.c6DirMotor = {
  title: "Doğrudan bağlı motor",
  iRef: 0.1,
  vRange: [0, 5],
  bounds: C6_SW_BOUNDS,
  parts: C6_PIN.concat([
    { id: "M1", type: "motor", at: [10, 14], rot: 90, R: 25, label: "Motor 25 Ω" },
    { id: "GND2", type: "ground", at: [10, 17] },
  ]),
  wires: [[[7, 12], [10, 12]], [[10, 16], [10, 17]]],
};
CIRCUITS.c6DirLed = {
  title: "Doğrudan bağlı güç LED'i",
  iRef: 0.1,
  vRange: [0, 5],
  bounds: C6_SW_BOUNDS,
  parts: C6_PIN.concat([
    { id: "RL", type: "resistor", at: [9, 12], R: 6.8, label: "6,8 Ω" },
    { id: "LED1", type: "led", at: [11, 14], rot: 90, color: "beyaz", Imax: 0.35, Iref: 0.2, label: "1 W LED", lp: [3.2, 0] },
    { id: "GND2", type: "ground", at: [11, 17] },
  ]),
  wires: [[[11, 16], [11, 17]]],
};

/* 6.3 Ortak emetörlü yükselteç: gerilim bölücüyle öngerilim, emetör direnci, isteğe bağlı
   köprüleme kondansatörü (CE, SW ile devreye girer). Giriş ve çıkış kuplaj kondansatörlü. */
CIRCUITS.c6Amp = {
  title: "Ortak emetörlü yükselteç",
  method: "trap",
  tran: { h: 1e-5, rate: 0.003 },
  tranInit: {},
  iRef: 0.0015,
  vRange: [0, 12],
  parts: [
    { id: "VCC", type: "rail", at: [12, 0], V: 12 },
    { id: "R1", type: "resistor", at: [6, 3], rot: 90, R: 47000, label: "R1 47 kΩ", lp: [-2.4, 0] },
    { id: "R2", type: "resistor", at: [6, 10], rot: 90, R: 10000, label: "R2 10 kΩ", lp: [-2.4, 0] },
    { id: "RC", type: "resistor", at: [12, 2], rot: 90, R: 4700, label: "RC 4,7 kΩ", lp: [-2.6, 0] },
    { id: "RE", type: "resistor", at: [12, 11], rot: 90, R: 1000, label: "RE 1 kΩ", lp: [-2.4, 0] },
    { id: "Q1", type: "npn", at: [11, 7], label: "Q1", lp: [2.6, 0] },
    { id: "VIN", type: "vac", at: [0, 11], rot: 90, wave: { type: "sin", amp: 0.1, freq: 1000 }, label: "Giriş", lp: [-2.4, 0] },
    { id: "CIN", type: "capacitor", at: [3, 7], C: 10e-6, polar: true, label: "10 µF", lp: [0, -1.4] },
    { id: "COUT", type: "capacitor", at: [17, 4], C: 10e-6, polar: true, label: "10 µF", lp: [0, -1.4] },
    { id: "RL", type: "resistor", at: [24, 8], rot: 90, R: 100000, label: "RL 100 kΩ" },
    { id: "SW", type: "switch", at: [17, 9], closed: false, label: "köprü", lp: [0, -1.5], hotLabel: "Köprüleme anahtarı" },
    { id: "CE", type: "capacitor", at: [19, 11], rot: 90, C: 100e-6, polar: true, label: "CE 100 µF" },
    { id: "P1", type: "probe", at: [0, 8], text: "KN1", color: "#ffd75e" },
    { id: "P2", type: "probe", at: [24, 4], text: "KN2", color: "#5fe3ff" },
    { id: "GND", type: "ground", at: [9, 13] },
  ],
  wires: [
    [[6, 1], [6, 0], [12, 0]],
    [[6, 5], [6, 8]], [[5, 7], [6, 7]], [[6, 7], [9, 7]],
    [[0, 9], [0, 7], [1, 7]],
    [[12, 4], [12, 5]], [[12, 4], [15, 4]],
    [[19, 4], [24, 4], [24, 6]],
    [[12, 9], [15, 9]],
    [[0, 13], [24, 13], [24, 10]],
    [[6, 12], [6, 13]],
  ],
};

/* 7.1 MOSFET: kapı gerilimi kaynağı + kapı ampermetresi; N kanal (alt taraf) ve P kanal (üst taraf) */
const C7_MOS_BOUNDS = [-1, -1.5, 16.5, 15.5];
CIRCUITS.c7MosN = {
  title: "N kanal MOSFET anahtar",
  iRef: 0.1,
  vRange: [0, 5],
  bounds: C7_MOS_BOUNDS,
  parts: [
    { id: "VCC", type: "rail", at: [12, 0], V: 5 },
    { id: "LAMP", type: "lamp", at: [12, 3], rot: 90, R: 10, Pnom: 2.5, label: "Lamba 10 Ω" },
    { id: "M1", type: "nmos", at: [11, 9], label: "M1", lp: [2.9, 0] },
    { id: "VG", type: "battery", at: [2, 12], rot: 90, V: 0, label: "VG" },
    { id: "AG", type: "ammeter", at: [5, 9], label: false, mp: [0, -1.8] },
    { id: "GND", type: "ground", at: [7, 14] },
  ],
  wires: [
    [[12, 0], [12, 1]], [[12, 5], [12, 7]],
    [[2, 10], [2, 9], [3, 9]], [[7, 9], [9, 9]],
    [[2, 14], [12, 14], [12, 11]],
  ],
};
CIRCUITS.c7MosP = {
  title: "P kanal MOSFET anahtar",
  iRef: 0.1,
  vRange: [0, 5],
  bounds: C7_MOS_BOUNDS,
  parts: [
    { id: "VCC", type: "rail", at: [12, 0], V: 5 },
    { id: "M1", type: "pmos", at: [11, 4], label: "M1", lp: [2.9, 0] },
    { id: "LAMP", type: "lamp", at: [12, 9], rot: 90, R: 10, Pnom: 2.5, label: "Lamba 10 Ω" },
    { id: "VG", type: "battery", at: [2, 12], rot: 90, V: 5, label: "VG" },
    { id: "AG", type: "ammeter", at: [5, 4], label: false, mp: [0, -1.8] },
    { id: "GND", type: "ground", at: [7, 14] },
  ],
  wires: [
    [[12, 0], [12, 2]], [[12, 6], [12, 7]],
    [[2, 10], [2, 4], [3, 4]], [[7, 4], [9, 4]],
    [[2, 14], [12, 14], [12, 11]],
  ],
};

/* 7.2 PWM: MCU pininden kare dalga, alt taraf N kanal MOSFET, LED ya da motor (sargı + geri dönüş diyotu) */
const C7_PWM_BOUNDS = [-3, -1.5, 17, 16.5];
const C7_PWM_GATE = [
  { id: "MCU", type: "c6mcu", at: [0, 11], V: 5, Rint: 25, closed: true, wave: { type: "square", low: 0, high: 5, freq: 1000, duty: 0.5 }, locked: true, text: "PWM", label: false },
  { id: "RG", type: "resistor", at: [6, 11], R: 100, label: "100 Ω" },
  { id: "RPD", type: "resistor", at: [8, 13], rot: 90, R: 10000, label: "10 kΩ", lp: [-2.2, 0] },
  { id: "M1", type: "nmos", at: [11, 11], label: "M1", lp: [2.9, 0.4] },
  { id: "GND", type: "ground", at: [4, 15] },
  { id: "VCC", type: "rail", at: [12, 0], V: 5 },
  { id: "P1", type: "probe", at: [3, 9], text: "KN1", color: "#ffd75e" },
  { id: "P2", type: "probe", at: [14, 1], text: "KN2 +", color: "#5fe3ff" },
  { id: "P3", type: "probe", at: [14, 9], text: "KN2 −", color: "#5fe3ff" },
];
const C7_PWM_GATE_WIRES = [
  [[3, 11], [4, 11]], [[3, 11], [3, 9]], [[8, 11], [9, 11]],
  [[0, 14], [0, 15], [12, 15], [12, 13]],
  [[12, 0], [12, 1]], [[12, 1], [14, 1]], [[12, 9], [14, 9]],
];
CIRCUITS.c7PwmLed = {
  title: "PWM — LED",
  method: "be",
  tran: { h: 5e-6, rate: 0.0025 },
  tranInit: {},
  iRef: 0.02,
  vRange: [0, 5],
  bounds: C7_PWM_BOUNDS,
  parts: C7_PWM_GATE.concat([
    { id: "RL", type: "resistor", at: [12, 3], rot: 90, R: 150, label: "150 Ω" },
    { id: "LED1", type: "led", at: [12, 7], rot: 90, color: "kirmizi", label: "LED" },
  ]),
  wires: C7_PWM_GATE_WIRES.slice(),
};
CIRCUITS.c7PwmMotor = {
  title: "PWM — motor",
  method: "be",
  tran: { h: 5e-6, rate: 0.0025 },
  tranInit: {},
  iRef: 0.3,
  vRange: [0, 5],
  bounds: C7_PWM_BOUNDS,
  parts: C7_PWM_GATE.concat([
    { id: "M2", type: "motor", at: [12, 3], rot: 90, R: 5, label: "Motor 5 Ω", lp: [3.4, 0] },
    { id: "LM", type: "inductor", at: [12, 7], rot: 90, L: 2e-3, label: "sargı 2 mH", lp: [3.4, 0] },
    { id: "D1", type: "diode", at: [9, 5], rot: 270, label: "D1", lp: [-1.6, 0] },
  ]),
  wires: C7_PWM_GATE_WIRES.concat([[[12, 1], [9, 1], [9, 3]], [[9, 7], [9, 9], [12, 9]]]),
};

/* 7.3 Aynı yük, iki sürücü: solda BJT, sağda logic level MOSFET (ikisi de 3,3 V pinden) */
CIRCUITS.c7Cmp = {
  title: "BJT ve MOSFET karşılaştırma",
  iRef: 0.4,
  vRange: [0, 5],
  parts: [
    { id: "MCU1", type: "c6mcu", at: [0, 10], V: 3.3, Rint: 40, closed: true, hotLabel: "Pin 1", text: "MCU", label: false },
    { id: "GA", type: "ground", at: [0, 14] },
    { id: "RB", type: "resistor", at: [6, 10], R: 220, label: "RB 220 Ω" },
    { id: "Q1", type: "npn", at: [10, 10], label: "BJT", lp: [-0.6, 3], model: { Rc: 0.15 } },
    { id: "GB", type: "ground", at: [11, 14] },
    { id: "V1", type: "rail", at: [11, 1], V: 5 },
    { id: "L1", type: "lamp", at: [11, 5], rot: 90, R: 5, Pnom: 5, label: "Yük", lp: [2.4, 0] },
    { id: "MCU2", type: "c6mcu", at: [17, 10], V: 3.3, Rint: 40, closed: true, hotLabel: "Pin 2", text: "MCU", label: false },
    { id: "GC", type: "ground", at: [17, 14] },
    { id: "RG", type: "resistor", at: [23, 10], R: 100, label: "RG 100 Ω" },
    { id: "M1", type: "nmos", at: [27, 10], label: "MOSFET", lp: [-0.6, 3], model: { K: 20 } },
    { id: "GD", type: "ground", at: [28, 14] },
    { id: "V2", type: "rail", at: [28, 1], V: 5 },
    { id: "L2", type: "lamp", at: [28, 5], rot: 90, R: 5, Pnom: 5, label: "Yük", lp: [2.4, 0] },
  ],
  wires: [
    [[0, 13], [0, 14]], [[3, 10], [4, 10]], [[11, 12], [11, 14]], [[11, 1], [11, 3]], [[11, 7], [11, 8]],
    [[17, 13], [17, 14]], [[20, 10], [21, 10]], [[28, 12], [28, 14]], [[28, 1], [28, 3]], [[28, 7], [28, 8]],
  ],
};
