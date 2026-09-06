import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, it } from 'node:test';

/**
 * Guard for every deep import into `@nestjs/*`.
 *
 * NestJS 11 is CommonJS without an exports map, so any deep path resolves —
 * including a *directory* such as `@nestjs/common/interfaces`, which Node's
 * CJS resolver completes to `interfaces/index.js`. NestJS 12 is ESM-only with
 * an exports map of `"./*": "./*.js"`: a deep import of a *file* still
 * resolves (`@nestjs/core/injector/constants` -> `injector/constants.js`), a
 * deep import of a directory does not — there is no `interfaces.js`, and ESM
 * never completes a directory to its index.
 *
 * This package imports only the public `@nestjs/*` roots today, so this is a
 * tripwire rather than a fix: it scans every `.ts` file under
 * `packages/drizzle` for `@nestjs/<pkg>/<subpath>` imports in every form —
 * `from`, a bare side-effect `import '…'`, `require()`, and `import()` — and
 * requires `<subpath>` to name a real file (`.js`, `.ts`, or `.d.ts`) inside
 * the installed package, never a directory. The scanner is exercised against
 * fixtures first so an empty scan cannot make the check vacuous. It fails on
 * both majors, which matters because on the 11.x install the trap is
 * otherwise invisible.
 */
const packageDir = path.resolve(__dirname, '..');
const packageRequire = createRequire(path.join(packageDir, 'index.ts'));
const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist']);
// Every way a source file can name a module: `from '…'` (static imports and
// re-exports), a bare side-effect `import '…'`, `require('…')`, and `import('…')`.
const DEEP_IMPORT_PATTERN =
  /\b(?:from|import|require\(|import\()\s*['"]@nestjs\/([^'"/]+)\/([^'"]+)['"]/g;

type Source = readonly [file: string, text: string];

/** Every `.ts` file under `packages/drizzle`, tests and testing utilities included. */
function collectSourceFiles(): string[] {
  return readdirSync(packageDir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
    .map(entry => path.join(entry.parentPath, entry.name))
    .filter(file => {
      const segments = path.relative(packageDir, file).split(path.sep);
      return !segments.some(segment => IGNORED_DIRECTORIES.has(segment));
    })
    .sort();
}

function readSources(files: string[]): Source[] {
  return files.map(file => [path.relative(packageDir, file), readFileSync(file, 'utf8')]);
}

/** `@nestjs/<pkg>/<subpath>` specifier -> the sources importing it. */
function collectDeepImports(sources: Iterable<Source>): Map<string, string[]> {
  const imports = new Map<string, string[]>();
  for (const [file, text] of sources) {
    for (const match of text.matchAll(DEEP_IMPORT_PATTERN)) {
      const specifier = `@nestjs/${match[1]}/${match[2]}`;
      const importers = imports.get(specifier) ?? [];
      importers.push(file);
      imports.set(specifier, importers);
    }
  }
  return imports;
}

/** The installed root of `@nestjs/<name>`, resolved the way the package's own code resolves it. */
function resolvePackageRoot(name: string): string {
  let directory = path.dirname(packageRequire.resolve(name));
  while (true) {
    const manifest = path.join(directory, 'package.json');
    if (existsSync(manifest)) {
      const { name: manifestName } = JSON.parse(readFileSync(manifest, 'utf8'));
      if (manifestName === name) {
        return directory;
      }
    }
    const parent = path.dirname(directory);
    assert.notEqual(parent, directory, `could not locate the root of ${name}`);
    directory = parent;
  }
}

function describeTarget(root: string, subpath: string): string {
  const target = path.join(root, subpath);
  if (!existsSync(target)) {
    return 'nothing at that path';
  }
  return statSync(target).isDirectory()
    ? 'a DIRECTORY — NestJS 12 (ESM-only, exports map "./*": "./*.js") does not resolve a directory index'
    : 'a file without a .js/.ts/.d.ts sibling';
}

/** The deep imports that do not name a file inside the installed `@nestjs/*` package. */
function findOffenders(deepImports: Map<string, string[]>): string[] {
  const offenders: string[] = [];

  for (const [specifier, importers] of deepImports) {
    const [, packageName, ...rest] = specifier.split('/');
    const root = resolvePackageRoot(`@nestjs/${packageName}`);
    const subpath = rest.join('/').replace(/\.js$/, '');
    const resolvesToFile = ['.js', '.ts', '.d.ts'].some(extension =>
      existsSync(path.join(root, `${subpath}${extension}`)),
    );

    if (!resolvesToFile) {
      offenders.push(
        `${specifier} (imported by ${importers.join(', ')}) resolves to ${describeTarget(root, subpath)}`,
      );
    }
  }

  return offenders;
}

describe('@nestjs/* deep imports', () => {
  it('flags a directory import and accepts a file import (scanner self-check)', () => {
    // Built from pieces so this spec's own text never contains a literal deep
    // import for the real scan below to trip over.
    const directoryImport = ['@nestjs/common', 'interfaces'].join('/');
    const fileImport = ['@nestjs/core', 'injector', 'constants'].join('/');
    const fixture: Source[] = [
      [
        'fixture.ts',
        `import { Controller } from '${directoryImport}';\n` +
          `import { STATIC_CONTEXT } from '${fileImport}';\n`,
      ],
    ];

    const offenders = findOffenders(collectDeepImports(fixture));

    assert.equal(offenders.length, 1, offenders.join('\n'));
    assert.match(offenders[0], /^@nestjs\/common\/interfaces \(imported by fixture\.ts\) resolves to a DIRECTORY/);
  });

  it('collects every import form, including a bare side-effect import (scanner self-check)', () => {
    // A side-effect import has no `from`, so a scanner keyed on `from` alone
    // would miss it — this fixture keeps that form covered. Built from pieces
    // for the same reason as above.
    const directoryImport = ['@nestjs/common', 'interfaces'].join('/');
    const forms: Source[] = [
      ['named.ts', `import { Controller } from '${directoryImport}';\n`],
      ['side-effect.ts', `import '${directoryImport}';\n`],
      ['side-effect-double-quoted.ts', `import "${directoryImport}";\n`],
      ['re-export.ts', `export * from '${directoryImport}';\n`],
      ['require.ts', `const { Controller } = require('${directoryImport}');\n`],
      ['dynamic.ts', `const loaded = import('${directoryImport}');\n`],
    ];

    const deepImports = collectDeepImports(forms);

    assert.deepEqual(
      [...deepImports.entries()],
      [[directoryImport, forms.map(([file]) => file)]],
      'every import form must be collected, the bare side-effect form included',
    );
    assert.equal(findOffenders(deepImports).length, 1);
  });

  it('imports @nestjs/* only through paths that are files inside the installed package', () => {
    const offenders = findOffenders(collectDeepImports(readSources(collectSourceFiles())));

    assert.deepEqual(
      offenders,
      [],
      'Every deep import into @nestjs/* must name a file, never a directory:\n' +
        offenders.join('\n') +
        '\nImport the file that declares the symbol, or declare a local alias.',
    );
  });
});
