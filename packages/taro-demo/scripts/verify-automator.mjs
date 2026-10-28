/**
 * 微信小程序自动化验证脚本（miniprogram-automator）
 *
 * 前置条件：
 * 1. 已安装微信开发者工具，并在 设置→安全设置 中开启「服务端口」
 * 2. 已执行 pnpm --filter @ys-knife-crud/taro-demo build:weapp
 *
 * 用法：pnpm --filter @ys-knife-crud/taro-demo exec node scripts/verify-automator.mjs
 *
 * 验证点：
 * 1. 首屏自动加载（不足一屏时连填）
 * 2. 「手动加载下一页」追加 10 条
 * 3. 勾选第一项 → 工具栏计数 + 名字
 * 4. 全选已加载 → 计数 = 已加载条数；清空 → 归 0
 */
import automator from "miniprogram-automator";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const cliPath =
  process.env.WECHAT_CLI ??
  "C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat";
const projectPath = process.cwd();
const screenshotPath = path.join(os.tmpdir(), "taro-verify.png");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("launching WeChat DevTools automator...");
  const miniProgram = await automator.launch({
    cliPath,
    projectPath,
    timeout: 60000,
  });

  try {
    let page = await miniProgram.currentPage();
    if (!page || !page.path.includes("pages/index")) {
      page = await miniProgram.reLaunch("/pages/index/index");
    }
    await page.waitFor(1500);

    // 1. 首屏加载数量（首屏不足一屏会自动连填，可能 > 10）
    let items = await page.$$(".yk-infinite-list__item");
    const firstLoad = items.length;
    console.log(`[1] 首屏加载: ${firstLoad} 项 (>=10 即通过)`);
    if (firstLoad < 10) throw new Error(`首屏应加载至少 10 项，实际 ${firstLoad}`);

    // 2. 手动加载下一页 → 追加 10 条
    const buttons = await page.$$(".btn-row .btn");
    if (buttons.length < 5) throw new Error(`工具栏按钮应 5 个，实际 ${buttons.length}`);
    await buttons[1].tap();
    await page.waitFor(900);
    items = await page.$$(".yk-infinite-list__item");
    const afterLoad = items.length;
    console.log(`[2] 手动加载下一页: ${firstLoad} → ${afterLoad}`);
    if (afterLoad < firstLoad + 10) throw new Error(`追加后应 >= ${firstLoad + 10} 项，实际 ${afterLoad}`);

    // 3. 勾选第一项 → 工具栏计数
    const checkbox = await page.$(".yk-infinite-list__item-checkbox");
    await checkbox.tap();
    await page.waitFor(400);
    const counter = await page.$(".selected-count");
    const counterText = await counter.text();
    console.log(`[3] 勾选第一项后工具栏: "${counterText}"`);
    if (!counterText.includes("已选 1 项：User1")) throw new Error(`选中计数异常: ${counterText}`);

    // 4. 全选已加载 → 计数 = 已加载条数；清空 → 0
    const freshButtons = await page.$$(".btn-row .btn");
    await freshButtons[2].tap(); // 全选已加载
    await page.waitFor(400);
    const allText = await (await page.$(".selected-count")).text();
    console.log(`[4] 全选已加载: "${allText}"`);
    if (!allText.includes(`已选 ${afterLoad} 项`)) throw new Error(`全选计数异常: ${allText}`);

    const freshButtons2 = await page.$$(".btn-row .btn");
    await freshButtons2[4].tap(); // 清空
    await page.waitFor(400);
    const clearedText = await (await page.$(".selected-count")).text();
    console.log(`[5] 清空: "${clearedText}"`);
    if (!clearedText.includes("已选 0 项")) throw new Error(`清空后计数异常: ${clearedText}`);

    await miniProgram.screenshot({ path: screenshotPath });
    console.log(`截图: ${screenshotPath}`);
    console.log("ALL PASS");
  } finally {
    await miniProgram.close();
  }
}

main().catch((err) => {
  console.error("VERIFY FAILED:", err.message);
  console.error(
    "提示：若为连接失败，请确认微信开发者工具已安装于默认路径（或设置 WECHAT_CLI 环境变量），且 设置→安全设置→服务端口 已开启。",
  );
  process.exit(1);
});
