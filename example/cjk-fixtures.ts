/** Explicit QA family order is a host choice, not a production font policy. */
export const cjkCases = {
  "CJK-Simplified": { family: "QA,QAZH", label: "简体中文汉字流程图，开始处理１２３，确认成功。" },
  "CJK-Traditional": { family: "QA,QATC", label: "繁體中文漢字流程圖，開始處理１２３，確認成功。" },
  "CJK-Japanese": {
    family: "QA,QAJP",
    label: "日本語の図表、ひらがなとカタカナ。処理を開始して成功しました。「テスト１２３」",
  },
  "CJK-Korean": {
    family: "QA,QAKR",
    label: "한국어 도표、처리를 시작하고 결과를 확인합니다。성공 테스트１２３",
  },
  "CJK-Mixed": {
    family: "QA,QAZH,QATC,QAJP,QAKR",
    label: "中文／繁體 日本語 カタカナ 한국어 ABC 123，。！？全角１２３",
  },
} as const;
export const cjkFixtures = Object.fromEntries(
  Object.entries(cjkCases).map(([name, sample]) => [
    name,
    `flowchart TD\nA["${sample.label}<br/>${(sample.label + " ABC 123 ").repeat(4)}"] -->|OK １２３| B{"${sample.label}<br/>${sample.label}"}\nB --> C([Ready])`,
  ]),
);
