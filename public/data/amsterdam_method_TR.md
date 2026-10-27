# Amsterdam: mahalle ölçeğinde üç göstergeli model

27 Ekim 2026 yöntem açıklaması güncellemesi — hesap sürümü: amsterdam-native-wijk-v4

## Ne değişti?
Amsterdam 110 resmî wijk düzeyine geçirildi. 518 küçük buurt kullanılmıyor. Wijk gelirleri doğrudan yayımlanan kayıtlardır; buurt medyanlarının ortalaması alınmadı. Brüksel Monitoring alanlarıyla aynı idari birim veya tam eşdeğer büyüklük oldukları iddia edilmez. Amsterdam için 500 metre grid kullanılmıyor. Harita, sıralama, ana sayfa ve Priority Lines aynı resmî mahalle sınırlarını ve hesapları kullanır. Eski grid puanlarının ortalaması alınmadı: sıcaklık ve yeşil alan, kaynak rasterlerden her mahalle için yeniden hesaplandı. Gelir doğrudan resmî mahalle koduyla bağlandı.

## Sonuç ve eksikler
- Resmî mahalle sayısı: 110 (24 Mart 2022 tarihinde geçerli wijken).
- Yayımlanmış gelir kaydı: 108 mahalle.
- Üç göstergeyle sıralanabilen: 108 mahalle.
- Gelir kaydı olmayan: 2 wijk.
- Gelir kaydı olup sıcaklık gözlemi bulunmayan: 0 wijk.
- Eksik değer sıfır değildir. Bu mahalleler haritada ve tabloda kalır; birleşik puanları boş bırakılır.

## Gelir
Amsterdam O&S IHHINK_MED — Besteedbaar huishoudinkomen (mediaan): medyan kullanılabilir hane geliri, euro. Öğrenci haneleri, kurumlarda yaşayanlar ve gelir bilgisi bulunmayan haneler hesaplamanın dışındadır. Bu gösterge hane büyüklüğüne göre standartlaştırılmış değildir; önceki CBS 2023 standartlaştırılmış gelir serisinden farklıdır. Mahalleler arası hane yapısı farklılıkları sonucu etkileyebilir. Düşük gelir puanı göreli bir göstergedir, yoksulluk oranı değildir.

Amsterdam O&S, 27 Ekim 2026 tarihli kişisel yazışmada göstergenin 1 Ocak 2024 nüfusunu ve 2024 yılı boyunca elde edilen hane gelirini kullandığını doğruladı. 2024 verileri geçicidir; kesin verilerin 2027 içinde yayımlanması beklenmektedir. Yukarıdaki gruplar çıkarıldıktan sonra geriye kalan hane sayısı 100'den azsa alan için kayıt yayımlanmamaktadır. Bu eşik toplam nüfusa veya alan büyüklüğüne ilişkin değildir. Tam kaynak yanıtında 108 Wijk kaydı vardır; BA ve BB için kayıt yoktur. Bu iki alana ait dahil edilen hane sayıları ayrıca iletilmemiştir.

Yanıtta doğrulanan eski eşleştirme, 518 buurt poligonuna karşılık 418 gelir kaydı ve 100 eksik buurt içindir. Güncel sitede 110 wijk kullanılmaktadır; eski eksik sayısı güncel haritaya taşınmaz. Yanıt veren kişi başka resmî tablo veya dönemde bu eksikleri karşılayan veri bilmediğini belirtmiştir; bu, hiçbir alternatif bulunmadığının kesin kanıtı değildir. Yazışmanın aslı tez kayıtlarında saklanmaktadır.

Kaynak metadata tutarların yüzlüklere yuvarlandığını söyler; dönen API değerlerinin hepsi yüzün katı değildir. Bu tutarsızlık kaydedildi, API değerleri değiştirilmedi.

## Yüzey sıcaklığı
Projenin mevcut Landsat 8/9 JJA 2019–2023 bileşik rasterinin 30 metre çözünürlüklü summer_lst_median_c bandı kullanıldı. Mahalle içindeki, WorldCover'a göre su olmayan, sonlu sıcaklık değeri ve pozitif gözlem sayısı bulunan piksellerin medyanı alındı. summer_lst_valid_count bandı veri varlığını kontrol eder. Bu hava sıcaklığı veya doğrudan sağlık riski değildir.

Mevcut bileşik rasterden mahalle hesabı yeniden üretilebilir. Bileşiği ilk üreten sahne seçimi ve bulut maskeleme kodu mevcut dosyalarda bulunmadığından ilk uydu işlem zincirinin tümü yeniden üretilebilir diye sunulmaz. Geliri yayımlanan 108 wijk sıcaklık kapsamı eşiğini karşılar; sıcaklık uydurulmaz.

## Kamusal yeşil alan eksikliği
Amsterdam O&S 1 Ocak 2025 kamusal yeşil alan verisi kullanılır. ORPUBGROEN_P = kamusal yeşil alan (ha) / toplam kara alanı (ha). Kaynaktaki 0–1 oranı 100 ile çarpılarak yüzdeye çevrilir. Eksiklik = 100 − kamusal yeşil yüzdesi. Resmî wijk koduyla doğrudan eşleştirilir; 110 wijk için veri vardır. Özel bahçeler ve yeşil çatılar eklenmez. Erişim mesafesini veya soğutma etkisini ölçmez. Kaynak: https://onderzoek.amsterdam.nl/dataset/groen-in-amsterdam

Rasterlerde piksel merkezi mahalle sınırının içindeyse piksel dahil edilir (all_touched=False). WorldCover coğrafi rasterinde alan oranları satır enleminin kosinüsüyle ağırlıklandırılır; sınır pikselleri kesirli kesişimle bölünmez. Küçük veya dar mahallelerde piksel merkezine bağlı sınır etkisi kalabilir. Sıcaklık için su maskesi en yakın komşuyla 30 metreye aktarılır; sıcaklık değerleri türetilmez veya doldurulmaz.

## Normalizasyon ve sıralama
Üç gösterge de aynı 108 tam mahalle üzerinden 0–100 ortalama sıra yüzdeliğine dönüştürülür: 100 × (ortalama sıra − 1) / (N − 1). Gelirde yön ters çevrilir; düşük gelir yüksek puandır. Eşit değerler eşit puan alır. Ham göstergeler ve eksiklik nedenleri bütün mahalleler için indirme dosyasında bulunur. Göreli puanlar yalnızca tam veriyle sıralanan mahallelerde hesaplanır.

Kapsama için analitik tercihler: en az %99 arazi örtüsü verisi, su dışındaki mahalle piksellerinde en az %50 geçerli sıcaklık gözlemi, yayımlanmış gelir. Bunlar veri sağlayıcının şartları değildir. Alan kapsaması hane kapsaması değildir. Su oranı tek başına bir mahalleyi dışlamaz.

| Senaryo | Yüzey sıcaklığı | Green deficit | Düşük gelir |
|---|---:|---:|---:|
| Balanced | %40 | %30 | %30 |
| Low income first | %25 | %20 | %55 |
| Surface temperature first | %60 | %20 | %20 |
| Green deficit first | %25 | %55 | %20 |

Ağırlıklar değişmedi. Birleşik puan, üç yüzde puanının ağırlıklı toplamıdır. Scenario median dört senaryo puanının medyanıdır; kamusal uzlaşma anlamına gelmez. Bütün senaryolar aynı 108 mahalleyi kullanır. Sıra farkları ortak tam gözlemler üzerinden hesaplanır.

## Brüksel
Amsterdam hesabı korunmuştur. Brüksel daha sonra IBSA/Statbel 2498 medyan eşdeğer vergi sonrası geliriyle ayrı bir şehir içi model olarak eklenmiştir: 145 alan, 118 yayımlanmış gelir, 116 sıralanan mahalle, 27 yayımlanmayan gelir. Gelir tanımları farklıdır; şehirler arası gelir veya başarı karşılaştırması yapılmaz. Brüksel yöntem notu ve güncel iki şehir hesap kodu Brussels_Mahalle_Model_ve_Kaynaklar.zip paketindedir.

## Kaynaklar
- income: https://api.data.amsterdam.nl/v1/statistieken/v2/cijfers?indicator.id=3196&heeftBetrekkingOp=2024&_pageSize=1000
- definition: https://api.data.amsterdam.nl/v1/statistieken/v2/indicatoren?naam=IHHINK_MED
- boundaries: https://api.data.amsterdam.nl/v1/gebieden/wijken?_format=geojson&_pageSize=1000&geldigOp=2022-03-24
- worldcover: https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N51E003_Map.tif
- landsat: https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2
- O&S BBGA açıklaması: https://onderzoek.amsterdam.nl/dataset/basisbestand-gebieden-amsterdam-bbga
- ESA veri erişimi ve lisans: https://esa-worldcover.org/en/data-access
- Landsat 9 tanımı: https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC09_C02_T1_L2

## Dosyalar ve yeniden üretim
- Amsterdam_Mahalle_Modeli.csv: 110 mahallenin ham göstergeleri, eksiklik nedenleri ve dört puanı.
- Amsterdam_Mahalle_Sinirlari_ve_Puanlar.geojson: aynı mahalleler ve resmî geometrileri.
- Amsterdam_Model_ve_Kaynaklar.json: tablo, yöntem, kaynak adresleri ve dosya SHA256 değerleri.
- Amsterdam_Ham_Gelir_2024_API.json: sağlayıcının tam gelir yanıtı; mahalle dışındaki coğrafyalar da kaynakta olduğu gibi korunmuştur.
- Amsterdam_Mahalle_Model_ve_Kaynaklar.zip: resmî sınırlar, gelir yanıtı ve metadata, WorldCover rasteri, hesap kodu, bağımlılıklar ve çıktılar.
- Amsterdam_Landsat_Kaynak_Raster.zip: mevcut Landsat bileşiği. İki ZIP aynı çalışma klasörüne açılır; kaynak rasterler hesap kodunun beklediği dizine yerleşir.

Kod: scripts/build_amsterdam_neighbourhoods.py. Bağımlılıklar: requirements-neighbourhood.txt. Kaynaklar data/source/amsterdam_neighbourhood altında tutulur. Hesap: python3 scripts/rebuild_priority_models.py. Kontrol: node scripts/validate-data.mjs.

Önceki grid gelir dosyaları güncel modelin girdisi değildir. Eski sürümler ayrı arşivdedir.

## Wijk düzeyindeki eksikler
BA — Havens-West ve BB — Coenhaven/Minervahaven: kaynakta gelir kaydı yok; sıfır verilmez.
