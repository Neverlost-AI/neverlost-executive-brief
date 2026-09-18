import { cp, mkdir, rm, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, ".vercel/output");
await access(resolve(root, "dist/server/index.js"));
await access(resolve(root, "dist/client/assets"));
// Only replace the generated artifact, never .vercel metadata or env files.
await rm(output, { recursive: true, force: true });
const fn = resolve(output, "functions/index.func");
await mkdir(fn, { recursive: true });
await cp(resolve(root, "dist/client"), resolve(output, "static"), { recursive: true });
await cp(resolve(root, "dist/server"), resolve(fn, "server"), { recursive: true });
await cp(resolve(root, "build/vercel-handler.mjs"), resolve(fn, "serve.mjs"));
await writeFile(resolve(fn, "package.json"), JSON.stringify({ type: "module" }));
await writeFile(resolve(fn, ".vc-config.json"), JSON.stringify({
  runtime: "nodejs24.x", handler: "serve.mjs", launcherType: "Nodejs",
  shouldAddHelpers: false, supportsResponseStreaming: true,
}));
await writeFile(resolve(output, "config.json"), JSON.stringify({
  version: 3, routes: [{ handle: "filesystem" }, { src: "/.*", dest: "/index" }],
}));
console.log("Packaged current dist build in .vercel/output (no environment files copied).");
