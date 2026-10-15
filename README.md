# Elektrondan Bilgisayara

**Canlı site: https://elektronik.koraytoksoz.com**

Elektroniği gerilim ve akımdan başlayıp transistörlere, mantık kapılarına ve program çalıştıran küçük bir bilgisayara kadar slayt slayt anlatan, Türkçe, etkileşimli bir sunum sitesi. Her slaytta canlı bir devre var: anahtarlara tıklayın, değerleri değiştirin, akımın akışını izleyin; ekrandaki her sayı tarayıcıda çalışan devre çözücüden ya da mantık simülatöründen gelir.

Hazırlayan: **Koray Toksöz**

*An interactive, Turkish-language course from voltage and current to transistors, logic gates and a tiny computer, with live circuit simulations on every slide. Code: MIT · Content: CC BY 4.0.*

## İçerik

| Bölüm | Deneyler |
| --- | --- |
| 1. Elektrik nedir? | Su borusu benzetmesi (ve nerede çöktüğü), geleneksel akım ve elektron yönü, iletken / yalıtkan / yarı iletken |
| 2. Ohm kanunu ve güç | Ohm kanunu ve V–I grafiği, aşırı güçte yanan direnç, LED direnci hesaplayıcı (E12), renk kodu oyunu |
| 3. Devre analizi | Seri ve paralel, gerilim bölücü ve yükleme etkisi, Kirchhoff yasaları (KCL, KVL, Thevenin), multimetre ve atan sigorta |
| 4. Zaman: kondansatör ve bobin | RC şarj eğrisi ve τ, bobinde gerilim sıçraması ve serbest geçiş diyodu, AC ve RMS, sesli RC filtre |
| 5. Yarı iletkenler ve diyot | PN eklemi, diyot I–V eğrisi, yarım ve tam dalga doğrultucu, LED renkleri, Zener regülatörü |
| 6. Transistör: BJT | Musluk benzetmesi, mikrodenetleyici pininden motor sürme, ortak emetörlü yükselteç ve kırpılma |
| 7. Transistör: MOSFET | Kanal oluşumu, PWM, BJT mi MOSFET mi? |
| 8. Opamp | Altın kurallar, karşılaştırıcı (alacakaranlık sensörü), eviren / evirmeyen yükselteç, ses mikseri ve gerilim izleyici |
| 9. Analogdan dijitale | Transistörlü NOT, CMOS evirici ve aktarım eğrisi, gürültü payları, CMOS NAND |
| 10. Mantık kapıları | İkili sayılar, yedi temel kapı ve anahtar karşılıkları, De Morgan ve kabarcık itme, NAND bulmacası, perceptron ve XOR |
| 11. Karnaugh haritaları | Minterm ve SOP, 2–4 değişkenli Karnaugh haritası (grup çizme, sarmalama, X, Çöz), 7 segment kod çözücü |
| 12. Kombinasyonel devreler | Yarım / tam toplayıcı, 4 bitlik toplayıcıda elde dalgası, çoklayıcı ve kod çözücü |
| 13. Hafıza | SR latch, D latch ve D flip-flop, sayaç, kaydırmalı yazmaç, trafik lambası durum makinesi, 555 zamanlayıcı |
| 14. Büyük resim | 8 bitlik mini bilgisayar (SAP-1 benzeri), Arduino mikrodenetleyici, elektrik güvenliği |

Ek olarak:
- Türkçe **sesli anlatım** (56 slayt)
- Deneyi gösteren **hayalet el** ("Göster" düğmesi)
- Terimlerin üzerine gelince açılan **tanım balonları** (320 terim, Vikipedi bağlantılı)
- **Sunucu notları**
- Herhangi bir tele ya da parçaya gelince gerilim, akım ve güç gösteren **sanal multimetre**

## Çalıştırma

Derleme adımı yok, bağımlılık yok. `index.html` dosyasına çift tıklamak yeterli. Ya da yerel bir sunucuyla:

```sh
python3 tools/serve.py 8000   # önbelleksiz geliştirme sunucusu
# http://localhost:8000
```

Herhangi bir statik barındırmaya olduğu gibi yüklenebilir.

## Kısayollar

| Tuş | İşlev |
| --- | --- |
| → / Boşluk, ← | İleri / geri |
| Home / End | İlk / son slayt |
| A | Sesli anlatımı aç/kapat (P: duraklat) |
| G | Deney gösterimlerini (hayalet el) aç/kapat |
| N | Sunucu notları |
| T | Açıklama metnini gizle (sunum modu) |
| O | Tüm slaytlar |
| F | Tam ekran |

Her slaytın bağlantısı adres çubuğunda durur (ör. `#karnaugh`).

## Yapı

- **`index.html`:** Yayınlanan sayfa. `tools/assemble.py` tarafından `slides/`, `js/circuits/`, `js/demos/` ve `css/demos-*.css` parçalarından üretilir.
- **`slides/*.html`:** Slayt metinleri, "Daha fazla" bölümleri ve sunucu notları (`aside.notes`), slayt başına bir dosya
- **`js/circuit.js`:** Analog devre çözücü: düğüm analizi (MNA), Newton–Raphson, geçici rejim (trapez / geri Euler); direnç, kaynak, kondansatör, bobin, diyot, BJT, MOSFET, opamp modelleri
- **`js/logic.js`:** Olay tabanlı mantık simülatörü (kapı gecikmeleri, latch, flip-flop, saat), ifade ayrıştırıcı, Quine–McCluskey sadeleştirici, Karnaugh yardımcıları
- **`js/schematic.js`:** Bütün şemaları çizen ve çözücüye bağlayan bileşen (tel renkleri gerilimi, noktalar akımı gösterir)
- **`js/scope.js`:** Osiloskop ve lojik analizör
- **`js/circuits/*.js`:** Devreler, veri olarak
- **`js/demos/*.js`:** Bölüm bölüm etkileşimli deneyler ve hayalet el senaryoları
- **`js/strings.js`:** Bütün arayüz metinleri (çeviri için tek dosya)
- **`js/app.js`, `js/glossary.js`, `js/narrator.js`, `js/guide.js`:** Slayt motoru, tanım balonları, sesli anlatım, hayalet el
- **`audio/<slayt-id>.mp3`:** Anlatım sesleri; metinleri `tools/narration.json` içinde
- **`tests/`:** Çözücü ve mantık simülatörü birim testleri (`npm test` ya da `node --test tests/*.test.js`)
- **`tools/`:** Birleştirme, doğrulama (`check.js`, `shots.js`), geliştirme sunucusu, yayınlama

## Geliştirme ve doğrulama

```sh
python3 tools/assemble.py          # parçalardan index.html'i üret
node --test tests/*.test.js        # 32 birim testi
node tools/check.js http://localhost:8000/   # her slaytta: şema = çözücü, KCL, kaydırıcı taramaları, hayalet el hedefleri, FPS
node tools/shots.js http://localhost:8000/ ekran/   # 1440, 1180 ve 390 px ekran görüntüleri
```

`check.js` ve `shots.js` için `playwright-core` ve bir Chromium gerekir.

Anlatım sesleri ElevenLabs ile `tools/narration.json` içindeki metinlerden üretildi (ses "İrem", model `eleven_multilingual_v2`, dil `tr`); her dosya `audio/<slayt-id>.mp3` adını taşır.

## Yayınlama

`.htaccess` dosyası Apache sunucular içindir: HTTPS yönlendirmesi, sıkıştırma ve önbellek ayarlarını yapar. DreamHost'a yüklemek için:

```sh
tools/deploy.sh KULLANICI@SUNUCU
```

Betik önce `index.html` içindeki `?v=` sürüm etiketini yeniler, sonra `rsync` ile yalnızca değişen dosyaları gönderir.

## Kaynaklar ve ileri okuma

Sitedeki bilgiler şu kaynaklara dayanır; konuyu derinleştirmek için de iyi başlangıçlardır:

- Paul Horowitz, Winfield Hill, *The Art of Electronics*, 3. baskı, Cambridge University Press, 2015. https://artofelectronics.net/
- Charles Platt, *Make: Electronics*, 3. baskı, Make Community, 2021. Deneyerek öğrenmek için.
- Sarah L. Harris, David Harris, *Digital Design and Computer Architecture*, Morgan Kaufmann. https://shop.elsevier.com/books/digital-design-and-computer-architecture/harris/978-0-12-820064-3
- Charles Petzold, *Code: The Hidden Language of Computer Hardware and Software*, 2. baskı, 2022. https://www.codehiddenlanguage.com/
- Ben Eater, "Build an 8-bit computer" video dizisi (mini bilgisayar slaytının esin kaynağı). https://eater.net/8bit
- All About Circuits, ücretsiz elektronik ders kitabı. https://www.allaboutcircuits.com/textbook/

Belirli iddialar için:

- Arduino Uno Rev3 (ATmega328P, 16 MHz, 5 V): https://docs.arduino.cc/hardware/uno-rev3/ ve Microchip ATmega328P veri kitapçığı, https://www.microchip.com/en-us/product/atmega328p
- Apple M1, 16 milyar transistör (Apple, Kasım 2020): https://www.apple.com/newsroom/2020/11/apple-unleashes-m1/
- Akımın insan vücuduna etkileri: IEC 60479-1:2018, https://webstore.iec.ch/en/publication/62980
- 555 zamanlayıcı (Hans Camenzind, Signetics, 1971): https://en.wikipedia.org/wiki/555_timer_IC
- Karnaugh haritası (Maurice Karnaugh, 1953): https://en.wikipedia.org/wiki/Karnaugh_map
- Trafik lambası sırası: Trafik İşaretleri Hakkında Yönetmelik, Madde 9
- Terimlerin tanımları ve Vikipedi bağlantıları sitedeki tanım balonlarında

## Lisans

| Ne | Lisans |
| --- | --- |
| Kaynak kod (`js/`, `css/`, `tools/`, `tests/`, `index.html` içindeki kod) | [MIT](LICENSE) |
| İçerik: slayt metinleri, sunucu notları, sözlük, anlatım metinleri ve sesleri | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.tr) |
| Yazı tipleri (Archivo, Atkinson Hyperlegible Next, JetBrains Mono; Google Fonts'tan yüklenir) | SIL Open Font License 1.1 |

İçeriği değiştirerek ya da olduğu gibi, ticari amaçla bile kullanabilirsiniz; tek şart atıf yapmak. Önerilen atıf:

> Koray Toksöz, *Elektrondan Bilgisayara*, https://elektronik.koraytoksoz.com, CC BY 4.0

Ayrıntılar ve üçüncü taraf bileşenler için [LICENSE](LICENSE) dosyasına bakın.
