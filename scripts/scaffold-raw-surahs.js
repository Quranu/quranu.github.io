const fs = require("fs");
const path = require("path");

const rawDir = path.join(__dirname, "..", "data", "raw");
const catalog = require(path.join(__dirname, "..", "data", "processed", "surah-catalog.json"));

const bmTranslatedSuraNames = {
  1: "Kunci",
  2: "Sapi Betina",
  3: "Keluarga Imran",
  4: "Wanita",
  5: "Hidangan",
  6: "Ternakan",
  7: "Tempat Tertinggi",
  8: "Rampasan Perang",
  9: "Taubat",
  10: "Yunus",
  11: "Hud",
  12: "Yusuf",
  13: "Guruh",
  14: "Ibrahim",
  15: "Al-Hijr",
  16: "Lebah",
  17: "Perjalanan Malam",
  18: "Gua",
  19: "Maryam",
  20: "Ta Ha",
  21: "Para Nabi",
  22: "Haji",
  23: "Orang Beriman",
  24: "Cahaya",
  25: "Pembeza",
  26: "Penyair",
  27: "Semut",
  28: "Kisah-Kisah",
  29: "Labah-Labah",
  30: "Rom",
  31: "Luqman",
  32: "Sujud",
  33: "Golongan Bersekutu",
  34: "Saba'",
  35: "Pencipta",
  36: "Ya Sin",
  37: "Yang Berbaris",
  38: "Sad",
  39: "Rombongan",
  40: "Yang Mengampuni",
  41: "Yang Dijelaskan",
  42: "Musyawarah",
  43: "Perhiasan Emas",
  44: "Asap",
  45: "Yang Berlutut",
  46: "Bukit-Bukit Pasir",
  47: "Muhammad",
  48: "Kemenangan",
  49: "Bilik-Bilik",
  50: "Qaf",
  51: "Angin Yang Menerbangkan",
  52: "Bukit Thur",
  53: "Bintang",
  54: "Bulan",
  55: "Yang Maha Pemurah",
  56: "Yang Tak Terelakkan",
  57: "Besi",
  58: "Wanita Yang Mengajukan Gugatan",
  59: "Pengusiran",
  60: "Wanita Yang Diuji",
  61: "Barisan",
  62: "Hari Jumat",
  63: "Orang Munafik",
  64: "Hari Penampakan Kerugian",
  65: "Talak",
  66: "Pengharaman",
  67: "Kerajaan",
  68: "Pena",
  69: "Hari Kebenaran",
  70: "Tempat Naik",
  71: "Nuh",
  72: "Jin",
  73: "Orang Yang Berselimut",
  74: "Orang Yang Berselubung",
  75: "Kiamat",
  76: "Manusia",
  77: "Yang Diutus",
  78: "Berita Besar",
  79: "Yang Mencabut",
  80: "Dia Bermuka Masam",
  81: "Penggulungan",
  82: "Terbelah",
  83: "Orang-Orang Curang",
  84: "Terbelahnya Langit",
  85: "Gugusan Bintang",
  86: "Yang Datang Malam",
  87: "Yang Maha Tinggi",
  88: "Yang Meliputi",
  89: "Fajar",
  90: "Negeri",
  91: "Matahari",
  92: "Malam",
  93: "Waktu Dhuha",
  94: "Kelapangan",
  95: "Buah Tin",
  96: "Segumpal Darah",
  97: "Kemuliaan",
  98: "Bukti Nyata",
  99: "Goncangan",
  100: "Kuda Perang Yang Berlari",
  101: "Hari Kiamat",
  102: "Bermegah-Megahan",
  103: "Masa",
  104: "Pengumpat",
  105: "Gajah",
  106: "Quraisy",
  107: "Bantuan Kecil",
  108: "Nikmat Berlimpah",
  109: "Orang Kafir",
  110: "Pertolongan",
  111: "Sabut",
  112: "Ikhlas",
  113: "Waktu Subuh",
  114: "Manusia",
};

const bismillah = {
  ar: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  bm: "Dengan nama Allah, Yang Maha Pengasih, Maha Penyayang.",
  en: "In the name of GOD, Most Gracious, Most Merciful.",
};

main();

function main() {
  ensureDirectory(rawDir);

  const created = [];

  for (const sura of catalog) {
    const fileName = `surah-${String(sura.number).padStart(3, "0")}.txt`;
    const filePath = path.join(rawDir, fileName);

    if (fs.existsSync(filePath)) {
      continue;
    }

    const content = buildRawTemplate(sura);
    fs.writeFileSync(filePath, content, "utf8");
    created.push(fileName);
  }

  const allRawFiles = fs
    .readdirSync(rawDir)
    .filter((name) => /^surah-\d{3}\.txt$/.test(name))
    .sort();

  console.log(`Created ${created.length} raw sura template file(s).`);
  console.log(`Total raw sura files now: ${allRawFiles.length}.`);
}

function buildRawTemplate(sura) {
  const suraNumber = sura.number;
  const suraCode = String(suraNumber).padStart(3, "0");
  const lines = [
    `SURAH_NUMBER: ${suraNumber}`,
    `NAME_AR: ${sura.name.ar}`,
    `NAME_BM: ${bmTranslatedSuraNames[suraNumber] ?? sura.name.bm}`,
    `NAME_EN: ${sura.name.en}`,
    "---",
  ];

  if (shouldIncludeAyahZero(suraNumber)) {
    lines.push(...buildBismillahBlock(suraCode), "");
  }

  for (let ayahNumber = 1; ayahNumber <= sura.totalAyahs; ayahNumber += 1) {
    lines.push(...buildPlaceholderAyahBlock(suraCode, ayahNumber));

    if (ayahNumber < sura.totalAyahs) {
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}

function shouldIncludeAyahZero(suraNumber) {
  return suraNumber !== 1 && suraNumber !== 9;
}

function buildBismillahBlock(suraCode) {
  return [
    "# Ayah 0",
    `AR: ${bismillah.ar}`,
    `BM: ${bismillah.bm}`,
    `EN: ${bismillah.en}`,
    `AUDIO: https://everyayah.com/data/Alafasy_64kbps/${suraCode}000.mp3`,
  ];
}

function buildPlaceholderAyahBlock(suraCode, ayahNumber) {
  const ayahCode = String(ayahNumber).padStart(3, "0");
  const reference = `${suraCode}${ayahCode}`;

  return [
    `# Ayah ${ayahNumber}`,
    `AR: TODO_AR_${reference}`,
    `BM: TODO_BM_${reference}`,
    `EN: TODO_EN_${reference}`,
    `AUDIO: https://everyayah.com/data/Alafasy_64kbps/${reference}.mp3`,
  ];
}

function ensureDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}
