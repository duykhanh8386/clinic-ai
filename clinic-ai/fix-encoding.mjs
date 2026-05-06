import { readFileSync, writeFileSync } from 'fs';

const path = 'D:/ĐỒ ÁN TỐT NGHIỆP/clinic-ai/client/src/pages/Admin/AdminHome.jsx';
let content = readFileSync(path, 'utf8');

// Each [garbled, correct] pair
const fixes = [
  ['\u00e2\u20ac\u00a6', '\u2026'],                          // â€¦ → …
  ['L\u00e1\u00bb\u201ach h\u00e1\u00ba\u00b9n', 'L\u1ecbch h\u1eb9n'],  // Lịch hẹn
  ['Admin \u00e2\u20ac\u201c T\u00e1\u00bb\u2022ng quan', 'Admin \u2014 T\u1ed5ng quan'],
  ['Qu\u00e1\u00ba\u00a3n l\u00c3\u00bd d\u00e1\u00bb\u201ach v\u00e1\u00bb\u00a5, b\u00c3\u00a1c s\u00c4\u00a9, l\u00e1\u00bb\u201ach l\u00c3 m vi\u00e1\u00bb\u2021c v\u00c3\u00a0 theo d\u00c3\u00b5i l\u00e1\u00bb\u201ach h\u00e1\u00ba\u00b9n.',
   'Qu\u1ea3n l\u00fd d\u1ecbch v\u1ee5, b\u00e1c s\u0129, l\u1ecbch l\u00e0m vi\u1ec7c v\u00e0 theo d\u00f5i l\u1ecbch h\u1eb9n.'],
  ['Ng\u00c3 y ', 'Ng\u00e0y '],                             // NgÃ y → Ngày
  ['T\u00e1\u00bb\u00b7 l\u00e1\u00bb\u2021 ho\u00c3 n t\u00e1\u00ba\u00a5t', 'T\u1ef7 l\u1ec7 ho\u00e0n t\u1ea5t'],
  ['h\u00e1\u00bb\u00a7y 14 ng\u00c3 y g\u00e1\u00ba\u00a7n nh\u00e1\u00ba\u00a5t', 'h\u1ee7y 14 ng\u00e0y g\u1ea7n nh\u1ea5t'],
  ['Ph\u00c3\u00a2n b\u00e1\u00bb\u2022 tr\u00e1\u00ba\u00a1ng th\u00c3\u00a1i l\u00e1\u00bb\u201ach h\u00e1\u00ba\u00b9n', 'Ph\u00e2n b\u1ed5 tr\u1ea1ng th\u00e1i l\u1ecbch h\u1eb9n'],
  ['Pie \u00e2\u20ac\u201c ph\u00c3\u00a2n b\u00e1\u00bb\u2022 tr\u00e1\u00ba\u00a1ng th\u00c3\u00a1i', 'Pie \u2014 ph\u00e2n b\u1ed5 tr\u1ea1ng th\u00e1i'],
  ['Ch\u00c6\u00b0a c\u00c3\u00b3 d\u00e1\u00bb\u00afl i\u00e1\u00bb\u2021u', 'Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u'],
  [' l\u00e1\u00bb\u201ach"', ' l\u1ecbch"'],                // " lịch"
  ['Bar \u00e2\u20ac\u201c l\u00e1\u00bb\u201ach h\u00e1\u00ba\u00b9n theo th\u00e1\u00bb\u00a9 trong tu\u00e1\u00ba\u00a7n',
   'Bar \u2014 l\u1ecbch h\u1eb9n theo th\u1ee9 trong tu\u1ea7n'],
  ['NEW: Bar \u00e2\u20ac\u201c ph\u00c3\u00a2n b\u00e1\u00bb\u2022 theo th\u00e1\u00bb\u00a9 trong tu\u00e1\u00ba\u00a7n',
   'Bar \u2014 l\u1ecbch h\u1eb9n theo th\u1ee9 trong tu\u1ea7n'],
  ['L\u00e1\u00bb\u201ach h\u00e1\u00ba\u00b9n theo th\u00e1\u00bb\u00a9 trong tu\u00e1\u00ba\u00a7n (30 ng\u00c3 y)',
   'L\u1ecbch h\u1eb9n theo th\u1ee9 trong tu\u1ea7n (30 ng\u00e0y)'],
  ['Bar \u00e2\u20ac\u201c top d\u00e1\u00bb\u201ach v\u00e1\u00bb\u00a5', 'Bar \u2014 top d\u1ecbch v\u1ee5'],
  ['Top d\u00e1\u00bb\u201ach v\u00e1\u00bb\u00a5 \u00c4\u2018\u01b0\u00e1\u00bb\u00a3c \u00c4\u2018\u00e1\u00ba\u00b7t nhi\u00e1\u00bb\u00a1u',
   'Top d\u1ecbch v\u1ee5 \u0111\u01b0\u1ee3c \u0111\u1eb7t nhi\u1ec1u'],
  ['Bar \u00e2\u20ac\u201c top b\u00c3\u00a1c s\u00c4\u00a9', 'Bar \u2014 top b\u00e1c s\u0129'],
  ['Top b\u00c3\u00a1c s\u00c4\u00a9 \u00c4\u2018\u01b0\u00e1\u00bb\u00a3c \u00c4\u2018\u00e1\u00ba\u00b7t l\u00e1\u00bb\u201ach nhi\u00e1\u00bb\u00a1u',
   'Top b\u00e1c s\u0129 \u0111\u01b0\u1ee3c \u0111\u1eb7t l\u1ecbch nhi\u1ec1u'],
];

let count = 0;
for (const [bad, good] of fixes) {
  const before = content;
  content = content.split(bad).join(good);
  if (content !== before) count++;
}

writeFileSync(path, content, 'utf8');
console.log(`Fixed ${count} patterns`);
