import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: bun run ui:add:8bit <registry-component> [...more]");
  process.exit(1);
}

const shadcn = spawnSync("bunx", ["--bun", "shadcn@latest", "add", ...args], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (shadcn.status !== 0) {
  process.exit(shadcn.status ?? 1);
}

const sourceRoot = path.join(process.cwd(), "src", "components", "ui");
const targetRoot = path.join(process.cwd(), "src", "shared", "ui");

if (!existsSync(sourceRoot)) {
  process.exit(0);
}

await migrateDirectory(sourceRoot, targetRoot);
await rm(path.join(process.cwd(), "src", "components"), {
  recursive: true,
  force: true,
});

console.log("Migrated generated files from src/components/ui to src/shared/ui.");

async function migrateDirectory(sourceDir, targetDir) {
  await mkdir(targetDir, { recursive: true });

  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await migrateDirectory(sourcePath, targetPath);
      continue;
    }

    let content = await readFile(sourcePath, "utf8");
    content = content
      .replaceAll("@/components/ui/", "@/shared/ui/")
      .replaceAll("@/components/", "@/shared/")
      .replaceAll("@/lib/", "@/shared/lib/")
      .replaceAll('from "@/shared/ui/8bit/', 'from "@/shared/ui/')
      .replaceAll('from "@/shared/ui/blocks/sidebar"', 'from "@/shared/ui/sidebar"');

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, "utf8");
  }
}
