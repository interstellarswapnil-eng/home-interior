/** Phase A boot checks: `npm run check` — exits non-zero on any failure. */
import { runChecks } from "../plan/checks";

const checks = runChecks();
let group = "";
for (const c of checks) {
  if (c.group !== group) {
    group = c.group;
    console.log(`\n${group}`);
  }
  console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
}
const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
