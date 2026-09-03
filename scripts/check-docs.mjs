import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const docsDirectory = resolve(repositoryRoot, "docs");

const markdownFiles = [
  resolve(repositoryRoot, "AGENTS.md"),
  resolve(repositoryRoot, "README.md"),
  ...readdirSync(docsDirectory)
    .filter((name) => extname(name) === ".md")
    .map((name) => resolve(docsDirectory, name)),
];

const errors = [];

for (const file of markdownFiles) {
  if (!existsSync(file) || statSync(file).size === 0) {
    errors.push(`Missing or empty Markdown file: ${file}`);
    continue;
  }

  const content = readFileSync(file, "utf8");
  const fenceCount = (content.match(/^```/gm) ?? []).length;
  if (fenceCount % 2 !== 0) {
    errors.push(`Unclosed fenced code block: ${file}`);
  }

  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1].trim();
    if (
      rawTarget.startsWith("http://") ||
      rawTarget.startsWith("https://") ||
      rawTarget.startsWith("mailto:") ||
      rawTarget.startsWith("#")
    ) {
      continue;
    }

    const fileTarget = decodeURIComponent(rawTarget.split("#", 1)[0]);
    const absoluteTarget = resolve(dirname(file), fileTarget);
    if (!existsSync(absoluteTarget)) {
      errors.push(`Broken relative link in ${file}: ${rawTarget}`);
    }
  }
}

const requirementPattern = /\b(?:LOC|RACK|AST|PLC|VIEW|IMP|EXP|BAK|AUD)-\d{3}\b/g;
const prdContent = readFileSync(resolve(docsDirectory, "PRD.md"), "utf8");
const storiesContent = readFileSync(
  resolve(docsDirectory, "USER_STORIES.md"),
  "utf8",
);

const prdRequirements = new Set(prdContent.match(requirementPattern) ?? []);
const storyReferences = new Set(storiesContent.match(requirementPattern) ?? []);
const missingReferences = [...prdRequirements].filter(
  (requirement) => !storyReferences.has(requirement),
);

if (missingReferences.length > 0) {
  errors.push(
    `PRD requirements missing from USER_STORIES.md: ${missingReferences.join(", ")}`,
  );
}

const storyHeadingPattern = /^### (US-[A-Z]+-\d{3})\b/gm;
const storyIds = [...storiesContent.matchAll(storyHeadingPattern)].map(
  (match) => match[1],
);
const duplicateStoryIds = storyIds.filter(
  (storyId, index) => storyIds.indexOf(storyId) !== index,
);

if (duplicateStoryIds.length > 0) {
  errors.push(
    `Duplicate user story IDs: ${[...new Set(duplicateStoryIds)].join(", ")}`,
  );
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exit(1);
}

console.log(
  `Documentation checks passed: ${markdownFiles.length} files, ${prdRequirements.size} requirements, ${storyIds.length} user stories.`,
);
