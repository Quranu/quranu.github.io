const fs = require("fs");
const path = require("path");

const sourcePath = process.argv[2] || "c:\\Users\\Lubis\\Desktop\\QI2_IN_data.txt";
const rawDir = path.join(__dirname, "..", "data", "raw");

main();

function main() {
  const source = fs.readFileSync(sourcePath, "utf8");
  const translationsByGlobalVerse = parseTranslations(source);
  const rawFiles = fs
    .readdirSync(rawDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^surah-\d{3}\.txt$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  let globalVerseNumber = 0;
  let updatedBmLines = 0;
  let blankedLines = 0;

  for (const fileName of rawFiles) {
    const surahNumber = Number(fileName.match(/^surah-(\d{3})\.txt$/i)[1]);
    const filePath = path.join(rawDir, fileName);
    const original = fs.readFileSync(filePath, "utf8");
    const lines = original.split(/\r?\n/);
    const updatedLines = [];
    let currentAyahNumber = null;
    let currentGlobalVerse = null;

    for (const line of lines) {
      const ayahMatch = line.match(/^#\s*Ayah\s+(\d+)$/i);
      if (ayahMatch) {
        currentAyahNumber = Number(ayahMatch[1]);
        currentGlobalVerse = shouldOmitVerse(surahNumber, currentAyahNumber)
          ? null
          : ++globalVerseNumber;
        updatedLines.push(line);
        continue;
      }

      if (currentAyahNumber !== null && shouldOmitVerse(surahNumber, currentAyahNumber)) {
        if (line.startsWith("AR:")) {
          updatedLines.push("AR:");
          blankedLines += 1;
          continue;
        }

        if (line.startsWith("BM:")) {
          updatedLines.push("BM:");
          blankedLines += 1;
          continue;
        }

        if (line.startsWith("EN:")) {
          updatedLines.push("EN:");
          blankedLines += 1;
          continue;
        }
      }

      if (currentAyahNumber !== null && line.startsWith("BM:")) {
        const replacement = translationsByGlobalVerse.get(currentGlobalVerse);
        if (!replacement) {
          throw new Error(
            `Missing BM translation for global verse ${currentGlobalVerse} (Sura ${surahNumber}, Ayah ${currentAyahNumber}).`,
          );
        }

        updatedLines.push(`BM: ${replacement}`);
        updatedBmLines += 1;
        continue;
      }

      updatedLines.push(line);
    }

    fs.writeFileSync(filePath, `${updatedLines.join("\n")}\n`, "utf8");
  }

  if (translationsByGlobalVerse.size !== globalVerseNumber) {
    throw new Error(
      `Source file has ${translationsByGlobalVerse.size} BM verse(s), but raw traversal produced ${globalVerseNumber}.`,
    );
  }

  console.log(
    `Imported ${updatedBmLines} BM verse line(s), blanked ${blankedLines} field line(s), and mapped ${globalVerseNumber} total verses.`,
  );
}

function parseTranslations(source) {
  const translations = new Map();

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^v\|(\d+)\|([^|]*)\|/);
    if (!match) {
      continue;
    }

    const globalVerseNumber = Number(match[1]);
    const translation = match[2].trim();

    if (!translation) {
      throw new Error(`BM source verse ${globalVerseNumber} has an empty translation field.`);
    }

    translations.set(globalVerseNumber, translation);
  }

  return translations;
}

function shouldOmitVerse(surahNumber, ayahNumber) {
  return surahNumber === 9 && (ayahNumber === 128 || ayahNumber === 129);
}
