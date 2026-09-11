import { Link } from 'react-router-dom';
import type { FormEvent } from 'react';
import type { LocalProject } from '@/domain/local-project';
import type { TypedProjectExport } from '@/domain/project';
import {
  completion,
  levelLabel,
  levels,
  linkedDataset,
  projectScoring,
} from '@/features/project-shell/project-view';
import { projectPath, type Section } from '@/features/project-shell/routes';
import { buildMemorialPreview } from '@/memorial/preview';
import { Button } from './ui/button';

type Props = {
  record: LocalProject;
  section: Section;
  draft: string;
  invalid: string;
  busy: boolean;
  edit: (text: string) => void;
  onExport: () => void;
};
function values(event: FormEvent<HTMLFormElement>) {
  return Object.fromEntries(new FormData(event.currentTarget));
}

function JsonEditor({
  draft,
  edit,
  busy,
  invalid,
}: Pick<Props, 'draft' | 'edit' | 'busy' | 'invalid'>) {
  return (
    <div className="space-y-3">
      <label htmlFor="project-data">Dados editáveis do projeto (JSON)</label>
      <textarea
        id="project-data"
        className="field min-h-80 font-mono text-sm"
        value={draft}
        onChange={(event) => edit(event.target.value)}
        disabled={busy}
        aria-invalid={Boolean(invalid)}
        aria-describedby={invalid ? 'data-error' : undefined}
      />
      {invalid && (
        <p id="data-error" role="alert" className="text-rose-200">
          {invalid}
        </p>
      )}
    </div>
  );
}

export function ProjectSection(props: Props) {
  const { record, section, edit, busy, onExport } = props;
  if (record.project.schemaVersion === '1.0')
    return (
      <div className="panel space-y-5">
        <h2 className="text-xl font-semibold">Projeto no formato legado</h2>
        <p>
          Os dados originais são preservados sem conversão automática. Você pode editá-los e
          exportá-los neste formato.
        </p>
        <JsonEditor {...props} />
        <Button onClick={onExport} disabled={Boolean(props.invalid)}>
          Exportar JSON
        </Button>
      </div>
    );
  const project: TypedProjectExport = record.project;
  const data = project.userData;
  const update = (patch: Partial<typeof data>) => edit(JSON.stringify({ ...data, ...patch }));
  const progress = completion(project);
  const dataset = linkedDataset(project);
  const scoring = projectScoring(project);

  if (section === '')
    return (
      <div className="space-y-6">
        <section className="panel">
          <h2 className="text-xl font-semibold">Seu memorial, etapa por etapa</h2>
          <p className="mt-3 text-slate-300">
            {progress.percent}% de preenchimento aproximado. Este indicador organiza o trabalho; não
            representa pontuação ou elegibilidade.
          </p>
          <progress
            aria-label="Progresso de preenchimento"
            className="my-4 h-3 w-full accent-cyan-400"
            value={progress.percent}
            max={100}
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            {progress.items.map((item) => (
              <li key={item.section}>
                <Link
                  className="block rounded border border-slate-600 p-3 hover:bg-slate-800"
                  to={projectPath(record.localId, item.section)}
                >
                  {item.complete ? '✓ ' : '○ '}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2 className="text-xl font-semibold">Regulamento vinculado</h2>
          <p className="mt-3 break-words">
            {project.regulation.id} / {project.regulation.version ?? 'versão normativa pendente'}
          </p>
          <p className="mt-3 text-amber-200">
            {scoring.status === 'unavailable'
              ? scoring.issues.map((issue) => issue.message).join(' ')
              : 'Dataset disponível para avaliação quantitativa.'}
          </p>
        </section>
      </div>
    );

  if (section === 'profile')
    return (
      <section className="panel">
        <h2 className="mb-4 text-xl font-semibold">Identificação</h2>
        <form
          className="space-y-4"
          onSubmit={(event) => event.preventDefault()}
          onChange={(event) => {
            const form = values(event);
            update({
              title: String(form.title),
              teacher: {
                name: String(form.name),
                ...(form.registration ? { registration: String(form.registration) } : {}),
                ...(form.campus ? { campus: String(form.campus) } : {}),
              },
              request: {
                ...data.request,
                level: String(form.level) as NonNullable<typeof data.request>['level'],
              },
            });
          }}
        >
          <label className="block">
            Título do projeto
            <input
              name="title"
              className="field"
              defaultValue={data.title}
              disabled={busy}
              required
            />
          </label>
          <label className="block">
            Nome do docente
            <input name="name" className="field" defaultValue={data.teacher.name} disabled={busy} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              Matrícula
              <input
                name="registration"
                className="field"
                defaultValue={data.teacher.registration}
                disabled={busy}
              />
            </label>
            <label>
              Campus
              <input
                name="campus"
                className="field"
                defaultValue={data.teacher.campus}
                disabled={busy}
              />
            </label>
          </div>
          <label className="block">
            RSC pretendido
            <select
              name="level"
              className="field"
              defaultValue={data.request?.level ?? ''}
              disabled={busy}
              required
            >
              <option value="" disabled>
                Selecione
              </option>
              {levels.map((level) => (
                <option key={level} value={level}>
                  {levelLabel(level)}
                </option>
              ))}
            </select>
          </label>
        </form>
      </section>
    );

  if (section === 'education')
    return (
      <section className="panel space-y-5">
        <h2 className="text-xl font-semibold">Formações registradas</h2>
        {!data.education.length && (
          <p className="text-slate-300">
            Nenhuma formação registrada. Adicione um curso ou uma titulação.
          </p>
        )}
        <ul className="space-y-3">
          {data.education.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-600 p-3"
            >
              <span>
                {item.title} — {item.institution}
                {item.completedAt ? ` · ${item.completedAt}` : ''}
              </span>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  update({ education: data.education.filter((entry) => entry.id !== item.id) })
                }
                aria-label={`Remover formação ${item.title}`}
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = values(event);
            update({
              education: [
                ...data.education,
                {
                  id: crypto.randomUUID(),
                  title: String(form.title),
                  institution: String(form.institution),
                  ...(form.date ? { completedAt: String(form.date) } : {}),
                },
              ],
            });
            event.currentTarget.reset();
          }}
        >
          <label>
            Curso ou titulação
            <input className="field" name="title" required disabled={busy} />
          </label>
          <label>
            Instituição
            <input className="field" name="institution" required disabled={busy} />
          </label>
          <label>
            Data de conclusão
            <input className="field" type="date" name="date" disabled={busy} />
          </label>
          <Button type="submit" disabled={busy} className="self-end">
            Adicionar formação
          </Button>
        </form>
      </section>
    );

  if (section === 'activities')
    return (
      <div className="space-y-6">
        <section className="panel space-y-4">
          <h2 className="text-xl font-semibold">Atividades da trajetória</h2>
          {!data.activities.length && (
            <p className="text-slate-300">
              Nenhuma atividade registrada. Comece descrevendo uma experiência.
            </p>
          )}
          <ul className="space-y-3">
            {data.activities.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-600 p-3"
              >
                <span className="min-w-0 break-words">
                  {item.title} · quantidade: {item.quantity}
                </span>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    update({ activities: data.activities.filter((entry) => entry.id !== item.id) })
                  }
                  aria-label={`Remover atividade ${item.title}`}
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = values(event);
              update({
                activities: [
                  ...data.activities,
                  {
                    id: crypto.randomUUID(),
                    title: String(form.title),
                    quantity: Number(form.quantity),
                    criterionId: String(form.criterionId ?? ''),
                    evidenceIds: [],
                  },
                ],
              });
              event.currentTarget.reset();
            }}
          >
            <label className="block">
              Descrição da atividade
              <input className="field" name="title" required disabled={busy} />
            </label>
            <label className="block">
              Quantidade declarada
              <input
                className="field"
                type="number"
                min="0"
                step="any"
                name="quantity"
                required
                disabled={busy}
              />
            </label>
            {project.schemaVersion === '2.0' && (
              <label className="block">
                Identificador do critério no arquivo original
                <input className="field" name="criterionId" required disabled={busy} />
              </label>
            )}
            <Button disabled={busy} type="submit">
              Adicionar atividade
            </Button>
          </form>
          <p className="text-sm text-slate-300">
            O enquadramento e a unidade devem ser conferidos em Critérios antes do cálculo.
          </p>
        </section>
        <section className="panel space-y-4">
          <h2 className="text-xl font-semibold">Referências de comprovantes</h2>
          <p className="text-sm text-slate-300">
            Registre a identificação do documento. Arquivos binários não são anexados nesta etapa.
          </p>
          <ul>
            {data.evidence.map((item) => (
              <li key={item.id}>
                {item.title}
                {item.fileName ? ` — ${item.fileName}` : ''}
              </li>
            ))}
          </ul>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = values(event);
              update({
                evidence: [
                  ...data.evidence,
                  {
                    id: crypto.randomUUID(),
                    title: String(form.title),
                    ...(form.fileName ? { fileName: String(form.fileName) } : {}),
                  },
                ],
              });
              event.currentTarget.reset();
            }}
          >
            <label className="block">
              Título do comprovante
              <input name="title" className="field" required disabled={busy} />
            </label>
            <label className="block">
              Nome do arquivo
              <input name="fileName" className="field" disabled={busy} />
            </label>
            <Button disabled={busy} type="submit">
              Adicionar referência
            </Button>
          </form>
        </section>
      </div>
    );

  if (section === 'criteria')
    return (
      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Enquadramento das atividades</h2>
        {!dataset || dataset.metadata.status !== 'validated' ? (
          <p className="text-amber-200">
            O catálogo vinculado não está disponível para enquadramento validado. Os vínculos
            existentes são preservados; nenhuma opção normativa será inventada.
          </p>
        ) : (
          <p>Escolha um único critério e nível por atividade.</p>
        )}
        {!data.activities.length && (
          <p>
            Nenhuma atividade para enquadrar.{' '}
            <Link
              className="text-cyan-300 underline"
              to={projectPath(record.localId, 'activities')}
            >
              Registrar trajetória
            </Link>
          </p>
        )}
        {data.activities.map((activity) => (
          <div className="rounded border border-slate-600 p-4" key={activity.id}>
            <h3 className="font-medium">{activity.title}</h3>
            <p className="my-2 break-words text-sm text-slate-300">
              Vínculo atual: {activity.criterionId || 'não definido'} ·{' '}
              {activity.selectedLevel ? levelLabel(activity.selectedLevel) : 'nível não escolhido'}
            </p>
            {dataset?.metadata.status === 'validated' && (
              <label className="block">
                Critério de {activity.title}
                <select
                  className="field"
                  disabled={busy}
                  value={activity.criterionId}
                  onChange={(event) => {
                    const criterionId = event.target.value;
                    const level = dataset.levels.find((entry) =>
                      entry.criteria.some((criterion) => criterion.id === criterionId),
                    );
                    if (level)
                      update({
                        activities: data.activities.map((item) =>
                          item.id === activity.id
                            ? { ...item, criterionId, selectedLevel: level.section }
                            : item,
                        ),
                      });
                  }}
                >
                  <option value="">Selecione</option>
                  {dataset.levels.map((level) => (
                    <optgroup key={level.section} label={levelLabel(level.section)}>
                      {level.criteria.map((criterion) => (
                        <option key={criterion.id} value={criterion.id}>
                          {criterion.code} — {criterion.description} ({criterion.unit})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            )}
          </div>
        ))}
      </section>
    );

  if (section === 'scoring')
    return (
      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Resultado quantitativo</h2>
        {scoring.status === 'unavailable' ? (
          <>
            <p className="text-amber-200">Cálculo indisponível</p>
            <ul className="list-inside list-disc">
              {scoring.issues.map((issue, index) => (
                <li key={index}>{issue.message}</li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p>
              {scoring.status === 'quantitative-requirements-met'
                ? 'Requisitos quantitativos atingidos'
                : 'Requisitos quantitativos ainda não atingidos'}
            </p>
            <ul>
              {scoring.levels.map((level) => (
                <li key={level.level}>
                  {levelLabel(level.level)}: {level.score}
                </li>
              ))}
            </ul>
            <p>Total: {scoring.total}</p>
          </>
        )}
        <p className="text-sm text-slate-300">
          O resultado quantitativo não representa concessão de RSC.
        </p>
      </section>
    );

  if (section === 'memorial')
    return (
      <section className="panel">
        <h2 className="mb-4 text-xl font-semibold">Texto do memorial</h2>
        <form
          className="space-y-4"
          onSubmit={(event) => event.preventDefault()}
          onChange={(event) => {
            const form = values(event);
            update({
              memorial: {
                title: String(form.title),
                introduction: String(form.introduction),
                conclusion: String(form.conclusion),
              },
            });
          }}
        >
          <label className="block">
            Título do memorial
            <input
              className="field"
              name="title"
              defaultValue={data.memorial?.title ?? data.title}
              disabled={busy}
              required
            />
          </label>
          <label className="block">
            Introdução
            <textarea
              className="field min-h-40"
              name="introduction"
              defaultValue={data.memorial?.introduction ?? ''}
              disabled={busy}
            />
          </label>
          <label className="block">
            Conclusão
            <textarea
              className="field min-h-40"
              name="conclusion"
              defaultValue={data.memorial?.conclusion ?? ''}
              disabled={busy}
            />
          </label>
        </form>
        <Link
          className="mt-5 inline-block text-cyan-300 underline"
          to={projectPath(record.localId, 'preview')}
        >
          Ver prévia do memorial
        </Link>
      </section>
    );

  if (section === 'preview')
    return (
      <section className="panel">
        <h2 className="mb-4 text-xl font-semibold">Prévia textual</h2>
        <p className="mb-6 text-sm text-slate-300">
          Montada com os textos, formações e atividades registrados no projeto.
        </p>
        <article className="whitespace-pre-wrap break-words rounded bg-white p-5 leading-8 text-slate-950">
          {buildMemorialPreview(project)}
        </article>
      </section>
    );

  if (section === 'review')
    return (
      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Revisão do preenchimento</h2>
        <p className="text-slate-300">
          Esta lista ajuda a organizar o memorial e não substitui a análise normativa.
        </p>
        <ul className="space-y-3">
          {progress.items.map((item) => (
            <li key={item.section}>
              <Link
                className="text-cyan-300 underline"
                to={projectPath(record.localId, item.section)}
              >
                {item.complete ? 'Preenchido' : 'A revisar'}: {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <p>Comprovantes registrados: {data.evidence.length}</p>
        <p className="text-amber-200">
          {scoring.status === 'unavailable'
            ? 'A avaliação quantitativa permanece indisponível.'
            : 'Consulte o resultado quantitativo em Pontuação.'}
        </p>
      </section>
    );

  return (
    <section className="panel space-y-5">
      <h2 className="text-xl font-semibold">Cópia portátil do projeto</h2>
      <p>
        O JSON inclui todos os dados editáveis e a referência normativa vinculada. Importe-o em
        outro navegador para continuar o trabalho.
      </p>
      <Button onClick={onExport} disabled={Boolean(props.invalid)}>
        Exportar JSON
      </Button>
      <details>
        <summary className="cursor-pointer font-medium">Edição avançada dos dados JSON</summary>
        <div className="mt-4">
          <JsonEditor {...props} />
        </div>
      </details>
    </section>
  );
}
