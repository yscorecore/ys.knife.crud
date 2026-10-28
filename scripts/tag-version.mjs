/**
 * 由各包 package.json 的 postversion 钩子调用（`pnpm version patch` 之后）。
 *
 * 背景：在 pnpm workspace 里 `pnpm version patch` 只会改写 package.json 的 version，
 * 不像独立仓库那样自动创建 git commit / tag；而 postversion 里的 `git push --tags`
 * 必须有 tag 才有意义（否则远端没有新 tag，release.yml 不会被触发）。
 * 所以这里显式补上 commit + tag，再由 postversion 继续 push。
 *
 * 在包目录内执行：
 *   node ../../scripts/tag-version.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
const tag = `v${pkg.version}`;
const message = `chore(release): ${pkg.name}@${pkg.version}`;

function git(...args) {
  execFileSync("git", args, { stdio: "inherit" });
}

git("add", "package.json");
git("commit", "-m", message);
git("tag", "-a", tag, "-m", tag);
console.log(`[release] 已提交并打 tag：${tag}`);
