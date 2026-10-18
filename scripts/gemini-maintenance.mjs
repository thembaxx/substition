import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inspectBundle } from "./maintenance-policy.mjs";

export const model = "gemini-3.8-flash";
const editable = new Set([
  "src/app/error.tsx",
  "src/app/loading.tsx",
  "src/app/globals.css",
  "src/components/dialog.tsx",
  "src/components/subscription-form.tsx",
  "src/components/ambient.tsx",
]);
const schema = {
  type: "object",
  properties: {
    summary: { type: "string", maxLength: 1500 },
    edits: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          find: { type: "string", maxLength: 20000 },
          replace: { type: "string", maxLength: 20000 },
        },
        required: ["path", "find", "replace"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "edits"],
  additionalProperties: false,
};

export async function requestProposal(apiKey, instructions, sources, fetcher = fetch) {
  const input = JSON.stringify(sources);
  assert.ok(Buffer.byteLength(input) <= 160000, "Gemini source context exceeds 160 KB");
  let response;
  try {
    response = await fetcher("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      redirect: "error",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({
        model,
        system_instruction: instructions,
        input,
        store: false,
        generation_config: { temperature: 0.2, max_output_tokens: 8192 },
        response_format: { type: "text", mime_type: "application/json", schema },
      }),
    });
  } catch {
    return { unavailable: "network error or two-minute timeout" };
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const reasons = [
      "API_KEY_INVALID",
      "SERVICE_DISABLED",
      "API_KEY_SERVICE_BLOCKED",
      "API_KEY_IP_ADDRESS_BLOCKED",
      "API_KEY_HTTP_REFERRER_BLOCKED",
      "BILLING_DISABLED",
    ];
    const reason = error?.error?.details?.find((detail) => reasons.includes(detail.reason))?.reason;
    return { unavailable: `HTTP ${response.status}${reason ? ` (${reason})` : ""}` };
  }
  const result = await response.json();
  assert.equal(result.status, "completed", "Gemini did not complete a proposal");
  const text = (result.steps ?? [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((content) => content.type === "text")
    .map((content) => content.text)
    .join("");
  assert.ok(text.length && Buffer.byteLength(text) <= 100000, "Invalid Gemini response size");
  return { proposal: JSON.parse(text) };
}

export async function prepareEdits(proposal, readSource) {
  assert.ok(
    typeof proposal?.summary === "string" && proposal.summary.length <= 1500,
    "Gemini must explain its proposal",
  );
  assert.ok(Array.isArray(proposal.edits) && proposal.edits.length <= 8, "Too many Gemini edits");
  const contents = new Map();
  for (const edit of proposal.edits) {
    const newTest = /^tests\/maintenance-[a-z0-9-]+\.test\.ts$/.test(edit?.path);
    assert.ok(editable.has(edit?.path) || newTest, "Gemini proposed a protected path");
    assert.ok(
      typeof edit.find === "string" &&
        typeof edit.replace === "string" &&
        edit.find.length <= 20000 &&
        edit.replace.length <= 20000,
      "Invalid Gemini replacement",
    );
    let current;
    if (contents.has(edit.path)) current = contents.get(edit.path);
    else {
      current = await readSource(edit.path);
      if (newTest) assert.equal(current, null, "Gemini cannot rewrite existing tests");
    }
    if (current === null) {
      assert.ok(newTest && edit.find === "", "Only new focused tests may be created");
      current = edit.replace;
    } else {
      const index = current.indexOf(edit.find);
      assert.ok(
        edit.find.length && index >= 0 && current.lastIndexOf(edit.find) === index,
        "Gemini replacement must match exactly once",
      );
      current = current.slice(0, index) + edit.replace + current.slice(index + edit.find.length);
    }
    contents.set(edit.path, current);
  }
  assert.ok(contents.size <= 6, "Gemini is limited to six files plus dependency updates");
  return [...contents].map(([filename, content]) => ({
    path: filename,
    content,
    sha256: createHash("sha256").update(content).digest("hex"),
  }));
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  assert.ok(apiKey, "Configure the repository Actions secret GEMINI_API_KEY");
  const names = ["README.md", "docs/architecture.md", "package.json", ...editable];
  const sources = await Promise.all(
    names.map(async (filename) => ({ path: filename, content: await readFile(filename, "utf8") })),
  );
  const instructions = await readFile(".github/prompts/maintenance.md", "utf8");
  const result = await requestProposal(apiKey, instructions, sources);
  if (result.unavailable) {
    const message = `Gemini unavailable (${result.unavailable}); AI skipped. Dependency checks continue. No retry or alternate model was used.`;
    console.log(`::warning::${message}`);
    if (process.env.GITHUB_STEP_SUMMARY)
      await writeFile(process.env.GITHUB_STEP_SUMMARY, `${message}\n`, { flag: "a" });
    return;
  }
  const files = await prepareEdits(result.proposal, async (filename) => {
    try {
      return await readFile(filename, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  });
  await inspectBundle({ base: process.env.GITHUB_SHA, files }, process.env.GITHUB_SHA);
  for (const file of files) await writeFile(file.path, file.content, { mode: 0o644 });
  console.log("Gemini rationale:", result.proposal.summary.replace(/\s+/g, " "));
  const message = `Gemini (${model}) proposed ${files.length} files. All changes still require the maintenance guard and full verification.`;
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY)
    await writeFile(process.env.GITHUB_STEP_SUMMARY, `${message}\n`, { flag: "a" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  await main();
