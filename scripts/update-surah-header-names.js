const fs = require("fs");
const path = require("path");

const rawDir = path.join(__dirname, "..", "data", "raw");

const arabicNameMap = parseNameMap(`
1|سورة الفاتحة
2|سورة البقرة
3|سورة آل عمران
4|سورة النساء
5|سورة المائدة
6|سورة الأنعام
7|سورة الأعراف
8|سورة الأنفال
9|سورة براءة
10|سورة يونس
11|سورة هود
12|سورة يوسف
13|سورة الرعد
14|سورة إبراهيم
15|سورة الحجر
16|سورة النحل
17|سورة بنى إسرائيل
18|سورة الكهف
19|سورة مريم
20|سورة طه
21|سورة الأنبياء
22|سورة الحج
23|سورة المومنون
24|سورة النور
25|سورة الفرقان
26|سورة الشعراء
27|سورة النمل
28|سورة القصص
29|سورة العنكبوت
30|سورة الروم
31|سورة لقمان
32|سورة السجدة
33|سورة الأحزاب
34|سورة سبأ
35|سورة فاطر
36|سورة يس
37|سورة الصافات
38|سورة ص
39|سورة الزمر
40|سورة غافر
41|سورة فصلت
42|سورة الشورى
43|سورة الزخرف
44|سورة الدخان
45|سورة الجاثية
46|سورة الأحقاق
47|سورة محمد
48|سورة الفتح
49|سورة الحجرات
50|سورة ق
51|سورة الذاريات
52|سورة الطور
53|سورة النجم
54|سورة القمر
55|سورة الرحمن
56|سورة الواقعة
57|سورة الحديد
58|سورة المجادلة
59|سورة الحشر
60|سورة الممتحنة
61|سورة الصف
62|سورة الجمعة
63|سورة المنافقون
64|سورة التغابن
65|سورة الطلاق
66|سورة التحريم
67|سورة الملك
68|سورة القلم
69|سورة الحاقة
70|سورة المعارج
71|سورة نوح
72|سورة الجن
73|سورة المزمل
74|سورة المدثر
75|سورة القيامة
76|سورة الإنسان
77|سورة المرسلاة
78|سورة النبأ
79|سورة النازعات
80|سورة عبس
81|سورة التكوير
82|سورة الإنفطار
83|سورة المطففين
84|سورة الإنشقاق
85|سورة البروج
86|سورة الطارق
87|سورة الأعلى
88|سورة الغاشية
89|سورة الفجر
90|سورة البلد
91|سورة الشمس
92|سورة الليل
93|سورة الضحى
94|سورة الشرح
95|سورة التين
96|سورة العلق
97|سورة القدر
98|سورة البينة
99|سورة الزلزلة
100|سورة العاديات
101|سورة القارعة
102|سورة التكاثر
103|سورة العصر
104|سورة الهمزة
105|سورة الفيل
106|سورة قريش
107|سورة الماعون
108|سورة الكوثر
109|سورة الكافرون
110|سورة النصر
111|سورة المسد
112|سورة الإخلاص
113|سورة الفلق
114|سورة الناس
`);

const bmNameMap = parseNameMap(`
1|Kunci
2|Sapi Betina
3|Keluarga Imran
4|Perempuan
5|Hidangan
6|Binatang Ternakan
7|Tempat Penungguan
8|Harta Peperangan
9|Memberikan Kata Putus
10|Yunus
11|Hud
12|Yusuf
13|Guruh
14|Ibrahim
15|Lembah
16|Lebah
17|Keturunan Israil
18|Gua
19|Maryam
20|Tha Ha
21|Para Nabi
22|Menunaikan Haji
23|Orang Orang Yang Percaya
24|Cahaya
25|Buku Perundangan
26|Penyair Penyair
27|Semut
28|Sejarah
29|Laba Laba
30|Orang Orang Rom
31|Luqman
32|Sujud
33|Parti Parti
34|Sheba
35|Yang Meinsiasikan Ciptaan
36|Ya Sin
37|Penyusun Penyusun
38|Saad
39|Kumpulan Orang Ramai
40|Pengampun
41|Perincian
42|Perundingan
43|Barang Barang Perhiasan
44|Asap
45|Berlutut
46|Bukit Pasir
47|Muhammad
48|Kemenangan
49|Dinding Dinding
50|Qaf
51|Penggerak Penggerak Angin
52|Bukit Sinai
53|Bintang Bintang
54|Bulan
55|Yang Maha Pengasih
56|Yang Tidak Boleh Di-Elakkan Lagi
57|Besi
58|Perdebatan
59|Pengusiran beramai Ramai
60|Ujian
61|Barisan
62|Juma'at
63|Orang Orang Hypokrit
64|Saling Menuduh
65|Perceraian
66|Larangan
67|Yang Menguasai Kerajaan Kerajaan
68|Pena
69|Tidak dapat Di-Pertikaikan
70|Ketinggian
71|Nuh
72|Jin
73|Yang Berselubung
74|Rahsia Yang Tersembunyi
75|Hari Kebangkitan
76|Manusia
77|Penghantaran
78|Peristiwa
79|Peragut
80|Berkerut Dahi
81|Menggulung
82|Menghancurkan
83|Para Penipu
84|Perpecahan
85|Bimasakti Bimasakti
86|Bintang Yang Terang
87|Yang Maha Tinggi
88|Peristiwa Yang Amat Sangat
89|Subuh
90|Bandar
91|Matahari
92|Malam
93|Pagi
94|Mengawal Perasaan Marah
95|Buah Tin
96|Embrio
97|Destini
98|Bukti
99|Gempa
100|Berlari Kencang
101|Memeranjatkan
102|Mengumpulkan
103|Petang Hari
104|Pengumpat
105|Gajah
106|Kaum Quraish
107|Derma
108|Kemewahan
109|Pengingkar Pengingkar
110|Kemenangan
111|Duri Duri
112|Dengan Segala Kebenaran
113|Matahari Terbit
114|Manusia
`);

const enNameMap = parseNameMap(`
1|The Key
2|The Heifer
3|The Amramites
4|Women
5|The Feast
6|Livestock
7|The Purgatory
8|The Spoils of War
9|Ultimatum
10|Jonah
11|Hood
12|Joseph
13|Thunder
14|Abraham
15|Al-Hijr Valley
16|The Bee
17|The Children of Israel
18|The Cave
19|Mary
20|T.H.
21|The Prophets
22|Pilgrimage
23|The Believers
24|Light
25|The Statute Book
26|The Poets
27|The Ant
28|History
29|The Spider
30|The Romans
31|Luqmaan
32|Prostration
33|The Parties
34|Sheba
35|Initiator
36|Y.S.
37|The Arrangers
38|S.
39|The Throngs
40|Forgiver
41|Detailed
42|Consultation
43|Ornaments
44|Smoke
45|Kneeling
46|The Dunes
47|Muhammad
48|Victory
49|The Walls
50|Q.
51|Drivers of the Winds
52|Mount Sinai
53|The Stars
54|The Moon
55|Most Gracious
56|The Inevitable
57|Iron
58|The Debate
59|Exodus
60|The Test
61|The Column
62|Friday
63|The Hypocrites
64|Mutual Blaming
65|Divorce
66|Prohibition
67|Kingship
68|The Pen
69|Incontestable
70|The Heights
71|Noah
72|Jinns
73|Cloaked
74|The Hidden Secret
75|Resurrection
76|The Human
77|Dispatched
78|The Event
79|The Snatchers
80|He Frowned
81|The Rolling
82|The Shattering
83|The Cheaters
84|The Rupture
85|The Galaxies
86|The Bright Star
87|The Most High
88|Overwhelming
89|Dawn
90|The Town
91|The Sun
92|The Night
93|The Forenoon
94|Cooling the Temper
95|The Fig
96|The Embryo
97|Destiny
98|Proof
99|The Quake
100|The Gallopers
101|The Shocker
102|Hoarding
103|The Afternoon
104|The Backbiter
105|The Elephant
106|Quraish Tribe
107|Charity
108|Bounty
109|The Disbelievers
110|Triumph
111|Thorns
112|Absoluteness
113|Daybreak
114|People
`);

main();

function main() {
  validateNameMap(arabicNameMap, "AR");
  validateNameMap(bmNameMap, "BM");
  validateNameMap(enNameMap, "EN");

  const rawFiles = fs
    .readdirSync(rawDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^surah-\d{3}\.txt$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  let updatedFiles = 0;

  for (const fileName of rawFiles) {
    const surahNumber = Number(fileName.match(/^surah-(\d{3})\.txt$/i)[1]);
    const filePath = path.join(rawDir, fileName);
    const original = fs.readFileSync(filePath, "utf8");
    const updated = updateHeaderNames(
      original,
      surahNumber,
      arabicNameMap.get(surahNumber),
      bmNameMap.get(surahNumber),
      enNameMap.get(surahNumber),
    );

    if (updated !== original) {
      fs.writeFileSync(filePath, updated, "utf8");
      updatedFiles += 1;
    }
  }

  console.log(`Updated header names in ${updatedFiles} raw file(s).`);
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

function validateNameMap(map, label) {
  if (map.size !== 114) {
    throw new Error(`${label} name map must contain 114 entries; found ${map.size}.`);
  }
}

function updateHeaderNames(content, surahNumber, nameAr, nameBm, nameEn) {
  if (!nameAr || !nameBm || !nameEn) {
    throw new Error(`Missing name data for sura ${surahNumber}.`);
  }

  const lines = content.split(/\r?\n/);
  const updatedLines = lines.map((line) => {
    if (line.startsWith("NAME_AR:")) {
      return `NAME_AR: ${nameAr}`;
    }
    if (line.startsWith("NAME_BM:")) {
      return `NAME_BM: ${nameBm}`;
    }
    if (line.startsWith("NAME_EN:")) {
      return `NAME_EN: ${nameEn}`;
    }
    return line;
  });

  return `${updatedLines.join("\n")}\n`;
}
