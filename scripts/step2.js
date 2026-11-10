const {
  load,
  body,
  looksLikeInjection,
  fixedAfterReport,
  checkEdit,
} = require("../src/lib");

const questions = load("questions.json");
const reports = load("reports.json");
const taxonomy = load("taxonomy.json");
const qById = Object.fromEntries(questions.map((q) => [q._id, q]));

console.log("== groups with more than one report ==");
const groups = {};
for (const r of reports) (groups[r.questionId] ||= []).push(r);
for (const [qid, rs] of Object.entries(groups))
  if (rs.length > 1) console.log(qid, rs.map((r) => r.reportId).join(", "));

console.log("\n== flags ==");
for (const r of reports) {
  const q = qById[r.questionId];
  if (looksLikeInjection(r.comment)) console.log(r.reportId, "INJECTION");
  if (fixedAfterReport(r, q))
    console.log(r.reportId, "ALREADY_FIXED_CANDIDATE");
}

console.log("\n== guard self-tests (expect true,false,false,false,false) ==");
const q0 = qById["68e8734442c06737d6e56da4"];
const t = (...a) => checkEdit(taxonomy, ...a).ok;
console.log(t("answer_key", { field: "answer", find: "A", replace: "D" }, q0));
console.log(t("spelling", { field: "answer", find: "A", replace: "D" }, q0));
console.log(t("diagram", { field: "question", find: "x", replace: "y" }, q0));
console.log(
  t("spelling", { field: "question", find: "NOT_IN_TEXT", replace: "y" }, q0),
);
console.log(
  t(
    "spelling",
    { field: "question", find: "<h3>", replace: "<h3>" },
    { ...q0, scq: { question: "<h3>a</h3><h3>b</h3>" }, questionType: "scq" },
  ),
);
