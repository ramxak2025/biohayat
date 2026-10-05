import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
export function loader(mocks = {}, globals = {}) {
  const modules = new Map();
  function load(path) {
    const full = resolve(mobileRoot, path);
    if (modules.has(full)) return modules.get(full).exports;
    const module = { exports: {} };
    modules.set(full, module);
    const { outputText } = ts.transpileModule(readFileSync(full, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: full,
    });
    function importModule(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith(".") || name.startsWith("@/")) {
        const base = name.startsWith("@/") ? resolve(mobileRoot, "src", name.slice(2)) : resolve(dirname(full), name);
        const file = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find((candidate) => existsSync(candidate) && /\.tsx?$/.test(candidate));
        assert.ok(file, `Cannot resolve ${name} from ${path}`);
        return load(file);
      }
      return require(name);
    }
    vm.runInNewContext(outputText, {
      exports: module.exports, module, require: importModule,
      process: { env: {} }, URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
      fetch: () => { throw new Error("Network requests must be mocked"); }, ...globals,
    }, { filename: full });
    return module.exports;
  }
  return load;
}


/** Execute a component's real async callback without a native rendering runtime. */
export function loadCallback(path, name, scope) {
  const full = resolve(mobileRoot, path);
  const source = ts.createSourceFile(full, readFileSync(full, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name &&
        node.initializer && ts.isCallExpression(node.initializer) &&
        node.initializer.expression.getText(source) === "useCallback") callback = node.initializer.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(callback, `Cannot find ${name} in ${path}`);
  const { outputText } = ts.transpileModule(`(${callback.getText(source)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  });
  return vm.runInNewContext(outputText, scope, { filename: full });
}
