import { AudioController } from "./audioController.js";
import { getInitialLanguage, translate } from "./i18n.js";
import { surahDisplayMeta } from "./surahDisplayMeta.js";
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
  isKeywordSearchLoading: false,
  loadingSurahNumber: null,
  surahRequestId: 0,
};

const elements = {
  layout: document.querySelector("#app-layout"),
  listPanel: document.querySelector("#surah-list-panel"),
  readerPanel: document.querySelector("#reader-panel"),
  scrollTopButton: document.querySelector("#scroll-top-button"),
  toast: document.querySelector("#app-toast"),
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
  searchClearButton: document.querySelector("#search-clear-button"),
  searchSubmit: document.querySelector("#search-submit"),
  searchHint: document.querySelector("#search-hint"),
  lastReadChip: document.querySelector("#last-read-chip"),
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
const LAST_READ_STORAGE_KEY = "quran-last-read";
let ignoreNextHashChange = false;

init().catch((error) => {
  console.error(error);
  renderStatus(translate(appState.language, "fetchError"), true);
});

async function init() {
  bindEvents();
  registerServiceWorker();
  elements.surahSearch.value = appState.searchQuery;
  applyUiText();
  syncScrollTopButton();

  const catalogResponse = await fetch(catalogUrl);
  appState.catalog = await catalogResponse.json();
  appState.filteredCatalog = [...appState.catalog];

  const hashTarget = parseHashReference(window.location.hash);
  const lastRead = getLastRead();
  const shouldOpenReaderOnInit = appState.isMobile && Boolean(hashTarget || lastRead);
  if (shouldOpenReaderOnInit) {
    appState.mobileView = "reader";
    syncResponsiveLayout();
  }

  renderSurahList();
  renderSearchResults();

  if (hashTarget) {
    await openSurahAndMaybeAyah(hashTarget.surahNumber, hashTarget.ayahNumber);
    renderLastReadChip();
    return;
  }

  const initialSurahNumber = lastRead?.surahNumber ?? 1;
  await loadSurah(initialSurahNumber);

  if (lastRead && appState.isMobile) {
    appState.mobileView = "reader";
    syncResponsiveLayout();
  }

  if (lastRead?.ayahNumber && appState.activeSurah?.surahNumber === initialSurahNumber) {
    const hasAyah = appState.activeSurah.ayahs.some((ayah) => ayah.number === lastRead.ayahNumber);
    if (hasAyah) {
      await jumpToAyah(lastRead.ayahNumber);
    }
  }

  renderLastReadChip();
}

function bindEvents() {
  elements.languageSelect.value = appState.language;
  window.addEventListener("scroll", syncScrollTopButton, { passive: true });
  window.addEventListener("hashchange", handleHashChange);

  mobileMediaQuery.addEventListener("change", (event) => {
    appState.isMobile = event.matches;
    appState.mobileView = event.matches ? appState.mobileView : "reader";
    syncResponsiveLayout();
    syncScrollTopButton();
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
  elements.searchClearButton.addEventListener("click", handleSearchClear);

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

    if (number === appState.loadingSurahNumber) {
      if (appState.isMobile) {
        appState.mobileView = "reader";
        syncResponsiveLayout();
      }
      return;
    }

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
    const copyLinkButton = event.target.closest("[data-copy-link]");
    if (copyLinkButton) {
      const surahNumber = Number(copyLinkButton.dataset.surahNumber);
      const ayahNumber = Number(copyLinkButton.dataset.ayahNumber);
      const reference = formatAyahReference(surahNumber, ayahNumber);
      const shareUrl = buildAyahShareUrl(surahNumber, ayahNumber);
      const copied = await copyTextToClipboard(shareUrl);

      showToast(
        copied
          ? getLinkCopiedToastMessage(reference, shareUrl)
          : translate(appState.language, "linkCopyFailedToast"),
      );
      return;
    }

    const lastReadButton = event.target.closest("[data-mark-last-read]");
    if (lastReadButton) {
      const surahNumber = Number(lastReadButton.dataset.surahNumber);
      const ayahNumber = Number(lastReadButton.dataset.ayahNumber);
      if (Number.isInteger(surahNumber) && Number.isInteger(ayahNumber)) {
        saveLastRead({ surahNumber, ayahNumber });
        renderReader();
        showToast(translate(appState.language, "lastReadSavedToast", {
          reference: formatAyahReference(surahNumber, ayahNumber),
        }));
      }
      return;
    }

    const button = event.target.closest("[data-audio-url]");
    if (!button) {
      return;
    }

    const reference = button.dataset.audioReference ?? "";

    await audioController.toggle(button.dataset.audioUrl, button, {
      playIcon: renderAudioIcon("play"),
      pauseIcon: renderAudioIcon("stop"),
      loadingIcon: renderAudioIcon("loading"),
      errorIcon: renderAudioIcon("error"),
      playLabel: translate(appState.language, "playAudioFor", { reference }),
      pauseLabel: translate(appState.language, "stopAudioFor", { reference }),
      loadingLabel: translate(appState.language, "loadingAudioFor", { reference }),
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

  elements.scrollTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  elements.lastReadChip.addEventListener("click", async () => {
    const lastRead = getLastRead();
    if (!lastRead) {
      return;
    }

    await openSurahAndMaybeAyah(lastRead.surahNumber, lastRead.ayahNumber);
  });
}

function handleSearchInputChange(event) {
  appState.searchQuery = event.target.value;
  syncSearchControls();
}

function handleSearchClear() {
  appState.searchQuery = "";
  elements.surahSearch.value = "";
  resetSearchState();
  syncSearchControls();
  renderSurahList();
  renderSearchResults();
  elements.surahSearch.focus();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed.", error);
    });
  }, { once: true });
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
  syncSearchControls();
  renderLastReadChip();
  elements.readerHeading.textContent = translate(appState.language, "readerHeading");
  elements.backToList.textContent = translate(appState.language, "backToList");
  elements.scrollTopButton.setAttribute("aria-label", translate(appState.language, "scrollTop"));
  elements.scrollTopButton.title = translate(appState.language, "scrollTop");
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
      const isLoading = surah.number === appState.loadingSurahNumber;
      const displayNames = getSurahCardDisplayNames(surah);

      return `
        <button
          class="surah-card ${isActive ? "active" : ""} ${surah.available ? "" : "unavailable"} ${isLoading ? "is-loading" : ""}"
          type="button"
          data-surah-number="${surah.number}"
          ${isLoading ? "disabled" : ""}
        >
          <div class="surah-row">
            <span class="surah-number">${surah.number}</span>
            <div class="surah-name-group">
              <h3>${displayNames.primary}</h3>
              <p class="surah-meta">${displayNames.secondary} • ${displayNames.arabic}</p>
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
      const secondaryName = getSuraSecondaryName(result);
      const arabicName = getSuraArabicDisplayName(result);
      const snippet = highlightMatch(result.snippet, result.query);

      return `
        <button
          class="search-result-card"
          type="button"
          data-result-surah="${result.surahNumber}"
          data-result-ayah="${result.ayahNumber}"
        >
          <h3 class="result-title">${formatAyahReference(result.surahNumber, result.ayahNumber)}</h3>
          <p class="result-meta">${primaryName} • ${secondaryName} • ${arabicName}</p>
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

  const requestId = appState.surahRequestId + 1;
  appState.surahRequestId = requestId;

  appState.activeSurahNumber = number;
  appState.activeSurah = null;
  appState.loadingSurahNumber = number;
  audioController.stop({
    playIcon: renderAudioIcon("play"),
    pauseIcon: renderAudioIcon("stop"),
    loadingIcon: renderAudioIcon("loading"),
  });

  renderSurahList();

  if (!selected.available) {
    appState.loadingSurahNumber = null;
    renderStatus(translate(appState.language, "unavailableSurah"), true);
    renderReader();
    renderSurahList();
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
    if (!response.ok) {
      throw new Error(`Failed to load sura ${number}: ${response.status}`);
    }

    appState.activeSurah = await response.json();
    if (appState.surahRequestId !== requestId) {
      return;
    }

    appState.availableSurahCache.set(number, appState.activeSurah);
    renderStatus("");
    appState.loadingSurahNumber = null;
    renderReader();
    renderSurahList();
  } catch (error) {
    if (appState.surahRequestId !== requestId) {
      return;
    }

    console.error(error);
    appState.loadingSurahNumber = null;
    renderStatus(translate(appState.language, "fetchError"), true);
    renderReader();
    renderSurahList();
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
  updateHashReference(surahNumber, ayahNumber);

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

function syncScrollTopButton() {
  const shouldShow = window.scrollY > 320;
  elements.scrollTopButton.classList.toggle("is-visible", shouldShow);
  elements.scrollTopButton.setAttribute("aria-hidden", String(!shouldShow));
}

function renderStatus(message, isWarning = false) {
  elements.readerStatus.textContent = message;
  elements.readerStatus.classList.toggle("is-warning", Boolean(message) && isWarning);
  elements.readerStatus.classList.toggle("is-loading", message === translate(appState.language, "loadingSurah"));
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
      const isLastRead = isLastReadAyah(surah.surahNumber, ayah.number);
      return `
        <article class="ayah-card ${isTarget ? "is-target" : ""} ${isLastRead ? "is-last-read" : ""}" data-ayah-number="${ayah.number}">
          ${subtitle ? `<p class="ayah-subtitle">${subtitle}</p>` : ""}
          <div class="ayah-head">
            <span class="ayah-badge">${reference}</span>
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
            ${footnote ? `<div class="ayah-footnote">${formatTrustedFootnoteHtml(footnote)}</div>` : ""}
          </div>

          <div class="ayah-toolbar">
            <button
              class="copy-link-button"
              type="button"
              data-copy-link="true"
              data-surah-number="${surah.surahNumber}"
              data-ayah-number="${ayah.number}"
              aria-label="${getCopyLinkButtonLabel(reference)}"
              title="${getCopyLinkButtonLabel(reference)}"
            >
              ${renderCopyLinkIcon()}
            </button>
            <button
              class="last-read-button ${isLastRead ? "is-marked" : ""}"
              type="button"
              data-mark-last-read="true"
              data-surah-number="${surah.surahNumber}"
              data-ayah-number="${ayah.number}"
              aria-pressed="${String(isLastRead)}"
              aria-label="${getLastReadButtonLabel(reference)}"
              title="${getLastReadButtonLabel(reference)}"
            >
              ${renderLastReadIcon()}
            </button>
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
    arabic: getSuraArabicDisplayName(surah),
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
  const { number, name } = getSuraNameParts(suraLike);
  return surahDisplayMeta[number]?.latin ?? name.bm;
}

function getSuraArabicDisplayName(suraLike) {
  const { number, name } = getSuraNameParts(suraLike);
  return surahDisplayMeta[number]?.arabic ?? name.ar;
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

function formatTrustedFootnoteHtml(content) {
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const parts = [];
  let lastIndex = 0;

  for (const match of content.matchAll(tableRegex)) {
    const [tableHtml] = match;
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      parts.push(formatFootnoteTextBlock(content.slice(lastIndex, matchIndex)));
    }

    parts.push(`<div class="ayah-footnote-table-wrap">${tableHtml}</div>`);
    lastIndex = matchIndex + tableHtml.length;
  }

  if (lastIndex < content.length) {
    parts.push(formatFootnoteTextBlock(content.slice(lastIndex)));
  }

  return parts.filter(Boolean).join("");
}

function formatFootnoteTextBlock(text) {
  const normalized = text.trim();
  if (!normalized) {
    return "";
  }

  return normalized
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
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
  return `https://everyayah.com/data/Alafasy_64kbps/${audioFile}.mp3`;
}

function getAudioKey(surahNumber, ayahNumber) {
  return `${String(surahNumber).padStart(3, "0")}:${String(ayahNumber).padStart(3, "0")}`;
}

function renderAudioIcon(state) {
  if (state === "loading") {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle class="audio-spinner-track" cx="12" cy="12" r="8"></circle>
        <path class="audio-spinner-head" d="M12 4a8 8 0 0 1 8 8"></path>
      </svg>
    `;
  }

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

function renderLastReadIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 4.75A1.75 1.75 0 0 1 8.75 3h6.5A1.75 1.75 0 0 1 17 4.75V21l-5-3.2L7 21V4.75Z"></path>
    </svg>
  `;
}

function getLastReadButtonLabel(reference) {
  const fallback = appState.language === "en"
    ? `Mark ${reference} as last read`
    : `Tandakan ${reference} sebagai bacaan terakhir`;
  return translate(appState.language, "markLastReadFor", { reference }) ?? fallback;
}

function renderCopyLinkIcon() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9.66 14.34a1 1 0 0 1 0-1.41l3.27-3.27a1 1 0 1 1 1.41 1.41l-3.27 3.27a1 1 0 0 1-1.41 0Z"></path>
      <path d="M7.54 16.46a4 4 0 0 1 0-5.65l2.12-2.12a4 4 0 0 1 5.65 5.65l-.7.71a1 1 0 1 1-1.42-1.41l.71-.71a2 2 0 0 0-2.83-2.83l-2.12 2.12a2 2 0 1 0 2.83 2.83l.71-.71a1 1 0 0 1 1.41 1.42l-.7.7a4 4 0 0 1-5.65 0Z"></path>
    </svg>
  `;
}

function getCopyLinkButtonLabel(reference) {
  const fallback = appState.language === "en"
    ? `Copy link for ${reference}`
    : `Salin pautan untuk ${reference}`;
  return translate(appState.language, "copyLinkFor", { reference }) ?? fallback;
}

function getLinkCopiedToastMessage(reference, shareUrl) {
  if (appState.isMobile) {
    return translate(appState.language, "linkCopiedToast", { reference });
  }

  return translate(appState.language, "linkCopiedToastFull", { url: shareUrl });
}

function formatSuraTitle(suraNumber, suraName) {
  return `${translate(appState.language, "readerHeading")} ${suraNumber}: ${suraName}`;
}

async function handleHashChange() {
  if (ignoreNextHashChange) {
    ignoreNextHashChange = false;
    return;
  }

  const hashTarget = parseHashReference(window.location.hash);
  if (!hashTarget) {
    return;
  }

  await openSurahAndMaybeAyah(hashTarget.surahNumber, hashTarget.ayahNumber);
}

function parseHashReference(hashValue) {
  const match = hashValue.match(/^#\/(\d+)(?::(\d+))?$/);
  if (!match) {
    return null;
  }

  const surahNumber = Number(match[1]);
  const ayahNumber = match[2] == null ? null : Number(match[2]);

  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return null;
  }

  if (ayahNumber != null && (!Number.isInteger(ayahNumber) || ayahNumber < 0)) {
    return null;
  }

  return { surahNumber, ayahNumber };
}

function updateHashReference(surahNumber, ayahNumber = null) {
  const nextHash = ayahNumber == null ? `#/${surahNumber}` : `#/${surahNumber}:${ayahNumber}`;
  if (window.location.hash === nextHash) {
    return;
  }

  ignoreNextHashChange = true;
  window.location.hash = nextHash;
}

function buildAyahShareUrl(surahNumber, ayahNumber) {
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}#/${formatAyahReference(surahNumber, ayahNumber)}`;
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
    setKeywordSearchLoading(false);
    resetSearchState();
    renderSurahList();
    renderSearchResults();
    return;
  }

  if (parsed.type === "invalid") {
    setKeywordSearchLoading(false);
    appState.searchMode = "browse";
    appState.searchResults = [];
    appState.filteredCatalog = [...appState.catalog];
    setSearchFeedback(translate(appState.language, "invalidReference"), true);
    renderSurahList();
    renderSearchResults();
    return;
  }

  if (parsed.type === "reference") {
    setKeywordSearchLoading(false);
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
    setKeywordSearchLoading(false);
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
  setKeywordSearchLoading(true);
  setSearchFeedback(translate(appState.language, "searchLoading"), false);
  renderSearchResults();

  const availableSurahs = appState.catalog.filter((surah) => surah.available);
  if (availableSurahs.length === 0) {
    appState.searchMode = "keyword";
    appState.searchResults = [];
    setSearchFeedback(translate(appState.language, "unavailableSearch"), true);
    setKeywordSearchLoading(false);
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
  setKeywordSearchLoading(false);
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

function setKeywordSearchLoading(isLoading) {
  appState.isKeywordSearchLoading = isLoading;
  syncSearchControls();
}

function resetSearchState() {
  appState.searchMode = "browse";
  appState.searchResults = [];
  appState.filteredCatalog = [...appState.catalog];
  appState.highlightedAyahNumber = null;
  setSearchFeedback("", false);
  setKeywordSearchLoading(false);
}

function syncSearchControls() {
  const hasQuery = appState.searchQuery.trim().length > 0;
  const clearLabel = translate(appState.language, "clearSearch");
  const submitLabel = appState.isKeywordSearchLoading
    ? translate(appState.language, "searchLoading")
    : translate(appState.language, "searchButton");

  elements.searchClearButton.hidden = !hasQuery;
  elements.searchClearButton.setAttribute("aria-label", clearLabel);
  elements.searchClearButton.title = clearLabel;
  elements.searchSubmit.textContent = submitLabel;
  elements.searchSubmit.classList.toggle("is-loading", appState.isKeywordSearchLoading);
  elements.searchSubmit.disabled = appState.isKeywordSearchLoading;
}

function getLastRead() {
  try {
    const storedValue = window.localStorage.getItem(LAST_READ_STORAGE_KEY);
    if (!storedValue) {
      return null;
    }

    const parsed = JSON.parse(storedValue);
    const surahNumber = Number(parsed?.surahNumber);
    const ayahNumber = parsed?.ayahNumber == null ? null : Number(parsed.ayahNumber);

    if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
      return null;
    }

    if (ayahNumber != null && (!Number.isInteger(ayahNumber) || ayahNumber < 0)) {
      return { surahNumber, ayahNumber: null };
    }

    return { surahNumber, ayahNumber };
  } catch (error) {
    console.warn("Last read state could not be restored.", error);
    return null;
  }
}

function saveLastRead({ surahNumber, ayahNumber }) {
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return;
  }

  const payload = {
    surahNumber,
    ayahNumber: Number.isInteger(ayahNumber) ? ayahNumber : null,
  };

  window.localStorage.setItem(LAST_READ_STORAGE_KEY, JSON.stringify(payload));
  renderLastReadChip();
}

function isLastReadAyah(surahNumber, ayahNumber) {
  const lastRead = getLastRead();
  return lastRead?.surahNumber === surahNumber && lastRead?.ayahNumber === ayahNumber;
}

function renderLastReadChip() {
  const lastRead = getLastRead();
  if (!lastRead || appState.catalog.length === 0) {
    elements.lastReadChip.hidden = true;
    elements.lastReadChip.textContent = "";
    return;
  }

  const surah = appState.catalog.find((item) => item.number === lastRead.surahNumber);
  if (!surah) {
    elements.lastReadChip.hidden = true;
    elements.lastReadChip.textContent = "";
    return;
  }

  const suraName = getSuraDisplayName(surah);
  const reference = lastRead.ayahNumber
    ? formatAyahReference(lastRead.surahNumber, lastRead.ayahNumber)
    : `${lastRead.surahNumber}`;
  const lastReadLabel = translate(appState.language, "lastRead") ?? (appState.language === "en" ? "Last read" : "Bacaan terakhir");
  const continueReadingLabel =
    translate(appState.language, "continueReading")
    ?? (appState.language === "en" ? "Continue reading" : "Sambung bacaan");
  const label = `${lastReadLabel}: ${reference} • ${suraName}`;

  elements.lastReadChip.hidden = false;
  elements.lastReadChip.textContent = label;
  elements.lastReadChip.setAttribute("aria-label", `${continueReadingLabel} ${label}`);
  elements.lastReadChip.title = continueReadingLabel;
}

function showToast(message) {
  if (!message) {
    return;
  }

  window.clearTimeout(showToast.timeoutId);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");

  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2200);
}

async function copyTextToClipboard(text) {
  if (!text) {
    return false;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn("Clipboard API copy failed, falling back.", error);
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "absolute";
  textArea.style.left = "-9999px";
  document.body.append(textArea);
  textArea.select();

  try {
    return document.execCommand("copy");
  } catch (error) {
    console.warn("execCommand copy failed.", error);
    return false;
  } finally {
    textArea.remove();
  }
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
