const Queue = require('bull');
import fastGlob from 'fast-glob';
import path from 'path';
import { LICENSE_TEMPLATES } from '../core/LicenseTemplates';

// NOTE: Bu konfigürasyon (Redis host, port, keyPrefix) worker ile AYNI olmak ZORUNDADIR!
const redisConfig = {
    redis: {
        host: 'localhost',
        port: 6379,
        keyPrefix: 'ccbatch:v1',
    },
};
const batchQueue = new Queue('c2pa-batch-queue', redisConfig);

/**
 * On ayar dosyasini yukler (Simulasyon).
 * Gercek uygulamada presetler/ klasorunden JSON okur.
 */
function loadPreset(presetName: string) {
    if (presetName === 'sonra-default') {
        return {
            creator: 'Fatih YENEN / SonRa Art',
            ai_training: 'disallow',
            license: LICENSE_TEMPLATES['COMMERCIAL'],
        };
    }
    throw new Error(`On ayar (preset) bulunamadi: ${presetName}`);
}

/**
 * Kaynak klasordeki uygun dosyalara on ayari uygulamak icin
 * isleri Bull kuyruguna gonderir.
 * @param presetName Uygulanacak preset adi.
 * @param inputDir Kaynak klasor yolu.
 * @param outputDir Cikti klasor yolu.
 */
export async function applyCommand(
  presetName = 'sonra-default',
  inputDir = './input',
  outputDir = './output'
): Promise<void> {
    try {
        const preset = loadPreset(presetName);

        const filePatterns = ['*.{jpg,jpeg,png,webp,tiff}'];
        const filesToProcess = await fastGlob(filePatterns, {
            cwd: inputDir,
            absolute: true,
            onlyFiles: true,
        });

        if (filesToProcess.length === 0) {
            console.warn(`[APPLY] Kaynak klasorde (${inputDir}) islenecek dosya bulunamadi.`);
            return;
        }

        console.log(`[APPLY] ${filesToProcess.length} dosya bulundu. Isleniyor...`);

        const jobs = filesToProcess.map((filePath) =>
            batchQueue.add(
                {
                    filePath,
                    preset,
                    outputDir,
                },
                {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 1000 },
                }
            )
        );

        await Promise.all(jobs);

        console.log(`[APPLY] Tum isler kuyruga eklendi. Worker'in islemi bitirmesi bekleniyor.`);
        console.log(`Worker'in calistigindan ve Redis'in aktif oldugundan emin olun!`);
    } catch (error: any) {
        console.error(`[APPLY HATA] Toplu islem baslatilamadi: ${error.message}`);
    }
}
