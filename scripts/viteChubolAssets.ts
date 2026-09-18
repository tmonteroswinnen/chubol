import { existsSync, readdirSync, statSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, posix, relative, resolve } from 'node:path';
import type { Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:chubol-assets';
const RESOLVED_ID = '\0virtual:chubol-assets';

function walk(root: string, base = root): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else out.push(posix.join(...relative(base, full).split(/[\\/]/)));
  }
  return out;
}

/**
 * Tells the game which art files actually exist, at build time.
 *
 * Without this the game would have to probe every path over the network and a
 * missing file would show up as a failed request in the browser console. Since
 * no artwork has been produced yet, that would be the normal state, and a
 * console full of expected 404s hides the errors that matter.
 *
 * It also serves and copies `references/`, which lives at the repository root so
 * the original reference images stay untouched and out of the bundle.
 */
export function chubolAssets(): Plugin {
  let rootDir = process.cwd();

  const listing = (): { available: string[] } => {
    const fromPublic = walk(resolve(rootDir, 'public')).map((p) => p);
    const fromReferences = walk(resolve(rootDir, 'references')).map((p) => posix.join('references', p));
    return { available: [...fromPublic, ...fromReferences] };
  };

  return {
    name: 'chubol-assets',
    configResolved(config) {
      rootDir = config.root;
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      return `export const AVAILABLE_FILES = ${JSON.stringify(listing().available)};`;
    },
    configureServer(server) {
      // Serve the untouched reference images straight from the repository root.
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (!url.startsWith('/references/')) return next();
        const file = resolve(rootDir, '.' + url);
        if (!existsSync(file) || !statSync(file).isFile()) {
          res.statusCode = 404;
          res.end();
          return;
        }
        return next();
      });
      // Reload when a reference or asset appears, so the manifest refreshes.
      server.watcher.add([resolve(rootDir, 'references'), resolve(rootDir, 'public')]);
    },
    closeBundle() {
      // Nothing to do when there are no reference images yet.
      const src = resolve(rootDir, 'references');
      if (!existsSync(src)) return;
      const dest = resolve(rootDir, 'dist', 'references');
      mkdirSync(dest, { recursive: true });
      for (const file of walk(src)) {
        const target = join(dest, file);
        mkdirSync(join(target, '..'), { recursive: true });
        copyFileSync(join(src, file), target);
      }
    },
  };
}
