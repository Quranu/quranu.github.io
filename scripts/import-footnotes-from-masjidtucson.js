const fs = require("fs");
const path = require("path");
const https = require("https");

const rawDir = path.join(__dirname, "..", "data", "raw");
const baseUrl = "https://www.masjidtucson.org/quran/frames";
const bmSourcePath = process.argv[2] || "c:\\Users\\Lubis\\Desktop\\QI2_IN_data.txt";
const enSourcePath = process.argv[3] || "c:\\Users\\Lubis\\Desktop\\QI2_EN_data.txt";
const startSurah = Number(process.argv[4] || 3);
const endSurah = Number(process.argv[5] || 113);
const manualBmFootnotes = new Map([
  [
    "4:48",
    '*4:48 Penyembahan berhala tidak akan diampunkan jika dikekalkan hingga mati. Seseorang sentiasa boleh bertaubat daripada apa jua kesalahan, termasuk penyembahan berhala, sebelum kematian datang (lihat 4:18 & 40:66).',
  ],
  [
    "12:93",
    "*12:93 Ini menandakan permulaan Bani Israil di Mesir. Musa membawa mereka keluar dari Mesir beberapa abad kemudian.",
  ],
  [
    "13:37",
    '*13:37-38 Nombor ayat ini (38) = 19x2. Dengan meletakkan nilai "Rashad" (505) dan "Khalifa" (725) di sebelah 13:37-38, kita mendapat 505 725 13 37 38, iaitu 19x26617112302 (Lampiran 2).',
  ],
  [
    "14:21",
    "*14:21 Quran kerap membicarakan Akhirat dalam bentuk kala lampau. Ini kerana peristiwa-peristiwa masa depan itu telah pun disaksikan oleh Allah, dan pasti akan berlaku.",
  ],
  [
    "16:69",
    "*16:69 Selain nilai pemakanannya yang diiktiraf, madu telah dibuktikan secara saintifik sebagai ubat penyembuh bagi sesetengah alahan dan penyakit lain.",
  ],
  [
    "18:7",
    "*18:7 Lihat nota kaki bagi 18:8-9.",
  ],
  [
    "31:13",
    "*31:13 Bagaimanakah perasaan kamu jika kamu membesarkan seorang anak, memberinya pendidikan yang terbaik, dan mempersiapkannya untuk hidup, kemudian melihat dia berterima kasih kepada orang lain? Demikianlah penyembahan berhala; suatu kezaliman.",
  ],
  [
    "35:24",
    '*35:24 Nilai gematria "Rashad Khalifa" (1230), ditambah nombor ayat (24), menghasilkan jumlah yang merupakan gandaan 19 (1230+24=1254=19x66).',
  ],
  [
    "47:38",
    "*47:38 Quran diberikan kepada orang Arab, dalam bahasa mereka, selama 1400 tahun, tetapi mereka jelas menolaknya dan enggan percaya bahawa ia lengkap sepenuhnya; mereka mereka-reka Hadith dan Sunna.",
  ],
  [
    "66:1",
    "*66:1 Golongan Muhammadan di seluruh dunia percaya bahawa Muhammad tidak pernah melakukan kesilapan. Ayat ini mengajar kita bahawa beliau sememangnya manusia yang boleh tersilap (18:110, 33:37, 40:66, 80:1).",
  ],
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const globalVerseMap = buildGlobalVerseMap();
  const bmFootnotesByGlobalVerse = loadFootnoteSource(bmSourcePath);
  const enFootnotesByGlobalVerse = loadFootnoteSource(enSourcePath);
  const rawFiles = fs
    .readdirSync(rawDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^surah-\d{3}\.txt$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  let totalImported = 0;
  const warnings = [];

  for (const fileName of rawFiles) {
    const surahNumber = Number(fileName.match(/^surah-(\d{3})\.txt$/i)[1]);
    if (surahNumber < startSurah || surahNumber > endSurah) {
      continue;
    }

    const url = `${baseUrl}/ch${surahNumber}fn.html`;
    const html = await fetchText(url);
    const footnotesByAyah = extractFootnotes(
      html,
      surahNumber,
      globalVerseMap,
      bmFootnotesByGlobalVerse,
      enFootnotesByGlobalVerse,
      warnings,
    );

    const rawFilePath = path.join(rawDir, fileName);
    const original = fs.readFileSync(rawFilePath, "utf8");
    const updated = updateRawFootnotes(original, footnotesByAyah);

    if (updated.content !== original) {
      fs.writeFileSync(rawFilePath, updated.content, "utf8");
    }

    totalImported += updated.replacements;
    console.log(
      `Sura ${String(surahNumber).padStart(3, "0")}: updated ${updated.replacements} footnote pair(s).`,
    );
  }

  console.log(`Completed footnote import. Updated ${totalImported} footnote pair(s).`);

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
}

function loadFootnoteSource(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const footnoteByGlobalVerse = new Map();

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^v\|(\d+)\|[^|]*\|[^|]*\|(.*)$/);
    if (!match) {
      continue;
    }

    const globalVerse = Number(match[1]);
    const footnote = normalizeSourceFootnote(match[2]);
    if (footnote) {
      footnoteByGlobalVerse.set(globalVerse, footnote);
    }
  }

  return footnoteByGlobalVerse;
}

function normalizeSourceFootnote(text) {
  return String(text ?? "")
    .replace(/___/g, "\n\n")
    .replace(/__/g, "\n\n")
    .replace(/_+/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<pre>([\s\S]*?)<\/pre>/gi, (_, block) => `\n${block}\n`)
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildGlobalVerseMap() {
  const map = new Map();
  const rawFiles = fs
    .readdirSync(rawDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^surah-\d{3}\.txt$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  let globalVerse = 0;

  for (const fileName of rawFiles) {
    const surahNumber = Number(fileName.match(/^surah-(\d{3})\.txt$/i)[1]);
    const lines = fs.readFileSync(path.join(rawDir, fileName), "utf8").split(/\r?\n/);

    for (const line of lines) {
      const match = line.match(/^#\s*Ayah\s+(\d+)$/i);
      if (!match) {
        continue;
      }

      const ayahNumber = Number(match[1]);
      if (shouldOmitVerse(surahNumber, ayahNumber)) {
        continue;
      }

      globalVerse += 1;
      map.set(`${surahNumber}:${ayahNumber}`, globalVerse);
    }
  }

  return map;
}

function shouldOmitVerse(surahNumber, ayahNumber) {
  return surahNumber === 9 && (ayahNumber === 128 || ayahNumber === 129);
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch ${url}: HTTP ${response.statusCode}`));
          response.resume();
          return;
        }

        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolve(body));
      })
      .on("error", reject);
  });
}

function extractFootnotes(
  html,
  surahNumber,
  globalVerseMap,
  bmFootnotesByGlobalVerse,
  enFootnotesByGlobalVerse,
  warnings,
) {
  const footnotesByAyah = new Map();
  const pattern = /<p class="foot">([\s\S]*?)<\/p>/gi;
  let match;

  while ((match = pattern.exec(html))) {
    const footnoteHtml = match[1];
    const footnoteText = normalizeHtmlFootnote(footnoteHtml);
    const referenceMatch = footnoteText.match(/^\*(\d+):(\d+)(?:-\d+)?\b/);

    if (!referenceMatch) {
      continue;
    }

    const matchedSurah = Number(referenceMatch[1]);
    const ayahNumber = Number(referenceMatch[2]);

    if (matchedSurah !== surahNumber) {
      continue;
    }

    const globalVerse = globalVerseMap.get(`${surahNumber}:${ayahNumber}`);
    if (!globalVerse) {
      warnings.push(`Missing global verse mapping for ${surahNumber}:${ayahNumber}.`);
      continue;
    }

    const key = `${surahNumber}:${ayahNumber}`;
    const bm = bmFootnotesByGlobalVerse.get(globalVerse) ?? manualBmFootnotes.get(key);
    const enFromSource = enFootnotesByGlobalVerse.get(globalVerse);
    const en = footnoteText || enFromSource;

    if (!bm) {
      warnings.push(`Missing BM footnote for ${surahNumber}:${ayahNumber}.`);
      continue;
    }

    if (!en) {
      warnings.push(`Missing EN footnote for ${surahNumber}:${ayahNumber}.`);
      continue;
    }

    footnotesByAyah.set(ayahNumber, {
      bm,
      en,
    });
  }

  return footnotesByAyah;
}

function normalizeHtmlFootnote(html) {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/a>/gi, "")
      .replace(/<a\b[^>]*>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function decodeHtmlEntities(text) {
  return String(text ?? "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "--")
    .replace(/&ndash;/g, "-")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, "\"")
    .replace(/&hellip;/g, "...")
    .trim();
}

function updateRawFootnotes(content, footnotesByAyah) {
  const lines = content.split(/\r?\n/);
  const dividerIndex = lines.findIndex((line) => line.trim() === "---");
  const headerLines = lines.slice(0, dividerIndex + 1);
  const bodyLines = lines.slice(dividerIndex + 1);
  const output = [...headerLines];

  let currentBlock = [];
  let replacements = 0;

  for (const line of bodyLines) {
    if (line.trim().startsWith("#")) {
      if (currentBlock.length > 0) {
        const result = rewriteAyahBlock(currentBlock, footnotesByAyah);
        output.push(...result.lines);
        replacements += result.replaced ? 1 : 0;
      }
      currentBlock = [line];
      continue;
    }

    if (currentBlock.length === 0) {
      if (line.trim() || output[output.length - 1] !== "") {
        output.push(line);
      }
      continue;
    }

    currentBlock.push(line);
  }

  if (currentBlock.length > 0) {
    const result = rewriteAyahBlock(currentBlock, footnotesByAyah);
    output.push(...result.lines);
    replacements += result.replaced ? 1 : 0;
  }

  return {
    content: `${trimTrailingBlankLines(output).join("\n")}\n`,
    replacements,
  };
}

function rewriteAyahBlock(blockLines, footnotesByAyah) {
  const header = blockLines[0];
  const ayahMatch = header.match(/^#\s*Ayah\s+(\d+)$/i);
  const ayahNumber = ayahMatch ? Number(ayahMatch[1]) : null;
  const footnote = footnotesByAyah.get(ayahNumber);

  const fields = parseBlockFields(blockLines.slice(1));
  delete fields.FOOTNOTE_BM;
  delete fields.FOOTNOTE_EN;

  const output = [header];

  for (const key of ["AR", "BM", "EN", "AUDIO", "SUBTITLE_BM", "SUBTITLE_EN"]) {
    if (fields[key] !== undefined) {
      appendField(output, key, fields[key]);
    }
  }

  if (footnote) {
    appendField(output, "FOOTNOTE_BM", footnote.bm);
    appendField(output, "FOOTNOTE_EN", footnote.en);
  }

  output.push("");
  return {
    lines: output,
    replaced: Boolean(footnote),
  };
}

function parseBlockFields(lines) {
  const fields = {};
  let currentKey = null;

  for (const line of lines) {
    const fieldMatch = line.match(/^([A-Z_]+):\s?(.*)$/);
    if (fieldMatch) {
      const [, key, value] = fieldMatch;
      fields[key] = value;
      currentKey = key;
      continue;
    }

    if (currentKey && isMultilineField(currentKey)) {
      fields[currentKey] = `${fields[currentKey]}\n${line}`;
    } else if (line.trim()) {
      throw new Error(`Unexpected line inside ayah block: ${line}`);
    }
  }

  return fields;
}

function appendField(lines, key, value) {
  const text = String(value ?? "");
  const parts = text.split("\n");
  lines.push(`${key}: ${parts[0] ?? ""}`);
  for (let index = 1; index < parts.length; index += 1) {
    lines.push(parts[index]);
  }
}

function isMultilineField(key) {
  return key.startsWith("FOOTNOTE_");
}

function trimTrailingBlankLines(lines) {
  const trimmed = [...lines];
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === "") {
    trimmed.pop();
  }
  return trimmed;
}
