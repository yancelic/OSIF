export type Language = 'tr' | 'en';

export const translations = {
  tr: {
    // Navigasyon sekmeleri
    tabUpcoming: 'Yaklaşanlar',
    tabContacts: 'Kişiler',
    tabSettings: 'Ayarlar',
    tabDeveloper: 'Geliştirici',

    // Dashboard
    filterAll: 'Tümü',
    filterNotStarted: 'Başlanmadı',
    filterSearching: 'Araştırılıyor',
    filterReady: 'Hazır',
    giftsReady: 'hediye hazır',
    noOneYet: 'Henüz kimse yok.',
    noOneInFilter: 'Bu durumda kimse yok.',
    addFirstContact: 'İlk kişinizi eklemek için + butonuna dokunun.',
    daysLeft: 'gün kaldı',
    today: 'Bugün',
    searchPlaceholder: 'Kişi veya zevk ara…',

    // Kişi Detay Ekranı
    contactDetail: 'Kişi detayı',
    deleteConfirmTitle: '{name} silinsin mi?',
    deleteConfirmMsg: 'Kişi ve tüm hediye notları kalıcı olarak silinir.',
    delete: 'Sil',
    cancel: 'Vazgeç',
    notes: 'Notlar',
    noNotes: 'Henüz not eklenmedi.',
    notesPlaceholder: 'Özel notlar, tercihler…',
    giftStatus: 'Hediye Durumu',
    giftBudget: 'Hediye Bütçesi',
    targetBudget: 'Hedeflenen',
    spentBudget: 'Harcanan',
    budgetRemaining: 'Kalan',
    budgetExceeded: 'Aşıldı',
    sizes: 'Bedenler',
    clothingSize: 'Kıyafet',
    shoeSize: 'Ayakkabı',
    notSpecified: 'Belirtilmedi',
    giftIdeas: 'Hediye fikirleri',
    likes: 'Zevkler',
    dislikes: 'Hoşlanmadıkları',
    pastGifts: 'Geçmiş Hediyeler',
    addGift: '+ Hediye Ekle',
    close: 'Kapat',
    save: 'Kaydet',
    buyGiftQuestion: 'Bu kişi için hediye alınacak mı?',
    giftTrackingEnabled: 'Hediye takibi açık',
    giftTrackingDisabled: 'Yalnızca doğum günü hatırlatılacak',

    // Ayarlar Ekranı
    settings: 'Ayarlar',
    appearance: 'Görünüm & Tema',
    themeLight: 'Açık',
    themeDark: 'Koyu',
    language: 'Dil Seçeneği',
    distribution: 'Doğum Günü Dağılımı',
    zodiacDistribution: 'Burç Dağılımı',
    widgetTitle: 'Ana Ekran Widget\'ı',
    widgetPreview: 'OSIF Hızlı Bakış',
    widgetPreviewLabel: 'Önizleme',
    addWidgetBtn: 'Ana Ekrana Widget Ekle',
    widgetSupportTitle: 'Ana Ekran Widget Desteği',
    widgetSupportDesc: 'Widget ekleme butonu Android başlatıcınıza istek gönderir. Ayrıca telefonunuzun ana ekranına basılı tutup Widget\'lar menüsünden OSIF widget\'ını seçerek de yerleştirebilirsiniz.',
    dataManagement: 'Veri Yönetimi',
    exportJson: 'JSON Dışa Aktar',
    importJson: 'JSON İçe Aktar',
    importCalendar: 'Takvim & Rehberden İçe Aktar',
    culturalCatalog: 'Kültürel Özel Günler Kataloğu',
    importCalendarDesc: 'Cihaz takvimindeki ve rehberdeki doğum günlerini tara',
    culturalCatalogDesc: 'Anneler Günü, Babalar Günü, Sevgililer Günü, Yılbaşı şablonları',
  },
  en: {
    // Navigation tabs
    tabUpcoming: 'Upcoming',
    tabContacts: 'Contacts',
    tabSettings: 'Settings',
    tabDeveloper: 'Developer',

    // Dashboard
    filterAll: 'All',
    filterNotStarted: 'Not Started',
    filterSearching: 'Searching',
    filterReady: 'Ready',
    giftsReady: 'gifts ready',
    noOneYet: 'No contacts yet.',
    noOneInFilter: 'No contacts in this status.',
    addFirstContact: 'Tap + to add your first contact.',
    daysLeft: 'days left',
    today: 'Today',
    searchPlaceholder: 'Search name or taste…',

    // Contact Detail Screen
    contactDetail: 'Contact details',
    deleteConfirmTitle: 'Delete {name}?',
    deleteConfirmMsg: 'Contact and all gift notes will be permanently deleted.',
    delete: 'Delete',
    cancel: 'Cancel',
    notes: 'Notes',
    noNotes: 'No notes added yet.',
    notesPlaceholder: 'Special notes, preferences…',
    giftStatus: 'Gift Status',
    giftBudget: 'Gift Budget',
    targetBudget: 'Target',
    spentBudget: 'Spent',
    budgetRemaining: 'Remaining',
    budgetExceeded: 'Exceeded',
    sizes: 'Sizes',
    clothingSize: 'Clothing',
    shoeSize: 'Shoes',
    notSpecified: 'Not specified',
    giftIdeas: 'Gift ideas',
    likes: 'Likes',
    dislikes: 'Dislikes',
    pastGifts: 'Past Gifts',
    addGift: '+ Add Gift',
    close: 'Close',
    save: 'Save',
    buyGiftQuestion: 'Buy a gift for this person?',
    giftTrackingEnabled: 'Gift tracking active',
    giftTrackingDisabled: 'Birthday reminder only',

    // Settings Screen
    settings: 'Settings',
    appearance: 'Appearance & Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    distribution: 'Birthday Distribution',
    zodiacDistribution: 'Zodiac Distribution',
    widgetTitle: 'Home Screen Widget',
    widgetPreview: 'OSIF Quick Glance',
    widgetPreviewLabel: 'Preview',
    addWidgetBtn: 'Add Widget to Home Screen',
    widgetSupportTitle: 'Home Screen Widget Support',
    widgetSupportDesc: 'The Add Widget button sends a request to your Android launcher. You can also touch and hold your home screen to place the OSIF widget manually.',
    dataManagement: 'Data Management',
    exportJson: 'Export JSON',
    importJson: 'Import JSON',
    importCalendar: 'Import from Calendar & Contacts',
    culturalCatalog: 'Cultural Events Catalog',
    importCalendarDesc: 'Scan birthdays from calendar and contacts',
    culturalCatalogDesc: 'Mother\'s Day, Father\'s Day, Valentine\'s Day templates',
  },
} as const;

export type TranslationKey = keyof typeof translations.tr;

export function t(key: TranslationKey, lang: Language = 'tr', params?: Record<string, string>): string {
  const dict = translations[lang] || translations.tr;
  let str: string = dict[key] || translations.tr[key] || (key as string);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, v);
    });
  }
  return str;
}
