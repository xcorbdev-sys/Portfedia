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
| `ADMIN_EMAILS` | `sen@ornek.com,ekip@ornek.com` | Profil başvurularını onaylayacak hesaplar (virgülle ayrılmış). **İlk deploy'da boş bırak**, kayıt olduktan sonra ekle (bkz. 4. adım). |
| `MONGODB_URI` | `mongodb://root:...@mongodb-abc123:27017/portfedia?authSource=admin` | 1. adımdaki adres |
| `R2_ACCOUNT_ID` | `a1b2c3...` | Cloudflare hesap kimliği |
| `R2_ACCESS_KEY_ID` | `...` | R2 API token |
| `R2_SECRET_ACCESS_KEY` | `...` | R2 API token (Coolify'da "secret" olarak işaretle) |
| `R2_BUCKET` | `portfedia-media` | |
| `R2_PUBLIC_URL` | `https://media.portfedia.com` | Bucket'ın herkese açık adresi, sonunda `/` olmadan |

7. **Deploy**. İlk build birkaç dakika sürer. Bittiğinde `https://portfedia.com/api/health` adresi `{"ok":true}` döndürmeli.

> **Replika sayısı:** Giriş denemelerini sınırlayan hız sınırlayıcı bellekte tutuluyor. Şimdilik **tek konteyner** çalıştır. Birden fazla konteynere geçerken sınırlayıcı MongoDB veya Redis'e taşınmalı.

### Alternatif: Docker Compose ile tek parça

Coolify'da **Build Pack: Docker Compose** seçip repodaki `docker-compose.yml`'yi de kullanabilirsin; MongoDB aynı dosyada ayağa kalkar. Ancak yedekleme ve izleme açısından MongoDB'yi ayrı bir Coolify kaynağı olarak açmak (yukarıdaki yöntem) daha iyidir.

## 4. Yöneticiler ve profil başvuruları

1. Önce sitede kendi e-postanla **Sign up** yap.
2. **Sonra** Coolify'da `ADMIN_EMAILS` değişkenine bu e-postayı yaz ve yeniden deploy et. Sağ üstteki menüde **Review applications** bağlantısı görünür.

> ⚠️ **Sıra önemli:** Sitede henüz e-posta doğrulaması yok. `ADMIN_EMAILS`'e henüz kayıt olunmamış bir adres yazarsan, o adresle ilk kayıt olan kişi yönetici olur. Listeye yalnızca **zaten kayıt olduğun** adresleri ekle.
3. **`/admin`** panelinde bekleyen başvurular listelenir:
   - **Approve & publish:** Profil yayına çıkar. "Also mark identity as verified" kutusunu işaretlersen mavi rozet de verilir.
   - **Reject:** Yazdığın gerekçe başvuru sahibine profilinde gösterilir. Kişi profilini düzeltip kaydedince başvuru otomatik olarak yeniden **Pending**'e düşer.
   - **Approved** sekmesinden yayındaki bir profili gerekçe yazarak **Unpublish** edebilirsin.
4. Onay/ret kararları profilin **History** sayfasına kaydedilir (kim, ne zaman, hangi gerekçeyle).

> Başvuru sahiplerine şu an e-posta gönderilmiyor; durumu sitede, profillerinde ve **Account** sayfasında görüyorlar.

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

## 6. Güncelleme

`main` dalına push yaptığında Coolify'da **Auto Deploy** açıksa yeni sürüm otomatik kurulur. Kapalıysa Coolify'dan **Redeploy**'a bas. Veritabanı şeması kodla birlikte gelir; ayrı bir migration adımı yoktur (indeksler uygulama ilk açıldığında oluşturulur).
