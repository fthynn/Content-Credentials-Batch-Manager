import path from 'path';

// NOT: Gerçek bir uygulamada, Redis bağlantı ayarlarını bir konfigürasyon dosyasından almalısınız.
const Queue = require('bull');
const redisConfig = {
  host: 'localhost',
  port: 6379,
  keyPrefix: 'cc2pa-batch-queue'
};

// "c2pa-batch-queue" adında bir kuyruk oluşturuyoruz
const batchQueue = new Queue('cc2pa-batch-queue', redisConfig);
console.log("Producer connected to Redis...");

/**
 * Kullanıcının seçtiği dosyaları kuyruğa ekler.
 * Bu fonksiyon, GUI'deki "Batch Başlat" butonuna basıldığında çağrılır.
 * @param {string[]} filePaths İşlenecek dosya yollarının dizisi.
 * @param {object} preset Kullanıcının seçtiği preset verisi.
 */
export async function addBatchJobs(filePaths, preset) {
    if (!filePaths || filePaths.length === 0) {
        console.warn("Kuyruğa eklenecek dosya yolu bulunamadı.");
        return;
    }

    console.log(`\n--- Kuyruğa ${filePaths.length} adet iş ekleniyor ---`);
    
    const jobPromises = filePaths.map(filePath => {
        const jobData = {
            filePath: path.resolve(filePath), // Mutlak yolu kullanmak önemlidir
            preset,
            // Job ID'sini dosya adından türeterek takip kolaylığı sağlarız
            jobId: path.basename(filePath) + '-' + Date.now(),
        };

        // Kuyruğa işi ekle. 
        // options.attempts = 3: Hata durumunda 3 kez deneme yapmasını sağlar (Hataya Dayanıklılık)
        return batchQueue.add(jobData, {
            jobId: jobData.jobId,
            attempts: 3, 
            backoff: {
                type: 'exponential', // Üstel geri çekilme (exponential backoff) ile denemeler arası bekleme artar
                delay: 1000, 
            },
        });
    });

    // Tüm işlerin kuyruğa başarıyla eklendiğini bekler
    await Promise.all(jobPromises);
    console.log(`[BAŞARILI] Tüm ${filePaths.length} iş kuyruğa eklendi. Worker'ın başlamasını bekleyin.`);

    // Gerçek uygulamada, bu bilgiyi GUI'ye gönderirdik.
    const counts = await batchQueue.getJobCounts();
    console.log('Güncel Kuyruk İstatistikleri:', counts);
}

// TEST KULLANIMI:
const mockPreset = { creator: 'SonRa Test', ai_training: 'disallow' };
const mockFiles = [
    './input_1.jpg', 
    './input_2.png',
    './input_3_bozuk.webp', // Hata simülasyonu için
];

// Dosyaların gerçekte var olmadığını varsayarak logları görebiliriz.
// Eğer test etmek istersen, bu mockFiles'ın çalıştığı dizine birkaç dosya koymalısın.
addBatchJobs(mockFiles, mockPreset);
