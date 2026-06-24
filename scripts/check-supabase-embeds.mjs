import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["app", "components", "lib"];
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
const allowedApprovalEmbed = "approvals!approvals_stage_gate_package_id_fkey";
const failures = [];

for (const root of roots) {
  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8");
    for (const selectBlock of findStageGatePackageSelects(source)) {
      const hasAmbiguousApprovalEmbed =
        /\bapprovals\s*(?:\(|:)/.test(selectBlock) &&
        !selectBlock.includes(allowedApprovalEmbed);

      if (hasAmbiguousApprovalEmbed) {
        failures.push(file);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(
    `Ambiguous approvals embed from stage_gate_packages found in:\n${[
      ...new Set(failures),
    ].join("\n")}`,
  );
  process.exit(1);
}

console.log("No ambiguous approvals embed from stage_gate_packages found.");

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
  const blocks = [];
  const fromPattern = /\.from\(\s*["']stage_gate_packages["']\s*\)/g;
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
