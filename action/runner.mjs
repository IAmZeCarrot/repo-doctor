import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const actionDirectory = path.dirname(
  path.dirname(fileURLToPath(import.meta.url)),
);
const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
const requestedPath = process.env.REPO_DOCTOR_PATH || ".";
const failOn = process.env.REPO_DOCTOR_FAIL_ON || "error";

if (!["error", "warning", "never"].includes(failOn)) {
  throw new Error("fail-on must be 'error', 'warning', or 'never'");
}

const scanPath = path.resolve(workspace, requestedPath);
const cliPath = path.join(actionDirectory, "dist", "cli.js");

function scan(format) {
  const result = spawnSync(
    process.execPath,
    [cliPath, "scan", scanPath, "--format", format, "--fail-on", "never"],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim();
    throw new Error(`Repo Doctor could not scan ${scanPath}: ${detail}`);
  }

  return result.stdout.trim();
}

const json = scan("json");
const text = scan("text");
const report = JSON.parse(json);
const reportDirectory = path.join(
  process.env.RUNNER_TEMP ?? process.cwd(),
  "repo-doctor",
);
const reportPath = path.join(reportDirectory, "report.json");
await mkdir(reportDirectory, { recursive: true });
await writeFile(reportPath, `${json}\n`, "utf8");

const thresholdExceeded =
  failOn !== "never" &&
  (report.summary.error > 0 ||
    (failOn === "warning" && report.summary.warning > 0));

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  const markdown = [
    "# Repo Doctor",
    "",
    `Scanned \`${requestedPath}\` with failure threshold \`${failOn}\`.`,
    "",
    "| Errors | Warnings | Info | Total |",
    "| ---: | ---: | ---: | ---: |",
    `| ${report.summary.error} | ${report.summary.warning} | ${report.summary.info} | ${report.summary.total} |`,
    "",
    "<details>",
    "<summary>Full report</summary>",
    "",
    "```text",
    text,
    "```",
    "",
    "</details>",
    "",
    "The complete machine-readable report is attached to this run as an artifact.",
    "",
  ].join("\n");
  await appendFile(summaryPath, markdown, "utf8");
}

const outputPath = process.env.GITHUB_OUTPUT;
if (outputPath) {
  const outputs = [
    `report-path=${reportPath}`,
    `errors=${report.summary.error}`,
    `warnings=${report.summary.warning}`,
    `findings=${report.summary.total}`,
    `threshold-exceeded=${thresholdExceeded}`,
    "",
  ].join("\n");
  await appendFile(outputPath, outputs, "utf8");
} else {
  console.log(text);
}

console.log(
  `Repo Doctor found ${report.summary.error} error(s), ${report.summary.warning} warning(s), and ${report.summary.info} informational finding(s).`,
);
