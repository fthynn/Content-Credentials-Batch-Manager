// src/core/ReportManager.js

import { promises as fs } from 'fs';
import path from 'path';

/**
 * Batch islem sonuclarini toplayan, yoneten ve nihai raporlari (CSV/JSON) ureten sinif.
 * Etik Kural: Loglarda PII (Kisisel Tanimlayici Bilgi) tutulmaz.
 */
export class ReportManager {
    constructor(reportName) {
        this.reportName = reportName || `BatchReport_${Date.now()}`;
        this.results = []; // Tüm islem sonuclarinin depolandigi dizi
        this.startTime = new Date();
        console.log(`[REPORT] Yeni Rapor Yöneticisi başlatıldı: ${this.reportName}`);
    }

    /**
     * Bir işin sonucunu (başarılı veya başarısız) kaydeder.
     * @param {object} data Isin islem sonuc verileri.
     */
    addResult(data) {
        // PII icermeyen temel verileri kaydet
        this.results.push({
            timestamp: new Date().toISOString(),
            status: data.status, // SUCCESS, FAILED
            fileName: data.fileName,
            presetUsed: data.presetName || 'N/A',
            manifestHash: data.hash || 'N/A',
            errorReason: data.errorReason || '', // Hata durumunda neden
            attemptCount: data.attemptCount || 1,
        });
    }

    /**
     * Toplanan verilerden CSV formatinda metin olusturur.
     */
    _toCSV() {
        if (this.results.length === 0) return 'Dosya yok.';

        const headers = ['Timestamp', 'Status', 'FileName', 'PresetUsed', 'ManifestHash', 'ErrorReason', 'AttemptCount'];
        let csv = headers.join(',') + '\n';

        this.results.forEach(result => {
            const row = [
                result.timestamp,
                result.status,
                // Dosya adini virgul icerigine karsi korumak icin tirnak icine al
                `"${result.fileName.replace(/"/g, '""')}"`, 
                `"${result.presetUsed}"`,
                result.manifestHash,
                `"${result.errorReason.replace(/"/g, '""')}"`,
                result.attemptCount
            ];
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    /**
     * Toplanan verilerden JSON formatinda metin olusturur.
     */
    _toJSON() {
        const summary = {
            reportId: this.reportName,
            processedCount: this.results.length,
            successCount: this.results.filter(r => r.status === 'SUCCESS').length,
            failedCount: this.results.filter(r => r.status === 'FAILED').length,
            startTime: this.startTime.toISOString(),
            endTime: new Date().toISOString(),
            results: this.results,
        };
        return JSON.stringify(summary, null, 2); // 2 bosluk birakarak okunur JSON uret
    }

    /**
     * Raporlari belirtilen klasöre kaydeder.
     * @param {string} outputDir Raporlarin kaydedilecegi klasor.
     */
    async saveReports(outputDir = './reports') {
        try {
            await fs.mkdir(outputDir, { recursive: true });
            
            const jsonPath = path.join(outputDir, `${this.reportName}.json`);
            const csvPath = path.join(outputDir, `${this.reportName}.csv`);

            await fs.writeFile(jsonPath, this._toJSON(), 'utf-8');
            await fs.writeFile(csvPath, this._toCSV(), 'utf-8');

            console.log(`[REPORT] JSON Raporu Kaydedildi: ${jsonPath}`);
            console.log(`[REPORT] CSV Raporu Kaydedildi: ${csvPath}`);
        } catch (error) {
            console.error(`[REPORT HATA] Raporlar kaydedilemedi: ${error.message}`);
        }
    }
}
