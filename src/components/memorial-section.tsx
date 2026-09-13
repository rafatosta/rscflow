import type { Activity, Evidence, Memorial, Education } from '@/domain/models';
import {
  activityMemorialSection,
  activityTextIsOutdated,
  chronologicalActivities,
  displayedActivityText,
  editActivityText,
  generateActivityText,
  keepActivityText,
  memorialSections,
  regenerateActivityText,
  generateEducationText,
  type MemorialSectionId,
} from '@/memorial/generator';
import { Button } from './ui/button';

type Props = {
  education?: Education[];
  projectTitle: string;
  memorial: Memorial | null;
  activities: Activity[];
  evidences: Evidence[];
  disabled: boolean;
  onSave: (patch: { memorial: Memorial; activities: Activity[] }) => void;
};

function currentMemorial(projectTitle: string, memorial: Memorial | null): Memorial {
  return (
    memorial ?? {
      title: projectTitle,
      introduction: `Este Memorial Descritivo reúne os dados de formação e os registros profissionais do projeto ${projectTitle}.`,
      conclusion:
        'Os registros e documentos apresentados compõem este memorial para apreciação no processo de Reconhecimento de Saberes e Competências.',
      sectionTexts: {},
    }
  );
}

export function MemorialSection({
  projectTitle,
  memorial,
  activities,
  evidences,
  disabled,
  onSave,
  education = [],
}: Props) {
  const value = currentMemorial(projectTitle, memorial);
  const ordered = chronologicalActivities(activities);
  const saveMemorial = (next: Memorial) => onSave({ memorial: next, activities });
  const saveSection = (section: MemorialSectionId, text: string) =>
    saveMemorial({
      ...value,
      sectionTexts: { ...value.sectionTexts, [section]: text },
    });
  const saveActivity = (next: Activity) =>
    onSave({
      memorial: value,
      activities: activities.map((activity) => (activity.id === next.id ? next : activity)),
    });

  return (
    <div className="space-y-6">
      <section className="panel space-y-5">
        <div>
          <h2 className="section-title">Editor do Memorial Descritivo</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Os textos-base são gerados localmente a partir dos dados cadastrados. Você pode editar
            todo o conteúdo antes da prévia.
          </p>
        </div>
        <label className="block" htmlFor="memorial-title">
          Título do memorial
          <input
            id="memorial-title"
            className="field"
            value={value.title}
            disabled={disabled}
            onChange={(event) => saveMemorial({ ...value, title: event.target.value })}
          />
        </label>
        <label className="block" htmlFor="memorial-introduction">
          Apresentação introdutória{' '}
          <span className="text-sm text-slate-400">(opção editorial)</span>
        </label>
        <textarea
          id="memorial-introduction"
          className="field min-h-32"
          value={value.introduction}
          disabled={disabled}
          onChange={(event) => saveMemorial({ ...value, introduction: event.target.value })}
        />
        {
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() =>
              onSave({
                memorial: value,
                activities: activities.map((activity) =>
                  activity.generatedText === undefined
                    ? regenerateActivityText(activity, evidences)
                    : activity,
                ),
              })
            }
          >
            Preparar memorial com os dados cadastrados
          </Button>
        }
      </section>

      {memorialSections.map((section) => {
        const sectionActivities = ordered.filter(
          (activity) => activityMemorialSection(activity) === section.id,
        );
        return (
          <section className="panel space-y-4" key={section.id} aria-labelledby={section.id}>
            <div>
              <h2 id={section.id} className="section-title">
                {section.title}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Texto complementar da seção e experiências em ordem cronológica.
              </p>
            </div>
            {section.id === 'education' &&
              education.map((item) => (
                <p key={item.id} className="whitespace-pre-wrap">
                  {generateEducationText(item)}
                </p>
              ))}
            <label className="block" htmlFor={`memorial-${section.id}`}>
              Texto complementar <span className="text-sm text-slate-400">(opcional)</span>
            </label>
            <textarea
              id={`memorial-${section.id}`}
              className="field min-h-28"
              value={value.sectionTexts?.[section.id] ?? ''}
              disabled={disabled}
              onChange={(event) => saveSection(section.id, event.target.value)}
            />
            {sectionActivities.map((activity) => {
              const generated = generateActivityText(activity, evidences);
              const outdated = activityTextIsOutdated(activity, evidences);
              return (
                <article className="subpanel" key={activity.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold">{activity.title}</h3>
                    <span className="text-sm text-slate-300">
                      {activity.isManuallyEdited ? 'Editado manualmente' : 'Texto-base'}
                    </span>
                  </div>
                  {outdated && (
                    <div className="notice mt-3 border-amber-500 p-3 text-amber-100" role="alert">
                      <p>Os dados estruturados mudaram depois da última geração.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={disabled}
                          onClick={() => saveActivity(keepActivityText(activity, evidences))}
                        >
                          Manter texto atual
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={disabled}
                          onClick={() => saveActivity(regenerateActivityText(activity, evidences))}
                        >
                          Regenerar texto
                        </Button>
                      </div>
                    </div>
                  )}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-cyan-200">
                      Ver texto-base atual
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap rounded bg-slate-950 p-3 text-sm text-slate-300">
                      {generated}
                    </p>
                  </details>
                  <label className="mt-3 block" htmlFor={`activity-text-${activity.id}`}>
                    Texto da atividade
                  </label>
                  <textarea
                    id={`activity-text-${activity.id}`}
                    className="field min-h-56"
                    value={displayedActivityText(activity, evidences)}
                    disabled={disabled}
                    onChange={(event) =>
                      saveActivity(editActivityText(activity, event.target.value, evidences))
                    }
                  />
                  {!activity.generatedText && (
                    <Button
                      className="mt-3"
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      onClick={() => saveActivity(regenerateActivityText(activity, evidences))}
                    >
                      Usar texto-base
                    </Button>
                  )}
                </article>
              );
            })}
          </section>
        );
      })}

      <section className="panel">
        <h2 className="section-title">Conclusão</h2>
        <label className="mt-4 block" htmlFor="memorial-conclusion">
          Texto da conclusão
        </label>
        <textarea
          id="memorial-conclusion"
          className="field min-h-40"
          value={value.conclusion}
          disabled={disabled}
          onChange={(event) => saveMemorial({ ...value, conclusion: event.target.value })}
        />
      </section>
    </div>
  );
}
