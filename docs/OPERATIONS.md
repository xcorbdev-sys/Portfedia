# Portfedia işletim rehberi

Bu belge siteyi canlıda güvenle çalıştırmak için gerekenleri anlatır: staging ortamı, izleme, yedek ve plan yönetimi.

## 1. Staging ortamı (Coolify)

Canlıya çıkmadan önce değişiklikleri ayrı bir kopyada denemek için:

1. Coolify'da aynı repo için **ikinci bir uygulama** oluşturun (ör. `portfedia-staging`).
2. Branch olarak `staging` (veya deneme yaptığınız branch) seçin.
3. **Ayrı bir MongoDB** kaynağı oluşturun. Staging asla canlı veritabanına bağlanmamalı.
4. Ortam değişkenleri:
   - `SITE_URL=https://staging.alanadiniz.com`
   - `MONGODB_URI=` staging veritabanı adresi
   - `R2_BUCKET=` ayrı bir bucket (ör. `portfedia-staging`) ya da boş bırakın (görseller diske yazılır)
   - `RESEND_API_KEY` boş bırakılabilir; e-postalar o zaman loglara yazılır
   - `ADMIN_EMAILS=` kendi adresiniz
5. Staging sayfalarının Google'da çıkmaması için Coolify'da **Basic Auth** açın (Advanced → HTTP Basic Authentication).

Önerilen akış: önce `staging`'e push edin, kontrol edin, sonra `main`'e birleştirin.

## 2. İzleme (Uptime Kuma, ücretsiz)

Site çökerse haberiniz olsun diye:

```bash
docker compose --profile monitoring up -d
```

Coolify'da isterseniz Uptime Kuma'yı hazır servis olarak da kurabilirsiniz (Services → Uptime Kuma).

Kurduktan sonra `http://sunucu:3001` adresini açın, bir yönetici hesabı oluşturun ve şu izleyicileri ekleyin:

| İzleyici | Tür | Adres | Aralık |
| --- | --- | --- | --- |
| Site | HTTP(s) | `https://alanadiniz.com/` | 60 sn |
| Sağlık | HTTP(s) – Keyword `"ok":true` | `https://alanadiniz.com/api/health` | 60 sn |
| SSL | HTTP(s), "Certificate expiry" açık | `https://alanadiniz.com/` | 1 gün |

Bildirim için Settings → Notifications kısmından e-posta (SMTP), Telegram veya Discord ekleyin. Hepsi ücretsizdir.

`/api/health` veritabanı bağlantısını kontrol eder; sorun varsa 503 döner.

## 3. Yedekleme

- MongoDB: Coolify → veritabanı → **Backups** sekmesinden günlük yedek açın, hedef olarak R2 (S3 uyumlu) seçin.
- Görseller R2'de durur; R2 kendi içinde yedeklidir. Silinen görseller 90 gün boyunca çöp kutusunda tutulur.
- Ayda bir yedeği staging'e geri yükleyip denemeniz önerilir.

## 4. Planlar (Pro / Business)

Ödeme sistemi yok; planları elle verirsiniz:

- **Pro (kişi):** Admin → Users → kullanıcıyı bulun → *Give Pro* (1 veya 12 ay). Pro kullanıcılar profil istatistiklerini görür, başvuruları listede önce çıkar.
- **Business (kurum):** Kurum sayfası → Manage → Moderator tools → *Give Business for 12 months*. Business kurumlar sayfa istatistiklerini görür, öne çıkan iş ilanı ekleyebilir ve sayfa rengini seçebilir.

Süre dolunca plan kendiliğinden Free'ye düşer. Fiyatlandırma sayfası (`/pricing`) iletişim için `CONTACT_EMAIL` adresini kullanır.

## 5. Güncelleme sonrası kontrol listesi

1. `/api/health` 200 dönüyor mu?
2. Ana sayfa stilli açılıyor mu? (HTTP üzerinde açıyorsanız CSS'in yüklendiğini kontrol edin; HTTPS önerilir.)
3. Giriş yapıp bir profil düzenleyin.
4. Admin → Overview ekranında iş kuyruğunda hata birikmediğini kontrol edin.
