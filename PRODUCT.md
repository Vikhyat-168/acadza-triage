# PRODUCT.md — Acadza Report → Fix

## Who loses the most?

The student who encounters a broken question during serious exam preparation loses the most. A wrong answer key can undermine confidence, waste revision time, and teach an incorrect concept. When several students encounter the same defect, the damage multiplies.

The console therefore groups reports by question, shows the AI's reasoning alongside the proposed correction, and gives faculty a clear before-and-after comparison. The goal is to make trustworthy corrections fast without requiring faculty to read every report individually.

## What should AI never auto-apply?

AI should never automatically apply changes to diagrams, ambiguous questions, or substantive mathematical explanations that require interpretation. It should also avoid changes outside the permitted repair fields, uncertain corrections, and cases where the student's claim conflicts with independently verified evidence.

High confidence alone is insufficient. Auto-application must also satisfy the repair taxonomy and deterministic safety checks.

## One metric for week one

**Time to verified resolution for genuine defects.**

Measure the median time between the first student report and faculty-approved or safely validated correction. This captures whether the system actually reduces the time students are exposed to broken content.

Track unsafe corrections as a critical safety guardrail.

## One idea beyond the brief

**Proactive question health monitoring.**

Detect suspicious questions before students report them by identifying unusual wrong-answer patterns, repeated answer changes, and disagreement between answer keys and worked solutions.

This would move Acadza from reactive error handling toward preventing defective questions from reaching students.
