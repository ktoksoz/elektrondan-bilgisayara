/* Devre tanımları (veri): 10. bölüm — mantık kapıları ve Boole cebiri.
   Kapıların elektrikteki karşılıkları: 5 V pil, anahtarlar, 330 Ω direnç ve LED.
   Seri anahtar = AND, paralel anahtar = OR, LED'i kısa devre eden anahtar = NOT;
   XOR ve XNOR iki "vavien" (iki yollu) anahtarla kurulur (merdiven lambası devresi). */
window.CIRCUITS = window.CIRCUITS || {};
(function () {
  const BAT = { id: "B1", type: "battery", at: [0, 4], rot: 90, V: 5, label: "5 V", lp: [-1.9, 0] };
  const R1 = (x) => ({ id: "R1", type: "resistor", at: [x, 0], R: 330, label: "330 Ω" });
  const LED = (x) => ({ id: "LED", type: "led", at: [x, 4], rot: 90, color: "kirmizi", Iref: 0.008, label: "Y" });
  const SW = (id, at, rot, lp) => ({ id, type: "switch", at, rot, closed: false, label: id.slice(1), hotLabel: id.slice(1) + " anahtarı", lp });
  const common = { vRange: [0, 5], iRef: 0.008 };

  /* --- mantık sembolü: iki girişli kapı ve NOT --- */
  CIRCUITS.c10Gate2 = {
    title: "Mantık kapısı",
    parts: [
      { id: "A", type: "input", at: [-6, -1], value: 0, hotLabel: "A girişi" },
      { id: "B", type: "input", at: [-6, 1], value: 0, hotLabel: "B girişi" },
      { id: "G", type: "and", at: [0, 0] },
      { id: "Y", type: "output", at: [6, 0] },
    ],
    wires: [[[-5, -1], [-3, -1]], [[-5, 1], [-3, 1]], [[3, 0], [5, 0]]],
    bounds: [-8, -2.6, 8, 2.6],
  };
  CIRCUITS.c10Gate1 = {
    title: "NOT kapısı",
    parts: [
      { id: "A", type: "input", at: [-5, 0], value: 0, hotLabel: "A girişi" },
      { id: "G", type: "not", at: [0, 0] },
      { id: "Y", type: "output", at: [5, 0] },
    ],
    wires: [[[-4, 0], [-2, 0]], [[2, 0], [4, 0]]],
    bounds: [-8, -2.6, 8, 2.6],
  };

  /* --- elektrikteki karşılıklar --- */
  // seri anahtarlar
  CIRCUITS.c10SwAnd = {
    ...common, title: "AND: seri anahtarlar",
    parts: [BAT, SW("SA", [4, 0]), SW("SB", [8, 0]), R1(12), LED(16), { id: "GND", type: "ground", at: [8, 8] }],
    wires: [[[0, 2], [0, 0], [2, 0]], [[14, 0], [16, 0], [16, 2]], [[16, 6], [16, 8], [0, 8], [0, 6]]],
  };
  // paralel anahtarlar
  CIRCUITS.c10SwOr = {
    ...common, title: "OR: paralel anahtarlar",
    parts: [BAT, SW("SA", [5, 0]), SW("SB", [5, 3.5]), R1(12), LED(16), { id: "GND", type: "ground", at: [8, 8] }],
    wires: [
      [[0, 2], [0, 0], [3, 0]], [[7, 0], [10, 0]],
      [[2, 0], [2, 3.5], [3, 3.5]], [[7, 3.5], [8, 3.5], [8, 0]],
      [[14, 0], [16, 0], [16, 2]], [[16, 6], [16, 8], [0, 8], [0, 6]],
    ],
  };
  // LED'i kısa devre eden anahtar: anahtar kapanınca akım LED'in yanından geçer
  CIRCUITS.c10SwNot = {
    ...common, title: "NOT: LED'i kısa devre eden anahtar",
    parts: [BAT, { ...R1(6) }, SW("SA", [11, 4], 90, [-1.6, 0]), LED(16), { id: "GND", type: "ground", at: [6, 8] }],
    wires: [[[0, 2], [0, 0], [4, 0]], [[8, 0], [16, 0], [16, 2]], [[16, 6], [16, 8], [0, 8], [0, 6]], [[11, 0], [11, 2]], [[11, 6], [11, 8]]],
  };
  // LED'e paralel, birbirine seri iki anahtar
  CIRCUITS.c10SwNand = {
    ...common, title: "NAND: LED'i kısa devre eden seri anahtarlar",
    parts: [BAT, { ...R1(6) }, SW("SA", [11, 2], 90, [-1.6, 0]), SW("SB", [11, 6], 90, [-1.6, 0]), LED(16), { id: "GND", type: "ground", at: [6, 8] }],
    wires: [[[0, 2], [0, 0], [4, 0]], [[8, 0], [16, 0], [16, 2]], [[16, 6], [16, 8], [0, 8], [0, 6]]],
  };
  // LED'e paralel, birbirine paralel iki anahtar
  CIRCUITS.c10SwNor = {
    ...common, title: "NOR: LED'i kısa devre eden paralel anahtarlar",
    parts: [BAT, { ...R1(6) }, SW("SA", [10.5, 4], 90, [-1.6, 0]), SW("SB", [13.5, 4], 90, [-1.6, 0]), LED(17), { id: "GND", type: "ground", at: [6, 8] }],
    wires: [
      [[0, 2], [0, 0], [4, 0]], [[8, 0], [17, 0], [17, 2]], [[17, 6], [17, 8], [0, 8], [0, 6]],
      [[10.5, 0], [10.5, 2]], [[10.5, 6], [10.5, 8]], [[13.5, 0], [13.5, 2]], [[13.5, 6], [13.5, 8]],
    ],
  };
  // vavien: iki yollu anahtarlar, ara teller çapraz (XOR) ya da düz (XNOR)
  const SPDT = (id, at, rot, flip) => ({ id, type: "c10spdt", at, rot, flip, closed: false, label: id.slice(1), hotLabel: id.slice(1) + " anahtarı" });
  const vavien = (cross) => ({
    ...common, title: cross ? "XOR: çapraz bağlı iki vavien anahtar" : "XNOR: düz bağlı iki vavien anahtar (merdiven lambası)",
    parts: [BAT, SPDT("SA", [4, 0]), SPDT("SB", [11, 0], 180, true), R1(15), LED(19), { id: "GND", type: "ground", at: [9, 8] }],
    wires: [
      [[0, 2], [0, 0], [2, 0]],
      ...(cross ? [[[6, -1], [7, -1], [8, 1], [9, 1]], [[6, 1], [7, 1], [8, -1], [9, -1]]] : [[[6, -1], [9, -1]], [[6, 1], [9, 1]]]),
      [[17, 0], [19, 0], [19, 2]], [[19, 6], [19, 8], [0, 8], [0, 6]],
    ],
  });
  CIRCUITS.c10SwXor = vavien(true);
  CIRCUITS.c10SwXnor = vavien(false);

  /* --- NAND bulmacası: en az kapılı çözümler (yuva numarası + bağlantılar) ---
     Yuvalar 3 sütun × 2 satır: 0 1 2 üst satır değil; sütun = yuva >> 1, satır = yuva & 1.
     Kaynak: "A", "B" ya da "g<yuva>"; hedef: "g<yuva>.a" / "g<yuva>.b" ya da "Y". */
  CIRCUITS.c10NandSolutions = {
    NOT: { gates: [2], wires: [["A", "g2.a"], ["A", "g2.b"], ["g2", "Y"]] },
    AND: { gates: [0, 2], wires: [["A", "g0.a"], ["B", "g0.b"], ["g0", "g2.a"], ["g0", "g2.b"], ["g2", "Y"]] },
    OR: { gates: [0, 1, 2], wires: [["A", "g0.a"], ["A", "g0.b"], ["B", "g1.a"], ["B", "g1.b"], ["g0", "g2.a"], ["g1", "g2.b"], ["g2", "Y"]] },
    XOR: { gates: [0, 2, 3, 4], wires: [["A", "g0.a"], ["B", "g0.b"], ["A", "g2.a"], ["g0", "g2.b"], ["g0", "g3.a"], ["B", "g3.b"], ["g2", "g4.a"], ["g3", "g4.b"], ["g4", "Y"]] },
  };

  /* --- iki katmanlı XOR: OR ve NAND, ardından AND --- */
  CIRCUITS.c10XorNet = {
    title: "İki katmanla XOR",
    parts: [
      { id: "A", type: "input", at: [0, 0], value: 0, hotLabel: "Ağ girişi A" },
      { id: "B", type: "input", at: [0, 6], value: 0, hotLabel: "Ağ girişi B" },
      { id: "OR", type: "or", at: [8, 0] },
      { id: "NAND", type: "nand", at: [8, 6] },
      { id: "AND", type: "and", at: [16, 3] },
      { id: "Y", type: "output", at: [22, 3] },
    ],
    wires: [
      [[1, 0], [3, 0], [3, -1], [5, -1]], [[3, 0], [3, 5], [5, 5]],
      [[1, 6], [4, 6], [4, 7], [5, 7]], [[4, 6], [4, 1], [5, 1]],
      [[11, 0], [12, 0], [12, 2], [13, 2]], [[11, 6], [12, 6], [12, 4], [13, 4]],
      [[19, 3], [21, 3]],
    ],
    bounds: [-2, -2.5, 24, 8.5],
  };
})();
