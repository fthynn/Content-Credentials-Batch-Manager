const path = require('path');
const crypto = require('crypto');
// KMSSigner ve ReportManager - CommonJS compatible
const { KMSSigner } = require('./core/KMSSigner.js');
const { ReportManager } = require('./core/ReportManager.js');

// NOTE: Bu config, Producer ile aynı olmalıdır.
const Queue = require('bull');
const redisConfig = {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'cc2pa-batch-queue'
};

const batchQueue = new Queue('cc2pa-batch-queue', redisConfig);
batchQueue.process(async (job) => {
    console.log("Processing job:", job.id);
    // Simülasyon: 1 saniye bekle
    await new Promise(r => setTimeout(r, 1000));
    console.log("Job done:", job.id);
});

// ARTIK MOCK SIGNER DEGIL, KMS SIGNER KULLANIYORUZ
// Bu, Faz 3 KMS gereksinimini simule eder.
// signer = new MockSigner() Mock için.
const signer = new KMSSigner();

/**
 * C2PA Islem Motorunun temel gorevlerini (Hash, Imzalama, Gomme) simule eder.
 * @param {string} filePath Islenecek dosyanin yolu.
 * @param {object} preset Kullanilacak on ayar verisi.
 */
async function processC2PAJob(filePath, preset) {
    const fileName = path.basename(filePath);

    // Etik Kural Kontrolu: Dosya adinda "hata_kaldirmak" varsa, etik kural ihlali simule et.
    if (fileName.includes('hata_kaldirmak')) {
        throw new Error(`[Etik Kural Ihali] Baskasinin 'Do Not Train' isaretini kaldirma girisimi tespit edildi.`);
    }

    // 1. C2PA MANIFESTI VE HASH HAZIRLAMA (Simulasyon)
    const manifestSummaryHash = `manifest-hash-${crypto.randomBytes(16).toString('hex')}`;

    console.log(`[C2PA] Manifest hazirlaniyor. Hash: ${manifestSummaryHash.substring(0, 15)}...`);

    // 2. UZAK IMZA ISTEGI GONDERME (Remote Signer)
    // Bu, KMS/HSM gereksinimini karsilayan kritik adimdir.
    const signature = await signer.sign(manifestSummaryHash);

    // 3. MANIFESTI DOSYAYA GOMME (Simulasyon)
    // Buraya gercek c2pa-node gomme mantigi gelirdi.
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
        status: 'SUCCESS',
        manifestHash: manifestSummaryHash,
        signerKey: signature, // Imzanin KMS'ten geldigini gosterir
        outputFile: path.join(preset.outputDir, `cc_${fileName}`),
    };
}

// -------------------------------------------------------------
// Kuyruk İşleme Mantığı (Worker)
// -------------------------------------------------------------

batchQueue.process(async (job) => {
    const { filePath, preset } = job.data;
    const fileName = path.basename(filePath);

    console.log(`\n[WORKER] İş Alındı: ${fileName} (ID: ${job.id}, Deneme: ${job.attemptsMade + 1})`);

    try {
        const result = await processC2PAJob(filePath, preset);

        reportManager.addResult({
            status: 'SUCCESS',
            fileName: fileName,
            presetName: preset.creator,
            hash: result.manifestHash,
            attemptCount: job.attemptsMade + 1,
        });

        console.log(`[BAŞARILI] Islendi ve ${signer.name} ile imzalandi.`);
        return { status: 'completed', hash: result.manifestHash };

    } catch (error) {
        reportManager.addResult({
            status: 'FAILED',
            fileName: fileName,
            presetName: preset.creator,
            errorReason: error.message,
            attemptCount: job.attemptsMade + 1,
        });

        console.error(`[HATA] ${fileName} işlenemedi. Raporlandı. Hata: ${error.message}`);

        // Kabul Kriteri: Hata durumunda islem durmaz, dosya atlanir ve raporlanir.
        // Bull bu hatayi yakalar ve job'u basarisiz olarak isaretler.
        throw new Error(error.message);
    }
});

// -------------------------------------------------------------
// Rapor Kaydetme (Tüm İşler Bittiğinde)
// -------------------------------------------------------------

batchQueue.on('drained', async () => {
    const counts = await batchQueue.getJobCounts();
    if (counts.waiting === 0 && counts.active === 0) {
        console.log('\n--- TUM BATCH ISLEMLERI TAMAMLANDI ---');
        await reportManager.saveReports();
        console.log('--- Content Credentials Worker Kapatilabilir. ---');
    }
});

batchQueue.on('error', (err) => {
    console.error(`[KUYRUK HATASI] Redis veya Worker hatasi: ${err.message}`);
});

console.log(`--- Content Credentials Worker Başlatıldı. İmzalayıcı: ${signer.name} ---`);
