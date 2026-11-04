// Workspace-generic Spec Kit reader. Read-only: no writes, no git commands,
// no prompt execution. Every path is resolved inside the session workspace.
import * as fs from 'node:fs/promises';
import { constants as C } from 'node:fs';
import path from 'node:path';

export const inject = ['connection', 'sessions', 'workingDirectory'];
export const API = '/api/dsh-speckit-panel';
const LIMIT = 256 * 1024;
const FILE_NAMES = ['spec.md', 'specify.md', 'plan.md', 'tasks.md', 'checklist.md', 'research.md', 'data-model.md', 'quickstart.md'];

const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };

async function statSafe(abs) {
  const st = await fs.lstat(abs);
  if (st.isSymbolicLink()) fail('UNSAFE_PATH', 'Symlink is not allowed');
  return st;
}

async function readBounded(abs) {
  const st = await statSafe(abs);
  if (!st.isFile()) fail('INVALID_PATH', 'Not a file');
  if (st.size > LIMIT) fail('TOO_LARGE', 'File exceeds the 256 KiB preview limit');
  const handle = await fs.open(abs, C.O_RDONLY | C.O_NOFOLLOW);
  try {
    const buffer = Buffer.alloc(st.size);
    const { bytesRead } = await handle.read(buffer, 0, st.size, 0);
    return { text: buffer.subarray(0, bytesRead).toString('utf8'), size: st.size, mtimeMs: st.mtimeMs };
  } finally { await handle.close(); }
}

function inside(root, abs) {
  return abs === root || abs.startsWith(root + path.sep);
}

function relative(root, abs) { return path.relative(root, abs).split(path.sep).join('/'); }

async function listFeatures(root) {
  const sources = [
    { layout: 'specs', dir: path.join(root, 'specs') },
    { layout: '.speckit', dir: path.join(root, '.speckit', 'features') },
    { layout: '.speckit', dir: path.join(root, '.speckit') },
  ];
  const seen = new Set();
  const features = [];
  for (const source of sources) {
    let entries;
    try { entries = await fs.readdir(source.dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const dir = path.join(source.dir, entry.name);
      const rel = relative(root, dir);
      if (seen.has(rel)) continue;
      const files = [];
      for (const name of FILE_NAMES) {
        try {
          const st = await statSafe(path.join(dir, name));
          if (st.isFile()) files.push({ name, path: `${rel}/${name}`, size: st.size, mtimeMs: st.mtimeMs });
        } catch { /* absent */ }
      }
      try {
        for (const name of (await fs.readdir(dir)).sort()) {
          if (!/^analy[sz]e.*\.md$/i.test(name)) continue;
          const abs = path.join(dir, name);
          const st = await statSafe(abs);
          if (st.isFile() && !files.some(f => f.name === name)) files.push({ name, path: `${rel}/${name}`, size: st.size, mtimeMs: st.mtimeMs });
        }
      } catch { /* unreadable */ }
      if (!files.length) continue;
      seen.add(rel);
      let title = entry.name;
      let tasks = { done: 0, total: 0 };
      for (const file of files) {
        if (file.name === 'tasks.md') {
          try {
            const { text } = await readBounded(path.join(root, file.path));
            for (const line of text.split(/\r?\n/)) {
              const m = /^\s*[-*]\s*\[([ xX])\]\s+/.exec(line);
              if (m) { tasks.total += 1; if (m[1].toLowerCase() === 'x') tasks.done += 1; }
            }
          } catch { /* counts stay zero */ }
        }
        if (file.name === 'spec.md' || file.name === 'specify.md') {
          try {
            const { text } = await readBounded(path.join(root, file.path));
            const heading = /^#\s+(.+)$/m.exec(text);
            if (heading) title = heading[1].trim();
          } catch { /* keep slug */ }
        }
      }
      features.push({ slug: entry.name, path: rel, layout: source.layout, title, files, tasks });
    }
  }
  features.sort((a, b) => b.slug.localeCompare(a.slug));
  return features;
}

async function constitution(root) {
  const candidates = [
    '.speckit/constitution.md',
    '.specify/memory/constitution.md',
    'specs/constitution.md',
  ];
  for (const rel of candidates) {
    try {
      const st = await statSafe(path.join(root, rel));
      if (st.isFile()) return { path: rel, size: st.size, mtimeMs: st.mtimeMs };
    } catch { /* next */ }
  }
  return null;
}

async function branch(root) {
  try {
    const head = await readBounded(path.join(root, '.git', 'HEAD'));
    const ref = /^ref:\s*refs\/heads\/(.+)$/m.exec(head.text);
    if (ref) return ref[1].trim();
    return head.text.trim().slice(0, 12) || null;
  } catch { return null; }
}

function sessionRoot(ctx, sessionId) {
  const session = ctx.get('sessions')?.get?.(sessionId);
  if (!session) fail('NO_SESSION', 'Unknown session');
  return path.resolve(ctx.workingDirectory.get(session));
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

export async function apply(ctx) {
  ctx.effect(() => ctx.connection.fetch.register({
    path: API, methods: ['GET'], requestBody: 'buffered',
    async fetch(request) {
      try {
        const url = new URL(request.url);
        const action = url.searchParams.get('action') ?? 'state';
        const sessionId = url.searchParams.get('session') ?? '';
        const root = sessionRoot(ctx, sessionId);
        if (action === 'state') {
          const features = await listFeatures(root);
          return json({ workspace: root, branch: await branch(root), constitution: await constitution(root), features });
        }
        if (action === 'file') {
          const rel = url.searchParams.get('path') ?? '';
          if (!rel || path.isAbsolute(rel) || rel.includes('\0')) fail('INVALID_PATH', 'Expected a workspace-relative path');
          const abs = path.resolve(root, rel);
          if (!inside(root, abs)) fail('UNSAFE_PATH', 'Path leaves the workspace');
          const file = await readBounded(abs);
          return json({ path: rel, text: file.text, size: file.size, mtimeMs: file.mtimeMs });
        }
        if (action === 'branch') return json({ branch: await branch(root) });
        return json({ error: 'Unknown action' }, 400);
      } catch (error) {
        const code = error?.code ?? 'ERROR';
        const status = code === 'NO_SESSION' ? 404 : code === 'UNSAFE_PATH' || code === 'INVALID_PATH' ? 400 : 409;
        return json({ error: error?.message ?? 'Error', code }, status);
      }
    },
  }), 'speckit-panel.api');
}

export { listFeatures, constitution, branch };
