import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const sourceRoot = resolve(root, 'src');

function sourceFiles(directory = sourceRoot): string[] {
  return readdirSync(directory)
    .flatMap((entry) => {
      const path = resolve(directory, entry);
      return statSync(path).isDirectory() ? sourceFiles(path) : [path];
    })
    .filter((path) => /\.(?:ts|tsx)$/.test(path));
}

function importsOf(path: string): string[] {
  return [
    ...readFileSync(path, 'utf8').matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g),
  ].map((match) => match[1]);
}

function importedLayer(path: string, dependency: string): string | undefined {
  const target = dependency.startsWith('@/')
    ? resolve(sourceRoot, dependency.slice(2))
    : dependency.startsWith('.')
      ? resolve(dirname(path), dependency)
      : undefined;
  if (!target) return undefined;
  const name = relative(sourceRoot, target);
  return name.startsWith('..') ? undefined : name.split('/')[0];
}

const forbiddenByLayer: Record<string, string[]> = {
  domain: ['app', 'components', 'data', 'features', 'memorial', 'pdf', 'rules', 'storage'],
  rules: ['app', 'components', 'features', 'memorial', 'pdf', 'storage'],
  storage: ['app', 'components', 'data', 'features', 'memorial', 'pdf', 'rules'],
  memorial: ['app', 'components', 'data', 'features', 'pdf', 'rules', 'storage'],
  pdf: ['app', 'components', 'data', 'features', 'rules', 'storage'],
};

describe('fronteiras arquiteturais', () => {
  it('impede dependências proibidas nas camadas estáveis', () => {
    const violations: string[] = [];
    for (const path of sourceFiles()) {
      const name = relative(sourceRoot, path);
      const layer = name.split('/')[0];
      for (const forbidden of forbiddenByLayer[layer] ?? []) {
        if (importsOf(path).some((dependency) => importedLayer(path, dependency) === forbidden)) {
          violations.push(`${name} importa ${forbidden}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('mantém regras e dados normativos fora da apresentação', () => {
    const presentation = sourceFiles().filter((path) => /src\/(?:app|components)\//.test(path));
    const violations = presentation.flatMap((path) =>
      importsOf(path)
        .filter(
          (dependency) =>
            importedLayer(path, dependency) === 'rules' ||
            importedLayer(path, dependency) === 'data' ||
            dependency.includes('/data/regulations/') ||
            dependency.endsWith('.json'),
        )
        .map((dependency) => `${relative(sourceRoot, path)} importa ${dependency}`),
    );
    expect(violations).toEqual([]);
  });

  it('mantém o motor genérico, sem desvios por código de critério', () => {
    const violations = sourceFiles(resolve(sourceRoot, 'rules'))
      .filter((path) => {
        const content = readFileSync(path, 'utf8');
        return (
          /(?:criterion(?:Id)?|\.code)\s*={2,3}\s*['"]/i.test(content) ||
          /case\s+['"][a-z]+(?:\.\d+)+['"]/i.test(content) ||
          /['"]rsc-(?:i|ii|iii)-[a-z]+(?:-\d+)+['"]/i.test(content)
        );
      })
      .map((path) => relative(root, path));
    expect(violations).toEqual([]);
  });

  it('não contém comunicação remota, TODO, FIXME ou stubs declarados', () => {
    const violations: string[] = [];
    const forbidden = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bWebSocket\s*\(/,
      /\bEventSource\s*\(/,
      /\bsendBeacon\s*\(/,
      /\b(?:TODO|FIXME)\b/,
      /throw new Error\(['"]Not implemented/i,
    ];
    for (const path of sourceFiles()) {
      const content = readFileSync(path, 'utf8');
      if (forbidden.some((pattern) => pattern.test(content))) violations.push(relative(root, path));
    }
    expect(violations).toEqual([]);
  });
});
