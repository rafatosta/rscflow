import { activityProjectView } from '@/domain/project-migration';
import { describe, expect, it } from 'vitest';
import type { Activity, Evidence } from '@/domain/models';
import type { EvidencePageMap } from '@/domain/evidence-page-map';
import { projectExportSchema } from '@/domain/project';
import { createDraft, datasets } from '@/features/project-shell/project-view';
import { exportProject } from '@/features/local-projects/project-files';
import {
  activityTextIsOutdated,
  chronologicalActivities,
  editActivityText,
  generateActivityText,
  keepActivityText,
  regenerateActivityText,
} from '@/memorial/generator';
import { buildMemorialDocument, buildMemorialPreview } from '@/memorial/preview';

function pageMap(
  entries: Array<{ evidenceId: string; startPage: number; endPage: number }>,
): EvidencePageMap {
  return {
    totalPages: Math.max(0, ...entries.map((entry) => entry.endPage)),
    evidences: entries.map((entry) => ({
      ...entry,
      files: [],
      links: [{ level: 'rsc-ii', criterionId: 'b.1', occurrenceId: 'a-1' }],
    })),
  };
}

const evidence: Evidence = {
  id: 'e-1',
  title: 'Portaria de coordenação',
  type: 'Portaria',
  identifier: '42/2022',
};
const activity: Activity = {
  id: 'a-1',
  title: 'Coordenação de curso',
  category: 'Gestão',
  institution: 'Instituto Federal',
  department: 'Departamento de Ensino',
  startDate: '2022-02-01',
  endDate: '2023-12-20',
  role: 'Coordenadora',
  description: 'Organização do colegiado',
  results: 'Fluxos acadêmicos revisados',
  competencies: ['Planejamento', 'Liderança'],
  criterionId: 'b.1',
  selectedLevel: 'rsc-ii',
  quantity: 2,
  evidenceIds: ['e-1'],
};

describe('gerador determinístico do memorial', () => {
  it('gera sempre o mesmo texto na sequência editorial definida', () => {
    const first = generateActivityText(activity, [evidence]);
    expect(generateActivityText(structuredClone(activity), [structuredClone(evidence)])).toBe(
      first,
    );
    expect(first.split('\n').map((line) => line.split(':')[0])).toEqual([
      'Contexto',
      'Atuação',
      'Resultados',
      'Saberes e competências',
      'Enquadramento',
      'Comprovação',
    ]);
    expect(first).toContain('Portaria de coordenação · Portaria · 42/2022');
    expect(generateActivityText({ ...activity, results: 'Concluído.' }, [evidence])).not.toContain(
      'Concluído..',
    );
  });

  it('ordena experiências cronologicamente sem alterar a entrada', () => {
    const items = [
      { ...activity, id: 'recente', startDate: '2024-01-01' },
      { ...activity, id: 'sem-data', startDate: undefined, endDate: undefined },
      { ...activity, id: 'antiga', startDate: '2020-01-01' },
    ];
    const before = items.map((item) => item.id);
    expect(chronologicalActivities(items).map((item) => item.id)).toEqual([
      'antiga',
      'recente',
      'sem-data',
    ]);
    expect(items.map((item) => item.id)).toEqual(before);
  });

  it('preserva edição manual após mudança e só a substitui por regeneração explícita', () => {
    const generated = regenerateActivityText(activity, [evidence]);
    const edited = editActivityText(generated, 'Texto autoral preservado.', [evidence]);
    const changed = { ...edited, results: 'Novo resultado estruturado' };
    expect(changed.editedText).toBe('Texto autoral preservado.');
    expect(changed.isManuallyEdited).toBe(true);
    expect(activityTextIsOutdated(changed, [evidence])).toBe(true);

    const kept = keepActivityText(changed, [evidence]);
    expect(kept.editedText).toBe('Texto autoral preservado.');
    expect(kept.isManuallyEdited).toBe(true);
    expect(activityTextIsOutdated(kept, [evidence])).toBe(false);

    const regenerated = regenerateActivityText(changed, [evidence]);
    expect(regenerated.editedText).toContain('Novo resultado estruturado');
    expect(regenerated.editedText).not.toBe('Texto autoral preservado.');
    expect(regenerated.isManuallyEdited).toBe(false);
  });

  it('monta capa, sumário e seções em ordem com introdução explicitamente editorial', () => {
    const project = activityProjectView(createDraft('rsc-ii', datasets[0].metadata.regulation.id));
    project.userData.teacher.name = 'Docente de teste';
    project.userData.memorial = {
      title: 'Meu Memorial',
      introduction: 'Apresentação livre.',
      conclusion: 'Síntese final.',
      sectionTexts: { awards: 'Aprovação declarada pela docente.' },
    };
    project.userData.activities = [
      { ...activity, id: 'nova', startDate: '2024-01-01', title: 'Gestão nova' },
      { ...activity, id: 'antiga', startDate: '2020-01-01', title: 'Gestão antiga' },
      {
        ...activity,
        id: 'formacao-atividade',
        category: 'Formação',
        startDate: '2019-01-01',
        title: 'Formação como atividade',
      },
    ];
    project.userData.education = [
      {
        id: 'curso',
        title: 'Curso posterior',
        institution: 'Instituição',
        startedAt: '2021-01-01',
      },
    ];
    const document = buildMemorialDocument(project);
    expect(document.map((section) => section.title)).toEqual([
      'Meu Memorial',
      'Sumário',
      'Apresentação introdutória',
      'Itinerário de formação, aperfeiçoamento e titulação',
      'Atuação docente',
      'Produção acadêmica, técnico-científica, literária e/ou artística',
      'Prestação de serviços à comunidade',
      'Gestão e administração',
      'Títulos, prêmios e aprovações em concursos',
      'Conclusão',
    ]);
    const management = document.find((section) => section.id === 'management')!;
    expect(management.paragraphs[0]).toContain('Gestão antiga');
    expect(management.paragraphs[1]).toContain('Gestão nova');
    const education = document.find((section) => section.id === 'education')!;
    expect(education.paragraphs[0]).toContain('Formação como atividade');
    expect(education.paragraphs[1]).toContain('Curso posterior');
    expect(buildMemorialPreview(project)).toContain('Apresentação livre.');
  });

  it('preserva textos gerados, editados e seções no export/import JSON', () => {
    const project = activityProjectView(createDraft('rsc-i', datasets[0].metadata.regulation.id));
    project.userData.memorial = {
      title: 'Memorial portátil',
      introduction: '',
      conclusion: 'Conclusão editada',
      sectionTexts: { teaching: 'Texto autoral da seção' },
    };
    project.userData.activities = [editActivityText(activity, 'Narrativa manual', [evidence])];
    project.userData.evidence = [evidence];
    const imported = projectExportSchema.parse(JSON.parse(exportProject(project)));
    if (imported.schemaVersion === '1.0' || imported.schemaVersion === '3.0')
      throw new Error('Formato inesperado.');
    expect(imported.userData.memorial?.sectionTexts?.teaching).toBe('Texto autoral da seção');
    expect(imported.userData.activities[0]).toMatchObject({
      editedText: 'Narrativa manual',
      isManuallyEdited: true,
    });
  });

  it('acrescenta referência de página única ao lançamento relacionado', () => {
    const project = activityProjectView(createDraft('rsc-ii', datasets[0].metadata.regulation.id));
    project.userData.activities = [{ ...activity, editedText: 'Narrativa autoral.' }];
    project.userData.evidence = [evidence];
    const preview = buildMemorialPreview(
      project,
      pageMap([{ evidenceId: 'e-1', startPage: 4, endPage: 4 }]),
    );
    expect(preview).toContain(
      'Narrativa autoral.\nComprovantes no PDF consolidado: Portaria de coordenação (p. 4).',
    );
  });

  it('formata intervalo de páginas sem modificar a narrativa do lançamento', () => {
    const project = activityProjectView(createDraft('rsc-ii', datasets[0].metadata.regulation.id));
    project.userData.activities = [{ ...activity, editedText: 'Texto preservado.' }];
    project.userData.evidence = [evidence];
    const document = buildMemorialDocument(
      project,
      pageMap([{ evidenceId: 'e-1', startPage: 2, endPage: 6 }]),
    );
    const paragraph = document.find((section) => section.id === 'management')!.paragraphs[0];
    expect(paragraph).toBe(
      'Texto preservado.\nComprovantes no PDF consolidado: Portaria de coordenação (pp. 2–6).',
    );
    expect(project.userData.activities[0].editedText).toBe('Texto preservado.');
  });

  it('lista múltiplos comprovantes na ordem recebida do mapa', () => {
    const project = activityProjectView(createDraft('rsc-ii', datasets[0].metadata.regulation.id));
    project.userData.activities = [{ ...activity, evidenceIds: ['e-1', 'e-2'] }];
    project.userData.evidence = [evidence, { id: 'e-2', title: 'Ata do colegiado' }];
    const preview = buildMemorialPreview(
      project,
      pageMap([
        { evidenceId: 'e-2', startPage: 1, endPage: 2 },
        { evidenceId: 'e-1', startPage: 3, endPage: 3 },
      ]),
    );
    expect(preview).toContain(
      'Comprovantes no PDF consolidado: Ata do colegiado (pp. 1–2); Portaria de coordenação (p. 3).',
    );
  });

  it('mantém o Memorial inalterado quando não há comprovante relacionado', () => {
    const project = activityProjectView(createDraft('rsc-ii', datasets[0].metadata.regulation.id));
    project.userData.activities = [activity];
    project.userData.evidence = [evidence];
    const unrelated: EvidencePageMap = {
      totalPages: 1,
      evidences: [
        {
          evidenceId: 'e-1',
          startPage: 1,
          endPage: 1,
          files: [],
          links: [{ level: 'rsc-ii', criterionId: 'outro', occurrenceId: 'outro' }],
        },
      ],
    };
    expect(buildMemorialDocument(project, unrelated)).toEqual(buildMemorialDocument(project));
    expect(buildMemorialPreview(project, { totalPages: 0, evidences: [] })).not.toContain(
      'Comprovantes no PDF consolidado:',
    );
  });
});
