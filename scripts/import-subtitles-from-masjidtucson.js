const fs = require("fs");
const path = require("path");
const https = require("https");

const rawDir = path.join(__dirname, "..", "data", "raw");
const baseUrl = "https://www.masjidtucson.org/quran/frames";
const bmSourcePath = process.argv[2] || "c:\\Users\\Lubis\\Desktop\\QI2_IN_data.txt";

const manualBmSubtitles = new Map([
  ["2:24", "Gambaran Alegori Tentang Neraka"],
  ["2:54", "Bunuhlah Ego Kamu*"],
  ["2:60", "Lebih Banyak Mukjizat"],
  ["2:165", "Berhala-Berhala Menolak Penyembah-Penyembahnya*"],
  ["2:259", "Pelajaran Tentang Kematian*"],
  ["3:145", "Waktu Kematian Telah Ditetapkan"],
  ["5:94", "Pemuliharaan Haiwan Buruan"],
  ["7:38", "Saling Menyalahkan"],
  ["9:1", "Tiada Basmalah*"],
  ["9:23", "Jika Kamu Perlu Membuat Pilihan"],
  ["9:64", "Orang-Orang Munafik"],
  ["15:61", "Lut"],
  ["17:46", "Quran: SATU-SATUNYA Sumber"],
  ["41:43", "Rasul Perjanjian Allah*"],
  ["69:19", "Orang-Orang Beriman"],
  ["110:0", "[Sura Terakhir Diturunkan]*"],
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const bmSubtitleByGlobalVerse = loadBmSubtitleSource(bmSourcePath);
  const globalVerseMap = buildGlobalVerseMap();
  const rawFiles = fs
    .readdirSync(rawDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^surah-\d{3}\.txt$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  let totalSubtitlePairs = 0;
  const warnings = [];

  for (const fileName of rawFiles) {
    const surahNumber = Number(fileName.match(/^surah-(\d{3})\.txt$/i)[1]);
    if (surahNumber <= 2) {
      continue;
    }

    const url = `${baseUrl}/ch${surahNumber}.html`;
    const html = await fetchText(url);
    const subtitlesByAyah = extractSubtitles(html, surahNumber, globalVerseMap, bmSubtitleByGlobalVerse, warnings);

    const rawFilePath = path.join(rawDir, fileName);
    const original = fs.readFileSync(rawFilePath, "utf8");
    const { content, replacements } = updateRawSubtitles(original, subtitlesByAyah);

    if (content !== original) {
      fs.writeFileSync(rawFilePath, content, "utf8");
    }

    totalSubtitlePairs += replacements;
    console.log(
      `Sura ${String(surahNumber).padStart(3, "0")}: updated ${replacements} subtitle pair(s).`,
    );
  }

  console.log(`Completed subtitle import. Updated ${totalSubtitlePairs} subtitle pair(s).`);

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
}

function loadBmSubtitleSource(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const subtitleByGlobalVerse = new Map();

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^v\|(\d+)\|([^|]*)\|([^|]*)\|/);
    if (!match) {
      continue;
    }

    const globalVerse = Number(match[1]);
    const subtitle = normalizeWhitespace(match[3]);
    if (subtitle) {
      subtitleByGlobalVerse.set(globalVerse, subtitle);
    }
  }

  return subtitleByGlobalVerse;
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

function extractSubtitles(html, surahNumber, globalVerseMap, bmSubtitleByGlobalVerse, warnings) {
  const subtitlesByAyah = new Map();
  const pattern = /(<p class="sub">[\s\S]*?<\/p>)|(<a name="(\d+)">\[(\d+):(\d+)\])/gi;
  let pendingSubtitles = [];
  let match;

  while ((match = pattern.exec(html))) {
    if (match[1]) {
      pendingSubtitles.push(decodeHtmlEntities(match[1].replace(/<[^>]+>/g, " ")));
      continue;
    }

    const matchedSurah = Number(match[4]);
    const ayahNumber = Number(match[5]);

    if (matchedSurah !== surahNumber || pendingSubtitles.length === 0) {
      continue;
    }

    const enSubtitle = pendingSubtitles.join(" / ");
    const key = `${surahNumber}:${ayahNumber}`;
    const globalVerse = globalVerseMap.get(key);
    const bmSubtitle =
      bmSubtitleByGlobalVerse.get(globalVerse) ??
      manualBmSubtitles.get(key);

    if (!bmSubtitle) {
      warnings.push(`Missing BM subtitle for ${key}: ${enSubtitle}`);
      pendingSubtitles = [];
      continue;
    }

    subtitlesByAyah.set(ayahNumber, {
      en: enSubtitle,
      bm: bmSubtitle,
    });
    pendingSubtitles = [];
  }

  return subtitlesByAyah;
}

function decodeHtmlEntities(text) {
  return normalizeWhitespace(
    text
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
      .replace(/&hellip;/g, "..."),
  );
}

function normalizeWhitespace(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function updateRawSubtitles(content, subtitlesByAyah) {
  const lines = content.split(/\r?\n/);
  const output = [];
  let currentAyahNumber = null;
  let replacements = 0;

  for (const line of lines) {
    const ayahMatch = line.match(/^#\s*Ayah\s+(\d+)$/i);
    if (ayahMatch) {
      currentAyahNumber = Number(ayahMatch[1]);
      output.push(line);
      continue;
    }

    if (line.startsWith("SUBTITLE_BM:") || line.startsWith("SUBTITLE_EN:")) {
      continue;
    }

    output.push(line);

    if (currentAyahNumber !== null && line.startsWith("AUDIO:")) {
      const subtitle = subtitlesByAyah.get(currentAyahNumber);
      if (subtitle) {
        output.push(`SUBTITLE_BM: ${subtitle.bm}`);
        output.push(`SUBTITLE_EN: ${subtitle.en}`);
        replacements += 1;
      }
    }
  }

  return {
    content: `${output.join("\n")}\n`,
    replacements,
  };
}
