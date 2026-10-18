import assert from "node:assert/strict";
import { test } from "node:test";
import { model, prepareEdits, requestProposal } from "../scripts/gemini-maintenance.mjs";

const response = (proposal: unknown) =>
  Response.json({
    status: "completed",
    steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify(proposal) }] }],
  });
const proposal = {
  summary: "Announce the loading status to assistive technology.",
  edits: [{ path: "src/app/loading.tsx", find: "<main>", replace: '<main role="status">' }],
};

test("Gemini makes one bounded stateless request without putting credentials into its prompt", async () => {
  let calls = 0;
  const result = await requestProposal(
    "synthetic-test-key",
    "Return a minimal patch.",
    [{ path: "src/app/loading.tsx", content: "<main>Loading</main>" }],
    async (url, options) => {
      calls++;
      assert.equal(url, "https://generativelanguage.googleapis.com/v1beta/interactions");
      assert.ok(options);
      assert.equal(options.redirect, "error");
      assert.equal(
        (options.headers as Record<string, string>)["x-goog-api-key"],
        "synthetic-test-key",
      );
      const body = JSON.parse(options.body as string);
      assert.equal(body.model, model);
      assert.equal(body.store, false);
      assert.equal(body.tools, undefined);
      assert.equal(body.generation_config.max_output_tokens, 8192);
      assert.equal(body.generation_config.thinking_level, "low");
      assert.equal(body.response_format.mime_type, "application/json");
      assert.ok(!(options.body as string).includes("synthetic-test-key"));
      return response(proposal);
    },
  );
  assert.equal(calls, 1);
  assert.deepEqual(result.proposal, proposal);
});

test("Gemini skips unavailable or incomplete generation and rejects malformed output", async () => {
  let calls = 0;
  const unavailable = await requestProposal("test", "task", [], async () => {
    calls++;
    return new Response("provider error body must not be logged", { status: 429 });
  });
  assert.equal(calls, 1);
  assert.deepEqual(unavailable, { unavailable: "HTTP 429" });
  assert.deepEqual(
    await requestProposal("test", "task", [], async () => Response.json({ status: "incomplete" })),
    { unavailable: "incomplete response discarded" },
  );
  assert.deepEqual(
    await requestProposal("test", "task", [], async () =>
      Response.json(
        {
          error: {
            message: "Never log the raw provider message",
            details: [{ reason: "API_KEY_INVALID" }],
          },
        },
        { status: 400 },
      ),
    ),
    { unavailable: "HTTP 400 (API_KEY_INVALID)" },
  );
  assert.equal(
    (
      await requestProposal("test", "task", [], async () => {
        throw new Error("offline");
      })
    ).unavailable,
    "network error or two-minute timeout",
  );
  await assert.rejects(() =>
    requestProposal("test", "task", [], async () => Response.json({ status: "requires_action" })),
  );
  await assert.rejects(() =>
    requestProposal("test", "task", [], async () =>
      Response.json({
        status: "completed",
        steps: [{ type: "model_output", content: [{ type: "text", text: "not JSON" }] }],
      }),
    ),
  );
});

test("Gemini edits require exact matches, protect files and preserve no-change results", async () => {
  const source = async (filename: string) =>
    filename === "src/app/loading.tsx" ? "<main>Loading</main>" : null;
  const files = await prepareEdits(proposal, source);
  assert.equal(files[0].content, '<main role="status">Loading</main>');
  for (const filename of [
    "package.json",
    "pnpm-lock.yaml",
    "src/lib/vault.ts",
    "tests/core.test.ts",
    ".github/workflows/check.yml",
    "../src/app/loading.tsx",
  ])
    await assert.rejects(() =>
      prepareEdits(
        {
          ...proposal,
          edits: [{ ...proposal.edits[0], path: filename }],
        },
        source,
      ),
    );
  for (const text of ["<main><main>", "<article>Loading</article>"])
    await assert.rejects(() => prepareEdits(proposal, async () => text));
  await assert.rejects(() =>
    prepareEdits(
      {
        ...proposal,
        edits: [{ ...proposal.edits[0], find: "" }],
      },
      source,
    ),
  );
  assert.deepEqual(await prepareEdits({ summary: "No credible issue.", edits: [] }, source), []);
  const testEdit = {
    path: "tests/maintenance-loading.test.ts",
    find: "",
    replace: "// focused test\n",
  };
  assert.equal(
    (await prepareEdits({ ...proposal, edits: [testEdit] }, source))[0].content,
    testEdit.replace,
  );
  await assert.rejects(() =>
    prepareEdits({ ...proposal, edits: [testEdit] }, async () => "existing test"),
  );
  await assert.rejects(() =>
    prepareEdits(
      {
        ...proposal,
        edits: [
          proposal.edits[0],
          {
            ...proposal.edits[0],
            find: "missing substring",
          },
        ],
      },
      source,
    ),
  );
  assert.equal(await source("src/app/loading.tsx"), "<main>Loading</main>");
});
