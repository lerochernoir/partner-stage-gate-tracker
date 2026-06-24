import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["app", "components", "lib"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const allowedApprovalEmbed = "approvals!approvals_stage_gate_package_id_fkey";
const allowedDecisionEmbed = "decision_logs!decision_logs_stage_gate_package_id_fkey";
const allowedPackageFromApprovalEmbed =
  "stage_gate_packages!approvals_stage_gate_package_id_fkey";
const failures = [];

for (const root of roots) {
  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8");

    for (const selectBlock of findStageGatePackageSelects(source)) {
      const hasAmbiguousApprovalEmbed =
        /\bapprovals\s*(?:\(|:)/.test(selectBlock) &&
        !selectBlock.includes(allowedApprovalEmbed);
      const hasAmbiguousDecisionEmbed =
        /\bdecision_logs\s*(?:\(|:)/.test(selectBlock) &&
        !selectBlock.includes(allowedDecisionEmbed);

      if (hasAmbiguousApprovalEmbed) {
        failures.push(
          `${file}: use ${allowedApprovalEmbed}(...) when embedding approvals from stage_gate_packages`,
        );
      }

      if (hasAmbiguousDecisionEmbed) {
        failures.push(
          `${file}: use ${allowedDecisionEmbed}(...) when embedding decision_logs from stage_gate_packages`,
        );
      }
    }

    for (const selectBlock of findApprovalSelects(source)) {
      const hasAmbiguousPackageEmbed =
        /\bstage_gate_packages\s*(?:\(|:)/.test(selectBlock) &&
        !selectBlock.includes(allowedPackageFromApprovalEmbed);

      if (hasAmbiguousPackageEmbed) {
        failures.push(
          `${file}: use ${allowedPackageFromApprovalEmbed}(...) when embedding stage_gate_packages from approvals`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`Ambiguous Supabase embeds found:\n${[...new Set(failures)].join("\n")}`);
  process.exit(1);
}

console.log("Supabase embed checks passed.");

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      yield* walk(path);
      continue;
    }

    if (extensions.has(path.slice(path.lastIndexOf(".")))) {
      yield path;
    }
  }
}

function findStageGatePackageSelects(source) {
  return findSelectChains(source, "stage_gate_packages");
}

function findApprovalSelects(source) {
  return findSelectChains(source, "approvals");
}

function findSelectChains(source, tableName) {
  const blocks = [];
  const fromPattern = new RegExp(`\\.from\\(\\s*["']${tableName}["']\\s*\\)`, "g");
  let match;

  while ((match = fromPattern.exec(source)) !== null) {
    const chainEnd = source.indexOf(";", match.index);
    const block = source.slice(match.index, chainEnd === -1 ? undefined : chainEnd);

    if (block.includes(".select(")) {
      blocks.push(block);
    }
  }

  return blocks;
}
