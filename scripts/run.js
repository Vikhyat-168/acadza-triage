const fs = require("fs");
const { load, body, looksLikeInjection, checkEdit } = require("../src/lib");
const { view, plain } = require("../src/view");
const { ask } = require("../src/llm");
const { SOLVER_SYSTEM, triageSystem } = require("../src/prompts");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toks = (s) =>
  (
    String(s)
      .toUpperCase()
      .match(/[A-Z]|-?\d+(?:\.\d+)?/g) || []
  )
    .sort()
    .join(",");
const parseJSON = (t) =>
  JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));

const solverUser = (q) =>
  `Question type: ${q.questionType}\nSubject: ${q.subject}\n\n${plain(body(q).question)}`;

function triageUser(q, solver, rs) {
  const b = body(q);
  return [
    `QUESTION ID: ${q._id}  TYPE: ${q.questionType}  SUBJECT: ${q.subject}  FILED UNDER CHAPTER: ${q.chapter}`,
    `STORED ANSWER KEY: ${JSON.stringify(b.answer)}`,
    `INDEPENDENT SOLVER ANSWER (solved without seeing the key): ${solver}`,
    `FACULTY EDIT HISTORY: ${JSON.stringify(q.errorHistory || [])}  (question last updated ${q.updatedAt})`,
    `\nQUESTION (raw HTML; math shown as ⟦text⟧):\n${view(b.question)}`,
    `\nSTORED SOLUTION (raw HTML):\n${view(b.solution)}`,
    `\nREPORTS:`,
    ...rs.map(
      (r) =>
        `<report id="${r.reportId}" reportedAt="${r.reportedAt}" source="${r.source}">${JSON.stringify(r.comment).replace(/</g, "\\u003c")}</report>`,
    ),
  ].join("\n");
}

function blockReason(taxonomy, repair, edit, q, solver, conf, injected) {
  if (typeof edit.find !== "string" || typeof edit.replace !== "string")
    return "malformed edit";
  const g = checkEdit(taxonomy, repair, edit, q);
  if (!g.ok) return "guard: " + g.reason;
  if (conf < 0.85) return "confidence below 0.85";
  if (injected) return "comment looks like prompt injection";
  const b = body(q);
  if (edit.field === "answer") {
    if (!["answer_key", "type_mismatch"].includes(repair))
      return "answer edit outside allowed repairs";
    const cur = Array.isArray(b.answer)
      ? JSON.stringify(b.answer)
      : String(b.answer);
    if (edit.find !== cur) return "edit.find does not match stored answer";
    if (toks(edit.replace) !== toks(solver))
      return "solver disagrees with proposed key";
  } else if (repair === "answer_key")
    return "answer_key edit must target the answer field";
  if (edit.field === "questionType" && edit.find !== q.questionType)
    return "find does not match stored type";
  return null;
}

function finalize(r, q, rec, taxonomy, debug) {
  const t =
    (rec.triage.reports || []).find((x) => x.reportId === r.reportId) || {};
  const flags = [];
  const injected = looksLikeInjection(r.comment);
  if (injected) flags.push("possible_prompt_injection");
  if (!t.reportId) flags.push("no_llm_output");
  const verdict = taxonomy.verdicts[t.verdict] ? t.verdict : "not_actionable";
  const repair =
    verdict === "defect" && taxonomy.repairs[t.repair] ? t.repair : null;
  if (verdict === "defect" && !repair)
    flags.push("defect without valid repair");
  const edit =
    repair && taxonomy.repairs[repair].auto && t.edit ? t.edit : null;
  const conf = Math.min(1, Math.max(0, Number(t.confidence) || 0));

  let route = "no_change";
  if (!t.reportId) route = "faculty_review";
  if (verdict === "defect") {
    route = "faculty_review";
    if (edit) {
      const why = blockReason(
        taxonomy,
        repair,
        edit,
        q,
        rec.solver,
        conf,
        injected,
      );
      if (why) flags.push(why);
      else route = "auto_apply";
    }
  }
  debug.push({ reportId: r.reportId, solver: rec.solver, flags });
  return {
    reportId: r.reportId,
    questionId: r.questionId,
    verdict,
    repair,
    edit,
    route,
    confidence: conf,
    evidence: String(t.evidence || ""),
    student_reply: String(
      t.student_reply ||
        "Thanks for flagging this. A teacher will take a look.",
    ),
  };
}

(async () => {
  const taxonomy = load("taxonomy.json");
  const questions = load("questions.json");
  const reports = load("reports.json");
  const qById = Object.fromEntries(questions.map((q) => [q._id, q]));
  const groups = {};
  for (const r of reports) (groups[r.questionId] ||= []).push(r);
  fs.mkdirSync("out/cache", { recursive: true });

  const system = triageSystem(taxonomy);
  const results = [];
  const debug = [];
  let n = 0;
  const total = Object.keys(groups).length;

  for (const [qid, rs] of Object.entries(groups)) {
    n++;
    const q = qById[qid];
    const cp = `out/cache/${qid}.json`;
    let rec;
    if (fs.existsSync(cp)) {
      rec = JSON.parse(fs.readFileSync(cp, "utf8"));
    } else {
      console.log(
        `[${n}/${total}] ${qid} (${rs.map((r) => r.reportId).join(",")})`,
      );
      const s = await ask({
        system: SOLVER_SYSTEM,
        user: solverUser(q),
        maxTokens: 6000,
      });
      const m = [...(s.text || "").matchAll(/ANSWER:\s*(.+)/gi)].pop();
      const solver = m ? m[1].trim() : "UNKNOWN";
      await sleep(2500);
      let t = null;
      for (let i = 0; i < 2 && !t; i++) {
        const out = await ask({
          system,
          user: triageUser(q, solver, rs),
          maxTokens: 6000,
        });
        try {
          t = parseJSON(out.text || "");
        } catch {
          console.log("  bad JSON, retrying");
        }
        await sleep(2500);
      }
      rec = { solver, triage: t || { reports: [] } };
      if (t) fs.writeFileSync(cp, JSON.stringify(rec, null, 2));
    }
    for (const r of rs) results.push(finalize(r, q, rec, taxonomy, debug));
  }

  results.sort((a, b) => a.reportId.localeCompare(b.reportId));
  fs.writeFileSync("results.json", JSON.stringify(results, null, 2));
  fs.writeFileSync("out/debug.json", JSON.stringify(debug, null, 2));

  console.log(
    "\nreport  verdict         repair              route           conf",
  );
  for (const r of results)
    console.log(
      `${r.reportId}    ${r.verdict.padEnd(15)} ${(r.repair || "-").padEnd(19)} ${r.route.padEnd(15)} ${r.confidence}`,
    );
  console.log("\nflags:");
  for (const d of debug)
    if (d.flags.length)
      console.log(d.reportId, "|solver:", d.solver, "|", d.flags.join("; "));
})();
