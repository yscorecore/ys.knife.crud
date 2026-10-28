# 发布流程（Releasing）

本仓库是 pnpm monorepo，6 个库包发布到 npm：

| 包名 | 路径 | 构建工具 |
| --- | --- | --- |
| `@ys-knife-crud/core` | `packages/core` | tsup |
| `@ys-knife-crud/vue` | `packages/vue` | tsup |
| `@ys-knife-crud/element-plus` | `packages/element-plus` | vite |
| `@ys-knife-crud/export-exceljs` | `packages/export-exceljs` | tsup |
| `@ys-knife-crud/import-exceljs` | `packages/import-exceljs` | tsup |
| `@ys-knife-crud/taro` | `packages/taro` | vite |

`@ys-knife-crud/element-plus-demo`、`@ys-knife-crud/taro-demo` 是私有 demo（`"private": true`），不发布；CI 构建时会被过滤或因为没有 `build` 脚本而自动跳过。

发布方式：**打 git tag 推送到 GitHub → [release.yml](.github/workflows/release.yml) CI 自动发布到 npm**，本地不需要 npm 登录、不需要 token、不需要 OTP。

---

## 一、发布机制（原理与前置条件）

CI 通过 npm **Trusted Publisher** 认证：GitHub Actions 用 OIDC 向 npm 证明“我是这个仓库这个 workflow 的运行”，npm 据此放行发布，全程无密钥。

该机制生效的四个必要条件（已在仓库中配置好，一般无需改动）：

1. **npm 网站为每个包配置 Trusted Publisher**
   - 位置：npmjs.com → 包页面 → Settings → Trusted Publisher
   - 配置：Repository = `yscorecore/ys.knife.crud`，Workflow = `release.yml`
   - 新建包时（首次本地发布后）必须补配，否则该包 CI 发布会失败。

2. **workflow 具备 OIDC 权限**：[release.yml](.github/workflows/release.yml) 中 `permissions: id-token: write`。

3. **每个发布包的 `publishConfig` 含 `provenance: true`**，例如：

   ```json
   "publishConfig": {
     "access": "public",
     "registry": "https://registry.npmjs.org/",
     "provenance": true
   }
   ```

   `provenance: true` 会让 npm CLI 发起 OIDC 认证；缺少它时 CI 以匿名身份发布，返回 `E404`。

4. **CI 使用 Node 24**（`actions/setup-node` 的 `node-version: 24`）。Node 22 自带的 npm 版本下 Trusted Publisher 认证不生效（provenance 能签名成功但 PUT 仍返回 `E404`）。

CI 的发布命令是 `pnpm -r publish --no-git-checks`：private 包自动跳过，**已发布过的版本自动跳过（不报错）**，`workspace:*` 依赖发布时自动替换为本次发布的版本号，包按拓扑顺序发布（core → vue → element-plus → exceljs / taro）。

---

## 二、发布前校验

在仓库根目录执行：

```bash
pnpm -r --filter "!@ys-knife-crud/element-plus-demo" --filter "!@ys-knife-crud/taro-demo" run typecheck
pnpm -r --filter "!@ys-knife-crud/element-plus-demo" --filter "!@ys-knife-crud/taro-demo" run build
```

全部通过后再发版。

---

## 三、核心概念：包版本号 vs 发布 tag

这两件事互相独立，混淆是「明明打了 tag，却只有部分包更新」的唯一原因。

- **包版本号**：每个包的 `package.json` 的 `version`，各自独立演进，不要求彼此相同。
- **发布 tag**：`v<x.y.z>` 只是「触发一次 CI 发布批次」的开关，它本身不会修改任何包版本号，也不要求所有包都是这个版本。

`pnpm -r publish` 是**幂等**的：它逐个检查包，如果该包的 `version` 在 registry 上已存在，就静默跳过，不报错也不失败。

因此：

| 情况 | 结果 |
| --- | --- |
| 打 tag 前只改了 A 包的 version | 本次只有 A 包真正发布，其余包显示跳过 |
| 打 tag 前没改任何包 version | CI 绿灯但 npm 无任何变化 |
| 想让 N 个包一起发 | 必须把这 N 个包的 version **都**改成新版本号 |

**真实案例（v0.0.5）**：那次提交只把 `packages/taro/package.json` 从 `0.0.4` 改成 `0.0.5`，其余 5 个包仍在 `0.0.3`（那次只改了它们各自的 `postversion` 脚本，没动 version）。0.0.3 早已发布过，于是 CI 只发布了 taro 0.0.5，其余 5 个包全部跳过 —— 这是预期行为，不是 CI 故障。后来通过把 5 个包的 version 都改成 `0.0.5` 并打新 tag `v0.0.5-full` 补齐。

---

## 四、标准发布流程

### 方式 A：全量发布（推荐，打 `v*` tag）

适用于多个包一起发版（版本号未变的包会被 CI 自动跳过）。

1. 修改需要发版的包的 `package.json` 版本号（遵守语义化版本），**逐个包改，改几个发几个**：

   ```bash
   git diff --stat   # 确认哪些包的 version 变了
   ```

2. 提交版本变更：

   ```bash
   git add packages/*/package.json
   git commit -m "chore(release): v0.0.6"
   ```

3. 打**带注释** tag 并推送（触发 CI）：

   ```bash
   git tag -a v0.0.6 -m "v0.0.6"
   git push origin main
   git push origin v0.0.6
   ```

4. 在 https://github.com/yscorecore/ys.knife.crud/actions 确认 Release workflow 成功。

5. 验证 npm（新版本同步可能有几十秒到几分钟延迟）：

   ```powershell
   foreach ($p in @("@ys-knife-crud/core","@ys-knife-crud/vue","@ys-knife-crud/element-plus","@ys-knife-crud/export-exceljs","@ys-knife-crud/import-exceljs","@ys-knife-crud/taro")) {
     (Invoke-RestMethod "https://registry.npmjs.org/$p").'dist-tags'.latest
   }
   ```

### 方式 B：单包发布（在包目录执行 `pnpm version patch`）

只发某一个包时：

```bash
cd packages/taro
pnpm version patch
```

**关键：pnpm 在 workspace 下不会自动创建 commit 和 tag**（独立仓库才会），但 `version` / `postversion` 生命周期钩子照常执行。因此这里显式补上了：

```json
"postversion": "node ../../scripts/tag-version.mjs && git push && git push --tags"
```

[tag-version.mjs](scripts/tag-version.mjs) 做三件事：

1. 读当前包的 `package.json` 拿到新 version
2. `git add package.json` + `git commit -m "chore(release): <name>@<version>"`
3. `git tag -a v<version> -m v<version>`

随后 `postversion` 里的 `git push` 推提交、`git push --tags` 推 tag，触发 CI。

注意事项：

- **tag 统一是 `v<version>`**（匹配 release.yml 的 `v*`）。各包 `.npmrc` 里遗留的 `tag-version-prefix` 只对独立仓库生效，workspace 下不会产生 `@ys-knife-crud/<pkg>@x.y.z` 形式的 tag。
- **可能连续 bump 两次**：在部分环境下一次 `pnpm version patch` 会出现 `1.0.4 → 1.0.6`（两个 commit + 两个 tag）。执行完务必核对：

  ```bash
  git log --oneline -3
  git tag -l
  ```

  多出来的 tag 本地删除即可（若已推送，删除远端 tag 属于历史改写，需先在 GitHub 上确认无人依赖）。
- 包之间存在依赖链 `core → vue → element-plus`、`core → taro`。若改动涉及多个有依赖关系的包，优先用方式 A 全量发布（CI 按拓扑顺序发布），避免下游包引用到尚未发布的上游版本。

---

## 五、分步补发：同一版本多个包分批上

场景：一个版本中部分包先发成功，剩余包随后补发（v0.0.2 与 v0.0.5 都出现过）。

**推荐做法**：新建一个不冲突的 tag 指向新提交，不要改写已经推送过的 tag：

```bash
# 1. 修改剩余包的 package.json 版本号并提交
git add packages/export-exceljs/package.json packages/import-exceljs/package.json
git commit -m "chore(release): 全量对齐 v0.0.5（export-exceljs/import-exceljs）"

# 2. 打新 tag 推送（v0.0.5-full 同样匹配 v*）
git tag -a v0.0.5-full -m "v0.0.5-full"
git push origin main
git push origin v0.0.5-full
```

CI 会自动跳过已发布的包、只发新包。

> 不推荐删除并重建同名 tag：已推送的 tag 被重写会让「某个 npm 版本对应哪个 commit」变得不可追溯，且属于不可逆的远端历史改写。

---

## 六、故障排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `npm error code EOTP`（requires a one-time password） | CI 仍在用 Publish 类型 NPM_TOKEN，2FA 强制 OTP | 确认 publish 步骤没有注入 `NODE_AUTH_TOKEN`/`_authToken`，改走 Trusted Publisher |
| `npm error code E404 ... is not in this registry` | 匿名发布：`publishConfig.provenance` 缺失，或 Node/npm 版本过低未触发 OIDC 认证 | 补齐 `provenance: true`；CI 用 Node 24 |
| 日志有 `Signed provenance statement` 但仍 `E404` | provenance 签名成功 ≠ npm 认证成功；旧版 npm 不走 Trusted Publisher | 升级 CI Node 到 24 |
| **CI 成功，但只有部分包更新了版本** | 其余包的 `version` 没变，而该版本在 registry 上已存在，`pnpm -r publish` 静默跳过 | 属于预期行为。要让它们一起发，需显式改这些包的 `version` 再打新 tag（见第三节） |
| tag 推送后 CI 没有触发 | tag 名未匹配 `v*` 或 `@ys-knife-crud/*`（例如打了 `0.0.5` 而不是 `v0.0.5`） | 用 `v` 前缀重打 tag 推送 |
| CI 显示成功但 npm 查不到新版本 | registry 同步延迟，或该版本被 pnpm 跳过 | 等待 1–3 分钟重查；展开 CI 的 Publish 步骤确认有 `+ @scope/pkg@x.y.z`（真发布）而非跳过 |
| 重复发布同一版本导致 CI 报 403 | 该版本已被上一轮 CI 发布过 | 视为已发布，改用新版本号；无需重跑 |
| `--provenance` 报权限错误 | workflow 缺少 `id-token: write` | 在 release.yml 的 `permissions` 中补上 |

查看失败日志：Actions 页面 → 对应 run → 展开红色失败的 **Publish to npm** 步骤；日志被截断时点右上角 `... → View raw logs`。

CI 失败不会产生半成品版本（npm 单包发布是原子的），修正后重跑失败的 job 或换个新 tag 重发即可。

---

## 七、新包首次发布（一次性）

新增一个要发布的包时：

1. 包的 `package.json` 配好 `publishConfig`（access/registry/provenance，见第一节）、`files` 白名单和 `postversion` 钩子。
2. 首次版本**本地手动发布**（npm 规定新包名注册/首次 2FA 无法在 CI 绕过）：

   ```bash
   cd packages/<new-pkg>
   pnpm build
   pnpm publish --registry https://registry.npmjs.org/ --access public
   # 按提示输入 npm 账号 OTP
   ```

3. 发布成功后，在 npm 网站为新包配置 Trusted Publisher（仓库 `yscorecore/ys.knife.crud` + workflow `release.yml`）。
4. 之后该包的所有版本均由 CI 自动发布。

---

## 八、版本历史

| 版本 | 发布方式 | 说明 |
| --- | --- | --- |
| `0.0.1` | 本地手动 | 首批 5 个包 |
| `0.0.2` 起 | CI（Trusted Publisher） | 无需本地登录 |
| `0.0.3` | tag `v0.0.3` | 5 个包 |
| `0.0.4` | tag `v0.0.4` | 仅 taro（首个 taro 版本） |
| `0.0.5` | tag `v0.0.5` | 仅 taro（FilterItem 系列组件） |
| `0.0.5`（对齐） | tag `v0.0.5-full` | core/vue/element-plus/export-exceljs/import-exceljs 补发到 0.0.5 |
