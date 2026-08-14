# Cherry Studio 集成指南

> 将 Web Knowledge MCP 接入 Cherry Studio 桌面客户端，支持 Windows / macOS / Linux。

---

## 前置条件

| 依赖 | 版本要求 | 检查命令 |
|------|---------|---------|
| Node.js | ≥ 20 | `node -v` |
| pnpm | 最新 | `pnpm -v` |
| Playwright | Chromium | `npx playwright install chromium` |

---

## 1. 一键安装

根据你的操作系统，运行对应的 setup 脚本：

**Windows**（双击或在终端中运行）：
```
integrations\cherry-studio\setup.cmd
```

**macOS / Linux**：
```bash
chmod +x integrations/cherry-studio/setup.sh
./integrations/cherry-studio/setup.sh
```

脚本会自动完成：
- 安装 Node.js 依赖
- 生成 Prisma 客户端
- 创建 SQLite 数据库
- 编译 TypeScript
- 下载 Chromium 浏览器

---

## 2. 配置 Cherry Studio

### 2.1 获取绝对路径

MCP 客户端的启动目录不固定，`node.exe` 和 `launcher.mjs` 都建议使用绝对路径。

**Windows：**在能够正常运行 Node.js 的 CMD 或 PowerShell 中执行：

```cmd
node -p "process.execPath"
```

输出示例：

```text
C:\Program Files\nodejs\node.exe
```

如果使用 fnm，请使用 `process.execPath` 返回的、位于 `node-versions` 下的长期有效路径；不要复制 `fnm_multishells` 临时目录中的路径。

项目启动器示例：

```text
D:\code\Web Knowledge MCP\integrations\cherry-studio\launcher.mjs
```

**macOS / Linux：**分别执行 `which node` 和 `pwd`，再拼接启动器路径。

### 2.2 Cherry Studio 图形界面填写方式

打开 Cherry Studio → **设置** → **MCP 服务器** → **添加服务器**，然后填写：

| 字段 | Windows 示例 | macOS / Linux 示例 |
|------|--------------|--------------------|
| 名称 | `Web Knowledge MCP` | `Web Knowledge MCP` |
| 类型 | `stdio` | `stdio` |
| 命令 | `C:\Program Files\nodejs\node.exe` | `/usr/bin/node` |
| 参数 | `D:\code\Web Knowledge MCP\integrations\cherry-studio\launcher.mjs` | `/home/user/web-knowledge-mcp/integrations/cherry-studio/launcher.mjs` |

> **图形界面输入规则：**
>
> - “命令”和“参数”是两个独立输入框，不要把它们合并成一整条命令。
> - 参数框只填写一条启动器路径，不要填写 JSON 数组的 `[]`，也不要额外添加双引号。
> - Windows 图形界面可以直接使用 `D:\目录\文件`，无需把 `\` 写成 `\\`。
> - 也可以使用 `D:/目录/文件`，但不能使用 Git Bash/MSYS 的 `/d/目录/文件` 格式。
> - 路径中允许包含空格；参数框会将整行作为一个参数，不需要手工转义空格。

### 2.3 JSON 配置填写方式

JSON 与图形界面的规则不同：JSON 字符串中的反斜杠必须写成 `\\`。以下配置可直接复制后修改路径：

```json
{
  "mcpServers": {
    "web-knowledge-mcp": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "D:\\code\\Web Knowledge MCP\\integrations\\cherry-studio\\launcher.mjs"
      ]
    }
  }
}
```

Windows JSON 也可以使用正斜杠，从而避免反斜杠转义：

```json
{
  "mcpServers": {
    "web-knowledge-mcp": {
      "command": "C:/Program Files/nodejs/node.exe",
      "args": [
        "D:/code/Web Knowledge MCP/integrations/cherry-studio/launcher.mjs"
      ]
    }
  }
}
```

**常见错误示例：**

```text
/d/code/Web Knowledge MCP/integrations/cherry-studio/launcher.mjs
```

这是 Git Bash/MSYS 路径，不是 Windows 原生路径；应改为 `D:\code\...`（图形界面）或 `D:\\code\\...`（JSON）。

**macOS / Linux JSON 示例：**

```json
{
  "mcpServers": {
    "web-knowledge-mcp": {
      "command": "/usr/bin/node",
      "args": [
        "/home/user/web-knowledge-mcp/integrations/cherry-studio/launcher.mjs"
      ]
    }
  }
}
```

---

## 3. 验证

配置完成后，Cherry Studio 的 MCP 服务器列表中应显示 `Web Knowledge MCP` 为 **已连接** 状态。

可用工具：
- `onboard_site` — 学习新网站
- `crawl_site` — 采集文档
- `list_sites` — 列出已配置网站
- `remove_site` — 移除网站配置

---

## 4. 跨平台注意事项

### 4.1 Node.js 路径

Cherry Studio 不一定继承终端中的 `PATH`，因此终端里能够执行 `node`，并不代表 Cherry Studio 也能找到它。

- **Windows**：优先使用 `node -p "process.execPath"` 返回的 `node.exe` 绝对路径；图形界面直接填单反斜杠路径，JSON 中反斜杠必须写成 `\\`。
- **Windows + fnm**：不要使用会随终端会话变化的 `fnm_multishells` 路径，应使用 `node-versions` 下的实际 `node.exe`。
- **macOS (Homebrew)**：使用 `/opt/homebrew/bin/node` 或 `/usr/local/bin/node`。
- **Linux**：使用 `/usr/bin/node` 或 `which node` 的结果。
- 如果修改了系统 `PATH`，必须完全退出并重新打开 Cherry Studio，旧进程不会自动获得新环境变量。

### 4.2 Playwright 浏览器

Playwright 的 Chromium 浏览器二进制文件位于：
- **Windows**：`%USERPROFILE%\AppData\Local\ms-playwright\`
- **macOS**：`~/Library/Caches/ms-playwright/`
- **Linux**：`~/.cache/ms-playwright/`

首次部署需运行 `npx playwright install chromium`。Linux 还需要系统依赖：
```bash
npx playwright install-deps chromium   # 可能需要 sudo
```

### 4.3 数据库路径

`launcher.mjs` 自动将 `DATABASE_URL` 设置为项目的 `data/web-knowledge.db` 绝对路径，不受 Cherry Studio 启动目录影响。

### 4.4 文件权限

- **macOS / Linux**：确保 `setup.sh` 有执行权限（`chmod +x`）
- **Windows**：`.cmd` 文件可直接双击运行

---

## 5. 故障排除

| 症状 | 可能原因 | 解决 |
|------|---------|------|
| MCP 服务器显示"已断开" | 项目未编译 | 运行 `pnpm build` |
| 连接失败 | `DATABASE_URL` 未设置 | 检查 `launcher.mjs` 中路径是否正确 |
| Playwright 下载超时 (ETIMEDOUT) | CDN 被墙 / 网络不通 | 使用国内镜像，见下方 |
| Playwright 报错 | 浏览器未安装 | 运行 `npx playwright install chromium` |
| Linux 上 Chromium 无法启动 | 缺少系统依赖 | 运行 `npx playwright install-deps chromium` |
| 日志中 `'node' 不是内部或外部命令` | Cherry Studio 找不到 Node.js | 命令框改填 `node -p "process.execPath"` 返回的绝对路径，然后重启 Cherry Studio |
| Windows 参数以 `/d/...` 开头 | 错用了 Git Bash/MSYS 路径 | 图形界面改成 `D:\...` 或 `D:/...`；JSON 改成 `D:\\...` 或 `D:/...` |
| Windows 中文错误信息显示乱码 | CMD 使用 GBK，而 Cherry Studio 按 UTF-8 解码 | 乱码通常只是底层错误信息；先按本表修复路径或命令问题 |
| `pnpm` 未安装 | — | `npm install -g pnpm` |

### Playwright 下载超时（国内用户）

`cdn.playwright.dev` 在国内可能无法直接访问，导致下载浏览器的 .zip 文件超时。

**解决方法**：设置 Playwright 国内镜像后再安装：

**Windows（命令提示符）**：
```cmd
set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/
npx playwright install chromium
```

**Windows（PowerShell）**：
```powershell
$env:PLAYWRIGHT_DOWNLOAD_HOST="https://npmmirror.com/mirrors/playwright/"
npx playwright install chromium
```

**macOS / Linux**：
```bash
export PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/
npx playwright install chromium
```

> 其他可选镜像：`https://registry.npmmirror.com/-/binary/playwright/`

---

## 6. 进阶：使用 npx（需发布到 npm）

如果你的项目发布到了 npm，可以简化为：

```json
{
  "mcpServers": {
    "web-knowledge-mcp": {
      "command": "npx",
      "args": ["-y", "web-knowledge-mcp"],
      "env": {
        "DATABASE_URL": "file:./data/web-knowledge.db"
      }
    }
  }
}
```

`npx` 跨平台一致，无需绝对路径。但需要配合 `package.json` 的 `bin` 字段和 `main` 入口。