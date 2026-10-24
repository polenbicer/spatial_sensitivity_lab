# Amsterdam gelir verisi — site için hazırlık

Gelir yılı: 2023. Kaynak coğrafya: CBS 2025 mahalle sınırları.
Gösterge: özel hanelerin medyan standartlaştırılmış kullanılabilir geliri. Kişi medyanı, maaş, yoksulluk oranı veya vergi miktarı değildir.

Resmî dosya: https://download.cbs.nl/regionale-kaarten/Tijdreeks_wijken_en_buurten_inkomenvermogen2.XLSX
Resmî açıklama: https://www.cbs.nl/nl-nl/dossier/nederland-regionaal/wijk-en-buurtstatistieken/tijdreeks-wijk-en-buurtcijfers
REGIOTABEL2 sayfası F sütunu. Kaynak bin avro; hazırlanan income_median_standardized_eur alanı avrodur. Ham kaynak değeri ayrıca korunur.

## Kontrol sonucu
517 kaynak mahallesi: 420 yayımlanmış gelir, 97 yayımlanmamış değer. Sitenin 519 Amsterdam alanı ile kod üzerinden eşleştirme yapıldı. 517 kod ve ad eşleşti; hiçbir kaynak mahallesi eşleşmeden kalmadı. BU03639997 ve BU03639998 kaynakta bulunmadığı için boundary_code_unmatched durumunda. Bu iki alanın gelirinin sıfır olduğu veya veri üretilmediği sonucuna varılmaz. Son grid aktarımından önce sınır geometrilerinin aynı sürüm olduğu ayrıca kontrol edilmelidir.

## Dosyalar ve alanlar
- amsterdam_income_neighbourhoods_2023.csv/json: 517 kaynak mahalle, yerel kodlar, gelir ve eksik değer durumu.
- amsterdam_income_website_overlay.json: mevcut site id alanına göre eşleşmiş 519 satır. id değeri Amsterdam:BU... biçimindedir. Mevcut sitenin mahalle nesnelerine id üzerinden eklenebilir.
- income_median_standardized_eur: kaynak geliri, avro; yayımlanmamış değer JSON null, CSV boş hücre.
- score_income_deprivation: 0–100 aralığında ters yönlü, eşit değerlere eşit puan veren sıra yüzdeliği. Daha düşük gelir daha yüksek puan verir. Yalnızca sayısal gelir yayımlanan 420 mahalle referans alınır. Bir sağlık riski veya yoksulluk oranı değildir.
- income_status: published / not_published_reason_unspecified / boundary_code_unmatched.
- income_source_raw: kaynak hücrenin özgün içeriği. Nokta gibi işaretler sıfıra çevrilmez.
- metadata.json: kaynak, ham dosya SHA256 özeti, tanım, birim ve puanlama yöntemi.
- audit.json: eşleşme ve eksik değer sayıları.

## Eksik değer politikası
Yayımlanmış gerçek sıfırlar mevcutsa sıfır olarak korunur; eksik veri yerine sıfır yazılmaz. Bu kaynakta sayısal medyan gelirler pozitiftir. Eksik gelire puan verilmez. Ebeveyn bölge veya komşu alan ortalamasıyla doldurma yapılmadı. CBS açıklaması kesin yıllarda medyanın en az 100 gözlemde yayımlandığını belirtir; ancak her bir boş kaydın nedenini yalnızca bu genel kuraldan çıkarmadık. Eksik kayıtlar için kullanıcıya “Gelir değeri kaynakta yayımlanmamış” gösterilebilir. Kod eşleşmeyen kayıt için “Kaynak tabloda eşleşen mahalle kaydı yok” kullanılmalıdır. “Gelir sıfır” veya “bu veri hiç üretilmemiş” yazılmamalıdır.

## Kapsam
Bu paket sitenin veri formatına hazırlıktır. Canlı arayüz, mevcut sıralamalar, yaş göstergesi ve Brüksel verileri değiştirilmedi. 500m grid aktarımı yapılmadı. Mahalle medyanları alan ağırlıklarıyla birleştirildiğinde gerçek hücre medyanı elde edilmiş sayılmaz; sonraki aşamada ayrı bir aktarım yöntemi kararı gerekir. Brüksel ile yöntem uyumu hâlâ açıktır.

## Yeniden üretme
Paket içindeki prepare_amsterdam_income.py dosyası proje scripts klasöründe çalıştırılır. Ham XLSX data/source/amsterdam_income/CBS_income_time_series.xlsx konumunda bulunmalıdır. Script yinelenen kayıtları, eksik değere puan verilmemesini ve puan yönünü kontrol eder.
