# Portfedia

> **Portfolyo + Ansiklopedi.** İnsanların ve şirketlerin kendilerini Wikipedia sadeliğinde, birbirine bağlı sayfalarla anlattığı açık bir "kariyer ansiklopedisi".

Bu doküman projenin ne olduğunu, neden var olduğunu, nasıl görüneceğini ve nasıl inşa edileceğini anlatır. Baştan sona okunacak şekilde yazıldı; en sonda kararlaştırılması gereken açık sorular var.

> **Dil:** Bu doküman Türkçedir; **sitenin kendisi (arayüz, URL'ler, hata mesajları) tamamen İngilizcedir.**

## Hızlı başlangıç

```bash
docker compose up -d --build      # uygulama + MongoDB → http://localhost:3000
```

Docker olmadan geliştirme (yerelde çalışan bir MongoDB gerekir):

```bash
cp .env.example .env.local        # MONGODB_URI'yi düzenle
npm install
npm run dev                       # http://localhost:3000
npm test                          # birim testleri
npm run typecheck
```

Canlıya alma (Coolify + MongoDB + Cloudflare R2): **[docs/DEPLOY.md](docs/DEPLOY.md)**

---

## İçindekiler

1. [Tek cümlede](#1-tek-cümlede)
2. [Problem ve fırsat](#2-problem-ve-fırsat)
3. [Kimler için?](#3-kimler-için)
4. [Temel fikir: Wikipedia'dan ne alıyoruz, neyi değiştiriyoruz?](#4-temel-fikir-wikipediadan-ne-alıyoruz-neyi-değiştiriyoruz)
5. [Sayfa türleri](#5-sayfa-türleri)
6. [Sayfa anatomisi (tasarım)](#6-sayfa-anatomisi-tasarım)
7. [Bilgi kutusu (Key Facts) alanları](#7-bilgi-kutusu-key-facts-alanları)
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
- **Bilgi düzeni:** Makale formatı, bölüm bölüm okunan sayfa, bölüm menüsü (içindekiler), kaynakça.
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
| Bilgi kutusu sağda, makale tek sütun | **Solda bölüm menüsü, ortada fotoğraflı başlık + makale, sağda "Key Facts" kartı** | Modern, kart tabanlı bir arayüz; fotoğraf/logo başlıkta ilk bakışta görünür |
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

Tasarım, verilen ekran tasarımlarına göre uygulandı: **beyaz zemin, mavi vurgu rengi (`#1f5af2`), kartlar, etiket çipleri, onay rozeti**. Ana sayfa başlığı serif, geri kalan her şey sans-serif. Koyu mod otomatik.

### 6.1 Kişi sayfası (masaüstü: 3 sütun)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [P] Portfedia   People  Companies  Sectors      [🔍 Search Portfedia...] (AD)│
├──────────────────────────────────────────────────────────────────────────────┤
│ Home › People › Ayşe Demir                                                   │
│                                                                              │
│ Ayşe Demir      ┌──────┐ Ayşe Demir ✔         [Follow][⇪][⋯] ┌ Key Facts ──┐ │
│ ▌Overview       │ FOTO │ Northwind Robotics · CTO            │ Born   1988 │ │
│  Biography      └──────┘ [Engineer] [Entrepreneur]           │ Nationality │ │
│  Career                  Kısa özet...                        │ Education   │ │
│  Education                                                   │ Role        │ │
│  Related Comp.  Biography                                    │ Sector      │ │
│  Connections    Metin... [Read more ⌄]                       └─────────────┘ │
│  Sources                                                     ┌ Links ──────┐ │
│                 Career                                       │ [in] [GH]   │ │
│                 ● 2019 – Present   Northwind Robotics · CTO  └─────────────┘ │
│                 ● 2012 – 2019      Bluefin Bank · Engineer                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Sol:** Bölüm menüsü; kaydırdıkça aktif bölüm vurgulanır. Makaledeki `## Başlık`lar menüye otomatik eklenir.
- **Orta:** Fotoğraf, isim + doğrulama rozeti, "Şirket · Rol", etiketler, kısa özet; altında Biography ("Read more" ile açılır), Career zaman çizelgesi, Education, Related Companies, Connections (bu sayfadan bahsedenler) ve Sources.
- **Sağ:** "Key Facts" ve "Links" kartları.
- **Aksiyonlar:** Follow (takip), Share (paylaş / linki kopyala), ⋯ menüsü (Edit, View history, Save as PDF).

### 6.2 Şirket sayfası (2 sütun)

Logo + isim + sektör + etiketler + özet; altında **4'lü bilgi şeridi** (Founded · Headquarters · Employees · Sector), About, makale bölümleri (History, Products…), yan yana **Key People** ve **Key Facts** kartları, sonra tüm çalışanlar / eski çalışanlar / mezunlar. "Key People" listesi, kişilerin kariyer kayıtlarından **otomatik** oluşur.

### 6.3 Diğer ekranlar

- **Ana sayfa:** "The living encyclopedia of the business world." başlığı, büyük arama kutusu, dünya illüstrasyonu üzerinde öne çıkan profiller, istatistik şeridi, People/Companies sekmeli "Featured" listesi.
- **Arama:** Solda "Refine results" filtreleri (tür ve sektör, sayılarıyla), sekmeler (All / Companies / People / Institutions), sağda tür etiketli sonuç kartları.
- **Create a New Profile:** 4 adımlı sihirbaz: *Profile Type → Basic Info → Details → Sources & Submit*. Kişi ve şirket için iki seçim kartı.

### 6.4 Mobil

Bölüm menüsü gizlenir; sıra: başlık → Key Facts → makale. Yatay kaydırma yok (testle doğrulandı).

---

## 7. Bilgi kutusu (Key Facts) alanları

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
| **Moderatör** | Profil başvurularını onaylar/reddeder (`/admin`), şikâyetleri inceler, sayfa birleştirir, gizler. |
| **Yönetici** | Her şey. |

### 9.1.1 Profil başvurusu ve onay (uygulandı)

```
Kayıt ol → Profil sihirbazı → "Submit for review"
        │
        ▼
   [Pending]  ── yalnızca sahibi ve yöneticiler görür
        │
   /admin paneli
     ├─ Approve & publish (+ isteğe bağlı mavi rozet) ──▶ [Published]  herkese açık
     └─ Reject (gerekçe) ──▶ [Rejected] ── sahibi düzeltip kaydeder ──▶ [Pending]
```

- Yöneticiler `ADMIN_EMAILS` ortam değişkeniyle (veya veritabanında `role: moderator|admin`) belirlenir.
- Her karar, kim/ne zaman/gerekçe bilgisiyle profilin **History** sayfasına yazılır.
- Yayındaki profil gerekçeyle **Unpublish** edilebilir.
- Şirket sayfaları bu akışa dahil değildir (topluluk tarafından düzenlenir, geçmişte saklanır).

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

Site İngilizce olduğu için URL'ler de İngilizcedir. İsimlerdeki Türkçe karakterler sadeleştirilir (Ayşe → `ayse`), başlıkta korunur.

| Sayfa | URL |
|---|---|
| Kişi | `/ayse-demir` |
| Aynı isimde ikinci kişi | `/ayse-demir-robotics-engineer`, sonra `/ayse-demir-2` |
| Şirket / okul | `/org/northwind-robotics` |
| Geçmiş | `/ayse-demir/history`, `/org/northwind-robotics/history` |
| Düzenleme | `/edit` (kendi profilin), `/org/northwind-robotics/edit` |
| Yeni profil | `/create`, kırmızı linkten gelince `/create?title=OpenFleet` |
| Listeler | `/people`, `/companies`, `/companies?sector=...`, `/sectors` |
| Arama | `/search?q=...&type=org&sector=...` |
| Diğer | `/login`, `/signup`, `/account`, `/privacy`, `/random`, `/sitemap.xml` |

Kök dizindeki sistem yolları (`search`, `org`, `edit` …) kişi adresi olarak kullanılamaz (`src/lib/slug.ts`).

---

## 13. Veri modeli (MongoDB)

```
users       { email (unique), passwordHash (bcrypt), name, role: user|moderator|admin }
sessions    { tokenHash (sha256, unique), userId, expiresAt (TTL index → otomatik silinir) }

pages       Her sayfa (kişi, şirket, okul)
  { type: person|org|school, slug (unique), title, titleKey (arama anahtarı),
    summary, tags[], ownerId, status: draft|published|claimed, verified,
    image { key, url }, infobox { ... }, body (Markdown),
    experiences[ { orgSlug, orgTitle, role, startYear, endYear, current, description,
                   verification: unverified|verified|rejected } ],
    educations[ { schoolSlug, schoolTitle, degree, field, startYear, endYear } ],
    sources[ { title, url } ], outLinks[ { slug, title } ],
    followerCount, noindex, revisionCount, createdAt, updatedAt }

revisions   Yalnızca eklenir, değişmez
  { pageId, authorId, authorName, editSummary, snapshot { ...içeriğin tamamı }, size, delta }

follows     { userId, pageId }  (unique)
```

**Neden bu şekil?**
- **Kariyer ve eğitim, kişi belgesinin içine gömülü** ve `experiences.orgSlug` üzerinde indeks var. "Bu şirkette çalışanlar" tek sorgu: `pages.find({ "experiences.orgSlug": "northwind-robotics" })`.
- **Bağlantılar da gömülü** (`outLinks`) ve indeksli: "bu sayfaya bağlantı verenler" tek sorgu.
- **Kırmızı link:** `outLinks` içindeki slug'lardan var olmayanlar kırmızı çizilir; o sayfa açıldığı an hepsi kendiliğinden normal linke döner.
- **Transaction gerekmez:** Tek MongoDB sunucusu (replica set olmadan) yeterlidir; Coolify'daki varsayılan Mongo kurulumu ile çalışır.

---

## 14. Teknik mimari

### 14.1 Yığın (uygulandı)

| Katman | Seçim | Not |
|---|---|---|
| Uygulama | **Next.js 16 (App Router) + React 19 + TypeScript**, Node.js 22 | Sunucu tarafı render (SEO), Server Actions |
| Veritabanı | **MongoDB 7** + Mongoose 9 | Tek bağlantı havuzu, indeksler şemada |
| Dosya depolama | **Cloudflare R2** (S3 API, `@aws-sdk/client-s3`) | R2 ayarı yoksa `./uploads` klasörüne yazar (geliştirme) |
| Kimlik doğrulama | Kendi oturum sistemi: bcrypt + httpOnly cookie + veritabanında hash'lenmiş token | Ek servis gerekmez |
| Markdown | unified / remark / rehype + `[[wiki link]]` eklentisi + rehype-sanitize | Ham HTML yok, XSS testle doğrulandı |
| İkonlar | lucide-react | |
| Paketleme | **Docker** (multi-stage, Next.js standalone, root olmayan kullanıcı, healthcheck) | |
| Yayın | **Coolify** | Bkz. [docs/DEPLOY.md](docs/DEPLOY.md) |

### 14.2 Güvenlik önlemleri

- Şifreler bcrypt (cost 12); oturum token'ı veritabanında yalnızca SHA-256 hash olarak tutulur.
- Giriş/kayıt için hız sınırlama (tek konteyner için bellek içi).
- Server Actions Next.js'in origin kontrolüyle CSRF'e karşı korunur.
- Yüklenen görsellerin türü dosyanın ilk baytlarından tespit edilir (JPEG/PNG/WebP, en fazla 2 MB); SVG kabul edilmez.
- Dış linkler `rel="nofollow ugc noopener"`; açık yönlendirme (open redirect) engellenir.
- KVKK/GDPR: hesap silinince profil, tüm revizyonlar, görseller, takipler ve oturumlar silinir; şirket sayfalarındaki katkılar anonimleşir.

### 14.3 Klasör yapısı

```
src/
├── app/
│   ├── (home)/              Ana sayfa (kendi header'ı: arama kutusu hero'da)
│   ├── (site)/
│   │   ├── [slug]/          Kişi sayfası + /history
│   │   ├── org/[slug]/      Şirket/okul sayfası + /history + /edit
│   │   ├── create/ edit/    Sihirbaz ve profil düzenleme
│   │   ├── search/ people/ companies/ sectors/
│   │   └── login/ signup/ account/ privacy/
│   ├── api/health           Docker/Coolify sağlık kontrolü
│   ├── api/orgs             Şirket adı otomatik tamamlama
│   ├── media/[...key]       Yerel geliştirmede görsel sunumu
│   └── random/ sitemap.ts robots.ts
├── components/              Arayüz bileşenleri, formlar (forms/)
└── lib/
    ├── models/              Mongoose şemaları
    ├── pages.ts             Sayfa okuma/yazma, arama, takip, hesap silme
    ├── wikitext.ts          Markdown + [[link]] + kırmızı link
    ├── storage.ts           Cloudflare R2 / yerel disk
    ├── auth.ts              Oturumlar
    └── actions/             Server Actions
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

### Faz 1 — MVP ✅ (ilk sürüm kodlandı)
**Amaç:** Bir kişi 5 dakikada güzel bir sayfa yayınlayıp linkini paylaşabilsin.
- [x] Kayıt / giriş: e-posta + şifre, **Google ve LinkedIn ile giriş**
- [x] E-posta doğrulama, şifremi unuttum, e-posta/şifre/profil adresi değiştirme (Resend)
- [x] Kayıtta yaş kontrolü (16+, doğum yılı saklanmaz) ve ücretsiz bot koruması (honeypot + zaman kontrolü)
- [x] Başvuru sonucu e-postaları (ayarlardan kapatılabilir; altında şirket adı/adresi)
- [x] Kişi sayfası: bilgi kutusu formu + Markdown makale + `[[link]]`
- [x] Kariyer ve eğitim kayıtları (yapısal)
- [x] Taslak kuruluş/okul sayfalarının otomatik oluşması + kırmızı link
- [x] Kuruluş sayfasında "burada çalışanlar" listesi
- [x] Revizyon geçmişi (diff'siz liste yeterli)
- [x] Basit arama (isim + kuruluş)
- [x] SEO temelleri (SSR, sitemap, schema.org, OG görseli)
- [x] Alan bazında gizlilik + hesap silme
- [x] Mobil uyum

### Faz 2 — Güven ve kuruluşlar ✅
- [x] Kuruluş sahiplenme: **yalnızca şirket e-postasıyla** (ücretsiz mail servisleri engelli, web sitesi kilidi + 3 gün bekleme)
- [x] Kuruluş yönetim ekranı: deneyim onayla/reddet, yönetici davet et/çıkar; kişiler iş e-postasıyla kendi deneyimini doğrulayabilir
- [x] Doğrulama rozetleri
- [ ] Düzenleme önerileri (PR modeli)
- [x] Sürüm karşılaştırma ve geri yükleme
- [ ] CV (PDF) içe aktarma — ücretli API gerektirdiği için plandan çıkarıldı
- [x] PDF olarak kaydet (tarayıcı yazdırma görünümü)
- [x] Moderatör paneli: profil başvurularını onaylama / reddetme / yayından kaldırma
- [x] Şikâyet (Report) akışı, telif kaldırma sayfası (/copyright), kullanıcı engelleme

### Faz 3 — Ansiklopedi hissi (sürekli)
- [x] Takip et (Follow), sektörler sayfası, filtreli arama
- [x] Koleksiyonlar (elle derlenmiş listeler) ve sektör sayfaları
- [ ] Ana sayfa: günün portfolyosu, biliyor muydunuz, rastgele sayfa
- [ ] Anlam ayrımı sayfaları, yönlendirmeler, sayfa birleştirme
- [ ] Proje sayfa türü (birden çok kişinin bağlandığı)
- [x] Filtreli arama (tür, sektör) — Meilisearch ölçek gerektiğinde
- [ ] Kimlik doğrulama (e-Devlet vb.)
- [ ] Çoklu dil (arayüz şu an yalnızca İngilizce)
- [x] Koyu mod (sistem ayarına göre)

### Ek olarak tamamlananlar
- [x] Bildirimler (zil): başvuru kararı, deneyim onayı, yeni takipçi, takip edilen sayfa güncellemesi
- [x] Yatırım turları (Funding) ve yatırımcıların "Investments" bölümü
- [x] CSV ile toplu şirket ekleme (admin)
- [x] Görseller 400 px WebP'ye küçültülür, konum bilgisi silinir; paylaşım kartları (Open Graph)
- [x] Google: ProfilePage / Organization / Breadcrumb yapısal verisi — bkz. [docs/GOOGLE.md](docs/GOOGLE.md)
- [x] KVKK/GDPR: gizlilik politikası, "verilerimi indir", hesap silme
- [x] CI: tip kontrolü, birim testleri, build ve uçtan uca test (GitHub Actions)

### Geliştirme listesinden tamamlananlar
- [x] Güvenlik: şifre gücü göstergesi + sızdırılmış şifre kontrolü, taklit (aynı isim/fotoğraf) uyarısı, sayfa koruma, hakaret filtresi, link spam tespiti
- [x] Profil: projeler (görselli), yayınlar, ödüller ve sertifikalar, konuşmalar, patentler, gönüllülük, seviyeli diller, "Open to" rozeti, profil gücü yüzdesi, zaman çizelgesi
- [x] Topluluk: önerilen düzeltmeler (sahip onaylar), referanslar (sahip onaylar), bahsetme bildirimi, ortak bağlantılar, "Teşekkür"
- [x] Paylaşım: `portfedia.com/@kullanici` kısa adres, yazdırılabilir QR kart
- [x] Şirket: ürünler, yönetim (yönetim kurulu/üst yönetim), ofisler (haritasız), ana şirket ve bağlı şirketler, satın almalar, eski isimler (yönlendirme + arama), kilometre taşları, basın, iş ilanları (`/jobs`), Portfedia'daki çalışan sayısı trendi, borsa kodu, sitelere gömülebilir doğrulama rozeti
- [x] Okul: mezunların çalıştığı şirketler
- [x] Etiket sayfaları (`/tag/...`) ve ağır listeler için sunucu önbelleği

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

1. **Kişi profilleri nasıl yayına çıkar?**
   → *Karar (uygulandı):* Kişi **kendi profilini oluşturur, bu bir başvurudur; Portfedia ekibi onaylayınca yayına çıkar.** Onaya kadar profil yalnızca sahibine ve yöneticilere görünür; arama, listeler, şirket sayfaları ve sitemap'te yer almaz. Reddedilen başvuru gerekçesiyle sahibine gösterilir, düzeltilip kaydedilince yeniden incelemeye düşer. Onaylanmış profildeki sonraki düzenlemeler doğrudan yayına girer (geçmişte saklanır); gerekirse yönetici yayından kaldırabilir. Başkası adına kişi profili açılamaz.

2. **Taslak kuruluş sayfalarını sahiplenilmeden kim düzenler?**
   → *Öneri:* Herhangi bir üye nesnel alanları (logo hariç) doldurabilir, değişiklikler revizyonlu; moderatör denetimli.

3. **Hedef pazar önce Türkiye mi, global mi?**
   → *Karar:* Site **İngilizce**. Niş olarak önce Türkiye iş dünyası ve teknoloji profesyonelleri hedeflenebilir.

4. **Kişi URL'leri kökte mi (`/ayse-demir`) yoksa önekli mi?**
   → *Karar:* Kökte. Kuruluşlar `/org/` önekiyle ayrışır.

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
