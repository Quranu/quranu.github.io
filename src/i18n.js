export const STORAGE_KEY = "quran-ui-language";

export const uiText = {
  ms: {
    appTitle: "Quran",
    appSubtitle: "Dengan Nama Allah yang Maha Pengasih lagi Maha Penyayang",
    appKicker: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    languageLabel: "Bahasa Antara Muka",
    listKicker: "Senarai Sura",
    listHeading: "Pilih Sura",
    searchPlaceholder: "Cari sura, contoh 114, 19:4, atau kata kunci",
    searchLabel: "Cari sura",
    searchHint: "Contoh: 114, 19:4, atau manusia.",
    searchButton: "Cari",
    searchCount: ({ visible, total }) => `${visible} daripada ${total} sura`,
    keywordResults: ({ count, query }) => `${count} padanan untuk "${query}"`,
    invalidReference: "Rujukan tidak sah. Gunakan format seperti 1:4 atau nombor sura 1 hingga 114.",
    invalidAyahReference: "Ayat yang diminta tidak dijumpai dalam sura ini.",
    unavailableSearch:
      "Carian kandungan hanya tersedia untuk sura yang sudah diproses ke JSON.",
    noKeywordResults: "Tiada ayat sepadan dalam terjemahan yang tersedia.",
    jumpToSurah: "Buka sura",
    readerHeading: "Sura",
    backToList: "Kembali ke senarai",
    introTitle: "Mulakan dengan satu sura",
    introCopy:
      "Pilih sura daripada senarai untuk melihat teks Arab, terjemahan mengikut bahasa semasa, dan butang audio bagi setiap ayat.",
    available: "Tersedia",
    unavailable: "Akan datang",
    noResults: "Tiada sura sepadan dengan carian anda.",
    loadingSurah: "Memuatkan data sura...",
    unavailableSurah:
      "Data ayat untuk sura ini belum ditambah lagi. Anda boleh tambah fail `.txt` baharu dan jalankan parser untuk mengaktifkannya.",
    fetchError: "Data sura tidak dapat dimuatkan sekarang.",
    ayahLabel: "Ayat",
    bmLabel: "Terjemahan Bahasa Melayu",
    enLabel: "English Translation",
    playAudio: "Main audio",
    pauseAudio: "Henti audio",
    noAudio: "Tiada audio",
    resultSnippetLabel: "Petikan padanan",
  },
  en: {
    appTitle: "Quran",
    appSubtitle: "In the name of God, Most Gracious, Most Merciful",
    appKicker: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    languageLabel: "Interface Language",
    listKicker: "Sura List",
    listHeading: "Choose a Sura",
    searchPlaceholder: "Search sura, e.g. 114, 19:4, or keyword",
    searchLabel: "Search sura",
    searchHint: "Examples: 114, 19:4, or manusia.",
    searchButton: "Search",
    searchCount: ({ visible, total }) => `${visible} of ${total} suras`,
    keywordResults: ({ count, query }) => `${count} matches for "${query}"`,
    invalidReference: "Invalid reference. Use a format like 1:4 or a sura number from 1 to 114.",
    invalidAyahReference: "The requested ayah was not found in this sura.",
    unavailableSearch:
      "Content search only works for suras that have already been processed to JSON.",
    noKeywordResults: "No ayah matched in the available translations.",
    jumpToSurah: "Open sura",
    readerHeading: "Sura",
    backToList: "Back to list",
    introTitle: "Start with a sura",
    introCopy:
      "Pick a sura from the list to view Arabic text, the translation for the current interface language, and an audio button for each ayah.",
    available: "Available",
    unavailable: "Coming soon",
    noResults: "No sura matched your search.",
    loadingSurah: "Loading sura data...",
    unavailableSurah:
      "Ayah data for this sura has not been added yet. Add a new `.txt` file and run the parser to enable it.",
    fetchError: "The sura data could not be loaded right now.",
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
