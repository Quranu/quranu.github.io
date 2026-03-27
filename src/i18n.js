export const STORAGE_KEY = "quran-ui-language";

export const uiText = {
  ms: {
    appTitle: "Quran Ringkas",
    appSubtitle: "Bacaan pantas yang kemas, ringan, dan mesra telefon.",
    appKicker: "Al-Quran Digital",
    languageLabel: "Bahasa Antara Muka",
    listKicker: "Senarai Surah",
    listHeading: "Pilih Surah",
    searchPlaceholder: "Cari surah, contoh 114, 19:4, atau kata kunci",
    searchLabel: "Cari surah",
    searchHint: "Contoh: 114, 19:4, atau manusia.",
    searchButton: "Cari",
    searchCount: ({ visible, total }) => `${visible} daripada ${total} surah`,
    keywordResults: ({ count, query }) => `${count} padanan untuk "${query}"`,
    invalidReference: "Rujukan tidak sah. Gunakan format seperti 1:4 atau nombor surah 1 hingga 114.",
    invalidAyahReference: "Ayat yang diminta tidak dijumpai dalam surah ini.",
    unavailableSearch:
      "Carian kandungan hanya tersedia untuk surah yang sudah diproses ke JSON.",
    noKeywordResults: "Tiada ayat sepadan dalam terjemahan yang tersedia.",
    jumpToSurah: "Buka surah",
    jumpToAyah: ({ surahNumber, ayahNumber }) => `Surah ${surahNumber} • Ayat ${ayahNumber}`,
    readerKicker: "Paparan Ayat",
    readerHeading: "Bacaan Surah",
    backToList: "Kembali ke senarai",
    introTitle: "Mulakan dengan satu surah",
    introCopy:
      "Pilih surah daripada senarai untuk melihat teks Arab, terjemahan mengikut bahasa semasa, dan butang audio bagi setiap ayat.",
    available: "Tersedia",
    unavailable: "Akan datang",
    noResults: "Tiada surah sepadan dengan carian anda.",
    loadingSurah: "Memuatkan data surah...",
    unavailableSurah:
      "Data ayat untuk surah ini belum ditambah lagi. Anda boleh tambah fail `.txt` baharu dan jalankan parser untuk mengaktifkannya.",
    fetchError: "Data surah tidak dapat dimuatkan sekarang.",
    ayahLabel: "Ayat",
    bmLabel: "Terjemahan Bahasa Melayu",
    enLabel: "English Translation",
    playAudio: "Main audio",
    pauseAudio: "Henti audio",
    noAudio: "Tiada audio",
    resultSnippetLabel: "Petikan padanan",
  },
  en: {
    appTitle: "Simple Quran",
    appSubtitle: "A clean, lightweight, mobile-first Quran reading experience.",
    appKicker: "Digital Quran",
    languageLabel: "Interface Language",
    listKicker: "Surah List",
    listHeading: "Choose a Surah",
    searchPlaceholder: "Search surah, e.g. 114, 19:4, or keyword",
    searchLabel: "Search surah",
    searchHint: "Examples: 114, 19:4, or manusia.",
    searchButton: "Search",
    searchCount: ({ visible, total }) => `${visible} of ${total} surahs`,
    keywordResults: ({ count, query }) => `${count} matches for "${query}"`,
    invalidReference: "Invalid reference. Use a format like 1:4 or a surah number from 1 to 114.",
    invalidAyahReference: "The requested ayah was not found in this surah.",
    unavailableSearch:
      "Content search only works for surahs that have already been processed to JSON.",
    noKeywordResults: "No ayah matched in the available translations.",
    jumpToSurah: "Open surah",
    jumpToAyah: ({ surahNumber, ayahNumber }) => `Surah ${surahNumber} • Ayah ${ayahNumber}`,
    readerKicker: "Ayah Reader",
    readerHeading: "Surah Reading",
    backToList: "Back to list",
    introTitle: "Start with a surah",
    introCopy:
      "Pick a surah from the list to view Arabic text, the translation for the current interface language, and an audio button for each ayah.",
    available: "Available",
    unavailable: "Coming soon",
    noResults: "No surah matched your search.",
    loadingSurah: "Loading surah data...",
    unavailableSurah:
      "Ayah data for this surah has not been added yet. Add a new `.txt` file and run the parser to enable it.",
    fetchError: "The surah data could not be loaded right now.",
    ayahLabel: "Ayah",
    bmLabel: "Bahasa Melayu Translation",
    enLabel: "English Translation",
    playAudio: "Play audio",
    pauseAudio: "Pause audio",
    noAudio: "No audio",
    resultSnippetLabel: "Matching snippet",
  },
};

export function getInitialLanguage() {
  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (saved && uiText[saved]) {
    return saved;
  }

  return "ms";
}

export function translate(language, key, params) {
  const entry = uiText[language]?.[key] ?? uiText.ms[key];
  return typeof entry === "function" ? entry(params ?? {}) : entry;
}
