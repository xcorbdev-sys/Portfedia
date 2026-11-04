import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_UPDATED_TR, operator, RETENTION } from "@/lib/legal";
import { LegalOperator } from "@/components/LegalOperator";

// The KVKK information notice is published in Turkish for people in Türkiye; the rest of the site is English.
export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında Portfedia aydınlatma metni.",
};

export default async function KvkkPage() {
  await connection();
  const o = operator();
  return (
    <div className="narrow prose" lang="tr">
      <h1>Kişisel Verilerin Korunması Hakkında Aydınlatma Metni</h1>
      <p className="muted">
        Son güncelleme: {LEGAL_UPDATED_TR}. English version: <Link href="/privacy" lang="en">Privacy Policy</Link>.
      </p>
      <p>
        Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) madde 10 ve Aydınlatma Yükümlülüğünün Yerine
        Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca hazırlanmıştır.
      </p>

      <h2>1. Veri sorumlusu</h2>
      <LegalOperator lang="tr" />

      <h2>2. İşlenen kişisel veriler, amaçlar ve hukuki sebepler</h2>
      <table>
        <thead>
          <tr><th>Veri</th><th>Amaç</th><th>Hukuki sebep (KVKK m.5/2)</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Kimlik ve iletişim: ad soyad, e-posta; şifrenin özeti (hash); Google/LinkedIn ile girişte hesap kimliği</td>
            <td>Üyelik hesabının açılması ve yönetimi, giriş, hesap bildirimlerinin gönderilmesi</td>
            <td>Sözleşmenin kurulması ve ifası (c)</td>
          </tr>
          <tr>
            <td>Yaş sınırının karşılandığı bilgisi (doğum yılı saklanmaz)</td>
            <td>Asgari yaş şartının sağlanması</td>
            <td>Hukuki yükümlülük (ç), meşru menfaat (f)</td>
          </tr>
          <tr>
            <td>Profil bilgileri: fotoğraf, unvan, iş ve eğitim geçmişi, biyografi, bağlantılar</td>
            <td>Kullanıcının kendi talebiyle profilinin yayımlanması; herkese açık profili olan kullanıcının takip ettiği sayfaların ve takipçilerinin profilde gösterilmesi</td>
            <td>Sözleşmenin ifası (c); ilgili kişinin kendisi tarafından alenileştirilmesi (d)</td>
          </tr>
          <tr>
            <td>Doğrulanan iş e-posta adresleri</td>
            <td>Pozisyon ve kurum sahipliği doğrulaması (herkese açık gösterilmez)</td>
            <td>Sözleşmenin ifası (c)</td>
          </tr>
          <tr>
            <td>Sayfa geçmişi, şikâyet, itiraz ve moderasyon kayıtları</td>
            <td>İçerikten doğan sorumluluk, şikâyet ve resmi taleplerin yönetimi, kötüye kullanımın önlenmesi</td>
            <td>Hukuki yükümlülük (ç; 5651 sayılı Kanun), bir hakkın tesisi, kullanılması veya korunması (e), meşru menfaat (f)</td>
          </tr>
          <tr>
            <td>İşlem güvenliği: giriş kayıtları (IP adresi, tarayıcı, tarih ve saat)</td>
            <td>Bilgi güvenliği ve 5651 sayılı Kanun kapsamında trafik bilgisinin saklanması</td>
            <td>Hukuki yükümlülük (ç), meşru menfaat (f)</td>
          </tr>
          <tr>
            <td>Bize gönderdiğiniz mesajlar (e-posta, şikâyet ve itiraz formları)</td>
            <td>Taleplerin cevaplanması</td>
            <td>Meşru menfaat (f), hukuki yükümlülük (ç)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Hizmetin sunulması için açık rızanıza dayanan bir işleme yapılmamaktadır. Reklam, profilleme veya kişisel verilerin satışı
        yapılmaz; sonuçları yalnızca otomatik işlemeye dayanan kararlar alınmaz.
      </p>

      <h2>3. Toplama yöntemi</h2>
      <p>
        Kişisel veriler; üyelik ve profil formları, Google/LinkedIn ile giriş, şikâyet ve itiraz formları, e-posta yazışmaları ve
        sitenin kullanımı sırasında otomatik yollarla (giriş kayıtları, güvenlik amaçlı sayaçlar, zorunlu çerezler) elektronik ortamda
        toplanır. Sitedeki tüm içerik kayıtlı kullanıcılar tarafından eklenir; başka web sitelerinden veya platformlardan veri
        kopyalanmaz ya da aktarılmaz. Kurum sayfaları topluluk tarafından yazılır.
      </p>

      <h2>4. Aktarım</h2>
      <p>Kişisel veriler, yukarıdaki amaçlarla sınırlı olarak şu alıcılara aktarılabilir:</p>
      <ul>
        <li>Barındırma (sunucu ve veritabanı) hizmeti sağlayıcımıza,</li>
        <li>Görsellerin saklanması için Cloudflare, Inc.&apos;e (ABD),</li>
        <li>Hesap e-postalarının gönderimi için Resend&apos;e (ABD),</li>
        <li>Yalnızca bu yöntemle giriş yapmayı seçerseniz Google ve LinkedIn&apos;e (kendi gizlilik politikalarına tabi ayrı veri sorumluları olarak),</li>
        <li>Yeni şifrenin sızıntı kontrolü için şifre özetinin yalnızca ilk beş karakteri Have I Been Pwned hizmetine (şifre ve e-posta gönderilmez),</li>
        <li>Talep halinde ve kanunen yetkili kamu kurum ve kuruluşları ile yargı mercilerine.</li>
      </ul>
      <p>
        Yurt dışına aktarım, KVKK madde 9 uyarınca Kişisel Verileri Koruma Kurulu tarafından ilan edilen standart sözleşmeler
        imzalanarak ve Kurul&apos;a bildirilerek yapılır.
      </p>

      <h2>5. Saklama süreleri</h2>
      <ul>
        <li>Hesap ve profil verileri: hesap silinene kadar. Hesabı Hesap sayfasından dilediğiniz an silebilirsiniz.</li>
        <li>Giriş kayıtları: {RETENTION.loginLogDays / 365} yıl (5651 sayılı Kanun); süre dolunca otomatik silinir. Hesap silinse de bu süre boyunca saklanır.</li>
        <li>Şikâyet, itiraz ve moderasyon kayıtları: en fazla {RETENTION.reportsYears} yıl.</li>
        <li>Değiştirilen veya silinen görseller: {RETENTION.imageTrashDays} gün; yedekler: {RETENTION.backupsDays} gün içinde üzerine yazılır.</li>
      </ul>
      <p>Süresi dolan veriler silinir, yok edilir veya anonim hale getirilir.</p>

      <h2>6. KVKK madde 11 kapsamındaki haklarınız</h2>
      <p>Veri sorumlusuna başvurarak;</p>
      <ul>
        <li>kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme,</li>
        <li>işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
        <li>yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
        <li>eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
        <li>KVKK madde 7&apos;deki şartlar çerçevesinde silinmesini veya yok edilmesini isteme,</li>
        <li>düzeltme, silme ve yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
        <li>münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme,</li>
        <li>kanuna aykırı işleme sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
      </ul>
      <p>haklarına sahipsiniz.</p>

      <h2>7. Başvuru yöntemi</h2>
      <p>
        Verilerinizin bir kopyasını indirmek, profilinizi düzeltmek ve hesabınızı silmek için <Link href="/account">Hesap</Link>{" "}
        sayfasını kullanabilirsiniz. Diğer talepleriniz için Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ uyarınca;
        kimliğinizi ve talebinizi içeren başvurunuzu sistemimizde kayıtlı e-posta adresinizden{" "}
        <a href={`mailto:${o.email}`}>{o.email}</a> adresine
        {o.kep ? <>, KEP ile {o.kep} adresine</> : null}
        {o.address ? <> veya yazılı olarak {o.address} adresine</> : null} iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz
        olarak sonuçlandırılır. Başvurunuzun reddedilmesi veya cevabı yetersiz bulmanız halinde Kişisel Verileri Koruma Kurulu&apos;na
        şikâyette bulunabilirsiniz.
      </p>
    </div>
  );
}
