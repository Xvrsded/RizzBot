import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const cjsRequire = createRequire(__filename);

const SOURCE_EXTENSIONS = new Set([".ts", ".js"]);
const EXCLUDED_SUFFIXES = [".d.ts", ".test.ts", ".spec.ts"];

function isLoadableModuleFile(fileName: string): boolean {
  if (EXCLUDED_SUFFIXES.some((suffix) => fileName.endsWith(suffix))) {
    return false;
  }

  const extension = path.extname(fileName);
  return SOURCE_EXTENSIONS.has(extension);
}

export function collectModuleFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectModuleFiles(fullPath));
      continue;
    }

    if (entry.isFile() && isLoadableModuleFile(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function loadModule<T>(filePath: string): Promise<T> {
  const resolvedPath = path.resolve(filePath);

  // Compiled CommonJS output — require() is reliable on Windows.
  if (resolvedPath.endsWith(".js")) {
    return cjsRequire(resolvedPath) as T;
  }

  // TypeScript source — file URL import works with tsx on Windows.
  const moduleUrl = pathToFileURL(resolvedPath).href;
  return (await import(moduleUrl)) as T;
}
