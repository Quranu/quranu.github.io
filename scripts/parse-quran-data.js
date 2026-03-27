const fs = require("fs");
const path = require("path");
const surahMeta = require("./surah-meta.js");

const rawDir = path.join(__dirname, "..", "data", "raw");
const processedDir = path.join(__dirname, "..", "data", "processed");

main();

function main() {
  ensureDirectory(processedDir);

  const availableSurahs = new Set();
  const rawFiles = fs
    .readdirSync(rawDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".txt"))
    .map((entry) => entry.name)
    .sort();

  rawFiles.forEach((fileName) => {
    const filePath = path.join(rawDir, fileName);
    const parsed = parseSurahFile(fs.readFileSync(filePath, "utf8"));
    const meta = surahMeta.find((item) => item.number === parsed.surahNumber);

    if (!meta) {
      throw new Error(`Unknown surah number in ${fileName}: ${parsed.surahNumber}`);
    }

    if (parsed.ayahs.length !== meta.totalAyahs) {
      throw new Error(
        `Surah ${parsed.surahNumber} expected ${meta.totalAyahs} ayahs but found ${parsed.ayahs.length}`,
      );
    }

    availableSurahs.add(parsed.surahNumber);

    const output = {
      surahNumber: parsed.surahNumber,
      name: {
        ar: parsed.nameAr || meta.ar,
        bm: parsed.nameBm || meta.bm,
        en: parsed.nameEn || meta.en,
      },
      totalAyahs: parsed.ayahs.length,
      ayahs: parsed.ayahs,
    };

    const outputPath = path.join(
      processedDir,
      `surah-${String(parsed.surahNumber).padStart(3, "0")}.json`,
    );

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
  });

  const catalog = surahMeta.map((item) => ({
    number: item.number,
    name: {
      ar: item.ar,
      bm: item.bm,
      en: item.en,
    },
    totalAyahs: item.totalAyahs,
    available: availableSurahs.has(item.number),
  }));

  fs.writeFileSync(
    path.join(processedDir, "surah-catalog.json"),
    JSON.stringify(catalog, null, 2),
    "utf8",
  );

  console.log(
    `Parsed ${rawFiles.length} raw file(s). Generated ${availableSurahs.size} surah data file(s) and a full catalog.`,
  );
}

function parseSurahFile(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const dividerIndex = lines.indexOf("---");
  if (dividerIndex === -1) {
    throw new Error("Raw file is missing the --- divider line.");
  }

  const headers = Object.fromEntries(
    lines.slice(0, dividerIndex).map((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        throw new Error(`Invalid header line: ${line}`);
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      return [key, value];
    }),
  );

  const ayahs = lines.slice(dividerIndex + 1).map((line) => {
    const segments = line.split("|");
    if (segments.length !== 5) {
      throw new Error(`Invalid ayah line: ${line}`);
    }

    return {
      number: Number(segments[0].trim()),
      arabic: segments[1].trim(),
      bm: segments[2].trim(),
      en: segments[3].trim(),
      audio: segments[4].trim(),
    };
  });

  return {
    surahNumber: Number(headers.SURAH_NUMBER),
    nameAr: headers.NAME_AR,
    nameBm: headers.NAME_BM,
    nameEn: headers.NAME_EN,
    ayahs,
  };
}

function ensureDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}
