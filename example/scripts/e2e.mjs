import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const suite = JSON.parse(readFileSync(path.join(root, "e2e/suite.json"), "utf8"));
const commands = new Set([
  "open",
  "wait",
  "scroll",
  "press",
  "gesture",
  "is",
  "close",
  "back",
  "fill",
  "screenshot",
]);
if (suite.version !== 1 || !Array.isArray(suite.flows)) throw new Error("Invalid suite manifest");
for (const flow of suite.flows) {
  if (!flow.tags.includes("full") || !/^[\w-]+\.ad$/.test(flow.program))
    throw new Error("Unregistered native flow");
  const script = readFileSync(path.join(root, "e2e", flow.program), "utf8");
  for (const line of script.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    if (!commands.has(line.split(" ")[0]) || line.includes("${"))
      throw new Error(`Invalid authored action: ${line}`);
  }
}
if (process.argv.includes("--check")) {
  console.log(
    `Manifest references and authored native commands checked: ${suite.flows.length} flow(s). This is not device execution or the driver's full syntax validation.`,
  );
  process.exit(0);
}
const platform = process.env.QA_PLATFORM ?? "android";
const id = process.env.QA_DEVICE;
if (!id || !["android", "ios"].includes(platform))
  throw new Error(
    "Set QA_DEVICE explicitly and QA_PLATFORM=android|ios; automatic device selection is forbidden",
  );
function call(args) {
  const result = spawnSync("bunx", ["agent-device@0.21.12", ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(
      result.stderr ||
        result.stdout ||
        String(
          result.error ?? `agent-device failed: status=${result.status}, signal=${result.signal}`,
        ),
    );
  return result.stdout;
}
const version = call(["--version"]).trim();
if (version !== "0.21.12") throw new Error(`Wrong agent-device version: ${version}`);
const devices = JSON.parse(call(["devices", "--json"]));
const device = devices.data.devices.find(
  (device) => device.id === id && device.platform === platform,
);
if (!device) throw new Error(`QA_DEVICE ${id} was not found for QA_PLATFORM ${platform}`);
const binding = ["--platform", platform, platform === "android" ? "--serial" : "--udid", id];
const selectedFlows = suite.flows.filter((flow) => flow.platforms.includes(platform));
const apps = JSON.parse(call(["apps", ...binding, "--json"]));
if (!apps.data.apps.some((app) => JSON.stringify(app).includes("dev.osuki.skiadiagrams.example")))
  throw new Error(
    "Native gallery is not installed on the selected QA device; build/install is required before E2E",
  );
console.log(
  call([
    "test",
    "--device",
    id,
    ...selectedFlows.map((flow) => path.join(root, "e2e", flow.program)),
    "--reporter",
    "default",
    "--artifacts-dir",
    path.join(root, "dist/native-qa"),
    "--reporter",
    `junit:${path.join(root, "dist/e2e.xml")}`,
  ]),
);
