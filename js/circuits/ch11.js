/* Devre tanımları (veri): 11. bölüm — Karnaugh haritaları.
   Minterm devresi: üç giriş, her birine bir evirici ve iki dikey ray (A ile A').
   Demo, tablodaki her 1 satırı için bu tabana bir 3 girişli VE kapısı, en sona bir VEYA ekler
   (kopyalanmış tanıma parça ve tel ekleyerek); kullanılmayan eviriciler çıkarılır. */
window.CIRCUITS = window.CIRCUITS || {};
(function () {
  // değişken k için: giriş [5k, 0], doğru ray x = 5k+2, ters ray x = 5k+4 (evirici [5k+4, 3], aşağı bakar)
  const parts = [];
  ["A", "B", "C"].forEach((v, k) => {
    parts.push({ id: v, type: "input", at: [5 * k, 0], value: 0, hotLabel: v + " girişi" });
    parts.push({ id: "T" + v, type: "text", at: [5 * k - 0.6, -1.45], text: v, size: 0.95, color: "#efeee2", weight: 700 });
    parts.push({ id: "N" + v, type: "not", at: [5 * k + 4, 3], rot: 90 });
  });
  parts.push({ id: "Y", type: "output", at: [34, 0] });
  parts.push({ id: "TY", type: "text", at: [36.2, 0], text: "Y", size: 0.95, color: "#efeee2", weight: 700 });

  CIRCUITS.c11Minterm = {
    title: "Kanonik çarpımların toplamı devresi",
    pad: 0.8, padTop: 1.2,
    parts,
    wires: [],
    // yerleşim ölçüleri (demo kapıları bunlara göre yerleştirir)
    geo: {
      vars: ["A", "B", "C"],
      rail: [[2, 4], [7, 9], [12, 14]],   // [doğru, ters] ray x konumları
      notIn: 1, notOut: 5,                // evirici giriş/çıkış y
      andX: 18, y0: 7, pitch: 4,           // VE kapıları: merkez x, ilk kapı y, aralık
      orX: 29, outX: 34, textX: 36.2,                 // VEYA merkez x, çıkış lambası x
      fanX: 22,                            // VE çıkışlarının VEYA'ya döndüğü ilk dikey x
    },
  };
})();
