// src/core/MockSigner.ts

import { ISigner } from './ISigner';
import * as crypto from 'crypto';

/**
 * Geliştirme ve yerel testler için imzalama islemini taklit eden sinif.
 * Gerçek imzalama yapmaz, sadece tutarli mock veriler uretir.
 */
export class MockSigner implements ISigner {
    private readonly mockKeyId: string = 'dev-mock-key-001';
    private readonly mockPublicKey: string = 'MOCK_PUBLIC_KEY_FOR_LOCAL_TESTING_12345';
    
    constructor() {
        console.log(`[SIGNER] Mock Signer kullaniliyor. ID: ${this.mockKeyId}`);
    }

    /**
     * Verilen hash icin basit bir taklit imza olusturur.
     * Gerçek imza gibi gorunmesi icin SHA256 kullanilir.
     * @param manifestSummaryHash Imzalanacak veri ozeti.
     * @returns {Promise<string>} Mock imza.
     */
    async sign(manifestSummaryHash: string): Promise<string> {
        // Simülasyon: Imzalama islemi bir sure zaman alir.
        await new Promise(resolve => setTimeout(resolve, 50)); 

        // Verilen hash ile yeni bir kriptografik hash olusturarak taklit imza uretiriz
        const mockSignature = crypto.createHash('sha256')
            .update(manifestSummaryHash + this.mockKeyId) // Key ID'yi karisima dahil et
            .digest('hex');

        // Gerçek bir KMS imzası gibi Base64 formatinda dondurur (simülasyon)
        return Buffer.from(mockSignature).toString('base64');
    }

    /**
     * Geliştirme ortamı için genel anahtari dondurur.
     */
    getPublicKey(): string {
        return this.mockPublicKey;
    }
}
