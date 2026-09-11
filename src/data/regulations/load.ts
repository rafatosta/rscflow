import metadata from './ifba-189-2026/metadata.json';
import first from './ifba-189-2026/rsc-i.json';
import second from './ifba-189-2026/rsc-ii.json';
import third from './ifba-189-2026/rsc-iii.json';
import { regulationSchema } from '@/domain/regulation';

/** Validação estrutural: não certifica as fontes nem habilita cálculo normativo. */
export function parseRegulation(value: unknown) {
  return regulationSchema.parse(value);
}
export function loadIfbaRegulation() {
  return parseRegulation({ metadata, levels: [first, second, third] });
}

/** Catálogos distribuídos pela aplicação, sem fontes injetadas pelo ambiente de testes. */
export function loadRegulations() {
  return [loadIfbaRegulation()];
}
