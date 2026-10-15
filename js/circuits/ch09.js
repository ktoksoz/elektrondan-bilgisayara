/* Devre tanımları (veri): 9. bölüm — analogdan dijitale köprü.
   MOSFET'ler tümleşik devredeki küçük transistörler gibi ölçeklendi (K ≈ 0,5 mA/V²);
   hazır "logic level" modeli (K = 2 A/V²) burada amper düzeyinde geçiş akımı verirdi. */
window.CIRCUITS = window.CIRCUITS || {};
(function () {
  // tümleşik devre ölçeğinde basitleştirilmiş kare yasası modelleri
  const NM = { Vt: 1, K: 5e-4, lambda: 0.02 };
  const PM = { Vt: 1, K: 5e-4, lambda: 0.02 };

  /* Tek transistörlü NOT kapısı (RTL evirici): giriş RB üzerinden bazı sürer,
     RC çıkışı yukarı çeker; çıkışa bağlı LED + direnç "1"i gösterir. */
  CIRCUITS.c9Rtl = {
    title: "Transistörlü NOT kapısı (RTL)",
    vRange: [0, 5],
    iRef: 0.01,
    parts: [
      { id: "VCC", type: "rail", at: [9, -5], V: 5 },
      { id: "RC", type: "resistor", at: [9, -2], rot: 90, R: 220, label: "RC 220 Ω" },
      { id: "Giriş", type: "battery", at: [0, 8], rot: 90, V: 0 },
      { id: "RB", type: "resistor", at: [3, 4], R: 10000, label: "RB 10 kΩ" },
      { id: "Q1", type: "npn", at: [8, 4], lp: [-1.6, 2.6] },
      { id: "RL", type: "resistor", at: [15, 3], rot: 90, R: 1000, label: "1 kΩ" },
      { id: "LED", type: "led", at: [15, 7], rot: 90, color: "kirmizi", Iref: 0.004, label: "LED" },
      { id: "OUT", type: "probe", at: [12, -1], text: "Çıkış", color: "#ffd75e" },
      { id: "GND", type: "ground", at: [7, 10] },
    ],
    wires: [
      [[9, -5], [9, -4]],
      [[9, 0], [9, 2]],
      [[9, 1], [15, 1]],
      [[12, 1], [12, -1]],
      [[0, 6], [0, 4], [1, 4]],
      [[5, 4], [6, 4]],
      [[9, 6], [9, 10]],
      [[0, 10], [15, 10], [15, 9]],
    ],
  };

  /* CMOS evirici: üstte PMOS (kaynağı VDD'de), altta NMOS (kaynağı toprakta),
     kapılar birlikte girişe, akaçlar birlikte çıkışa. VDD hattında akım ölçer. */
  CIRCUITS.c9Cmos = {
    title: "CMOS evirici",
    vRange: [0, 5],
    iRef: 2e-4,
    parts: [
      { id: "VDD", type: "rail", at: [10, -7], V: 5 },
      { id: "IDD", type: "ammeter", at: [10, -4], rot: 90, label: false },
      { id: "P1", type: "pmos", at: [9, 0], model: PM, label: false },
      { id: "N1", type: "nmos", at: [9, 6], model: NM, label: false },
      { id: "Giriş", type: "battery", at: [1, 6], rot: 90, V: 0, lp: [-2.4, 0] },
      { id: "OUT", type: "probe", at: [15, 3], text: "Çıkış", color: "#ffd75e" },
      { id: "GND", type: "ground", at: [6, 10] },
    ],
    wires: [
      [[10, -7], [10, -6]],
      [[10, 2], [10, 4]],
      [[10, 3], [15, 3]],
      [[7, 0], [5, 0], [5, 6], [7, 6]],
      [[5, 3], [1, 3], [1, 4]],
      [[1, 8], [1, 10], [10, 10], [10, 8]],
    ],
  };

  /* İki girişli CMOS NAND: iki PMOS paralel (üstte), iki NMOS seri (altta). */
  CIRCUITS.c9Nand = {
    title: "CMOS NAND kapısı",
    vRange: [0, 5],
    iRef: 2e-4,
    parts: [
      { id: "VDD", type: "rail", at: [7, -6], V: 5 },
      { id: "PA", type: "pmos", at: [3, -2], model: PM, label: false },
      { id: "PB", type: "pmos", at: [11, -2], rot: 180, flip: true, model: PM, label: false },
      { id: "NA", type: "nmos", at: [7, 4], model: NM, label: false },
      { id: "NB", type: "nmos", at: [9, 8], rot: 180, flip: true, model: NM, label: false },
      { id: "A", type: "c9src", at: [-3, 4], V: 5, closed: false, hotLabel: "A girişi", label: "A", lp: [-0.7, -1.4] },
      { id: "B", type: "c9src", at: [-3, 13], V: 5, closed: false, hotLabel: "B girişi", label: "B", lp: [-0.7, -1.4] },
      { id: "OUT", type: "probe", at: [14, 1], text: "Y", color: "#ffd75e" },
      { id: "GND", type: "ground", at: [8, 11] },
    ],
    wires: [
      [[7, -6], [7, -5]],
      [[4, -4], [4, -5], [10, -5], [10, -4]],
      [[4, 0], [4, 1], [10, 1], [10, 0]],
      [[10, 1], [14, 1]],
      [[8, 1], [8, 2]],
      [[8, 10], [8, 11]],
      [[-2, 4], [5, 4]],
      [[1, -2], [0, -2], [0, 4]],
      [[-2, 13], [16, 13], [16, -2], [13, -2]],
      [[11, 8], [16, 8]],
    ],
  };

  /* Gürültü payı deneyindeki alıcı: arka arkaya iki CMOS evirici (tampon), çözücü
     devre listesi olarak. Demo, VDD'yi ve P1'in K değerini aileye göre ayarlar: ilk eviricinin
     eşiği transistör oranıyla belirlenir (ör. 74HCT: TTL uyumlu giriş eşiği). */
  CIRCUITS.c9Receiver = {
    title: "Alıcı: iki CMOS evirici",
    elements: [
      { type: "V", id: "VDD", n: ["vdd", "0"], V: 5 },
      { type: "V", id: "VIN", n: ["in", "0"], V: 0 },
      { type: "M", id: "P1", n: ["x", "in", "vdd"], pol: -1, Vt: 0.7, K: 5e-4, lambda: 0.02 },
      { type: "M", id: "N1", n: ["x", "in", "0"], pol: 1, Vt: 0.7, K: 5e-4, lambda: 0.02 },
      { type: "M", id: "P2", n: ["out", "x", "vdd"], pol: -1, Vt: 0.7, K: 5e-4, lambda: 0.02 },
      { type: "M", id: "N2", n: ["out", "x", "0"], pol: 1, Vt: 0.7, K: 5e-4, lambda: 0.02 },
    ],
  };
})();
