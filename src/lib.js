const fs = require("fs");
const load = (f) => JSON.parse(fs.readFileSync(`data/${f}`, "utf8"));

// question content lives under q.scq / q.mcq / q.integerQuestion
function body(q) {
  return q[q.questionType];
}

// Flags only. A flagged comment still gets judged on its merits, never obeyed.
const INJECTION = [
  /ignore (all )?(previous|prior) instructions/i,
  /you are (now )?(the )?admin/i,
  /mark (this|the) report as/i,
];
const looksLikeInjection = (comment) =>
  INJECTION.some((re) => re.test(comment));

// Candidate only: faculty touched the question after the report was filed.
function fixedAfterReport(report, q) {
  return (q.errorHistory || []).some(
    (e) => new Date(e.at) > new Date(report.reportedAt),
  );
}

// Scope guard: can this repair + edit be auto-applied?
function checkEdit(taxonomy, repair, edit, q) {
  const r = taxonomy.repairs[repair];
  if (!r) return { ok: false, reason: "unknown repair" };
  if (!r.auto) return { ok: false, reason: "repair is not auto-applicable" };
  if (!edit) return { ok: false, reason: "no edit proposed" };
  if (!r.fields.includes(edit.field))
    return {
      ok: false,
      reason: `field '${edit.field}' is outside scope of '${repair}'`,
    };
  if (edit.field === "question" || edit.field === "solution") {
    const text = body(q)[edit.field] || "";
    const n = edit.find ? text.split(edit.find).length - 1 : 0;
    if (n !== 1)
      return { ok: false, reason: `'find' matches ${n} times, need exactly 1` };
  }
  return { ok: true };
}

module.exports = {
  load,
  body,
  looksLikeInjection,
  fixedAfterReport,
  checkEdit,
};
