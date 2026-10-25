# ARŞİV — GÜNCEL MODEL DEĞİL

Bu klasör önceki CBS 2023 gelir–500 metre grid çalışmasına aittir. Güncel Amsterdam modeli `data/prepared/amsterdam_neighbourhood/README_TR.md` ve `scripts/build_amsterdam_neighbourhoods.py` içindedir. Aşağıdaki eski açıklama geçmiş işlemi kaydetmek için korunmuştur.

# Güncel model: üç gösterge, dört ağırlık seçeneği

Tek gösterge seti: yüzey sıcaklığı, yeşil alan eksikliği ve düşük gelir. Ayrı bir gelir modeli yok. Nüfus ve geçirimsiz yüzey puanları sıralamadan çıkarıldı.

| Seçenek | Yüzey sıcaklığı | Yeşil alan eksikliği | Düşük gelir |
|---|---:|---:|---:|
| Dengeli | %40 | %30 | %30 |
| Düşük gelir öncelikli | %25 | %20 | %55 |
| Yüzey sıcaklığı öncelikli | %60 | %20 | %20 |
| Yeşil alan eksikliği öncelikli | %25 | %55 | %20 |

Sıcaklık: Landsat 8/9, Haziran–Ağustos 2019–2023 gözlemlerinin medyan yüzey sıcaklığı. Geçirimsiz yüzey oranı kullanılmaz. Şehir içindeki gözlemi bulunan uygun hücreler arasında 0–100 sıra puanı hesaplanır; yüksek sıcaklık yüksek puan verir.

Yeşil alan eksikliği: mevcut ESA WorldCover 2021 kaynaklı şehir içi puan korunur.

Gelir: CBS 2023 medyan standartlaştırılmış kullanılabilir hane geliri, 2025 mahalle sınırları. 420 mahallede gelir var, 97’sinde yayımlanmamış. İki su alanı kaynakta eşleşmiyor. Mahalle medyanları EPSG:3035 kesişim alanıyla grid’e aktarılır. Bu gerçek hücre medyanı değil, temsili göstergedir. Gelir kapsamı en az %99,9 olmalıdır; bu araştırmacının geometri toleransıdır, CBS kuralı değildir. Düşük gelir yüksek puan verir. Gelir yüzdeliğinin referansı 365 uygun hücredir.

949 uygun Amsterdam hücresinin 307’sinde üç gösterge de var. 584’ünde yeterli gelir kapsamı yok; diğer 58’inde gelir var fakat sıcaklık gözlemi yok. Dört senaryoda da aynı 307 hücre kullanılır. Eksik veri sıfıra çevrilmez. 118 mahalle sıralanabilir; mahalle için uygun kesişim alanının %99,9’unda model puanı ve mahallenin en az %50’sinde analitik kapsam gerekir.

Brüksel’de karşılaştırılabilir gelir bulunana kadar bütün sıralamalar puansızdır; eski nüfus hesabına geri dönülmez. Priority Lines da aynı üç göstergeli dört senaryoyu kullanır.

GeoJSON dosyaları artık güncel puanları doğrudan içerir; overlay birleştirmek gerekmez. Eski modelin Random Forest ve ölçek duyarlılığı sonuçları yeni hesabın doğrulaması olarak gösterilmez.

Kaynaklar:
- https://download.cbs.nl/regionale-kaarten/Tijdreeks_wijken_en_buurten_inkomenvermogen2.XLSX
- https://www.cbs.nl/nl-nl/dossier/nederland-regionaal/wijk-en-buurtstatistieken/tijdreeks-wijk-en-buurtcijfers
- https://www.cbs.nl/nl-nl/dossier/nederland-regionaal/geografische-data/wijk-en-buurtkaart-2025
- https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2
- https://worldcover2021.esa.int/

Yeniden hesaplama: python3 scripts/rebuild_priority_models.py
Kontrol: node scripts/validate-data.mjs
