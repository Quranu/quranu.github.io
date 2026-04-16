const fs = require("fs");
const path = require("path");
const https = require("https");

const rawDir = path.join(__dirname, "..", "data", "raw");
const baseUrl = "https://www.masjidtucson.org/quran/frames";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const rawFiles = fs
    .readdirSync(rawDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^surah-\d{3}\.txt$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  let totalUpdatedLines = 0;
  const warnings = [];

  for (const fileName of rawFiles) {
    const surahNumber = Number(fileName.match(/^surah-(\d{3})\.txt$/i)[1]);
    const url = `${baseUrl}/ch${surahNumber}.html`;
    const html = await fetchText(url);
    const translationsByAyah = extractTranslations(html, surahNumber);

    const rawFilePath = path.join(rawDir, fileName);
    const original = fs.readFileSync(rawFilePath, "utf8");
    const { content, replacements, ayahCount, missingAyahs } = updateRawEnglish(
      original,
      translationsByAyah,
      surahNumber,
    );

    if (translationsByAyah.size !== ayahCount) {
      warnings.push(
        `Sura ${surahNumber}: fetched ${translationsByAyah.size} verse(s) from ${url} but raw file contains ${ayahCount} ayah block(s). Missing from source: ${missingAyahs.join(", ") || "none"}.`,
      );
    }

    if (content !== original) {
      fs.writeFileSync(rawFilePath, content, "utf8");
    }

    totalUpdatedLines += replacements;
    console.log(
      `Sura ${String(surahNumber).padStart(3, "0")}: fetched ${translationsByAyah.size} verse(s), updated ${replacements} English line(s).`,
    );
  }

  console.log(`Completed all ${rawFiles.length} suras. Updated ${totalUpdatedLines} English ayah line(s).`);

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
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

function extractTranslations(html, surahNumber) {
  const normalized = decodeHtmlEntities(stripHtml(html))
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ");

  const translationsByAyah = new Map();
  const versePattern = new RegExp(`\\[${surahNumber}:(\\d+)\\]\\s*([^\\n]+)`, "g");

  for (const match of normalized.matchAll(versePattern)) {
    const ayahNumber = Number(match[1]);
    const translation = normalizeWhitespace(match[2]);

    if (translation) {
      translationsByAyah.set(ayahNumber, translation);
    }
  }

  if (translationsByAyah.size === 0) {
    throw new Error(`No verse translations found for Sura ${surahNumber}.`);
  }

  return translationsByAyah;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d|center|table|tbody|td)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function decodeHtmlEntities(text) {
  return text
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
    .replace(/&hellip;/g, "...");
}

function normalizeWhitespace(text) {
  return text.replace(/[ \t]+/g, " ").trim();
}

function updateRawEnglish(content, translationsByAyah, surahNumber) {
  const lines = content.split(/\r?\n/);
  const updatedLines = [];
  let currentAyahNumber = null;
  let replacements = 0;
  let ayahCount = 0;
  const missingAyahs = [];

  for (const line of lines) {
    const ayahMatch = line.match(/^#\s*Ayah\s+(\d+)$/i);
    if (ayahMatch) {
      currentAyahNumber = Number(ayahMatch[1]);
      ayahCount += 1;
      updatedLines.push(line);
      continue;
    }

    if (currentAyahNumber !== null && line.startsWith("EN: ")) {
      const replacement = translationsByAyah.get(currentAyahNumber);
      if (!replacement) {
        missingAyahs.push(currentAyahNumber);
        updatedLines.push(line);
        continue;
      }

      updatedLines.push(`EN: ${replacement}`);
      replacements += 1;
      continue;
    }

    updatedLines.push(line);
  }

  return {
    content: `${updatedLines.join("\n")}\n`,
    replacements,
    ayahCount,
    missingAyahs,
  };
}
