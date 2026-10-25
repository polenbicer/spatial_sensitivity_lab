# Amsterdam: mahalle ölçeğinde üç göstergeli model

25 Ekim 2026 — sürüm: amsterdam-native-buurt-v3

## Ne değişti?
Amsterdam için 500 metre grid kullanılmıyor. Harita, sıralama, ana sayfa ve Priority Lines aynı resmî mahalle sınırlarını ve hesapları kullanır. Eski grid puanlarının ortalaması alınmadı: sıcaklık ve yeşil alan, kaynak rasterlerden her mahalle için yeniden hesaplandı. Gelir doğrudan resmî mahalle koduyla bağlandı.

## Sonuç ve eksikler
- Resmî mahalle sayısı: 518 (24 Mart 2022 tarihinde geçerli buurten).
- Yayımlanmış gelir kaydı: 418 mahalle.
- Üç göstergeyle sıralanabilen: 411 mahalle.
- Gelir kaydı olmayan: 100 mahalle.
- Gelir kaydı olup sıcaklık gözlemi bulunmayan: 7 mahalle.
- Eksik değer sıfır değildir. Bu mahalleler haritada ve tabloda kalır; birleşik puanları boş bırakılır.

## Gelir
Amsterdam O&S IHHINK_MED — Besteedbaar huishoudinkomen (mediaan): medyan kullanılabilir hane geliri, euro. Öğrenci haneleri ve kurumlarda yaşayanlar tanımın dışındadır. Bu gösterge hane büyüklüğüne göre standartlaştırılmış değildir; önceki CBS 2023 standartlaştırılmış gelir serisinden farklıdır. Mahalleler arası hane yapısı farklılıkları sonucu etkileyebilir. Düşük gelir puanı göreli bir göstergedir, yoksulluk oranı değildir.

API dönem etiketi 2024, zaman türü Peildatum, tarih 1 Ocak 2024'tür. Bunun gerçek vergi gelir referans yılı olduğu ayrıca doğrulanmadığı için kesin gelir yılı olarak sunulmaz. Kaynak tanımı en az 100 hanesi olan alanları yayımladığını söyler. Her eksik mahallenin nedeninin bu olduğu varsayılmadı. Tam yanıt içinde 2024 dönemine ait 418 Buurt kaydı vardır; diğer 100 resmî kod için kayıt yoktur.

Kaynak metadata tutarların yüzlüklere yuvarlandığını söyler; dönen API değerlerinin hepsi yüzün katı değildir. Bu tutarsızlık kaydedildi, API değerleri değiştirilmedi.

## Yüzey sıcaklığı
Projenin mevcut Landsat 8/9 JJA 2019–2023 bileşik rasterinin 30 metre çözünürlüklü summer_lst_median_c bandı kullanıldı. Mahalle içindeki, WorldCover'a göre su olmayan, sonlu sıcaklık değeri ve pozitif gözlem sayısı bulunan piksellerin medyanı alındı. summer_lst_valid_count bandı veri varlığını kontrol eder. Bu hava sıcaklığı veya doğrudan sağlık riski değildir.

Mevcut bileşik rasterden mahalle hesabı yeniden üretilebilir. Bileşiği ilk üreten sahne seçimi ve bulut maskeleme kodu mevcut dosyalarda bulunmadığından ilk uydu işlem zincirinin tümü yeniden üretilebilir diye sunulmaz. Yedi mahallede bileşikte gözlem yoktur; başka göstergeden sıcaklık uydurulmaz.

## Green deficit
ESA WorldCover 2021 v200 rasterinden ağaç örtüsü (10) ve çayır/çimen (30) sınıfları toplandı. Payda, mahallede gözlenen su dışındaki alandır. Eksiklik = 100 − yeşil alan yüzdesi. Su sınıfı 80 paydadan çıkarılır; suyun yeşil alan eksikliği olarak değerlendirilmesi önlenir. Tarım, çalı ve diğer sınıflar bu dar göstergeye eklenmedi. Bu analitik seçim bütün soğutma etkilerini ölçmez.

Rasterlerde piksel merkezi mahalle sınırının içindeyse piksel dahil edilir (all_touched=False). WorldCover coğrafi rasterinde alan oranları satır enleminin kosinüsüyle ağırlıklandırılır; sınır pikselleri kesirli kesişimle bölünmez. Küçük veya dar mahallelerde piksel merkezine bağlı sınır etkisi kalabilir. Sıcaklık için su maskesi en yakın komşuyla 30 metreye aktarılır; sıcaklık değerleri türetilmez veya doldurulmaz.

## Normalizasyon ve sıralama
Üç gösterge de aynı 411 tam mahalle üzerinden 0–100 ortalama sıra yüzdeliğine dönüştürülür: 100 × (ortalama sıra − 1) / (N − 1). Gelirde yön ters çevrilir; düşük gelir yüksek puandır. Eşit değerler eşit puan alır. Ham göstergeler ve eksiklik nedenleri bütün mahalleler için indirme dosyasında bulunur. Göreli puanlar yalnızca tam veriyle sıralanan mahallelerde hesaplanır.

Kapsama için analitik tercihler: en az %99 arazi örtüsü verisi, su dışındaki mahalle piksellerinde en az %50 geçerli sıcaklık gözlemi, yayımlanmış gelir. Bunlar veri sağlayıcının şartları değildir. Alan kapsaması hane kapsaması değildir. Su oranı tek başına bir mahalleyi dışlamaz.

| Senaryo | Yüzey sıcaklığı | Green deficit | Düşük gelir |
|---|---:|---:|---:|
| Balanced | %40 | %30 | %30 |
| Low income first | %25 | %20 | %55 |
| Surface temperature first | %60 | %20 | %20 |
| Green deficit first | %25 | %55 | %20 |

Ağırlıklar değişmedi. Birleşik puan, üç yüzde puanının ağırlıklı toplamıdır. Scenario median dört senaryo puanının medyanıdır; kamusal uzlaşma anlamına gelmez. Bütün senaryolar aynı 411 mahalleyi kullanır. Sıra farkları ortak tam gözlemler üzerinden hesaplanır.

## Brüksel
Amsterdam hesabı korunmuştur. Brüksel daha sonra IBSA/Statbel 2498 medyan eşdeğer vergi sonrası geliriyle ayrı bir şehir içi model olarak eklenmiştir: 145 alan, 118 sıralanan mahalle, 27 yayımlanmayan gelir. Gelir tanımları farklıdır; şehirler arası gelir veya başarı karşılaştırması yapılmaz. Brüksel yöntem notu ve güncel iki şehir hesap kodu Brussels_Mahalle_Model_ve_Kaynaklar.zip paketindedir.

## Kaynaklar
- income: https://api.data.amsterdam.nl/v1/statistieken/v2/cijfers?indicator.id=3196&heeftBetrekkingOp=2024&_pageSize=1000
- definition: https://api.data.amsterdam.nl/v1/statistieken/v2/indicatoren?naam=IHHINK_MED
- boundaries: https://api.data.amsterdam.nl/v1/gebieden/buurten?_format=geojson&_pageSize=1000&geldigOp=2022-03-24
- worldcover: https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N51E003_Map.tif
- landsat: https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2
- O&S BBGA açıklaması: https://onderzoek.amsterdam.nl/dataset/basisbestand-gebieden-amsterdam-bbga
- ESA veri erişimi ve lisans: https://esa-worldcover.org/en/data-access
- Landsat 9 tanımı: https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC09_C02_T1_L2

## Dosyalar ve yeniden üretim
- Amsterdam_Mahalle_Modeli.csv: 518 mahallenin ham göstergeleri, eksiklik nedenleri ve dört puanı.
- Amsterdam_Mahalle_Sinirlari_ve_Puanlar.geojson: aynı mahalleler ve resmî geometrileri.
- Amsterdam_Model_ve_Kaynaklar.json: tablo, yöntem, kaynak adresleri ve dosya SHA256 değerleri.
- Amsterdam_Ham_Gelir_2024_API.json: sağlayıcının tam gelir yanıtı; mahalle dışındaki coğrafyalar da kaynakta olduğu gibi korunmuştur.
- Amsterdam_Mahalle_Model_ve_Kaynaklar.zip: resmî sınırlar, gelir yanıtı ve metadata, WorldCover rasteri, hesap kodu, bağımlılıklar ve çıktılar.
- Amsterdam_Landsat_Kaynak_Raster.zip: mevcut Landsat bileşiği. İki ZIP aynı çalışma klasörüne açılır; kaynak rasterler hesap kodunun beklediği dizine yerleşir.

Kod: scripts/build_amsterdam_neighbourhoods.py. Bağımlılıklar: requirements-neighbourhood.txt. Kaynaklar data/source/amsterdam_neighbourhood altında tutulur. Hesap: python3 scripts/rebuild_priority_models.py. Kontrol: node scripts/validate-data.mjs.

Önceki grid gelir dosyaları güncel modelin girdisi değildir. Eski sürümler ayrı arşivdedir.
