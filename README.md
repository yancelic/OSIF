# OSIF (OH SHIT I FORGOT)

Offline-first Birthday & Gift Tracking mobile application built with **Expo**, **React Native**, and **TypeScript**.

## 📌 Özellikler

- **Offline-First Mimari:** Tüm veriler cihazda yerel `expo-sqlite` veritabanında güvenle saklanır. İnternet bağlantısı gerektirmez.
- **Kademeli Akıllı Bildirimler:**
  - **Tier 1 (Önemli Kişiler):** 10 gün önce, 3 gün önce ve etkinlik günü bildirimleri.
  - **Tier 2 (Standart):** 3 gün önce ve etkinlik günü bildirimleri.
- **Hediye Durumu Takibi:** Her kişi için hediye düşünme, alma ve paketleme durumlarının izlenmesi.
- **Astroloji & Burç Hesaplamaları:** Doğum tarihlerine göre burç ve element eşleştirmeleri.
- **Hassas Veri Güvenliği:** Harici sunuculara veya üçüncü taraf analitiklere kişisel veri aktarılmaz.

## 🚀 Başlangıç

### Gereksinimler
- Node.js (>= 18)
- npm veya yarn
- Expo Go veya fiziksel/emülatör geliştirme ortamı

### Kurulum

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npx expo start
```

## 🧪 Testler

```bash
npm run test:math
```

## 📂 Proje Yapısı

```
├── src/
│   ├── context/          # React Context (State yönetimi)
│   ├── screens/          # Ana ekranlar (Dashboard, Detail, Settings, Debug)
│   ├── services/         # Veritabanı ve Bildirim zamanlayıcı servisleri
│   ├── types/            # TypeScript tip tanımları
│   ├── ui/               # Yeniden kullanılabilir UI bileşenleri & Temalar
│   └── utils/            # Tarih, astroloji ve yardımcı fonksiyonlar
├── tests/                # Test ve doğrulama betikleri
├── App.tsx               # Ana uygulama bileşeni
└── app.json              # Expo yapılandırması
```

## 📄 Lisans

Bu proje özel olarak geliştirilmiştir.
