# Amsterdam gelir modeli — grid ve site dosyaları

Kaynak: CBS, özel hanelerin medyan standartlaştırılmış kullanılabilir geliri, 2023; mahalle sınırları 2025. Kaynak bin avro, hazırlanan gelir alanları avro. 517 kaynak mahalleden 420’sinde yayımlanmış gelir var, 97’sinde yok. Sitedeki iki ek su alanı kaynakta eşleşmiyor.

- Resmî Excel: https://download.cbs.nl/regionale-kaarten/Tijdreeks_wijken_en_buurten_inkomenvermogen2.XLSX
- Kaynak açıklaması: https://www.cbs.nl/nl-nl/dossier/nederland-regionaal/wijk-en-buurtstatistieken/tijdreeks-wijk-en-buurtcijfers
- Sınırlar: https://www.cbs.nl/nl-nl/dossier/nederland-regionaal/geografische-data/wijk-en-buurtkaart-2025
- Resmî sınır servisi: https://service.pdok.nl/cbs/wijken-en-buurten-2025/wfs/v1_0

## Aktarım
EPSG:3035’te grid ile mahallelerin tam poligon kesişimleri hesaplandı. Mahalle medyanları kesişim alanlarıyla ağırlıklandırıldı. Bu sonuç **gerçek hücre medyan geliri değil, mahalle gelirine dayalı temsili bir göstergedir**. Hane sayısı veya mahalle içi gelir dağılımı tahmin edilmedi.

Hücre alanının en az %99,9’unda yayımlanmış gelir bulunması gerekiyor. Bu araştırmacının tamlık tercihidir, CBS kuralı değildir. %0,1 geometri toleransıdır. Eksik değerler sıfıra çevrilmedi, komşu/üst bölge değerleriyle doldurulmadı. Kısmi kapsamdaki hücrelerin gelir göstergesi ve gelir puanı null bırakıldı. Yayımlanmama nedeni her mahalle için ayrıca bilinmiyor.

Resmî CBS/PDOK 2025 sınırları kontrol edildi: 519 kod eşleşiyor; aynı kodun site geometrisiyle örtüşmesi en az %99,5. Sonuç boundary_audit.json dosyasında.

## Sonuç ve puanlama
949 uygun hücrenin 365’i puanlandı; 584’ü yetersiz gelir kapsamı nedeniyle puansız. 1049 toplam hücrenin diğer 100’ü mevcut çevresel analizde zaten kapsam dışı. Kapsam alan yüzdesidir, hane yüzdesi değildir.

365 tam kapsamlı uygun hücrenin gelir göstergesi ters sıraya dizilir; eşit gelirler eşit puan alır. 0–100 ölçeğinde düşük gelir yüksek puan verir. Model: **%40 yüzey baskısı + %30 yeşil alan eksikliği + %30 düşük gelir**. Ağırlıklar analitik tercihtir. Bu model nüfus, 65+ veya yalnız yaşama göstergesi kullanmaz; yoksulluk oranını veya sağlık riskini ölçmez.

Mahalle senaryo özeti, uygun grid hücrelerinin alan ağırlıklı puanıdır. Uygun kesişim alanının en az %99,9’u gelir puanına sahip olmalıdır; 125 mahallede özet hesaplanabildi. Mevcut analitik alan kapsamı kuralı ayrıca geçerlidir. Bu özet özgün CBS mahalle medyanıyla aynı şey değildir. Senaryo sıra değişimleri iki seçenekte de puanı bulunan yerler arasında yeniden hesaplanır.

Brüksel için karşılaştırılabilir mahalle geliri henüz eklenmedi; Brüksel gelir modeli ve şehirler arası gelir sıralaması yok. Eski nüfuslu senaryolar karşılaştırma için korunuyor. Priority Lines ve dört senaryo medyanı eski nüfuslu senaryoları özetliyor.

## Dosyalar
- public/data/amsterdam_income.json: kaynak, yöntem, SHA256, kapsam, ağırlıklar; grid_rows ve neighbourhood_rows. Siteye grid_id / id ile eklenir.
- public/data/amsterdam_income_grid.csv: tüm Amsterdam grid kayıtları. Boş hücreler eksik veridir.
- grid_audit.json ve boundary_audit.json: güncel kontroller.
- amsterdam_income_neighbourhoods_2023.csv/json: özgün mahalle gelirleri; 420 mahalle arasındaki hazırlık puanı grid puanının referansı değildir.
- metadata.json ve audit.json: ilk mahalle hazırlığına ilişkin kaynak tanımı ve eşleştirme.

## Yeniden üretme
Önce scripts/prepare_amsterdam_income.py, sonra scripts/build_amsterdam_income_grid.py çalıştırılır. İlk script kaynak Excel’i, ikinci script mevcut grid ve mahalle geometrilerini ve boundary_audit.json kontrolünü kullanır. Gereken uzamsal paketler requirements-social.txt içinde. node scripts/validate-data.mjs formülü, eksikleri, puan yönünü ve kayıt sayılarını denetler.
