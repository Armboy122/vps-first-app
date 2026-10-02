import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
/** Load the real Action modules with narrowly mocked framework/database ports. */
export function createTypescriptLoader(root, mocks = {}) {
    const cache = new Map();
    function load(file) {
        const filename = path.resolve(root, file);
        if (cache.has(filename))
            return cache.get(filename).exports;
        const module = { exports: {} };
        cache.set(filename, module);
        const nativeRequire = createRequire(filename);
        function localRequire(specifier) {
            if (Object.hasOwn(mocks, specifier))
                return mocks[specifier];
            if (specifier.startsWith('@/') || specifier.startsWith('.')) {
                const base = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
                if (Object.hasOwn(mocks, base))
                    return mocks[base];
                for (const suffix of ['', '.ts', '.tsx', '/index.ts']) {
                    if (fs.existsSync(base + suffix) && fs.statSync(base + suffix).isFile())
                        return load(base + suffix);
                }
            }
            return nativeRequire(specifier);
        }
        const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
        const quietConsole = { ...console, error() { }, log() { }, warn() { } };
        new Function('require', 'module', 'exports', '__filename', '__dirname', 'console', 'Date', 'setTimeout', source)(localRequire, module, module.exports, filename, path.dirname(filename), quietConsole, mocks['global:Date'] || Date, mocks['global:setTimeout'] || setTimeout);
        return module.exports;
    }
    return load;
}
