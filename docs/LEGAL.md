# Hukuki uyum: sitede yapılanlar ve senin yapman gerekenler

Bu belge Portfedia'nın Türkiye (KVKK, 5651, 6563, 6502) ve AB (GDPR, DSA, ePrivacy) kurallarına uyumu için
kodda nelerin hazır olduğunu ve **kodla çözülemeyen, senin yapman gereken** adımları listeler.
Bu bir hukuki görüş değildir; yayına çıkmadan önce metinleri bir avukata kontrol ettirmeni öneririm.

## 1. Sitede hazır olanlar

| Konu | Nerede |
| --- | --- |
| Gizlilik politikası (GDPR m.13-14) | `/privacy` |
| KVKK aydınlatma metni (Türkçe, KVKK m.10 + Tebliğ) | `/kvkk` |
| Kullanım şartları (içerik lisansı, moderasyon, itiraz, cayma hakkı, uygulanacak hukuk) | `/terms` |
| Çerez politikası: sadece zorunlu çerezler, bu yüzden çerez banner'ı gerekmiyor | `/cookies` |
| Künye / yasal bildirim (6563, 5651, DSA iletişim noktası) | `/legal` |
| Kayıtta şartların kabulü ve aydınlatma metinlerinin okunduğu onayı. Açık rıza hizmet şartına bağlanmadı (KVKK'ya aykırı olurdu). | Kayıt formu |
| Verilerimi indir (erişim ve taşınabilirlik hakkı) ve hesabı sil (unutulma hakkı) | `/account` |
| Şikâyet ve kaldırma: doğruluk beyanı (DSA m.16), telif formu, şikâyet edene sonuç bildirimi | `/report`, `/copyright` |
| Gerekçeli karar: profil reddi e-postasında sebep; hesap askıya alma e-postasında sebep ve itiraz linki (DSA m.17) | Otomatik |
| İtiraz sistemi (DSA m.20) | `/appeal` |
| 5651 trafik kaydı: giriş kayıtları (IP, tarayıcı, saat) 1 yıl saklanır, sonra otomatik silinir | Veritabanı `loginlogs` |
| 16 yaş sınırı; doğum yılı saklanmaz | Kayıt |
| Kişi verisi içe aktarılmaz; Wikidata'dan sadece şirket bilgisi alınır (CC0) | Admin aracı |
| Reklam, takip çerezi, üçüncü taraf script yok | Tüm site |

## 2. Senin yapman gerekenler (kod bunları çözemez)

### Hemen
1. **HTTPS aç.** Şu an site `http://` üzerinden açılıyor; şifreler ve oturumlar şifresiz gidiyor. Bu, GDPR m.32 ve
   KVKK m.12'deki "uygun güvenlik önlemi" yükümlülüğüne aykırı. Bir alan adı al, Coolify'da domain olarak gir;
   Let's Encrypt sertifikası ücretsiz ve otomatik gelir. Sonra `SITE_URL`'yi `https://...` yap.
2. **Künye bilgilerini Coolify'a gir.** Boş olanlar sitede görünmez:
   - `COMPANY_NAME`: şirket unvanı ya da şahıs işletmesi adı
   - `COMPANY_ADDRESS`: açık adres
   - `CONTACT_EMAIL`: iletişim ve KVKK başvuru adresi
   - `COMPANY_PHONE`
   - `COMPANY_MERSIS`: MERSİS numarası (şirketse)
   - `COMPANY_TAX`: ör. `Kadıköy V.D. 1234567890`
   - `COMPANY_REGISTRY`: ör. `İstanbul Ticaret Sicili 123456`
   - `COMPANY_KEP`: KEP adresi (şirketlerde zorunlu)
3. **`CONTACT_EMAIL` kutusunu düzenli takip et.** 5651 kapsamındaki içerik kaldırma ve erişim engeli kararlarının
   kısa sürede (genelde 24 saat, bazı durumlarda 4 saat) uygulanması gerekir.

### Yurt dışına veri aktarımı (KVKK m.9)
Cloudflare (görseller), Resend (e-posta), Google/LinkedIn (giriş) ABD'de.
1. Cloudflare ve Resend panellerinde **Data Processing Addendum (DPA)**'yı kabul et (genelde tek tık).
2. KVKK Kurulu'nun yayımladığı **standart sözleşmeyi** bu sağlayıcılarla imzala ve imzadan sonra
   **5 iş günü içinde Kurul'a bildir**. Şablon ve bildirim formu: kvkk.gov.tr → Yurt Dışına Aktarım.
3. Alternatif: görseller için Avrupa'daki bir R2 bölgesini (EU jurisdiction) seçmek, AB tarafındaki riski azaltır.

### Şirketleşince / ücretli plan satmaya başlayınca
1. Vergi kaydı (şahıs şirketi yeterli) ve e-arşiv fatura.
2. Pro/Business satarken **ön bilgilendirme formu** ve **mesafeli satış sözleşmesi** (6502 s. Kanun, Mesafeli
   Sözleşmeler Yönetmeliği). Şartlarda 14 günlük cayma hakkı yazıyor; satıştan önce bu iki belgeyi e-postayla gönder.
3. Kampanya, duyuru gibi **ticari e-posta** atacaksan önce **İYS**'ye (iys.org.tr) kaydol ve kullanıcıdan ayrı onay al.
   Şu an site sadece hesap e-postası ve kapatılabilen bildirim gönderiyor; bunlar ticari ileti sayılmaz.

### Durumuna göre
- **VERBİS:** Yıllık çalışan sayısı 50'den az ve mali bilanço Kurul'un belirlediği eşiğin altındaysa, ana faaliyetin de
  özel nitelikli veri işlemek olmadığı için kayıt yükümlülüğünden muaf olursun. Güncel eşiği kvkk.gov.tr'den kontrol et.
- **AB temsilcisi (GDPR m.27):** AB'de yerleşik değilsen ama AB'deki kişilere bilerek hizmet veriyorsan, AB'de bir temsilci
  ataman gerekir. Bu yıllık ücretli bir hizmettir (çeşitli firmalar sunar). Atadığında bilgisini `EU_REPRESENTATIVE` değişkenine
  yaz; sitede kendiliğinden görünür. Başlangıçta sadece Türkiye'yi hedefliyorsan bu adım ertelenebilir.
- **Marka:** "Portfedia" adını TÜRKPATENT'te tescil ettirmek, başkasının adı kullanmasını engeller.

## 3. Moderasyonda dikkat edilecekler
- Profil reddederken ve hesap askıya alırken **sebebi mutlaka yaz**; e-postada kullanıcıya gider (DSA gerekçeli karar).
- Bir kişi kendisinin geçtiği bir kurum sayfasından adının kaldırılmasını isterse makul sürede kaldır (KVKK m.11, GDPR m.21).
- Telif şikâyetinde içeriği kaldır ve yükleyene bildir; tekrar eden ihlalcinin hesabını kapat.
- Wikipedia **metni ve görseli kopyalama**; şirket bilgisi için sadece Wikidata aracını kullan.
