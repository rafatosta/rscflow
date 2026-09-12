export const sections = [
  ['', 'Visão geral'],
  ['profile', 'Dados do docente'],
  ['rsc-i', 'RSC I'],
  ['rsc-ii', 'RSC II'],
  ['rsc-iii', 'RSC III'],
  ['evidence', 'Comprovantes'],
  ['education', 'Formação'],
  ['activities', 'Cadastro anterior'],
  ['timeline', 'Trajetória'],
  ['criteria', 'Critérios'],
  ['scoring', 'Pontuação'],
  ['memorial', 'Memorial'],
  ['preview', 'Prévia'],
  ['review', 'Revisão'],
  ['export', 'Gerar documentos'],
] as const;
export type Section = (typeof sections)[number][0];
export function parseRoute(
  pathname: string,
): { kind: 'home' } | { kind: 'project'; id: string; section: Section } | { kind: 'missing' } {
  if (pathname === '/') return { kind: 'home' };
  const match = /^\/project\/([^/]+)(?:\/([^/]+))?\/?$/.exec(pathname);
  if (!match) return { kind: 'missing' };
  const section = match[2] ?? '';
  if (!sections.some(([path]) => path === section)) return { kind: 'missing' };
  try {
    return { kind: 'project', id: decodeURIComponent(match[1]), section: section as Section };
  } catch {
    return { kind: 'missing' };
  }
}
export const projectPath = (id: string, section: string = '') =>
  `/project/${encodeURIComponent(id)}${section ? `/${section}` : ''}`;

export const primarySections: readonly Section[] = [
  '',
  'profile',
  'rsc-i',
  'rsc-ii',
  'rsc-iii',
  'evidence',
  'memorial',
  'review',
  'export',
];
