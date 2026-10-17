import { writeFile, mkdir } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { IntersectThree } from "@phosphor-icons/react/dist/ssr";
import * as icons from "simple-icons";
import { createRequire } from "node:module";
import { merchants } from "../src/lib/catalog";
await mkdir("public/brand", { recursive: true });
await mkdir("public/merchants", { recursive: true });
const mark = renderToStaticMarkup(<IntersectThree size={256} weight="fill" color="#5e7b47" />);
await writeFile("public/brand/mark.svg", mark);
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const logo = await sharp(Buffer.from(mark)).resize(306, 306).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#dbecc9" } })
  .composite([{ input: logo, gravity: "center" }])
  .png()
  .toFile("public/brand/icon-512.png");
for (const [name, size] of [
  ["icon-192", 192],
  ["apple-touch-icon", 180],
  ["maskable-512", 512],
] as const)
  await sharp("public/brand/icon-512.png")
    .resize(size, size)
    .png()
    .toFile(`public/brand/${name}.png`);
for (const merchant of merchants) {
  const icon = Object.values(icons).find((icon) => icon.slug === merchant.logo);
  if (icon)
    await writeFile(
      `public/merchants/${merchant.logo}.svg`,
      icon.svg.replace("<svg ", `<svg fill="${merchant.color}" `),
    );
  else {
    const { execFileSync } = await import("node:child_process");
    const source =
      merchant.logo === "disneyplus"
        ? "https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg"
        : `https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/${merchant.logo}.svg`;
    const svg = execFileSync("curl", ["-fsSL", source], { encoding: "utf8" });
    await writeFile(
      `public/merchants/${merchant.logo}.svg`,
      svg.replace("<svg ", `<svg fill="${merchant.color}" `),
    );
  }
}
