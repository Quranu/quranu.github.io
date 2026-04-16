const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sourcePath = "c:\\Users\\Lubis\\Downloads\\surah.js";
const rawDir = path.join(__dirname, "..", "data", "raw");
const processedDir = path.join(__dirname, "..", "data", "processed");

main();

function main() {
  const surahData = loadSurahData(sourcePath);
  const imported = new Map();

  for (const [surahNumber, surah] of Object.entries(surahData)) {
    const arabicByAyah = new Map();
    for (const ayah of surah.ayat ?? []) {
      if (!ayah || typeof ayah.ayatNumber !== "number" || typeof ayah.arabicText !== "string") {
        continue;
      }

      const repaired = repairArabicText(ayah.arabicText);
      if (containsArabic(repaired)) {
        arabicByAyah.set(ayah.ayatNumber, repaired);
      }
    }

    if (arabicByAyah.size > 0) {
      imported.set(Number(surahNumber), arabicByAyah);
    }
  }

  const rawFiles = fs
    .readdirSync(rawDir)
    .filter((fileName) => /^surah-\d{3}\.txt$/.test(fileName))
    .sort();

  let updatedFiles = 0;
  let updatedAyahs = 0;

  for (const fileName of rawFiles) {
    const surahNumber = Number(fileName.slice(6, 9));
    const arabicByAyah = imported.get(surahNumber);
    if (!arabicByAyah) {
      continue;
    }

    const filePath = path.join(rawDir, fileName);
    const original = fs.readFileSync(filePath, "utf8");
    const { content, replacements } = updateRawArabic(original, arabicByAyah);

    if (replacements > 0 && content !== original) {
      fs.writeFileSync(filePath, content, "utf8");
      updatedFiles += 1;
      updatedAyahs += replacements;
    }
  }

  console.log(`Imported Arabic into ${updatedFiles} raw file(s); updated ${updatedAyahs} ayah block(s).`);
}

function loadSurahData(filePath) {
  const scriptContent = fs.readFileSync(filePath, "utf8");
  const context = { surahData: {} };
  vm.createContext(context);
  vm.runInContext(scriptContent, context, { filename: filePath });
  return context.surahData;
}

function repairArabicText(value) {
  let current = value;

  for (let index = 0; index < 3; index += 1) {
    if (containsArabic(current)) {
      return current;
    }

    const repaired = Buffer.from(current, "latin1").toString("utf8");
    if (repaired === current) {
      break;
    }
    current = repaired;
  }

  return current;
}

function containsArabic(value) {
  return /[\u0600-\u06FF]/.test(value);
}

function updateRawArabic(content, arabicByAyah) {
  const lines = content.split(/\r?\n/);
  const updatedLines = [];
  let currentAyahNumber = null;
  let replacements = 0;

  for (const line of lines) {
    const ayahMatch = line.match(/^#\s*Ayah\s+(\d+)$/i);
    if (ayahMatch) {
      currentAyahNumber = Number(ayahMatch[1]);
      updatedLines.push(line);
      continue;
    }

    if (currentAyahNumber !== null && line.startsWith("AR: ")) {
      const replacement = arabicByAyah.get(currentAyahNumber);
      if (replacement) {
        updatedLines.push(`AR: ${replacement}`);
        replacements += 1;
        continue;
      }
    }

    updatedLines.push(line);
  }

  return {
    content: `${updatedLines.join("\n")}\n`,
    replacements,
  };
}
