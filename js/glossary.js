/* Sözlük: metindeki anahtar kelimelerin üzerine gelince açılan tanım balonları.
   Her terim slayt başına yalnızca ilk geçtiği yerde işaretlenir. */
(function () {
  const trw = (q) => "https://tr.wikipedia.org/w/index.php?search=" + encodeURIComponent(q);
  const enw = (t) => "https://en.wikipedia.org/wiki/" + t;

  // k: aranacak kökler (küçük harf, Türkçe ekler otomatik kapsanır), t: başlık, d: tanım, u: bağlantı
  const TERMS = [
    /*TERİMLER:BAŞ*/
    {"k": ["elektrik yükü", "yükler"], "t": "Elektrik yükü", "d": "Maddenin elektrik kuvveti uygulayan ve hisseden özelliği; artı ya da eksi olabilir. Birimi coulomb (C). Elektronun yükü yaklaşık −1,6·10⁻¹⁹ C'tur.", "u": "https://tr.wikipedia.org/wiki/Elektrik_yükü"},
    {"k": ["coulomb"], "t": "Coulomb (C)", "d": "Elektrik yükünün birimi. 1 A'lik akım 1 saniyede 1 C yük taşır; 1 C yaklaşık 6,24·10¹⁸ elektron eder.", "u": "https://tr.wikipedia.org/wiki/Coulomb"},
    {"k": ["joule"], "t": "Joule (J)", "d": "Enerjinin birimi. 1 W'lık güç 1 saniyede 1 J enerji harcar; 1 V, 1 C yük başına 1 J demektir.", "u": "https://tr.wikipedia.org/wiki/Joule"},
    {"k": ["elektron"], "t": "Elektron", "d": "Atomun çekirdeği çevresindeki eksi yüklü, çok hafif parçacık. Metallerde akımı taşıyan serbest elektronlardır.", "u": "https://tr.wikipedia.org/wiki/Elektron", "only": ["su-benzetmesi", "akim-yonu", "iletken-yalitkan"]},
    {"k": ["geleneksel akım"], "t": "Geleneksel akım", "d": "Akımın artı uçtan çıkıp eksi uca döndüğü kabul edilen yön. Metallerde elektronlar ters yöne gider ama hesaplar aynı sonucu verir; şemalar hep bu yönü kullanır.", "u": "https://en.wikipedia.org/wiki/Electric_current"},
    {"k": ["sürüklenme hız"], "t": "Sürüklenme hızı", "d": "Elektrik alanı altında serbest elektronların ortalama kayma hızı. Bakır telde tipik akımlarda saniyede milimetrenin kesirleri kadardır.", "u": "https://tr.wikipedia.org/wiki/Sürüklenme_hızı"},
    {"k": ["elektrik alanı", "elektrik alan"], "t": "Elektrik alanı", "d": "Yüklü parçacıklara kuvvet uygulayan alan. Bir devrede bu alan tel boyunca çok hızlı yayılır ve bütün elektronları neredeyse aynı anda iter.", "u": "https://tr.wikipedia.org/wiki/Elektrik_alanı"},
    {"k": ["benjamin franklin"], "t": "Benjamin Franklin", "d": "18. yüzyıl Amerikalı bilim insanı ve devlet adamı. Elektrik deneyleri yaptı; yükleri “artı” ve “eksi” diye adlandırma alışkanlığı ondan kalır.", "u": "https://tr.wikipedia.org/wiki/Benjamin_Franklin"},
    {"k": ["thomson"], "t": "J. J. Thomson", "d": "İngiliz fizikçi. 1897'de katot ışınlarıyla yaptığı deneylerle elektronu buldu.", "u": "https://tr.wikipedia.org/wiki/Joseph_John_Thomson"},
    {"k": ["iletken"], "t": "İletken", "d": "Elektrik akımını kolayca ileten malzeme. Metallerde serbest elektronlar bulunur; bakır ve alüminyum tellerde kullanılır.", "u": "https://tr.wikipedia.org/wiki/İletken"},
    {"k": ["yalıtkan"], "t": "Yalıtkan", "d": "Elektrik akımını neredeyse hiç iletmeyen malzeme: cam, plastik, seramik, kuru hava. Elektronları atomlarına sıkıca bağlıdır.", "u": "https://tr.wikipedia.org/wiki/Yalıtkan"},
    {"k": ["özdirenç"], "t": "Özdirenç (ρ)", "d": "Bir malzemenin akıma karşı koyma yeteneği; birimi Ω·m. Bir parçanın direnci R = ρ·L / A ile bulunur.", "u": "https://tr.wikipedia.org/wiki/Özdirenç"},
    {"k": ["kovalent"], "t": "Kovalent bağ", "d": "İki atomun elektron çiftini ortaklaşa kullanmasıyla oluşan bağ. Silisyum kristalinde her atom dört komşusuna böyle bağlıdır.", "u": "https://tr.wikipedia.org/wiki/Kovalent_bağ"},
    {"k": ["boşluk"], "t": "Boşluk (yarı iletkende)", "d": "Bir bağdan kopan elektronun geride bıraktığı eksiklik. Komşu elektronlar atlayınca boşluk yer değiştirir ve artı yüklü bir taşıyıcı gibi davranır.", "u": "https://en.wikipedia.org/wiki/Electron_hole", "only": ["iletken-yalitkan"]},
    {"k": ["silisyum"], "t": "Silisyum", "d": "Yarı iletken elementlerin en yaygını; diyot, transistör ve tümleşik devrelerin ana malzemesi. Kumdaki silisyum dioksitten elde edilir.", "u": "https://tr.wikipedia.org/wiki/Silisyum"},
    {"k": ["bakır"], "t": "Bakır", "d": "Gümüşten sonra en iyi ileten yaygın metal; elektrik kablolarının ve baskılı devre kartlarındaki yolların malzemesi.", "u": "https://tr.wikipedia.org/wiki/Bakır", "only": ["iletken-yalitkan"]},
    {"k": ["basınç"], "t": "Basınç", "d": "Birim alana düşen kuvvet. Su benzetmesinde gerilimin karşılığıdır: suyu iten şey iki nokta arasındaki basınç farkıdır.", "u": "https://tr.wikipedia.org/wiki/Basınç", "only": ["su-benzetmesi"]},
    {"k": ["debi"], "t": "Debi", "d": "Bir kesitten birim zamanda geçen akışkan miktarı. Su benzetmesinde akımın karşılığıdır.", "u": "https://tr.wikipedia.org/wiki/Debi", "only": ["su-benzetmesi"]},
    {"k": ["pil"], "t": "Pil", "d": "Kimyasal enerjiyi elektrik enerjisine çeviren kaynak. İki ucu arasında yaklaşık sabit bir gerilim tutar; su benzetmesinde pompadır.", "u": "https://tr.wikipedia.org/wiki/Pil", "only": ["su-benzetmesi", "akim-yonu"]},
    {"k": ["güç"], "t": "Elektriksel güç", "d": "Birim zamanda dönüşen enerji; P = V·I. Birimi watt (W). Bir dirençte bu güç ısıya dönüşür.", "u": "https://en.wikipedia.org/wiki/Electric_power", "only": ["guc-ve-isi", "led-direnci"]},
    {"k": ["watt-saat", "kilowatt-saat"], "t": "Watt-saat (Wh)", "d": "Enerji birimi: 1 W'lık gücün 1 saatte harcadığı enerji, 3600 J. Elektrik faturalarında kilowatt-saat (kWh) kullanılır.", "u": "https://en.wikipedia.org/wiki/Kilowatt-hour"},
    {"k": ["watt"], "t": "Watt (W)", "d": "Gücün birimi: saniyede 1 joule. 1 V gerilim altında 1 A akım 1 W güç demektir.", "u": "https://tr.wikipedia.org/wiki/Watt"},
    {"k": ["ısıya dönüşür", "ısı"], "t": "Joule ısınması", "d": "Akım bir iletkenden geçerken elektrik enerjisinin ısıya dönüşmesi. Üretilen ısı gücü P = I²·R'dir.", "u": "https://en.wikipedia.org/wiki/Joule_heating", "only": ["guc-ve-isi"]},
    {"k": ["güç sınırı"], "t": "Güç sınırı (anma gücü)", "d": "Bir direncin ısınıp zarar görmeden sürekli harcayabileceği en büyük güç. Breadboard dirençleri çoğunlukla ¼ W'lıktır.", "u": "https://en.wikipedia.org/wiki/Resistor", "only": ["guc-ve-isi"]},
    {"k": ["breadboard"], "t": "Breadboard", "d": "Lehim gerektirmeden devre kurmaya yarayan delikli deney tahtası; delikler altta metal şeritlerle birbirine bağlıdır.", "u": "https://en.wikipedia.org/wiki/Breadboard"},
    {"k": ["led"], "t": "LED (ışık yayan diyot)", "d": "Akım geçtiğinde ışık veren diyot. Rengine göre 2–3 V civarında ileri gerilimi vardır; akımı mutlaka bir dirençle sınırlanmalıdır.", "u": "https://tr.wikipedia.org/wiki/Işık_yayan_diyot"},
    {"k": ["ileri gerilim"], "t": "İleri gerilim (Vf)", "d": "Bir diyot ya da LED iletirken üzerinde kalan gerilim. Silisyum diyotta yaklaşık 0,6–0,7 V, kırmızı LED'de yaklaşık 2 V.", "u": "https://tr.wikipedia.org/wiki/Diyot"},
    {"k": ["diyot"], "t": "Diyot", "d": "Akımı yalnızca bir yönde geçiren yarı iletken eleman. Sembolündeki ok geleneksel akımın geçebildiği yönü gösterir.", "u": "https://tr.wikipedia.org/wiki/Diyot"},
    {"k": ["e12"], "t": "E12 serisi", "d": "Dirençlerin üretildiği standart değerler: her on katta 12 değer (10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82). Komşu değerler yaklaşık %20 aralıklıdır.", "u": "https://en.wikipedia.org/wiki/E_series_of_preferred_numbers"},
    {"k": ["renk kod", "renkli şerit"], "t": "Direnç renk kodu", "d": "Direnç değerini gövdeye basılmış renkli şeritlerle gösteren standart. İlk şeritler rakam, sonraki çarpan, en sondaki tolerans.", "u": "https://en.wikipedia.org/wiki/Electronic_color_code"},
    {"k": ["tolerans"], "t": "Tolerans", "d": "Bir parçanın gerçek değerinin yazılı değerden en fazla ne kadar sapabileceği. Altın şeritli direnç için ±%5.", "u": "https://en.wikipedia.org/wiki/Engineering_tolerance"},
    {"k": ["çarpan"], "t": "Çarpan şeridi", "d": "Renk kodunda ilk rakamlardan sonra gelen şerit: değerin 10'un kaçıncı kuvvetiyle çarpılacağını söyler. Kırmızı ×100, turuncu ×1000.", "u": "https://en.wikipedia.org/wiki/Electronic_color_code", "only": ["renk-kodu"]},
    {"k": ["multimetre"], "t": "Multimetre", "d": "Gerilim, akım ve direnç ölçebilen el aleti. Direnç ölçerken parçaya küçük bir gerilim uygular ve akımı ölçer.", "u": "https://tr.wikipedia.org/wiki/Multimetre"},
    {"k": ["ohmmetre"], "t": "Ohmmetre", "d": "Direnç ölçen alet; bilinen bir gerilim uygulayıp akımı ölçer ve R = V / I hesaplar.", "u": "https://tr.wikipedia.org/wiki/Ohmmetre"},
    {"k": ["açık devre"], "t": "Açık devre", "d": "Akım yolunun bir yerde kesik olduğu devre; akım akmaz. Anahtar “açık” olduğunda devre açıktır.", "u": "https://tr.wikipedia.org/wiki/Elektrik_akımı"},
    {"k": ["seri bağl", "seri"], "t": "Seri bağlantı", "d": "Parçaların art arda, tek bir yol üzerinde bağlanması. Hepsinden aynı akım geçer, üzerlerindeki gerilimler toplanır.", "u": "https://tr.wikipedia.org/wiki/Seri_ve_paralel_devreler", "only": ["seri-paralel", "gerilim-bolucu", "multimetre"]},
    {"k": ["paralel"], "t": "Paralel bağlantı", "d": "Parçaların iki ucunun ortak noktalara bağlanması. Hepsinin üzerinde aynı gerilim vardır, akım kollara bölünür.", "u": "https://tr.wikipedia.org/wiki/Seri_ve_paralel_devreler", "only": ["seri-paralel", "gerilim-bolucu", "multimetre"]},
    {"k": ["eşdeğer direnç"], "t": "Eşdeğer direnç", "d": "Bir direnç ağının iki ucundan bakıldığında yerine konabilecek tek direnç. Kaynak, ikisini birbirinden ayıramaz.", "u": "https://tr.wikipedia.org/wiki/Seri_ve_paralel_devreler"},
    {"k": ["iletkenlik"], "t": "İletkenlik", "d": "Direncin tersi (1/R); birimi siemens (S). Paralel bağlı kollarda iletkenlikler toplanır.", "u": "https://en.wikipedia.org/wiki/Electrical_resistance_and_conductance", "only": ["seri-paralel", "kcl"]},
    {"k": ["siemens"], "t": "Siemens (S)", "d": "İletkenlik birimi: 1 S = 1 / 1 Ω. 1 kΩ'luk direncin iletkenliği 1 mS'dir.", "u": "https://tr.wikipedia.org/wiki/Siemens_(birim)"},
    {"k": ["potansiyometre"], "t": "Potansiyometre", "d": "Üzerinde kayan bir orta ucu (sürgüsü) olan ayarlı direnç. İki ucu arasına gerilim verilince ayarlanabilir bir gerilim bölücü olur.", "u": "https://tr.wikipedia.org/wiki/Potansiyometre"},
    {"k": ["gerilim bölücü", "bölücü"], "t": "Gerilim bölücü", "d": "Seri bağlı iki dirençle bir gerilimin belli bir kesrini elde eden devre: Vç = Vg · R2 / (R1 + R2).", "u": "https://en.wikipedia.org/wiki/Voltage_divider"},
    {"k": ["yükleme etkisi"], "t": "Yükleme etkisi", "d": "Bir kaynağa ya da bölücüye yük bağlanınca çıkış geriliminin düşmesi. Kaynağın iç direnci ile yük, bir gerilim bölücü oluşturur.", "u": "https://en.wikipedia.org/wiki/Internal_resistance"},
    {"k": ["iç direnç"], "t": "İç direnç", "d": "Bir kaynağın ya da ölçü aletinin kendi içindeki direnç. Voltmetrede çok büyük, ampermetrede çok küçük olmalıdır.", "u": "https://en.wikipedia.org/wiki/Internal_resistance"},
    {"k": ["düğüm"], "t": "Düğüm", "d": "Devrede tellerle birbirine bağlı noktaların tamamı. Bir düğümün her yerinde gerilim aynıdır.", "u": "https://en.wikipedia.org/wiki/Node_(circuits)", "only": ["kcl", "kvl"]},
    {"k": ["kirchhoff", "kcl", "kvl"], "t": "Kirchhoff yasaları", "d": "Gustav Kirchhoff'un 1845'te yazdığı iki devre kuralı: bir düğüme giren akımların toplamı sıfırdır (KCL); kapalı bir çevre boyunca gerilim değişimlerinin toplamı sıfırdır (KVL).", "u": "https://tr.wikipedia.org/wiki/Kirchhoff_yasalar%C4%B1"},
    {"k": ["çevre", "göz akımları"], "t": "Çevre ve göz", "d": "Çevre, devrede başladığı noktaya geri dönen kapalı bir yoldur. İçinden başka bir yol geçmeyen çevreye göz denir; göz akımları yöntemi her göz için KVL yazar.", "u": "https://en.wikipedia.org/wiki/Mesh_analysis", "only": ["kvl"]},
    {"k": ["düğüm gerilimi yöntem", "düğüm gerilimi analiz"], "t": "Düğüm gerilimi yöntemi", "d": "Her düğümde KCL yazıp kol akımlarını düğüm gerilimleri cinsinden ifade ederek devreyi çözme yöntemi.", "u": "https://en.wikipedia.org/wiki/Nodal_analysis"},
    {"k": ["mna", "değiştirilmiş düğüm analiz"], "t": "Değiştirilmiş düğüm analizi (MNA)", "d": "Düğüm gerilimi yönteminin gerilim kaynaklarını da içeren genel hâli; devre simülatörlerinin (SPICE ve bu sitedeki çözücü) temel yöntemi.", "u": "https://en.wikipedia.org/wiki/Modified_nodal_analysis"},
    {"k": ["thevenin"], "t": "Thevenin teoremi", "d": "Dirençler ve kaynaklardan oluşan bir devre, iki ucundan bakıldığında tek bir gerilim kaynağına (Vth) seri bağlı tek bir dirence (Rth) eşdeğerdir.", "u": "https://tr.wikipedia.org/wiki/Th%C3%A9venin_teoremi"},
    {"k": ["toprak"], "t": "Toprak (referans)", "d": "Devrede 0 V kabul edilen ortak referans noktası. Düğüm gerilimleri ona göre ölçülür.", "u": "https://en.wikipedia.org/wiki/Ground_(electricity)", "only": ["kcl", "kvl", "gerilim-bolucu"]},
    {"k": ["voltmetre"], "t": "Voltmetre", "d": "İki nokta arasındaki gerilimi ölçen alet. Ölçülen parçaya paralel bağlanır; iç direnci çok büyüktür.", "u": "https://tr.wikipedia.org/wiki/Voltmetre"},
    {"k": ["kısa devre"], "t": "Kısa devre", "d": "İki noktanın neredeyse sıfır dirençli bir yolla birleşmesi. Akımı sınırlayan bir şey kalmadığı için çok büyük akım geçer.", "u": "https://tr.wikipedia.org/wiki/K%C4%B1sa_devre"},
    {"k": ["sigorta"], "t": "Sigorta", "d": "Belli bir akımın üstünde eriyip devreyi açan koruma elemanı. Multimetrelerin akım girişlerinde bulunur.", "u": "https://tr.wikipedia.org/wiki/Sigorta_(elektrik)"},
    {"k": ["prob"], "t": "Prob", "d": "Ölçü aletini devreye değdirmek için kullanılan uçlu kablo. Siyah prob COM girişine, kırmızı prob ölçüm türüne göre VΩ ya da akım girişine takılır.", "u": "https://en.wikipedia.org/wiki/Test_probe", "only": ["multimetre"]},
    {"k": ["kondansatör"], "t": "Kondansatör", "d": "İki iletken levha ve aralarındaki yalıtkandan oluşan, elektrik yükü depolayan devre elemanı. Gerilimi aniden değişemez.", "u": "https://tr.wikipedia.org/wiki/Kondansatör"},
    {"k": ["kapasite", "kapasitans"], "t": "Kapasite (kapasitans)", "d": "Bir kondansatörün volt başına ne kadar yük tuttuğu: C = Q / V. Birimi farad (F).", "u": "https://tr.wikipedia.org/wiki/Kapasitans"},
    {"k": ["farad"], "t": "Farad (F)", "d": "Kapasite birimi. 1 F, 1 V'ta 1 coulomb yük tutar; pratikte pF, nF ve µF kullanılır.", "u": "https://tr.wikipedia.org/wiki/Farad"},
    {"k": ["zaman sabiti"], "t": "Zaman sabiti (τ)", "d": "RC devresinde τ = R · C. Bir τ sürede kondansatör kalan yolun yaklaşık %63'ünü gider; 5τ'da neredeyse tamamen dolar.", "u": "https://tr.wikipedia.org/wiki/Zaman_sabiti"},
    {"k": ["elektrolitik"], "t": "Elektrolitik kondansatör", "d": "Küçük hacimde büyük kapasite sağlayan, artı ve eksi ucu olan (kutuplu) kondansatör. Ters bağlanmamalıdır.", "u": "https://en.wikipedia.org/wiki/Electrolytic_capacitor"},
    {"k": ["bobin"], "t": "Bobin", "d": "Sarılmış telden oluşan, akım geçince manyetik alanında enerji depolayan eleman. Akımı aniden değişemez.", "u": "https://tr.wikipedia.org/wiki/Bobin"},
    {"k": ["endüktans", "indüktans"], "t": "Endüktans", "d": "Bir bobinin akım değişimine karşı koyma ölçüsü: V = L · dI/dt. Birimi henry (H).", "u": "https://tr.wikipedia.org/wiki/İndüktans"},
    {"k": ["henry"], "t": "Henry (H)", "d": "Endüktans birimi. 1 H'lik bobinde akım saniyede 1 A değişirse uçlarında 1 V oluşur.", "u": "https://tr.wikipedia.org/wiki/Henry_(birim)"},
    {"k": ["manyetik alan"], "t": "Manyetik alan", "d": "Hareket eden yüklerin (akımın) çevresinde oluşan alan. Bobin enerjisini bu alanda depolar.", "u": "https://tr.wikipedia.org/wiki/Manyetik_alan"},
    {"k": ["röle"], "t": "Röle", "d": "Bir bobinin mıknatıslanarak kontakları açıp kapattığı elektromekanik anahtar. Küçük bir akımla büyük bir yükü anahtarlar.", "u": "https://tr.wikipedia.org/wiki/Röle"},
    {"k": ["serbest geçiş diyodu", "flyback"], "t": "Serbest geçiş (flyback) diyodu", "d": "Bobine ters paralel bağlanan diyot. Akım kesilince bobin akımına yol açar ve gerilim sıçramasını önler.", "u": "https://en.wikipedia.org/wiki/Flyback_diode"},
    {"k": ["kıvılcım"], "t": "Kıvılcım (elektrik arkı)", "d": "Yüksek gerilimin havayı iyonlaştırıp iletken yapmasıyla açık kontaklar arasında akan akım. Kontakları aşındırır.", "u": "https://tr.wikipedia.org/wiki/Elektrik_arkı", "only": ["bobin"]},
    {"k": ["alternatif akım"], "t": "Alternatif akım (AC)", "d": "Yönü ve büyüklüğü periyodik olarak değişen akım; şebekede sinüs biçimindedir.", "u": "https://tr.wikipedia.org/wiki/Alternatif_akım"},
    {"k": ["doğru akım"], "t": "Doğru akım (DC)", "d": "Hep aynı yönde akan akım; piller ve adaptörler doğru akım verir.", "u": "https://tr.wikipedia.org/wiki/Doğru_akım"},
    {"k": ["frekans"], "t": "Frekans", "d": "Periyodik bir olayın saniyedeki tekrar sayısı: f = 1 / T. Birimi hertz (Hz).", "u": "https://tr.wikipedia.org/wiki/Frekans"},
    {"k": ["hertz"], "t": "Hertz (Hz)", "d": "Frekans birimi: saniyede bir tekrar. 50 Hz saniyede 50 tam tur demektir.", "u": "https://tr.wikipedia.org/wiki/Hertz"},
    {"k": ["periyot"], "t": "Periyot (T)", "d": "Periyodik bir dalganın bir tam turunun süresi. 50 Hz için T = 20 ms.", "u": "https://tr.wikipedia.org/wiki/Periyot"},
    {"k": ["genlik"], "t": "Genlik", "d": "Bir dalganın sıfırdan en yüksek noktasına olan uzaklığı; sinüste tepe değeri.", "u": "https://tr.wikipedia.org/wiki/Genlik"},
    {"k": ["sinüs dalga"], "t": "Sinüs dalgası", "d": "Zamanla sinüs fonksiyonu gibi düzgünce değişen dalga; şebeke gerilimi ve saf ses tonları böyledir.", "u": "https://tr.wikipedia.org/wiki/Sinüs_dalgası"},
    {"k": ["rms", "etkin değer"], "t": "RMS (etkin değer)", "d": "Karelerin ortalamasının karekökü. Bir dirençte aynı ısıyı üreten DC değere eşittir; sinüste Vp / √2.", "u": "https://en.wikipedia.org/wiki/Root_mean_square"},
    {"k": ["tepe değer"], "t": "Tepe değeri (Vp)", "d": "Dalganın ulaştığı en yüksek gerilim. Tepeden tepeye değer (Vpp) en yüksekle en alçak arasıdır.", "u": "https://en.wikipedia.org/wiki/Amplitude"},
    {"k": ["şebeke"], "t": "Şebeke elektriği", "d": "Prizdeki elektrik. Türkiye ve Avrupa'da 230 V (RMS), 50 Hz alternatif akım. Öldürücüdür.", "u": "https://tr.wikipedia.org/wiki/Şebeke_elektriği"},
    {"k": ["alçak geçiren"], "t": "Alçak geçiren filtre", "d": "Kesim frekansının altındaki sinyalleri geçiren, üstündekileri zayıflatan filtre. En basiti bir direnç ve bir kondansatördür.", "u": "https://tr.wikipedia.org/wiki/Alçak_geçiren_filtre"},
    {"k": ["kesim frekans"], "t": "Kesim frekansı", "d": "Filtre çıkışının girişin %70,7'sine (−3 dB) düştüğü frekans. RC filtrede fc = 1 / (2πRC).", "u": "https://en.wikipedia.org/wiki/Cutoff_frequency"},
    {"k": ["desibel", "db"], "t": "Desibel (dB)", "d": "Oranların logaritmik ölçüsü; gerilim oranı için 20 · log10(oran). −3 dB ≈ 0,707, −20 dB = 0,1.", "u": "https://tr.wikipedia.org/wiki/Desibel", "only": ["rc-filtre"]},
    {"k": ["faz"], "t": "Faz", "d": "İki aynı frekanslı dalga arasındaki zaman kayması, açı olarak (360° = bir periyot).", "u": "https://en.wikipedia.org/wiki/Phase_(waves)", "only": ["rc-filtre"]},
    {"k": ["harmonik"], "t": "Harmonik", "d": "Temel frekansın tam katlarındaki bileşenler. Testere dişi dalga çok sayıda güçlü harmonik içerir; tiz duyulur.", "u": "https://en.wikipedia.org/wiki/Harmonic"},
    {"k": ["osiloskop"], "t": "Osiloskop", "d": "Gerilimin zamanla değişimini ekranda çizen ölçü aleti. Yatay eksen zaman (s/böl), dikey eksen gerilimdir (V/böl).", "u": "https://tr.wikipedia.org/wiki/Osiloskop"},
    {"k": ["iir"], "t": "IIR filtre", "d": "Sonsuz dürtü yanıtlı dijital filtre; çıkışı önceki çıkışlara da bağlıdır. Birinci derecedeni RC filtrenin dijital karşılığıdır.", "u": "https://en.wikipedia.org/wiki/Infinite_impulse_response", "only": ["rc-filtre"]},
    {"k": ["pn eklem", "eklem"], "t": "PN eklemi", "d": "P tipi ve N tipi yarı iletkenin aynı kristalde buluştuğu sınır. Diyotun, LED'in ve transistörlerin temel yapı taşıdır.", "u": "https://en.wikipedia.org/wiki/P%E2%80%93n_junction", "only": ["pn-eklemi", "diyot-iv", "led-zener", "dogrultucu", "bjt-musluk"]},
    {"k": ["katkılan", "katkı"], "t": "Katkılama (doping)", "d": "Saf yarı iletkene çok az miktarda başka element katarak iletkenliğini ve taşıyıcı türünü ayarlamak.", "u": "https://en.wikipedia.org/wiki/Doping_(semiconductor)"},
    {"k": ["n tipi"], "t": "N tipi yarı iletken", "d": "Beş değerlikli (ör. fosfor) katkıyla fazladan serbest elektron kazanmış yarı iletken; çoğunluk taşıyıcısı elektrondur.", "u": "https://en.wikipedia.org/wiki/Extrinsic_semiconductor"},
    {"k": ["p tipi"], "t": "P tipi yarı iletken", "d": "Üç değerlikli (ör. bor) katkıyla elektron eksikliği, yani boşluk kazanmış yarı iletken; çoğunluk taşıyıcısı boşluktur.", "u": "https://en.wikipedia.org/wiki/Extrinsic_semiconductor"},
    {"k": ["boşluk"], "t": "Boşluk (elektron deliği)", "d": "Kristal bağında eksik kalan elektron. Komşu elektronlar onu doldurdukça yer değiştirir ve artı yüklü bir taşıyıcı gibi davranır.", "u": "https://tr.wikipedia.org/wiki/Elektron_deliği", "only": ["pn-eklemi", "diyot-iv", "led-zener"]},
    {"k": ["tükenme bölge"], "t": "Tükenme bölgesi", "d": "PN ekleminin iki yanında serbest taşıyıcıların boşaldığı, yalnız sabit iyonların kaldığı ince bölge. İçindeki elektrik alanı taşıyıcıların geçişine engel olur.", "u": "https://en.wikipedia.org/wiki/Depletion_region"},
    {"k": ["fosfor"], "t": "Fosfor", "d": "Beş değerlik elektronlu element. Silisyuma katılınca her atom bir serbest elektron verir (N tipi katkı).", "u": "https://tr.wikipedia.org/wiki/Fosfor"},
    {"k": ["bor"], "t": "Bor", "d": "Üç değerlik elektronlu element. Silisyuma katılınca her atomda bir elektron eksik kalır, boşluk oluşur (P tipi katkı).", "u": "https://tr.wikipedia.org/wiki/Bor", "only": ["pn-eklemi"]},
    {"k": ["iyon"], "t": "İyon", "d": "Elektron kazanmış ya da kaybetmiş, bu yüzden net elektrik yükü taşıyan atom. Kristaldeki katkı iyonları yerlerinden kıpırdayamaz.", "u": "https://tr.wikipedia.org/wiki/İyon"},
    {"k": ["ileri kutupla"], "t": "İleri kutuplama", "d": "Diyotun P ucuna (anot) N ucuna (katot) göre artı gerilim vermek. Engel alçalır, akım akar.", "u": "https://en.wikipedia.org/wiki/P%E2%80%93n_junction"},
    {"k": ["ters kutupla"], "t": "Ters kutuplama", "d": "Diyotun N ucunu P ucuna göre artı yapmak. Tükenme bölgesi genişler, yalnız çok küçük bir sızıntı akımı geçer.", "u": "https://en.wikipedia.org/wiki/P%E2%80%93n_junction"},
    {"k": ["anot"], "t": "Anot", "d": "Diyotta P tarafındaki uç. İleri kutuplamada geleneksel akım anottan girer.", "u": "https://tr.wikipedia.org/wiki/Anot"},
    {"k": ["katot"], "t": "Katot", "d": "Diyotta N tarafındaki uç; sembolde çizgiyle, gövdede halka ile işaretlenir.", "u": "https://tr.wikipedia.org/wiki/Katot"},
    {"k": ["üstel"], "t": "Üstel büyüme", "d": "Her eşit adımda aynı oranda katlanan büyüme. Diyotta gerilimdeki her ~60 mV'luk artış akımı yaklaşık on katına çıkarır.", "u": "https://tr.wikipedia.org/wiki/Üstel_fonksiyon"},
    {"k": ["logaritmik"], "t": "Logaritmik ölçek", "d": "Eşit aralıkların eşit oranları (ör. 10 kat) gösterdiği eksen. Çok küçük ve çok büyük değerler aynı grafikte okunur.", "u": "https://tr.wikipedia.org/wiki/Logaritmik_ölçek"},
    {"k": ["schottky"], "t": "Schottky diyot", "d": "Metal ile yarı iletkenin birleşiminden oluşan diyot. İleri gerilimi düşük (0,2–0,4 V), anahtarlaması hızlı, ters kaçağı daha büyüktür.", "u": "https://tr.wikipedia.org/wiki/Schottky_diyot"},
    {"k": ["shockley"], "t": "Shockley diyot denklemi", "d": "Diyot akımını gerilime bağlayan formül: I = Is·(e^(V/(n·VT)) − 1). William Shockley'nin adını taşır.", "u": "https://en.wikipedia.org/wiki/Shockley_diode_equation"},
    {"k": ["ısıl gerilim"], "t": "Isıl gerilim (VT)", "d": "VT = kT/q; oda sıcaklığında (300 K) yaklaşık 25,85 mV. Diyot ve transistör denklemlerinde ölçek görevi görür.", "u": "https://en.wikipedia.org/wiki/Thermal_voltage"},
    {"k": ["yük doğrusu"], "t": "Yük doğrusu", "d": "Kaynak ve seri direncin izin verdiği akım–gerilim çiftlerinin doğrusu. Eleman eğrisiyle kesiştiği yer çalışma noktasıdır.", "u": "https://en.wikipedia.org/wiki/Load_line_(electronics)"},
    {"k": ["köprü doğrultucu"], "t": "Köprü doğrultucu", "d": "Dört diyotla kurulan tam dalga doğrultucu. Her yarım periyotta iki diyot iletir; akım yükten hep aynı yönde geçer.", "u": "https://en.wikipedia.org/wiki/Diode_bridge"},
    {"k": ["doğrultucu"], "t": "Doğrultucu", "d": "Alternatif akımı tek yönlü akıma çeviren devre; temel elemanı diyottur.", "u": "https://tr.wikipedia.org/wiki/Doğrultucu"},
    {"k": ["filtre kondansatör"], "t": "Filtre kondansatörü", "d": "Doğrultucu çıkışına paralel bağlanan büyük kondansatör. Tepelerde dolar, aralarda yükü besleyerek gerilimi düzleştirir.", "u": "https://en.wikipedia.org/wiki/Reservoir_capacitor"},
    {"k": ["dalgalanma"], "t": "Dalgalanma (ripple)", "d": "Doğrultulmuş ve filtrelenmiş DC gerilimin üzerinde kalan periyodik küçük değişim; tepeden tepeye (Vpp) ölçülür.", "u": "https://en.wikipedia.org/wiki/Ripple_(electrical)"},
    {"k": ["trafo", "transformatör"], "t": "Transformatör (trafo)", "d": "Manyetik olarak bağlı iki sargıyla AC gerilimi yükselten ya da düşüren eleman. Sargılar arasında elektriksel yalıtım da sağlar.", "u": "https://tr.wikipedia.org/wiki/Transformatör"},
    {"k": ["foton"], "t": "Foton", "d": "Işığın enerji paketi. Enerjisi dalga boyuyla ters orantılıdır: E = h·c/λ.", "u": "https://tr.wikipedia.org/wiki/Foton"},
    {"k": ["bant aralığ"], "t": "Bant aralığı", "d": "Bir yarı iletkende elektronun bağlı durumdan serbest duruma geçmesi için gereken en küçük enerji. Silisyumda ≈ 1,12 eV.", "u": "https://tr.wikipedia.org/wiki/Bant_aralığı"},
    {"k": ["dalga boy"], "t": "Dalga boyu", "d": "Bir dalganın art arda iki tepesi arasındaki uzaklık. Görünür ışıkta yaklaşık 400 nm (mor) ile 700 nm (kırmızı) arasıdır.", "u": "https://tr.wikipedia.org/wiki/Dalga_boyu"},
    {"k": ["zener"], "t": "Zener diyot", "d": "Ters yönde belirli bir kırılma geriliminde iletmek üzere üretilmiş diyot; o gerilimi sabit tutmak için kullanılır.", "u": "https://tr.wikipedia.org/wiki/Zener_diyot"},
    {"k": ["regülatör"], "t": "Gerilim regülatörü", "d": "Giriş gerilimi ya da yük akımı değişse de çıkış gerilimini sabit tutan devre.", "u": "https://en.wikipedia.org/wiki/Voltage_regulator"},
    {"k": ["kırılma"], "t": "Ters kırılma", "d": "Ters gerilim belirli bir değeri aşınca akımın birden artması. Düşük gerilimlerde tünelleme (Zener etkisi), yüksek gerilimlerde çığ etkisiyle olur.", "u": "https://en.wikipedia.org/wiki/Zener_effect", "only": ["pn-eklemi", "diyot-iv", "led-zener"]},
    {"k": ["transistör"], "t": "Transistör", "d": "Küçük bir akım ya da gerilimle büyük bir akımı kontrol eden üç uçlu yarı iletken eleman; hem anahtar hem yükselteç olarak kullanılır.", "u": "https://tr.wikipedia.org/wiki/Transist%C3%B6r"},
    {"k": ["bjt", "eklem transistör"], "t": "BJT (iki kutuplu eklem transistörü)", "d": "Baz akımıyla kontrol edilen transistör türü; NPN ve PNP olarak iki çeşidi vardır.", "u": "https://en.wikipedia.org/wiki/Bipolar_junction_transistor"},
    {"k": ["baz"], "t": "Baz (B)", "d": "BJT'nin kontrol ucu. Bazdan emetöre akan küçük akım, kollektör akımını belirler.", "u": "https://en.wikipedia.org/wiki/Bipolar_junction_transistor", "only": ["bjt-musluk", "bjt-anahtar", "bjt-yukseltec"]},
    {"k": ["kollektör"], "t": "Kollektör (C)", "d": "BJT'de yük akımının girdiği uç (NPN'de). Kollektör akımı yaklaşık β kere baz akımıdır.", "u": "https://en.wikipedia.org/wiki/Bipolar_junction_transistor"},
    {"k": ["emetör"], "t": "Emetör (E)", "d": "BJT'de baz ve kollektör akımlarının birlikte çıktığı uç: I_E = I_C + I_B.", "u": "https://en.wikipedia.org/wiki/Bipolar_junction_transistor"},
    {"k": ["hfe", "akım kazancı"], "t": "β (hFE), akım kazancı", "d": "Aktif bölgedeki bir BJT'de kollektör akımının baz akımına oranı. Tipik olarak 50–300; aynı tip transistörler arasında bile değişir.", "u": "https://en.wikipedia.org/wiki/Bipolar_junction_transistor#Current-gain"},
    {"k": ["kesim"], "t": "Kesim bölgesi", "d": "Transistörün kapalı olduğu durum: BJT'de baz akımı yok, MOSFET'te kapı gerilimi eşiğin altında; yük akımı akmaz.", "u": "https://en.wikipedia.org/wiki/Bipolar_junction_transistor#Regions_of_operation"},
    {"k": ["doyum"], "t": "Doyum", "d": "BJT'de: transistör tam açık, akımı artık yük sınırlıyor, V_CE birkaç yüz mV. Dikkat: MOSFET'te 'doyum bölgesi' kanalın sıkıştığı, yarı açık durumu anlatır.", "u": "https://en.wikipedia.org/wiki/Bipolar_junction_transistor#Regions_of_operation"},
    {"k": ["aktif bölge"], "t": "Aktif bölge", "d": "BJT'nin yükselteç olarak çalıştığı bölge: I_C ≈ β · I_B. Anahtar olarak kullanılırken bu bölgede kalmak ısınma demektir.", "u": "https://en.wikipedia.org/wiki/Bipolar_junction_transistor#Regions_of_operation"},
    {"k": ["mikrodenetleyici"], "t": "Mikrodenetleyici", "d": "İşlemci, bellek ve giriş/çıkış pinlerini tek yongada birleştiren küçük bilgisayar; Arduino kartlarının kalbi.", "u": "https://tr.wikipedia.org/wiki/Mikrodenetleyici"},
    {"k": ["arduino"], "t": "Arduino", "d": "Açık kaynaklı mikrodenetleyici kartları ve programlama ortamı; elektroniğe başlamanın en yaygın yolu.", "u": "https://tr.wikipedia.org/wiki/Arduino"},
    {"k": ["geri dönüş diyot", "flyback"], "t": "Geri dönüş (flyback) diyotu", "d": "Bobinli bir yükün (motor, röle) uçlarına ters bağlanan diyot; akım kesilince bobinin ürettiği yüksek gerilimi bastırır.", "u": "https://en.wikipedia.org/wiki/Flyback_diode"},
    {"k": ["fazla sürme", "overdrive"], "t": "Fazla sürme (overdrive)", "d": "Anahtar olarak çalışan BJT'nin bazına, I_C/β'nın birkaç katı akım vererek doyumu garantileme.", "u": "https://en.wikipedia.org/wiki/Bipolar_junction_transistor#Saturation"},
    {"k": ["ortak emetörlü"], "t": "Ortak emetörlü yükselteç", "d": "Girişin baza verildiği, çıkışın kollektörden alındığı temel BJT yükselteci; gerilim kazancı yüksektir ve çıkış girişe göre terstir.", "u": "https://en.wikipedia.org/wiki/Common_emitter"},
    {"k": ["yükselteç"], "t": "Yükselteç", "d": "Küçük bir sinyali, beslemeden aldığı enerjiyle büyüten devre.", "u": "https://tr.wikipedia.org/wiki/Y%C3%BCkselte%C3%A7", "only": ["bjt-yukseltec", "bjt-mi-mosfet-mi"]},
    {"k": ["kazanç", "kazanc"], "t": "Kazanç", "d": "Çıkış sinyalinin giriş sinyaline oranı. Gerilim kazancı −4,7 ise çıkış 4,7 kat büyük ve ters çevrilmiştir.", "u": "https://en.wikipedia.org/wiki/Gain_(electronics)"},
    {"k": ["öngerilim", "bias"], "t": "Öngerilimleme (bias)", "d": "Transistörü sinyal gelmeden önce uygun çalışma noktasına (aktif bölgenin ortasına) yerleştiren DC gerilim ve akımlar.", "u": "https://en.wikipedia.org/wiki/Biasing"},
    {"k": ["köprüleme kondansatör", "bypass"], "t": "Köprüleme (bypass) kondansatörü", "d": "Bir dirence paralel bağlanıp sinyal frekansında onu kısa devre eden kondansatör; DC çalışma noktasını değiştirmeden AC kazancını artırır.", "u": "https://en.wikipedia.org/wiki/Bypass_capacitor"},
    {"k": ["kuplaj"], "t": "Kuplaj kondansatörü", "d": "Katlar arasında DC'yi durdurup AC sinyali geçiren seri kondansatör.", "u": "https://en.wikipedia.org/wiki/Capacitive_coupling"},
    {"k": ["kırpılma"], "t": "Kırpılma (clipping)", "d": "Çıkışın besleme sınırlarına ya da transistörün kesim/doyum sınırlarına dayanıp dalga tepelerinin düzleşmesi.", "u": "https://en.wikipedia.org/wiki/Clipping_(audio)"},
    {"k": ["mosfet"], "t": "MOSFET", "d": "Metal–oksit–yarı iletken alan etkili transistör. Kapı gerilimiyle kontrol edilir; kapısı neredeyse akım çekmez.", "u": "https://tr.wikipedia.org/wiki/MOSFET"},
    {"k": ["kapı"], "t": "Kapı (gate)", "d": "MOSFET'in kontrol ucu; ince bir oksitle kanaldan yalıtılmıştır, bu yüzden bir kondansatör gibi davranır.", "u": "https://en.wikipedia.org/wiki/MOSFET", "only": ["mosfet", "pwm", "bjt-mi-mosfet-mi"]},
    {"k": ["akaç"], "t": "Akaç (drain)", "d": "MOSFET'te yük akımının girdiği uç (N kanalda).", "u": "https://en.wikipedia.org/wiki/MOSFET"},
    {"k": ["kaynak"], "t": "Kaynak (source)", "d": "MOSFET'te kapı geriliminin ölçüldüğü referans uç; N kanalda genellikle toprağa bağlanır.", "u": "https://en.wikipedia.org/wiki/MOSFET", "only": ["mosfet"]},
    {"k": ["oksit"], "t": "Kapı oksidi", "d": "Kapıyı kanaldan ayıran çok ince silisyum dioksit (SiO₂) yalıtkan katman; statik elektrikle delinebilir.", "u": "https://en.wikipedia.org/wiki/Gate_oxide"},
    {"k": ["eşik gerilim"], "t": "Eşik gerilimi (V_th)", "d": "MOSFET'te kanalın oluşmaya başladığı kapı–kaynak gerilimi. Logic level MOSFET'lerde 1–2 V civarındadır.", "u": "https://en.wikipedia.org/wiki/Threshold_voltage"},
    {"k": ["kanal"], "t": "Kanal (inversiyon katmanı)", "d": "Kapı gerilimi eşiği geçince oksidin altında toplanan ince taşıyıcı katmanı; kaynak ile akaç arasında iletken yol oluşturur.", "u": "https://en.wikipedia.org/wiki/Inversion_layer", "only": ["mosfet"]},
    {"k": ["rds(on)", "r ds(on)"], "t": "R_DS(on)", "d": "Tam açık MOSFET'in kaynak ile akaç arasındaki direnci; güç MOSFET'lerinde miliohmlar düzeyindedir.", "u": "https://en.wikipedia.org/wiki/Power_MOSFET"},
    {"k": ["logic level"], "t": "Logic level MOSFET", "d": "3,3–5 V'luk mantık seviyesindeki kapı geriliminde tam açılacak şekilde tasarlanmış MOSFET; mikrodenetleyiciyle doğrudan sürülebilir.", "u": "https://en.wikipedia.org/wiki/Power_MOSFET"},
    {"k": ["pwm", "darbe genişlik"], "t": "PWM (darbe genişlik modülasyonu)", "d": "Bir sinyali sabit frekansta açıp kapatarak ortalama gücü ayarlama yöntemi; LED parlaklığı ve motor hızı için kullanılır.", "u": "https://en.wikipedia.org/wiki/Pulse-width_modulation"},
    {"k": ["görev oranı", "duty cycle"], "t": "Görev oranı (duty cycle)", "d": "Bir periyot içinde sinyalin açık kaldığı sürenin periyoda oranı; %50 yarı yarıya açık demektir.", "u": "https://en.wikipedia.org/wiki/Duty_cycle"},
    {"k": ["jfet"], "t": "JFET", "d": "Kapısı ters kutuplanmış PN eklemiyle yalıtılmış alan etkili transistör; normalde iletimdedir, ters kapı gerilimiyle kapanır.", "u": "https://en.wikipedia.org/wiki/JFET"},
    {"k": ["igbt"], "t": "IGBT", "d": "Girişi MOSFET gibi gerilimle sürülen, çıkışı BJT gibi ileten yüksek güç anahtarı.", "u": "https://en.wikipedia.org/wiki/Insulated-gate_bipolar_transistor"},
    {"k": ["isıl kaçak"], "t": "Isıl kaçak", "d": "Isınan bir BJT'nin daha fazla akım çekip daha da ısınması; bu kısır döngü transistörü yakabilir.", "u": "https://en.wikipedia.org/wiki/Thermal_runaway"},
    {"k": ["statik elektrik", "esd"], "t": "Elektrostatik boşalma (ESD)", "d": "Vücutta biriken statik yükün bir parçaya ani boşalması; MOSFET kapı oksidini delebilir.", "u": "https://en.wikipedia.org/wiki/Electrostatic_discharge"},
    {"k": ["opamp", "işlemsel yükselteç"], "t": "Opamp (işlemsel yükselteç)", "d": "İki girişi arasındaki gerilim farkını çok büyük bir kazançla (tipik olarak 100 000 kat ve üstü) yükselten tümleşik devre. Geri beslemeyle kazancı dirençler belirler.", "u": "https://tr.wikipedia.org/wiki/%C4%B0%C5%9Flemsel_y%C3%BCkselte%C3%A7"},
    {"k": ["yükselteç", "yükseltec"], "t": "Yükselteç (amplifikatör)", "d": "Küçük bir sinyali, bir güç kaynağından enerji alarak daha büyük bir kopyasına dönüştüren devre.", "u": "https://tr.wikipedia.org/wiki/Y%C3%BCkselte%C3%A7"},
    {"k": ["geri besleme"], "t": "Geri besleme", "d": "Çıkışın bir kısmının girişe geri verilmesi. Negatif geri besleme farkı küçültüp devreyi dengeler; pozitif geri besleme farkı büyütür.", "u": "https://tr.wikipedia.org/wiki/Geri_besleme"},
    {"k": ["ray"], "t": "Besleme rayı", "d": "Bir devreyi besleyen en yüksek ve en düşük gerilim hatları. Opamp çıkışı bu rayların dışına çıkamaz; çoğu opamp raya bir miktar yaklaşamaz.", "u": "https://en.wikipedia.org/wiki/Operational_amplifier", "only": ["opamp-nedir", "karsilastirici", "opamp-yukseltec", "toplayici-izleyici"]},
    {"k": ["karşılaştırıcı"], "t": "Karşılaştırıcı (comparator)", "d": "İki gerilimi karşılaştırıp hangisinin büyük olduğunu çıkışında iki seviyeden biriyle söyleyen devre. Geri beslemesiz bir opamp böyle çalışır.", "u": "https://en.wikipedia.org/wiki/Comparator"},
    {"k": ["ldr", "ışığa bağımlı direnç"], "t": "LDR (foto direnç)", "d": "Üzerine düşen ışık arttıkça direnci azalan direnç. Tipik bir LDR karanlıkta yüzlerce kiloohm, aydınlıkta birkaç kiloohm ya da daha azdır.", "u": "https://tr.wikipedia.org/wiki/Foto_diren%C3%A7"},
    {"k": ["lux", "lüks"], "t": "Lüks (lux)", "d": "Bir yüzeye düşen ışık miktarının birimi. Ay ışığı 1 lux'ün altında, oda ışığı birkaç yüz lux, açık hava gün ışığı on binlerce lux'tür.", "u": "https://tr.wikipedia.org/wiki/L%C3%BCks_(birim)"},
    {"k": ["histerezis"], "t": "Histerezis", "d": "Bir sistemin açılma ve kapanma eşiklerinin farklı olması. Karşılaştırıcıda gürültünün çıkışı sürekli açıp kapatmasını önler.", "u": "https://en.wikipedia.org/wiki/Hysteresis"},
    {"k": ["schmitt tetikleyici"], "t": "Schmitt tetikleyici", "d": "Pozitif geri beslemeyle histerezis kazandırılmış karşılaştırıcı. Gürültülü sinyalleri temiz iki seviyeli sinyale çevirir.", "u": "https://tr.wikipedia.org/wiki/Schmitt_tetikleyici"},
    {"k": ["sanal toprak"], "t": "Sanal toprak", "d": "Eviren yükselteçte − girişin, toprağa bağlı olmadığı hâlde geri besleme sayesinde 0 V'ta tutulması.", "u": "https://en.wikipedia.org/wiki/Virtual_ground"},
    {"k": ["eviren"], "t": "Eviren yükselteç", "d": "Sinyalin − girişe bir dirençle verildiği opamp devresi. Kazancı −Rf/Rin; çıkış girişin ters işaretlisidir.", "u": "https://en.wikipedia.org/wiki/Operational_amplifier_applications", "only": ["opamp-yukseltec", "toplayici-izleyici", "opamp-nedir"]},
    {"k": ["evirmeyen"], "t": "Evirmeyen yükselteç", "d": "Sinyalin doğrudan + girişe verildiği opamp devresi. Kazancı 1 + Rf/Rg; çıkış girişle aynı yöndedir ve giriş direnci çok yüksektir.", "u": "https://en.wikipedia.org/wiki/Operational_amplifier_applications", "only": ["opamp-yukseltec", "toplayici-izleyici", "opamp-nedir"]},
    {"k": ["toplayıcı yükselteç"], "t": "Toplayıcı yükselteç", "d": "Birkaç girişin dirençlerle aynı sanal toprak düğümüne bağlandığı eviren yükselteç. Çıkış, girişlerin ağırlıklı toplamıdır.", "u": "https://en.wikipedia.org/wiki/Summing_amplifier"},
    {"k": ["gerilim izleyici"], "t": "Gerilim izleyici (tampon)", "d": "Kazancı 1 olan evirmeyen yükselteç. Girişi neredeyse akım çekmez, çıkışı yükü sürer; zayıf bir kaynağı yükten yalıtır.", "u": "https://en.wikipedia.org/wiki/Buffer_amplifier"},
    {"k": ["mikser"], "t": "Ses mikseri", "d": "Birden çok ses kaynağını ayarlanabilir seviyelerle tek çıkışta toplayan cihaz.", "u": "https://en.wikipedia.org/wiki/Mixing_console"},
    {"k": ["rail-to-rail"], "t": "Rail-to-rail", "d": "Çıkışı (ve bazen girişi) besleme raylarına birkaç on milivolta kadar yaklaşabilen opamp.", "u": "https://en.wikipedia.org/wiki/Operational_amplifier"},
    {"k": ["kazanç–bant genişliği", "bant genişliği çarpımı"], "t": "Kazanç–bant genişliği çarpımı", "d": "Bir opampın kazancı ile o kazancı koruyabildiği en yüksek frekansın çarpımı; yaklaşık sabittir. Kazanç arttıkça kullanılabilir bant daralır.", "u": "https://en.wikipedia.org/wiki/Gain%E2%80%93bandwidth_product"},
    {"k": ["ofset gerilimi"], "t": "Giriş ofset gerilimi", "d": "Girişler eşitken çıkışı sıfırlamak için girişler arasına konması gereken küçük gerilim; tipik olarak mikrovolt ile birkaç milivolt arası.", "u": "https://en.wikipedia.org/wiki/Input_offset_voltage"},
    {"k": ["açık kollektör"], "t": "Açık kollektör çıkış", "d": "Çıkış transistörünün kollektörünün boşta bırakıldığı çıkış türü. Çıkışı yalnız aşağı çekebilir; yukarı çekmek için dışarıdan direnç gerekir.", "u": "https://en.wikipedia.org/wiki/Open_collector"},
    {"k": ["pull-up", "çekme direnci"], "t": "Çekme (pull-up) direnci", "d": "Bir hattı, başka bir şey sürmediğinde besleme gerilimine çeken direnç.", "u": "https://en.wikipedia.org/wiki/Pull-up_resistor"},
    {"k": ["giriş direnci"], "t": "Giriş direnci (giriş empedansı)", "d": "Bir devrenin girişinin kaynaktan ne kadar akım çektiğini belirleyen direnç. Yüksek giriş direnci, kaynağı az yükler.", "u": "https://en.wikipedia.org/wiki/Input_impedance"},
    {"k": ["cmos"], "t": "CMOS", "d": "Complementary MOS (tümleyen MOS): her kapıda P kanallı ve N kanallı MOSFET'leri çift olarak kullanan tümleşik devre teknolojisi. Dururken neredeyse hiç güç harcamaz; bugünkü işlemcilerin hemen hepsi CMOS'tur.", "u": "https://tr.wikipedia.org/wiki/CMOS"},
    {"k": ["evirici"], "t": "Evirici (NOT kapısı)", "d": "Girişindeki mantık seviyesini tersine çeviren kapı: 0 girerse 1, 1 girerse 0 çıkar.", "u": "https://en.wikipedia.org/wiki/Inverter_(logic_gate)", "only": ["transistorlu-not", "cmos-evirici", "gurultu-paylari", "cmos-nand"]},
    {"k": ["not (değil) kapı", "not kapı"], "t": "NOT (DEĞİL) kapısı", "d": "Tek girişli mantık kapısı; çıkışı girişin tersidir.", "u": "https://tr.wikipedia.org/wiki/DE%C4%9E%C4%B0L_kap%C4%B1s%C4%B1"},
    {"k": ["direnç–transistör mantığ", "rtl"], "t": "Direnç–transistör mantığı (RTL)", "d": "Dirençler ve bipolar transistörlerle kurulan, 1960'ların ilk tümleşik mantık ailesi. Çıkış 0 iken sürekli akım çektiği için yerini önce TTL'ye, sonra CMOS'a bıraktı.", "u": "https://tr.wikipedia.org/wiki/Diren%C3%A7-transist%C3%B6r_mant%C4%B1%C4%9F%C4%B1"},
    {"k": ["ttl"], "t": "TTL", "d": "Transistör–transistör mantığı: 1960'lardan beri yaygın 5 V bipolar mantık ailesi (7400 serisi). Giriş eşikleri 0,8 V ve 2,0 V bugün de birçok aile tarafından kullanılır.", "u": "https://tr.wikipedia.org/wiki/Transist%C3%B6r-transist%C3%B6r_mant%C4%B1%C4%9F%C4%B1"},
    {"k": ["lvcmos"], "t": "LVCMOS", "d": "Düşük gerilimli CMOS arayüz standardı (ör. 3,3 V). Seviyeleri JEDEC JESD8 standartlarında tanımlanır.", "u": "https://en.wikipedia.org/wiki/Logic_level"},
    {"k": ["jedec"], "t": "JEDEC", "d": "Yarı iletken sektörünün standart kuruluşu; bellek ve arayüz gerilim seviyeleri gibi standartları yayımlar.", "u": "https://en.wikipedia.org/wiki/JEDEC"},
    {"k": ["gürültü pay"], "t": "Gürültü payı", "d": "Göndericinin garanti ettiği çıkış seviyesi ile alıcının garanti ettiği giriş eşiği arasındaki fark (NMH = VOH − VIH, NML = VIL − VOL). Bu kadar gürültü bit hatasına yol açamaz.", "u": "https://en.wikipedia.org/wiki/Noise_margin"},
    {"k": ["mantık seviye"], "t": "Mantık seviyesi", "d": "Bir gerilimin 0 ya da 1 sayıldığı aralık. Her mantık ailesi kendi eşiklerini tanımlar.", "u": "https://en.wikipedia.org/wiki/Logic_level"},
    {"k": ["yasak bölge"], "t": "Yasak (tanımsız) bölge", "d": "VIL ile VIH arasındaki gerilim aralığı: alıcının bunu 0 mı 1 mi okuyacağı garanti değildir.", "u": "https://en.wikipedia.org/wiki/Logic_level"},
    {"k": ["gürültü"], "t": "Gürültü", "d": "Sinyale karışan istenmeyen rastgele gerilim değişimleri: komşu hatlardan sızma, ısıl gürültü, motor ve anahtarlama parazitleri.", "u": "https://en.wikipedia.org/wiki/Noise_(electronics)", "only": ["gurultu-paylari"]},
    {"k": ["aktarım eğrisi"], "t": "Aktarım eğrisi", "d": "Bir devrenin çıkış geriliminin giriş gerilimine göre grafiği. Bir eviricide geniş düz bölgeler ve dik bir geçiş bölgesi görülür.", "u": "https://en.wikipedia.org/wiki/Transfer_function"},
    {"k": ["eşik gerilimi", "eşik"], "t": "Eşik gerilimi", "d": "MOSFET'te kanalın açılmaya başladığı kapı–kaynak gerilimi; bir mantık kapısında çıkışın yön değiştirdiği giriş gerilimi.", "u": "https://en.wikipedia.org/wiki/Threshold_voltage", "only": ["cmos-evirici", "gurultu-paylari"]},
    {"k": ["nand"], "t": "NAND kapısı", "d": "VE DEĞİL: yalnız bütün girişleri 1 iken 0 veren kapı. Tek başına bütün mantık işlevlerini kurmaya yeter (evrensel kapı).", "u": "https://en.wikipedia.org/wiki/NAND_gate"},
    {"k": ["nor"], "t": "NOR kapısı", "d": "VEYA DEĞİL: yalnız bütün girişleri 0 iken 1 veren kapı. NAND gibi o da evrenseldir.", "u": "https://tr.wikipedia.org/wiki/NOR_kap%C4%B1s%C4%B1"},
    {"k": ["evrensel"], "t": "Evrensel kapı", "d": "Yalnız kendisi kullanılarak her mantık işlevinin kurulabildiği kapı; NAND ve NOR evrenseldir.", "u": "https://en.wikipedia.org/wiki/Functional_completeness", "only": ["cmos-nand"]},
    {"k": ["doğruluk tablo"], "t": "Doğruluk tablosu", "d": "Bir mantık devresinin bütün giriş kombinasyonları için çıkışını listeleyen tablo.", "u": "https://tr.wikipedia.org/wiki/Do%C4%9Fruluk_tablosu"},
    {"k": ["kesim"], "t": "Kesim", "d": "Transistörün kapalı olduğu çalışma bölgesi: akım akmaz, transistör açık bir anahtar gibidir.", "u": "https://en.wikipedia.org/wiki/Bipolar_junction_transistor", "only": ["transistorlu-not"]},
    {"k": ["tümleşik devre"], "t": "Tümleşik devre (entegre)", "d": "Transistörlerin, dirençlerin ve bağlantıların tek bir silisyum parçası üzerinde birlikte üretildiği devre; yonga, çip.", "u": "https://tr.wikipedia.org/wiki/Entegre_devre"},
    {"k": ["apollo rehberlik bilgisayar"], "t": "Apollo rehberlik bilgisayarı", "d": "Apollo uzay araçlarındaki seyir bilgisayarı (1960'lar); tümleşik devreleri ilk büyük ölçekte kullanan bilgisayarlardan.", "u": "https://en.wikipedia.org/wiki/Apollo_Guidance_Computer"},
    {"k": ["frank wanlass"], "t": "Frank Wanlass", "d": "Amerikalı mühendis (1933–2010). 1963'te Fairchild'da CMOS devresini geliştirdi ve patentini aldı.", "u": "https://en.wikipedia.org/wiki/Frank_Wanlass"},
    {"k": ["m1 yonga", "m1"], "t": "Apple M1", "d": "Apple'ın Kasım 2020'de tanıttığı yonga; Apple'a göre 16 milyar transistör içerir.", "u": "https://en.wikipedia.org/wiki/Apple_M1", "only": ["cmos-nand"]},
    {"k": ["delik"], "t": "Delik (hole)", "d": "Yarı iletkende eksik elektronun bıraktığı, pozitif yük gibi davranan boşluk. P kanallı transistörlerde akımı delikler taşır; elektronlardan daha yavaştırlar.", "u": "https://en.wikipedia.org/wiki/Electron_hole", "only": ["cmos-nand"]},
    {"k": ["bit"], "t": "Bit", "d": "İkili basamak (binary digit): 0 ya da 1 değerini alan en küçük bilgi birimi. Devrede bir telin alçak ya da yüksek gerilimde olması.", "u": "https://tr.wikipedia.org/wiki/Bit"},
    {"k": ["bayt"], "t": "Bayt", "d": "Sekiz bitlik grup; 0–255 arası 256 farklı değer alır. Bellek ve dosya boyutlarının temel birimi.", "u": "https://tr.wikipedia.org/wiki/Bayt"},
    {"k": ["ikili sayı", "ikili sistem", "ikili"], "t": "İkili sayı sistemi", "d": "Yalnız 0 ve 1 rakamlarını kullanan 2 tabanlı sayı sistemi; her basamak bir sağdakinin 2 katı değerdedir.", "u": "https://tr.wikipedia.org/wiki/%C4%B0kili_say%C4%B1_sistemi"},
    {"k": ["onluk", "ondalık"], "t": "Onluk (ondalık) sistem", "d": "Günlük hayatta kullandığımız 10 tabanlı sayı sistemi: 0–9 rakamları, her basamak bir sağdakinin 10 katı.", "u": "https://tr.wikipedia.org/wiki/Ondal%C4%B1k", "only": ["ikili-sayilar"]},
    {"k": ["onaltılık", "hex"], "t": "Onaltılık (hex) sistem", "d": "16 tabanlı sayı sistemi: 0–9 ve A–F. Bir onaltılık basamak tam olarak dört bite karşılık gelir; ikili sayıları kısa yazmak için kullanılır.", "u": "https://en.wikipedia.org/wiki/Hexadecimal"},
    {"k": ["nibble", "yarım bayt"], "t": "Yarım bayt (nibble)", "d": "Dört bitlik grup; 0–15 arası değer alır, bir onaltılık basamağa denktir.", "u": "https://en.wikipedia.org/wiki/Nibble"},
    {"k": ["ikiye tümleyen"], "t": "İkiye tümleyen", "d": "İşaretli tam sayıları ikili yazma yöntemi: en anlamlı bit negatif değer taşır. Negatifi almak için bitler ters çevrilir ve 1 eklenir.", "u": "https://en.wikipedia.org/wiki/Two%27s_complement"},
    {"k": ["elde", "carry"], "t": "Elde (carry)", "d": "Toplamada bir basamağın taşan kısmı; bir üst basamağa aktarılır. İkilide 1 + 1 = 10: 0 yazılır, 1 elde.", "u": "https://en.wikipedia.org/wiki/Carry_(arithmetic)"},
    {"k": ["taşma"], "t": "Taşma (overflow)", "d": "Sonucun ayrılan bit sayısına sığmaması. 8 bitte 255 + 1 sonucu 0'a döner.", "u": "https://en.wikipedia.org/wiki/Integer_overflow"},
    {"k": ["and", "ve kapı"], "t": "AND (VE) kapısı", "d": "Bütün girişleri 1 iken çıkışı 1 olan mantık kapısı. Anahtar karşılığı: seri bağlı anahtarlar.", "u": "https://tr.wikipedia.org/wiki/VE_kap%C4%B1s%C4%B1", "only": ["temel-kapilar"]},
    {"k": ["or", "veya kapı"], "t": "OR (VEYA) kapısı", "d": "Girişlerinden en az biri 1 iken çıkışı 1 olan mantık kapısı. Anahtar karşılığı: paralel bağlı anahtarlar.", "u": "https://tr.wikipedia.org/wiki/VEYA_kap%C4%B1s%C4%B1", "only": ["temel-kapilar"]},
    {"k": ["xor", "özel veya"], "t": "XOR (ÖZEL VEYA) kapısı", "d": "Girişleri birbirinden farklıyken çıkışı 1 olan kapı. İki bitin toplamının birler basamağını verir.", "u": "https://tr.wikipedia.org/wiki/XOR_kap%C4%B1s%C4%B1", "only": ["temel-kapilar", "perceptron-xor"]},
    {"k": ["xnor"], "t": "XNOR kapısı", "d": "XOR'un tersi: girişler aynıyken çıkış 1. Eşitlik kapısı olarak da bilinir.", "u": "https://en.wikipedia.org/wiki/XNOR_gate", "only": ["temel-kapilar"]},
    {"k": ["kabarcık", "kabarcığ"], "t": "Kabarcık (ters çevirme dairesi)", "d": "Kapı sembolünün girişinde ya da çıkışında çizilen küçük daire; o noktada sinyalin tersinin alındığını gösterir.", "u": "https://en.wikipedia.org/wiki/Logic_gate", "only": ["temel-kapilar", "de-morgan"]},
    {"k": ["vavien"], "t": "Vavien (iki yollu) anahtar", "d": "Ortak ucu iki kontaktan birine bağlayan anahtar. İki vavien anahtar, bir lambanın iki ayrı yerden yakılıp söndürülmesini sağlar (merdiven lambası).", "u": "https://en.wikipedia.org/wiki/Multiway_switching"},
    {"k": ["iec"], "t": "IEC sembolleri", "d": "Uluslararası Elektroteknik Komisyonu'nun (IEC 60617) dikdörtgen kapı sembolleri: kuralı kutunun içindeki &, ≥1, =1 işaretleri söyler.", "u": "https://en.wikipedia.org/wiki/Logic_gate#Symbols", "only": ["temel-kapilar"]},
    {"k": ["ansi"], "t": "ANSI (ayırt edici biçimli) semboller", "d": "IEEE Std 91 / ANSI kapı sembolleri: her kapının kendine özgü biçimi vardır (D biçimli AND, kalkan biçimli OR).", "u": "https://en.wikipedia.org/wiki/Logic_gate#Symbols", "only": ["temel-kapilar"]},
    {"k": ["claude shannon", "shannon"], "t": "Claude Shannon", "d": "Amerikalı matematikçi ve mühendis (1916–2001). 1937'deki yüksek lisans tezinde Boole cebirinin anahtar ve röle devrelerini tarif ettiğini gösterdi; bilgi kuramının da kurucusudur.", "u": "https://tr.wikipedia.org/wiki/Claude_Shannon"},
    {"k": ["george boole", "boole cebir", "boole"], "t": "Boole cebiri", "d": "Değişkenlerin yalnız 0 ya da 1 olduğu, VE, VEYA ve DEĞİL işlemleriyle kurulan cebir. Adını 1854'te bu cebiri yayımlayan George Boole'dan alır.", "u": "https://tr.wikipedia.org/wiki/Boole_cebiri"},
    {"k": ["de morgan"], "t": "De Morgan kuralları", "d": "(A·B)' = A' + B' ve (A + B)' = A'·B'. Bir VE'nin tersi, terslerin VEYA'sıdır; tersi de doğrudur.", "u": "https://en.wikipedia.org/wiki/De_Morgan%27s_laws"},
    {"k": ["kabarcık itme"], "t": "Kabarcık itme", "d": "De Morgan kuralının şema üzerindeki kullanımı: çıkıştaki ters çevirme dairesi girişlere itilince AND ile OR yer değiştirir.", "u": "https://en.wikipedia.org/wiki/De_Morgan%27s_laws", "only": ["de-morgan"]},
    {"k": ["yutma"], "t": "Yutma kuralı", "d": "A + A·B = A ve A·(A + B) = A. Bir terim, onu içeren daha büyük terimi yutar.", "u": "https://en.wikipedia.org/wiki/Absorption_law", "only": ["de-morgan"]},
    {"k": ["dağılma"], "t": "Dağılma özelliği", "d": "A·(B + C) = A·B + A·C. Boole cebirinde ayrıca A + B·C = (A + B)·(A + C) da geçerlidir.", "u": "https://en.wikipedia.org/wiki/Distributive_property", "only": ["de-morgan"]},
    {"k": ["augustus de morgan"], "t": "Augustus De Morgan", "d": "İngiliz matematikçi ve mantıkçı (1806–1871). Adını taşıyan kurallarla ve biçimsel mantık çalışmalarıyla tanınır.", "u": "https://en.wikipedia.org/wiki/Augustus_De_Morgan"},
    {"k": ["perceptron"], "t": "Perceptron", "d": "Frank Rosenblatt'ın 1958'de yayımladığı yapay nöron modeli: girişlerin ağırlıklı toplamı eşiği geçerse çıkış 1, değilse 0.", "u": "https://tr.wikipedia.org/wiki/Perceptron"},
    {"k": ["ağırlık"], "t": "Ağırlık (yapay nöronda)", "d": "Bir girişin nöronun toplamına ne kadar katkı yaptığını belirleyen sayı; öğrenme bu sayıları ayarlamaktır.", "u": "https://en.wikipedia.org/wiki/Artificial_neuron", "only": ["perceptron-xor"]},
    {"k": ["nöron"], "t": "Yapay nöron", "d": "Girişlerini ağırlıklarla toplayıp bir etkinleştirme işlevinden geçiren basit hesap birimi; yapay sinir ağlarının yapı taşı.", "u": "https://en.wikipedia.org/wiki/Artificial_neuron"},
    {"k": ["doğrusal olarak ayrılabil", "ayrılabil"], "t": "Doğrusal ayrılabilirlik", "d": "İki sınıf noktanın tek bir doğruyla (çok boyutta düzlemle) birbirinden ayrılabilmesi. AND ve OR ayrılabilir, XOR ayrılamaz.", "u": "https://en.wikipedia.org/wiki/Linear_separability"},
    {"k": ["katman"], "t": "Katman (sinir ağında)", "d": "Aynı girişleri alan nöronlar grubu. Bir katmanın çıkışları sonraki katmanın girişidir; çok katmanlı ağlar tek katmanın çözemediği işlevleri öğrenir.", "u": "https://en.wikipedia.org/wiki/Multilayer_perceptron", "only": ["perceptron-xor"]},
    {"k": ["derin öğrenme"], "t": "Derin öğrenme", "d": "Çok sayıda katmandan oluşan yapay sinir ağlarıyla öğrenme.", "u": "https://tr.wikipedia.org/wiki/Derin_%C3%B6%C4%9Frenme"},
    {"k": ["geri yayılım", "backpropagation"], "t": "Geri yayılım (backpropagation)", "d": "Çok katmanlı bir ağda hatanın çıkıştan girişe doğru katman katman dağıtılıp her ağırlığın düzeltildiği eğitim yöntemi.", "u": "https://en.wikipedia.org/wiki/Backpropagation"},
    {"k": ["frank rosenblatt", "rosenblatt"], "t": "Frank Rosenblatt", "d": "Amerikalı psikolog (1928–1971); perceptronu ve onu donanımla gerçekleyen Mark I Perceptron makinesini geliştirdi.", "u": "https://en.wikipedia.org/wiki/Frank_Rosenblatt"},
    {"k": ["perceptrons", "minsky"], "t": "Perceptrons (kitap)", "d": "Marvin Minsky ve Seymour Papert'in 1969 tarihli kitabı; tek katmanlı perceptronların hesaplayabileceği işlevlerin sınırlarını matematiksel olarak inceledi.", "u": "https://en.wikipedia.org/wiki/Perceptrons_(book)", "only": ["perceptron-xor"]},
    {"k": ["minterm"], "t": "Minterm", "d": "Bütün girişleri içeren ve doğruluk tablosunun yalnız tek bir satırında 1 olan VE terimi; 1 olan giriş olduğu gibi, 0 olan tersiyle yazılır (ör. 011 satırı için A'BC).", "u": "https://en.wikipedia.org/wiki/Canonical_normal_form"},
    {"k": ["maxterm"], "t": "Maxterm", "d": "Doğruluk tablosunun yalnız tek bir satırında 0 olan VEYA terimi. Maxterm'lerin VE'si toplamların çarpımını (POS) verir.", "u": "https://en.wikipedia.org/wiki/Canonical_normal_form"},
    {"k": ["çarpımların toplam", "sum of products"], "t": "Çarpımların toplamı (SOP)", "d": "VE terimlerinin VEYA ile birleştirildiği ifade biçimi, ör. AB + A'C. İki katlı bir devreye karşılık gelir: bir sıra VE kapısı, bir VEYA kapısı.", "u": "https://en.wikipedia.org/wiki/Disjunctive_normal_form"},
    {"k": ["toplamların çarpım"], "t": "Toplamların çarpımı (POS)", "d": "VEYA terimlerinin VE ile birleştirildiği ifade biçimi, ör. (A + B)(A' + C). SOP'un ikizidir.", "u": "https://en.wikipedia.org/wiki/Conjunctive_normal_form"},
    {"k": ["kanonik"], "t": "Kanonik biçim", "d": "Bir mantık fonksiyonunun tek ve standart yazılışı: her 1 satırı için bir minterm. Her zaman doğrudur ama genellikle en kısa değildir.", "u": "https://en.wikipedia.org/wiki/Canonical_normal_form"},
    {"k": ["çoğunluk"], "t": "Çoğunluk fonksiyonu", "d": "Girişlerin yarısından fazlası 1 ise 1 veren fonksiyon. Üç girişte en basit hâli AB + AC + BC'dir.", "u": "https://en.wikipedia.org/wiki/Majority_function", "only": ["minterm"]},
    {"k": ["karnaugh harita"], "t": "Karnaugh haritası", "d": "Doğruluk tablosunu, komşu hücreleri tek bitte farklı olacak biçimde (Gray sırası) dizen tablo. Komşu 1'leri gruplayarak mantık ifadeleri elle sadeleştirilir.", "u": "https://tr.wikipedia.org/wiki/Karnaugh_haritas%C4%B1"},
    {"k": ["maurice karnaugh"], "t": "Maurice Karnaugh", "d": "Amerikalı fizikçi ve mühendis (1924–2022). Karnaugh haritasını 1953'te Bell Laboratuvarları'nda yayımladı.", "u": "https://en.wikipedia.org/wiki/Maurice_Karnaugh"},
    {"k": ["edward veitch"], "t": "Veitch diyagramı", "d": "Edward Veitch'in 1952'de önerdiği, mantık fonksiyonlarını tablo üzerinde sadeleştirme diyagramı; Karnaugh haritasının öncüsü.", "u": "https://en.wikipedia.org/wiki/Veitch_chart"},
    {"k": ["gray kod", "gray kodu"], "t": "Gray kodu", "d": "Ardışık iki değerin yalnız bir bitte farklı olduğu ikili sıralama: 00, 01, 11, 10. Döner kodlayıcılarda ve Karnaugh haritalarında kullanılır.", "u": "https://en.wikipedia.org/wiki/Gray_code"},
    {"k": ["frank gray"], "t": "Frank Gray", "d": "Bell Laboratuvarları araştırmacısı (1887–1969). Kendi adıyla anılan yansımalı ikili kodun patentini 1953'te aldı.", "u": "https://en.wikipedia.org/wiki/Frank_Gray_(researcher)"},
    {"k": ["bell laboratuvar"], "t": "Bell Laboratuvarları", "d": "ABD'deki ünlü araştırma laboratuvarı; transistör, bilgi kuramı, Gray kodu ve Karnaugh haritası burada doğdu.", "u": "https://tr.wikipedia.org/wiki/Bell_Laboratuvarlar%C4%B1"},
    {"k": ["önemsiz", "don't care"], "t": "Önemsiz durum (X)", "d": "Hiç oluşmayacak ya da sonucu bizi ilgilendirmeyen giriş. Sadeleştirmede işe yararsa 1, yaramazsa 0 sayılır.", "u": "https://en.wikipedia.org/wiki/Don%27t-care_term"},
    {"k": ["asal çarpan", "prime implicant"], "t": "Asal çarpan (prime implicant)", "d": "Karnaugh haritasında daha fazla büyütülemeyen geçerli grup. En basit ifade yalnız asal çarpanlardan oluşur.", "u": "https://en.wikipedia.org/wiki/Implicant"},
    {"k": ["quine–mccluskey", "quine-mccluskey"], "t": "Quine–McCluskey yöntemi", "d": "Mantık ifadelerini haritaya bakmadan, tablodan adım adım sadeleştiren algoritma: önce asal çarpanlar bulunur, sonra 1'leri en az terimle örten seçim yapılır. Karnaugh haritasıyla aynı sonucu verir ve bilgisayarda çalışır.", "u": "https://en.wikipedia.org/wiki/Quine%E2%80%93McCluskey_algorithm"},
    {"k": ["espresso"], "t": "Espresso", "d": "Çok değişkenli mantık fonksiyonlarını hızla, sezgisel yöntemlerle sadeleştiren yaygın bir program.", "u": "https://en.wikipedia.org/wiki/Espresso_heuristic_logic_minimizer"},
    {"k": ["7 segment", "yedi segment"], "t": "7 segment gösterge", "d": "Rakamları yedi çubuk biçimli LED ya da LCD segmentle (a–g) gösteren gösterge; saatlerde, hesap makinelerinde, ölçü aletlerinde kullanılır.", "u": "https://en.wikipedia.org/wiki/Seven-segment_display"},
    {"k": ["bcd", "ikili kodlu ondalık"], "t": "BCD (ikili kodlu ondalık)", "d": "Her ondalık rakamın ayrı ayrı dört bitle yazıldığı kodlama: 0 = 0000 … 9 = 1001. 1010–1111 kodları kullanılmaz.", "u": "https://en.wikipedia.org/wiki/Binary-coded_decimal"},
    {"k": ["ortak katot", "ortak anot"], "t": "Ortak katot / ortak anot", "d": "7 segment göstergede LED'lerin katotlarının (ya da anotlarının) tek uçta birleştirilmesi. Ortak katotta segment 1 ile, ortak anotta 0 ile yanar.", "u": "https://en.wikipedia.org/wiki/Seven-segment_display"},
    {"k": ["aktif düşük"], "t": "Aktif düşük", "d": "İşlevin 1 ile değil 0 ile (düşük gerilimle) etkinleştiği sinyal.", "u": "https://en.wikipedia.org/wiki/Logic_level"},
    {"k": ["yarım toplayıcı"], "t": "Yarım toplayıcı", "d": "İki biti toplayan devre: toplam biti S = A ⊕ B, elde biti Cout = A · B. Gelen bir eldeyi hesaba katamadığı için \"yarım\" denir.", "u": "https://tr.wikipedia.org/wiki/Toplayıcı"},
    {"k": ["tam toplayıcı"], "t": "Tam toplayıcı", "d": "Üç biti (A, B ve gelen elde Cin) toplayan devre; iki yarım toplayıcı ve bir VEYA kapısıyla kurulur. Çok bitli toplayıcıların yapı taşıdır.", "u": "https://tr.wikipedia.org/wiki/Toplayıcı"},
    {"k": ["toplayıcı"], "t": "Toplayıcı (adder)", "d": "İkili sayıları toplayan mantık devresi. İşlemcilerdeki aritmetik mantık biriminin temel parçasıdır.", "u": "https://tr.wikipedia.org/wiki/Toplayıcı", "only": ["tam-toplayici", "dort-bit-toplayici"]},
    {"k": ["dalgalı elde", "ripple-carry", "ripple"], "t": "Dalgalı elde toplayıcı (ripple-carry)", "d": "Tam toplayıcıların zincir hâlinde bağlandığı toplayıcı: her bloğun eldesi bir sonrakine girer. Basittir, ama elde bütün bitleri sırayla geçmek zorunda olduğu için yavaştır.", "u": "https://en.wikipedia.org/wiki/Adder_(electronics)"},
    {"k": ["yayılma gecikmesi", "kapı gecikmesi", "yayılma gecikme"], "t": "Yayılma gecikmesi", "d": "Bir kapının girişi değiştikten sonra çıkışının değişmesine kadar geçen süre. Kapılar zincirlendikçe gecikmeler toplanır.", "u": "https://tr.wikipedia.org/wiki/Yayılma_gecikmesi"},
    {"k": ["oturma süresi"], "t": "Oturma süresi", "d": "Girişler değiştikten sonra bir devrenin bütün çıkışlarının son, doğru değerlerine ulaşması için geçen süre. Saatli sistemler en az bu kadar beklemek zorundadır.", "u": "https://en.wikipedia.org/wiki/Propagation_delay"},
    {"k": ["ileri bakışlı elde", "carry-lookahead"], "t": "İleri bakışlı elde (carry-lookahead)", "d": "Elde bitlerini zincir boyunca beklemeden, \"üret\" ve \"yay\" sinyallerinden birkaç kapı katmanında aynı anda hesaplayan hızlı toplayıcı yöntemi.", "u": "https://en.wikipedia.org/wiki/Carry-lookahead_adder"},
    {"k": ["glitch", "gereksiz geçiş"], "t": "Glitch (geçici hatalı darbe)", "d": "Sinyallerin farklı gecikmelerle gelmesi yüzünden bir çıkışın kısa süreliğine yanlış değere gidip dönmesi. Kombinasyonel devrelerde \"tehlike\" (hazard) diye de anılır.", "u": "https://en.wikipedia.org/wiki/Hazard_(logic)"},
    {"k": ["saat hızı"], "t": "Saat hızı", "d": "Saatli bir devrenin saniyedeki saat vuruşu sayısı. En yavaş kombinasyonel yolun oturma süresi, saat periyodunun alt sınırını belirler.", "u": "https://en.wikipedia.org/wiki/Clock_rate"},
    {"k": ["işlemci", "merkezi işlem birimi"], "t": "İşlemci (CPU)", "d": "Programın komutlarını okuyup yürüten devre: aritmetik mantık birimi, yazmaçlar ve denetim biriminden oluşur.", "u": "https://tr.wikipedia.org/wiki/Merkezî_işlem_birimi"},
    {"k": ["aritmetik mantık birimi", "alu"], "t": "Aritmetik mantık birimi (ALU)", "d": "İşlemcide toplama, çıkarma ve mantık işlemlerini yapan bölüm; merkezinde bir toplayıcı bulunur.", "u": "https://tr.wikipedia.org/wiki/Aritmetik_mantık_birimi"},
    {"k": ["çoklayıcı", "multiplexer", "mux"], "t": "Çoklayıcı (MUX)", "d": "Seçim bitlerinin belirlediği tek bir veri girişini çıkışa aktaran devre; bir veri seçicidir. n seçim biti 2ⁿ girişten birini seçer.", "u": "https://tr.wikipedia.org/wiki/Çoklayıcı"},
    {"k": ["kod çözücü", "decoder"], "t": "Kod çözücü (decoder)", "d": "n bitlik ikili girişe göre 2ⁿ çıkıştan tam olarak birini 1 yapan devre. Bellek ve çevre birimi adreslemede kullanılır.", "u": "https://tr.wikipedia.org/wiki/Kod_çözücü"},
    {"k": ["adres çözme", "adres"], "t": "Adres (bellek adresi)", "d": "Bellekteki bir hücrenin numarası. İşlemci bir adres gönderir; kod çözücü bu adresten tek bir hücreyi seçer (adres çözme).", "u": "https://tr.wikipedia.org/wiki/Bellek_adresi"},
    {"k": ["bellek"], "t": "Bellek", "d": "Verilerin bit bit saklandığı hücrelerden oluşan devre; her hücreye adresiyle erişilir.", "u": "https://tr.wikipedia.org/wiki/Bellek_adresi", "only": ["mux-kod-cozucu"]},
    {"k": ["ascii"], "t": "ASCII", "d": "Harf, rakam ve işaretlere 0–127 arası sayılar veren karakter kodlaması; örneğin \"A\" = 65.", "u": "https://tr.wikipedia.org/wiki/ASCII"},
    {"k": ["fpga"], "t": "FPGA", "d": "İçindeki mantık blokları ve bağlantıları sonradan programlanabilen yonga. Mantık blokları küçük arama tablolarıdır (LUT): aslında çoklayıcılardır.", "u": "https://tr.wikipedia.org/wiki/FPGA"},
    {"k": ["arama tablo", "lut"], "t": "Arama tablosu (LUT)", "d": "Her giriş birleşimi için çıkışı önceden saklayan tablo. Girişler bir çoklayıcının seçim bitleri olur, saklanan değerler veri girişleri.", "u": "https://en.wikipedia.org/wiki/Lookup_table"},
    {"k": ["74hc", "74hc283", "74hc138", "74hc153"], "t": "74HC serisi", "d": "Yaygın 7400 ailesinin CMOS (yüksek hızlı) sürümü: her yongada birkaç kapı ya da toplayıcı, kod çözücü, çoklayıcı gibi hazır bloklar bulunur.", "u": "https://en.wikipedia.org/wiki/7400-series_integrated_circuits"},
    {"k": ["kombinasyonel"], "t": "Kombinasyonel devre", "d": "Çıkışları yalnız o anki girişlere bağlı olan, hafızası olmayan mantık devresi: toplayıcı, çoklayıcı, kod çözücü gibi.", "u": "https://en.wikipedia.org/wiki/Combinational_logic"},
    {"k": ["latch", "mandal"], "t": "Latch (mandal)", "d": "Bir biti saklayan, geri beslemeli en basit hafıza devresi. Girişi (ya da EN = 1 iken D girişi) çıkışı doğrudan değiştirir; seviyeyle tetiklenir.", "u": "https://en.wikipedia.org/wiki/Flip-flop_(electronics)#Simple_set-reset_latches"},
    {"k": ["flip-flop"], "t": "Flip-flop", "d": "Bir bit saklayan, yalnız saat sinyalinin kenarında (çoğunlukla yükselen kenarda) durum değiştiren hafıza elemanı. D, T ve JK türleri vardır.", "u": "https://tr.wikipedia.org/wiki/Flip-flop"},
    {"k": ["yükselen kenar", "kenar tetiklemeli", "kenar tetikleme"], "t": "Kenar tetikleme", "d": "Bir devrenin sinyalin seviyesine değil, değiştiği ana tepki vermesi. Yükselen kenar 0'dan 1'e, düşen kenar 1'den 0'a geçiştir.", "u": "https://en.wikipedia.org/wiki/Signal_edge"},
    {"k": ["saat sinyal", "saatin yüksel", "saat darbe"], "t": "Saat sinyali", "d": "Düzenli aralıklarla 0 ile 1 arasında gidip gelen kare dalga. Eşzamanlı devrelerde bütün flip-flop'lar aynı saat kenarında bir adım ilerler.", "u": "https://en.wikipedia.org/wiki/Clock_signal"},
    {"k": ["kurulma süre", "tutma süre"], "t": "Kurulma ve tutma süresi", "d": "Flip-flop'un veriyi güvenle okuyabilmesi için D girişinin saat kenarından önce (kurulma, setup) ve sonra (tutma, hold) sabit kalması gereken en kısa süreler.", "u": "https://en.wikipedia.org/wiki/Flip-flop_(electronics)#Timing_considerations"},
    {"k": ["metastabilite", "metastabil", "yarı kararlı"], "t": "Metastabilite", "d": "Bir latch ya da flip-flop'un 0 ile 1 arasında kararsız bir ara durumda, süresi öngörülemeyen bir zaman kalması. Zamanlama kuralları çiğnenince ortaya çıkabilir.", "u": "https://en.wikipedia.org/wiki/Metastability_(electronics)"},
    {"k": ["t flip-flop"], "t": "T flip-flop", "d": "T = 1 iken her saat kenarında çıkışını tersine çeviren flip-flop. Çıkış frekansı saat frekansının yarısıdır.", "u": "https://en.wikipedia.org/wiki/Flip-flop_(electronics)#T_flip-flop", "only": ["sayac"]},
    {"k": ["jk flip-flop"], "t": "JK flip-flop", "d": "J kuran, K sıfırlayan, J = K = 1 iken durumunu değiştiren kenar tetiklemeli flip-flop; SR latch'in yasak durumu yoktur.", "u": "https://en.wikipedia.org/wiki/Flip-flop_(electronics)#JK_flip-flop", "only": ["sayac"]},
    {"k": ["sayaç", "sayac"], "t": "Sayaç", "d": "Gelen saat darbelerini sayan, flip-flop'lardan kurulu devre. n bitlik bir ikili sayaç 0'dan 2ⁿ − 1'e kadar sayar ve başa döner.", "u": "https://en.wikipedia.org/wiki/Counter_(digital)"},
    {"k": ["kaydırmalı yazmaç", "shift register"], "t": "Kaydırmalı yazmaç", "d": "Zincir gibi bağlı flip-flop'lardan oluşan yazmaç; her saat kenarında bitler bir basamak kayar. Seri veriyi paralele (ya da tersine) çevirir.", "u": "https://tr.wikipedia.org/wiki/Kaydırmalı_yazmaç"},
    {"k": ["halka sayac"], "t": "Halka sayacı", "d": "Son çıkışı ilk girişine bağlanmış kaydırmalı yazmaç. İçindeki tek 1 dönüp durur; n flip-flop n durum verir.", "u": "https://en.wikipedia.org/wiki/Ring_counter"},
    {"k": ["johnson sayac"], "t": "Johnson sayacı", "d": "Son çıkışın tersi ilk girişe bağlanmış kaydırmalı yazmaç. n flip-flop ile 2n durum verir; ara durumları tek bir kapıyla çözülebilir.", "u": "https://en.wikipedia.org/wiki/Johnson_counter"},
    {"k": ["74hc595"], "t": "74HC595", "d": "8 bitlik seri girişli, paralel çıkışlı kaydırmalı yazmaç entegresi; çıkışlarında ayrı bir mandal yazmacı vardır. Arduino ile 3 pinden çok sayıda LED sürmekte kullanılır.", "u": "https://en.wikipedia.org/wiki/Shift_register#Serial-in_parallel-out_(SIPO)"},
    {"k": ["spi"], "t": "SPI", "d": "Serial Peripheral Interface: saat, veri ve seçme hatlarıyla çalışan eşzamanlı seri iletişim arabirimi. İçinde bitleri dizen kaydırmalı yazmaçlar vardır.", "u": "https://en.wikipedia.org/wiki/Serial_Peripheral_Interface", "only": ["kaydirmali-yazmac"]},
    {"k": ["durum makinesi", "durum makinesin", "sonlu durum makinesi"], "t": "Durum makinesi (sonlu durum makinesi)", "d": "Belli sayıda durumdan birinde bulunan ve girişlere göre bir durumdan ötekine geçen sistem. Durum hafızada (flip-flop'larda), geçiş kuralları kapılarda tutulur.", "u": "https://tr.wikipedia.org/wiki/Sonlu_durum_makinesi"},
    {"k": ["durum diyagram"], "t": "Durum diyagramı", "d": "Durumları daireler, geçişleri oklarla gösteren çizim. Okların üzerine geçişin koşulu yazılır.", "u": "https://en.wikipedia.org/wiki/State_diagram"},
    {"k": ["durum tablo"], "t": "Durum tablosu", "d": "Her durum ve giriş için sonraki durumu ve çıkışları listeleyen tablo; durum makinesinin doğruluk tablosu.", "u": "https://en.wikipedia.org/wiki/State-transition_table"},
    {"k": ["moore makinesi"], "t": "Moore makinesi", "d": "Çıkışları yalnız o anki duruma bağlı olan durum makinesi. Çıkışlar girişlere de bağlıysa Mealy makinesi denir.", "u": "https://en.wikipedia.org/wiki/Moore_machine"},
    {"k": ["sr latch"], "t": "SR latch", "d": "İki NOR (ya da NAND) kapısının çapraz bağlanmasıyla yapılan bir bitlik hafıza. S (kur) çıkışı 1, R (sıfırla) 0 yapar; ikisi de 0 iken son durum korunur.", "u": "https://en.wikipedia.org/wiki/Flip-flop_(electronics)#SR_NOR_latch"},
    {"k": ["555", "555 zamanlayıcı"], "t": "555 zamanlayıcı", "d": "İki karşılaştırıcı, bir SR flip-flop ve deşarj transistörü içeren tümleşik devre. Birkaç direnç ve bir kondansatörle osilatör (astable) ya da tek darbe üreteci (monostable) olarak çalışır.", "u": "https://en.wikipedia.org/wiki/555_timer_IC"},
    {"k": ["astable", "multivibratör"], "t": "Astable multivibratör", "d": "Kararlı durumu olmayan, iki durum arasında kendiliğinden gidip gelen osilatör devresi; kare dalga üretir.", "u": "https://en.wikipedia.org/wiki/Multivibrator"},
    {"k": ["hans camenzind", "camenzind"], "t": "Hans Camenzind", "d": "İsviçre doğumlu Amerikalı elektronik mühendisi; 555 zamanlayıcıyı 1971'de Signetics için tasarladı.", "u": "https://en.wikipedia.org/wiki/Hans_Camenzind"},
    {"k": ["deşarj"], "t": "Deşarj (boşalma)", "d": "Kondansatörün biriktirdiği yükü bir direnç ya da anahtar üzerinden bırakması. 555'te 7. bacaktaki transistör kondansatörü RB üzerinden boşaltır.", "u": "https://tr.wikipedia.org/wiki/Kondansat%C3%B6r", "only": ["saat-555"]},
    {"k": ["trafik ışı", "trafik lamba"], "t": "Trafik ışıkları", "d": "Kavşaklarda araç ve yaya akışını sırayla düzenleyen ışıklı işaretler. Türkiye'de kırmızıyla birlikte yanan sarı, yolun açılmak üzere olduğunu bildirir.", "u": "https://tr.wikipedia.org/wiki/Trafik_%C4%B1%C5%9F%C4%B1klar%C4%B1"},
    {"k": ["program sayacı"], "t": "Program sayacı (PC)", "d": "Sıradaki komutun bellekteki adresini tutan yazmaç. Her komutta bir artar; atlama komutu onu yeniden yükler.", "u": "https://tr.wikipedia.org/wiki/Program_sayacı"},
    {"k": ["yazmaç"], "t": "Yazmaç (register)", "d": "İşlemcinin içinde birkaç bitlik veriyi tutan küçük, hızlı bellek; yan yana dizilmiş flip-flop'lardan oluşur.", "u": "https://tr.wikipedia.org/wiki/Yazmaç"},
    {"k": ["alu", "aritmetik mantık birimi"], "t": "ALU (aritmetik mantık birimi)", "d": "İşlemcide toplama, çıkarma ve mantık işlemlerini yapan devre. En basit hâli bir toplayıcıdır.", "u": "https://tr.wikipedia.org/wiki/Aritmetik_mantık_birimi"},
    {"k": ["veri yolu"], "t": "Veri yolu (bus)", "d": "Birçok bloğun paylaştığı ortak hat demeti. Her an yalnız bir blok yola yazar; diğerleri yüksek empedansta (Z) bekler.", "u": "https://tr.wikipedia.org/wiki/Veri_yolu"},
    {"k": ["von neumann"], "t": "Von Neumann mimarisi", "d": "Programın ve verinin aynı bellekte durduğu bilgisayar düzeni; bugünkü bilgisayarların çoğunun temeli.", "u": "https://tr.wikipedia.org/wiki/Von_Neumann_mimarisi"},
    {"k": ["getir–çöz–yürüt", "getirilir"], "t": "Getir–çöz–yürüt döngüsü", "d": "İşlemcinin her komutta tekrarladığı adımlar: komutu bellekten getir, ne olduğunu çöz, yürüt.", "u": "https://en.wikipedia.org/wiki/Instruction_cycle", "only": ["mini-bilgisayar"]},
    {"k": ["elde bayrağı"], "t": "Elde bayrağı (carry)", "d": "Toplamanın sonucu yazmaca sığmadığında 1 olan bit. Koşullu atlama komutları ona bakar.", "u": "https://en.wikipedia.org/wiki/Carry_flag"},
    {"k": ["yüksek empedans", "üç durumlu"], "t": "Üç durumlu çıkış (Z)", "d": "0 ve 1'in yanında üçüncü bir durum: çıkış hattan kopar. Ortak veri yolunda başka bir bloğa söz vermek için kullanılır.", "u": "https://en.wikipedia.org/wiki/Three-state_logic"},
    {"k": ["sap-1"], "t": "SAP-1", "d": "\"Olabildiğince basit\" (Simple-As-Possible) eğitim bilgisayarı; Malvino'nun ders kitabından, Ben Eater'ın breadboard bilgisayarına esin oldu.", "u": "https://en.wikipedia.org/wiki/Simple-As-Possible_computer"},
    {"k": ["ardışık düzen", "pipeline"], "t": "Ardışık düzen (pipeline)", "d": "Birkaç komutu aynı anda farklı aşamalarda işleyen işlemci tekniği; montaj hattı gibi.", "u": "https://en.wikipedia.org/wiki/Instruction_pipelining"},
    {"k": ["atmega328p", "atmega328"], "t": "ATmega328P", "d": "Arduino Uno'daki 8 bitlik mikrodenetleyici: 32 KB flaş, 2 KB RAM, 16 MHz.", "u": "https://en.wikipedia.org/wiki/ATmega328"},
    {"k": ["flaş bellek"], "t": "Flaş bellek", "d": "Elektrik kesilince de içeriğini koruyan, elektrikle silinip yazılabilen bellek. Mikrodenetleyicide program burada durur.", "u": "https://tr.wikipedia.org/wiki/Flaş_bellek"},
    {"k": ["derlenip", "derleyici"], "t": "Derleyici", "d": "C++ gibi bir dilde yazılmış programı işlemcinin anladığı makine koduna çeviren program.", "u": "https://tr.wikipedia.org/wiki/Derleyici"},
    {"k": ["çıkış katı", "gpio"], "t": "Çıkış katı (GPIO pini)", "d": "Mikrodenetleyici pinini 1'de beslemeye, 0'da toprağa bağlayan transistör çifti; bir CMOS eviricidir.", "u": "https://en.wikipedia.org/wiki/General-purpose_input/output"},
    {"k": ["lityum iyon", "li-ion"], "t": "Lityum iyon pil", "d": "Telefon, dizüstü ve 18650 hücrelerdeki şarj edilebilir pil türü. Enerji yoğundur ve iç direnci küçüktür.", "u": "https://tr.wikipedia.org/wiki/Lityum-iyon_pil"},
    {"k": ["termal kaçak"], "t": "Termal kaçak (pillerde)", "d": "Isınan pil hücresinde iç tepkimelerin kendi ısısını üretip hızlanması; yangın ve patlamaya yol açabilir.", "u": "https://en.wikipedia.org/wiki/Thermal_runaway"},
    {"k": ["kaçak akım rölesi"], "t": "Kaçak akım rölesi", "d": "Giden ve dönen akım arasındaki farkı (ör. 30 mA) algılayıp devreyi kesen koruma cihazı.", "u": "https://tr.wikipedia.org/wiki/Kaçak_akım_rölesi"},
    {"k": ["ventriküler fibrilasyon", "kalbin ritmi", "kalp ritmi"], "t": "Ventriküler fibrilasyon", "d": "Kalp karıncıklarının düzensiz titreşmesi; kan pompalanamaz. Göğüsten geçen birkaç on miliamperlik AC akım tetikleyebilir.", "u": "https://tr.wikipedia.org/wiki/Ventriküler_fibrilasyon"},
    {"k": ["elektrik çarpması"], "t": "Elektrik çarpması", "d": "Vücuttan akım geçmesi. Tehlikeyi gerilim değil, geçen akım ve yolu belirler; ama akımı gerilim sürer.", "u": "https://tr.wikipedia.org/wiki/Elektrik_çarpması"},
    {"k": ["fibonacci"], "t": "Fibonacci dizisi", "d": "Her terimi önceki iki terimin toplamı olan dizi: 1, 1, 2, 3, 5, 8, 13…", "u": "https://tr.wikipedia.org/wiki/Fibonacci_dizisi"},
    {"k": ["gerilim", "voltaj"], "t": "Gerilim (V)", "d": "İki nokta arasındaki elektriksel potansiyel farkı; yükleri iten \"basınç\". Birimi volt (V): bir coulomb yük başına bir joule enerji.", "u": "https://tr.wikipedia.org/wiki/Gerilim_(elektrik)"},
    {"k": ["akım", "akımı"], "t": "Akım (I)", "d": "Bir noktadan birim zamanda geçen elektrik yükü. Birimi amper (A): saniyede bir coulomb.", "u": "https://tr.wikipedia.org/wiki/Elektrik_ak%C4%B1m%C4%B1"},
    {"k": ["direnç", "direnci"], "t": "Direnç (R)", "d": "Bir malzemenin ya da bileşenin akıma karşı koyma derecesi. Birimi ohm (Ω). Aynı gerilimde direnç büyüdükçe akım küçülür.", "u": "https://tr.wikipedia.org/wiki/Diren%C3%A7_(elektrik)"},
    {"k": ["ohm kanunu"], "t": "Ohm kanunu", "d": "Bir iletkendeki gerilim, akımla doğru orantılıdır: V = I · R. Georg Simon Ohm 1827'de yayımladı.", "u": "https://tr.wikipedia.org/wiki/Ohm_kanunu"},
    {"k": ["georg simon ohm"], "t": "Georg Simon Ohm", "d": "Alman fizikçi (1789–1854). Gerilim, akım ve direnç arasındaki ilişkiyi deneylerle ortaya koydu; direncin birimi onun adını taşır.", "u": "https://tr.wikipedia.org/wiki/Georg_Simon_Ohm"},
    {"k": ["ampermetre"], "t": "Ampermetre", "d": "Akım ölçen alet. Akımın tamamı içinden geçsin diye devreye seri bağlanır; iç direnci çok küçüktür.", "u": "https://tr.wikipedia.org/wiki/Ampermetre"},
    {"k": ["miliamper"], "t": "Miliamper (mA)", "d": "Amperin binde biri. Bir LED tipik olarak 5–20 mA akımla çalışır.", "u": "https://tr.wikipedia.org/wiki/Amper"},
    {"k": ["kiloohm"], "t": "Kiloohm (kΩ)", "d": "Bin ohm. Elektronikteki dirençlerin çoğu ohm ile megaohm arasındadır.", "u": "https://tr.wikipedia.org/wiki/Ohm"},
    {"k": ["yarı iletken"], "t": "Yarı iletken", "d": "İletkenliği iletkenlerle yalıtkanlar arasında olan, katkılanarak ve sıcaklıkla değiştirilebilen malzeme. En yaygını silisyum.", "u": "https://tr.wikipedia.org/wiki/Yar%C4%B1_iletken"},
    {"k": ["mantık kapı"], "t": "Mantık kapısı", "d": "Bir ya da daha fazla ikili girişten (0/1) tek bir ikili çıkış üreten devre: AND, OR, NOT, NAND, NOR, XOR, XNOR.", "u": "https://tr.wikipedia.org/wiki/Mant%C4%B1k_kap%C4%B1s%C4%B1"},
    /*TERİMLER:SON*/
  ];

  // her kök için: kelime başında başlayan, ardından Türkçe ekler gelebilen düzenli ifade
  const L_ = "a-zçğıöşüâîûA-ZÇĞİÖŞÜÂÎÛ";
  // karşılaştırma için: Türkçe küçük harf + ı/i ayrımını kaldır (MYCIN → mycin, ama uzunluk değişmez)
  const lower = (s) => s.toLocaleLowerCase("tr").replace(/ı/g, "i");
  TERMS.forEach((term) => {
    term.re = term.k.map((k) => new RegExp(`(^|[^${L_}])(${lower(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[${L_}'’]*)`));
  });
  const SKIP = "h1, h2, h3, .chapter-tag, .num, .mono, .formula, summary, a, .term, .try, button, .license, .cover-meta, .no-gloss";

  function markSlide(root) {
    const sid = root.closest(".slide").id;
    // yalnızca belirli slaytlarda anlamlı olan terimleri (ör. "sıcaklık") diğerlerinde atla
    const done = new Set(TERMS.map((t, i) => (t.only && !t.only.includes(sid) ? i : -1)).filter((i) => i >= 0));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest(SKIP) || !n.nodeValue.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      let text = node.nodeValue;
      let parts = null;
      // düğümde geçen ilk uygun terimi bul, böl, tekrarla
      for (;;) {
        let best = null;
        const low = lower(text);
        TERMS.forEach((term, ti) => {
          if (done.has(ti)) return;
          term.re.forEach((re) => {
            const m = re.exec(low);
            if (m && (!best || m.index + m[1].length < best.i)) best = { i: m.index + m[1].length, len: m[2].length, ti };
          });
        });
        if (!best) break;
        done.add(best.ti);
        parts = parts || [];
        parts.push(text.slice(0, best.i));
        const span = document.createElement("span");
        span.className = "term"; span.tabIndex = 0; span.dataset.ti = best.ti;
        span.textContent = text.slice(best.i, best.i + best.len);
        parts.push(span);
        text = text.slice(best.i + best.len);
      }
      if (parts) { parts.push(text); node.replaceWith(...parts); }
    });
  }
  document.querySelectorAll(".slide .text, .slide .cover-text").forEach(markSlide);

  /* --- balon --- */
  const pop = document.createElement("div");
  pop.id = "gloss"; pop.setAttribute("role", "tooltip");
  document.body.append(pop);
  let cur = null, hideT = 0;
  function show(el) {
    clearTimeout(hideT);
    if (cur === el && pop.classList.contains("open")) return;
    cur = el;
    const t = TERMS[+el.dataset.ti];
    pop.innerHTML = "";
    const h4 = document.createElement("h4"); h4.textContent = t.t;
    const p = document.createElement("p"); p.textContent = t.d;
    const a = document.createElement("a");
    a.href = t.u; a.target = "_blank"; a.rel = "noopener";
    a.textContent = t.u.includes("tr.wikipedia") ? STR.gloss.trWiki : STR.gloss.enWiki;
    pop.append(h4, p, a);
    pop.classList.add("open");
    const r = el.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = Math.min(Math.max(12, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 12);
    let y = r.top - ph - 10;
    pop.classList.toggle("below", y < 8);
    if (y < 8) y = r.bottom + 10;
    pop.style.left = x + "px"; pop.style.top = y + "px";
  }
  function hide(delay = 180) {
    clearTimeout(hideT);
    hideT = setTimeout(() => { pop.classList.remove("open"); cur = null; }, delay);
  }
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest && e.target.closest(".term");
    if (el) show(el);
    else if (e.target.closest && e.target.closest("#gloss")) clearTimeout(hideT);
    else if (cur) hide();
  });
  document.addEventListener("focusin", (e) => { if (e.target.classList && e.target.classList.contains("term")) show(e.target); });
  document.addEventListener("focusout", (e) => { if (e.target.classList && e.target.classList.contains("term")) hide(250); });
  // dokunmatik: dokununca aç/kapa
  document.addEventListener("click", (e) => {
    const el = e.target.closest(".term");
    if (el) { e.preventDefault(); cur === el && pop.classList.contains("open") ? hide(0) : show(el); }
    else if (!e.target.closest("#gloss")) hide(0);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(0); });
  document.getElementById("deck").addEventListener("scroll", () => hide(0), true);
})();
