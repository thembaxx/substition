import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const port = "3967";
const origin = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", port],
  { env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"] },
);
let output = "";
server.stdout.on("data", (data) => {
  output = (output + data).slice(-6000);
});
server.stderr.on("data", (data) => {
  output = (output + data).slice(-6000);
});
try {
  let ready = false;
  for (let i = 0; i < 200; i++) {
    if (server.exitCode !== null) throw new Error(`Server exited: ${output}`);
    try {
      ready = (await fetch(origin)).ok;
    } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, "Production server did not start");
  const home = await fetch(origin);
  assert.match(await home.text(), /Substition/);
  assert.equal(home.headers.get("x-content-type-options"), "nosniff");
  assert.equal(home.headers.get("referrer-policy"), "no-referrer");
  assert.match(home.headers.get("content-security-policy"), /connect-src 'self'/);
  for (const path of ["/privacy", "/terms", "/sign-in"])
    assert.equal((await fetch(origin + path)).status, 200, path);
  const authConfig = await fetch(`${origin}/api/auth-config`);
  assert.equal(authConfig.headers.get("cache-control"), "no-store");
  const { configured } = await authConfig.json();
  if (!configured) assert.equal((await fetch(`${origin}/api/auth/get-session`)).status, 503);
  const light = await (await fetch(`${origin}/manifest.webmanifest`)).json();
  const dark = await (await fetch(`${origin}/manifest-dark.webmanifest`)).json();
  assert.equal(light.id, dark.id);
  assert.equal(dark.background_color, "#101512");
  const swResponse = await fetch(`${origin}/sw.js`);
  assert.match(swResponse.headers.get("cache-control"), /no-store/);
  const sw = await swResponse.text();
  const files = JSON.parse(sw.match(/const SHELL=(\[[^;]+\]);/)[1]);
  for (let i = 0; i < files.length; i += 10) {
    await Promise.all(
      files.slice(i, i + 10).map(async (path) => {
        const result = await fetch(origin + path);
        assert.equal(result.status, 200, `Offline asset missing: ${path}`);
        await result.arrayBuffer();
      }),
    );
  }
  console.log(
    `HTTP smoke passed: app/legal/sign-in routes, auth disabled state, security headers, two manifests and ${files.length} offline shell assets.`,
  );
} finally {
  server.kill("SIGTERM");
}
