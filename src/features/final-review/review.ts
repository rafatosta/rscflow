import type { TypedProjectExport } from '@/domain/project';
import type { CalculationResult } from '@/domain/scoring';
import type { Section } from '@/features/project-shell/routes';
import { teacherProfileIsComplete } from '@/features/teacher-profile/profile';

export type ReviewSeverity = 'error' | 'warning' | 'info';
export type ReviewArea =
  | 'identification'
  | 'request'
  | 'education'
  | 'trajectory'
  | 'criteria'
  | 'documentation'
  | 'scoring'
  | 'memorial'
  | 'conclusion';

export type ReviewFinding = {
  id: string;
  area: ReviewArea;
  label: string;
  severity: ReviewSeverity;
  message: string;
  section: Section;
};

export type FinalReview = {
  findings: ReviewFinding[];
  counts: Record<ReviewSeverity, number>;
  blocksPdf: boolean;
};

function finding(
  area: ReviewArea,
  label: string,
  severity: ReviewSeverity,
  message: string,
  section: Section,
  suffix = '',
): ReviewFinding {
  return { id: `${area}${suffix}`, area, label, severity, message, section };
}

export function reviewProject(
  project: TypedProjectExport,
  scoring: CalculationResult,
): FinalReview {
  const { userData } = project;
  const findings: ReviewFinding[] = [];

  findings.push(
    teacherProfileIsComplete(project)
      ? finding(
          'identification',
          'Identificação',
          'info',
          'Nome, CPF, SIAPE e campus estão preenchidos e válidos.',
          'profile',
        )
      : finding(
          'identification',
          'Identificação',
          'error',
          'Complete e corrija nome, CPF, SIAPE e campus para identificar o memorial final.',
          'profile',
        ),
  );
  findings.push(
    userData.request
      ? finding(
          'request',
          'RSC pretendido',
          'info',
          `Nível selecionado: ${userData.request.level.toUpperCase().replace('RSC-', 'RSC ')}.`,
          'profile',
        )
      : finding(
          'request',
          'RSC pretendido',
          'error',
          'Selecione o nível RSC pretendido antes de gerar o documento final.',
          'profile',
        ),
  );
  findings.push(
    userData.education.length
      ? finding(
          'education',
          'Formação',
          'info',
          `${userData.education.length} registro(s) de formação incluído(s).`,
          'profile',
        )
      : finding(
          'education',
          'Formação',
          'warning',
          'Nenhuma formação foi registrada. Confira se essa seção deve permanecer vazia.',
          'profile',
        ),
  );
  findings.push(
    userData.activities.length
      ? finding(
          'trajectory',
          'Trajetória',
          'info',
          `${userData.activities.length} atividade(s) incluída(s) na trajetória.`,
          'requirements',
        )
      : finding(
          'trajectory',
          'Trajetória',
          'warning',
          'Nenhuma atividade foi registrada. Confira se a trajetória está completa.',
          'requirements',
        ),
  );

  const activitiesWithoutCriteria = userData.activities.filter(
    (activity) => !activity.criterionId || !activity.selectedLevel,
  );
  findings.push(
    activitiesWithoutCriteria.length
      ? finding(
          'criteria',
          'Enquadramentos',
          'warning',
          `${activitiesWithoutCriteria.length} atividade(s) não possui(em) nível e critério informados.`,
          'requirements',
        )
      : finding(
          'criteria',
          'Enquadramentos',
          'info',
          userData.activities.length
            ? 'Todas as atividades possuem nível e critério informados.'
            : 'Não há atividades para conferir quanto ao enquadramento.',
          'requirements',
        ),
  );

  const undocumentedActivities = userData.activities.filter(
    (activity) => activity.evidenceIds.length === 0,
  );
  const undocumentedEducation = userData.education.filter(
    (education) => !education.evidenceReference?.trim(),
  );
  if (!undocumentedActivities.length && !undocumentedEducation.length) {
    findings.push(
      finding(
        'documentation',
        'Documentação indicada',
        'info',
        userData.activities.length || userData.education.length
          ? 'Os registros possuem referências de documentação comprobatória.'
          : 'Não há registros que exijam conferência de documentação.',
        'requirements',
      ),
    );
  } else {
    for (const activity of undocumentedActivities)
      findings.push(
        finding(
          'documentation',
          'Documentação indicada',
          'warning',
          `A atividade “${activity.title}” não possui documento comprobatório informado. Isso pode afetar a avaliação do processo.`,
          'requirements',
          `-activity-${activity.id}`,
        ),
      );
    for (const education of undocumentedEducation)
      findings.push(
        finding(
          'documentation',
          'Documentação indicada',
          'warning',
          `A formação “${education.title}” não possui referência de documento comprobatório.`,
          'profile',
          `-education-${education.id}`,
        ),
      );
  }

  if (scoring.status === 'unavailable')
    findings.push(
      finding(
        'scoring',
        'Pontuação',
        'warning',
        `A pontuação não está disponível: ${scoring.issues.map((issue) => issue.message).join(' ')}`,
        'requirements',
      ),
    );
  else if (scoring.status === 'quantitative-requirements-not-met')
    findings.push(
      finding(
        'scoring',
        'Pontuação',
        'warning',
        `A pontuação calculada é ${scoring.total} e os requisitos quantitativos ainda não foram atingidos.`,
        'requirements',
      ),
    );
  else
    findings.push(
      finding(
        'scoring',
        'Pontuação',
        'info',
        `A pontuação calculada é ${scoring.total} e os requisitos quantitativos foram atingidos.`,
        'requirements',
      ),
    );

  findings.push(
    userData.memorial
      ? finding(
          'memorial',
          'Memorial',
          'info',
          'A estrutura do memorial foi iniciada e será montada com os dados atuais.',
          'memorial',
        )
      : finding(
          'memorial',
          'Memorial',
          'error',
          'Inicie o memorial para definir sua estrutura final.',
          'memorial',
        ),
  );
  findings.push(
    userData.memorial?.conclusion.trim()
      ? finding('conclusion', 'Conclusão', 'info', 'A conclusão está preenchida.', 'memorial')
      : finding(
          'conclusion',
          'Conclusão',
          'error',
          'Preencha a conclusão antes de gerar o PDF final.',
          'memorial',
        ),
  );

  const counts = findings.reduce<Record<ReviewSeverity, number>>(
    (result, item) => ({ ...result, [item.severity]: result[item.severity] + 1 }),
    { error: 0, warning: 0, info: 0 },
  );
  return { findings, counts, blocksPdf: counts.error > 0 };
}
