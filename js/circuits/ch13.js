/* Devre tanımları (veri): 13. bölüm — hafıza: latch ve flip-flop.
   c13clk: demonun sürdüğü saat kaynağı (hız, durdurma, tek darbe için); c13lab: şema yazısı.
   Bu iki parça türü js/demos/ch13.js içinde tanımlanır. */
window.CIRCUITS = window.CIRCUITS || {};
(function () {
  const lab = (id, at, text, o = {}) => ({ id, type: "c13lab", at, text, label: false, ...o });

  /* SR latch: iki NOR kapısı çapraz bağlı. Q = NOR(R, Q'), Q' = NOR(S, Q).
     Girişler parça listesinde önce gelir (sinyaller kapılardan önce tanımlansın). */
  CIRCUITS.c13Sr = {
    title: "NOR kapılı SR latch",
    animate: true, rate: 4, settle: 1,
    parts: [
      { id: "R", type: "input", at: [0, -1], value: 0, hotLabel: "R girişi" },
      { id: "S", type: "input", at: [0, 9], value: 0, hotLabel: "S girişi" },
      { id: "G1", type: "nor", at: [8, 0], delay: 1 },
      { id: "G2", type: "nor", at: [8, 8], delay: 1 },
      { id: "LQ", type: "output", at: [17, 0] },
      { id: "LQN", type: "output", at: [17, 8] },
      lab("tR", [-2.3, -1], "R", { size: 0.95, weight: 750, align: "right" }),
      lab("tR2", [-0.3, -2.4], "sıfırla", { size: 0.55, color: "#86a194" }),
      lab("tS", [-2.3, 9], "S", { size: 0.95, weight: 750, align: "right" }),
      lab("tS2", [-0.3, 10.4], "kur", { size: 0.55, color: "#86a194" }),
      lab("tQ", [18.8, 0], "Q", { size: 0.95, weight: 750, align: "left" }),
      lab("tQN", [18.8, 8], "Q", { size: 0.95, weight: 750, align: "left", overline: true }),
      lab("tG1", [8, -2.4], "NOR", { size: 0.5, color: "#86a194" }),
      lab("tG2", [8, 10.4], "NOR", { size: 0.5, color: "#86a194" }),
    ],
    wires: [
      [[1, -1], [5, -1]],
      [[1, 9], [5, 9]],
      [[11, 0], [16, 0]],
      [[11, 8], [16, 8]],
      // geri besleme: Q → G2, Q' → G1 (x = 4, y = 3'te kesişir ama bağlı değildir)
      [[13, 0], [13, 3], [3, 3], [3, 7], [5, 7]],
      [[13, 8], [13, 5], [4, 5], [4, 1], [5, 1]],
    ],
  };

  /* D latch ve D flip-flop aynı D ve saatle sürülür. Q' çıkışları kullanılmıyor. */
  CIRCUITS.c13Dff = {
    title: "D latch ve D flip-flop",
    animate: true, rate: 10, settle: 1, allowFloating: true,
    parts: [
      { id: "D", type: "input", at: [0, -4], value: 0, hotLabel: "D girişi" },
      { id: "CLK", type: "c13clk", at: [0, 6] },
      { id: "LAT", type: "dlatch", at: [10, -3] },
      { id: "FF", type: "dff", at: [10, 5], title: "D FF" },
      { id: "LQL", type: "output", at: [17, -4] },
      { id: "LQF", type: "output", at: [17, 4] },
      lab("tD", [-2.3, -4], "D", { size: 0.95, weight: 750, align: "right" }),
      lab("tC", [0, 7.6], "CLK", { size: 0.6, weight: 700 }),
      lab("tQL", [18.6, -4], "Q latch", { size: 0.7, weight: 700, align: "left" }),
      lab("tQF", [18.6, 4], "Q flip-flop", { size: 0.7, weight: 700, align: "left" }),
    ],
    wires: [
      [[1, -4], [7, -4]],
      [[4, -4], [4, 4], [7, 4]],
      [[1.5, 6], [7, 6]],
      [[5, 6], [5, -2], [7, -2]],
      [[13, -4], [16, -4]],
      [[13, 4], [16, 4]],
    ],
  };

  /* 4 bitlik dalgalı (asenkron) sayaç: T = 1 olan dört T flip-flop.
     Her basamağın saati bir öncekinin Q' çıkışıdır: Q düşerken Q' yükselir, sonraki basamak değişir. */
  const cnt = { title: "4 bitlik dalgalı sayaç (T flip-flop)", animate: true, rate: 12, settle: 1, allowFloating: true, parts: [], wires: [] };
  cnt.parts.push({ id: "CLK", type: "c13clk", at: [1, 1] });
  for (let i = 0; i < 4; i++) cnt.parts.push({ id: "T" + i, type: "input", at: [3.5 + 11 * i, -1], value: 1, locked: true });
  for (let i = 0; i < 4; i++) {
    const x = 8 + 11 * i;
    cnt.parts.push({ id: "FF" + i, type: "tff", at: [x, 0] });
    cnt.parts.push({ id: "L" + i, type: "output", at: [x + 4, -5], rot: 270 });
    cnt.parts.push(lab("tL" + i, [x + 5.4, -5], "Q" + i, { size: 0.75, weight: 750, align: "left" }));
    cnt.wires.push([[4.5 + 11 * i, -1], [x - 3, -1]]);
    cnt.wires.push([[x + 3, -1], [x + 4, -1], [x + 4, -4]]);
    if (i < 3) cnt.wires.push([[x + 3, 1], [x + 8, 1]]);
  }
  cnt.wires.push([[2.5, 1], [5, 1]]);
  cnt.parts.push(lab("tC", [1, 2.6], "CLK", { size: 0.6, weight: 700 }));
  CIRCUITS.c13Counter = cnt;

  /* Kaydırmalı yazmaç: dört D flip-flop zincir. mode: "seri" (veri girişi), "halka" (Q3 → D0),
     "johnson" (Q3 bir NOT kapısından geçip D0'a). */
  function shift(mode) {
    const d = { title: "4 bitlik kaydırmalı yazmaç (" + mode + ")", animate: true, rate: 10, settle: 1, allowFloating: true, parts: [], wires: [] };
    d.parts.push({ id: "CLK", type: "c13clk", at: [1, 4] });
    if (mode === "seri") d.parts.push({ id: "DATA", type: "input", at: [2, -1], value: 0, hotLabel: "Veri girişi" });
    for (let i = 0; i < 4; i++) {
      const x = 8 + 9 * i;
      d.parts.push({ id: "FF" + i, type: "dff", at: [x, 0], init: mode === "halka" && i === 0 ? 1 : 0 });
      d.parts.push({ id: "L" + i, type: "output", at: [i < 3 ? x + 4 : 39, -5], rot: 270 });
      d.parts.push(lab("tL" + i, [(i < 3 ? x + 4 : 39) + 1.4, -5], "Q" + i, { size: 0.75, weight: 750, align: "left" }));
      if (i < 3) {
        d.wires.push([[x + 3, -1], [x + 6, -1]]);
        d.wires.push([[x + 4, -1], [x + 4, -4]]);
        d.wires.push([[x - 3, 4], [x - 3, 1]]);
      }
    }
    d.wires.push([[2.5, 4], [32, 4], [32, 1]]);
    d.parts.push(lab("tC", [1, 5.6], "CLK", { size: 0.6, weight: 700 }));
    if (mode === "seri") {
      d.wires.push([[3, -1], [5, -1]]);
      d.wires.push([[38, -1], [39, -1], [39, -4]]);
      d.parts.push(lab("tD", [1.2, -2.5], "Veri", { size: 0.6, weight: 700 }));
    } else {
      d.wires.push([[39, -1], [39, -4]]);
      if (mode === "halka") d.wires.push([[38, -1], [41, -1], [41, -8], [2, -8], [2, -1], [5, -1]]);
      else {
        d.parts.push({ id: "INV", type: "not", at: [20, -8], rot: 180 });
        d.wires.push([[38, -1], [41, -1], [41, -8], [22, -8]]);
        d.wires.push([[18, -8], [2, -8], [2, -1], [5, -1]]);
      }
      d.parts.push(lab("tFb", [30, -9.1], mode === "halka" ? "geri besleme: Q3 → D0" : "geri besleme: Q3' → D0 (NOT)", { size: 0.6, color: "#86a194" }));
    }
    return d;
  }
  CIRCUITS.c13ShiftSerial = shift("seri");
  CIRCUITS.c13ShiftRing = shift("halka");
  CIRCUITS.c13ShiftJohnson = shift("johnson");
})();
