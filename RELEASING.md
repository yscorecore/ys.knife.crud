# 发布流程（Releasing）

本仓库是 pnpm monorepo，5 个库包发布到 npm：

| 包名 | 路径 |
| --- | --- |
| `@ys-knife-crud/core` | `packages/core` |
| `@ys-knife-crud/vue` | `packages/vue` |
| `@ys-knife-crud/element-plus` | `packages/element-plus` |
| `@ys-knife-crud/export-exceljs` | `packages/export-exceljs` |
| `@ys-knife-crud/import-exceljs` | `packages/import-exceljs` |

`@ys-knife-crud/element-plus-demo` 是私有 demo，不发布。

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

CI 的发布命令是 `pnpm -r publish --no-git-checks`：private 包自动跳过，**已发布过的版本自动跳过**，`workspace:*` 依赖发布时自动替换为具体版本号。

---

## 二、发布前校验

在仓库根目录执行（改动涉及 UI 包时两项都要跑）：

```bash
pnpm -r --filter "!@ys-knife-crud/element-plus-demo" run typecheck
pnpm -r --filter "!@ys-knife-crud/element-plus-demo" run build
```

全部通过后再发版。

---

## 三、标准发布流程

### 方式 A：全量发布（推荐，打 `v*` tag）

适用于多个包一起发版（即使只有部分包改了版本号也行，CI 会自动跳过版本未变的包）。

1. 修改需要发版的包的 `package.json` 版本号（遵守语义化版本）：

   ```bash
   # 例如 core/vue/element-plus 发 0.0.3
   ```

   手工改版本号，或在包目录执行 `pnpm version patch`（见方式 B 的说明）。

2. 提交版本变更：

   ```bash
   git add packages/*/package.json
   git commit -m "chore(release): v0.0.3"
   ```

3. 打**带注释** tag 并推送（触发 CI）：

   ```bash
   git tag -a v0.0.3 -m "v0.0.3"
   git push origin main
   git push origin v0.0.3
   ```

4. 在 https://github.com/yscorecore/ys.knife.crud/actions 确认 Release workflow 成功。

5. 验证 npm（新版本同步可能有几十秒到几分钟延迟）：

   ```powershell
   foreach ($p in @("@ys-knife-crud/core","@ys-knife-crud/vue","@ys-knife-crud/element-plus","@ys-knife-crud/export-exceljs","@ys-knife-crud/import-exceljs")) {
     (Invoke-RestMethod "https://registry.npmjs.org/$p").'dist-tags'.latest
   }
   ```

### 方式 B：单包发布（打 `@ys-knife-crud/<pkg>@x.y.z` tag）

只发某一个包时，在**该包目录**执行：

```bash
cd packages/core
pnpm version patch
```

各包 `.npmrc` 中的 `tag-version-prefix` 决定 tag 前缀（如 `@ys-knife-crud/core@`），包的 `postversion` 钩子（`git push && git push --tags`）会自动提交版本号变更并推送 tag 触发 CI。

> 注意：包之间存在依赖链 `core → vue → element-plus`。若改动涉及多个有依赖关系的包，优先用方式 A 全量发布（CI 按拓扑顺序发布），避免下游包引用到尚未发布的上游版本。

---

## 四、分步补发：同一版本多个包分批上

场景：一个 `v0.0.x` 版本中，部分包先发成功，剩余包随后补发（v0.0.2 发布时 core/vue/element-plus 与两个 exceljs 包就是分两批发的）。

做法：**移动同一个 version tag 指向包含新包版本号的新提交**，CI 会自动跳过已发布的包、只发新包：

```bash
# 1. 修改剩余包的 package.json 版本号并提交
git add packages/export-exceljs/package.json packages/import-exceljs/package.json
git commit -m "chore(release): export-exceljs@0.0.2 import-exceljs@0.0.2"

# 2. 删除旧 tag（本地 + 远端），在新提交上重建并推送
git tag -d v0.0.2
git push origin :refs/tags/v0.0.2
git tag -a v0.0.2 -m "v0.0.2"
git push origin main
git push origin v0.0.2
```

CI 成功后到 npm 验证补发的包即可。

---

## 五、故障排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `npm error code EOTP`（requires a one-time password） | CI 仍在用 Publish 类型 NPM_TOKEN，2FA 强制 OTP | 确认 publish 步骤没有注入 `NODE_AUTH_TOKEN`/`_authToken`，改走 Trusted Publisher |
| `npm error code E404 ... is not in this registry` | 匿名发布：`publishConfig.provenance` 缺失，或 Node/npm 版本过低未触发 OIDC 认证 | 补齐 `provenance: true`；CI 用 Node 24 |
| 日志有 `Signed provenance statement` 但仍 `E404` | provenance 签名成功 ≠ npm 认证成功；旧版 npm 不走 Trusted Publisher | 升级 CI Node 到 24 |
| CI 显示成功但 npm 查不到新版本 | registry 同步延迟，或该版本被 pnpm 跳过 | 等待 1–3 分钟重查；展开 CI 的 Publish 步骤确认有 `+ @scope/pkg@x.y.z`（真发布）而非跳过 |
| `--provenance` 报权限错误 | workflow 缺少 `id-token: write` | 在 release.yml 的 `permissions` 中补上 |

查看失败日志：Actions 页面 → 对应 run → 展开红色失败的 **Publish to npm** 步骤；日志被截断时点右上角 `... → View raw logs`。

CI 失败不会产生半成品版本（npm 单包发布是原子的），修正后删除远端 tag 重新打、或直接重跑失败的 job 即可。

---

## 六、新包首次发布（一次性）

新增一个要发布的包时：

1. 包的 `package.json` 配好 `publishConfig`（access/registry/provenance，见第一节）和 `files` 白名单。
2. 首次版本**本地手动发布**（npm 规定新包名注册/首次 2FA 无法在 CI 绕过）：

   ```bash
   cd packages/<new-pkg>
   pnpm build
   pnpm publish --registry https://registry.npmjs.org/ --access public
   # 按提示输入 npm 账号 OTP
   ```

3. 发布成功后，在 npm 网站为新包配置 Trusted Publisher（仓库 `yscorecore/ys.knife.crud` + workflow `release.yml`）。
4. 之后该包的所有版本均由 CI 自动发布。

历史版本说明：`0.0.1` 为本地手动首发；自 `0.0.2` 起 5 个包全部通过 Trusted Publisher CI 发布。
