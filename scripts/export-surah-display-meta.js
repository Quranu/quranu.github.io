const fs = require("fs");
const path = require("path");

const rawDir = path.join(__dirname, "..", "data", "raw");
const outputPath = path.join(__dirname, "..", "src", "surahDisplayMeta.js");

const transliterationMap = parseNameMap(`
1|Al-Fatehah
2|Al-Baqarah
3|Ali-'Imran
4|Al-Nesa'
5|Al-Ma'edah
6|Al-An'am
7|Al-A'araf
8|Al-Anfal
9|Bara'ah
10|Younus
11|Hud
12|Yousuf
13|Al-Ra\`ad
14|Ibrahim
15|Al-Hijr
16|Al-Nahl
17|Bani Israel
18|Al-Kahf
19|Maryam
20|Ta Ha
21|Al-Anbya'
22|Al-Hajj
23|Al-Mu'minun
24|Al-Noor
25|Al-Furqan
26|Al-Shu\`ara'
27|Al-Naml
28|Al-Qasas
29|Al-'Ankaboot
30|Al-Room
31|Luqman
32|Al-Sajdah
33|Al-Ahzab
34|Saba'
35|Faater
36|Ya Sin
37|Al-Saffat
38|Saad
39|Al-Zumar
40|Ghafer
41|Fussilat
42|Al-Shoora
43|Al-Zukhruf
44|Al-Dukhan
45|Al-Jatheyah
46|Al-Ahqaf
47|Muhammad
48|Al-Fatt-h
49|Al-Hujurat
50|Qaf
51|Al-Dhareyat
52|Al-Toor
53|Al-Najm
54|Al-Qamar
55|Al-Rahmaan
56|Al-Waaqe'ah
57|Al-Hadeed
58|Al-Mujaadalah
59|Al-Hashr
60|Al-Mumtahanah
61|Al-Suff
62|Al-Jumu\`ah
63|Al-Munaafeqoon
64|Al-Taghaabun
65|Al-Talaaq
66|Al-Tahreem
67|Al-Mulk
68|Al-Qalam
69|Al-Haaqqah
70|Al-Ma'aarej
71|Noah
72|Al-Jinn
73|Al-Muzzammil
74|Al-Muddath-thir
75|Al-Qeyaamah
76|Al-Insaan
77|Al-Mursalaat
78|Al-Naba'
79|Al-Naaze\`aat
80|\`Abasa
81|Al-Takweer
82|Al-Infitaar
83|Al-Mutaffifeen
84|Al-Inshiqaaq
85|Al-Burooj
86|Al-Taareq
87|Al-A\`alaa
88|Al-Ghaasheyah
89|Al-Fajr
90|Al-Balad
91|Al-Shams
92|Al-Layl
93|Al-Duhaa
94|Al-Sharrhh
95|Al-Teen
96|Al-\`Alaq
97|Al-Qadr
98|Al-Bayyinah
99|Al-Zalzalah
100|Al-\`Aadeyaat
101|Al-Qaare\`ah
102|Al-Takaathur
103|Al-\`Asr
104|Al-Humazah
105|Al-Feel
106|Quraish
107|Al-Maa\`oon
108|Al-Kawthar
109|Al-Kaaferoon
110|Al-Naasr
111|Al-Masad
112|Al-Ikhlaas
113|Al-Falaq
114|Al-Naas
`);

main();

function main() {
  if (transliterationMap.size !== 114) {
    throw new Error(`Transliteration map must contain 114 entries; found ${transliterationMap.size}.`);
  }

  const meta = {};

  for (let number = 1; number <= 114; number += 1) {
    const filePath = path.join(rawDir, `surah-${String(number).padStart(3, "0")}.txt`);
    const content = fs.readFileSync(filePath, "utf8");
    const arabic = extractArabicDisplayName(content);

    meta[number] = {
      latin: transliterationMap.get(number),
      arabic,
    };
  }

  const output = `export const surahDisplayMeta = ${JSON.stringify(meta, null, 2)};\n`;
  fs.writeFileSync(outputPath, output, "utf8");
  console.log(`Wrote display meta for ${Object.keys(meta).length} sura(s) to ${outputPath}.`);
}

function parseNameMap(text) {
  return new Map(
    text
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf("|");
        return [Number(line.slice(0, separator)), line.slice(separator + 1).trim()];
      }),
  );
}

function extractArabicDisplayName(content) {
  const match = content.match(/^NAME_AR:\s*(.+)$/m);
  if (!match) {
    throw new Error("Missing NAME_AR header.");
  }

  return match[1].trim();
}
