/* Devre tanımları (veri): 14. bölüm — büyük resim.
   Özel parçalar js/demos/ch14.js'de tanımlanır:
   - c14chip: mikrodenetleyici gövdesi (yalnız çizim, çözücüde bileşeni yok)
   - c14pin:  çıkış pini = iç dirençli gerilim kaynağı (o: pin, g: yongadaki toprak noktası)
   - c14core: yonganın içindeki mantık sinyali (çıkış katının kapılarını sürer)
   - c14box:  kesikli çerçeve ve başlık (yalnız çizim)
   - c14mains: şebeke kaynağı; etkin (RMS) değeriyle doğru akım eşdeğeri olarak çözülür */
window.CIRCUITS = window.CIRCUITS || {};
(function () {
  /* ---------- 14.2 Mikrodenetleyici: pin → direnç → LED ----------
     ATmega328P çıkış pini 5 V'ta ≈ 25 Ω iç dirençli kaynak gibi davranır
     (veri kitapçığı: 20 mA'de V_OH en az 4,2 V; tipik eğriler ≈ 4,5 V). */
  const PIN = { V: 5, Rint: 25 };
  // tek pinli zincir: pin (y satırında) → ampermetre → direnç → LED → toprak
  function chain(k, y, pin, color, ledX) {
    return {
      parts: [
        { id: "P" + k, type: "c14pin", at: [2.5, y], pin, ...PIN, state: 0, gnd: [-2.5, 12 - y], hotLabel: "D" + pin, label: false },
        { id: "A" + k, type: "ammeter", at: [6, y], label: false, mp: [0, -1.75] },
        { id: "R" + k, type: "resistor", at: [11, y], R: 220, label: "R" + k + " 220 Ω" },
        { id: "LED" + k, type: "led", at: [ledX, y + 3], rot: 90, color, label: false, Iref: 0.012 },
      ],
      wires: [
        [[8, y], [9, y]], [[13, y], [ledX, y], [ledX, y + 1]],
      ].concat(y + 5 < 14 ? [[[ledX, y + 5], [ledX, 14]]] : []),
    };
  }
  function mcu(title, chains) {
    const parts = [{ id: "U1", type: "c14chip", at: [0, 7], w: 5, h: 10, text: "ATmega328P", sub: "16 MHz · 5 V" }];
    const wires = [];
    chains.forEach((c) => { parts.push(...c.parts); wires.push(...c.wires); });
    const xs = chains.map((c) => c.parts[3].at[0]);
    wires.push([[0, 12], [0, 14], [Math.max(...xs), 14]]);
    parts.push({ id: "GND", type: "ground", at: [0, 14] });
    return { title, iRef: 0.012, vRange: [0, 5], bounds: [-3.2, 1, 19, 15.2], parts, wires };
  }
  CIRCUITS.c14Blink = mcu("Mikrodenetleyici pini ve LED", [chain(1, 5, 13, "kirmizi", 16)]);
  CIRCUITS.c14Two = mcu("İki pin, iki LED", [chain(1, 4, 12, "sari", 18), chain(2, 7, 13, "kirmizi", 15)]);
  CIRCUITS.c14Two.parts.find((p) => p.id === "A2").mp = [0, 1.75];
  CIRCUITS.c14Fade = mcu("PWM pini ve LED", [chain(1, 5, 9, "kirmizi", 16)]);

  /* ---------- 14.2 Pinin içi: CMOS çıkış katı ----------
     Çıkış katı bir CMOS eviricidir: iç sinyal 0 → PMOS açık → pin 5 V'a bağlanır.
     MOSFET'ler ≈ 25 Ω açık direnç verecek şekilde ölçeklendi (K = 0,01 A/V², Vt = 1 V). */
  const NM = { Vt: 1, K: 0.01, lambda: 0.01 };
  const PM = { Vt: 1, K: 0.01, lambda: 0.01 };
  CIRCUITS.c14Stage = {
    title: "Pinin içi: CMOS çıkış katı",
    iRef: 0.012,
    vRange: [0, 5],
    bounds: [-3.5, -9.6, 21, 10.2],
    parts: [
      { id: "BOX", type: "c14box", at: [4.5, 0.8], w: 13, h: 17.6, text: "ATmega328P'nin içi (basitleştirilmiş)" },
      { id: "VCC", type: "rail", at: [8, -6], V: 5 },
      { id: "P1", type: "pmos", at: [7, -2], model: PM, label: "PMOS", lp: [-2.4, -1.3] },
      { id: "N1", type: "nmos", at: [7, 4], model: NM, label: "NMOS", lp: [-2.4, 1.6] },
      { id: "CORE", type: "c14core", at: [0, 1], V: 5, Rint: 10, state: 1, gnd: [0, 7], label: false },
      { id: "PAD", type: "text", at: [11, -0.2], text: "D13", size: 0.62, color: "#f0b07a", weight: 750 },
      { id: "R1", type: "resistor", at: [14, 1], R: 220, label: "220 Ω" },
      { id: "LED1", type: "led", at: [18, 4], rot: 90, color: "kirmizi", label: false, Iref: 0.012 },
      { id: "GND", type: "ground", at: [0, 8] },
    ],
    wires: [
      [[8, -6], [8, -4]], [[8, 0], [8, 2]], [[8, 1], [12, 1]],
      [[5, -2], [4, -2], [4, 4], [5, 4]], [[2, 1], [4, 1]],
      [[16, 1], [18, 1], [18, 2]], [[18, 6], [18, 8], [0, 8]], [[8, 6], [8, 8]],
    ],
  };

  /* ---------- 14.3 Güvenlik: pilin kısa devresi ----------
     Pil = ideal hücre + iç direnç (kesikli çerçeve). Sigorta → ampermetre → lamba;
     "Kısa devre" anahtarı lambanın uçlarını kalın bir telle (10 mΩ) birleştirir. */
  CIRCUITS.c14Short = {
    title: "Pilin kısa devresi",
    iRef: 0.3,
    vRange: [0, 3.7],
    bounds: [-7.5, -5, 19, 10.5],
    parts: [
      { id: "CELL", type: "c14box", at: [0, 2.5], w: 5.6, h: 10.6, text: "Pil", tone: "copper" },
      { id: "RI", type: "resistor", at: [0, 0.5], rot: 90, R: 0.05, label: "R iç", lp: [-5, 0] },
      { id: "B1", type: "battery", at: [0, 5.5], rot: 90, V: 3.7, label: "3,7 V", lp: [-4.4, 0] },
      { id: "F1", type: "fuse", at: [5, -3], rating: 2, label: "Sigorta 2 A" },
      { id: "A1", type: "ammeter", at: [10, -3], label: false, mp: [0, -1.75] },
      { id: "SW", type: "switch", at: [12, 3], rot: 90, closed: false, ron: 0.01, hotLabel: "Kısa devre", label: "Kısa devre teli", lp: [-3.4, 0] },
      { id: "LMP", type: "lamp", at: [16, 3], rot: 90, R: 24, Pnom: 0.6, label: "Lamba", lp: [2.2, 0] },
    ],
    wires: [
      [[0, -1.5], [0, -3], [3, -3]], [[0, 2.5], [0, 3.5]], [[7, -3], [8, -3]],
      [[12, -3], [16, -3], [16, 1]], [[12, -3], [12, 1]],
      [[16, 5], [16, 9], [0, 9], [0, 7.5]], [[12, 5], [12, 9]],
    ],
  };

  /* Pil modelleri (yaklaşık; iç direnç pilin türüne, doluluğuna, sıcaklığına göre değişir).
     m: kütle (g), ısınma tahmininde ısı kapasitesi ≈ 1 J/(g·K) alınır. runaway: Li-ion termal kaçak riski */
  CIRCUITS.c14Cells = {
    li: { V: 3.7, Rint: 0.05, m: 45, runaway: true },
    aa: { V: 1.5, Rint: 0.15, m: 23 },
    v9: { V: 9, Rint: 1.5, m: 46 },
  };

  /* ---------- 14.3 Güvenlik: vücut direnci ----------
     Elden ele akım yolu (göğüsten geçer). Kaynak değiştirilebilir: USB 5 V, 9 V pil, şebeke 230 V. */
  CIRCUITS.c14Body = {
    title: "Vücuttan geçen akım",
    iRef: 0.003,
    vRange: [0, 5],
    bounds: [-6.5, -2.5, 16.5, 9.5],
    parts: [
      { id: "SRC", type: "battery", at: [0, 4], rot: 90, V: 5, label: "USB 5 V", lp: [-3.9, 0] },
      { id: "A1", type: "ammeter", at: [5, 0], label: false, mp: [0, -1.75] },
      { id: "BODY", type: "resistor", at: [10, 4], rot: 90, R: 100000, label: "Vücut (elden ele)", lp: [3.6, 0] },
    ],
    wires: [[[0, 2], [0, 0], [3, 0]], [[7, 0], [10, 0], [10, 2]], [[10, 6], [10, 8], [0, 8], [0, 6]]],
  };
})();
