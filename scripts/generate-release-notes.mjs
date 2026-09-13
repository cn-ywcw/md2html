import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const currentRef = process.env.RELEASE_REF ?? process.env.GITHUB_SHA ?? "HEAD";
const outputPath = process.env.RELEASE_NOTES_PATH ?? "release/release-notes.md";

function runGit(args, allowFailure = false) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", allowFailure ? "ignore" : "inherit"],
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return "";
    }
    throw error;
  }
}

const previousTag = runGit(
  ["describe", "--tags", "--abbrev=0", `${currentRef}^`],
  true,
);
const range = previousTag ? `${previousTag}..${currentRef}` : currentRef;
const subjects = runGit(["log", "--no-merges", "--reverse", "--format=%s", range])
  .split("\n")
  .map((subject) => subject.trim())
  .filter(Boolean);

const featurePattern = /^(?:feat|feature)(?:\(([^)]+)\))?!?:\s*(.+)$/i;
const fixPattern = /^(?:fix|bugfix)(?:\(([^)]+)\))?!?:\s*(.+)$/i;
const features = [];
const fixes = [];
const otherChanges = [];

for (const subject of subjects) {
  const featureMatch = subject.match(featurePattern);
  if (featureMatch) {
    features.push(formatChange(featureMatch));
    continue;
  }

  const fixMatch = subject.match(fixPattern);
  if (fixMatch) {
    fixes.push(formatChange(fixMatch));
    continue;
  }

  if (!/^Initial commit$/i.test(subject)) {
    otherChanges.push(subject);
  }
}

const releaseTag = process.env.GITHUB_REF_NAME ?? "当前版本";
const sourceDescription = previousTag
  ? `自上一个 release（${previousTag}）以来的变更。`
  : "项目的首次 release。";

const lines = [
  `# ${releaseTag}`,
  "",
  sourceDescription,
  "",
  "## 新增功能",
  ...toBullets(features),
  "",
  "## Bug 修复",
  ...toBullets(fixes),
];

if (otherChanges.length > 0) {
  lines.push("", "## 其他变更", ...toBullets(otherChanges));
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Generated ${outputPath}:\n${readFileSync(outputPath, "utf8")}`);

function formatChange(match) {
  const [, scope, description] = match;
  return scope ? `[${scope}] ${description}` : description;
}

function toBullets(changes) {
  return changes.length > 0 ? changes.map((change) => `- ${change}`) : ["- 无"];
}
