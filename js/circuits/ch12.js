/* Devre tanımları (veri): 12. bölüm — kombinasyonel devreler.
   Yarım/tam toplayıcı (kapı düzeyinde), 4 bitlik dalgalı elde toplayıcı (tam toplayıcı blokları),
   4:1 çoklayıcı ve 2→4 kod çözücü (kapı düzeyinde).
   Özel parçalar js/demos/ch12.js içinde tanımlıdır: c12lab (yazı, üst çizgi destekli),
   c12fa (içinde 5 kapı olan tam toplayıcı bloğu), c12cell (bellek hücresi, kelime hattıyla seçilir). */
window.CIRCUITS = window.CIRCUITS || {};
(function () {
  const lab = (id, text, at, o = {}) => ({ id, type: "c12lab", at, text, ...o });

  /* Yarım toplayıcı: S = A ⊕ B, Cout = A · B */
  CIRCUITS.c12Half = {
    title: "Yarım toplayıcı",
    bounds: [-3.2, -1.6, 19, 7.6],
    parts: [
      { id: "A", type: "input", at: [0, 0], value: 1 },
      { id: "B", type: "input", at: [0, 2], value: 1 },
      { id: "X1", type: "xor", at: [8, 1] },
      { id: "N1", type: "and", at: [8, 6] },
      { id: "S", type: "output", at: [14, 1] },
      { id: "Cout", type: "output", at: [14, 6] },
      lab("tA", "A", [-2.4, 0], { size: 0.8 }),
      lab("tB", "B", [-2.4, 2], { size: 0.8 }),
      lab("tS", "S", [15.7, 1], { size: 0.8, align: "left" }),
      lab("tS2", "toplam", [15.7, 2.1], { size: 0.5, align: "left", muted: true }),
      lab("tC", "Cout", [15.7, 6], { size: 0.8, align: "left" }),
      lab("tC2", "elde", [15.7, 7.1], { size: 0.5, align: "left", muted: true }),
      lab("tX", "XOR", [8, -1.1], { size: 0.5, muted: true }),
      lab("tN", "AND", [8, 8], { size: 0.5, muted: true }),
    ],
    wires: [
      [[1, 0], [5, 0]],
      [[2, 0], [2, 5], [5, 5]],
      [[1, 2], [5, 2]],
      [[3, 2], [3, 7], [5, 7]],
      [[11, 1], [13, 1]],
      [[11, 6], [13, 6]],
    ],
  };

  /* Tam toplayıcı: iki yarım toplayıcı + VEYA.
     P = A ⊕ B;  S = P ⊕ Cin;  Cout = A·B + P·Cin */
  CIRCUITS.c12Full = {
    title: "Tam toplayıcı",
    bounds: [-3.4, -2.4, 32, 10.4],
    halves: [[3.2, -1.2, 10.6, 7.2], [12.2, -0.2, 19.6, 9.6]],
    parts: [
      { id: "A", type: "input", at: [0, 0], value: 1 },
      { id: "B", type: "input", at: [0, 2], value: 1 },
      { id: "Cin", type: "input", at: [0, 9], value: 0 },
      { id: "X1", type: "xor", at: [7, 1] },
      { id: "N1", type: "and", at: [7, 5] },
      { id: "X2", type: "xor", at: [16, 2] },
      { id: "N2", type: "and", at: [16, 7] },
      { id: "O1", type: "or", at: [23, 6] },
      { id: "S", type: "output", at: [28, 2] },
      { id: "Cout", type: "output", at: [28, 6] },
      lab("tA", "A", [-2.4, 0], { size: 0.8 }),
      lab("tB", "B", [-2.4, 2], { size: 0.8 }),
      lab("tCi", "Cin", [-2.4, 9], { size: 0.8, align: "right", dx: 0.6 }),
      lab("tS", "S", [29.7, 2], { size: 0.8, align: "left" }),
      lab("tC", "Cout", [29.7, 6], { size: 0.8, align: "left" }),
      lab("tP", "A ⊕ B", [12.5, 0.3], { size: 0.5, muted: true, align: "left" }),
    ],
    wires: [
      [[1, 0], [4, 0]],
      [[2, 0], [2, 4], [4, 4]],
      [[1, 2], [4, 2]],
      [[3, 2], [3, 6], [4, 6]],
      [[10, 1], [13, 1]],
      [[11, 1], [11, 6], [13, 6]],
      [[1, 9], [12, 9], [12, 3], [13, 3]],
      [[12, 8], [13, 8]],
      [[10, 5], [20, 5]],
      [[19, 7], [20, 7]],
      [[19, 2], [27, 2]],
      [[26, 6], [27, 6]],
    ],
  };

  /* 4 bitlik dalgalı elde (ripple-carry) toplayıcı. En anlamlı bit solda (elle toplamadaki gibi);
     elde sağdan sola, bir bloktan ötekine akar. Her TT bloğu içinde 5 kapı vardır (Logic.build.fullAdder). */
  const X = [27, 18, 9, 0];
  // Not: giriş parçaları blokların ÖNÜNDE olmalı. Logic.network'te bir sinyali ilk kaydeden belirler;
  // blok önce gelirse giriş sinyali "x" (tanımsız) olarak kaydedilir ve girişin değeri yok sayılır.
  const rca = { title: "4 bitlik dalgalı elde toplayıcı", bounds: [-7, -8.6, 34.4, 8.4], parts: [], wires: [] };
  rca.parts.push({ id: "C0", type: "input", at: [32, 0], rot: 180, value: 0 });
  X.forEach((x, i) => {
    rca.parts.push(
      { id: "A" + i, type: "input", at: [x - 1.5, -5], rot: 90, value: [1, 0, 1, 0][i] },
      { id: "B" + i, type: "input", at: [x + 1.5, -5], rot: 90, value: [1, 1, 0, 0][i] },
    );
  });
  X.forEach((x, i) => {
    rca.parts.push(
      { id: "FA" + i, type: "c12fa", at: [x, 0], title: "TT" + i, delay: 1 },
      { id: "S" + i, type: "output", at: [x, 5], rot: 90 },
      lab("tA" + i, "A" + i, [x - 1.5, -7.6], { size: 0.8 }),
      lab("tB" + i, "B" + i, [x + 1.5, -7.6], { size: 0.8 }),
      lab("tS" + i, "S" + i, [x, 7.5], { size: 0.8 }),
    );
    rca.wires.push([[x - 1.5, -4], [x - 1.5, -3]], [[x + 1.5, -4], [x + 1.5, -3]], [[x, 3], [x, 4]]);
    if (i < 3) {
      rca.wires.push([[x - 3, 0], [x - 6, 0]]);
      rca.parts.push(lab("tC" + (i + 1), "C" + (i + 1), [x - 4.5, -0.9], { size: 0.72, color: "copper" }));
    }
  });
  rca.parts.push(
    lab("tC0", "C0", [32.3, -1.7], { size: 0.72, color: "copper" }),
    { id: "C4", type: "output", at: [-5, 5], rot: 90 },
    lab("tC4", "C4", [-5, 7.5], { size: 0.8, color: "copper" }),
  );
  rca.wires.push([[30, 0], [31, 0]], [[-3, 0], [-5, 0], [-5, 4]]);
  CIRCUITS.c12Rca = rca;

  /* 4:1 çoklayıcı (MUX): Y = D0·S1'·S0' + D1·S1'·S0 + D2·S1·S0' + D3·S1·S0
     Seçim hatları ve tümleyenleri dikey baralar olarak iner (x = 13: S1, 15: S1', 17: S0, 19: S0'). */
  CIRCUITS.c12Mux = {
    title: "4:1 çoklayıcı (MUX)",
    bounds: [0, -2.2, 41.5, 26],
    parts: [
      { id: "D0", type: "input", at: [8, -1], value: 0 },
      { id: "D1", type: "input", at: [8, 4], value: 1 },
      { id: "D2", type: "input", at: [8, 9], value: 1 },
      { id: "D3", type: "input", at: [8, 14], value: 0 },
      { id: "S1", type: "input", at: [3, 19], value: 0 },
      { id: "S0", type: "input", at: [3, 23], value: 1 },
      { id: "NS1", type: "not", at: [7, 21] },
      { id: "NS0", type: "not", at: [7, 25] },
      { id: "G0", type: "and", n: 3, at: [24, 0] },
      { id: "G1", type: "and", n: 3, at: [24, 5] },
      { id: "G2", type: "and", n: 3, at: [24, 10] },
      { id: "G3", type: "and", n: 3, at: [24, 15] },
      { id: "OR", type: "or", n: 4, at: [33, 7.5] },
      { id: "Y", type: "output", at: [38, 7.5] },
      lab("tD0", "D0", [5.6, -1], { size: 0.75 }), lab("tD1", "D1", [5.6, 4], { size: 0.75 }),
      lab("tD2", "D2", [5.6, 9], { size: 0.75 }), lab("tD3", "D3", [5.6, 14], { size: 0.75 }),
      lab("tS1", "S1", [0.6, 19], { size: 0.75 }), lab("tS0", "S0", [0.6, 23], { size: 0.75 }),
      lab("tS1n", "S1", [10.4, 20.3], { size: 0.55, ov: true, muted: true }),
      lab("tS0n", "S0", [10.4, 24.3], { size: 0.55, ov: true, muted: true }),
      lab("tY", "Y", [39.7, 7.5], { size: 0.8, align: "left" }),
    ],
    wires: [
      [[9, -1], [21, -1]], [[9, 4], [21, 4]], [[9, 9], [21, 9]], [[9, 14], [21, 14]],
      [[4, 19], [13, 19], [13, 10]],
      [[5, 19], [5, 21]],
      [[9, 21], [15, 21], [15, 0]],
      [[4, 23], [17, 23], [17, 6]],
      [[5, 23], [5, 25]],
      [[9, 25], [19, 25], [19, 1]],
      [[15, 0], [21, 0]], [[19, 1], [21, 1]],
      [[15, 5], [21, 5]], [[17, 6], [21, 6]],
      [[13, 10], [21, 10]], [[19, 11], [21, 11]],
      [[13, 15], [21, 15]], [[17, 16], [21, 16]],
      [[27, 0], [29, 0], [29, 6], [30, 6]],
      [[27, 5], [28, 5], [28, 7], [30, 7]],
      [[27, 10], [28, 10], [28, 8], [30, 8]],
      [[27, 15], [29, 15], [29, 9], [30, 9]],
      [[36, 7.5], [37, 7.5]],
    ],
    // seçilen veri yolu (vurgulama için): D girişi → VE kapısı → VEYA → Y
    paths: [0, 1, 2, 3].map((i) => ({
      gate: "G" + i,
      data: "D" + i,
      pts: [
        [[9, 5 * i - 1], [21, 5 * i - 1]],
        [[[27, 0], [29, 0], [29, 6], [30, 6]], [[27, 5], [28, 5], [28, 7], [30, 7]], [[27, 10], [28, 10], [28, 8], [30, 8]], [[27, 15], [29, 15], [29, 9], [30, 9]]][i],
        [[36, 7.5], [37, 7.5]],
      ],
    })),
  };

  /* 2→4 kod çözücü: her çıkış bir adres için 1 olur; çıkışlar bellek hücrelerinin kelime hatlarını sürer.
     Hücre içerikleri: "KAPI" harflerinin ASCII kodları. */
  CIRCUITS.c12Dec = {
    title: "2→4 kod çözücü ve bellek hücreleri",
    bounds: [0, -2.4, 37, 24.4],
    parts: [
      { id: "A1", type: "input", at: [3, 16], value: 1 },
      { id: "A0", type: "input", at: [3, 21], value: 0 },
      { id: "NA1", type: "not", at: [7, 18] },
      { id: "NA0", type: "not", at: [7, 23] },
      { id: "G0", type: "and", at: [22, 0] },
      { id: "G1", type: "and", at: [22, 4] },
      { id: "G2", type: "and", at: [22, 8] },
      { id: "G3", type: "and", at: [22, 12] },
      ...[0x4b, 0x41, 0x50, 0x49].map((byte, k) => ({ id: "M" + k, type: "c12cell", at: [29, 4 * k], addr: k, byte })),
      lab("tA1", "A1", [0.6, 16], { size: 0.75 }), lab("tA0", "A0", [0.6, 21], { size: 0.75 }),
      lab("tA1n", "A1", [10.6, 17.3], { size: 0.55, ov: true, muted: true }),
      lab("tA0n", "A0", [10.6, 22.3], { size: 0.55, ov: true, muted: true }),
      ...[0, 1, 2, 3].map((k) => lab("tY" + k, "Y" + k, [25.6, 4 * k - 0.75], { size: 0.5, muted: true })),
    ],
    wires: [
      [[4, 16], [10, 16], [10, 7]],
      [[5, 16], [5, 18]],
      [[9, 18], [12, 18], [12, -1]],
      [[4, 21], [14, 21], [14, 5]],
      [[5, 21], [5, 23]],
      [[9, 23], [16, 23], [16, 1]],
      [[12, -1], [19, -1]], [[16, 1], [19, 1]],
      [[12, 3], [19, 3]], [[14, 5], [19, 5]],
      [[10, 7], [19, 7]], [[16, 9], [19, 9]],
      [[10, 11], [19, 11]], [[14, 13], [19, 13]],
      [[25, 0], [26, 0]], [[25, 4], [26, 4]], [[25, 8], [26, 8]], [[25, 12], [26, 12]],
    ],
  };
})();
