import { basename, dirname, extname, resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { markdownToHtmlDocument } from "./markdown.js";

export interface ConvertOptions {
  inputPath: string;
  outputPath?: string;
  watch?: boolean;
}

export interface ConversionResult {
  inputPath: string;
  outputPath: string;
}

/**
 * Builds the default output path by replacing a Markdown extension with .html.
 * Files without an extension simply receive an additional .html suffix.
 */
export function getDefaultOutputPath(inputPath: string): string {
  const extension = extname(inputPath);

  if (extension.toLowerCase() === ".md" || extension.toLowerCase() === ".markdown") {
    return `${inputPath.slice(0, -extension.length)}.html`;
  }

  return `${inputPath}.html`;
}

export function getDocumentTitle(inputPath: string): string {
  const fileName = basename(inputPath);
  const extension = extname(fileName);

  if (extension.toLowerCase() === ".md" || extension.toLowerCase() === ".markdown") {
    return fileName.slice(0, -extension.length);
  }

  return extension ? fileName.slice(0, -extension.length) : fileName;
}

export async function convertFile(options: ConvertOptions): Promise<ConversionResult> {
  const inputPath = resolve(options.inputPath);
  const outputPath = resolve(options.outputPath ?? getDefaultOutputPath(inputPath));

  if (inputPath === outputPath) {
    throw new Error("输入文件和输出文件不能是同一个文件。");
  }

  const markdown = await readFile(inputPath, "utf8");
  const html = markdownToHtmlDocument(markdown, getDocumentTitle(inputPath));

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");

  return { inputPath, outputPath };
}
