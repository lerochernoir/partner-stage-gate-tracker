import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components", "lib"];
const FILE_EXTENSIONS = new Set([".ts", ".tsx"]);

const ambiguousEmbeds = [
  {
    pattern: /\bdecision_logs\(/,
    message:
      "Use an explicit decision_logs embed relationship, e.g. decision_logs!decision_logs_stage_gate_package_id_fkey(...).",
  },
  {
    pattern: /\bstage_gate_packages\(/,
    message:
      "Use an explicit stage_gate_packages embed relationship from approvals, e.g. stage_gate_packages!approvals_stage_gate_package_id_fkey(...).",
  },
];

const failures = [];

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const content = readFileSync(file, "utf8");
    for (const check of ambiguousEmbeds) {
      if (check.pattern.test(content)) {
        failures.push(`${file}: ${check.message}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Ambiguous Supabase embed checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Supabase embed checks passed.");

function* walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      yield* walk(path);
      continue;
    }

    if ([...FILE_EXTENSIONS].some((extension) => path.endsWith(extension))) {
      yield path;
    }
  }
}
