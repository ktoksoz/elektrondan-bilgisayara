/* Devre tanımları (veri): 3. bölüm, devre analizi.
   Koordinatlar ızgara birimidir; parçaların pim konumları schematic.js'deki kütüphanede. */
window.CIRCUITS = window.CIRCUITS || {};

/* Seri ve paralel: pil + ampermetre. Dirençler deneyde "gruplar" hâlinde eklenir:
   gruplar birbirine seri, bir grubun içindeki dirençler birbirine paraleldir.
   layout: ilk grubun sol bara x'i, grup aralığı, paralel satır aralığı. */
CIRCUITS.c3seriParalel = {
  title: "Seri ve paralel dirençler",
  iRef: 0.004,
  vRange: [0, 12],
  layout: { x0: 7, pitch: 7, row: 3, minBottom: 10 },
  start: [[1000], [2200, 4700]],
  parts: [
    { id: "B1", type: "battery", at: [0, 5], rot: 90, V: 9, label: "B1", lp: [-2.6, 0] },
    { id: "A1", type: "ammeter", at: [3, 0], label: false, mp: [0, -1.75] },
  ],
  wires: [[[0, 3], [0, 0], [1, 0]]],
};

/* Gerilim bölücü: pil + potansiyometre, çıkışta voltmetre; anahtarla bağlanan yük */
CIRCUITS.c3bolucu = {
  title: "Potansiyometreli gerilim bölücü",
  iRef: 0.0006,
  vRange: [0, 12],
  parts: [
    { id: "B1", type: "battery", at: [0, 6], rot: 90, V: 10, label: "B1", lp: [-2.6, 0] },
    { id: "P1", type: "pot", at: [8, 5], rot: 90, R: 10000, pos: 0.5, label: "P1 10 kΩ", lp: [-3.2, 0] },
    { id: "VM", type: "voltmeter", at: [15, 8], rot: 90, label: false, mp: [-2.4, 0] },
    { id: "S1", type: "switch", at: [21, 7], rot: 90, closed: false, label: "S1", hotLabel: "Yük anahtarı", lp: [2.2, 0] },
    { id: "RL", type: "resistor", at: [21, 12], rot: 90, R: 10000, lp: [3, 0] },
    { id: "GND", type: "ground", at: [10, 15] },
    { id: "T1", type: "text", at: [12.6, 4.2], text: "çıkış", color: "#c2c9bb", size: 0.62 },
  ],
  wires: [
    [[0, 4], [0, 0], [8, 0], [8, 3]],
    [[10, 5], [21, 5]],
    [[15, 5], [15, 6]],
    [[21, 9], [21, 10]],
    [[0, 8], [0, 15], [21, 15], [21, 14]],
    [[8, 7], [8, 15]],
    [[15, 10], [15, 15]],
  ],
};

/* KCL: X düğümüne dört kol bağlı. Ampermetrelerin b ucu düğüme bakar:
   okuma artıysa akım düğüme giriyor, eksiyse düğümden çıkıyor. */
CIRCUITS.c3kcl = {
  title: "Kirchhoff akım yasası: dört kollu düğüm",
  iRef: 0.003,
  vRange: [0, 12],
  // dördüncü kol (R4) Thevenin modunda "yük" olarak alınır
  loadBox: [12.4, 8.6, 18.8, 17.6],
  parts: [
    { id: "V1", type: "battery", at: [-2, 10], rot: 90, V: 9, label: "V1", lp: [2.6, 0] },
    { id: "R1", type: "resistor", at: [2, 4], R: 1000 },
    { id: "A1", type: "ammeter", at: [7, 4], label: "A1", lp: [0, -1.55] },
    { id: "A2", type: "ammeter", at: [17, 4], rot: 180, label: "A2", lp: [0, -1.55] },
    { id: "R2", type: "resistor", at: [22, 4], R: 2200 },
    { id: "V2", type: "battery", at: [26, 10], rot: 90, V: 5, label: "V2", lp: [-2.6, 0] },
    { id: "A3", type: "ammeter", at: [10, 7], rot: 270, label: "A3", mp: [-2.7, 1], lp: [-2.7, -0.2] },
    { id: "R3", type: "resistor", at: [10, 11], rot: 90, R: 4700, lp: [-3, 0] },
    { id: "A4", type: "ammeter", at: [14, 7], rot: 270, label: "A4", mp: [2.7, 1], lp: [2.7, -0.2] },
    { id: "R4", type: "resistor", at: [14, 11], rot: 90, R: 1000, lp: [3, 0] },
    { id: "S1", type: "switch", at: [14, 15], rot: 90, closed: true, label: "S1", lp: [2.2, 0] },
    { id: "GND", type: "ground", at: [6, 17] },
    { id: "TX", type: "text", at: [12, 2.6], text: "X", size: 0.8, color: "#f0b07a", weight: 800 },
  ],
  wires: [
    [[0, 4], [-2, 4], [-2, 8]],
    [[4, 4], [5, 4]],
    [[9, 4], [15, 4]],
    [[19, 4], [20, 4]],
    [[24, 4], [26, 4], [26, 8]],
    [[10, 4], [10, 5]],
    [[14, 4], [14, 5]],
    [[10, 13], [10, 17]],
    [[-2, 12], [-2, 17], [26, 17], [26, 12]],
  ],
};

/* Thevenin eşdeğeri: tek kaynak + tek direnç + aynı yük */
CIRCUITS.c3thev = {
  title: "Thevenin eşdeğer devresi",
  iRef: 0.003,
  vRange: [0, 12],
  parts: [
    { id: "Vth", type: "battery", at: [0, 4], rot: 90, V: 4, lp: [-3.2, 0] },
    { id: "Rth", type: "resistor", at: [4, 0], R: 500 },
    { id: "A", type: "ammeter", at: [9, 0], label: false, mp: [0, -1.75] },
    { id: "RL", type: "resistor", at: [13, 3], rot: 90, R: 1000, label: "R4 (yük)", lp: [3.4, 0] },
    { id: "S", type: "switch", at: [13, 7], rot: 90, closed: true, locked: true, label: "S1", lp: [2.2, 0] },
  ],
  wires: [
    [[0, 2], [0, 0], [2, 0]],
    [[6, 0], [7, 0]],
    [[11, 0], [13, 0], [13, 1]],
    [[13, 9], [13, 10], [0, 10], [0, 6]],
  ],
};

/* KVL: iki gözlü devre. loops: gezginin izlediği yol; nokta ya da {p, from, to}
   (parçayı from piminden to pimine geçer). Hepsi saat yönünde. */
CIRCUITS.c3kvl = {
  title: "Kirchhoff gerilim yasası: iki gözlü devre",
  iRef: 0.003,
  vRange: [0, 12],
  parts: [
    { id: "V1", type: "battery", at: [0, 6], rot: 90, V: 9, label: "V1", lp: [-2.6, 0] },
    { id: "R1", type: "resistor", at: [5, 0], R: 1000 },
    { id: "R2", type: "resistor", at: [12, 5], rot: 90, R: 2200, lp: [3, 0] },
    { id: "R3", type: "resistor", at: [19, 0], R: 1000 },
    { id: "V2", type: "battery", at: [24, 6], rot: 90, V: 3, label: "V2", lp: [2.6, 0] },
    { id: "GND", type: "ground", at: [12, 10] },
  ],
  wires: [
    [[0, 4], [0, 0], [3, 0]],
    [[7, 0], [17, 0]],
    [[12, 0], [12, 3]],
    [[12, 7], [12, 10]],
    [[21, 0], [24, 0], [24, 4]],
    [[24, 8], [24, 10], [0, 10], [0, 8]],
  ],
  // gezgin etiketlerinin parça merkezine göre konumu
  tags: { V1: [2.7, 0], R1: [0, 1.4], R2: [-2.9, 0], R3: [0, 1.4], V2: [-2.7, 0] },
  loops: {
    sol: [[0, 10], { p: "V1", from: "b", to: "a" }, [0, 0], { p: "R1", from: "a", to: "b" }, [12, 0], { p: "R2", from: "a", to: "b" }, [12, 10], [0, 10]],
    sag: [[12, 10], { p: "R2", from: "b", to: "a" }, [12, 0], { p: "R3", from: "a", to: "b" }, [24, 0], { p: "V2", from: "a", to: "b" }, [24, 10], [12, 10]],
    dis: [[0, 10], { p: "V1", from: "b", to: "a" }, [0, 0], { p: "R1", from: "a", to: "b" }, { p: "R3", from: "a", to: "b" }, [24, 0], { p: "V2", from: "a", to: "b" }, [24, 10], [0, 10]],
  },
};

/* Multimetre: pil + güç anahtarı + direnç + lamba. Ölçü aleti (c3meter) ve
   A kademesindeki sigortası (F1) prob yerleşimine göre eklenir.
   Her yerleşimde: meter = ölçü aletinin yeri, fuse = sigortanın yeri (A kademesi),
   wires = prob kabloları; cut = devreden çıkarılacak tel (seri bağlamada). */
CIRCUITS.c3multimetre = {
  title: "Multimetre ile ölçüm",
  iRef: 0.012,
  vRange: [0, 9],
  bounds: [-6, -6, 28, 13],
  fuseRating: 0.1,
  parts: [
    { id: "B1", type: "battery", at: [0, 6], rot: 90, V: 9, Rint: 0.5, label: "B1 9 V", lp: [2.8, 0] },
    { id: "S1", type: "switch", at: [4, 0], closed: true, label: "S1 güç", hotLabel: "Güç anahtarı" },
    { id: "R1", type: "resistor", at: [11, 0], R: 220 },
    { id: "L1", type: "lamp", at: [22, 6], rot: 90, R: 33, Pnom: 0.04, label: "L1 33 Ω", lp: [-3, 0] },
  ],
  wires: [
    [[0, 4], [0, 0], [2, 0]],
    [[6, 0], [9, 0]],
    [[13, 0], [22, 0], [22, 4]],
    [[22, 8], [22, 12], [0, 12], [0, 8]],
  ],
  placements: {
    R1: {
      meter: { at: [13, -4] }, fuse: { at: [9, -4] },
      wires: [[[9, 0], [9, -2], [7, -2], [7, -4]], [[15, -4], [15, -2], [13, -2], [13, 0]]],
    },
    L1: {
      meter: { at: [26, 8], rot: 90 }, fuse: { at: [26, 4], rot: 90 },
      wires: [[[22, 4], [24, 4], [24, 2], [26, 2]], [[22, 8], [24, 8], [24, 10], [26, 10]]],
    },
    B1: {
      meter: { at: [-4, 8], rot: 90 }, fuse: { at: [-4, 4], rot: 90 },
      wires: [[[0, 4], [-2, 4], [-2, 2], [-4, 2]], [[0, 8], [-2, 8], [-2, 10], [-4, 10]]],
    },
    seri: {
      meter: { at: [19, 0] }, fuse: { at: [15, 0] },
      cut: 2,
      wires: [[[21, 0], [22, 0], [22, 4]]],
    },
  },
};
