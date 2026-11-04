# Google'da görünürlük

## Gerçekçi beklenti

- **Arama sonuçları:** Biri bir kişiyi veya şirketi aradığında Portfedia sayfasının fotoğraflı, açıklamalı, "Home › People › Ayşe Demir" yollu bir sonuç olarak çıkması. **Bunu biz sağlarız.**
- **Bilgi Paneli (Knowledge Panel):** Aramanın sağında veya mobilde en üstte çıkan kutu. **Google karar verir**; çoğunlukla Wikipedia/Wikidata'dan beslenir. Yeni bir site bunu garanti edemez. Site büyüdükçe ve güven kazandıkça Google'ın Portfedia'yı kaynak olarak kullanma ihtimali artar.

## Sitede hazır olanlar

| Ne | Nerede |
|---|---|
| `ProfilePage` + `Person` yapısal verisi (ad, rol, şirket, okul, fotoğraf, LinkedIn/GitHub/web bağlantıları, takipçi sayısı) | Kişi sayfaları |
| `Organization` / `EducationalOrganization` yapısal verisi | Şirket ve okul sayfaları |
| `BreadcrumbList` (sonuçtaki "Home › People › …" yolu) | Kişi ve şirket sayfaları |
| `WebSite` (sonuçlarda site adı "Portfedia" olarak görünsün diye) | Ana sayfa |
| Paylaşım kartları (Open Graph görselleri) | Her profil ve şirket |
| `sitemap.xml` (yalnızca yayındaki ve gizli olmayan sayfalar), `robots.txt` | Kök dizin |
| Canonical adresler; eski profil adreslerinden kalıcı (301) yönlendirme | Tüm sayfalar |
| İncelemedeki profiller ve "hide from search engines" seçen profiller `noindex` | Otomatik |

## Senin yapacakların (ücretsiz)

1. **Google Search Console:** [search.google.com/search-console](https://search.google.com/search-console) → *Add property* → **Domain** → `portfedia.com`. Verilen TXT kaydını Cloudflare DNS'e ekle.
2. **Sitemaps** bölümüne `https://portfedia.com/sitemap.xml` ekle.
3. Birkaç profili **URL Inspection** ile kontrol et ve *Request indexing* de.
4. **[Rich Results Test](https://search.google.com/test/rich-results)** ile bir profil adresini test et; "Profile page" ve "Breadcrumbs" görünmeli.
5. Bing için [Bing Webmaster Tools](https://www.bing.com/webmasters) → Search Console'dan içe aktar.

## Kişiler kendi Bilgi Paneli için ne yapabilir

- Google'da kendi adını aratıp panel çıkıyorsa **"Bu bilgi panelini sahiplen"** ile doğrulayabilir ve panele Portfedia profilini ekleyebilir.
- Portfedia profilini LinkedIn, kişisel site ve sosyal hesaplarından **linklemek** profilin sıralamasını güçlendirir.
- Fotoğraflı, kaynaklı ve doğrulanmış (✓) profiller daha güvenilir görünür.

> Wikidata'ya toplu kayıt açmak Wikidata kurallarına aykırıdır ve spam sayılır; bunu yapmıyoruz.
