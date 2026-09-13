import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { CliUsageError, parseArgs } from "../dist/args.js";
import { convertFile, getDefaultOutputPath } from "../dist/converter.js";
import { watchInput } from "../dist/watcher.js";

const execFileAsync = promisify(execFile);
const cliPath = resolve("dist", "cli.js");

async function withTempDirectory(callback) {
  const directory = await mkdtemp(join(tmpdir(), "md2html-test-"));
  try {
    return await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function waitFor(predicate, timeout = 4000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  }
  throw new Error("等待异步条件超时。");
}

function runCli(args, cwd) {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

test("parses conversion options", () => {
  assert.deepEqual(parseArgs(["input.md", "-o", "output.html"]), {
    kind: "run",
    options: {
      inputPath: "input.md",
      outputPath: "output.html",
      watch: false,
    },
  });

  assert.deepEqual(parseArgs(["--watch", "input.md"]), {
    kind: "run",
    options: {
      inputPath: "input.md",
      outputPath: undefined,
      watch: true,
    },
  });

  assert.deepEqual(parseArgs(["input.md", "--output=output.html"]), {
    kind: "run",
    options: {
      inputPath: "input.md",
      outputPath: "output.html",
      watch: false,
    },
  });

  assert.deepEqual(parseArgs(["--help"]), { kind: "help" });
});

test("rejects invalid command line arguments", () => {
  assert.throws(() => parseArgs([]), CliUsageError);
  assert.throws(() => parseArgs(["input.md", "--unknown"]), CliUsageError);
  assert.throws(() => parseArgs(["input.md", "-o"]), CliUsageError);
  assert.throws(() => parseArgs(["first.md", "second.md"]), CliUsageError);
});

test("derives the default HTML path from Markdown paths", () => {
  assert.equal(getDefaultOutputPath(join("docs", "input.md")), join("docs", "input.html"));
  assert.equal(getDefaultOutputPath(join("docs", "input.MARKDOWN")), join("docs", "input.html"));
  assert.equal(getDefaultOutputPath(join("docs", "README")), join("docs", "README.html"));
});

test("converts basic Markdown and embeds the default style", async () => {
  await withTempDirectory(async (directory) => {
    const inputPath = join(directory, "input.md");
    const outputPath = join(directory, "nested", "output.html");
    await writeFile(
      inputPath,
      [
        "# Hello",
        "",
        "A **paragraph** with a [link](https://example.com).",
        "",
        "- one",
        "- two",
        "",
        "```ts",
        "const answer = 42;",
        "```",
        "",
        "![alt text](image.png)",
        "",
        "<script>alert('unsafe')</script>",
        "",
      ].join("\n"),
      "utf8",
    );

    await convertFile({ inputPath, outputPath });
    const html = await readFile(outputPath, "utf8");

    assert.match(html, /<!doctype html>/i);
    assert.match(html, /<h1[^>]*>Hello<\/h1>/);
    assert.match(html, /<strong>paragraph<\/strong>/);
    assert.match(html, /<a href="https:\/\/example\.com">link<\/a>/);
    assert.match(html, /<ul>[\s\S]*<li>one<\/li>[\s\S]*<li>two<\/li>[\s\S]*<\/ul>/);
    assert.match(html, /<code class="language-ts">const answer = 42;\s*<\/code>/);
    assert.match(html, /<img src="image\.png" alt="alt text">/);
    assert.match(html, /<style>[\s\S]*body[\s\S]*max-width/);
    assert.match(html, /&lt;script&gt;alert\(&#39;unsafe&#39;\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>alert\('unsafe'\)<\/script>/);
  });
});

test("rewrites unsafe link and image protocols", async () => {
  await withTempDirectory(async (directory) => {
    const inputPath = join(directory, "unsafe.md");
    const outputPath = join(directory, "unsafe.html");
    await writeFile(inputPath, "[bad](javascript:alert(1))\n\n![bad](data:text/html,alert(1))\n", "utf8");

    await convertFile({ inputPath, outputPath });
    const html = await readFile(outputPath, "utf8");

    assert.doesNotMatch(html, /(?:javascript|data):/i);
    assert.match(html, /<a href="#">bad<\/a>/);
    assert.match(html, /<img src="#" alt="bad">/);
  });
});
test("creates parent directories and rejects input/output collisions", async () => {
  await withTempDirectory(async (directory) => {
    const inputPath = join(directory, "input.md");
    await writeFile(inputPath, "# Title\n", "utf8");

    const outputPath = join(directory, "deep", "nested", "input.html");
    await convertFile({ inputPath, outputPath });
    assert.match(await readFile(outputPath, "utf8"), /<h1[^>]*>Title<\/h1>/);

    await assert.rejects(
      () => convertFile({ inputPath, outputPath: inputPath }),
      /输入文件和输出文件不能是同一个文件/,
    );
  });
});

test("converts using the CLI and the default output path", async () => {
  await withTempDirectory(async (directory) => {
    const inputPath = join(directory, "note.md");
    await writeFile(inputPath, "# From CLI\n", "utf8");

    const { stdout } = await runCli([inputPath], directory);
    const outputPath = join(directory, "note.html");
    const html = await readFile(outputPath, "utf8");

    assert.match(stdout, /已转换/);
    assert.match(html, /From CLI/);
  });
});

test("watch mode reconverts after the input file changes", async () => {
  await withTempDirectory(async (directory) => {
    const inputPath = join(directory, "watched.md");
    const outputPath = join(directory, "watched.html");
    await writeFile(inputPath, "# Before\n", "utf8");
    await convertFile({ inputPath, outputPath });

    const successes = [];
    const errors = [];
    const handle = watchInput(
      { inputPath, outputPath },
      {
        onSuccess: (result) => successes.push(result),
        onConversionError: (error) => errors.push(error),
      },
    );

    try {
      await writeFile(inputPath, "# After\n\nUpdated content\n", "utf8");
      await waitFor(async () => (await readFile(outputPath, "utf8")).includes("Updated content"));
    } finally {
      handle.close();
      await handle.closed;
    }

    assert.equal(errors.length, 0);
    assert.ok(successes.length >= 1);
  });
});

