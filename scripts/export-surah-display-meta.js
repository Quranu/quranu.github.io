const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sourcePath = process.argv[2] || "c:\\Users\\Lubis\\Downloads\\surah.js";
const outputPath = path.join(__dirname, "..", "src", "surahDisplayMeta.js");

main();

function main() {
  const surahData = loadSurahData(sourcePath);
  const meta = {};

  for (const [surahNumber, surah] of Object.entries(surahData)) {
    const number = Number(surahNumber);
    const latin = extractLatinName(String(surah.surahName ?? ""));
    const arabic = normalizeArabicName(String(surah.surahNameArabic ?? ""));

    if (!latin || !arabic) {
      throw new Error(`Missing display meta for sura ${number}.`);
    }

    meta[number] = {
      latin,
      arabic,
    };
  }

  const content = `export const surahDisplayMeta = ${JSON.stringify(meta, null, 2)};\n`;
  fs.writeFileSync(outputPath, content, "utf8");
  console.log(`Wrote display meta for ${Object.keys(meta).length} sura(s) to ${outputPath}.`);
}

function loadSurahData(filePath) {
  const scriptContent = fs.readFileSync(filePath, "utf8");
  const context = { surahData: {} };
  vm.createContext(context);
  vm.runInContext(scriptContent, context, { filename: filePath });
  return context.surahData;
}

function extractLatinName(surahName) {
  const match = surahName.match(/\(([^)]+)\)\s*$/);
  return (match ? match[1] : surahName).trim();
}

function normalizeArabicName(arabicName) {
  return arabicName.replace(/^سورة\s+/, "").trim();
}
