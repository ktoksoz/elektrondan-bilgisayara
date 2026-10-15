/* Ortak yardımcılar: renkler, gerilim skalası, tuval kurulumu, animasyon döngüsü, DOM bileşenleri */
(function () {
  const C = {
    mask: "#0c2a20", mask2: "#113a2c", mask3: "#174a39", line: "#2c5a48",
    silk: "#efeee2", silk2: "#c2c9bb", muted: "#86a194",
    copper: "#d4935a", copper2: "#f0b07a", gold: "#e3c06a",
    v0: "#4c86ff", vmid: "#a65ff0", v1: "#ff4f6a", amp: "#ffe9a8", heat: "#ff8a2a",
    ch1: "#ffd75e", ch2: "#5fe3ff", ch3: "#ff8ad8", ch4: "#9dff7a",
  };
  const FONT = {
    display: '"Archivo", "Arial Narrow", system-ui, sans-serif',
    body: '"Atkinson Hyperlegible Next", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  };

  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
  function mixRgb(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
  function mix(h1, h2, t) { return `rgb(${mixRgb(hexToRgb(h1), hexToRgb(h2), t).join(",")})`; }

  /* Sitenin tek gerilim skalası: alt sınır mavi → mor → üst sınır kırmızı.
     Analog devrelerde [vmin, vmax] devrenin en düşük ve en yüksek besleme gerilimidir. */
  const VSTOPS = [hexToRgb(C.v0), hexToRgb(C.vmid), hexToRgb(C.v1)];
  function vrgb(v, vmin = 0, vmax = 5) {
    const t = Math.max(0, Math.min(1, (v - vmin) / ((vmax - vmin) || 1)));
    return t < 0.5 ? mixRgb(VSTOPS[0], VSTOPS[1], t * 2) : mixRgb(VSTOPS[1], VSTOPS[2], t * 2 - 1);
  }
  function vcolor(v, vmin, vmax, a = 1) { const c = vrgb(v, vmin, vmax); return a === 1 ? `rgb(${c})` : `rgba(${c},${a})`; }
  // mantık seviyesi rengi: 1 = yüksek gerilim rengi, 0 = düşük; x/z için null (kesikli çizilir)
  function lcolor(v) { return v === 1 ? C.v1 : v === 0 ? C.v0 : null; }

  /* Yüksek çözünürlüklü, kendini yeniden boyutlandıran tuval */
  function canvas(el, onResize) {
    const ctx = el.getContext("2d");
    const state = { ctx, w: 0, h: 0, dpr: 1, el };
    function fit() {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (Math.abs(r.width - state.w) < 0.5 && Math.abs(r.height - state.h) < 0.5 && dpr === state.dpr) return;
      state.w = r.width; state.h = r.height; state.dpr = dpr;
      el.width = Math.round(r.width * dpr);
      el.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ready && onResize && onResize(state);
    }
    // ilk geri çağrı ertelenir: çağıran kod dönüş değerini değişkene atamış olsun
    let ready = false;
    fit();
    ready = true;
    new ResizeObserver(fit).observe(el);
    queueMicrotask(() => { if (state.w && onResize) onResize(state); });
    state.fit = fit;
    return state;
  }

  /* requestAnimationFrame döngüsü — slayt görünürken çalışır */
  function loop(fn) {
    let id = 0, last = 0, running = false;
    function tick(t) {
      if (!running) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      fn(dt, t / 1000);
      id = requestAnimationFrame(tick);
    }
    return {
      start() { if (!running) { running = true; last = 0; id = requestAnimationFrame(tick); } },
      stop() { running = false; cancelAnimationFrame(id); },
      get running() { return running; },
    };
  }

  /* Küçük DOM yardımcısı: h("div.cls#id", {attrs}, ...children) */
  function h(spec, attrs, ...kids) {
    const m = spec.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const el = document.createElement(m[1] || "div");
    (m[2].match(/[.#][\w-]+/g) || []).forEach((p) => { if (p[0] === ".") el.classList.add(p.slice(1)); else el.id = p.slice(1); });
    if (attrs && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "html") el.innerHTML = v;
      else if (k === "style" && v && typeof v === "object") for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith("--")) el.style.setProperty(sk, sv); else el.style[sk] = sv; }
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach((k) => k != null && k !== false && el.append(k.nodeType ? k : document.createTextNode(k)));
    return el;
  }

  /* Kaydırıcı. log: true ise logaritmik (dirençler, frekanslar için).
     Rehber (hayalet el) için input._toRaw(değer) ham konuma çevirir. */
  function slider({ label, min, max, step = 0.01, value, fmt = (v) => num(v), oninput, width, log }) {
    const val = h("span.val");
    const RAW = 1000;
    const toRaw = log ? (v) => (Math.log(v / min) / Math.log(max / min)) * RAW : (v) => v;
    const fromRaw = log ? (r) => {
      const v = min * Math.pow(max / min, r / RAW);
      return step ? Math.round(v / step) * step || step : v;
    } : (r) => r;
    const input = h("input", { type: "range", min: log ? 0 : min, max: log ? RAW : max, step: log ? 1 : step, value: toRaw(value), "aria-label": label });
    input._toRaw = toRaw;
    if (width) input.style.width = width;
    let cur = value;
    val.textContent = fmt(value);
    input.addEventListener("input", () => { cur = fromRaw(+input.value); val.textContent = fmt(cur); oninput(cur); });
    const wrap = h("label", label, input, val);
    wrap.set = (v, fire) => { cur = v; input.value = toRaw(v); val.textContent = fmt(v); if (fire) oninput(v); };
    wrap.get = () => cur;
    wrap.input = input;
    return wrap;
  }

  function seg(options, value, onchange, aria) {
    const wrap = h("div.seg", { role: "group", "aria-label": aria || null });
    const btns = options.map(([k, lab]) => {
      const b = h("button", { type: "button" }, lab);
      b.addEventListener("click", () => { set(k); onchange(k); });
      wrap.append(b); return [k, b];
    });
    function set(k) { btns.forEach(([kk, b]) => { b.classList.toggle("on", kk === k); b.setAttribute("aria-pressed", kk === k); }); }
    set(value);
    wrap.set = set;
    return wrap;
  }

  function btn(label, onclick, cls = "") { return h("button.btn" + (cls ? "." + cls.split(" ").join(".") : ""), { type: "button", onclick }, label); }

  /* Rastgele sayı üreteci (tekrar edilebilir) */
  function rng(seed = 1) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // Türkçe ondalık virgüllü sayı
  const num = (v, d = 2) => {
    if (!isFinite(v)) return "—";
    let s = (+v).toFixed(d);
    if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
    return s.replace(".", ",").replace("-", "−");
  };
  const fmt = (v, unit, digits) => window.Circuit.fmt(v, unit, digits);
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Harici script'i bir kere yükle (file:// ile de çalışır) */
  const loaded = {};
  function loadScript(src) {
    if (!loaded[src]) loaded[src] = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error(src + " yüklenemedi"));
      document.head.append(s);
    });
    return loaded[src];
  }

  // demo kayıt yardımcısı: Demos.x = (stage, slide) => ({ enter, leave })
  window.Demos = window.Demos || {};
  window.L = {
    C, FONT, rgba, mix, vcolor, vrgb, lcolor, canvas, loop, h, slider, seg, btn, rng, clamp, lerp, ease, num, fmt, reduced, loadScript,
  };
})();
