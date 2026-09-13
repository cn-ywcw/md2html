# md2html-cli

[![CI](https://github.com/cn-ywcw/md2html/actions/workflows/ci.yml/badge.svg)](https://github.com/cn-ywcw/md2html/actions/workflows/ci.yml)

一个使用 TypeScript 编写的 Markdown 转 HTML 命令行工具。

## 功能

- 支持标题、段落、列表、引用、表格、代码块、链接、图片等常见 Markdown 语法
- 生成带简洁默认样式的独立 HTML 文件
- 未指定输出文件时自动将 `.md` / `.markdown` 扩展名替换为 `.html`
- 支持 `--watch` 监听 Markdown 文件变化并自动重新生成 HTML
- 默认转义 Markdown 中的原始 HTML 标签
- 会将 `javascript:`、`data:` 等不安全链接协议改写为 `#`

## 安装与构建

```bash
npm install
npm run build
```

在本地全局注册命令：

```bash
npm link
```

## 使用方法

转换为默认输出文件：

```bash
md2html input.md
```

这会生成同目录下的 `input.html`。

指定输出文件：

```bash
md2html input.md -o output.html
```

监听文件变化：

```bash
md2html input.md --watch
```

启动监听时会先执行一次转换。之后每次保存输入文件都会自动重新生成 HTML，按 `Ctrl+C` 退出监听。

也可以直接运行编译后的入口：

```bash
node dist/cli.js input.md -o output.html
```

查看帮助：

```bash
md2html --help
```

## 开发

```bash
npm run build
npm test
```

输出 HTML 是完整的独立文档，默认样式直接内嵌在 `<style>` 标签中，不需要额外的 CSS 文件。

## CI 与发布

### CI 检查

每次向 `main` 分支推送代码或提交 Pull Request 时，GitHub Actions 都会运行检查：

1. 使用 Node.js 20 安装锁定的依赖
2. 执行 `npm run build`，确认 TypeScript 可以编译
3. 执行全部 Node.js 测试

工作流文件位于 `.github/workflows/ci.yml`，检查任务名称为 `check`。

### 发布

发布通过推送符合 `vX.Y.Z` 格式的 Git tag 触发。发布工作流会先安装依赖、编译并运行测试，然后创建 GitHub Release，并上传包含编译后 `dist/` 目录的 npm 包：

```text
md2html-cli-X.Y.Z.tgz
```

发布 tag 必须与 `package.json` 中的版本一致。首次发布当前版本时，可以执行：

```bash
git tag v1.0.0
git push origin v1.0.0
```

后续发布建议使用 `npm version` 同步更新 `package.json` 和 `package-lock.json`，并自动创建 tag：

```bash
npm version patch   # 或 npm version minor / npm version major
git push origin main --follow-tags
```

发布说明会根据上一个 release/tag 之后的提交自动生成。使用 Conventional Commits 前缀可以将内容归类为新增功能和 Bug 修复：

```text
feat: add a new option
fix: handle an invalid input path
```

发布工作流文件位于 `.github/workflows/release.yml`，说明生成脚本位于 `scripts/generate-release-notes.mjs`。
