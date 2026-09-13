#!/usr/bin/env node
import process from "node:process";
import { CliUsageError, USAGE, parseArgs } from "./args.js";
import { convertFile } from "./converter.js";
import { watchInput } from "./watcher.js";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatPath(path: string): string {
  return path.replaceAll("\\", "/");
}

function logSuccess(inputPath: string, outputPath: string): void {
  console.log(`已转换: ${formatPath(inputPath)} -> ${formatPath(outputPath)}`);
}

async function run(): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof CliUsageError) {
      console.error(`错误: ${error.message}`);
      console.error(USAGE);
      return 1;
    }
    throw error;
  }

  if (parsed.kind === "help") {
    console.log(USAGE);
    return 0;
  }

  const { options } = parsed;
  let result;
  try {
    result = await convertFile(options);
  } catch (error) {
    console.error(`转换失败: ${getErrorMessage(error)}`);
    return 1;
  }

  logSuccess(result.inputPath, result.outputPath);

  if (!options.watch) {
    return 0;
  }

  let handle;
  try {
    handle = watchInput(options, {
      onSuccess: (conversion) => logSuccess(conversion.inputPath, conversion.outputPath),
      onConversionError: (error) => console.error(`自动转换失败: ${getErrorMessage(error)}`),
      onWatchError: (error) => console.error(`监听失败: ${getErrorMessage(error)}`),
    });
  } catch (error) {
    console.error(`启动监听失败: ${getErrorMessage(error)}`);
    return 1;
  }

  const stop = (): void => {
    console.log("已停止监听。");
    handle.close();
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  await handle.closed;
  return 0;
}

try {
  const exitCode = await run();
  process.exitCode = exitCode;
} catch (error) {
  console.error(`发生未处理错误: ${getErrorMessage(error)}`);
  process.exitCode = 1;
}
