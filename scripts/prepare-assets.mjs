import { cp, writeFile, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
await cp(require.resolve("pdfjs-dist/build/pdf.worker.min.mjs"), "public/pdf.worker.min.mjs");
const manifest = JSON.parse(await readFile("public/manifest.webmanifest", "utf8"));
await writeFile(
  "public/manifest-dark.webmanifest",
  JSON.stringify({ ...manifest, background_color: "#101512", theme_color: "#101512" }, null, 2),
);
