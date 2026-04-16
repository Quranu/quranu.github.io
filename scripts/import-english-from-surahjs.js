const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sourcePath = "c:\\Users\\Lubis\\Downloads\\surah.js";
const rawDir = path.join(__dirname, "..", "data", "raw");

main();

function main() {
  const surahNumber = Number(process.argv[2]);
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    throw new Error("Usage: node scripts/import-english-from-surahjs.js <surahNumber>");
  }

  const surahData = loadSurahData(sourcePath);
  const surah = surahData[surahNumber];
  if (!surah) {
    throw new Error(`Sura ${surahNumber} was not found in ${sourcePath}.`);
  }

  const englishByAyah = new Map();
  for (const ayah of surah.ayat ?? []) {
    if (!ayah || typeof ayah.ayatNumber !== "number" || typeof ayah.engtranslation !== "string") {
      continue;
    }

    const translation = ayah.engtranslation.trim();
    if (translation) {
      englishByAyah.set(ayah.ayatNumber, translation);
    }
  }

  const rawFilePath = path.join(rawDir, `surah-${String(surahNumber).padStart(3, "0")}.txt`);
  const original = fs.readFileSync(rawFilePath, "utf8");
  const { content, replacements } = updateRawEnglish(original, englishByAyah);

  if (content !== original) {
    fs.writeFileSync(rawFilePath, content, "utf8");
  }

  console.log(`Updated ${replacements} English ayah line(s) in ${path.basename(rawFilePath)}.`);
}

function loadSurahData(filePath) {
  const scriptContent = fs.readFileSync(filePath, "utf8");
  const context = { surahData: {} };
  vm.createContext(context);
  vm.runInContext(scriptContent, context, { filename: filePath });
  return context.surahData;
}

function updateRawEnglish(content, englishByAyah) {
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

    if (currentAyahNumber !== null && line.startsWith("EN: ")) {
      const replacement = englishByAyah.get(currentAyahNumber);
      if (replacement) {
        updatedLines.push(`EN: ${replacement}`);
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
