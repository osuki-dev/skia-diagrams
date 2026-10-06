import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  "keyboard",
  "screenshot",
]);
// Keep selector quotes (label="multi word") while decoding standalone string
// arguments. Commands are spawned directly, never passed through a shell.
function argumentsFor(line) {
  const tokens = line.match(/(?:"(?:\\.|[^"\\])*"|[^\s"]+)+/g) ?? [];
  if (tokens.join(" ") !== line.trim().replace(/\s+(?=(?:[^"]*"[^"]*")*[^"]*$)/g, " "))
    throw new Error(`Invalid quoted action: ${line}`);
  return tokens.map((token) => (token.startsWith('"') ? JSON.parse(token) : token));
}
if (suite.version !== 1 || !Array.isArray(suite.flows)) throw new Error("Invalid suite manifest");
for (const flow of suite.flows) {
  if (!flow.tags.includes("full") || !/^[\w-]+\.ad$/.test(flow.program))
    throw new Error("Unregistered native flow");
  const script = readFileSync(path.join(root, "e2e", flow.program), "utf8");
  for (const line of script.split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    argumentsFor(line);
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
// Native replay 0.21.12 does not decode CLI flags such as scroll --until: it
// forwards them as unused positional arguments. Execute the authored commands
// through the CLI parser so target-directed scrolling really reaches its target,
// and bind every action to the exact device rather than a display name.
const artifactRoot = path.join(root, "dist/native-qa", id, String(Date.now()));
const results = [];
for (const flow of selectedFlows) {
  const session = `skia-qa-${id}-${flow.name}`;
  const directory = path.join(artifactRoot, flow.name);
  mkdirSync(directory, { recursive: true });
  const program = readFileSync(path.join(root, "e2e", flow.program), "utf8");
  writeFileSync(path.join(directory, "replay.ad"), program);
  const actions = program.split("\n").filter((line) => line.trim() && !line.startsWith("#"));
  const start = Date.now();
  const output = [];
  let step = 0;
  let failure;
  console.log(`RUN ${flow.name} on ${device.name}`);
  try {
    for (const action of actions) {
      step++;
      output.push(
        `${step}: ${action}`,
        call([...argumentsFor(action), ...binding, "--session", session]),
      );
    }
  } catch (error) {
    failure = `Step ${step}: ${actions[step - 1]}\n${error instanceof Error ? error.message : String(error)}`;
    for (const args of [
      ["snapshot", "--json"],
      ["screenshot", "--out", path.join(directory, "failure.png")],
    ]) {
      try {
        output.push(call([...args, ...binding, "--session", session]));
      } catch (diagnostic) {
        output.push(String(diagnostic));
      }
    }
  } finally {
    if (failure || actions.at(-1) !== "close") {
      try {
        call(["close", ...binding, "--session", session]);
      } catch (cleanup) {
        failure ??= String(cleanup);
      }
    }
  }
  const seconds = (Date.now() - start) / 1000;
  writeFileSync(path.join(directory, "result.txt"), failure ?? `Passed ${step} authored actions`);
  writeFileSync(path.join(directory, "commands.log"), output.join("\n"));
  results.push({ name: flow.name, seconds, failure });
  console.log(`${failure ? "FAIL" : "PASS"} ${flow.name} (${seconds.toFixed(1)}s)`);
  if (failure) console.log(failure);
}
const xml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char],
  );
const failures = results.filter((result) => result.failure).length;
writeFileSync(
  path.join(root, "dist", `e2e-${id}.xml`),
  `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites><testsuite name="${xml(device.name)}" tests="${results.length}" failures="${failures}">\n` +
    results
      .map(
        (result) =>
          `<testcase name="${xml(result.name)}" time="${result.seconds}">${result.failure ? `<failure message="${xml(result.failure)}"/>` : ""}</testcase>`,
      )
      .join("\n") +
    "\n</testsuite></testsuites>\n",
);
console.log(
  `${results.length - failures}/${results.length} passed on ${device.name}. Artifacts: ${artifactRoot}`,
);
process.exitCode = failures ? 1 : 0;
