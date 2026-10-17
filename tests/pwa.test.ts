import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runInNewContext } from "node:vm";
test("offline worker excludes auth, preserves model caches, and serves cached navigation", async () => {
  execFileSync(process.execPath, ["scripts/build-sw.mjs"]);
  const events = new Map<string, (event: any) => void>();
  const stores = new Map<string, Map<string, Response>>([
    ["webllm-models", new Map()],
    ["substition-old", new Map()],
  ]);
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const map = stores.get(name)!;
      return {
        addAll: async (urls: string[]) => {
          for (const url of urls) map.set(url, new Response(url));
        },
        match: async (request: string | Request) =>
          map.get(typeof request === "string" ? request : new URL(request.url).pathname)?.clone(),
        put: async (request: string | Request, response: Response) => {
          map.set(typeof request === "string" ? request : new URL(request.url).pathname, response);
        },
      };
    },
  };
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    URL,
    Response,
    caches,
    fetch: async () => {
      throw new Error("offline");
    },
    self: {
      location: { origin: "https://app.test" },
      clients: { claim: async () => {} },
      skipWaiting: () => {},
      addEventListener: (name: string, listener: (event: any) => void) =>
        events.set(name, listener),
    },
  });
  let work: Promise<unknown> | undefined;
  events.get("install")!({
    waitUntil: (p: Promise<unknown>) => {
      work = p;
    },
  });
  await work;
  events.get("activate")!({
    waitUntil: (p: Promise<unknown>) => {
      work = p;
    },
  });
  await work;
  assert.ok(stores.has("webllm-models"));
  assert.ok(!stores.has("substition-old"));
  const responseFor = (path: string, mode = "navigate", method = "GET") => {
    let response: Promise<Response> | undefined;
    events.get("fetch")!({
      request: { url: `https://app.test${path}`, method, mode },
      respondWith: (p: Promise<Response>) => {
        response = p;
      },
    });
    return response;
  };
  assert.equal(responseFor("/api/auth/get-session"), undefined);
  assert.equal(responseFor("/sign-in"), undefined);
  assert.equal(responseFor("/", "navigate", "POST"), undefined);
  assert.equal(await (await responseFor("/?view=calendar"))?.text(), "/");
  assert.equal(await (await responseFor("/privacy"))?.text(), "/privacy");
  assert.equal(await (await responseFor("/unknown"))?.text(), "/offline.html");
  const light = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
  assert.equal(light.id, "/");
  assert.equal(light.display, "standalone");
  assert.ok(light.icons.some((i: { purpose: string }) => i.purpose === "maskable"));
});
