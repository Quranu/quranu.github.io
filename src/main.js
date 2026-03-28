import { AudioController } from "./audioController.js";
import { getInitialLanguage, translate } from "./i18n.js";
import { bmTranslatedSuraNames } from "./suraNames.js";

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
  audioErrors: new Set(),
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
  surahList: document.querySelector("#surah-list"),
  readerHeading: document.querySelector("#reader-heading"),
  backToList: document.querySelector("#back-to-list"),
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
      playIcon: renderAudioIcon("play"),
      pauseIcon: renderAudioIcon("stop"),
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

    if (number === appState.activeSurahNumber && appState.activeSurah?.surahNumber === number) {
      if (appState.isMobile) {
        appState.mobileView = "reader";
        syncResponsiveLayout();
        scrollToReader();
      }
      return;
    }

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

    const reference = button.dataset.audioReference ?? "";

    await audioController.toggle(button.dataset.audioUrl, button, {
      playIcon: renderAudioIcon("play"),
      pauseIcon: renderAudioIcon("stop"),
      errorIcon: renderAudioIcon("error"),
      playLabel: translate(appState.language, "playAudioFor", { reference }),
      pauseLabel: translate(appState.language, "stopAudioFor", { reference }),
      errorLabel: translate(appState.language, "audioErrorFor", { reference }),
    });

    if (button.classList.contains("has-error")) {
      const audioKey = button.dataset.audioKey;
      if (audioKey) {
        appState.audioErrors.add(audioKey);
      }
    }
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
  const visible = appState.filteredCatalog.length;

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
      const displayNames = getSurahCardDisplayNames(surah);

      return `
        <button
          class="surah-card ${isActive ? "active" : ""} ${surah.available ? "" : "unavailable"}"
          type="button"
          data-surah-number="${surah.number}"
        >
          <div class="surah-row">
            <span class="surah-number">${surah.number}</span>
            <div class="surah-name-group">
              <h3>${displayNames.primary}</h3>
              <p class="surah-meta">${displayNames.secondary} • ${surah.name.ar}</p>
              <p class="surah-meta">${formatVerseCount(surah.totalAyahs)}</p>
            </div>
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
      const primaryName = getSuraDisplayName(result);
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
    playIcon: renderAudioIcon("play"),
    pauseIcon: renderAudioIcon("stop"),
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
    elements.ayahList.innerHTML = "";
    return;
  }

  if (selected && !surah) {
    resetReaderPanelPosition();
    elements.readerHeading.textContent = formatSuraTitle(selected.number, getSuraDisplayName(selected));
  }

  if (!surah) {
    elements.ayahList.innerHTML = "";
    return;
  }

  resetReaderPanelPosition();
  elements.readerHeading.textContent = formatSuraTitle(surah.surahNumber, getSuraDisplayName(surah));

  elements.ayahList.innerHTML = surah.ayahs
    .map((ayah) => {
      const reference = formatAyahReference(surah.surahNumber, ayah.number);
      const audioPath = getAudioPath(surah.surahNumber, ayah.number, ayah.audio);
      const audioKey = getAudioKey(surah.surahNumber, ayah.number);
      const hasAudio = Boolean(audioPath) && !appState.audioErrors.has(audioKey);
      const translation = getActiveTranslation(ayah);
      const subtitle = getOptionalLocalizedContent(ayah.subtitle);
      const footnote = getOptionalLocalizedContent(ayah.footnote);
      const isTarget = ayah.number === appState.highlightedAyahNumber;
      return `
        <article class="ayah-card ${isTarget ? "is-target" : ""}" data-ayah-number="${ayah.number}">
          ${subtitle ? `<p class="ayah-subtitle">${subtitle}</p>` : ""}
          <div class="ayah-head">
            <span class="ayah-badge">${formatAyahReference(surah.surahNumber, ayah.number)}</span>
            <button
              class="audio-button"
              type="button"
              data-audio-url="${hasAudio ? audioPath : ""}"
              data-audio-reference="${reference}"
              data-audio-key="${audioKey}"
              aria-pressed="false"
              aria-label="${translate(
                appState.language,
                hasAudio ? "playAudioFor" : "audioUnavailableFor",
                { reference },
              )}"
              title="${translate(
                appState.language,
                hasAudio ? "playAudioFor" : "audioUnavailableFor",
                { reference },
              )}"
              ${hasAudio ? "" : "disabled"}
            >
              ${renderAudioIcon(hasAudio ? "play" : "disabled")}
            </button>
          </div>

          <div class="translation-block">
            <p class="ayah-translation">${translation}</p>
            <p class="ayah-arabic" dir="rtl">${ayah.arabic}</p>
            ${footnote ? `<p class="ayah-footnote">${footnote}</p>` : ""}
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

function getOptionalLocalizedContent(localizedValue) {
  if (!localizedValue) {
    return "";
  }

  if (appState.language === "en") {
    return localizedValue.en ?? "";
  }

  return localizedValue.bm ?? "";
}

function resetReaderPanelPosition() {
  elements.readerPanel.scrollTop = 0;
}

function getSurahCardDisplayNames(surah) {
  return {
    primary: getSuraDisplayName(surah),
    secondary: getSuraSecondaryName(surah),
  };
}

function getSuraDisplayName(suraLike) {
  const { number, name } = getSuraNameParts(suraLike);
  if (appState.language === "ms") {
    return bmTranslatedSuraNames[number] ?? name.en ?? name.bm;
  }

  return name.en;
}

function getSuraSecondaryName(suraLike) {
  const { name } = getSuraNameParts(suraLike);
  return name.bm;
}

function getSuraNameParts(suraLike) {
  return {
    number: suraLike.number ?? suraLike.surahNumber,
    name: suraLike.name ?? suraLike.surahName,
  };
}

function formatVerseCount(totalAyahs) {
  return translate(appState.language, "verseCount", { count: totalAyahs });
}

function formatAyahReference(surahNumber, ayahNumber) {
  return `${surahNumber}:${ayahNumber}`;
}

function getAudioPath(surahNumber, ayahNumber, audioPath) {
  if (audioPath) {
    return audioPath;
  }

  const sura = String(surahNumber).padStart(3, "0");
  const audioFile = `${sura}${String(ayahNumber).padStart(3, "0")}`;
  return `./assets/audio/${sura}/${audioFile}.mp3`;
}

function getAudioKey(surahNumber, ayahNumber) {
  return `${String(surahNumber).padStart(3, "0")}:${String(ayahNumber).padStart(3, "0")}`;
}

function renderAudioIcon(state) {
  if (state === "stop") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="7" y="7" width="10" height="10" rx="2"></rect>
      </svg>
    `;
  }

  if (state === "error") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 4 3 20h18L12 4Zm0 5.5c.41 0 .75.34.75.75v4.5a.75.75 0 0 1-1.5 0v-4.5c0-.41.34-.75.75-.75Zm0 8.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 6.5v11l9-5.5-9-5.5Z"></path>
    </svg>
  `;
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
