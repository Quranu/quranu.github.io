import { AudioController } from "./audioController.js";
import { getInitialLanguage, translate } from "./i18n.js";

const appState = {
  language: getInitialLanguage(),
  catalog: [],
  filteredCatalog: [],
  activeSurahNumber: null,
  activeSurah: null,
  mobileView: "list",
  isMobile: window.matchMedia("(max-width: 859px)").matches,
  searchResults: [],
  searchMode: "browse",
  searchMessage: "",
  searchMessageIsWarning: false,
  highlightedAyahNumber: null,
  availableSurahCache: new Map(),
  searchQuery: "",
};

const elements = {
  layout: document.querySelector("#app-layout"),
  listPanel: document.querySelector("#surah-list-panel"),
  readerPanel: document.querySelector("#reader-panel"),
  appTitle: document.querySelector("#app-title"),
  appSubtitle: document.querySelector("#app-subtitle"),
  appKicker: document.querySelector("#app-kicker"),
  languageLabel: document.querySelector("#language-label"),
  languageSelect: document.querySelector("#language-select"),
  listKicker: document.querySelector("#list-kicker"),
  listHeading: document.querySelector("#surah-list-heading"),
  searchLabel: document.querySelector("#search-label"),
  searchForm: document.querySelector("#search-form"),
  surahSearch: document.querySelector("#surah-search"),
  searchSubmit: document.querySelector("#search-submit"),
  searchHint: document.querySelector("#search-hint"),
  searchFeedback: document.querySelector("#search-feedback"),
  searchResults: document.querySelector("#search-results"),
  surahCount: document.querySelector("#surah-count"),
  surahList: document.querySelector("#surah-list"),
  readerHeading: document.querySelector("#reader-heading"),
  backToList: document.querySelector("#back-to-list"),
  readerIntro: document.querySelector("#reader-intro"),
  introTitle: document.querySelector("#intro-title"),
  introCopy: document.querySelector("#intro-copy"),
  readerStatus: document.querySelector("#reader-status"),
  ayahList: document.querySelector("#ayah-list"),
};

const audioController = new AudioController();
const catalogUrl = new URL("../data/processed/surah-catalog.json", import.meta.url);
const mobileMediaQuery = window.matchMedia("(max-width: 859px)");

init().catch((error) => {
  console.error(error);
  renderStatus(translate(appState.language, "fetchError"), true);
});

async function init() {
  bindEvents();
  elements.surahSearch.value = appState.searchQuery;
  applyUiText();

  const catalogResponse = await fetch(catalogUrl);
  appState.catalog = await catalogResponse.json();
  appState.filteredCatalog = [...appState.catalog];

  renderSurahList();
  renderSearchResults();
  await loadSurah(1);
}

function bindEvents() {
  elements.languageSelect.value = appState.language;

  mobileMediaQuery.addEventListener("change", (event) => {
    appState.isMobile = event.matches;
    appState.mobileView = event.matches ? appState.mobileView : "reader";
    syncResponsiveLayout();
  });

  elements.languageSelect.addEventListener("change", (event) => {
    appState.language = event.target.value;
    window.localStorage.setItem("quran-ui-language", appState.language);
    audioController.stop({
      play: translate(appState.language, "playAudio"),
      pause: translate(appState.language, "pauseAudio"),
    });
    applyUiText();
    renderSurahList();
    renderSearchResults();
    renderReader();
  });

  elements.surahSearch.addEventListener("input", handleSearchInputChange);

  elements.searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleSearchSubmit();
  });

  elements.surahList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-surah-number]");
    if (!button) {
      return;
    }

    const number = Number(button.dataset.surahNumber);
    await loadSurah(number);

    if (appState.isMobile) {
      appState.mobileView = "reader";
      syncResponsiveLayout();
      scrollToReader();
    }
  });

  elements.ayahList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-audio-url]");
    if (!button) {
      return;
    }

    await audioController.toggle(button.dataset.audioUrl, button, {
      play: translate(appState.language, "playAudio"),
      pause: translate(appState.language, "pauseAudio"),
    });
  });

  elements.backToList.addEventListener("click", () => {
    if (appState.isMobile) {
      appState.mobileView = "list";
      syncResponsiveLayout();
      scrollToList();
      return;
    }

    scrollToList();
  });

  elements.searchResults.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-result-surah]");
    if (!button) {
      return;
    }

    const surahNumber = Number(button.dataset.resultSurah);
    const ayahNumber = Number(button.dataset.resultAyah);
    await openSurahAndMaybeAyah(surahNumber, ayahNumber);
  });
}

function handleSearchInputChange(event) {
  appState.searchQuery = event.target.value;
}

async function handleSearchSubmit() {
  await executeSearch(appState.searchQuery);
}

function applyUiText() {
  document.documentElement.lang = appState.language;
  document.title = translate(appState.language, "appTitle");

  elements.appTitle.textContent = translate(appState.language, "appTitle");
  elements.appSubtitle.textContent = translate(appState.language, "appSubtitle");
  elements.appKicker.textContent = translate(appState.language, "appKicker");
  elements.languageLabel.textContent = translate(appState.language, "languageLabel");
  elements.listKicker.textContent = translate(appState.language, "listKicker");
  elements.listHeading.textContent = translate(appState.language, "listHeading");
  elements.searchLabel.textContent = translate(appState.language, "searchLabel");
  elements.surahSearch.placeholder = translate(appState.language, "searchPlaceholder");
  elements.searchHint.textContent = translate(appState.language, "searchHint");
  elements.searchSubmit.textContent = translate(appState.language, "searchButton");
  elements.readerHeading.textContent = translate(appState.language, "readerHeading");
  elements.backToList.textContent = translate(appState.language, "backToList");
  elements.introTitle.textContent = translate(appState.language, "introTitle");
  elements.introCopy.textContent = translate(appState.language, "introCopy");
}

function syncResponsiveLayout() {
  elements.layout.classList.toggle("is-mobile-list-view", appState.isMobile && appState.mobileView === "list");
  elements.layout.classList.toggle(
    "is-mobile-reader-view",
    appState.isMobile && appState.mobileView === "reader",
  );
  elements.backToList.hidden = !appState.isMobile;
}

function renderSurahList() {
  const total = appState.catalog.length;
  const visible = appState.filteredCatalog.length;

  elements.surahCount.textContent = translate(appState.language, "searchCount", {
    visible,
    total,
  });

  if (appState.searchMode === "keyword") {
    elements.surahList.innerHTML = "";
    return;
  }

  if (visible === 0) {
    elements.surahList.innerHTML = `<div class="empty-state">${translate(appState.language, "noResults")}</div>`;
    return;
  }

  elements.surahList.innerHTML = appState.filteredCatalog
    .map((surah) => {
      const isActive = surah.number === appState.activeSurahNumber;
      const availabilityText = translate(
        appState.language,
        surah.available ? "available" : "unavailable",
      );
      const primaryName =
        appState.language === "ms" ? surah.name.bm : surah.name.en;
      const secondaryName =
        appState.language === "ms" ? surah.name.en : surah.name.bm;

      return `
        <button
          class="surah-card ${isActive ? "active" : ""} ${surah.available ? "" : "unavailable"}"
          type="button"
          data-surah-number="${surah.number}"
        >
          <div class="surah-row">
            <span class="surah-number">${surah.number}</span>
            <div class="surah-name-group">
              <h3>${primaryName}</h3>
              <p class="surah-meta">${secondaryName} • ${surah.name.ar}</p>
              <p class="surah-meta">${surah.totalAyahs} ayat</p>
            </div>
            <span class="availability-pill ${surah.available ? "available" : ""}">
              ${availabilityText}
            </span>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderSearchResults() {
  elements.searchFeedback.textContent = appState.searchMessage;
  elements.searchFeedback.classList.toggle("is-warning", appState.searchMessageIsWarning);

  if (appState.searchMode !== "keyword") {
    elements.searchResults.innerHTML = "";
    return;
  }

  if (appState.searchResults.length === 0) {
    elements.searchResults.innerHTML = `<div class="empty-state">${translate(appState.language, "noKeywordResults")}</div>`;
    return;
  }

  elements.searchResults.innerHTML = appState.searchResults
    .map((result) => {
      const primaryName =
        appState.language === "ms" ? result.surahName.bm : result.surahName.en;
      const snippet = highlightMatch(result.snippet, result.query);

      return `
        <button
          class="search-result-card"
          type="button"
          data-result-surah="${result.surahNumber}"
          data-result-ayah="${result.ayahNumber}"
        >
          <h3 class="result-title">${formatAyahReference(result.surahNumber, result.ayahNumber)}</h3>
          <p class="result-meta">${primaryName} • ${result.surahName.ar}</p>
          <p class="result-snippet">
            <span class="result-snippet-label">${translate(appState.language, "resultSnippetLabel")}</span>
            <br />
            ${snippet}
          </p>
        </button>
      `;
    })
    .join("");
}

async function loadSurah(number) {
  const selected = appState.catalog.find((surah) => surah.number === number);
  if (!selected) {
    return;
  }

  appState.activeSurahNumber = number;
  appState.activeSurah = null;
  audioController.stop({
    play: translate(appState.language, "playAudio"),
    pause: translate(appState.language, "pauseAudio"),
  });

  renderSurahList();

  if (!selected.available) {
    renderStatus(translate(appState.language, "unavailableSurah"), true);
    renderReader();
    return;
  }

  renderStatus(translate(appState.language, "loadingSurah"));
  renderReader();

  try {
    const surahUrl = new URL(
      `../data/processed/surah-${String(number).padStart(3, "0")}.json`,
      import.meta.url,
    );
    const response = await fetch(surahUrl);
    appState.activeSurah = await response.json();
    appState.availableSurahCache.set(number, appState.activeSurah);
    renderStatus("");
    renderReader();
  } catch (error) {
    console.error(error);
    renderStatus(translate(appState.language, "fetchError"), true);
    renderReader();
  }
}

async function openSurahAndMaybeAyah(surahNumber, ayahNumber = null) {
  const selected = appState.catalog.find((surah) => surah.number === surahNumber);
  if (!selected) {
    setSearchFeedback(translate(appState.language, "invalidReference"), true);
    renderSearchResults();
    return;
  }

  await loadSurah(surahNumber);

  if (appState.isMobile) {
    appState.mobileView = "reader";
    syncResponsiveLayout();
  }

  if (ayahNumber) {
    const foundAyah = appState.activeSurah?.ayahs.find((ayah) => ayah.number === ayahNumber);
    if (!foundAyah) {
      setSearchFeedback(translate(appState.language, "invalidAyahReference"), true);
      renderSearchResults();
      return;
    }

    await jumpToAyah(ayahNumber);
    return;
  }

  if (appState.isMobile) {
    scrollToReader();
  }
}

function scrollToReader() {
  requestAnimationFrame(() => {
    const top = window.scrollY + elements.readerPanel.getBoundingClientRect().top - getScrollOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  });
}

function scrollToList() {
  requestAnimationFrame(() => {
    elements.listPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderStatus(message, isWarning = false) {
  elements.readerStatus.textContent = message;
  elements.readerStatus.classList.toggle("is-warning", Boolean(message) && isWarning);
}

function renderReader() {
  const surah = appState.activeSurah;
  const selected = appState.catalog.find((item) => item.number === appState.activeSurahNumber);

  if (!selected && !surah) {
    elements.readerHeading.textContent = translate(appState.language, "readerHeading");
    elements.readerIntro.hidden = false;
    elements.ayahList.innerHTML = "";
    return;
  }

  elements.readerIntro.hidden = true;

  if (selected && !surah) {
    const pendingName =
      appState.language === "ms" ? selected.name.bm : selected.name.en;
    elements.readerHeading.textContent = formatSuraTitle(selected.number, pendingName);
  }

  if (!surah) {
    elements.ayahList.innerHTML = "";
    return;
  }

  const headingName =
    appState.language === "ms" ? surah.name.bm : surah.name.en;
  elements.readerHeading.textContent = formatSuraTitle(surah.surahNumber, headingName);

  elements.ayahList.innerHTML = surah.ayahs
    .map((ayah) => {
      const hasAudio = Boolean(ayah.audio);
      const translation = getActiveTranslation(ayah);
      const isTarget = ayah.number === appState.highlightedAyahNumber;
      return `
        <article class="ayah-card ${isTarget ? "is-target" : ""}" data-ayah-number="${ayah.number}">
          <div class="ayah-head">
            <span class="ayah-badge">${formatAyahReference(surah.surahNumber, ayah.number)}</span>
            <button
              class="audio-button"
              type="button"
              data-audio-url="${hasAudio ? ayah.audio : ""}"
              aria-pressed="false"
              ${hasAudio ? "" : "disabled"}
            >
              ${translate(appState.language, hasAudio ? "playAudio" : "noAudio")}
            </button>
          </div>

          <p class="ayah-arabic" dir="rtl">${ayah.arabic}</p>

          <div class="translation-block">
            <p class="ayah-translation">
              ${translation}
            </p>
          </div>
        </article>
      `;
    })
    .join("");
}

function getActiveTranslation(ayah) {
  if (appState.language === "en") {
    return ayah.en;
  }

  return ayah.bm;
}

function formatAyahReference(surahNumber, ayahNumber) {
  return `${surahNumber}:${ayahNumber}`;
}

function formatSuraTitle(suraNumber, suraName) {
  return `${translate(appState.language, "readerHeading")} ${suraNumber}: ${suraName}`;
}

function parseSearchInput(rawQuery) {
  const query = rawQuery.trim();

  if (!query) {
    return { type: "empty", query: "" };
  }

  const referenceMatch = query.match(/^(\d+)\s*:\s*(\d+)$/);
  if (referenceMatch) {
    return {
      type: "reference",
      surahNumber: Number(referenceMatch[1]),
      ayahNumber: Number(referenceMatch[2]),
      query,
    };
  }

  if (query.includes(":")) {
    return { type: "invalid", query };
  }

  if (/^\d+$/.test(query)) {
    return {
      type: "surah",
      surahNumber: Number(query),
      query,
    };
  }

  return { type: "keyword", query };
}

async function executeSearch(rawQuery) {
  const parsed = parseSearchInput(rawQuery);

  if (parsed.type === "empty") {
    resetSearchState();
    renderSurahList();
    renderSearchResults();
    return;
  }

  if (parsed.type === "invalid") {
    appState.searchMode = "browse";
    appState.searchResults = [];
    appState.filteredCatalog = [...appState.catalog];
    setSearchFeedback(translate(appState.language, "invalidReference"), true);
    renderSurahList();
    renderSearchResults();
    return;
  }

  if (parsed.type === "reference") {
    const selected = appState.catalog.find((surah) => surah.number === parsed.surahNumber);
    if (!selected || parsed.surahNumber < 1 || parsed.surahNumber > 114) {
      setSearchFeedback(translate(appState.language, "invalidReference"), true);
      renderSearchResults();
      return;
    }

    if (parsed.ayahNumber < 1 || parsed.ayahNumber > selected.totalAyahs) {
      setSearchFeedback(translate(appState.language, "invalidAyahReference"), true);
      renderSearchResults();
      return;
    }

    setSearchFeedback("", false);
    appState.searchMode = "browse";
    appState.searchResults = [];
    appState.filteredCatalog = [...appState.catalog];
    renderSurahList();
    renderSearchResults();
    await openSurahAndMaybeAyah(parsed.surahNumber, parsed.ayahNumber);
    return;
  }

  if (parsed.type === "surah") {
    if (parsed.surahNumber < 1 || parsed.surahNumber > 114) {
      setSearchFeedback(translate(appState.language, "invalidReference"), true);
      renderSearchResults();
      return;
    }

    setSearchFeedback("", false);
    appState.searchMode = "browse";
    appState.searchResults = [];
    appState.filteredCatalog = [...appState.catalog];
    renderSurahList();
    renderSearchResults();
    await openSurahAndMaybeAyah(parsed.surahNumber);
    return;
  }

  await runKeywordSearch(parsed.query);
}

async function runKeywordSearch(query) {
  const availableSurahs = appState.catalog.filter((surah) => surah.available);
  if (availableSurahs.length === 0) {
    appState.searchMode = "keyword";
    appState.searchResults = [];
    setSearchFeedback(translate(appState.language, "unavailableSearch"), true);
    renderSurahList();
    renderSearchResults();
    return;
  }

  await ensureAvailableSurahsLoaded();

  const normalizedQuery = query.trim().toLowerCase();
  const results = [];

  for (const surah of availableSurahs) {
    const surahData = appState.availableSurahCache.get(surah.number);
    if (!surahData) {
      continue;
    }

    for (const ayah of surahData.ayahs) {
      const bm = ayah.bm.toLowerCase();
      const en = ayah.en.toLowerCase();

      if (!bm.includes(normalizedQuery) && !en.includes(normalizedQuery)) {
        continue;
      }

      const snippetSource = bm.includes(normalizedQuery) ? ayah.bm : ayah.en;

      results.push({
        surahNumber: surah.number,
        surahName: surah.name,
        ayahNumber: ayah.number,
        snippet: buildSnippet(snippetSource, query),
        query,
      });
    }
  }

  appState.searchMode = "keyword";
  appState.searchResults = results;
  appState.filteredCatalog = [];
  setSearchFeedback(translate(appState.language, "keywordResults", {
    count: results.length,
    query,
  }), false);
  renderSurahList();
  renderSearchResults();
}

async function ensureAvailableSurahsLoaded() {
  const availableSurahs = appState.catalog.filter((surah) => surah.available);

  await Promise.all(
    availableSurahs.map(async (surah) => {
      if (appState.availableSurahCache.has(surah.number)) {
        return;
      }

      const surahUrl = new URL(
        `../data/processed/surah-${String(surah.number).padStart(3, "0")}.json`,
        import.meta.url,
      );
      const response = await fetch(surahUrl);
      const data = await response.json();
      appState.availableSurahCache.set(surah.number, data);
    }),
  );
}

function buildSnippet(text, query) {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const matchIndex = normalizedText.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return text;
  }

  const start = Math.max(0, matchIndex - 40);
  const end = Math.min(text.length, matchIndex + query.length + 50);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  return `${prefix}${text.slice(start, end)}${suffix}`;
}

function highlightMatch(text, query) {
  const escapedQuery = escapeRegExp(query.trim());
  if (!escapedQuery) {
    return escapeHtml(text);
  }

  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return escapeHtml(text).replace(regex, "<mark>$1</mark>");
}

async function jumpToAyah(ayahNumber) {
  appState.highlightedAyahNumber = ayahNumber;
  renderReader();

  const ayahElement = await waitForAyahRender(ayahNumber);
  if (!ayahElement) {
    return;
  }

  scrollToAyahElement(ayahElement);

  window.clearTimeout(jumpToAyah.timeoutId);
  jumpToAyah.timeoutId = window.setTimeout(() => {
    appState.highlightedAyahNumber = null;
    renderReader();
  }, 2200);
}

function waitForAyahRender(ayahNumber) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve(elements.ayahList.querySelector(`[data-ayah-number="${ayahNumber}"]`));
      });
    });
  });
}

function scrollToAyahElement(element) {
  requestAnimationFrame(() => {
    const elementTop = window.scrollY + element.getBoundingClientRect().top;
    const top = elementTop - getScrollOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  });
}

function getScrollOffset() {
  return appState.isMobile ? 18 : 24;
}

function setSearchFeedback(message, isWarning) {
  appState.searchMessage = message;
  appState.searchMessageIsWarning = isWarning;
}

function resetSearchState() {
  appState.searchMode = "browse";
  appState.searchResults = [];
  appState.filteredCatalog = [...appState.catalog];
  appState.highlightedAyahNumber = null;
  setSearchFeedback("", false);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

syncResponsiveLayout();
