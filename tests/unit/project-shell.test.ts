import { describe, expect, it } from 'vitest';
import {
  completion,
  createDraft,
  datasets,
  projectScoring,
} from '@/features/project-shell/project-view';
import { parseRoute, projectPath, sections } from '@/features/project-shell/routes';
import { projectExportSchema } from '@/domain/project';
import { exportProject } from '@/features/local-projects/project-files';
import { buildMemorialPreview } from '@/memorial/preview';
import { activityProjectView } from '@/domain/project-migration';
import { currentProjectFixture, projectFixture } from '../fixtures/project';

describe('rotas e rascunhos do shell', () => {
  it.each(sections)('reconhece seção %s', (section) => {
    expect(parseRoute(projectPath('id-1', section))).toEqual({
      kind: 'project',
      id: 'id-1',
      section,
    });
  });
  it.each([
    '/desconhecida',
    '/project',
    '/project/id/invalid',
    '/project/id/profile/extra',
    '/project/%GG',
  ])('rejeita endereço %s', (url) => {
    expect(parseRoute(url)).toEqual({ kind: 'missing' });
  });
  it('reconhece início e IDs escapados', () => {
    expect(parseRoute('/')).toEqual({ kind: 'home' });
    expect(parseRoute(projectPath('id com espaço'))).toMatchObject({ id: 'id com espaço' });
  });
  it('cria apenas com nível/dataset e mantém pendência explícita no round-trip', () => {
    const draft = createDraft('rsc-ii', datasets[0].metadata.regulation.id);
    expect(draft).toMatchObject({
      schemaVersion: '3.0',
      regulation: { version: null },
      userData: { teacher: { name: '' }, request: { level: 'rsc-ii' } },
    });
    expect(projectExportSchema.parse(JSON.parse(exportProject(draft)))).toEqual(draft);
    expect(projectScoring(draft)).toMatchObject({
      status: 'unavailable',
      issues: [{ code: 'pending-dataset' }],
    });
    expect(() => createDraft('rsc-i', 'inexistente')).toThrow();
  });
  it('mantém contratos 1.0/2.0 e não migra dados silenciosamente', () => {
    expect(projectExportSchema.parse(projectFixture)).toEqual(projectFixture);
    expect(projectExportSchema.parse(currentProjectFixture)).toEqual(currentProjectFixture);
    expect(
      projectExportSchema.safeParse({
        ...currentProjectFixture,
        regulation: { ...currentProjectFixture.regulation, version: null },
      }).success,
    ).toBe(false);
    expect(
      projectExportSchema.safeParse({
        ...currentProjectFixture,
        userData: { ...currentProjectFixture.userData, teacher: { name: '' } },
      }).success,
    ).toBe(false);
  });
  it('permite ocorrência sem enquadramento e preserva referências', () => {
    const draft = createDraft('rsc-i', datasets[0].metadata.regulation.id);
    draft.userData.unassignedOccurrences.push({
      id: 'a',
      title: 'Experiência',
      quantity: 1,
      order: 0,
      period: {},
      evidenceIds: [],
    });
    expect(projectExportSchema.safeParse(draft).success).toBe(true);
    draft.userData.unassignedOccurrences[0].evidenceIds = ['inexistente'];
    expect(projectExportSchema.safeParse(draft).success).toBe(false);
  });
  it('progresso mede preenchimento, não pontuação', () => {
    const draft = createDraft('rsc-i', datasets[0].metadata.regulation.id);
    expect(completion(draft).percent).toBe(0);
    draft.userData.teacher = {
      name: 'Docente',
      cpf: '52998224725',
      siape: '1234567',
      campus: 'Salvador',
    };
    expect(completion(draft).percent).toBe(20);
    draft.userData.education.push({ id: 'e', title: 'Curso', institution: 'Instituição' });
    expect(completion(draft).percent).toBe(40);
    draft.userData.memorial = { title: 'Memorial', introduction: '', conclusion: 'Síntese final' };
    expect(completion(draft).items.find((item) => item.section === 'memorial')?.complete).toBe(
      true,
    );
    expect(completion(projectExportSchema.parse(projectFixture))).toEqual({
      percent: 0,
      items: [],
    });
  });
  it('prévia textual deriva dos dados e mantém texto potencialmente HTML como texto', () => {
    const draft = createDraft('rsc-i', datasets[0].metadata.regulation.id);
    draft.userData.memorial = {
      title: 'Memorial',
      introduction: '<script>texto</script>',
      conclusion: 'Fim',
    };
    draft.userData.education.push({ id: 'e', title: 'Curso', institution: 'Instituição' });
    const preview = buildMemorialPreview(activityProjectView(draft));
    expect(preview).toContain('<script>texto</script>');
    expect(preview).toContain('Curso — Instituição');
    expect(preview).toContain('Fim');
  });
});
