const fs = require("fs");
const load = (f) => JSON.parse(fs.readFileSync(`data/${f}`, "utf8"));

const questions = load("questions.json");
const reports = load("reports.json");
const taxonomy = load("taxonomy.json");

console.log("questions:", questions.length);
console.log("reports:", reports.length);

// reports grouped by question
const byQ = {};
for (const r of reports) (byQ[r.questionId] ||= []).push(r.reportId);
const multi = Object.entries(byQ).filter(([, ids]) => ids.length > 1);
console.log("\nquestions with more than one report:");
multi.forEach(([qid, ids]) => console.log(" ", qid, ids.join(", ")));

// reports pointing at a question that doesn't exist
const qids = new Set(questions.map((q) => q._id));
const orphans = reports.filter((r) => !qids.has(r.questionId));
console.log("\nreports with unknown questionId:", orphans.length);

// taxonomy
console.log("\nverdicts:", Object.keys(taxonomy.verdicts).length);
console.log("repairs:", Object.keys(taxonomy.repairs).length);
for (const [k, v] of Object.entries(taxonomy.repairs)) {
  console.log(
    `  ${k.padEnd(18)} auto=${String(v.auto).padEnd(5)} fields=[${v.fields}]`,
  );
}
