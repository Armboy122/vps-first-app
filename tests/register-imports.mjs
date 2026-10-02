import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (context.parentURL?.includes('/node_modules/'))
            return nextResolve(specifier, context);
        if (specifier.startsWith('@/') || specifier.startsWith('./') || specifier.startsWith('../')) {
            const base = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
            for (const suffix of ['', '.ts', '.tsx', '/index.ts']) {
                if (existsSync(base + suffix) && path.extname(base + suffix))
                    return nextResolve(pathToFileURL(base + suffix).href, context);
            }
        }
        return nextResolve(specifier, context);
    },
});
