import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as prettier from "prettier";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const input = JSON.parse(raw);
const file = input.tool_input?.file_path;
if (!file) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
try {
  const info = await prettier.getFileInfo(file, {
    ignorePath: [path.join(root, ".gitignore"), path.join(root, ".prettierignore")],
  });
  if (info.ignored || !info.inferredParser) process.exit(0);

  const source = await readFile(file, "utf8");
  const options = (await prettier.resolveConfig(file)) ?? {};
  const formatted = await prettier.format(source, { ...options, filepath: file });
  if (formatted !== source) await writeFile(file, formatted);
} catch (error) {
  console.error(`format hook: ${String(error)}`);
}
