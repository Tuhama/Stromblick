import path from "node:path";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const { tool_name: tool, tool_input: input = {} } = JSON.parse(raw);

const isSecretEnv = (p) => {
  const name = path.basename(String(p).replace(/["']/g, ""));
  return name.startsWith(".env") && name !== ".env.example";
};

let blocked = false;
if (["Read", "Edit", "Write", "MultiEdit"].includes(tool)) {
  blocked = isSecretEnv(input.file_path ?? "");
} else if (tool === "Grep") {
  blocked = isSecretEnv(input.path ?? "");
} else if (tool === "Bash") {
  blocked = String(input.command ?? "")
    .split(/[\s;&|<>()]+/)
    .some((token) => token !== "" && isSecretEnv(token));
}

if (blocked) {
  console.error(
    "Blocked by .claude/hooks/protect-env.mjs: .env files hold secrets. Use .env.example or the env schema instead.",
  );
  /*  Exit code 2 blocks the action, and Claude sees the message.
  Any other non-zero exit code is treated as a hook error and does not block, which is a common mistake.*/
  process.exit(2);
}
