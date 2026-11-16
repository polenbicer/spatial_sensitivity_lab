# 5.5 Duyarlılık sonuçları — önceden sabitlenen kurallar

Kayıt tarihi: 16 Kasım 2026, sonuçlar hesaplanmadan önce. Veri: v0.5.1 (commit 9e0d4f8 + 13791af), public/data/*_neighbourhoods.csv.

Evren: her şehirde ranking_eligible = True olan tam verili mahalleler (Brüksel 116, Amsterdam yayımlanan dosyadaki tam verili wijk'ler).
Senaryolar: 5.4'teki dört senaryo (eşit ⅓; sıcaklık, yeşil eksikliği, gelir öncelikli 60/20/20). Medyan ek özet olarak.
Sıra: ağırlıklı puan büyükten küçüğe, 1 = en yüksek öncelik; eşitlikte ortalama sıra.

Raporlanacak ölçüler
1. Senaryo çiftleri arasında Spearman sıra korelasyonu.
2. Üst çeyrek (sıranın ilk %25'i, tavan) örtüşmesi: her senaryo çifti için ortak mahalle sayısı ve Jaccard.
3. Dört senaryonun hepsinde üst çeyrekte kalan mahalleler ("sağlam üst grup") ve yalnız bir senaryoda üst çeyreğe giren mahalleler.
4. Her mahalle için en büyük sıra farkı (dört senaryo arasında max − min sıra); medyan ve dağılım.
5. Puan farkıyla okuma: eşit ağırlık senaryosunda üst çeyrek eşiğinin ±5 puan yakınında kalan mahalle sayısı (sınırda kırılgan grup).
6. Ek tarama: üç ağırlık 0,05 adımlarla, her biri en az 0,05, toplamı 1 (171 bileşim). Her mahalle için üst çeyrekte bulunduğu bileşim payı. Bu tarama ana senaryoların yerine geçmez.

Örnek mahalle seçim kuralı (Brüksel ve Amsterdam ayrı ayrı)
- Büyük değişim örneği: en büyük sıra farkına sahip mahalle (eşitlikte eşit ağırlık senaryosunda daha yüksek sıradaki).
- Küçük değişim örneği: eşit ağırlık senaryosunda ilk 10'da olup en küçük sıra farkına sahip mahalle.
- Eksik veri örneği: Brüksel'de geliri yayımlanmamış ("-") mahallelerden en büyük nüfuslu olanı değil, alfabetik ilk olanı (seçimin sonuca göre yapılmaması için); Amsterdam'da ranking_eligible = False olan alfabetik ilk mahalle.
