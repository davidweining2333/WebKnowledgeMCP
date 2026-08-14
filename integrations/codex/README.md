# Codex 接入 Web Knowledge MCP

> 本文说明如何让 Codex 使用 Web Knowledge MCP。支持 Windows、macOS 和 Linux。
>
> 仓库地址：<https://github.com/davidweining2333/WebKnowledgeMCP>

## 你要做什么

Codex 需要一个可以通过 stdio 启动的 MCP Server。本项目的启动入口是：

```text
integrations/cherry-studio/launcher.mjs
```

启动器会自动：

- 定位仓库根目录
- 设置 SQLite 数据库绝对路径
- 启动 `dist/main.js`
- 透传 MCP 的 stdin/stdout

因此 Codex 配置的是启动器，不是直接调用 `pnpm`，也不要把仓库 URL 当成 MCP 的 `url` 字段。

## 方案 A：让 Codex Agent 自动下载并接入

将下面这段话完整发送给 Codex（把 `<目录>` 替换为你希望保存项目的位置）：

```text
请帮我接入 Web Knowledge MCP。

仓库地址：https://github.com/davidweining2333/WebKnowledgeMCP.git
安装目录：<目录>/WebKnowledgeMCP

请按以下步骤执行：
1. 检查 node、pnpm 和 git；Node.js 必须 >= 20。
2. 如果安装目录不存在，执行 git clone https://github.com/davidweining2333/WebKnowledgeMCP.git <目录>/WebKnowledgeMCP；如果已存在则进入该目录，不要覆盖我的本地修改。
3. 在仓库目录执行 pnpm install。
4. 执行 pnpm prisma:generate 和 pnpm prisma:push。
5. 执行 pnpm build。
6. 执行 npx playwright install chromium；如果下载超时，先询问我是否使用 PLAYWRIGHT_DOWNLOAD_HOST 镜像，不要静默改变网络配置。
7. 找到 node 的绝对路径：Windows 执行 node -p "process.execPath"，macOS/Linux 执行 which node。
8. 使用 Codex 的 MCP 配置命令，把 integrations/cherry-studio/launcher.mjs 注册为 stdio MCP Server，名称为 web-knowledge-mcp。
9. 验证 MCP 已连接，并调用 list_sites 测试；不要在没有确认的情况下调用 onboard_site。
10. 最后告诉我实际安装目录、node 绝对路径、注册命令和验证结果。

注意：Windows 使用原生路径，例如 D:\\code\\WebKnowledgeMCP\\integrations\\cherry-studio\\launcher.mjs；不要使用 /d/code/... 这种 Git Bash/MSYS 路径。
```

### 自动化操作的安全边界

Codex 在执行 `git clone`、`pnpm install`、Playwright 浏览器下载和修改 MCP 配置前，可能会要求确认。这是正常的；这些操作会下载代码、依赖和浏览器文件。不要把 API Key、Cookie 或密码放进仓库或聊天内容。

## 方案 B：手动安装后注册

### 1. 下载和构建

```bash
git clone https://github.com/davidweining2333/WebKnowledgeMCP.git
cd WebKnowledgeMCP
pnpm install
pnpm prisma:generate
pnpm prisma:push
pnpm build
npx playwright install chromium
```

如果 Playwright 下载超时，可在当前终端临时设置镜像后重试：

```powershell
$env:PLAYWRIGHT_DOWNLOAD_HOST="https://npmmirror.com/mirrors/playwright/"
npx playwright install chromium
```

```bash
export PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/
npx playwright install chromium
```

### 2. 用 Codex 命令注册

Codex CLI 的通用 stdio 注册形式是：

```bash
codex mcp add web-knowledge-mcp -- node /绝对路径/WebKnowledgeMCP/integrations/cherry-studio/launcher.mjs
```

Windows 示例（CMD / PowerShell）：

```powershell
codex mcp add web-knowledge-mcp -- "C:\Program Files\nodejs\node.exe" "D:\code\WebKnowledgeMCP\integrations\cherry-studio\launcher.mjs"
```

macOS / Linux 示例：

```bash
codex mcp add web-knowledge-mcp -- /usr/bin/node /home/user/WebKnowledgeMCP/integrations/cherry-studio/launcher.mjs
```

这里的命令和参数是分开的：

- `--` 后面的第一个参数是 Node 可执行文件
- 第二个参数是启动器绝对路径
- Windows CMD/PowerShell 使用 `C:\...` 或 `C:/...`
- 不要使用 `/d/...`；那是 Git Bash/MSYS 格式

如果你的 Node 是 fnm 管理的，先执行：

```powershell
node -p "process.execPath"
```

将输出的长期有效 `node.exe` 路径填入 `codex mcp add`，不要使用 `fnm_multishells` 临时目录中的路径。

### 3. 检查和移除

```bash
codex mcp list
codex mcp get web-knowledge-mcp
codex mcp remove web-knowledge-mcp
```

修改配置后重启 Codex 会话，确保新 MCP 配置被加载。

## 方案 C：直接编辑 Codex 配置文件

如果不使用命令行，也可以在 Codex 的 `config.toml` 中加入：

```toml
[mcp_servers.web-knowledge-mcp]
command = "node"
args = ["/absolute/path/WebKnowledgeMCP/integrations/cherry-studio/launcher.mjs"]
```

Windows TOML 示例：

```toml
[mcp_servers.web-knowledge-mcp]
command = "C:\\Program Files\\nodejs\\node.exe"
args = ["D:\\code\\WebKnowledgeMCP\\integrations\\cherry-studio\\launcher.mjs"]
```

注意：TOML 字符串中的反斜杠也需要转义为 `\\`；使用正斜杠可以减少转义问题：

```toml
[mcp_servers.web-knowledge-mcp]
command = "C:/Program Files/nodejs/node.exe"
args = ["D:/code/WebKnowledgeMCP/integrations/cherry-studio/launcher.mjs"]
```

不同版本 Codex 的配置文件位置可能不同，优先使用 `codex mcp add`，它会写入当前 Codex 使用的配置。

## 如何使用 MCP

连接成功后，可以直接对 Codex 这样说：

```text
使用 web-knowledge-mcp 的 list_sites，告诉我当前已经配置了哪些网站。
```

学习一个网站：

```text
使用 web-knowledge-mcp 的 onboard_site 学习 https://example.com。
识别并保存网站的搜索入口、关键词字段、起止日期字段、提交按钮、结果列表、详情页和附件访问流程。
如果网站要求登录或出现验证码，请停止并告诉我，不要尝试绕过验证。
```

按自然语言需求执行已学习的查询并摘要：

```text
使用 web-knowledge-mcp 查询已经学习的 ferc 网站：
主题是 energy storage，时间范围是 2025-01-01 到 2025-06-30，最多 20 条。
调用 crawl_site 时传入 site、query、from、to 和 limit。
读取返回的网页正文以及 PDF/DOC/DOCX 附件文本，按主题归纳关键信息，给出中文摘要，并附来源 URL。
```

这里由 Codex 把自然语言中的主题和日期解析为 MCP 参数；MCP 负责复放站点交互、抓取和解析，Codex 负责摘要、翻译与报告生成。

删除配置：

```text
使用 web-knowledge-mcp 的 remove_site 删除 openai。
```

可用工具：

| 工具 | 用途 |
|---|---|
| `onboard_site` | 用 Playwright 探索网站并保存可复放的参数化查询工作流，返回 `siteId` |
| `crawl_site` | 传入 `site/query/from/to/limit`，复放工作流并返回网页和附件正文 |
| `list_sites` | 查看已经学习的网站 |
| `remove_site` | 删除网站配置 |

## 常见问题

### `node is not recognized` / `'node' 不是内部或外部命令`

Codex 启动 MCP 时不一定继承你的终端 PATH。使用 `node -p "process.execPath"` 找到绝对路径，然后重新注册：

```bash
codex mcp remove web-knowledge-mcp
codex mcp add web-knowledge-mcp -- <node绝对路径> <launcher绝对路径>
```

### `MCP error -32000: Connection closed`

这表示 MCP 子进程启动后立即退出，按顺序检查：

1. `node` 路径是否真实存在；
2. 启动器路径是否真实存在；
3. 是否执行过 `pnpm build`；
4. 是否执行过 `pnpm prisma:generate`；
5. 是否安装了 Chromium；
6. 直接运行启动器查看原始 stderr：

```bash
node /绝对路径/WebKnowledgeMCP/integrations/cherry-studio/launcher.mjs
```

stdio 模式下不要在服务端向 stdout 打印普通日志，否则会破坏 MCP JSON 通信；日志应输出到 stderr。

### 网站被反爬或要求登录

Playwright 只能提供真实浏览器执行环境，不能保证绕过所有验证码、登录墙或访问限制。遇到验证码、登录或明确的访问拒绝时，应使用合法授权的账号/网络，并按照提示人工完成验证。
