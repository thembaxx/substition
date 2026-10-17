import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { validateFile, validatePackage } from "../scripts/maintenance-policy.mjs";

const manifest = {
  name: "test",
  private: true,
  scripts: { test: "tsx --test tests/*.test.ts" },
  packageManager: "pnpm@11.25.0",
  dependencies: { next: "^16.4.2", webllm: "^0.2.86" },
};
const entry = (filename: string, content = "test\n") => ({
  path: filename,
  content,
  sha256: createHash("sha256").update(content).digest("hex"),
});

test("maintenance accepts compatible versions and refuses major upgrades or policy changes", () => {
  validatePackage(manifest, { ...manifest, dependencies: { next: "^16.5.0", webllm: "^0.2.87" } });
  for (const dependencies of [
    { next: "^17.0.0", webllm: "^0.2.86" },
    { next: "^16.4.2", webllm: "^0.3.0" },
    { next: "^16.4.1", webllm: "^0.2.86" },
    { ...manifest.dependencies, newPackage: "^1.0.0" },
    { next: "https://example.invalid/package.tgz", webllm: "^0.2.86" },
  ])
    assert.throws(() => validatePackage(manifest, { ...manifest, dependencies }));
  assert.throws(() => validatePackage(manifest, { ...manifest, scripts: { test: "true" } }));
  assert.throws(() => validatePackage(manifest, { ...manifest, packageManager: "pnpm@12.0.0" }));
});
test("maintenance refuses protected paths, traversal and altered digests", () => {
  for (const filename of [
    ".github/workflows/check.yml",
    "scripts/maintenance-policy.mjs",
    "src/lib/vault.ts",
    "src/lib/auth.ts",
    "src/components/workspace-app.tsx",
    "src/components/offline-assistant.tsx",
    "tests/core.test.ts",
    "../package.json",
    "/package.json",
    "package.json\nmalicious",
  ]) {
    assert.throws(() => validateFile(entry(filename)), filename);
  }
  validateFile(entry("src/components/dialog.tsx"));
  assert.throws(() => validateFile({ ...entry("src/components/dialog.tsx"), content: "changed" }));
  assert.throws(() => validateFile(entry("src/app/error.tsx", "x\0y")));
});
test("maintenance CLI captures exact files, detects mutation and revalidates before applying", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "substition-maintenance-test-")),
    repo = path.join(directory, "repo"),
    bundle = path.join(directory, "candidate.json");
  const script = fileURLToPath(new URL("../scripts/maintenance-policy.mjs", import.meta.url));
  await mkdir(path.join(repo, "src/app"), { recursive: true });
  await mkdir(path.join(repo, "tests"));
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const guard = (mode: string, base: string) =>
    execFileSync(process.execPath, [script, mode, bundle, base], {
      cwd: repo,
      env: { ...process.env, GITHUB_OUTPUT: "" },
      stdio: ["ignore", "pipe", "pipe"],
    });
  try {
    await writeFile(path.join(repo, "package.json"), JSON.stringify(manifest));
    await writeFile(
      path.join(repo, "src/app/error.tsx"),
      'export default function Error(){ return "Try again"; }\n',
    );
    await writeFile(path.join(repo, "tests/core.test.ts"), "// Existing tests remain unchanged.\n");
    git("init", "-q", "-b", "main");
    git("config", "user.name", "Test Bot");
    git("config", "user.email", "test@example.invalid");
    git("add", ".");
    git("-c", "commit.gpgsign=false", "commit", "-qm", "baseline");
    const base = git("rev-parse", "HEAD").trim();
    const improved = 'export default function Error(){ return "Reload this view"; }\n';
    await writeFile(path.join(repo, "src/app/error.tsx"), improved);
    guard("capture", base);
    guard("unchanged", base);
    await writeFile(path.join(repo, "src/app/error.tsx"), `${improved}// changed after checks\n`);
    assert.throws(() => guard("unchanged", base));
    git("restore", ".");
    guard("apply", base);
    assert.equal(await readFile(path.join(repo, "src/app/error.tsx"), "utf8"), improved);
    assert.throws(() => guard("apply", "0".repeat(40)), "Stale base must be rejected");
    await writeFile(
      path.join(repo, "tests/core.test.ts"),
      "// Weakening an existing test is refused.\n",
    );
    assert.throws(() => guard("capture", base));
    git("restore", ".");
    await writeFile(
      path.join(repo, "src/app/error.tsx"),
      Array.from({ length: 205 }, (_, i) => `// repeated-line-budget-${i}\n`).join(""),
    );
    assert.throws(() => guard("capture", base), "Actual diff line budget is enforced");
    const parsed = JSON.parse(await readFile(bundle, "utf8"));
    parsed.files[0].path = "src/lib/vault.ts";
    await writeFile(bundle, JSON.stringify(parsed));
    assert.throws(() => guard("apply", base));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
