import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
export function validateRelease(release, root) {
  const errors = [];
  const fail = message => errors.push(message);
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(release.repository || '')) fail('Repository must be an explicit GitHub source URL');
  if (!/^[a-f0-9]{40}$/.test(release.commit || '')) fail('Pin a full source commit');
  if (!release.license || !release.modifications?.length) fail('Declare license and local modifications');
  if (release.runtime !== 'browser') fail('This gate only approves browser releases');
  if (!Number.isFinite(release.maxBytes) || release.maxBytes <= 0) fail('Declare a download budget');
  if (!release.files || !Object.keys(release.files).length) fail('Declare immutable file hashes');
  let bytes = 0;
  for (const [name, expected] of Object.entries(release.files || {})) {
    const full = resolve(root, name), rel = relative(root, full);
    if (rel.startsWith('..') || isAbsolute(rel)) { fail(`Unsafe path: ${name}`); continue; }
    if (!existsSync(full)) { fail(`Missing file: ${name}`); continue; }
    const data = readFileSync(full); bytes += data.length;
    if (createHash('sha256').update(data).digest('hex') !== expected) fail(`Source drift: ${name}`);
  }
  if (bytes > release.maxBytes) fail(`Download budget exceeded: ${bytes}`);
  if (!release.files?.[release.entry]) fail('Entry point must be integrity checked');
  return errors;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  const manifest = JSON.parse(readFileSync(resolve(root, 'quality/releases.json')));
  const errors = manifest.releases.flatMap(r => validateRelease(r, root).map(e => `${r.id}: ${e}`));
  if (!manifest.releases.length) errors.push('No verified releases');
  const pkg = JSON.parse(readFileSync('package.json'));
  const vercel = JSON.parse(readFileSync('vercel.json'));
  if (pkg.engines.node !== '24.x') errors.push('Review Node version changes explicitly');
  if (vercel.buildCommand !== 'npm run build:vercel') errors.push('Vercel must use its validated build');
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`PASS: ${manifest.releases.length} release(s), integrity, provenance, size and deployment configuration`);
}
