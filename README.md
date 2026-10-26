# OSIF (OH SHIT I FORGOT) — v2.0

Offline-first Birthday & Gift Tracking mobile application built with **Expo**, **React Native**, and **TypeScript**.

## 📌 Özellikler

- **Offline-First Mimari:** Tüm veriler cihazda yerel `expo-sqlite` veritabanında güvenle saklanır. İnternet bağlantısı gerektirmez.
- **📅 Google Takvim & Rehber Entegrasyonu (v2.0):** Cihaz takvimindeki ve rehberdeki doğum günlerini tek dokunuşla tarama, önizleme ekranında kademe belirleme ve mükerrer kayıt korumasıyla toplu içe aktarma.
- **🌸 Kültürel Özel Günler Kataloğu (v2.0):** Anneler Günü, Babalar Günü gibi dinamik pazar günlerini ve Sevgililer Günü, Yılbaşı gibi popüler günleri otomatik tarih hesaplamasıyla hediye takibine ekleme.
- **Kademeli Akıllı Bildirimler:**
  - **Tier 1 (En Yakınlar):** 10 gün önce, 3 gün önce ve etkinlik günü bildirimleri.
  - **Tier 2 (Arkadaşlar):** 7 gün önce ve etkinlik günü bildirimleri.
  - **Tier 3 (Tanıdıklar):** Etkinlik günü bildirimleri.
- **Hediye Durumu & Bütçe Takibi:** Her kişi için hediye düşünme, alma ve hazır durumlarının izlenmesi; hedef ve harcanan bütçe grafikleri.
- **Ana Ekran Widget'ı:** Android ana ekranına sabitlenebilir canlı mini bakış widget'ı (`react-native-android-widget`).
- **Astroloji & Burç Hesaplamaları:** Doğum tarihlerine göre burç sembolü ve element eşleştirmeleri.
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
│   ├── context/          # React Context (State yönetimi & veritabanı bağlayıcıları)
│   ├── screens/          # Ana ekranlar (Dashboard, ContactDetail, Settings, Debug)
│   ├── services/         # Veritabanı, Bildirim ve Takvim içe aktarma servisleri
│   ├── types/            # TypeScript tip tanımları
│   ├── ui/               # Yeniden kullanılabilir UI bileşenleri & Modallar & Temalar
│   ├── utils/            # Tarih, astroloji, kültürel günler ve yardımcı fonksiyonlar
│   └── widgets/          # Android Ana Ekran Widget tanımları ve arka plan işleyicisi
├── tests/                # Test ve doğrulama betikleri
├── App.tsx               # Ana uygulama navigasyon bileşeni
└── app.json              # Expo yapılandırması
```

## 📄 Lisans

Bu proje özel olarak geliştirilmiştir.
