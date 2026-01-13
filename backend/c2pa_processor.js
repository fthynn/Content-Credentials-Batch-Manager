// Content Credentials Batch Manager - Temel İşlem Motoru (V1)
// Amacımız: Bir dosyayı okumak, C2PA manifesti oluşturmak ve imzalamaktır.

import fs from 'fs/promises';
import path from 'path';

// NOT: Gerçek bir projede, burada '@contentauth/c2pa' gibi bir kütüphane kullanırdık.
// Bu örnekte, C2PA işlemlerini simüle eden fonksiyonlar kullanıyoruz.
// Gerçek kütüphane entegrasyonu, adımları öğrendikçe gelecektir.

// ----------------------------------------------------------------
// 1. Mock Signer (Sahte İmzalayıcı)
// Gerçekte bu, donanım güvenlik modülünüz (HSM/KMS) ile iletişim kurar.
// Geliştirme aşaması için basit bir in-memory anahtar simülasyonu yapıyoruz.
// ----------------------------------------------------------------
const mockSigner = {
    // Özel anahtarı temsil eden bir kimlik (PII içermez)
    signerId: 'cc-batch-manager-dev-signer',
    // Manifest'in hash'ini alıp imzalanmış bir veri (mock) döndürür.
    sign: async (manifestHash) => {
        console.log(`[İmza Atılıyor] Manifest özeti (hash) alindi: ${manifestHash.substring(0, 10)}...`);
        // Simüle edilmiş kriptografik imza verisi
        return `SIGNED_DATA_${Date.now()}_BY_${mockSigner.signerId}`;
    }
};


// ----------------------------------------------------------------
// 2. Preset Şablonu
// Kullanıcının seçeceği bir Ön Ayar'ı temsil eder.
// ----------------------------------------------------------------
const preset = {
    creator: 'SonRa Art Digital',
    link: 'https://sonra.art',
    licenseText: 'Ticari Kullanım Lisansı - Tüm Hakları Saklıdır.',
    aiTrainingPreference: 'disallow', // disallow: Yapay zeka eğitimine izin verme
    actions: [
        { type: 'created', description: 'Orijinal oluşturma.' },
        { type: 'edited', description: 'Basit kontrast ve parlaklık ayarı yapıldı.' }
    ]
};

// ----------------------------------------------------------------
// 3. Çekirdek İşlem Fonksiyonu
// ----------------------------------------------------------------

/**
 * Tek bir dosyaya Content Credentials (İçerik Kimlik Bilgileri) ekler ve imzalar.
 * @param {string} inputFilePath İşlenecek dosyanın yolu.
 * @param {object} preset Kullanılacak ön ayar şablonu.
 */
async function processFile(inputFilePath, preset) {
    const fileName = path.basename(inputFilePath);
    const outputFilePath = path.join(path.dirname(inputFilePath), `cc_${fileName}`);

    console.log(`\n--- ${fileName} İşleniyor ---`);

    try {
        // Dosyanın varlığını kontrol et
        await fs.access(inputFilePath);

        // 3.1. C2PA Manifesti Oluşturma (Simülasyon)
        console.log('[1/4] Manifest oluşturuluyor...');
        const manifestData = {
            producer: preset.creator,
            producerUrl: preset.link,
            actions: preset.actions,
            time: new Date().toISOString(),
            // AI tercihi assertion olarak eklenir
            ai_training_preference: preset.aiTrainingPreference,
        };

        // Gerçekte, C2PA SDK manifesti oluşturur ve dosyanın hash'ini alır.
        const fileHash = `hash-${Math.random().toString(16).substring(2)}`;
        console.log(`[Manifest Hazır] Dosya hash'i: ${fileHash}`);

        // 3.2. İmzalama
        const signature = await mockSigner.sign(fileHash);
        console.log('[2/4] İmza başarıyla alındı.');

        // 3.3. Manifesti Dosyaya Gömme (Embed)
        // Gerçek C2PA SDK'sı burada kriptografik olarak imzalanmış manifesti
        // JUMBF kutusu veya sidecar dosyası olarak çıktı dosyasına yazar.
        console.log(`[3/4] Manifest '${outputFilePath}' dosyasına gömülüyor...`);

        // Basit dosya kopyalama simülasyonu
        const fileContent = await fs.readFile(inputFilePath);
        await fs.writeFile(outputFilePath, fileContent);

        console.log('[4/4] İşlem Başarılı!');
        console.log(`-> Çıktı Dosyası: ${outputFilePath}`);
        console.log(`-> İmzalayan ID: ${mockSigner.signerId}`);
        console.log(`-> Manifest Özeti (Mock): ${JSON.stringify(manifestData, null, 2).substring(0, 100)}...`);

        return {
            status: 'SUCCESS',
            input: fileName,
            output: path.basename(outputFilePath),
            time: new Date().toISOString(),
            preset: 'Dev Preset',
            hash: fileHash,
        };

    } catch (error) {
        // Hata durumunda işlemi durdurmayız, sadece hatayı raporlarız.
        console.error(`[HATA] ${fileName} işlenirken hata oluştu:`, error.message);
        return {
            status: 'FAILED',
            input: fileName,
            error: error.message,
            time: new Date().toISOString(),
        };
    }
}

// ----------------------------------------------------------------
// 4. Batch (Toplu) İşlemi Başlatma
// ----------------------------------------------------------------

import { readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const INPUT_DIR = join(PROJECT_ROOT, 'input_files');
const OUTPUT_DIR = join(PROJECT_ROOT, 'output_files');

async function runBatch() {
    console.log('--- Content Credentials Batch Manager Başlatılıyor ---');
    console.log(`📂 Input: ${INPUT_DIR}`);
    console.log(`📂 Output: ${OUTPUT_DIR}`);

    try {
        // Input klasöründeki tüm dosyaları oku
        const files = await readdir(INPUT_DIR);
        const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp|tiff)$/i.test(f));

        console.log(`\n🖼️  ${imageFiles.length} görsel dosya bulundu.\n`);

        const reports = [];

        for (const file of imageFiles) {
            const inputPath = path.join(INPUT_DIR, file);
            const outputPath = path.join(OUTPUT_DIR, `cc_${file}`);

            // processFile'ı output için güncelle
            const report = await processFileWithOutput(inputPath, outputPath, preset);
            reports.push(report);
        }

        console.log('\n==================================================');
        console.log('|| BATCH İŞLEMİ TAMAMLANDI - RAPOR ÖZETİ ||');
        console.log('==================================================');

        let successCount = 0;
        let failCount = 0;

        reports.forEach(r => {
            const resultText = r.status === 'SUCCESS' ? '✅ BAŞARILI' : '❌ BAŞARISIZ';
            console.log(`[${resultText}] ${r.input} -> ${r.output || 'N/A'}`);
            if (r.status === 'SUCCESS') successCount++;
            else failCount++;
        });

        console.log(`\n📊 Sonuç: ${successCount} başarılı, ${failCount} başarısız`);

        // JSON rapor kaydet
        const reportPath = path.join(OUTPUT_DIR, `report_${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(reports, null, 2));
        console.log(`📄 Rapor kaydedildi: ${reportPath}`);

    } catch (error) {
        console.error('❌ Batch işlem hatası:', error.message);
    }
}

async function processFileWithOutput(inputPath, outputPath, preset) {
    const fileName = path.basename(inputPath);

    console.log(`\n--- ${fileName} İşleniyor ---`);

    try {
        await fs.access(inputPath);

        console.log('[1/4] Manifest oluşturuluyor...');
        const manifestData = {
            producer: preset.creator,
            producerUrl: preset.link,
            actions: preset.actions,
            time: new Date().toISOString(),
            ai_training_preference: preset.aiTrainingPreference,
        };

        const fileHash = `hash-${Math.random().toString(16).substring(2)}`;
        console.log(`[Manifest Hazır] Dosya hash'i: ${fileHash}`);

        const signature = await mockSigner.sign(fileHash);
        console.log('[2/4] İmza başarıyla alındı.');

        console.log(`[3/4] Manifest '${outputPath}' dosyasına gömülüyor...`);

        const fileContent = await fs.readFile(inputPath);
        await fs.writeFile(outputPath, fileContent);

        console.log('[4/4] İşlem Başarılı!');
        console.log(`-> Çıktı: ${outputPath}`);
        console.log(`-> İmzalayan: ${mockSigner.signerId}`);

        return {
            status: 'SUCCESS',
            input: fileName,
            output: path.basename(outputPath),
            time: new Date().toISOString(),
            preset: preset.creator,
            hash: fileHash,
        };

    } catch (error) {
        console.error(`[HATA] ${fileName}: ${error.message}`);
        return {
            status: 'FAILED',
            input: fileName,
            error: error.message,
            time: new Date().toISOString(),
        };
    }
}

// Uygulamayı başlat
runBatch();

