const fs = require("fs");
const path = require("path");

const rawDir = path.join(__dirname, "..", "data", "raw");
const catalog = require(path.join(__dirname, "..", "data", "processed", "surah-catalog.json"));

const bmTranslatedSuraNames = {
  1: "Kunci",
  2: "Sapi Betina",
  3: "Keluarga Imran",
  4: "Perempuan",
  5: "Hidangan",
  6: "Binatang Ternakan",
  7: "Tempat Penungguan",
  8: "Harta Peperangan",
  9: "Memberikan Kata Putus",
  10: "Yunus",
  11: "Hud",
  12: "Yusuf",
  13: "Guruh",
  14: "Ibrahim",
  15: "Lembah",
  16: "Lebah",
  17: "Keturunan Israil",
  18: "Gua",
  19: "Maryam",
  20: "Tha Ha",
  21: "Para Nabi",
  22: "Menunaikan Haji",
  23: "Orang Orang Yang Percaya",
  24: "Cahaya",
  25: "Buku Perundangan",
  26: "Penyair Penyair",
  27: "Semut",
  28: "Sejarah",
  29: "Laba Laba",
  30: "Orang Orang Rom",
  31: "Luqman",
  32: "Sujud",
  33: "Parti Parti",
  34: "Sheba",
  35: "Yang Meinsiasikan Ciptaan",
  36: "Ya Sin",
  37: "Penyusun Penyusun",
  38: "Saad",
  39: "Kumpulan Orang Ramai",
  40: "Pengampun",
  41: "Perincian",
  42: "Perundingan",
  43: "Barang Barang Perhiasan",
  44: "Asap",
  45: "Berlutut",
  46: "Bukit Pasir",
  47: "Muhammad",
  48: "Kemenangan",
  49: "Dinding Dinding",
  50: "Qaf",
  51: "Penggerak Penggerak Angin",
  52: "Bukit Sinai",
  53: "Bintang Bintang",
  54: "Bulan",
  55: "Yang Maha Pengasih",
  56: "Yang Tidak Boleh Di-Elakkan Lagi",
  57: "Besi",
  58: "Perdebatan",
  59: "Pengusiran beramai Ramai",
  60: "Ujian",
  61: "Barisan",
  62: "Juma'at",
  63: "Orang Orang Hypokrit",
  64: "Saling Menuduh",
  65: "Perceraian",
  66: "Larangan",
  67: "Yang Menguasai Kerajaan Kerajaan",
  68: "Pena",
  69: "Tidak dapat Di-Pertikaikan",
  70: "Ketinggian",
  71: "Nuh",
  72: "Jin",
  73: "Yang Berselubung",
  74: "Rahsia Yang Tersembunyi",
  75: "Hari Kebangkitan",
  76: "Manusia",
  77: "Penghantaran",
  78: "Peristiwa",
  79: "Peragut",
  80: "Berkerut Dahi",
  81: "Menggulung",
  82: "Menghancurkan",
  83: "Para Penipu",
  84: "Perpecahan",
  85: "Bimasakti Bimasakti",
  86: "Bintang Yang Terang",
  87: "Yang Maha Tinggi",
  88: "Peristiwa Yang Amat Sangat",
  89: "Subuh",
  90: "Bandar",
  91: "Matahari",
  92: "Malam",
  93: "Pagi",
  94: "Mengawal Perasaan Marah",
  95: "Buah Tin",
  96: "Embrio",
  97: "Destini",
  98: "Bukti",
  99: "Gempa",
  100: "Berlari Kencang",
  101: "Memeranjatkan",
  102: "Mengumpulkan",
  103: "Petang Hari",
  104: "Pengumpat",
  105: "Gajah",
  106: "Kaum Quraish",
  107: "Derma",
  108: "Kemewahan",
  109: "Pengingkar Pengingkar",
  110: "Kemenangan",
  111: "Duri Duri",
  112: "Dengan Segala Kebenaran",
  113: "Matahari Terbit",
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
