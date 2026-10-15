/* Devre tanımları (veri): 13. bölüm, ikinci kısım — durum makinesi (trafik lambası) ve 555 saat üreteci.
   c13b555 parça türü js/demos/ch13b.js içinde tanımlanır. */
window.CIRCUITS = window.CIRCUITS || {};
(function () {
  const txt = (id, at, text, o = {}) => ({ id, type: "text", at, text, ...o });

  /* Trafik lambası durum makinesi.
     Durum iki D flip-flop'ta: Q1 Q0 (Gray kodu; her geçişte tek bit değişir)
       00 KIRMIZI · 01 KIRMIZI+SARI · 11 YEŞİL · 10 SARI
     Sonraki durum: D1 = Q0,  D0 = Q1' + Q0·W'
     W: yaya isteği. İki NOR kapısından SR latch: S = yaya düğmesi (P), R = YAYA (yayalara yeşil).
     Çıkışlar: K = Q1', S = Q1 ⊕ Q0, Y = Q1·Q0, YAYA = (Q1 + Q0)'.
     Girişler parça listesinde önce gelir (sinyaller kapılardan önce tanımlansın). */
  CIRCUITS.c13bTrafik = {
    title: "Trafik lambası durum makinesi",
    animate: true, rate: 20, settle: 30, allowFloating: true,
    parts: [
      { id: "P", type: "input", at: [0, 0], value: 0, hotLabel: "Yaya düğmesi (P)" },
      { id: "CLK", type: "clock", at: [21, 13], period: 20 },
      // flip-flop'lar kapılardan önce: Q çıkışlarının başlangıç değeri (0) korunsun
      { id: "FF0", type: "dff", at: [30, 4], title: "D0" },
      { id: "FF1", type: "dff", at: [30, 11], title: "D1" },
      { id: "LA", type: "nor", at: [7, 1] },
      { id: "LB", type: "nor", at: [7, 6] },
      { id: "GA", type: "and", at: [16, 2] },
      { id: "GO", type: "or", at: [23, 3] },
      { id: "GS", type: "xor", at: [43, 2] },
      { id: "GY", type: "and", at: [43, 7] },
      { id: "GW", type: "nor", at: [43, 12] },
      { id: "OS", type: "output", at: [48, 2] },
      { id: "OY", type: "output", at: [48, 7] },
      { id: "OW", type: "output", at: [48, 12] },
      { id: "OK", type: "output", at: [48, 15] },
      txt("tP", [0.4, -1.7], "yaya düğmesi", { size: 0.62 }),
      txt("tW", [7, 9.2], "istek latch'i (SR)", { size: 0.62 }),
      txt("tWq", [11.4, 6.9], "W", { size: 0.62, color: "#efeee2", weight: 700, align: "left" }),
      txt("tWn", [11.6, 0.2], "W'", { size: 0.62, color: "#efeee2", weight: 700, align: "left" }),
      txt("tN", [19.6, 6.4], "sonraki durum", { size: 0.62 }),
      txt("tC", [21, 11.2], "saat", { size: 0.62 }),
      txt("tQ0", [35.6, 2.2], "Q0", { size: 0.62, color: "#efeee2", weight: 700, align: "left" }),
      txt("tQ1", [35.6, 9.2], "Q1", { size: 0.62, color: "#efeee2", weight: 700, align: "left" }),
      txt("tQ1n", [35.6, 12.9], "Q1'", { size: 0.62, color: "#efeee2", weight: 700, align: "left" }),
      txt("tOS", [49.6, 2], "sarı", { size: 0.66, align: "left" }),
      txt("tOY", [49.6, 7], "yeşil", { size: 0.66, align: "left" }),
      txt("tOW", [49.6, 12], "yaya", { size: 0.66, align: "left" }),
      txt("tOK", [49.6, 15], "kırmızı", { size: 0.66, align: "left" }),
      txt("tDec", [43, 16.9], "çıkış çözücü", { size: 0.62 }),
    ],
    wires: [
      [[1, 0], [4, 0]],
      // W' = NOR(P, W) → VE kapısına ve LB'ye geri besleme
      [[10, 1], [13, 1]],
      [[11, 1], [11, 3], [2.5, 3], [2.5, 5], [4, 5]],
      // W = NOR(YAYA, W') → LA'ya geri besleme
      [[10, 6], [12, 6], [12, 4], [3, 4], [3, 2], [4, 2]],
      // sonraki durum mantığı
      [[19, 2], [20, 2]],
      [[26, 3], [27, 3]],
      // saat
      [[22.5, 13], [25, 13], [25, 5], [27, 5]],
      [[25, 12], [27, 12]],
      // Q0: VE kapısına, FF1'in D girişine ve çözücüye
      [[33, 3], [35, 3], [35, 8], [13, 8], [13, 3]],
      [[26, 8], [26, 10], [27, 10]],
      [[35, 3], [37, 3], [37, 13], [40, 13]],
      [[37, 3], [40, 3]],
      [[37, 8], [40, 8]],
      // Q1 → çözücü
      [[33, 10], [38.5, 10]],
      [[38.5, 1], [38.5, 11], [40, 11]],
      [[38.5, 1], [40, 1]],
      [[38.5, 6], [40, 6]],
      // Q1' → VEYA kapısı ve kırmızı lamba
      [[33, 12], [34, 12], [34, 15], [18, 15], [18, 4], [20, 4]],
      [[34, 15], [47, 15]],
      // çıkışlar
      [[46, 2], [47, 2]],
      [[46, 7], [47, 7]],
      [[46, 12], [47, 12]],
      // YAYA → istek latch'ini sıfırla
      [[46.5, 12], [46.5, 18], [1.5, 18], [1.5, 7], [4, 7]],
    ],
  };

  /* 555 zamanlayıcı, astable bağlantı. U1 = c13b555 (8 bacaklı blok; içi: 3 × 5 kΩ bölücü,
     iki karşılaştırıcı, SR flip-flop, deşarj transistörü, çıkış katı).
     C, RA + RB üzerinden ⅔ Vcc'ye dolar; RB üzerinden 7. bacağa ⅓ Vcc'ye boşalır.
     f ≈ 1,44 / ((RA + 2·RB) · C) */
  CIRCUITS.c13b555 = {
    title: "555 astable osilatör",
    method: "be",
    tran: { h: 2e-4, rate: 1, maxSteps: 400 },
    tranInit: { uic: true },
    vRange: [0, 9],
    iRef: 0.012,
    parts: [
      { id: "V", type: "rail", at: [11, 0], V: 9 },
      { id: "RA", type: "resistor", at: [4, 3], rot: 90, R: 10000, lp: [-2.4, 0] },
      { id: "RB", type: "resistor", at: [4, 7], rot: 90, R: 47000, lp: [-2.4, 0] },
      { id: "C", type: "capacitor", at: [4, 11], rot: 90, C: 10e-6, v0: 3, polar: true, lp: [-2.4, 0] },
      { id: "U1", type: "c13b555", at: [15, 11], label: false },
      { id: "CC", type: "capacitor", at: [27, 11], rot: 90, C: 10e-9, v0: 6, label: "10 nF", lp: [2.2, 0] },
      { id: "R3", type: "resistor", at: [24, 13], rot: 90, R: 470, lp: [-2.3, 0] },
      { id: "LED", type: "led", at: [24, 17], rot: 90, color: "kirmizi", label: "LED", lp: [-1.9, 0] },
      { id: "GND", type: "ground", at: [12, 22] },
      { id: "KN1", type: "probe", at: [6, 11], text: "KN1", color: "#ffd75e" },
      { id: "KN2", type: "probe", at: [23, 8.5], text: "KN2", color: "#5fe3ff" },
    ],
    wires: [
      [[4, 1], [4, 0], [19, 0], [19, 2.5]],
      [[15, 0], [15, 2.5]],
      [[4, 5], [8, 5]],
      [[4, 9], [8, 9]],
      [[6, 9], [6, 13], [8, 13]],
      [[4, 13], [4, 22], [27, 22], [27, 13]],
      [[19, 19.5], [19, 22]],
      [[22, 7.5], [27, 7.5], [27, 9]],
      [[22, 10], [24, 10], [24, 11]],
      [[23, 10], [23, 8.5]],
      [[24, 19], [24, 22]],
    ],
  };
})();
