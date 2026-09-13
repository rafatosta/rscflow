import type { OccurrenceProjectExport } from '@/domain/criterion-entry';
import type { EvidencePageMap } from '@/domain/evidence-page-map';
import type { FileResolver } from '@/domain/local-files';
import type { TypedProjectExport } from '@/domain/project';
import type { Regulation } from '@/domain/regulation';
import type { CalculationResult } from '@/domain/scoring';
import type { NormativeProcessDocument } from '@/normative-documents/model';
import type { EvidenceBundleResult } from '@/pdf/evidence-bundle';

export type ProcessArtifact = 'evidence' | 'memorial' | 'forms';
export type ProcessArtifactStatus = {
  artifact: ProcessArtifact;
  status: 'produced' | 'failed' | 'skipped';
  message?: string;
};
export type ProcessArtifacts = {
  evidence: Uint8Array;
  memorial: Uint8Array;
  forms: Uint8Array;
  pageMap: EvidencePageMap;
};
export type ProcessGenerationResult =
  | { status: 'success'; statuses: ProcessArtifactStatus[]; artifacts: ProcessArtifacts }
  | { status: 'error'; statuses: ProcessArtifactStatus[] };

export type ProcessGenerationDependencies = {
  evidence: (
    project: OccurrenceProjectExport,
    resolver: FileResolver,
  ) => Promise<EvidenceBundleResult>;
  memorial: (project: TypedProjectExport, pageMap: EvidencePageMap) => Promise<Uint8Array>;
  model: (
    project: TypedProjectExport,
    regulation: Regulation,
    scoring: CalculationResult,
    pageMap: EvidencePageMap,
  ) => NormativeProcessDocument;
  forms: (model: NormativeProcessDocument) => Promise<Uint8Array>;
};

const defaults: Omit<ProcessGenerationDependencies, 'model'> = {
  evidence: async (project, resolver) =>
    import('@/pdf/evidence-bundle').then(({ createEvidenceBundle }) =>
      createEvidenceBundle(project, resolver),
    ),
  memorial: async (project, pageMap) =>
    import('@/pdf/generator').then(({ generateMemorialPdf }) =>
      generateMemorialPdf(project, pageMap),
    ),
  forms: async (model) =>
    import('@/pdf/normative-forms').then(({ generateNormativeFormsPdf }) =>
      generateNormativeFormsPdf(model),
    ),
};

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Falha inesperada na geração.';
}

/** Coordena uma geração atômica; bytes parciais nunca são retornados como conjunto final. */
export async function generateProcessArtifacts(
  input: {
    project: TypedProjectExport;
    evidenceProject: OccurrenceProjectExport;
    regulation: Regulation;
    scoring: CalculationResult;
    resolver: FileResolver;
  },
  injected: Partial<ProcessGenerationDependencies> = {},
): Promise<ProcessGenerationResult> {
  const snapshot = structuredClone({
    project: input.project,
    evidenceProject: input.evidenceProject,
    regulation: input.regulation,
    scoring: input.scoring,
  });
  const model =
    injected.model ?? (await import('@/normative-documents/model')).buildNormativeProcessDocument;
  const dependencies: ProcessGenerationDependencies = { ...defaults, ...injected, model };
  let evidence: EvidenceBundleResult;
  try {
    evidence = await dependencies.evidence(snapshot.evidenceProject, input.resolver);
  } catch (error) {
    return {
      status: 'error',
      statuses: [
        { artifact: 'evidence', status: 'failed', message: message(error) },
        {
          artifact: 'memorial',
          status: 'skipped',
          message: 'Depende do mapa de páginas dos comprovantes.',
        },
        {
          artifact: 'forms',
          status: 'skipped',
          message: 'Depende do mapa de páginas dos comprovantes.',
        },
      ],
    };
  }
  if (evidence.status === 'error')
    return {
      status: 'error',
      statuses: [
        {
          artifact: 'evidence',
          status: 'failed',
          message: evidence.issues.map((issue) => issue.message).join(' '),
        },
        {
          artifact: 'memorial',
          status: 'skipped',
          message: 'Depende do mapa de páginas dos comprovantes.',
        },
        {
          artifact: 'forms',
          status: 'skipped',
          message: 'Depende do mapa de páginas dos comprovantes.',
        },
      ],
    };

  const pageMap = evidence.pageMap;
  const generated = await Promise.allSettled([
    dependencies.memorial(snapshot.project, pageMap),
    Promise.resolve()
      .then(() =>
        dependencies.model(snapshot.project, snapshot.regulation, snapshot.scoring, pageMap),
      )
      .then(dependencies.forms),
  ]);
  const statuses: ProcessArtifactStatus[] = [
    { artifact: 'evidence', status: 'produced' },
    generated[0].status === 'fulfilled'
      ? { artifact: 'memorial', status: 'produced' }
      : { artifact: 'memorial', status: 'failed', message: message(generated[0].reason) },
    generated[1].status === 'fulfilled'
      ? { artifact: 'forms', status: 'produced' }
      : { artifact: 'forms', status: 'failed', message: message(generated[1].reason) },
  ];
  if (generated[0].status === 'rejected' || generated[1].status === 'rejected')
    return { status: 'error', statuses };
  return {
    status: 'success',
    statuses,
    artifacts: {
      evidence: evidence.bytes,
      memorial: generated[0].value,
      forms: generated[1].value,
      pageMap,
    },
  };
}
