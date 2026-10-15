// Doğrulama aracı: her slaytın ekran görüntüsünü üç boyutta alır, konsol hatalarını toplar.
// Kullanım: NODE_PATH=<playwright-core'un olduğu node_modules> node tools/shots.js <url> <çıktı klasörü> [slayt-id ...]
// Ortam: SIZES="1440x860,1180x820,390x844"  WAIT=900  GUIDE=1 (hayalet eli kapatmamak için)
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");
const os = require("os");

const exe = path.join(os.homedir(), "Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
const [url, out, ...only] = process.argv.slice(2);
const sizes = (process.env.SIZES || "1440x860,1180x820,390x844").split(",").map((s) => s.split("x").map(Number));
const wait = +(process.env.WAIT || 900);

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: exe });
  const problems = [];
  for (const [w, hgt] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, deviceScaleFactor: w < 500 ? 2 : 1 });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(`[${w}] ${m.type()}: ${m.text()}`); });
    page.on("pageerror", (e) => problems.push(`[${w}] pageerror: ${e.message}`));
    if (!process.env.GUIDE) await page.addInitScript(() => { try { localStorage.setItem("rehber.kapali", "1"); } catch (e) {} });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const ids = await page.evaluate(() => [...document.querySelectorAll(".slide")].map((s) => s.id));
    for (const [i, id] of ids.entries()) {
      if (only.length && !only.includes(id)) continue;
      await page.evaluate((k) => Deck.go(k), i);
      await page.waitForTimeout(wait);
      const file = path.join(out, `${String(i + 1).padStart(2, "0")}-${id}-${w}.png`);
      await page.screenshot({ path: file, fullPage: w < 500 });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join("\n") : "Konsolda hata/uyarı yok");
})();
