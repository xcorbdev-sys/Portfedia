# Portfedia

> **Portfolyo + Ansiklopedi.** İnsanların ve şirketlerin kendilerini Wikipedia sadeliğinde, birbirine bağlı sayfalarla anlattığı açık bir "kariyer ansiklopedisi".

Bu doküman projenin ne olduğunu, neden var olduğunu, nasıl görüneceğini ve nasıl inşa edileceğini anlatır. Baştan sona okunacak şekilde yazıldı; en sonda kararlaştırılması gereken açık sorular var.

---

## İçindekiler

1. [Tek cümlede](#1-tek-cümlede)
2. [Problem ve fırsat](#2-problem-ve-fırsat)
3. [Kimler için?](#3-kimler-için)
4. [Temel fikir: Wikipedia'dan ne alıyoruz, neyi değiştiriyoruz?](#4-temel-fikir-wikipediadan-ne-alıyoruz-neyi-değiştiriyoruz)
5. [Sayfa türleri](#5-sayfa-türleri)
6. [Sayfa anatomisi (tasarım)](#6-sayfa-anatomisi-tasarım)
7. [Bilgi kutusu (sol panel) alanları](#7-bilgi-kutusu-sol-panel-alanları)
8. [Bağlantı sistemi: platformu ansiklopedi yapan şey](#8-bağlantı-sistemi-platformu-ansiklopedi-yapan-şey)
9. [Düzenleme ve sahiplik modeli](#9-düzenleme-ve-sahiplik-modeli)
10. [Güven ve doğrulama](#10-güven-ve-doğrulama)
11. [Kullanıcı akışları](#11-kullanıcı-akışları)
12. [URL yapısı](#12-url-yapısı)
13. [Veri modeli](#13-veri-modeli)
14. [Teknik mimari](#14-teknik-mimari)
15. [Gizlilik, KVKK ve moderasyon](#15-gizlilik-kvkk-ve-moderasyon)
16. [Yol haritası](#16-yol-haritası)
17. [Gelir modeli](#17-gelir-modeli)
18. [Başarı metrikleri](#18-başarı-metrikleri)
19. [Riskler](#19-riskler)
20. [Açık sorular](#20-açık-sorular)
21. [Sözlük](#21-sözlük)

---

## 1. Tek cümlede

**Portfedia, herkesin kendi özgeçmişini/portfolyosunu Wikipedia makalesi formatında yayınladığı; kişilerin, şirketlerin, okulların ve projelerin birbirine bağlantılarla örüldüğü bir platformdur.**

İsim: **Portf**olio + Encyclop**edia** → **Portfedia**.

---

## 2. Problem ve fırsat

| Bugünkü durum | Sorun |
|---|---|
| **LinkedIn** | Sosyal medyaya dönüştü: akış, reklam, gürültü. Profil ikinci planda. Format katı, okuması yorucu. |
| **Kişisel site / portfolyo** | Herkes kuramaz, bakımı zor, bulunması zor, her biri farklı formatta. |
| **PDF CV** | Statik, bağlantısız, aranamaz, sürekli eskir. |
| **Wikipedia** | En okunur format ama sadece "kayda değer" kişilere açık ve insanın **kendi sayfasını yazması yasak** (çıkar çatışması kuralı). |

**Fırsat:** İnsanlar Wikipedia formatına alışkın ve ona güveniyor: sade, okunaklı, kaynaklı, bağlantılı. Bu formatı **sıradan profesyonellere** açan, kişinin kendi sayfasını yazmasına izin veren ama güveni **doğrulama** ile sağlayan bir platform yok.

**Portfedia'nın vaadi:**
- **Okuyan için:** Bir kişiyi ya da şirketi 30 saniyede anlamak. Reklamsız, akışsız, sadece bilgi.
- **Yazan için:** Teknik bilgi gerekmeden, kalıcı, aranabilir, şık bir "resmi sayfa".
- **Şirket için:** Kendi sayfası + "burada çalışmış kişiler" listesinin otomatik oluşması.

---

## 3. Kimler için?

| Persona | İhtiyacı | Portfedia'da ne yapar? |
|---|---|---|
| **Profesyonel** (yazılımcı, tasarımcı, avukat, doktor…) | Kendini düzgün anlatan, paylaşılabilir tek bir link | Kendi kişi sayfasını oluşturur, deneyimlerini şirket sayfalarına bağlar |
| **Freelancer / sanatçı** | Portfolyo vitrini | Projeler ve işler bölümünü öne çıkarır |
| **Öğrenci / yeni mezun** | İlk izlenim | Okul, proje ve staj sayfalarına bağlanır |
| **Şirket / kurum** | Kurumsal kimlik + yetenek görünürlüğü | Şirket sayfasını sahiplenir, çalışanların deneyimlerini onaylar |
| **İşe alımcı / ziyaretçi** | Hızlı ve güvenilir bilgi | Arar, okur, bağlantılar arasında gezinir |

---

## 4. Temel fikir: Wikipedia'dan ne alıyoruz, neyi değiştiriyoruz?

### Aldıklarımız ✅
- **Görsel dil:** Beyaz zemin, serif başlıklar, mavi linkler, bol boşluk, makale formatı, içindekiler kutusu.
- **Bilgi kutusu (infobox):** Kişinin/şirketin özet bilgileri tek bakışta.
- **İç bağlantılar:** `[[Şirket Adı]]` yazınca o şirketin sayfasına link.
- **Kırmızı link:** Henüz var olmayan sayfaya verilen link kırmızı görünür ve "oluştur" daveti olur. Platform kendiliğinden büyür.
- **"Bu sayfaya bağlantılar":** Bir şirket sayfası, ona bağlanan tüm kişileri bilir.
- **Revizyon geçmişi:** Her değişiklik kaydedilir, iki sürüm karşılaştırılabilir.
- **Kategoriler:** "İstanbul'daki yazılım şirketleri", "Boğaziçi Üniversitesi mezunları" gibi.
- **Anlam ayrımı sayfaları:** Aynı isimde iki kişi → "Ahmet Yılmaz (yazılımcı)", "Ahmet Yılmaz (mimar)".

### Değiştirdiklerimiz 🔄
| Wikipedia | Portfedia | Neden |
|---|---|---|
| Herkes her sayfayı düzenler | **Kişi sayfasını yalnızca sahibi düzenler**, başkaları *öneri* gönderir | Portfolyo kişinin kendi beyanıdır |
| Kendi sayfanı yazamazsın | **Kendi sayfanı sen yazarsın** | Platformun varlık sebebi |
| Güven = kaynak + topluluk denetimi | Güven = **çapraz doğrulama** (şirket onayı, okul onayı, e-posta/alan adı doğrulaması) | Kişi kendini yazdığı için güveni başka yoldan kurmalıyız |
| Kayda değerlik şartı | Herkes sayfa açabilir | Sıradan profesyoneller hedef kitle |
| Bilgi kutusu **sağda** | Bilgi kutusu **solda** (fotoğraf/logo en üstte) | Portfolyoda "kim" sorusu ilk okunmalı; bilinçli bir fark |
| Wikitext sözdizimi | **Markdown + `[[ ]]` linkler**, görsel editör | Öğrenme eşiği düşük olmalı |

> ⚠️ **Not:** Wikipedia'nın "hissini" alıyoruz, kimliğini değil. Wikipedia logosu, adı, yapboz küre vb. **kullanılmaz**; Portfedia'nın kendi logosu ve renk kimliği olur.

---

## 5. Sayfa türleri

Wikipedia'daki "ad alanı" (namespace) mantığıyla her sayfanın bir türü vardır. Tür; bilgi kutusunun alanlarını, URL'yi ve kimin düzenleyebileceğini belirler.

| Tür | Örnek | Kim oluşturur? | Kim düzenler? |
|---|---|---|---|
| **Kişi** | Ayşe Demir | Kişinin kendisi | Yalnızca sahibi (diğerleri öneri gönderir) |
| **Kuruluş** (şirket, STK, kamu kurumu) | Acme Yazılım A.Ş. | Herkes (taslak olarak) | Sahiplenilene kadar topluluk + moderatör; sonra kuruluş yöneticileri |
| **Okul** | ODTÜ | Herkes (taslak) | Kuruluş ile aynı kural |
| **Proje** *(Faz 2)* | "Açık Kaynak Harita Uygulaması" | Herhangi bir katkıcı | Proje sahipleri |
| **Kategori** | Kategori:Ankara'daki şirketler | Sistem + moderatör | Moderatör |
| **Anlam ayrımı** | Ahmet Yılmaz | Sistem (otomatik) | Sistem |

**MVP'de sadece Kişi + Kuruluş + Okul vardır.** (Okul teknik olarak "kuruluş"un alt tipidir.)

---

## 6. Sayfa anatomisi (tasarım)

### 6.1 Masaüstü — Kişi sayfası

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◧ Portfedia         [ Portfedia'da ara...                          🔍 ]  Giriş │
├──────────────────────────────────────────────────────────────────────────────┤
│  Kişi    Geçmiş    Öneriler (2)                         Oku   Düzenle  ⋯     │
├────────────────────────┬─────────────────────────────────────────────────────┤
│ ┌────────────────────┐ │  Ayşe Demir                                         │
│ │                    │ │  ─────────────────────────────────────────────────  │
│ │      [ FOTO ]      │ │  Portfedia, özgür portfolyo ansiklopedisi           │
│ │                    │ │                                                     │
│ └────────────────────┘ │  Ayşe Demir (d. 1992, İzmir), Türk yazılım          │
│      Ayşe Demir        │  mühendisi. 2019'dan bu yana [[Acme Yazılım]]'da    │
│   Yazılım Mühendisi    │  kıdemli backend geliştirici olarak çalışmaktadır.  │
│ ────────────────────── │  Daha önce [[Örnek Bank]] dijital dönüşüm          │
│ Doğum     1992, İzmir  │  ekibinde yer almıştır.                             │
│ Konum     İstanbul     │                                                     │
│ Meslek    Yazılım Müh. │  ┌ İçindekiler ─────────┐                           │
│ Şu an     Acme Yazılım✓│  │ 1 Kariyer             │                           │
│ Eğitim    ODTÜ ✓       │  │ 2 Eğitim              │                           │
│           Bilg. Müh.   │  │ 3 Projeler            │                           │
│ Diller    TR, EN, DE   │  │ 4 Ödüller             │                           │
│ ────────────────────── │  │ 5 Kaynaklar           │                           │
│ Web       aysedemir.dev│  └───────────────────────┘                           │
│ GitHub    @aysedemir   │                                                     │
│ E-posta   [Göster]     │  Kariyer                                            │
│ ────────────────────── │  ─────────────────────────────────────────────────  │
│ ✓ Kimlik doğrulandı    │  Acme Yazılım (2019 – günümüz) ✓                    │
│ ✓ 2/3 deneyim onaylı   │  Ödeme altyapısının mikroservis mimarisine ...     │
│                        │                                                     │
│ [⤓ PDF CV olarak indir]│  Örnek Bank (2016 – 2019)                           │
│                        │  ...                                                │
├────────────────────────┴─────────────────────────────────────────────────────┤
│ Kategoriler: Yazılım mühendisleri · İzmir doğumlular · ODTÜ mezunları        │
│ Bu sayfa en son 12 Ekim 2026'da düzenlendi.                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Sol sütun (bilgi kutusu):** ~280px sabit genişlik, sayfa kaydırılırken üst kısmı yapışkan (sticky) kalabilir.
**Sağ sütun (makale):** Okunabilirlik için en fazla ~75 karakter satır genişliği.
**✓ işareti:** O bilginin karşı tarafça (şirket/okul) onaylandığını gösterir.

### 6.2 Kuruluş sayfası farkları

- Sol üstte **fotoğraf yerine logo**.
- Bilgi kutusunda: kuruluş yılı, merkez, sektör, çalışan sayısı, web sitesi, vergi/sicil bilgisi (opsiyonel).
- Makalenin sonunda **otomatik oluşan** bölümler:
  - **"Burada çalışan kişiler"** (şu an) ve **"Burada çalışmış kişiler"** (geçmiş). Kişilerin kariyer kayıtlarından otomatik üretilir.
  - **"Bu sayfaya bağlantılar"**.

### 6.3 Mobil

Sol sütun **makalenin üstüne** iner; bilgi kutusu varsayılan olarak kısa gösterilir (foto + isim + unvan + 3 satır), "Tümünü göster" ile açılır. İçindekiler açılır menü olur.

### 6.4 Görsel dil (tasarım belirteçleri)

| Öğe | Değer |
|---|---|
| Arka plan | `#FFFFFF` (koyu mod: `#101418`) |
| Metin | `#202122` |
| Link | `#3366CC` |
| Kırmızı link (olmayan sayfa) | `#D73333` |
| Ziyaret edilmiş link | `#795CB2` |
| Kenarlıklar | `#A2A9B1` |
| Bilgi kutusu zemini | `#F8F9FA` |
| Başlık fontu | Serif (ör. *Source Serif*, *Libre Caslon*) |
| Gövde fontu | Sans-serif (ör. *Inter*, sistem fontu) |
| Doğrulama rengi | Yeşil `#14866D` |

Animasyon yok denecek kadar az. Gölge yok. Yuvarlatılmış köşe minimum. **Sade = güvenilir.**

---

## 7. Bilgi kutusu (sol panel) alanları

Bilgi kutusu **yapılandırılmış veridir**, serbest metin değildir. Bu sayede aranabilir, filtrelenebilir ve sayfalar arasında bağlantı kurulabilir.

### 7.1 Kişi

| Grup | Alanlar | Zorunlu? |
|---|---|---|
| Kimlik | Fotoğraf, ad soyad, kısa unvan ("Yazılım Mühendisi") | Ad + unvan zorunlu |
| Kişisel | Doğum yılı/yeri, konum, uyruk | Hayır (her biri ayrı ayrı gizlenebilir) |
| Mesleki | Meslek, şu anki kuruluş (→ link), uzmanlık alanları | Meslek zorunlu |
| Eğitim | Okul (→ link), bölüm, derece, yıl | Hayır |
| Beceriler | Diller, teknik beceriler (etiket) | Hayır |
| İletişim | Web, e-posta (bot korumalı "Göster"), sosyal hesaplar | Hayır |
| Güven | Doğrulama rozetleri (sistem doldurur) | Sistem |

### 7.2 Kuruluş

| Grup | Alanlar |
|---|---|
| Kimlik | Logo, resmi unvan, kısa ad, tür (A.Ş., Ltd., STK, kamu, üniversite…) |
| Temel | Kuruluş yılı, kurucular (→ kişi linkleri), merkez, sektör |
| Ölçek | Çalışan sayısı aralığı, şube/ofisler |
| İlişkiler | Ana şirket / bağlı şirketler (→ link) |
| İletişim | Web sitesi, sosyal hesaplar |
| Güven | "Alan adı doğrulandı", "Sahiplenildi" rozetleri |

---

## 8. Bağlantı sistemi: platformu ansiklopedi yapan şey

Portfedia'yı "bir CV sitesi" olmaktan çıkarıp "ansiklopedi" yapan şey bağlantılardır. **Bu, ürünün kalbi.**

### 8.1 İki tür bağlantı

1. **Yapısal bağlantılar (deneyimler):** Kişi kariyerine "Acme Yazılım, Kıdemli Geliştirici, 2019 – günümüz" eklediğinde bu bir **veri kaydıdır**. Hem kişi sayfasında hem şirket sayfasında görünür, şirket tarafından onaylanabilir.
2. **Metin içi bağlantılar:** Makale metninde `[[Acme Yazılım]]` veya `[[Acme Yazılım|Acme]]` yazılır. Düz link olarak çalışır, "bu sayfaya bağlantılar" listesine girer.

### 8.2 Kırmızı link döngüsü (büyüme motoru)

```
Ayşe kariyerine "Yeni Girişim Ltd." yazar
        │
        ▼
Böyle bir sayfa yok → link KIRMIZI görünür
        │
        ▼
Sistem otomatik bir "taslak" kuruluş sayfası açar (sadece ad)
        │
        ▼
Başka çalışanlar da aynı şirketi ekler → taslak zenginleşir
        │
        ▼
Şirket yetkilisi sayfayı fark eder, alan adıyla sahiplenir
        │
        ▼
Çalışanların deneyimlerini toplu onaylar → herkes ✓ alır
```

Her yeni kullanıcı, platforma birkaç yeni bağlantı ve bazen yeni sayfalar getirir. Bu, Wikipedia'nın büyüme mekanizmasının portfolyo versiyonudur.

### 8.3 Aynı şirketi doğru eşleştirmek

"Acme", "Acme Yazılım", "ACME Yazılım A.Ş." aynı şirkettir. Çözüm:
- Kariyer eklerken **otomatik tamamlama** ile mevcut sayfayı seçtirmek (serbest yazıyı ikinci seçenek yapmak).
- Kuruluş sayfasında **yönlendirme** (redirect) desteği: "Acme" → "Acme Yazılım A.Ş.".
- Moderatörlerin iki sayfayı **birleştirebilmesi** (bağlantılar otomatik taşınır).

---

## 9. Düzenleme ve sahiplik modeli

### 9.1 Roller

| Rol | Yetkiler |
|---|---|
| **Ziyaretçi** | Okur, arar. Hesap gerekmez. |
| **Üye** | Kendi kişi sayfasını oluşturur. Başka sayfalara düzenleme önerisi gönderir. Taslak kuruluş sayfası açar. |
| **Sayfa sahibi** | Kendi sayfasını doğrudan düzenler, gelen önerileri kabul/ret eder. |
| **Kuruluş yöneticisi** | Sahiplenilmiş kuruluş sayfasını düzenler, çalışan deneyimlerini onaylar/reddeder. |
| **Moderatör** | Şikâyetleri inceler, sayfa birleştirir, gizler, kullanıcı engeller. |
| **Yönetici** | Her şey. |

### 9.2 Düzenleme önerileri ("Öneriler" sekmesi)

Wikipedia'da herkes doğrudan düzenler; burada kişi sayfası kişiye aittir. Ama başkalarının katkısı değerlidir (ör. eski bir iş arkadaşı bir projeyi hatırlatır). Bu yüzden **GitHub'daki Pull Request mantığı**:

1. Ziyaretçi/üye "Düzenleme öner" der, değişikliği yapar, açıklama yazar.
2. Sayfa sahibine bildirim gider.
3. Sahip farkı (diff) görür → **kabul et / reddet / yorum yaz**.
4. Kabul edilirse yeni bir revizyon olarak kaydedilir, katkı sahibinin adı geçmişte görünür.

### 9.3 Editör

- **Varsayılan:** Görsel editör (blok tabanlı, Notion benzeri ama sade). `[[` yazınca sayfa önerisi açılır.
- **Gelişmiş:** Markdown kaynak görünümü.
- İçerik veritabanında **Markdown** olarak saklanır (taşınabilir, diff'i kolay, sade).
- Bilgi kutusu ayrı bir **form** ile düzenlenir (serbest metin değil).

### 9.4 Revizyon geçmişi

- Her kayıt yeni bir **revizyon** oluşturur (eski sürümler silinmez).
- "Geçmiş" sekmesinde: tarih, düzenleyen, özet, boyut değişimi.
- İki revizyon yan yana karşılaştırılabilir (diff).
- Sahip eski bir sürüme geri dönebilir.
- **İstisna:** Kişi bir bilgiyi *gizlilik* sebebiyle sildiğinde eski revizyonlar da herkese kapanır (bkz. §15).

---

## 10. Güven ve doğrulama

Kişi kendini yazdığına göre "bu bilgiler doğru mu?" sorusunu cevaplamak zorundayız. Cevap: **katmanlı doğrulama**. Hiçbiri zorunlu değil ama her biri sayfada görünür.

| Seviye | Ne doğrulanır? | Nasıl? | Rozet |
|---|---|---|---|
| 1 | Hesap gerçek bir insana ait | E-posta + telefon | — |
| 2 | Kişi gerçekten bu kişi | e-Devlet / kimlik doğrulama servisi *(Faz 3)* | ✓ Kimlik doğrulandı |
| 3 | Deneyim gerçek | **Kuruluş onayı** (kuruluş yöneticisi onaylar) **veya** kuruluş alan adlı e-posta (`ayse@acme.com`) | ✓ (deneyimin yanında) |
| 4 | Eğitim gerçek | Okul onayı veya `.edu.tr` e-posta veya diploma belgesi + moderatör | ✓ (eğitimin yanında) |
| 5 | Kuruluş sayfası gerçekten o kuruluşa ait | Alan adı doğrulaması (DNS TXT kaydı veya `@acme.com` e-posta) | ✓ Sahiplenildi |

**Altın kural:** Onaylanmamış bilgi **gizlenmez, sadece işaretsiz görünür.** Okuyucu neyin onaylı neyin beyan olduğunu her zaman ayırt edebilir.

**Kaynak gösterme (Wikipedia'dan):** Kişi ödül, yayın, haber gibi iddialar için kaynak linki ekleyebilir; sayfa sonunda "Kaynaklar" bölümünde `[1]`, `[2]` dipnotları olarak listelenir.

---

## 11. Kullanıcı akışları

### 11.1 Yeni kullanıcı → yayınlanmış sayfa (en kritik akış)

```
Ana sayfa → "Sayfanı oluştur"
   → Kayıt (e-posta / Google / GitHub)
   → "Nasıl başlamak istersin?"
        ├─ [CV yükle (PDF)]           → otomatik ayrıştır → kontrol et
        ├─ [LinkedIn verini içe aktar] → otomatik doldur → kontrol et
        └─ [Sıfırdan başla]           → adım adım sihirbaz
   → Sihirbaz: Kimlik → Kariyer → Eğitim → Kısa özet
   → Önizleme (gerçek Wikipedia-benzeri görünüm)
   → Yayınla  🎉  →  portfedia.com/ayse-demir
```

**Hedef:** İlk yayın **5 dakikanın altında**. Boş sayfa korkusunu CV içe aktarma ile yeneriz.

### 11.2 Ziyaretçi

```
Google'da "Ayşe Demir yazılım" → Portfedia sayfası
   → okur → "Acme Yazılım" linkine tıklar
   → şirket sayfası → "Burada çalışan kişiler"
   → başka bir kişiye geçer … (Wikipedia tavşan deliği 🐇)
```

### 11.3 Kuruluş sahiplenme

```
Kuruluş sayfası → "Bu kuruluşu temsil ediyor musun? Sahiplen"
   → İş e-postası (@acme.com) ile doğrulama  veya  DNS TXT kaydı
   → Yönetici paneli: logo, bilgiler, açıklama
   → "Onay bekleyen 14 deneyim" → toplu onay / tek tek ret
```

### 11.4 Ana sayfa (Wikipedia'nın ana sayfası gibi)

- Büyük arama kutusu.
- **"Günün portfolyosu"** (seçilmiş kaliteli bir kişi sayfası).
- **"Yeni eklenen kuruluşlar"**.
- **"Biliyor muydunuz?"** (platformdan ilginç bağlantılar: "…Acme Yazılım'ın 3 kurucusunun da ODTÜ mezunu olduğunu?").
- **Rastgele sayfa** butonu.
- Toplam istatistikler: "48.210 kişi · 6.032 kuruluş".

---

## 12. URL yapısı

Temiz, okunabilir, kalıcı URL'ler SEO için kritik.

| Sayfa | URL |
|---|---|
| Kişi | `portfedia.com/ayse-demir` |
| Aynı isimde ikinci kişi | `portfedia.com/ayse-demir-yazilimci` (anlam ayrımı) |
| Anlam ayrımı | `portfedia.com/ayse-demir` → liste (ilk sahibin sayfası taşınır) |
| Kuruluş | `portfedia.com/k/acme-yazilim` |
| Okul | `portfedia.com/k/odtu` |
| Kategori | `portfedia.com/kategori/yazilim-muhendisleri` |
| Geçmiş | `portfedia.com/ayse-demir/gecmis` |
| Diff | `portfedia.com/ayse-demir/gecmis/1042...1057` |
| Belirli sürüm | `portfedia.com/ayse-demir?rev=1042` |

**Kurallar:**
- Kişi URL'si değişirse eskisi **kalıcı yönlendirme (301)** yapar; dışarıda paylaşılmış linkler asla kırılmaz.
- Türkçe karakterler URL'de sadeleştirilir (`ş→s`, `ı→i`), sayfa başlığında korunur.

---

## 13. Veri modeli

İlk sürüm için yeterli, sade bir ilişkisel model:

```
users               Hesaplar
  id, email, password_hash / oauth, created_at, role

pages               Her sayfa (kişi, kuruluş, okul, kategori…)
  id, type (person|org|school|category|disambiguation),
  slug, title, owner_user_id (nullable),
  status (draft|published|claimed|hidden),
  current_revision_id, redirect_to_page_id (nullable),
  created_at, updated_at

revisions           Sayfa içeriğinin her sürümü (değişmez, sadece eklenir)
  id, page_id, author_user_id, parent_revision_id,
  body_markdown, infobox_json, edit_summary, created_at

experiences         Kariyer kayıtları (yapısal bağlantı)
  id, person_page_id, org_page_id, title, employment_type,
  start_date, end_date (nullable = günümüz), description,
  verification_status (unverified|pending|verified|rejected),
  verified_by_user_id, verified_at

educations          Eğitim kayıtları (aynı mantık, school_page_id ile)

links               Metin içi bağlantılar (kaydederken yeniden hesaplanır)
  from_page_id, to_page_id (nullable), to_title
  -- to_page_id NULL ise → kırmızı link

org_admins          Kuruluş yöneticileri
  org_page_id, user_id, role, verified_via (email|dns)

edit_suggestions    Düzenleme önerileri
  id, page_id, author_user_id, base_revision_id,
  proposed_body, proposed_infobox, message,
  status (open|accepted|rejected), decided_at

categories, page_categories
media               Fotoğraf ve logolar (depolama anahtarı, boyutlar)
reports             Şikâyetler (sayfa, sebep, durum, moderatör notu)
notifications
```

**Önemli tasarım kararları:**
- **Revizyonlar değişmez (append-only).** Geçmiş, diff ve geri alma bedava gelir.
- **Deneyimler metinden ayrı, yapısal tablodadır.** Bu sayede şirket sayfası "burada çalışanlar" listesini sorguyla üretebilir ve onay mekanizması mümkün olur.
- **Kırmızı linkler `to_title` ile saklanır.** O isimde sayfa oluşturulduğu an tüm kırmızı linkler maviye döner.

---

## 14. Teknik mimari

### 14.1 Önerilen yığın

| Katman | Seçim | Neden |
|---|---|---|
| Ön yüz + sunucu | **Next.js (App Router) + TypeScript** | Sunucu tarafı render → SEO. Profil sayfaları Google'da bulunmalı; bu ürün için hayati. |
| Stil | **Tailwind CSS** + kendi tasarım belirteçleri | Wikipedia sadeliğini tutarlı uygulamak kolay |
| Veritabanı | **PostgreSQL** | İlişkisel veri, JSONB (infobox), tam metin arama |
| ORM | **Drizzle** veya **Prisma** | Tip güvenliği |
| Kimlik doğrulama | **Auth.js** (e-posta, Google, GitHub, LinkedIn) | Hazır, güvenli |
| Arama | Başta **PostgreSQL FTS + pg_trgm**; ölçek gelince **Meilisearch** | Türkçe, yazım hatası toleransı, otomatik tamamlama |
| Dosya depolama | **S3 uyumlu** (Cloudflare R2) + görsel CDN | Foto/logo, ucuz çıkış trafiği |
| Markdown | **remark/rehype** + özel `[[link]]` eklentisi | Güvenli HTML üretimi (XSS temizliği şart) |
| Diff | **jsdiff** | Revizyon karşılaştırma |
| PDF CV | Sunucuda başsız tarayıcı (Playwright) ile sayfanın yazdırma görünümü | Tek tasarım, iki çıktı |
| CV ayrıştırma | Bir LLM API'si (PDF → yapılandırılmış JSON) | Onboarding'in en kritik hızlandırıcısı |
| Barındırma | Vercel / Fly.io + yönetilen Postgres (Neon / Supabase) | Hızlı başlangıç, düşük operasyon yükü |

### 14.2 Performans ve SEO

- Kişi/kuruluş sayfaları **statik üretilir ve önbelleklenir** (ISR); düzenleme olunca yeniden üretilir. Okuma, yazmadan yüzlerce kat fazla olacak.
- Her sayfada `schema.org/Person` ve `schema.org/Organization` yapılandırılmış verisi (Google bilgi panelleri için).
- `sitemap.xml`, kanonik URL'ler, Open Graph görselleri (paylaşınca şık önizleme kartı).
- Hedef: sayfa yüklemesi < 1 sn, JavaScript minimum (okuma sayfası neredeyse saf HTML).

### 14.3 Klasör yapısı (öneri)

```
portfedia/
├── app/
│   ├── (okuma)/[slug]/            Kişi sayfası
│   ├── (okuma)/k/[slug]/          Kuruluş sayfası
│   ├── (okuma)/kategori/[slug]/
│   ├── [slug]/gecmis/             Revizyon geçmişi + diff
│   ├── duzenle/[slug]/            Editör
│   ├── panel/                     Kullanıcı ve kuruluş paneli
│   └── api/
├── components/
│   ├── infobox/                   Sol panel bileşenleri
│   ├── article/                   Makale, içindekiler, kaynaklar
│   └── editor/
├── lib/
│   ├── markdown/                  [[link]] eklentisi, temizleme
│   ├── links/                     Bağlantı tablosu güncelleme
│   ├── verification/
│   └── db/
└── docs/
```

---

## 15. Gizlilik, KVKK ve moderasyon

Kişisel veri işleyen bir platform olduğumuz için bu bölüm **tasarımın parçası**, sonradan eklenecek bir şey değil.

### 15.1 Kişinin hakları
- **Alan bazında görünürlük:** Doğum yılı, konum, e-posta, telefon gibi her alan için *Herkese açık / Sadece üyeler / Gizli*.
- **Arama motoru kontrolü:** "Google'da indekslenmesin" seçeneği (`noindex`).
- **Unutulma hakkı:** Hesap silinince kişi sayfası ve **tüm revizyonları** kalıcı silinir. Şirket sayfalarındaki "burada çalışmış" listesinden de kalkar.
- **Veriyi dışa aktarma:** Tüm veri JSON + Markdown olarak indirilebilir.
- **Gizlilik amaçlı düzeltme:** Bir bilgi gizlilik sebebiyle kaldırılırsa geçmiş revizyonlardan da gizlenir.

### 15.2 Yasal
- **KVKK** aydınlatma metni ve açık rıza; **GDPR** uyumu (yurt dışı kullanıcılar için).
- VERBİS kaydı gerekliliği hukukçu ile değerlendirilmeli.
- Kullanım koşulları: kişi yazdığı bilgilerin doğruluğundan sorumludur.

### 15.3 Kötüye kullanım ve moderasyon
| Risk | Önlem |
|---|---|
| Başkası adına sahte sayfa | "Bu benim adım / kimliğime bürünülüyor" şikâyeti → öncelikli inceleme; kimlik doğrulamalı kullanıcı her zaman kazanır |
| Sahte deneyim | Onaysız deneyimler rozetsiz görünür; kuruluş "Bu kişi bizde çalışmadı" diyebilir → deneyim **reddedildi** olarak işaretlenir |
| Şirket hakkında karalama | Taslak kuruluş sayfalarında sadece nesnel alanlar; yorum/değerlendirme bölümü **yok** (bu bir şikâyet sitesi değil) |
| Spam / SEO çöpü | Yeni hesaplarda dış link `nofollow`, hız sınırları, şüpheli içerik kuyruğu |
| Yasa dışı / müstehcen görsel | Yüklemede otomatik görsel taraması + şikâyet |

---

## 16. Yol haritası

### Faz 0 — Tasarım ve doğrulama (2–3 hafta)
- [ ] Bu dokümandaki açık soruların kararlaştırılması
- [ ] Kişi ve kuruluş sayfasının tıklanabilir prototipi (Figma veya statik HTML)
- [ ] 10–15 potansiyel kullanıcıyla görüşme: "Bunu kullanır mıydın, linkini paylaşır mıydın?"
- [ ] Alan adı, logo, marka

### Faz 1 — MVP (6–8 hafta)
**Amaç:** Bir kişi 5 dakikada güzel bir sayfa yayınlayıp linkini paylaşabilsin.
- [ ] Kayıt / giriş (e-posta, Google, GitHub)
- [ ] Kişi sayfası: bilgi kutusu formu + Markdown makale + `[[link]]`
- [ ] Kariyer ve eğitim kayıtları (yapısal)
- [ ] Taslak kuruluş/okul sayfalarının otomatik oluşması + kırmızı link
- [ ] Kuruluş sayfasında "burada çalışanlar" listesi
- [ ] Revizyon geçmişi (diff'siz liste yeterli)
- [ ] Basit arama (isim + kuruluş)
- [ ] SEO temelleri (SSR, sitemap, schema.org, OG görseli)
- [ ] Alan bazında gizlilik + hesap silme
- [ ] Mobil uyum

### Faz 2 — Güven ve kuruluşlar (6 hafta)
- [ ] Kuruluş sahiplenme (alan adı / iş e-postası)
- [ ] Kuruluş yönetici paneli + deneyim onay akışı
- [ ] Doğrulama rozetleri
- [ ] Düzenleme önerileri (PR modeli)
- [ ] Diff görünümü, geri alma
- [ ] CV (PDF) içe aktarma
- [ ] PDF CV olarak dışa aktarma
- [ ] Şikâyet + moderatör paneli

### Faz 3 — Ansiklopedi hissi (sürekli)
- [ ] Kategoriler ve kategori sayfaları
- [ ] Ana sayfa: günün portfolyosu, biliyor muydunuz, rastgele sayfa
- [ ] Anlam ayrımı sayfaları, yönlendirmeler, sayfa birleştirme
- [ ] Proje sayfa türü (birden çok kişinin bağlandığı)
- [ ] Gelişmiş arama ve filtreler (Meilisearch)
- [ ] Kimlik doğrulama (e-Devlet vb.)
- [ ] Çoklu dil (sayfanın İngilizce sürümü)
- [ ] Koyu mod

### Faz 4 — Gelir ve ekosistem
- [ ] Portfedia Pro, kuruluş planları (bkz. §17)
- [ ] Herkese açık API (okuma)
- [ ] Gömülebilir "Portfedia kartı" (kişisel sitelere)

---

## 17. Gelir modeli

**İlke:** Okuma deneyimi **her zaman reklamsız ve ücretsiz** kalır. Wikipedia hissinin olmazsa olmazı budur. Para, *yazanlardan* ve *arayanlardan* gelir.

| Ürün | Kime | İçerik |
|---|---|---|
| **Ücretsiz** | Herkes | Tam kişi sayfası, sınırsız düzenleme, doğrulama, PDF CV |
| **Portfedia Pro** (aylık küçük ücret) | Bireyler | Özel alan adı (`aysedemir.com` → Portfedia sayfası), ziyaret istatistikleri, ek PDF şablonları, öne çıkan proje galerisi |
| **Kuruluş Planı** | Şirketler | Kurumsal sayfa özelleştirme, toplu onay araçları, çalışan sayfaları istatistiği, iş ilanı bölümü |
| **Yetenek Arama** | İşe alımcılar | Gelişmiş filtreli arama (doğrulanmış deneyim, beceri, konum), iletişim talebi (kişinin izniyle) |

---

## 18. Başarı metrikleri

| Metrik | Neden önemli | İlk hedef (MVP + 3 ay) |
|---|---|---|
| Kayıt → **yayınlanmış** sayfa oranı | Onboarding gerçekten çalışıyor mu? | > %60 |
| İlk yayına kadar geçen süre (medyan) | "5 dakika" vaadi | < 7 dk |
| Sayfa başına ortalama bağlantı sayısı | Ansiklopedi ağı oluşuyor mu? | > 4 |
| Doğrulanmış deneyim oranı | Güven katmanı işliyor mu? | > %20 |
| Sahiplenilmiş kuruluş sayısı | Kuruluş tarafı ilgi gösteriyor mu? | 50 |
| Organik (arama) trafiğin payı | SEO stratejisi tutuyor mu? | > %40 |
| Sayfa başına ziyaretçi gezinme derinliği | "Tavşan deliği" etkisi | > 2,5 sayfa |
| 30 gün içinde sayfasını tekrar güncelleyenler | Canlı mı, mezarlık mı? | > %25 |

---

## 19. Riskler

| Risk | Olasılık | Etki | Azaltma |
|---|---|---|---|
| **Soğuk başlangıç:** Boş platformda kimse sayfa açmaz | Yüksek | Yüksek | Belirli bir nişle başla (ör. Türkiye'deki yazılımcılar), CV içe aktarma, kuruluşları öncü olarak davet et |
| **"LinkedIn zaten var"** algısı | Yüksek | Orta | Konumlandırma net olmalı: *sosyal ağ değil, ansiklopedi.* Akış yok, beğeni yok, mesaj yok. |
| Sayfaların eskimesi | Orta | Orta | Periyodik "sayfan 6 aydır güncellenmedi" hatırlatmaları; "son güncelleme" tarihinin görünür olması |
| Sahte bilgi → güven kaybı | Orta | Yüksek | Doğrulama katmanları; onaysızın açıkça işaretlenmesi |
| Hukuki sorunlar (KVKK, karalama) | Orta | Yüksek | §15'teki önlemler, hukuki danışmanlık, yorum/değerlendirme özelliği koymamak |
| Wikipedia'ya fazla benzeme (marka) | Düşük | Orta | Kendi logo/isim/renk; sadece *tasarım dili* esinlenmesi |

---

## 20. Açık sorular

Faz 0'da karar verilmesi gerekenler (önerilerimle birlikte):

1. **Başkası adına sayfa açılabilir mi?** (Ör. tanınmış bir kişi için topluluk sayfası.)
   → *Öneri: Hayır.* Kişi sayfaları yalnızca kişinin kendisine ait. Hukuki risk ve ürün kimliği açısından en temizi.

2. **Taslak kuruluş sayfalarını sahiplenilmeden kim düzenler?**
   → *Öneri:* Herhangi bir üye nesnel alanları (logo hariç) doldurabilir, değişiklikler revizyonlu; moderatör denetimli.

3. **Hedef pazar önce Türkiye mi, global mi?**
   → *Öneri:* Arayüz baştan **çok dilli altyapıyla** yazılsın, ama lansman Türkiye + Türkçe. Niş: önce yazılım/teknoloji profesyonelleri.

4. **Kişi URL'leri kökte mi (`/ayse-demir`) yoksa önekli mi (`/kisi/ayse-demir`)?**
   → *Öneri:* Kökte. Kısa link paylaşılabilirlik için çok değerli; kuruluşlar `/k/` önekiyle ayrışır.

5. **Bir kişi aynı anda birden fazla sayfa sahibi olabilir mi?** (Ör. hem kişi sayfası hem kendi şirketinin yöneticisi.)
   → *Öneri:* Evet. Bir hesap = bir kişi sayfası + N kuruluş yöneticiliği.

6. **Yorum / öneri (referans) sistemi olacak mı?** (LinkedIn'deki "recommendations" gibi.)
   → *Öneri:* MVP'de hayır. İleride, kişinin onayıyla yayınlanan "Hakkında söylenenler" bölümü olarak düşünülebilir.

7. **Fotoğraf zorunlu mu?**
   → *Öneri:* Hayır. Yoksa baş harflerden oluşan sade bir yer tutucu.

---

## 21. Sözlük

| Terim | Anlamı |
|---|---|
| **Bilgi kutusu (infobox)** | Sayfanın solundaki, fotoğraf/logo ve özet bilgileri içeren yapılandırılmış panel |
| **Revizyon** | Sayfanın kaydedilmiş bir sürümü; hiçbiri silinmez |
| **Diff** | İki revizyon arasındaki farkın gösterimi |
| **Kırmızı link** | Henüz var olmayan bir sayfaya verilmiş bağlantı |
| **Taslak sayfa** | Sahibi olmayan, otomatik veya topluluk tarafından açılmış kuruluş sayfası |
| **Sahiplenme** | Bir kuruluşun kendi sayfasının kontrolünü doğrulama ile alması |
| **Anlam ayrımı** | Aynı isimli birden çok sayfayı listeleyen yönlendirme sayfası |
| **Yönlendirme (redirect)** | Bir başlığın başka bir sayfaya otomatik gitmesi (ör. "Acme" → "Acme Yazılım A.Ş.") |
| **Düzenleme önerisi** | Sayfa sahibi olmayan birinin, sahibin onayına sunduğu değişiklik |
| **Deneyim onayı** | Kuruluşun, bir kişinin orada çalıştığını teyit etmesi |

---

*Bu doküman yaşayan bir belgedir; kararlar netleştikçe güncellenecektir.*
