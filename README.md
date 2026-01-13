# 🔐 Content Credentials Batch Manager (CCM)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![C2PA](https://img.shields.io/badge/C2PA-Compatible-orange.svg)](https://c2pa.org/)

> **Dijital içerik sahipliğini ve kökenini doğrulayan batch işlem aracı**

---

## 🎯 Ne İşe Yarar?

CCM, dijital içerik dosyalarına (JPG, PNG, WebP, TIFF) **C2PA/CAI Content Credentials** ekleyerek:

- ✅ **Sahiplik Kanıtı** - İçeriğin kime ait olduğunu belgeler
- ✅ **AI Eğitim Kontrolü** - Yapay zeka eğitimine izin/yasak koyar
- ✅ **Köken Takibi** - İçeriğin nereden geldiğini kanıtlar
- ✅ **Toplu İşlem** - Yüzlerce dosyayı dakikalar içinde işler

---

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js 18+
- Redis (Docker önerilir)

### Kurulum

```bash
# Clone
git clone https://github.com/SonraArt/content-credentials-batch-manager.git
cd content-credentials-batch-manager

# Install
npm install

# Redis başlat (Docker)
docker run --name ccm-redis -p 6379:6379 -d redis
```

### Kullanım

```bash
# Toplu işlem başlat
npm start apply sonra-default ./input ./output

# Dosya incele
npm start inspect ./output/sample.jpg
```

---

## 📁 Proje Yapısı

```
├── src/
│   ├── cli.ts              # CLI giriş noktası
│   ├── commands/           # apply, inspect komutları
│   └── core/               # İşlem motoru
│       ├── ISigner.ts      # Signer interface
│       ├── MockSigner.ts   # Test için mock signer
│       └── KMSSigner.js    # KMS/HSM entegrasyonu
├── backend/
│   └── c2pa_processor.js   # C2PA işlem motoru
├── presets/                # Ön ayar şablonları
└── config/                 # Yapılandırma dosyaları
```

---

## ⚙️ Özellikler

### 1. Batch İşlemi
Bull/Redis kuyruğu ile yüzlerce dosyayı paralel işler.

### 2. Remote Signer
KMS/HSM entegrasyonu - özel anahtarlar güvenli tutulur.

### 3. Preset Sistemi
Hazır şablonlar ile hızlı lisanslama:
- `sonra-default` - Ticari, eğitim yasak
- `creative-commons` - CC BY-NC
- `public-domain` - Serbest kullanım

### 4. Raporlama
İşlem sonunda CSV/JSON raporları.

### 5. Etik Kontrol
Başkalarının 'AI Training Disallow' etiketini kaldırmasını engeller.

---

## 🔧 API

```typescript
// Toplu işlem başlat
await applyCommand(presetName, inputDir, outputDir);

// Dosya incele
await inspectFile(filePath);
```

---

## 📊 Desteklenen Formatlar

| Format | Okuma | Yazma |
|--------|-------|-------|
| JPEG | ✅ | ✅ |
| PNG | ✅ | ✅ |
| WebP | ✅ | ✅ |
| TIFF | ✅ | ✅ |
| HEIC | 🔜 | 🔜 |

---

## 🛣️ Yol Haritası

- [x] CLI arayüzü
- [x] Batch işlem (Bull/Redis)
- [x] Mock signer
- [ ] Gerçek C2PA SDK entegrasyonu
- [ ] Web dashboard
- [ ] Cloud deployment (GCP)

---

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing`)
5. Pull Request açın

---

## 📄 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

## 👤 Geliştirici

**Fatih YENEN**  
🌐 [sonra.art](https://www.sonra.art)  
📧 <researcher@sonra.art>  
🔬 ORCID: 0009-0000-4220-0041

---

<p align="center">
  <i>"Dijital içeriğin gerçekliği, yaratıcının hakkıdır."</i>
</p>
