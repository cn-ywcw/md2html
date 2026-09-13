# md2html-cli

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
