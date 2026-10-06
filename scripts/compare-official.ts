/** Offline reference capture. Chromium is a QA tool, never a library dependency. */
import { createHash } from "node:crypto";
import { rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import { JsiSkApi } from "react-native-skia/lib/module/skia/web/JsiSkia.js";
import * as diagrams from "../src/index.ts";
import { createSkiaTextMeasurer, renderToPng } from "../src/render/skia.ts";
import { loadQaFonts } from "../test/font-provider.ts";
import { officialCatalog } from "../example/official-fixtures.ts";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i < 0 ? fallback : (args[i + 1] ?? fallback);
};
const output = resolve(option("--output", "design/theme-studio/official/comparison"));
const referenceOnly = args.includes("--reference-only");
const skiaOnly = args.includes("--skia-only");
const allCases = args.includes("--all");
const iconsOnly = args.includes("--icons-only");
const typeFilter = args.includes("--type") ? option("--type", "") : "";
const manifestPath = `${output}/${allCases ? "manifest-all" : "manifest"}${typeFilter ? `-${typeFilter}` : ""}${iconsOnly ? "-icons" : ""}.json`;
const cli = option("--cli", "") || Bun.which("mmdc") || "";
const puppeteerOption = option("--puppeteer", "");
const configOption = option("--config", "");
const puppeteer = puppeteerOption ? resolve(puppeteerOption) : undefined;
const config = configOption ? resolve(configOption) : undefined;
if (referenceOnly && skiaOnly) throw new Error("Choose one phase or neither");
let cliEntry = "";
let referenceMetadata: {
  cliVersion?: string;
  actualMermaidVersion?: string;
  referenceConfiguration?: Record<string, unknown>;
} = {};
if (skiaOnly) {
  // Reuse actual renderer provenance without requiring its CLI installation.
  for (const path of [manifestPath, `${output}/manifest-all.json`, `${output}/manifest.json`]) {
    if (await Bun.file(path).exists()) {
      referenceMetadata = await Bun.file(path).json();
      break;
    }
  }
  if (!referenceMetadata.cliVersion || !referenceMetadata.actualMermaidVersion)
    throw new Error(
      "--skia-only requires existing reference captures and their manifest in --output. Run a reference capture first.",
    );
} else {
  if (!cli)
    throw new Error(
      "Mermaid CLI was not found on PATH. Install @mermaid-js/mermaid-cli or pass --cli <mmdc-path>.",
    );
  // Resolve the actual package through the installed CLI, including nested dependencies.
  try {
    cliEntry = await import("node:fs/promises").then((fs) => fs.realpath(cli));
  } catch {
    throw new Error(
      `Cannot resolve Mermaid CLI at ${cli}. Pass --cli <mmdc-path> or install mmdc on PATH.`,
    );
  }
  const { createRequire } = await import("node:module");
  const requireFromCli = createRequire(cliEntry);
  const cliPackage = await Bun.file(resolve(dirname(cliEntry), "../package.json")).json();
  const mermaidEntry = requireFromCli.resolve("mermaid");
  const mermaidPackage = await Bun.file(resolve(dirname(mermaidEntry), "../package.json")).json();
  referenceMetadata = {
    cliVersion: cliPackage.version,
    actualMermaidVersion: mermaidPackage.version,
    referenceConfiguration: config ? await Bun.file(config).json() : {},
  };
}
const kit = await CanvasKitInit({
  locateFile: (file: string) =>
    `${import.meta.dir}/../node_modules/canvaskit-wasm/bin/full/${file}`,
});
const api = JsiSkApi(kit);
const fonts = await loadQaFonts(api);
const imageResources: { dispose(): void }[] = [];
const images = new Map<string, NonNullable<ReturnType<typeof api.Image.MakeImageFromEncoded>>>();
const iconUris = new Map<string, string>();
const hostAssetDirectory = resolve(
  option(
    "--icon-assets",
    `${import.meta.dir}/../design/theme-studio/official/comparison/host-assets`,
  ),
);
const assetProvenance: Record<string, unknown>[] = [];
const loadImage = async (filename: string, key?: string) => {
  const bytes = new Uint8Array(await Bun.file(filename).arrayBuffer());
  const data = api.Data.fromBytes(bytes);
  const image = (() => {
    try {
      return api.Image.MakeImageFromEncoded(data);
    } finally {
      data.dispose();
    }
  })();
  if (!image) throw new Error(`Cannot decode host QA image: ${filename}`);
  imageResources.push(image);
  const asset = key ?? `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
  images.set(asset, image);
  return { asset, sha256: createHash("sha256").update(bytes).digest("hex") };
};
const faviconFile = resolve(
  option("--image-file", `${import.meta.dir}/../example/assets/official/mermaid-favicon.png`),
);
const favicon = await loadImage(faviconFile, "https://mermaid.js.org/favicon.svg");
assetProvenance.push({
  source: favicon.asset,
  file: faviconFile,
  sha256: favicon.sha256,
});
const iconManifest = Bun.file(`${hostAssetDirectory}/manifest.json`);
if (await iconManifest.exists()) {
  const definitions = (await iconManifest.json()) as {
    id: string;
    file: string;
    sourcePackage: string;
    sourceVersion: string;
    upstream: string;
    pngSha256: string;
    svgSha256: string;
  }[];
  for (const definition of definitions) {
    const image = await loadImage(`${hostAssetDirectory}/${definition.file}.png`);
    if (image.sha256 !== definition.pngSha256)
      throw new Error(`Host icon digest changed: ${definition.id}`);
    iconUris.set(definition.id, image.asset);
    iconUris.set(definition.id.replace(/^fa fa-/, "fa:"), image.asset);
    assetProvenance.push({ ...definition, sha256: image.sha256 });
  }
}
const referenceIconPacks: Record<string, string> = {};
for (const name of ["logos", "mdi", "fa"]) {
  const file = `${hostAssetDirectory}/pack-${name}.json`;
  if (await Bun.file(file).exists()) referenceIconPacks[name] = new URL(`file://${file}`).href;
}
const resolveIcon: diagrams.DiagramIconResolver = (id, bounds) => {
  const asset =
    iconUris.get(id) ?? iconUris.get(id.replace(/^mdi mdi-/, "mdi:").replace(/^fa fa-/, "fa:"));
  return asset ? [{ type: "image", asset, ...bounds }] : undefined;
};
const theme = { ...diagrams.lightTheme, fontFamily: "QA,QACJK" };
const measure = createSkiaTextMeasurer(api, theme, fonts.provider);
const selectedIds: Record<string, string> = {
  flowchart: "flowchart/007",
  kanban: "kanban/003",
  block: "block/003",
  mindmap: "mindmap/002",
};
const decode = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
const svgSummary = (svg: string) => ({
  viewBox: svg.match(/\bviewBox="([^"]+)"/)?.[1] ?? null,
  // These are SVG element counts, not semantic node/edge counts.
  elements: {
    paths: (svg.match(/<path\b/g) ?? []).length,
    rects: (svg.match(/<rect\b/g) ?? []).length,
    circles: (svg.match(/<circle\b/g) ?? []).length,
  },
  textElements: [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)]
    .map((m) => decode(m[1]))
    .filter(Boolean),
});
const records: Record<string, unknown>[] = [];
let next = 0;
const selectedTypes = officialCatalog.types.filter(
  (t) => !args.includes("--type") || t.type === option("--type", ""),
);
const jobs = selectedTypes.flatMap((type) =>
  (allCases
    ? type.cases
    : [type.cases.find((c) => c.id === selectedIds[type.type]) ?? type.cases[0]]
  )
    .filter((item) => !iconsOnly || /icon\(|icon:\s*["']|\(logos:/.test(item.source))
    .map((item) => ({
      type,
      item,
      dir: allCases ? `${output}/cases/${item.id}` : `${output}/${type.type}`,
    })),
);
try {
  if (allCases && !skiaOnly) {
    // Four reusable Chromium processes, rather than launching 1,022 browsers.
    const helper = `${output}/qa-reference-worker.mjs`;
    await Bun.write(
      helper,
      `import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
const cliEntry=${JSON.stringify(cliEntry)};
const require=createRequire(cliEntry);
const puppeteer=(await import(require.resolve('puppeteer'))).default;
const {renderMermaid}=await import(new URL('./index.js','file://'+cliEntry));
const launch=${puppeteer ? `JSON.parse(await readFile(${JSON.stringify(puppeteer)},'utf8'))` : "{}"};
const mermaidConfig=${config ? `JSON.parse(await readFile(${JSON.stringify(config)},'utf8'))` : "{}"};
const browser=await puppeteer.launch(launch);
const iconPacks=Object.fromEntries(Object.entries(${JSON.stringify(referenceIconPacks)}).map(([name,url])=>[name,new URL(url)]));
const jobs=JSON.parse(await readFile(process.argv[2],'utf8'));
try { for(const job of jobs) { await mkdir(job.dir,{recursive:true}); await writeFile(job.dir+'/source.mmd',job.source); try { for(const format of ['svg','png']) { const {data}=await renderMermaid(browser,job.source,format,{viewport:{width:800,height:600,deviceScaleFactor:2},mermaidConfig,fontEmbed:false,iconPacks}); await writeFile(job.dir+'/official.'+format,data); } await writeFile(job.dir+'/reference-status.json',JSON.stringify({status:'rendered'})); console.log(job.id+': reference rendered'); } catch(error) { await Promise.all(['svg','png'].map(format=>rm(job.dir+'/official.'+format,{force:true}))); await writeFile(job.dir+'/reference-status.json',JSON.stringify({status:'error',error:String(error)})); console.log(job.id+': reference error'); } } } finally { await browser.close(); }
`,
    );
    await Promise.all(
      Array.from({ length: 4 }, async (_, worker) => {
        const batch = jobs
          .filter((_, i) => i % 4 === worker)
          .map(({ item, dir }) => ({ id: item.id, source: item.source, dir }));
        const file = `${output}/qa-reference-jobs-${worker}.json`;
        await Bun.write(file, JSON.stringify(batch));
        const child = Bun.spawn(["node", helper, file], {
          stdout: "inherit",
          stderr: "pipe",
        });
        const [error, code] = await Promise.all([new Response(child.stderr).text(), child.exited]);
        await Bun.write(`${output}/qa-reference-worker-${worker}.log`, error);
        if (code !== 0) throw new Error(`Reference worker ${worker} failed: ${error.slice(-1500)}`);
      }),
    );
  }
  await Promise.all(
    Array.from({ length: Math.min(4, jobs.length) }, async () => {
      while (next < jobs.length) {
        const { type, item, dir } = jobs[next++];
        await Bun.write(`${dir}/source.mmd`, item.source);
        const record: Record<string, unknown> = {
          type: type.type,
          name: type.name,
          id: item.id,
          title: item.title,
          documentation: type.documentation,
          sourceSha256: createHash("sha256").update(item.source).digest("hex"),
        };
        try {
          if (!skiaOnly && !allCases) {
            for (const format of ["svg", "png"]) {
              const process = Bun.spawn(
                [
                  cli,
                  "-i",
                  `${dir}/source.mmd`,
                  "-o",
                  `${dir}/official.${format}`,
                  ...(puppeteer ? ["-p", puppeteer] : []),
                  ...(config ? ["-c", config] : []),
                  "-s",
                  "2",
                  "--no-font-embed",
                  ...Object.entries(referenceIconPacks).flatMap(([name, url]) => [
                    "--iconPacksNamesAndUrls",
                    `${name}#${url}`,
                  ]),
                ],
                { stdout: "pipe", stderr: "pipe" },
              );
              const [stdout, stderr, code] = await Promise.all([
                new Response(process.stdout).text(),
                new Response(process.stderr).text(),
                process.exited,
              ]);
              await Bun.write(`${dir}/official-${format}.log`, stdout + stderr);
              if (code !== 0)
                throw new Error(
                  `Official ${format} rendering failed (${code}): ${stderr.slice(0, 1000)}`,
                );
            }
          }
          if (allCases) {
            const statusFile = Bun.file(`${dir}/reference-status.json`);
            if (await statusFile.exists()) {
              const status = await statusFile.json();
              if (status.status !== "rendered") throw new Error(status.error);
            }
          }
          const svg = await Bun.file(`${dir}/official.svg`).text();
          record.official = { status: "rendered", ...svgSummary(svg) };
        } catch (error) {
          record.official = { status: "error", error: String(error) };
        }
        if (!referenceOnly) {
          try {
            const ir = await diagrams.parseDiagramAsync(item.source);
            const scene = diagrams.layoutDiagram(ir, measure, {
              ...theme.layout,
              fontSize: theme.fontSize,
              radius: theme.radius,
              resolveIcon,
            });
            const svg = diagrams.renderToSvg(scene, theme);
            await Bun.write(`${dir}/skia.svg`, svg);
            await Bun.write(
              `${dir}/skia.png`,
              renderToPng(api, scene, theme, 2, fonts.provider, { images }),
            );
            record.skia = {
              status: "rendered",
              kind: scene.kind,
              bounds: scene.bounds,
              primitives: scene.primitives.length,
              ...svgSummary(svg),
            };
            const official = record.official as {
              status: string;
              textElements?: string[];
            };
            const nativeLabels = scene.primitives
              .filter((p) => p.type === "text")
              .map((p) => (p.type === "text" ? decode(p.text) : ""));
            const nativeCorpus = nativeLabels.join(" ");
            record.labelComparison = {
              officialTextAbsentFromSkia: (official.textElements ?? []).filter(
                (label) => !nativeCorpus.includes(label),
              ),
              note: "Text comparison is diagnostic; wrapping and formatting can cause false differences. Element counts do not establish semantic parity.",
            };
          } catch (error) {
            await Promise.all(
              ["svg", "png"].map((format) => rm(`${dir}/skia.${format}`, { force: true })),
            );
            record.skia = { status: "error", error: String(error) };
          }
        }
        records.push(record);
        await Bun.write(`${dir}/manifest.json`, JSON.stringify(record, null, 2) + "\n");
        console.log(
          `${type.type}: official ${(record.official as { status: string }).status}, Skia ${referenceOnly ? "not attempted" : (record.skia as { status: string }).status}`,
        );
      }
    }),
  );
  const manifest = {
    fixtureVersion: officialCatalog.version,
    fixtureRevision: officialCatalog.revision,
    cliVersion: referenceMetadata.cliVersion,
    actualMermaidVersion: referenceMetadata.actualMermaidVersion,
    referenceConfiguration: referenceMetadata.referenceConfiguration,
    referenceIconPacks,
    nativeFontFamily: theme.fontFamily,
    hostAssets: assetProvenance,
    hostIconPolicy:
      "Recognized QA icons are decoded from official package artwork; unregistered IDs retain explicit fallback IDs. No icon font is required or bundled.",
    phase: referenceOnly ? "reference" : skiaOnly ? "skia" : "both",
    limitations:
      "Official Arial and native example QA fonts differ. Reference Mermaid default styling intentionally differs from native design tokens. This is a matched-source visual/label audit, not pixel-equivalence certification. No WebView is used by production or example.",
    cases: records.sort((a, b) => String(a.type).localeCompare(String(b.type))),
  };
  await Bun.write(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  if (!referenceOnly && !allCases) {
    const paint = api.Paint();
    try {
      for (let start = 0; start < selectedTypes.length; start += 4) {
        const surface = api.Surface.MakeOffscreen(1800, 1520);
        if (!surface) throw new Error("Comparison contact sheet unavailable");
        try {
          const canvas = surface.getCanvas();
          canvas.clear(api.Color("#FFFFFF"));
          for (const [row, type] of selectedTypes.slice(start, start + 4).entries()) {
            const builder = api.ParagraphBuilder.Make(
              {
                textStyle: {
                  fontFamilies: ["QA"],
                  fontSize: 22,
                  color: api.Color("#101820"),
                },
              },
              fonts.provider,
            );
            let paragraph;
            try {
              builder.addText(`${type.name} — official (left) / native Skia (right)`);
              paragraph = builder.build();
            } finally {
              builder.dispose();
            }
            try {
              paragraph.layout(1760);
              paragraph.paint(canvas, 20, row * 380 + 10);
            } finally {
              paragraph.dispose();
            }
            for (const [column, phase] of ["official", "skia"].entries()) {
              const file = Bun.file(`${output}/${type.type}/${phase}.png`);
              if (!(await file.exists())) continue;
              const data = api.Data.fromBytes(new Uint8Array(await file.arrayBuffer()));
              const image = api.Image.MakeImageFromEncoded(data);
              data.dispose();
              if (!image) continue;
              try {
                const scale = Math.min(850 / image.width(), 315 / image.height());
                const width = image.width() * scale,
                  height = image.height() * scale;
                canvas.drawImageRect(
                  image,
                  { x: 0, y: 0, width: image.width(), height: image.height() },
                  {
                    x: column * 900 + (900 - width) / 2,
                    y: row * 380 + 50 + (315 - height) / 2,
                    width,
                    height,
                  },
                  paint,
                );
              } finally {
                image.dispose();
              }
            }
          }
          surface.flush();
          const image = surface.makeImageSnapshot();
          try {
            await Bun.write(
              `${output}/sheet-${typeFilter ? `${typeFilter}-` : ""}${String(start / 4 + 1).padStart(2, "0")}.png`,
              image.encodeToBytes(),
            );
          } finally {
            image.dispose();
          }
        } finally {
          surface.dispose();
        }
      }
    } finally {
      paint.dispose();
    }
  }
  const failures = records.filter(
    (record) =>
      (record.official as { status: string }).status === "error" ||
      (!referenceOnly && (record.skia as { status: string }).status === "error"),
  );
  if (failures.length)
    throw new Error(
      `${failures.length} capture(s) failed; see manifests: ${failures.map((record) => record.id).join(", ")}`,
    );
} finally {
  for (const image of imageResources) image.dispose();
  fonts.dispose();
}
