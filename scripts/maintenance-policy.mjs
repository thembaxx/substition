import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { pathToFileURL } from "node:url";

const dependencyFields = ["dependencies", "devDependencies", "optionalDependencies"];
const protectedSources =
  /^(src\/lib\/|src\/app\/(api\/|privacy\/|terms\/|sign-in\/|layout\.tsx)|src\/components\/(offline-assistant|workspace-app|import-panel|native-support)\.tsx$)/;
const permittedFiles =
  /^(package\.json|pnpm-lock\.yaml|src\/(app\/(error|loading)\.tsx|components\/(dialog|subscription-form|ambient)\.tsx|app\/globals\.css)|tests\/maintenance-[a-z0-9-]+\.test\.ts)$/;
const hash = (content) => createHash("sha256").update(content).digest("hex");
const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 8e6,
    stdio: ["ignore", "pipe", "pipe"],
  });

async function changedLineCount(before, after) {
  const directory = await mkdtemp(path.join(tmpdir(), "substition-diff-"));
  try {
    const oldFile = path.join(directory, "before"),
      newFile = path.join(directory, "after");
    await writeFile(oldFile, before ?? "");
    await writeFile(newFile, after);
    let output;
    try {
      output = git("diff", "--no-index", "--numstat", "--", oldFile, newFile);
    } catch (e) {
      assert.equal(e.status, 1, "Could not measure candidate diff");
      output = e.stdout;
    }
    if (!output.trim()) return 0;
    const [added, removed] = output.trim().split("\t").slice(0, 2).map(Number);
    assert.ok(Number.isFinite(added) && Number.isFinite(removed), "Binary changes refused");
    return added + removed;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export function validatePackage(before, after) {
  const previous = structuredClone(before),
    next = structuredClone(after);
  for (const field of dependencyFields) {
    const oldDeps = previous[field] ?? {},
      newDeps = next[field] ?? {};
    assert.deepEqual(
      Object.keys(newDeps).sort(),
      Object.keys(oldDeps).sort(),
      "Maintenance cannot add or remove dependencies",
    );
    for (const name of Object.keys(oldDeps)) {
      if (oldDeps[name] === newDeps[name]) continue;
      const version = (value) => /^(?:\^|~)?(\d+)\.(\d+)\.(\d+)$/.exec(value)?.slice(1).map(Number);
      const oldVersion = version(oldDeps[name]),
        newVersion = version(newDeps[name]);
      assert.ok(oldVersion && newVersion, `Unsupported dependency range: ${name}`);
      assert.equal(newVersion[0], oldVersion[0], `Major upgrade needs review: ${name}`);
      if (oldVersion[0] === 0)
        assert.equal(newVersion[1], oldVersion[1], `Pre-1.0 minor upgrade needs review: ${name}`);
      assert.ok(
        newVersion[0] > oldVersion[0] ||
          newVersion[1] > oldVersion[1] ||
          (newVersion[1] === oldVersion[1] && newVersion[2] >= oldVersion[2]),
        `Dependency downgrade refused: ${name}`,
      );
    }
    delete previous[field];
    delete next[field];
  }
  assert.ok(
    isDeepStrictEqual(previous, next),
    "Maintenance cannot change scripts, package manager or other package metadata",
  );
}

export function validateFile(file) {
  assert.ok(
    file &&
      typeof file.path === "string" &&
      permittedFiles.test(file.path) &&
      !protectedSources.test(file.path),
    `Protected or unsupported path: ${file?.path}`,
  );
  assert.equal(typeof file.content, "string", "Maintenance files must be text");
  assert.ok(
    !file.content.includes("\0") && Buffer.byteLength(file.content) <= 1e6,
    "Invalid or oversized maintenance file",
  );
  assert.equal(file.sha256, hash(file.content), `Content digest mismatch: ${file.path}`);
}

async function beforeFile(base, name) {
  try {
    return git("show", `${base}:${name}`);
  } catch {
    assert.match(
      name,
      /^tests\/maintenance-[a-z0-9-]+\.test\.ts$/,
      "Only focused maintenance test files may be added",
    );
    return null;
  }
}

export async function inspectBundle(bundle, expectedBase) {
  assert.ok(
    /^[a-f0-9]{40}$/.test(expectedBase) && bundle?.base === expectedBase,
    "Candidate base does not match the trusted checkout",
  );
  assert.ok(
    Array.isArray(bundle.files) && bundle.files.length <= 8,
    "Maintenance is limited to eight files",
  );
  const names = new Set();
  let changedLines = 0;
  for (const file of bundle.files) {
    validateFile(file);
    assert.ok(!names.has(file.path), "Duplicate candidate path");
    names.add(file.path);
    const before = await beforeFile(expectedBase, file.path);
    if (file.path === "package.json") validatePackage(JSON.parse(before), JSON.parse(file.content));
    if (file.path.startsWith("tests/"))
      assert.equal(before, null, "Existing tests cannot be rewritten by maintenance");
    if (!["package.json", "pnpm-lock.yaml"].includes(file.path)) {
      changedLines += await changedLineCount(before, file.content);
    }
  }
  assert.ok(changedLines <= 200, "App changes exceed the 200-line maintenance budget");
  return bundle;
}

async function main() {
  const [mode, filename, base] = process.argv.slice(2);
  assert.ok(
    ["capture", "apply", "unchanged"].includes(mode),
    "Expected capture, apply or unchanged mode",
  );
  assert.equal(git("rev-parse", "HEAD").trim(), base, "The trusted checkout HEAD changed");
  if (mode === "capture") {
    const names = new Set(
      [
        ...git("diff", "--name-only", "HEAD").split("\n"),
        ...git("ls-files", "--others", "--exclude-standard").split("\n"),
      ].filter(Boolean),
    );
    const files = [];
    for (const name of names) {
      assert.ok(!name.includes("\n") && !name.includes("\r"), "Invalid path");
      const stat = await lstat(name);
      assert.ok(
        stat.isFile() && !stat.isSymbolicLink(),
        "Deleted files and symlinks are not maintenance changes",
      );
      const content = await readFile(name, "utf8");
      files.push({ path: name, content, sha256: hash(content) });
    }
    const bundle = await inspectBundle({ base, files }, base);
    await writeFile(filename, JSON.stringify(bundle));
    if (process.env.GITHUB_OUTPUT)
      await writeFile(process.env.GITHUB_OUTPUT, `changed=${files.length > 0}\n`, { flag: "a" });
    console.log(`Verified maintenance candidate: ${files.length} files.`);
  } else {
    const raw = await readFile(filename, "utf8");
    assert.ok(Buffer.byteLength(raw) <= 2e6, "Candidate exceeds 2 MB");
    const bundle = await inspectBundle(JSON.parse(raw), base);
    if (mode === "unchanged") {
      const currentNames = new Set(
        [
          ...git("diff", "--name-only", "HEAD").split("\n"),
          ...git("ls-files", "--others", "--exclude-standard").split("\n"),
        ].filter(Boolean),
      );
      assert.deepEqual(
        [...currentNames].sort(),
        bundle.files.map((f) => f.path).sort(),
        "Checks changed the candidate file list",
      );
      for (const file of bundle.files)
        assert.equal(
          await readFile(file.path, "utf8"),
          file.content,
          "Checks changed candidate content",
        );
    } else {
      for (const file of bundle.files) {
        assert.ok(
          path.resolve(file.path).startsWith(`${process.cwd()}${path.sep}`),
          "Path escapes checkout",
        );
        try {
          assert.ok(!(await lstat(file.path)).isSymbolicLink(), "Symlink target refused");
        } catch (e) {
          if (e.code !== "ENOENT") throw e;
        }
        await writeFile(file.path, file.content, { mode: 0o644 });
      }
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  await main();
