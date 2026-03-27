# Quran Ringkas

Quran Ringkas is a simple, mobile-first Quran reading website built with plain HTML, CSS, and vanilla JavaScript so it stays fast, easy to maintain, and easy to host on GitHub Pages.

The UI supports Bahasa Melayu by default, plus English for interface labels. Quran content always shows Arabic text, Bahasa Melayu translation, and English translation. A sample full surah, Al-Fatihah, is included to demonstrate the data pipeline and frontend.

## Why this stack

- Plain HTML, CSS, and JavaScript keep deployment simple for GitHub Pages and avoid unnecessary dependencies.
- A small Node.js parser converts `.txt` source files into structured JSON, so content stays easy to edit manually.
- Modular frontend files keep the codebase maintainable without introducing a framework.

## Project structure

```text
.
|-- assets/
|   |-- audio/
|   |   `-- .gitkeep
|   `-- styles/
|       `-- main.css
|-- data/
|   |-- processed/
|   |   |-- surah-001.json
|   |   `-- surah-catalog.json
|   `-- raw/
|       `-- surah-001.txt
|-- scripts/
|   |-- parse-quran-data.js
|   `-- surah-meta.js
|-- src/
|   |-- audioController.js
|   |-- i18n.js
|   `-- main.js
|-- .gitignore
|-- index.html
|-- package.json
`-- README.md
```

## Features

- Mobile-first responsive layout
- All 114 surahs listed
- Instant search by Bahasa Melayu or English surah name
- Bahasa Melayu and English UI switching with `localStorage`
- Ayah cards with Arabic, BM or English translation, audio button, and optional subtitle/footnote support
- Single shared audio controller so only one ayah audio plays at a time
- Raw text to JSON pipeline for maintainable Quran data entry

## Raw `.txt` format

Each surah file uses metadata at the top, then block-based ayah entries:

```text
SURAH_NUMBER: 1
NAME_AR: الفاتحة
NAME_BM: Al-Fatihah
NAME_EN: The Opening
---
# Ayah 1
AR: Arabic text
BM: Bahasa Melayu translation
EN: English translation
AUDIO: audio path or URL
SUBTITLE_BM: Optional BM subtitle
SUBTITLE_EN: Optional EN subtitle
FOOTNOTE_BM: Optional BM footnote
FOOTNOTE_EN: Optional EN footnote

# Ayah 2
AR: Arabic text
BM: Bahasa Melayu translation
EN: English translation
AUDIO: audio path or URL
```

Rules:

- Put one surah in each `.txt` file.
- Use `---` once to separate metadata from ayah rows.
- Start each ayah block with `# Ayah X`.
- Required fields for each ayah block: `AR`, `BM`, `EN`
- Optional fields: `AUDIO`, `SUBTITLE_BM`, `SUBTITLE_EN`, `FOOTNOTE_BM`, `FOOTNOTE_EN`
- If `SUBTITLE_BM` is present, `SUBTITLE_EN` must also be present.
- If `FOOTNOTE_BM` is present, `FOOTNOTE_EN` must also be present.
- Audio can be a local path such as `assets/audio/001001.mp3` or a full URL.
- Subtitle and footnote fields are only included in JSON when present.

Example with optional metadata:

```text
# Ayah 1
AR: بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
BM: Dengan nama Allah Yang Maha Pemurah lagi Maha Penyayang.
EN: In the name of Allah, the Entirely Merciful, the Especially Merciful.
AUDIO: https://everyayah.com/data/Alafasy_64kbps/001001.mp3
SUBTITLE_BM: Ayat pertama Quran
SUBTITLE_EN: The first verse in the Quran
FOOTNOTE_BM: *1:1 Ayat pertama didalam Quran ini merupakan asas terbenanya mukjizat 19...
FOOTNOTE_EN: *1:1 The first verse in the Quran represents the foundation upon which a superhuman 19-based mathematical miracle is built...
```

Generated ayah JSON can now include optional `subtitle` and `footnote` objects:

```json
{
  "number": 1,
  "arabic": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "bm": "Dengan nama Allah Yang Maha Pemurah lagi Maha Penyayang.",
  "en": "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
  "audio": "https://everyayah.com/data/Alafasy_64kbps/001001.mp3",
  "subtitle": {
    "bm": "Ayat pertama Quran",
    "en": "The first verse in the Quran"
  },
  "footnote": {
    "bm": "*1:1 Ayat pertama didalam Quran ini merupakan asas terbenanya mukjizat 19...",
    "en": "*1:1 The first verse in the Quran represents the foundation upon which a superhuman 19-based mathematical miracle is built..."
  }
}
```

Backward compatibility:

- The parser still accepts the older pipe-delimited ayah format.
- New files should use the block format above because it supports optional subtitle and footnote data cleanly.

## Example input and output

Sample raw input:

- [`data/raw/surah-001.txt`](/c:/Users/Lubis/OneDrive/Documents/Quran/data/raw/surah-001.txt)

Generated JSON:

- [`data/processed/surah-001.json`](/c:/Users/Lubis/OneDrive/Documents/Quran/data/processed/surah-001.json)
- [`data/processed/surah-catalog.json`](/c:/Users/Lubis/OneDrive/Documents/Quran/data/processed/surah-catalog.json)

## Run locally

1. Make sure Node.js is installed.
2. From the project folder, generate JSON:

```bash
node scripts/parse-quran-data.js
```

Optional shortcut:

```bash
npm run parse
```

3. Start a local static server. Choose one:

```bash
python -m http.server 4173
```

Or in PowerShell:

```powershell
py -m http.server 4173
```

4. Open `http://localhost:4173`.

Opening `index.html` directly with `file://` is not recommended because the app fetches JSON files.

## Add new Quran data

1. Create a new raw file in `data/raw/`, for example `surah-002.txt`.
2. Follow the same metadata and block-based ayah format.
3. If you are using local MP3 files, place them in `assets/audio/`.
4. Run:

```bash
node scripts/parse-quran-data.js
```

The parser will:

- create or update `data/processed/surah-XXX.json`
- rebuild `data/processed/surah-catalog.json`
- automatically mark that surah as available in the app

If PowerShell blocks `npm`, use the direct `node ...` command above.

## UI language system

- Bahasa Melayu is the default interface language.
- English is available from the language switcher.
- The selected UI language is saved in `localStorage` under `quran-ui-language`.
- Only UI labels change language. Quran content remains Arabic + BM + English.

## Audio behavior

- Audio only plays when the user taps a play button.
- Only one ayah audio plays at a time.
- Starting a new ayah stops the previous one.
- The app uses a single HTML5 `Audio` instance managed by [`src/audioController.js`](/c:/Users/Lubis/OneDrive/Documents/Quran/src/audioController.js).

## GitHub Pages deployment

### 1. Initialize git

```bash
git init
git add .
git commit -m "Initial Quran reader site"
```

### 2. Create a GitHub repository

Create a new empty repository on GitHub, for example `quran-reader`.

### 3. Connect local project to GitHub

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME`:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 4. Enable GitHub Pages

1. Open your repository on GitHub.
2. Go to `Settings`.
3. Open `Pages`.
4. Under `Build and deployment`, set:
   `Source`: `Deploy from a branch`
5. Set:
   `Branch`: `main`
6. Set:
   `Folder`: `/ (root)`
7. Save.

Your site will be published at:

```text
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

## Recommended next steps

- Add more surah `.txt` files and rerun the parser.
- Replace sample remote audio URLs with local MP3 files if you want full offline asset control.
- Add bookmarking or last-read position after the core content is complete.
