/* Devre tanımları (veri): 8. bölüm, opamp.
   Opamp modeli gerçekçi: sonlu kazanç A, besleme raylarında yumuşak kırpma (basitleştirilmiş).
   Opamp sembolünde besleme pimleri çizilmez; besleme gerilimi parçanın vpos/vneg özelliğidir. */
window.CIRCUITS = window.CIRCUITS || {};

/* 8.1 Geri beslemesiz opamp: iki ayrı kaynak iki girişe. Çıkışta 10 kΩ yük. */
CIRCUITS.c8Acik = {
  title: "Geri beslemesiz opamp",
  iRef: 0.001,
  vRange: [-12, 12],
  parts: [
    { id: "B2", type: "battery", at: [2, 9], rot: 90, V: 2, label: "V− kaynağı", lp: [-3.6, 0] },
    { id: "B1", type: "battery", at: [6, 10], rot: 90, V: 2, label: "V+ kaynağı", lp: [2.9, 0.4] },
    { id: "U1", type: "opamp", at: [12, 6], A: 1e5, vpos: 12, vneg: -12, headroom: 1.5, label: "U1", lp: [0.4, -2.9] },
    { id: "RL", type: "resistor", at: [18, 9], rot: 90, R: 10000 },
    { id: "GND", type: "ground", at: [10, 13] },
  ],
  wires: [
    [[2, 7], [2, 5], [9, 5]],
    [[6, 8], [6, 7], [9, 7]],
    [[15, 6], [18, 6], [18, 7]],
    [[2, 11], [2, 13], [18, 13], [18, 11]],
    [[6, 12], [6, 13]],
  ],
  bounds: [-3, 1, 21, 14],
};

/* 8.1 Aynı opamp, çıkış eviren girişe bağlı: gerilim izleyici */
CIRCUITS.c8Izleyici = {
  title: "Geri beslemeli opamp (gerilim izleyici)",
  iRef: 0.001,
  vRange: [-12, 12],
  parts: [
    { id: "B1", type: "battery", at: [6, 10], rot: 90, V: 2, label: "V+ kaynağı", lp: [2.9, 0.4] },
    { id: "U1", type: "opamp", at: [12, 6], A: 1e5, vpos: 12, vneg: -12, headroom: 1.5, label: "U1", lp: [0.4, -3.3] },
    { id: "RL", type: "resistor", at: [18, 9], rot: 90, R: 10000 },
    { id: "GND", type: "ground", at: [10, 13] },
  ],
  wires: [
    [[9, 5], [8, 5], [8, 2], [16, 2], [16, 6]],
    [[6, 8], [6, 7], [9, 7]],
    [[15, 6], [18, 6], [18, 7]],
    [[6, 12], [6, 13], [18, 13], [18, 11]],
  ],
  bounds: [-3, 1, 21, 14],
};

/* 8.2 Karşılaştırıcı: LDR'li gerilim bölücü (+ giriş) ve potansiyometreyle eşik (− giriş).
   Karanlıkta LDR direnci büyür, + giriş eşiği geçer, çıkış yükselir, LED yanar.
   Tek besleme 0–5 V. */
CIRCUITS.c8Karsilastirici = {
  title: "Opamp karşılaştırıcı ve ışık sensörü",
  iRef: 0.004,
  vRange: [0, 5],
  parts: [
    { id: "V1", type: "rail", at: [5, 1], V: 5 },
    { id: "R1", type: "resistor", at: [2, 4], rot: 90, R: 10000, lp: [-3.2, 0] },
    { id: "LDR", type: "ldr", at: [2, 10], rot: 90, R: 10000, label: "LDR", lp: [-3.2, 0] },
    { id: "P1", type: "pot", at: [8, 4], rot: 270, flip: true, R: 10000, pos: 0.5, label: "Eşik", lp: [-2.6, 0], hotLabel: "Eşik potansiyometresi" },
    { id: "U1", type: "opamp", at: [15, 6], A: 1e5, vpos: 5, vneg: 0, headroom: 0.1, label: "U1", lp: [0.4, -2.9] },
    { id: "R3", type: "resistor", at: [21, 6], R: 330 },
    { id: "LED1", type: "led", at: [23, 9], rot: 90, color: "kirmizi", label: "LED" },
    { id: "G1", type: "ground", at: [2, 12] },
    { id: "G2", type: "ground", at: [8, 6] },
    { id: "G3", type: "ground", at: [23, 11] },
    { id: "K1", type: "probe", at: [6, 8], text: "KN1", color: "#ffd75e" },
    { id: "K2", type: "probe", at: [11, 3], text: "KN2", color: "#5fe3ff" },
    { id: "K3", type: "probe", at: [19, 3], text: "KN3", color: "#ff8ad8" },
  ],
  wires: [
    [[2, 2], [2, 1], [8, 1], [8, 2]],
    [[2, 6], [2, 8]],
    [[2, 7], [12, 7]],
    [[6, 7], [6, 8]],
    [[10, 4], [11, 4], [11, 5], [12, 5]],
    [[11, 4], [11, 3]],
    [[18, 6], [19, 6]],
    [[19, 6], [19, 3]],
    [[23, 6], [23, 7]],
  ],
};

/* 8.3 Eviren yükselteç: kazanç −Rf/Rin. + giriş toprakta, − giriş "sanal toprak". */
CIRCUITS.c8Eviren = {
  title: "Eviren yükselteç",
  method: "trap",
  tran: { h: 1e-5, rate: 0.002 },
  iRef: 0.0006,
  vRange: [-12, 12],
  parts: [
    { id: "VIN", type: "vac", at: [3, 9], rot: 90, wave: { type: "sin", amp: 1, freq: 1000 }, label: "Giriş 1 kHz", lp: [-3.6, 0] },
    { id: "RIN", type: "resistor", at: [7, 5], R: 10000, label: "Rin" },
    { id: "RF", type: "resistor", at: [14, 2], R: 47000, label: "Rf" },
    { id: "U1", type: "opamp", at: [14, 6], A: 1e5, vpos: 12, vneg: -12, headroom: 1.5, label: false },
    { id: "SUP", type: "text", at: [14, 9.2], text: "U1 · besleme ±12 V", size: 0.55 },
    { id: "G1", type: "ground", at: [3, 11] },
    { id: "G2", type: "ground", at: [10, 8] },
    { id: "K1", type: "probe", at: [4, 3], text: "KN1 giriş", color: "#ffd75e" },
    { id: "K2", type: "probe", at: [20, 6], text: "KN2 çıkış", color: "#5fe3ff" },
  ],
  wires: [
    [[3, 7], [3, 5], [5, 5]],
    [[4, 5], [4, 3]],
    [[9, 5], [11, 5]],
    [[10, 5], [10, 2], [12, 2]],
    [[16, 2], [18, 2], [18, 6]],
    [[17, 6], [20, 6]],
    [[11, 7], [10, 7], [10, 8]],
  ],
  bounds: [0, 1, 23, 11],
};

/* 8.3 Evirmeyen yükselteç: kazanç 1 + Rf/Rg. Opamp aynalı çizilir (+ giriş üstte). */
CIRCUITS.c8Evirmeyen = {
  title: "Evirmeyen yükselteç",
  method: "trap",
  tran: { h: 1e-5, rate: 0.002 },
  iRef: 0.0006,
  vRange: [-12, 12],
  parts: [
    { id: "VIN", type: "vac", at: [3, 9], rot: 90, wave: { type: "sin", amp: 1, freq: 1000 }, label: "Giriş 1 kHz", lp: [-3.6, 0] },
    { id: "U1", type: "opamp", at: [14, 6], flip: true, A: 1e5, vpos: 12, vneg: -12, headroom: 1.5, label: false },
    { id: "SUP", type: "text", at: [14, 3.2], text: "U1 · besleme ±12 V", size: 0.55 },
    { id: "RG", type: "resistor", at: [8, 10], rot: 90, R: 10000, label: "Rg", lp: [-1.8, 0] },
    { id: "RF", type: "resistor", at: [14, 12], R: 47000, label: "Rf" },
    { id: "G1", type: "ground", at: [3, 11] },
    { id: "G2", type: "ground", at: [8, 12] },
    { id: "K1", type: "probe", at: [4, 3], text: "KN1 giriş", color: "#ffd75e" },
    { id: "K2", type: "probe", at: [20, 6], text: "KN2 çıkış", color: "#5fe3ff" },
  ],
  wires: [
    [[3, 7], [3, 5], [11, 5]],
    [[4, 5], [4, 3]],
    [[11, 7], [8, 7], [8, 8]],
    [[10, 7], [10, 12], [12, 12]],
    [[16, 12], [18, 12], [18, 6]],
    [[17, 6], [20, 6]],
  ],
  bounds: [0, 1, 23, 13],
};

/* 8.4 Toplayıcı (ses karıştırıcı): iki kaynak kendi dirençleriyle sanal toprağa akım yollar.
   Vout = −Rf · (V1/R1 + V2/R2) */
CIRCUITS.c8Mikser = {
  title: "Toplayıcı yükselteç (mikser)",
  method: "trap",
  tran: { h: 2e-5, rate: 0.006 },
  iRef: 0.0003,
  vRange: [-5, 5],
  parts: [
    { id: "V1", type: "vac", at: [3, 11], rot: 90, wave: { type: "sin", amp: 1, freq: 200 }, label: "Kanal 1 · 200 Hz", lp: [-4.6, 0] },
    { id: "V2", type: "vac", at: [10, 11], rot: 90, wave: { type: "sin", amp: 0.5, freq: 1000 }, label: "Kanal 2 · 1 kHz", lp: [4.4, 0] },
    { id: "R1", type: "resistor", at: [3, 7], rot: 90, R: 10000, label: "R1" },
    { id: "R2", type: "resistor", at: [10, 7], rot: 90, R: 10000, label: "R2" },
    { id: "RF", type: "resistor", at: [20, 2], R: 10000, label: "Rf" },
    { id: "U1", type: "opamp", at: [20, 6], A: 1e5, vpos: 5, vneg: -5, headroom: 1.5, label: false },
    { id: "SUP", type: "text", at: [20, 9.2], text: "U1 · besleme ±5 V", size: 0.55 },
    { id: "G1", type: "ground", at: [3, 13] },
    { id: "G2", type: "ground", at: [10, 13] },
    { id: "G3", type: "ground", at: [16, 8] },
    { id: "K1", type: "probe", at: [5, 9], text: "KN1", color: "#ffd75e" },
    { id: "K2", type: "probe", at: [12, 9], text: "KN2", color: "#5fe3ff" },
    { id: "K3", type: "probe", at: [26, 6], text: "KN3 çıkış", color: "#ff8ad8" },
  ],
  wires: [
    [[3, 9], [5, 9]],
    [[10, 9], [12, 9]],
    [[3, 5], [17, 5]],
    [[15, 5], [15, 2], [18, 2]],
    [[22, 2], [24, 2], [24, 6]],
    [[23, 6], [26, 6]],
    [[17, 7], [16, 7], [16, 8]],
  ],
  bounds: [-2, 1, 28, 14],
};

/* 8.4 Yükleme etkisi: aynı bölücü, aynı yük; birinde araya gerilim izleyici girer. */
CIRCUITS.c8Tampon = {
  title: "Gerilim bölücü ve gerilim izleyici",
  iRef: 0.0005,
  vRange: [0, 10],
  parts: [
    { id: "V1", type: "rail", at: [9, 1], V: 10 },
    { id: "R1", type: "resistor", at: [2, 4], rot: 90, R: 10000, label: "R1 10 kΩ", lp: [-3.2, 0] },
    { id: "R2", type: "resistor", at: [2, 10], rot: 90, R: 10000, label: "R2 10 kΩ", lp: [-3.2, 0] },
    { id: "S1", type: "switch", at: [6, 7], closed: true, label: "S1", hotLabel: "Yük anahtarı S1" },
    { id: "VM1", type: "voltmeter", at: [4, 10], rot: 90, label: false, mp: [2.4, 0] },
    { id: "RL1", type: "resistor", at: [9, 10], rot: 90, R: 2200, label: "RL" },
    { id: "R3", type: "resistor", at: [16, 4], rot: 90, R: 10000, label: "R3 10 kΩ", lp: [-3.2, 0] },
    { id: "R4", type: "resistor", at: [16, 10], rot: 90, R: 10000, label: "R4 10 kΩ" },
    { id: "U1", type: "opamp", at: [22, 6], A: 1e5, vpos: 12, vneg: -12, headroom: 1.5, label: "U1", lp: [0.6, 2.9] },
    { id: "VM2", type: "voltmeter", at: [26, 10], rot: 90, label: false, mp: [2.4, 0] },
    { id: "S2", type: "switch", at: [28, 6], closed: true, label: "S2", hotLabel: "Yük anahtarı S2" },
    { id: "RL2", type: "resistor", at: [31, 10], rot: 90, R: 2200, label: "RL" },
    { id: "G1", type: "ground", at: [2, 12] },
    { id: "G2", type: "ground", at: [9, 12] },
    { id: "G3", type: "ground", at: [16, 12] },
    { id: "G4", type: "ground", at: [26, 12] },
    { id: "G5", type: "ground", at: [31, 12] },
    { id: "T1", type: "text", at: [6, 14.6], text: "Yalnız bölücü", size: 0.62, color: "#c2c9bb" },
    { id: "T2", type: "text", at: [24, 14.6], text: "Bölücü + gerilim izleyici", size: 0.62, color: "#c2c9bb" },
  ],
  wires: [
    [[2, 2], [2, 1], [16, 1], [16, 2]],
    [[2, 6], [2, 8]],
    [[2, 7], [4, 7]],
    [[4, 7], [4, 8]],
    [[2, 12], [4, 12]],
    [[8, 7], [9, 7], [9, 8]],
    [[16, 6], [16, 8]],
    [[16, 7], [19, 7]],
    [[19, 5], [18, 5], [18, 3], [25, 3], [25, 6]],
    [[25, 6], [26, 6]],
    [[26, 6], [26, 8]],
    [[30, 6], [31, 6], [31, 8]],
  ],
  bounds: [-2, 0, 34, 15],
};
