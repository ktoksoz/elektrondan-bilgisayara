// Doğrulama aracı: her slaytta
//  1) şema = benzetim: her parçanın çözücü bileşenindeki düğümler, çizimden çıkarılan düğümlerle aynı mı
//  2) şema uyarıları (bağlanmamış pim, boşta tel ucu)
//  3) KCL: her analog devrede her düğümde akım toplamı ≈ 0
//  4) Newton–Raphson: slayttaki her kaydırıcı uçtan uca taranır, her adımda yakınsama ve KCL denetlenir
//  5) hayalet el senaryosundaki her hedef sayfada var mı
//  6) FPS (2 saniye)
// Kullanım: NODE_PATH=<playwright-core node_modules> node tools/check.js <url> [slayt-id ...]
const { chromium } = require("playwright-core");
const path = require("path");
const os = require("os");
const exe = path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const [url, ...only] = process.argv.slice(2);
const STEPS = +(process.env.STEPS || 25);

(async () => {
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const logs = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.type() + ": " + m.text()); });
  page.on("pageerror", (e) => logs.push("pageerror: " + e.message));
  await page.addInitScript(() => { try { localStorage.setItem("rehber.kapali", "1"); } catch (e) {} });
  await page.goto(url, { waitUntil: "networkidle" });
  const ids = await page.evaluate(() => [...document.querySelectorAll(".slide")].map((s) => s.id));
  let bad = 0;
  const rows = [];
  for (const [i, id] of ids.entries()) {
    if (only.length && !only.includes(id)) continue;
    const before = logs.length;
    await page.evaluate((k) => Deck.go(k), i);
    await page.waitForTimeout(600);
    const r = await page.evaluate(async ({ STEPS }) => {
      const slide = document.querySelector(".slide.active");
      const out = { sch: 0, mismatch: [], warn: [], kcl: 0, conv: true, sweeps: 0, sweepFail: [], guide: [], fps: 0 };
      const mine = () => (window.__schematics || []).filter((s) => slide.contains(s.canvas));
      const checkAll = (tag) => {
        for (const s of mine()) {
          if (s.kind !== "analog") continue;
          const e = s.sim.kclError();
          out.kcl = Math.max(out.kcl, e);
          if (!s.sim.converged || !(e < 1e-6)) { out.conv = out.conv && s.sim.converged; out.sweepFail.push(`${s.def.title}: ${tag} conv=${s.sim.converged} kcl=${e.toExponential(1)}`); }
        }
      };
      for (const s of mine()) {
        out.sch++;
        out.warn.push(...s.extract.warnings.map((w) => s.def.title + ": " + w));
        if (s.kind !== "analog") continue;
        // çizimden beklenen bileşenler ile çözücüdeki bileşenleri karşılaştır
        const seenRail = new Set();
        for (const p of s.parts) {
          const d = Schematic.PARTS[p.type];
          if (!d.el) continue;
          let first = true;
          if (p.type === "rail") { const nn = s.netOf(p.id, "a"); first = !seenRail.has(nn); seenRail.add(nn); }
          const exp = d.el(p, (pin) => s.netOf(p.id, pin), first);
          for (const e of exp) {
            const got = s.sim.byId[e.id];
            if (!got) { out.mismatch.push(`${s.def.title}: ${e.id} çözücüde yok`); continue; }
            if (got.type !== e.type || JSON.stringify(got.n.map(String)) !== JSON.stringify(e.n.map(String))) out.mismatch.push(`${s.def.title}: ${e.id} düğümler ${got.n} ≠ ${e.n}`);
          }
        }
        const nEl = s.sim.elements.length;
        const nExp = s.parts.reduce((a, p) => a + (Schematic.PARTS[p.type].el ? Schematic.PARTS[p.type].el(p, (pin) => s.netOf(p.id, pin), true).length : 0), 0) - s.parts.filter((p) => p.type === "rail").length + seenRail.size;
        if (nEl !== nExp) out.mismatch.push(`${s.def.title}: bileşen sayısı çözücüde ${nEl}, çizimde ${nExp}`);
      }
      checkAll("başlangıç");
      // kaydırıcı taraması
      const ranges = [...slide.querySelectorAll(".stage input[type=range]")];
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      for (const inp of ranges) {
        const orig = inp.value, min = +inp.min, max = +inp.max;
        for (let k = 0; k <= STEPS; k++) {
          inp.value = min + ((max - min) * k) / STEPS;
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          out.sweeps++;
          if (k % 5 === 0) await sleep(16);
          checkAll(`${inp.getAttribute("aria-label")}=${inp.value}`);
        }
        inp.value = orig; inp.dispatchEvent(new Event("input", { bubbles: true }));
      }
      // rehber hedefleri
      const S = (window.GUIDES || {})[slide.id];
      if (slide.querySelector(".try") && !S) out.guide.push("Dene kutusu var ama senaryo yok");
      (S || []).forEach((st) => {
        const q = st.click || st.slide || st.tap || st.draw || st.move;
        if (q && !window.__rehber.find(slide, q)) out.guide.push("hedef yok: " + q);
      });
      // FPS
      let n = 0; const t0 = performance.now();
      await new Promise((res) => { (function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(); })(); });
      out.fps = Math.round((n * 1000) / (performance.now() - t0));
      return out;
    }, { STEPS });
    const newLogs = logs.slice(before);
    const problem = r.mismatch.length || r.warn.length || !r.conv || r.sweepFail.length || r.guide.length || newLogs.length || r.kcl > 1e-6;
    if (problem) bad++;
    rows.push(`${problem ? "✗" : "✓"} ${String(i + 1).padStart(2)} ${id.padEnd(24)} şema ${r.sch}  KCL ${r.kcl.toExponential(1)}  tarama ${r.sweeps}  fps ${r.fps}` +
      [...r.mismatch, ...r.warn, ...r.sweepFail.slice(0, 5), ...r.guide, ...newLogs.slice(0, 5)].map((x) => "\n     " + x).join(""));
  }
  console.log(rows.join("\n"));
  console.log(bad ? `\n${bad} slaytta sorun var` : "\nBütün denetimler geçti");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
