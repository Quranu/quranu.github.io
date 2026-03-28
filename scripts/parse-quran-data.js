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

    const officialAyahCount = validateAyahs(parsed.surahNumber, parsed.ayahs, meta.totalAyahs);

    availableSurahs.add(parsed.surahNumber);

    const output = {
      surahNumber: parsed.surahNumber,
      name: {
        ar: parsed.nameAr || meta.ar,
        bm: parsed.nameBm || meta.bm,
        en: parsed.nameEn || meta.en,
      },
      totalAyahs: officialAyahCount,
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
    .map((line) => line.trim());

  const dividerIndex = lines.indexOf("---");
  if (dividerIndex === -1) {
    throw new Error("Raw file is missing the --- divider line.");
  }

  const headers = Object.fromEntries(
    lines.slice(0, dividerIndex).filter(Boolean).map((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        throw new Error(`Invalid header line: ${line}`);
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      return [key, value];
    }),
  );

  const ayahLines = lines.slice(dividerIndex + 1);
  const ayahs = hasBlockAyahs(ayahLines)
    ? parseBlockAyahs(ayahLines)
    : parseLegacyAyahs(ayahLines.filter(Boolean));

  return {
    surahNumber: Number(headers.SURAH_NUMBER),
    nameAr: headers.NAME_AR,
    nameBm: headers.NAME_BM,
    nameEn: headers.NAME_EN,
    ayahs,
  };
}

function hasBlockAyahs(lines) {
  return lines.some((line) => line.startsWith("#"));
}

function parseLegacyAyahs(lines) {
  return lines.map((line) => {
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
}

function parseBlockAyahs(lines) {
  const ayahs = [];
  let currentAyah = null;

  for (const line of lines) {
    if (!line) {
      continue;
    }

    if (line.startsWith("#")) {
      if (currentAyah) {
        ayahs.push(finalizeAyahBlock(currentAyah));
      }

      currentAyah = {
        rawLabel: line,
      };
      continue;
    }

    if (!currentAyah) {
      throw new Error(`Found ayah field before ayah block header: ${line}`);
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      throw new Error(`Invalid ayah field line: ${line}`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    currentAyah[key] = value;
  }

  if (currentAyah) {
    ayahs.push(finalizeAyahBlock(currentAyah));
  }

  return ayahs;
}

function finalizeAyahBlock(block) {
  const number = parseAyahNumber(block.rawLabel);
  const ayah = {
    number,
    arabic: requireField(block, "AR", number),
    bm: requireField(block, "BM", number),
    en: requireField(block, "EN", number),
    audio: block.AUDIO ?? "",
  };

  const subtitle = buildOptionalLocalizedField(block, "SUBTITLE_BM", "SUBTITLE_EN");
  if (subtitle) {
    ayah.subtitle = subtitle;
  }

  const footnote = buildOptionalLocalizedField(block, "FOOTNOTE_BM", "FOOTNOTE_EN");
  if (footnote) {
    ayah.footnote = footnote;
  }

  return ayah;
}

function parseAyahNumber(label) {
  const match = label.match(/^#\s*Ayah\s+(\d+)$/i);
  if (!match) {
    throw new Error(`Invalid ayah block header: ${label}`);
  }

  return Number(match[1]);
}

function requireField(block, key, ayahNumber) {
  const value = block[key];
  if (!value) {
    throw new Error(`Ayah ${ayahNumber} is missing required field ${key}`);
  }

  return value;
}

function buildOptionalLocalizedField(block, bmKey, enKey) {
  const bm = block[bmKey];
  const en = block[enKey];

  if (!bm && !en) {
    return null;
  }

  if (!bm || !en) {
    throw new Error(`Optional localized field must include both ${bmKey} and ${enKey}`);
  }

  return { bm, en };
}

function validateAyahs(surahNumber, ayahs, expectedOfficialAyahs) {
  const ayahNumbers = ayahs.map((ayah) => ayah.number);
  const uniqueNumbers = new Set(ayahNumbers);

  if (uniqueNumbers.size !== ayahNumbers.length) {
    throw new Error(`Surah ${surahNumber} contains duplicate ayah numbers.`);
  }

  const hasAyahZero = uniqueNumbers.has(0);
  if ((surahNumber === 1 || surahNumber === 9) && hasAyahZero) {
    throw new Error(`Surah ${surahNumber} must not include Ayah 0.`);
  }

  const invalidAyahs = ayahNumbers.filter((number) => !Number.isInteger(number) || number < 0);
  if (invalidAyahs.length > 0) {
    throw new Error(`Surah ${surahNumber} contains invalid ayah numbers: ${invalidAyahs.join(", ")}.`);
  }

  const officialAyahNumbers = ayahNumbers.filter((number) => number >= 1);
  if (officialAyahNumbers.length !== expectedOfficialAyahs) {
    throw new Error(
      `Surah ${surahNumber} expected ${expectedOfficialAyahs} official ayahs but found ${officialAyahNumbers.length}. Ayah 0 is preserved but not counted.`,
    );
  }

  for (let index = 0; index < officialAyahNumbers.length; index += 1) {
    const expectedNumber = index + 1;
    if (officialAyahNumbers[index] !== expectedNumber) {
      throw new Error(
        `Surah ${surahNumber} official ayah sequence must be continuous from 1 to ${expectedOfficialAyahs}. Found ${officialAyahNumbers[index]} where ${expectedNumber} was expected.`,
      );
    }
  }

  return officialAyahNumbers.length;
}

function ensureDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}
