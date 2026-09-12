import { useId, useState, type KeyboardEvent } from 'react';
import type { Regulation, RscLevel } from '@/domain/regulation';
import {
  criterionProvenanceLabel,
  criterionStatusLabel,
  searchCriteria,
} from '@/features/criteria/criteria-explorer';
import { levelLabel } from '@/features/project-shell/project-view';

export function CriteriaExplorer({
  dataset,
  initialLevel = 'rsc-i',
}: {
  dataset?: Regulation;
  initialLevel?: RscLevel;
}) {
  const [level, setLevel] = useState<RscLevel>(initialLevel);
  const [query, setQuery] = useState('');
  const panelId = useId();
  const current = dataset?.levels.find((item) => item.section === level);
  const matches = dataset ? searchCriteria(dataset, query, level) : [];

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    if (!dataset) return;
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % dataset.levels.length;
    if (event.key === 'ArrowLeft')
      nextIndex = (currentIndex - 1 + dataset.levels.length) % dataset.levels.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = dataset.levels.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    setLevel(dataset.levels[nextIndex].section);
    const tabs =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]');
    tabs?.[nextIndex]?.focus();
  }

  return (
    <section className="panel space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Explorar critérios RSC</h2>
        <p className="mt-2 text-slate-300">
          Consulte o catálogo vinculado. Esta tela não altera atividades nem calcula pontuação.
        </p>
      </div>

      {!dataset ? (
        <p role="status" className="rounded border border-amber-500 p-4 text-amber-200">
          A versão normativa vinculada ao projeto não está disponível neste navegador.
        </p>
      ) : (
        <>
          <div
            role="status"
            className={`rounded border p-4 ${
              dataset.metadata.status === 'validated'
                ? 'border-emerald-600 text-emerald-200'
                : 'border-amber-500 text-amber-200'
            }`}
          >
            <p className="font-medium">{criterionStatusLabel(dataset.metadata.status)}</p>
            <p className="mt-1 text-sm">{dataset.metadata.notice}</p>
          </div>

          <div role="tablist" aria-label="Níveis RSC" className="flex flex-wrap gap-2">
            {dataset.levels.map((item, index) => (
              <button
                key={item.section}
                id={`${panelId}-${item.section}-tab`}
                type="button"
                role="tab"
                aria-selected={level === item.section}
                aria-controls={`${panelId}-panel`}
                tabIndex={level === item.section ? 0 : -1}
                className={`rounded-md border px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                  level === item.section
                    ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                    : 'border-slate-600 hover:bg-slate-800'
                }`}
                onClick={() => setLevel(item.section)}
                onKeyDown={(event) => moveTab(event, index)}
              >
                {levelLabel(item.section)}
              </button>
            ))}
          </div>

          <div
            id={`${panelId}-panel`}
            role="tabpanel"
            aria-labelledby={`${panelId}-${level}-tab`}
            className="space-y-5"
          >
            <label htmlFor={`${panelId}-search`}>
              Buscar no {levelLabel(level)}
              <span className="mt-1 block text-sm text-slate-400">
                Pesquise por descrição, diretriz, código ou unidade.
              </span>
              <input
                id={`${panelId}-search`}
                aria-label={`Buscar no ${levelLabel(level)}`}
                className="field"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            {!current?.criteria.length ? (
              <p className="rounded border border-dashed border-slate-600 p-4 text-slate-300">
                Este nível ainda não contém critérios transcritos no dataset vinculado.
              </p>
            ) : !matches.length ? (
              <p role="status" className="rounded border border-slate-600 p-4 text-slate-300">
                Nenhum critério corresponde à busca neste nível.
              </p>
            ) : (
              <div className="space-y-6">
                {current.directives.map((directive) => {
                  const criteria = matches.filter(
                    ({ criterion }) => criterion.directiveId === directive.id,
                  );
                  if (!criteria.length) return null;
                  return (
                    <section
                      key={directive.id}
                      className="space-y-3"
                      aria-labelledby={directive.id}
                    >
                      <div>
                        <h3 id={directive.id} className="text-lg font-semibold text-cyan-200">
                          {directive.code} — {directive.title}
                        </h3>
                        <p className="text-sm text-slate-300">
                          Pontuação máxima da diretriz: {directive.maxScore}
                          {directive.weight === undefined ? '' : ` · Peso: ${directive.weight}`}
                        </p>
                      </div>
                      <ul className="grid gap-3">
                        {criteria.map(({ criterion }) => (
                          <li key={criterion.id} className="rounded-lg border border-slate-600 p-4">
                            <article aria-labelledby={`${criterion.id}-title`}>
                              <h4 id={`${criterion.id}-title`} className="font-semibold">
                                {criterion.code} — {criterion.description}
                              </h4>
                              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                  <dt className="text-slate-400">Fator</dt>
                                  <dd>{criterion.factor}</dd>
                                </div>
                                <div>
                                  <dt className="text-slate-400">Unidade</dt>
                                  <dd>{criterion.unit}</dd>
                                </div>
                                <div>
                                  <dt className="text-slate-400">Quantidade máxima</dt>
                                  <dd>{criterion.maxQuantity}</dd>
                                </div>
                                <div>
                                  <dt className="text-slate-400">Peso</dt>
                                  <dd>{criterion.weight}</dd>
                                </div>
                              </dl>
                              <div className="mt-3 border-t border-slate-700 pt-3 text-sm text-slate-300">
                                <p>{criterionProvenanceLabel(criterion.provenance)}</p>
                                {criterion.provenance.issue && (
                                  <p role="alert" className="mt-1 text-amber-200 break-words">
                                    {criterion.provenance.issue.description}
                                  </p>
                                )}
                                <p className="mt-1 break-words">
                                  Origem: {criterion.provenance.sourceReference}
                                </p>
                                {criterion.provenance.validatedBy && (
                                  <p className="mt-1 break-words">
                                    Validação: {criterion.provenance.validatedBy}
                                  </p>
                                )}
                              </div>
                            </article>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
