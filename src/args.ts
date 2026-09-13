export interface CliOptions {
  inputPath: string;
  outputPath?: string;
  watch: boolean;
}

export type ParseResult =
  | { kind: "help" }
  | { kind: "run"; options: CliOptions };

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

export const USAGE = `用法:
  md2html <input.md> [-o <output.html>] [--watch]

选项:
  -o, --output <file>  指定输出 HTML 文件路径
  --watch              监听输入文件变化并自动重新转换
  -h, --help           显示帮助信息

示例:
  md2html README.md
  md2html README.md -o public/README.html
  md2html README.md --watch`;

export function parseArgs(argv: readonly string[]): ParseResult {
  const positional: string[] = [];
  let outputPath: string | undefined;
  let watch = false;
  let optionsTerminated = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (!optionsTerminated && (argument === "-h" || argument === "--help")) {
      return { kind: "help" };
    }

    if (!optionsTerminated && argument === "--") {
      optionsTerminated = true;
      continue;
    }

    if (!optionsTerminated && argument === "--watch") {
      watch = true;
      continue;
    }

    if (!optionsTerminated && (argument === "-o" || argument === "--output")) {
      const value = argv[index + 1];
      if (value === undefined || value === "") {
        throw new CliUsageError(`${argument} 后必须提供输出文件路径。`);
      }

      outputPath = value;
      index += 1;
      continue;
    }

    if (!optionsTerminated && (argument.startsWith("--output=") || argument.startsWith("-o="))) {
      const value = argument.slice(argument.indexOf("=") + 1);
      if (value === "") {
        throw new CliUsageError("--output 后必须提供输出文件路径。");
      }

      outputPath = value;
      continue;
    }

    if (!optionsTerminated && argument.startsWith("-")) {
      throw new CliUsageError(`未知选项: ${argument}`);
    }

    positional.push(argument);
  }

  if (positional.length === 0) {
    throw new CliUsageError("请提供一个 Markdown 输入文件。");
  }

  if (positional.length > 1) {
    throw new CliUsageError("只能提供一个 Markdown 输入文件。");
  }

  return {
    kind: "run",
    options: {
      inputPath: positional[0],
      outputPath,
      watch,
    },
  };
}
