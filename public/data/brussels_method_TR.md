# Brüksel: mahalle ölçeğinde üç göstergeli model

25 Ekim 2026 — brussels-native-neighbourhood-v1

## Veriler ve kapsam
Brüksel için IBSA/Statbel gösterge 2498 kullanılır: 2023 yılı sakinlerin medyan eşdeğer vergi sonrası geliri (euro). Monitoring des Quartiers'in 145 alanından 118'inde sayısal gelir vardır. Bu 118 mahallenin tümünde fiziksel göstergeler de kapsama şartını karşılar. Kaynakta “-” olan 27 alanın geliri ve birleşik puanı boş kalır; bu alanlar haritada gösterilir. Eksik değer sıfır değildir. Mahalle sınırları resmî Brüksel açık veri portalından indirildi. Gelir ve sınır eşleştirmesi adlarla değil resmî sayısal mahalle koduyla yapılır.

## Gelir tanımı ve iki şehir arasındaki fark
Brüksel göstergesi hane büyüklüğü/bileşimine göre düzeltilmiş, vergi kayıtlarına dayalı bir gelir göstergesidir. Çocuk yardımı ve sosyal entegrasyon geliri gibi vergiden muaf bazı gelirleri içermez; uluslararası kurum çalışanlarının gelirleri ile sermaye/gayrimenkul gelirleri eksik veya düşük temsil edilebilir. İdari kullanılabilir gelir (ADI) veya yoksulluk oranı değildir.

Amsterdam'da kullanılan O&S IHHINK_MED ise hane büyüklüğüne göre düzeltilmemiş medyan kullanılabilir hane geliridir. İki şehir aynı gelir tanımına sahip değildir. Her şehir kendi içinde ayrı normalleştirilir ve sıralanır. Euro düzeyleri ve puanlar şehirler arası gelir, kırılganlık veya yönetim başarısı karşılaştırması için kullanılmaz. Yüzdelik puanlara dönüştürmek tanım farkını gidermez. İki ayrı şehir içi ağırlık duyarlılığı deneyi yürütülür.

## Fiziksel göstergeler
Eski 500 metre grid puanları kullanılmadı. Her mahallede Landsat 8/9 JJA 2019–2023 mevcut bileşik rasterinden (30 m) sıcaklık ve ESA WorldCover 2021 v200 rasterinden (yaklaşık 10 m) yeşil örtü yeniden hesaplandı. Piksel merkezi poligonun içindeyse dahil edilir; sınır pikselleri kesirli bölünmez. Sıcaklık, pozitif gözlem sayılı ve sonlu sıcaklık değerli su dışındaki piksellerin medyanıdır. WorldCover su maskesi en yakın komşuyla sıcaklık rasterine aktarılır. Hava sıcaklığı değildir.

Yeşil alan = ağaç (10) + çayır/çimen (30) sınıflarının gözlenen su dışındaki alana oranıdır. Green deficit = 100 − bu oran. Coğrafi rasterde alan payları cos(enlem) ile ağırlıklandırılır. Tarım, çalı ve su bu dar yeşil tanımına dahil değildir; tam bir soğutma etkisi modeli sayılmaz.

Kapsama tercihleri: en az %99 gözlenen arazi örtüsü, su dışındaki piksellerde en az %50 geçerli sıcaklık, yayımlanmış gelir. Bunlar araştırmacı tercihleridir, sağlayıcı şartları değildir. Mevcut Landsat bileşiğinden mahalle hesabı yeniden üretilebilir; ilk bileşiği oluşturan sahne/bulut maskeleme kodu mevcut olmadığı için bütün uydu işlem zincirinin yeniden üretilebildiği iddia edilmez.

## Puanlar ve ağırlıklar
Üç gösterge aynı 118 tam mahalle üzerinden ayrı ayrı 0–100 ortalama sıra yüzdeliğine dönüştürülür: 100 × (sıra − 1)/(N − 1). Gelirin yönü ters çevrilir. Düşük gelir, yüksek sıcaklık ve yüksek green deficit yüksek puandır. Eşit değerler eşit puan alır.

| Senaryo | Sıcaklık | Green deficit | Düşük gelir |
|---|---:|---:|---:|
| Balanced | %40 | %30 | %30 |
| Low income first | %25 | %20 | %55 |
| Surface temperature first | %60 | %20 | %20 |
| Green deficit first | %25 | %55 | %20 |

Ağırlıklar değiştirilmedi. Scenario median dört ağırlıklı toplamın medyanıdır; demokratik uzlaşma anlamına gelmez. Ana sayfa, Rankings ve Priority Lines aynı puanları ve sınırları okur. Yeni tahmin doğrulaması veya ölçek duyarlılığı başarısı iddia edilmez.

## Kaynaklar
- income: https://geodata.perspective.brussels/api/geodata/mdq/table/65707/fr
- definition: https://monitoringdesquartiers.brussels/Indicator/IndicatorPage/2498?tab=Sheet&SubTheme=28
- definition_report: https://ibsa.brussels/sites/default/files/publication/documents/Pano_SE25_FR.pdf
- boundaries: https://opendata.brussels.be/api/explore/v2.1/catalog/datasets/quartiers-du-monitoring-des-quartiers-ibsa-perspective-rbc/exports/geojson
- worldcover: https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N48E003_Map.tif
- landsat: https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2

## Yeniden üretim
`requirements-neighbourhood.txt` bağımlılıklarıyla `python3 scripts/fetch_brussels_neighbourhood_sources.py`, ardından `python3 scripts/rebuild_priority_models.py` ve `node scripts/validate-data.mjs` çalıştırılır. Brüksel hesabı tek başına `python3 scripts/build_brussels_neighbourhoods.py` ile yenilenebilir. Mevcut ortak Landsat rasteri önceki Amsterdam_Landsat_Kaynak_Raster.zip paketindedir; beklenen yol `data/source/amsterdam_neighbourhood/landsat_lst_2019_2023_jja.tif`.

Brussels_Mahalle_Model_ve_Kaynaklar.zip resmî gelir XLSX dosyasını, indirilen sınırları, WorldCover rasterini, hesap kodunu, bağımlılıkları ve çıktıları içerir. Her girdinin SHA256 değeri model metadata dosyasındadır. Önceki Amsterdam çıktıları değiştirilmedi; sınırları, ham değerleri ve senaryo puanları aynen korundu.
