// src/core/ISigner.ts

/**
 * Tum imzalayicilarin (Mock, KMS, HSM) uygulamasi gereken arayuz.
 * Bu sayede Worker, hangi imzalayiciyi kullandigini bilmeden isini yapabilir.
 */
export interface ISigner {
    /**
     * Manifest ozetini (hash) alir ve kriptografik imzayi olusturur.
     * @param manifestSummaryHash Imzalanacak veri ozeti (hash).
     * @returns {Promise<string>} Base64 veya hex formatinda olusturulmus imza.
     */
    sign(manifestSummaryHash: string): Promise<string>;

    /**
     * Imzalayiciya ait genel anahtarin Base64 veya PEM formatinda verilmesi.
     * Bu anahtar, olusturulan manifest'e gomulur.
     * @returns {string} Genel anahtar verisi.
     */
    getPublicKey(): string;
}
