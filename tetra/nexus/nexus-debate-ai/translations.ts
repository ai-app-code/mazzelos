
export type Language = 'tr';

export const translations = {
  tr: {
    nav: {
      dashboard: 'Kontrol Paneli',
      catalog: 'Model Kataloğu',
      pool: 'Model Havuzu',
      debate: 'Münazara Arenası',
      api: 'API Anahtarları',
      settings: 'Ayarlar',
      status: 'Sistem Durumu',
      operational: 'Çalışıyor'
    },
    dashboard: {
      title: 'Komuta Merkezi',
      subtitle: 'Analitikler, maliyet takibi ve münazara arşivleri.',
      totalSpend: 'Toplam Harcama',
      totalTokens: 'İşlenen Token',
      debatesRun: 'Simülasyon Sayısı',
      costTrend: 'Maliyet Trendi',
      providerDistribution: 'Sağlayıcı Dağılımı',
      recentActivity: 'Son Aktiviteler',
      noActivity: 'Henüz bir simülasyon kaydı bulunamadı.',
      view: 'İncele'
    },
    catalog: {
      title: 'Model Merkezi',
      subtitle: 'Küresel sağlayıcılardan yüksek performanslı LLM\'lere bağlanın.',
      searchPlaceholder: 'Model ara...',
      inputCost: 'Girdi / 1M',
      outputCost: 'Çıktı / 1M',
      connect: 'Anahtar Bağla',
      connected: 'Sistem Hazır',
      offline: 'ÇEVRİMDIŞI',
      online: 'BAĞLI',
      poolEmpty: 'Havuzda model seçili değil'
    },
    pool: {
      title: 'Seçim Havuzu',
      subtitle: 'Bir sonraki münazara için kısa listenizi yönetin.',
      empty: 'Havuzunuz boş.',
      emptyDesc: 'Model Kataloğuna gidin ve eklemek için modelleri seçin.',
      goToCatalog: 'Kataloğa Git',
      clearAll: 'Havuzu Temizle',
      goToSetup: 'Bu Modellerle Münazara Başlat',
      remove: 'Havuzdan Çıkar'
    },
    setup: {
      title: 'Simülasyon Ayarları',
      subtitle: 'Yapay sinir ağlarının savaşını veya işbirlikçi çözüm sürecini yönetin.',
      topicLabel: 'Konu / Problem Tanımı',
      roundsLabel: 'Etkileşim Turu',
      addParticipant: 'Ajan Ekle',
      startDebate: 'Sistemi Başlat',
      role: 'Rol',
      backbone: 'Model Altyapısı',
      persona: 'Sistem Promptu',
      remove: 'Kaldır',
      mode: 'Simülasyon Modu',
      modeAdversarial: 'Çatışmalı (Münazara)',
      modeCollaborative: 'Mühendislik (Somut Mimari)',
      editPrompt: 'Sistem Promptunu Düzenle',
      promptModalTitle: 'Sistem Prompt Yapılandırması',
      promptModalDesc: 'Bu ajan için temel kişiliği, kısıtlamaları ve hedefleri tanımlayın.',
      close: 'Kaydet & Kapat',
      autoFinishLabel: 'Onay Protokolü',
      autoFinishDesc: 'Sadece tüm ajanlar nihai planı [ONAYLIYORUM] dediğinde bitir.',
      populatePool: 'Havuzdan Doldur',
      poolEmpty: 'Seçim Havuzu Boş',
      showAllModels: 'Seçilmeyen diğer modelleri göster',
      onlyPoolModels: 'Sadece Havuzdaki modeller listeleniyor'
    },
    arena: {
      metrics: 'Canlı Metrikler',
      cashBurn: 'NAKİT YAKIMI',
      thinking: 'Düşünüyor...',
      inputPlaceholder: 'Yönetici olarak müdahale et...',
      inject: 'Dahil Ol',
      endDebate: 'Sonlandır',
      round: 'TUR',
      autoMode: 'OTO',
      semiMode: 'YARI',
      modelLabel: 'MODEL',
      nextTurn: 'Sonraki Tur',
      pause: 'Duraklat',
      ratificationTitle: 'YÖNETİCİ ONAY KONSOLU',
      ratificationDesc: 'Moderatör nihai bir plan sundu. Kararınız nedir?',
      approve: 'ONAYLA & BİTİR',
      reject: 'VETO ET & REVİZE İSTE',
      rejectPlaceholder: 'Reddetme gerekçenizi girin (örn. Veritabanı seçimi hatalı, maliyet çok yüksek...)'
    },
    api: {
      title: 'Sağlayıcı Bağlantıları',
      subtitle: 'Erişim kimlik bilgilerini yönetin. Anahtarlar cihazınızda saklanır.',
      enterKey: 'API Anahtarı Girin',
      connect: 'Bağlan',
      disconnect: 'Bağlantıyı Kes',
      secure: 'Anahtarlar tarayıcınızda yerel olarak saklanır.',
      systemManaged: 'Sistem Tarafından Yönetiliyor'
    }
  }
};
