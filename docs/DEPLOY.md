# Canlıya alma: Coolify + MongoDB + Cloudflare R2

Bu rehber Portfedia'yı kendi sunucundaki **Coolify** üzerinde çalıştırmayı anlatır.

```
             ┌──────────── Coolify sunucusu ────────────┐
İnternet ──▶ │ Traefik (HTTPS) ──▶ app (Dockerfile, :3000)│
             │                        │                  │
             │                        ▼                  │
             │                   MongoDB 7               │
             └────────────────────────┬──────────────────┘
                                      │ fotoğraf / logo
                                      ▼
                           Cloudflare R2 (media.alanadin.com)
```

> Coolify'ın menü adları sürümden sürüme biraz değişebilir; adımların mantığı aynıdır.

---

## 1. MongoDB'yi oluştur

1. Coolify → projen → **+ New → Database → MongoDB** (sürüm 7 veya üzeri).
2. Oluşturduktan sonra veritabanı sayfasındaki **internal connection URL**'yi kopyala. Örnek:
   `mongodb://root:SIFRE@mongodb-abc123:27017/?authSource=admin`
3. Uygulama için veritabanı adını URL'ye ekle:
   `mongodb://root:SIFRE@mongodb-abc123:27017/portfedia?authSource=admin`
4. **Yedeklemeyi mutlaka aç:** veritabanı sayfasında **Backups** bölümünden günlük bir zamanlama kur. Hedef olarak S3 uyumlu bir depolama seçebilirsin; aşağıda oluşturacağın R2 hesabında ayrı bir `portfedia-backups` bucket'ı açmak en pratik yol.

MongoDB'yi dışarıya (public port) açmana gerek yok; uygulama aynı Coolify ağından iç adresle bağlanır.

## 2. Cloudflare R2'yi hazırla (fotoğraf ve logolar)

1. Cloudflare panel → **R2 Object Storage → Create bucket** → ad: `portfedia-media`.
2. Bucket → **Settings → Public access**:
   - Önerilen: **Custom domain** bağla (ör. `media.portfedia.com`). Cloudflare önbelleği ve HTTPS otomatik gelir.
   - Hızlı deneme için **r2.dev** adresini de açabilirsin (üretimde önerilmez).
3. **R2 → Manage API tokens → Create API token**:
   - İzin: **Object Read & Write**
   - Kapsam: yalnızca `portfedia-media` bucket'ı
   - Oluşunca **Access Key ID** ve **Secret Access Key**'i kopyala (secret bir daha gösterilmez).
4. **Account ID**: R2 ana sayfasının sağında yazar.

Uygulama yüklenen her görseli `images/<yıl>/<rastgele>.jpg|png|webp` anahtarıyla, 1 yıllık önbellek başlığıyla yükler. Eski görsel değiştirildiğinde R2'den silinir.

## 3. Uygulamayı oluştur

1. Coolify → **+ New → Application** → GitHub reposu (`xcorbdev-sys/Portfedia`) ve dal seç.
2. **Build Pack: Dockerfile** (repodaki `Dockerfile` kullanılır).
3. **Ports Exposes:** `3000`
4. **Domain:** ör. `https://portfedia.com` (Coolify, Let's Encrypt sertifikasını kendisi alır).
5. **Health check:** yol `/api/health`, port `3000`. Dockerfile'da da `HEALTHCHECK` tanımlı; bu uç nokta MongoDB'ye ping atar.
6. **Environment Variables:**

| Değişken | Örnek | Açıklama |
|---|---|---|
| `SITE_URL` | `https://portfedia.com` | Sitemap, canonical ve paylaşım linkleri için. Sonunda `/` olmasın. |
| `ADMIN_EMAILS` | `sen@ornek.com,ekip@ornek.com` | Profil başvurularını onaylayacak hesaplar (virgülle ayrılmış). Yalnızca e-postasını doğrulamış hesaplar yönetici olur. |
| `RESEND_API_KEY` | `re_...` | E-posta gönderimi (bkz. 3.1). Boşsa e-postalar loga yazılır. |
| `EMAIL_FROM` | `Portfedia <no-reply@portfedia.com>` | Gönderen adres; alan adı Resend'de doğrulanmış olmalı |
| `COMPANY_NAME` | `Portfedia Teknoloji A.Ş.` | E-postaların altında görünür (yasal zorunluluk) |
| `CONTACT_EMAIL` | `privacy@portfedia.com` | Gizlilik politikasında görünen iletişim adresi |
| `COMPANY_ADDRESS` | `Örnek Mah. 1. Sok. No:1, İstanbul, Türkiye` | E-postaların altında görünür (yasal zorunluluk) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | | "Google ile giriş" (bkz. 3.2). Boşsa düğme görünmez. |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | | "LinkedIn ile giriş" (bkz. 3.3). Boşsa düğme görünmez. |
| `MONGODB_URI` | `mongodb://root:...@mongodb-abc123:27017/portfedia?authSource=admin` | 1. adımdaki adres |
| `R2_ACCOUNT_ID` | `a1b2c3...` | Cloudflare hesap kimliği |
| `R2_ACCESS_KEY_ID` | `...` | R2 API token |
| `R2_SECRET_ACCESS_KEY` | `...` | R2 API token (Coolify'da "secret" olarak işaretle) |
| `R2_BUCKET` | `portfedia-media` | |
| `R2_PUBLIC_URL` | `https://media.portfedia.com` | Bucket'ın herkese açık adresi, sonunda `/` olmadan |

7. **Deploy**. İlk build birkaç dakika sürer. Bittiğinde `https://portfedia.com/api/health` adresi `{"ok":true}` döndürmeli.

> **Replika sayısı:** Giriş denemelerini sınırlayan hız sınırlayıcı bellekte tutuluyor. Şimdilik **tek konteyner** çalıştır. Birden fazla konteynere geçerken sınırlayıcı MongoDB veya Redis'e taşınmalı.

### 3.1 E-posta: Resend (ücretsiz kota)

1. [resend.com](https://resend.com)'da hesap aç → **Domains → Add domain** → ör. `portfedia.com`.
2. Resend'in verdiği DNS kayıtlarını (SPF/DKIM TXT ve MX) alan adının DNS'ine ekle. Cloudflare kullanıyorsan **DNS → Records**. Doğrulama birkaç dakika sürer.
3. **API Keys → Create API key** (izin: *Sending access*) → `RESEND_API_KEY`.
4. `EMAIL_FROM` olarak doğruladığın alan adından bir adres yaz: `Portfedia <no-reply@portfedia.com>`.

Gönderilen e-postalar: e-posta doğrulama, şifre sıfırlama, e-posta değişikliği onayı, başvuru sonucu. Pazarlama e-postası gönderilmez. Ücretsiz kotayı aşınca Resend ücretli plana geçmeyi ister; kotayı Resend'in fiyat sayfasından kontrol et.

### 3.2 Google ile giriş (ücretsiz)

1. [console.cloud.google.com](https://console.cloud.google.com) → yeni proje → **APIs & Services → OAuth consent screen**: uygulama adı *Portfedia*, destek e-postası, logo (isteğe bağlı), *External*. İzinler: `openid`, `email`, `profile` (hassas izin olmadığı için uzun inceleme gerekmez). Yayın durumunu **In production** yap.
2. **Credentials → Create credentials → OAuth client ID → Web application**
   - Authorized redirect URI: `https://portfedia.com/api/auth/google/callback`
3. Client ID ve secret'ı `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` olarak gir.

### 3.3 LinkedIn ile giriş (ücretsiz)

1. Bir **LinkedIn şirket sayfası** gerekir (Portfedia için açtığın sayfa).
2. [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → **Create app** → şirket sayfanı seç.
3. **Products** sekmesinde **Sign In with LinkedIn using OpenID Connect** ürününü ekle.
4. **Auth** sekmesi → *Authorized redirect URLs*: `https://portfedia.com/api/auth/linkedin/callback`
5. Client ID ve Primary Client Secret'ı `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` olarak gir.

Google veya LinkedIn ile ilk kez gelen kişi, hesabı oluşturulmadan önce doğum yılını ve kullanım koşullarını onaylar. Bu sağlayıcılardan gelen e-postalar doğrulanmış sayılır.

### Alternatif: Docker Compose ile tek parça

Coolify'da **Build Pack: Docker Compose** seçip repodaki `docker-compose.yml`'yi de kullanabilirsin; MongoDB aynı dosyada ayağa kalkar. Ancak yedekleme ve izleme açısından MongoDB'yi ayrı bir Coolify kaynağı olarak açmak (yukarıdaki yöntem) daha iyidir.

## 4. Yöneticiler ve profil başvuruları

1. Coolify'da `ADMIN_EMAILS` değişkenine kendi e-postanı yaz.
2. Sitede bu e-posta ile kayıt ol ve gelen bağlantıyla **e-postanı doğrula**. Sağ üstteki menüde **Review applications** bağlantısı görünür.

> Yönetici yetkisi yalnızca e-postası doğrulanmış hesaplara verilir; başkası senin adresinle kayıt olsa bile doğrulama bağlantısı sana geleceği için yönetici olamaz.
3. **`/admin`** panelinde bekleyen başvurular listelenir:
   - **Approve & publish:** Profil yayına çıkar. "Also mark identity as verified" kutusunu işaretlersen mavi rozet de verilir.
   - **Reject:** Yazdığın gerekçe başvuru sahibine profilinde gösterilir. Kişi profilini düzeltip kaydedince başvuru otomatik olarak yeniden **Pending**'e düşer.
   - **Approved** sekmesinden yayındaki bir profili gerekçe yazarak **Unpublish** edebilirsin.
4. Onay/ret kararları profilin **History** sayfasına kaydedilir (kim, ne zaman, hangi gerekçeyle).

> Başvuru sahiplerine karar e-postası gider (Account sayfasından kapatılabilir). Durumu ayrıca profillerinde ve **Account** sayfasında görürler.

Gerekirse veritabanından da işlem yapılabilir (Coolify → MongoDB → **Terminal** → `mongosh`):

```js
use portfedia
// Kalıcı moderatör/yönetici rolü (ADMIN_EMAILS yerine)
db.users.updateOne({ email: "sen@ornek.com" }, { $set: { role: "moderator" } })

// Bir kişiye veya şirkete mavi doğrulama rozeti ver
db.pages.updateOne({ slug: "ayse-demir" }, { $set: { verified: true } })

// Bir şirket sayfasını "sahiplenildi" yap (artık sadece yöneticiler düzenleyebilir)
db.pages.updateOne({ slug: "northwind-robotics" }, { $set: { status: "claimed" } })
```

## 5. Yerelde Docker ile çalıştırma

```bash
cp .env.example .env              # isteğe bağlı: R2 bilgilerini gir
docker compose up -d --build
open http://localhost:3000
```

R2 bilgileri boşsa görseller `uploads` Docker volume'una yazılır ve `/media/...` adresinden sunulur.

Temizlemek için (veritabanı dahil her şeyi siler):

```bash
docker compose down -v
```

## 6. Yedekleme ve geri yükleme

Coolify'daki otomatik yedekleme (1. adım) `mongodump` arşivi üretir. **Bir yedeği en az bir kez geri yüklemeyi dene**; denenmemiş yedek, yedek sayılmaz.

Coolify → MongoDB → **Terminal**:

```bash
# Elle yedek al
mongodump --uri="$MONGO_URI" --db=portfedia --archive=/tmp/portfedia.archive --gzip

# Test için ayrı bir veritabanına geri yükle (canlı veriye dokunmaz)
mongorestore --uri="$MONGO_URI" --archive=/tmp/portfedia.archive --gzip \
  --nsFrom='portfedia.*' --nsTo='portfedia_restore_test.*'
```

Görseller Cloudflare R2'de durur; R2 dosyaları silinmez, yalnızca değiştirilen görselin eskisi silinir.

## 7. Hatalar ve loglar

Sunucu hataları Coolify'daki uygulama loglarına tek satırlık JSON olarak yazılır (`"level":"error"` ile ara). Ücretli bir hata takip servisi gerekmez.

## 8. Testler (CI)

GitHub'a her push'ta `.github/workflows/ci.yml` çalışır: tip kontrolü, birim testleri, build ve gerçek bir MongoDB ile uçtan uca test (`e2e/run.cjs`, 30 kontrol). Yerelde:

```bash
docker compose up -d --build        # ADMIN_EMAILS=admin@example.com ile
npm run e2e
```

## 9. Güncelleme

`main` dalına push yaptığında Coolify'da **Auto Deploy** açıksa yeni sürüm otomatik kurulur. Kapalıysa Coolify'dan **Redeploy**'a bas. Veritabanı şeması kodla birlikte gelir; ayrı bir migration adımı yoktur (indeksler uygulama ilk açıldığında oluşturulur).
