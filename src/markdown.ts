import { marked, type Tokens } from "marked";

export const DEFAULT_CSS = `
:root {
  color-scheme: light;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.6;
  color: #24292f;
  background: #ffffff;
}

* {
  box-sizing: border-box;
}

body {
  max-width: 900px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem;
}

main {
  overflow-wrap: break-word;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  line-height: 1.25;
  margin: 1.5rem 0 0.75rem;
}

h1,
h2 {
  padding-bottom: 0.35rem;
  border-bottom: 1px solid #d0d7de;
}

p,
ul,
ol,
blockquote,
table,
pre {
  margin: 1rem 0;
}

a {
  color: #0969da;
}

img {
  max-width: 100%;
  height: auto;
}

blockquote {
  margin-left: 0;
  padding: 0.25rem 1rem;
  color: #57606a;
  border-left: 0.25rem solid #d0d7de;
}

code {
  padding: 0.15rem 0.35rem;
  font-size: 0.9em;
  background: #f6f8fa;
  border-radius: 0.3rem;
}

pre {
  padding: 1rem;
  overflow-x: auto;
  background: #f6f8fa;
  border-radius: 0.5rem;
}

pre code {
  padding: 0;
  background: transparent;
}

table {
  width: 100%;
  border-spacing: 0;
  border-collapse: collapse;
}

th,
td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border: 1px solid #d0d7de;
}

th {
  background: #f6f8fa;
}

hr {
  height: 1px;
  margin: 2rem 0;
  background: #d0d7de;
  border: 0;
}
`;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function sanitizeUrl(value: string): string {
  let normalized = value.trim().replace(/[\u0000-\u0020\u007f]+/g, "");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const decoded = decodeURIComponent(normalized);
      if (decoded === normalized) {
        break;
      }
      normalized = decoded;
    } catch {
      break;
    }
  }

  const hasProtocol = /^[a-z][a-z\d+.-]*:/i.test(normalized);
  const isAllowedProtocol = /^(?:https?|ftp|mailto|tel):/i.test(normalized);

  return hasProtocol && !isAllowedProtocol ? "#" : value;
}

const renderer = new marked.Renderer();
renderer.html = ({ text }: Tokens.HTML | Tokens.Tag): string => escapeHtml(text);

export function markdownToHtml(markdown: string): string {
  const result = marked.parse(markdown, {
    async: false,
    breaks: false,
    gfm: true,
    renderer,
    walkTokens: (token) => {
      if (token.type === "link" || token.type === "image") {
        token.href = sanitizeUrl(token.href);
      }
    },
  });

  if (typeof result !== "string") {
    throw new Error("Markdown 解析器返回了异步结果，但当前转换器只支持同步转换。");
  }

  return result;
}

export function markdownToHtmlDocument(markdown: string, title: string): string {
  const body = markdownToHtml(markdown);

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${DEFAULT_CSS}</style>
</head>
<body>
  <main class="markdown-body">
${body}
  </main>
</body>
</html>
`;
}

