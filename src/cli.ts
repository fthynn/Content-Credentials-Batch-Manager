#!/usr/bin/env node
import { Command } from "commander";
import { applyCommand } from "./commands/apply";
import { inspectFile } from "./commands/inspect";

const program = new Command();

program
  .name("content-credentials-batch-manager")
  .description("Sonra Art içerik lisanslama ve metadata yöneticisi")
  .version("1.0.0");

// 🟢 APPLY KOMUTU
program
  .command("apply")
  .description("Toplu lisanslama işlemini başlatır")
  .argument("[presetName]", "Kullanılacak preset adı", "sonra-default")
  .argument("[inputDir]", "Kaynak klasör", "./input")
  .argument("[outputDir]", "Çıktı klasör", "./output")
  .action(async (presetName, inputDir, outputDir) => {
    try {
      await applyCommand(presetName, inputDir, outputDir);
      console.log(`✅ Toplu işlem başarıyla tamamlandı.`);
      process.exit(0);
    } catch (err: any) {
      console.error(`❌ Hata: ${err.message}`);
      process.exit(1);
    }
  });

// 🟣 INSPECT KOMUTU
program
  .command("inspect")
  .description("Manifest içeriğini inceler")
  .argument("[filePath]", "İncelenecek dosya", "./output/sample.jpg")
  .action(async (filePath) => {
    try {
      await inspectFile(filePath);
      process.exit(0);
    } catch (err: any) {
      console.error(`❌ Inspect hatası: ${err.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
