import { useState, type FormEvent } from 'react';
import type { ProjectRepository } from '@/domain/local-project';
import { DexieProjectRepository } from '@/storage/project-repository';
import { useLocalProjects } from '@/features/local-projects/use-local-projects';
import { createProject } from '@/features/local-projects/project-files';
import { ProjectImport } from './project-import';
import { Button } from './ui/button';

const fieldClass =
  'mt-1 block w-full rounded border border-slate-500 bg-slate-950 p-2 text-slate-50';

export function LocalProjects({ repository }: { repository?: ProjectRepository }) {
  const [defaultRepository] = useState(() => new DexieProjectRepository());
  const work = useLocalProjects(repository ?? defaultRepository);
  const [formError, setFormError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setFormError('');
    try {
      const project = createProject(String(values.get('title')), String(values.get('teacher')), {
        id: String(values.get('regulationId')).trim(),
        version: String(values.get('regulationVersion')).trim(),
      });
      await work.create(project);
    } catch {
      setFormError('Preencha título, docente e referência normativa com textos não vazios.');
    }
  }

  return (
    <div className="space-y-8">
      <p className="leading-7 text-slate-300">
        Seus projetos ficam neste navegador. Exporte um arquivo JSON para manter uma cópia ou
        continuar em outro computador. Limpar os dados do navegador remove as cópias locais.
      </p>
      {work.error && (
        <p role="alert" className="text-rose-200">
          {work.error}
        </p>
      )}
      <section aria-label="Projetos locais" className="space-y-3">
        <h2 className="text-xl font-semibold">Projetos locais</h2>
        <Button variant="outline" disabled={work.busy} onClick={() => void work.refresh()}>
          Atualizar lista
        </Button>
        {work.busy && <p>Carregando…</p>}
        {!work.busy && !work.projects.length && <p>Nenhum projeto local.</p>}
        <ul className="space-y-2">
          {work.projects.map((record) => (
            <li key={record.localId}>
              <Button
                variant="outline"
                className="h-auto min-h-10 w-full justify-start break-words text-left"
                disabled={work.busy}
                aria-pressed={work.active?.localId === record.localId}
                onClick={() => void work.select(record.localId)}
              >
                {record.project.schemaVersion === '2.0'
                  ? record.project.userData.title
                  : `Projeto legado ${record.localId.slice(0, 8)}`}
              </Button>
            </li>
          ))}
        </ul>
      </section>
      <details>
        <summary className="cursor-pointer text-lg font-semibold">Criar projeto</summary>
        <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-3">
          <label className="block">
            Título do projeto
            <input className={fieldClass} name="title" required disabled={work.busy} />
          </label>
          <label className="block">
            Nome do docente
            <input className={fieldClass} name="teacher" required disabled={work.busy} />
          </label>
          <p className="text-sm text-amber-200">
            Informe a referência normativa declarada do projeto. O catálogo atual ainda está
            pendente de validação; nenhuma versão é atribuída automaticamente.
          </p>
          <label className="block">
            Identificador da normativa
            <input className={fieldClass} name="regulationId" required disabled={work.busy} />
          </label>
          <label className="block">
            Versão normativa do novo projeto
            <input className={fieldClass} name="regulationVersion" required disabled={work.busy} />
          </label>
          {formError && (
            <p role="alert" className="text-rose-200">
              {formError}
            </p>
          )}
          <Button disabled={work.busy} type="submit">
            Criar e abrir
          </Button>
        </form>
      </details>
      {work.active && (
        <section aria-label="Edição do projeto" className="space-y-4">
          <h2 className="text-xl font-semibold">Projeto aberto</h2>
          <p className="break-words text-sm text-slate-300">
            Referência preservada: {work.active.project.regulation.id} /{' '}
            {work.active.project.regulation.version}
          </p>
          <p className="text-sm text-slate-300">
            Edite os dados em JSON. Alterações válidas são salvas automaticamente. O formato{' '}
            {work.active.project.schemaVersion} e as versões declaradas são preservados na
            exportação.
          </p>
          <label className="block" htmlFor="project-data">
            Dados editáveis do projeto (JSON)
          </label>
          <textarea
            id="project-data"
            className={`${fieldClass} min-h-80 font-mono text-sm`}
            value={work.draft}
            disabled={work.busy}
            spellCheck={false}
            onChange={(event) => work.edit(event.target.value)}
            aria-describedby="save-state"
            aria-invalid={Boolean(work.invalid)}
          />
          <div id="save-state" role="status" aria-live="polite">
            {work.invalid ||
              (work.saveState.status === 'saving'
                ? 'Salvando…'
                : work.saveState.status === 'saved'
                  ? 'Salvo localmente'
                  : `Erro ao salvar: ${work.saveState.message}`)}
          </div>
          <div className="flex flex-wrap gap-3">
            {work.saveState.status === 'error' && (
              <Button disabled={work.busy} onClick={() => void work.retry()}>
                Tentar salvar novamente
              </Button>
            )}
            {(work.invalid || work.saveState.status === 'error') && (
              <Button
                variant="outline"
                disabled={work.busy}
                onClick={() => {
                  if (
                    window.confirm(
                      'Descartar as alterações da tela e reabrir a última versão salva?',
                    )
                  )
                    void work.reopenSaved();
                }}
              >
                Reabrir versão salva
              </Button>
            )}
            <Button disabled={work.busy || Boolean(work.invalid)} onClick={work.export}>
              Exportar JSON
            </Button>
            <Button variant="outline" disabled={work.busy} onClick={() => void work.duplicate()}>
              Duplicar projeto
            </Button>
            <Button
              variant="outline"
              disabled={work.busy}
              onClick={() => {
                if (
                  window.confirm(
                    'Excluir este projeto local? Exporte uma cópia antes de excluir se quiser preservá-lo.',
                  )
                )
                  void work.remove();
              }}
            >
              Excluir projeto
            </Button>
          </div>
        </section>
      )}
      <section aria-label="Importar projeto">
        <h2 className="text-xl font-semibold">Verificar arquivo de projeto</h2>
        <ProjectImport disabled={work.busy} onImport={(project) => void work.create(project)} />
      </section>
    </div>
  );
}
