const fs = require("fs");
const path = require("path");

const studyDir = path.join(__dirname, "..", "data", "study");

const docs = [
  {
    key: "introduction",
    filename: "introduction.json",
    title: { ms: "Pendahuluan", en: "Introduction" },
    kicker: { ms: "Disediakan", en: "Prepared" },
    summary: {
      ms: "Ruang pendahuluan sudah disediakan dan sedia untuk diisi dengan kandungan penuh kemudian.",
      en: "The introduction area is prepared and ready to receive the full content later.",
    },
    notes: [
      {
        ms: "Laluan ini sudah stabil untuk desktop, mudah alih, dan pautan terus.",
        en: "This route is already stable for desktop, mobile, and direct links.",
      },
      {
        ms: "Apabila teks sebenar sudah siap, kita hanya perlu menggantikan fail data ini.",
        en: "When the real text is ready, we only need to replace this data file.",
      },
    ],
  },
  {
    key: "proclamation",
    filename: "proclamation.json",
    title: { ms: "Proklamasi", en: "Proclamation" },
    kicker: { ms: "Disediakan", en: "Prepared" },
    summary: {
      ms: "Ruang proklamasi telah disediakan supaya pautan dan struktur halaman sudah siap dari awal.",
      en: "The proclamation section is prepared so the link and page structure are ready from the start.",
    },
    notes: [
      {
        ms: "Kandungan sebenar boleh dimasukkan kemudian tanpa menukar UX utama.",
        en: "The real content can be added later without changing the main UX.",
      },
      {
        ms: "Menu ini sudah boleh dibuka dan dikongsi melalui hash route.",
        en: "This section can already be opened and shared through its hash route.",
      },
    ],
  },
  {
    key: "glossary",
    filename: "glossary.json",
    title: { ms: "Glosari", en: "Glossary" },
    kicker: { ms: "Disediakan", en: "Prepared" },
    summary: {
      ms: "Ruang glosari telah disediakan untuk menerima senarai istilah dan definisi kemudian.",
      en: "The glossary space is ready to receive terms and definitions later.",
    },
    notes: [
      {
        ms: "Struktur ini memudahkan kita menambah istilah satu demi satu selepas ini.",
        en: "This structure makes it easy for us to add terms one by one later.",
      },
      {
        ms: "Pengalaman pengguna sudah konsisten antara senarai sura dan bahan rujukan.",
        en: "The user experience is already consistent between the sura list and the study material.",
      },
    ],
  },
];

for (let number = 1; number <= 38; number += 1) {
  const padded = String(number).padStart(2, "0");
  docs.push({
    key: `appendix-${number}`,
    filename: `appendix-${padded}.json`,
    title: {
      ms: `Lampiran ${number}`,
      en: `Appendix ${number}`,
    },
    kicker: { ms: "Disediakan", en: "Prepared" },
    summary: {
      ms: `Tempat simpanan untuk Lampiran ${number} sudah disediakan dan sedia diisi dengan kandungan sebenar kemudian.`,
      en: `The placeholder for Appendix ${number} is prepared and ready for the real content later.`,
    },
    notes: [
      {
        ms: "Hash route dan menu untuk lampiran ini sudah stabil.",
        en: "The hash route and menu entry for this appendix are already stable.",
      },
      {
        ms: "Apabila kandungan sebenar siap, kita hanya perlu menggantikan fail JSON ini.",
        en: "When the real content is ready, we only need to replace this JSON file.",
      },
    ],
  });
}

fs.mkdirSync(studyDir, { recursive: true });

for (const doc of docs) {
  const outputPath = path.join(studyDir, doc.filename);
  fs.writeFileSync(outputPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
}

const index = docs.map(({ key, filename, title }) => ({ key, filename, title }));
fs.writeFileSync(
  path.join(studyDir, "index.json"),
  `${JSON.stringify(index, null, 2)}\n`,
  "utf8",
);

console.log(`Generated ${docs.length} study placeholder documents.`);
