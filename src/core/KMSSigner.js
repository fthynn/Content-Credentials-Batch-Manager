// src/core/KMSSigner.ts

const { signWithKMS } = require('./core/KMSSigner.js');

/**
 * Uretim icin Remote Signer (AWS KMS, Azure Key Vault vb.) iletisimini yoneten sinif.
 * Ozel anahtar, asla bu sunucuda (Worker) tutulmaz veya export edilmez.
 */
export class KMSSigner implements ISigner {
    private readonly kmsEndpoint: string = 'https://aws.kms.sonra.art/sign/prod-key-1';
    private readonly prodPublicKey: string = 'PROD_KMS_PUBLIC_KEY_SECURE_54321';
    
    constructor() {
        console.log(`[SIGNER] Uzak KMS Signer kullaniliyor. Endpoint: ${this.kmsEndpoint}`);
    }

    /**
     * AWS KMS (veya benzeri bir hizmet) iletisimini simule eder.
     * Gerçek uygulamada: Manifest ozetini KMS API'ye gonderir ve imzayi geri alir.
     * @param manifestSummaryHash Imzalanacak veri ozeti.
     * @returns {Promise<string>} Uzak servisten alinmis Base64 imza.
     */
    async sign(manifestSummaryHash: string): Promise<string> {
        // 1. Yetkilendirme (Auth) ve Guvenlik Kontrolleri
        // 2. HTTP istegi ile manifestSummaryHash'i KMS Endpoint'e gonder.
        // 3. KMS, ozel anahtar ile imzayi olusturur.
        // 4. Imza (sadece public key degil) geri dondurulur.
        
        console.warn(`[KMS MOCK] Manifest Hash KMS'e gonderildi: ${manifestSummaryHash.substring(0, 10)}...`);
        await new Promise(resolve => setTimeout(resolve, 200)); // Network gecikmesi simülasyonu

        // Simüle edilmis kriptografik imza (gerçekte KMS'den gelirdi)
        const signature = Buffer.from(`KMS_SIGNATURE_${Date.now()}_${manifestSummaryHash}`).toString('base64');

        return signature;
    }

    /**
     * Uretim ortamı için genel anahtari dondurur.
     */
    getPublicKey(): string {
        return this.prodPublicKey;
    }
}
