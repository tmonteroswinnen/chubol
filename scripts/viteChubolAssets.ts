import { createHash } from 'node:crypto';
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
/**
 * Cache-first for everything that carries a content hash or never changes, and
 * network-first for the page itself, so a new build is picked up on the next
 * online launch instead of being pinned forever.
 */
function serviceWorker(version: string, precache: readonly string[]): string {
  return `const CACHE = 'chubol-${version}';
const PRECACHE = ${JSON.stringify(precache, null, 2)};

/*
 * Vary has to be ignored when matching. A static host commonly answers with
 * \`Vary: Origin\`, and a module script is fetched in CORS mode so it carries an
 * Origin header that the precached copy does not. With Vary honoured those two
 * never match, the script misses the cache, and the game will not start with no
 * connection — which is exactly the case this worker exists for.
 */
const MATCH = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request, MATCH).then((hit) => hit || caches.match('./', MATCH))),
    );
    return;
  }

  event.respondWith(
    caches.match(request, MATCH).then((hit) => hit || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
`;
}

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
    generateBundle(_options, bundle) {
      // A service worker, so the game works offline once it has been added to a
      // phone's home screen. The precache list is built from what was actually
      // emitted, so it can never drift from the build.
      const fromBundle = Object.keys(bundle);
      const fromPublic = walk(resolve(rootDir, 'public'));
      const precache = ['./', ...fromBundle, ...fromPublic].map((f) => (f.startsWith('.') ? f : `./${f}`));
      const version = createHash('sha1').update(precache.join('|')).digest('hex').slice(0, 10);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorker(version, precache) });
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
