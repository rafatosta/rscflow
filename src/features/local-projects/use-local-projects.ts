import { useCallback, useEffect, useRef, useState } from 'react';
import type { LocalProject, ProjectRepository, SaveState } from '@/domain/local-project';
import { portableProject } from '@/domain/portable-project';
import type { ProjectExport } from '@/domain/project';
import { storageErrorMessage } from '@/storage/project-repository';
import { ProjectAutosave } from './autosave';
import { downloadProject } from './project-files';

export function useLocalProjects(repository: ProjectRepository) {
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [active, setActive] = useState<LocalProject>();
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState('');
  const [saveState, setSaveState] = useState<SaveState>({ status: 'saved' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const session = useRef<ProjectAutosave | undefined>(undefined);
  const latest = useRef<ProjectExport | undefined>(undefined);
  const invalidRef = useRef(false);

  const open = useCallback(
    (record: LocalProject | undefined) => {
      session.current?.dispose();
      session.current = record
        ? new ProjectAutosave(repository, record, (state) => {
            setSaveState(state);
            if (state.status === 'saved' && session.current) {
              const saved = session.current.current;
              setProjects((records) =>
                records.map((item) => (item.localId === saved.localId ? saved : item)),
              );
            }
          })
        : undefined;
      latest.current = record?.project;
      invalidRef.current = false;
      setInvalid('');
      setActive(record);
      setDraft(record ? JSON.stringify(record.project.userData, null, 2) : '');
      setSaveState({ status: 'saved' });
    },
    [repository],
  );

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const [records, selected] = await Promise.all([repository.list(), repository.selected()]);
        if (!cancelled) {
          setProjects(records);
          open(selected);
        }
      } catch (cause) {
        if (!cancelled) setError(storageErrorMessage(cause));
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void initialize();
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (session.current?.dirty || invalidRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void session.current?.flush();
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('visibilitychange', onHidden);
      const current = session.current;
      current?.dispose();
      void current?.flush();
    };
  }, [repository, open]);

  function edit(text: string) {
    if (!latest.current) return;
    setDraft(text);
    try {
      const value = portableProject({ ...latest.current, userData: JSON.parse(text) });
      latest.current = value;
      invalidRef.current = false;
      setInvalid('');
      session.current?.schedule(value);
    } catch {
      invalidRef.current = true;
      setInvalid(
        'Dados inválidos. Corrija o JSON e os campos obrigatórios para salvar. A última versão válida permanece armazenada.',
      );
    }
  }

  async function perform(operation: () => Promise<void>, needsFlush = true) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (
        needsFlush &&
        (invalidRef.current || (session.current && !(await session.current.flush())))
      ) {
        setError('Resolva os dados inválidos ou o erro de salvamento antes de trocar de projeto.');
        return;
      }
      await operation();
      setProjects(await repository.list());
    } catch (cause) {
      setError(storageErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function activate(record: LocalProject) {
    await repository.select(record.localId);
    open(record);
  }

  return {
    projects,
    active,
    draft,
    invalid,
    saveState,
    error,
    busy,
    edit,
    refresh: () =>
      perform(async () => {
        const selected = await repository.selected();
        open(selected);
      }),
    select: (localId: string) =>
      perform(async () => {
        const record = await repository.load(localId);
        if (!record) throw new Error('Projeto não encontrado');
        await activate(record);
      }),
    create: (project: ProjectExport) =>
      perform(async () => {
        await activate(await repository.create(project));
      }),
    duplicate: () =>
      perform(async () => {
        if (session.current)
          await activate(await repository.duplicate(session.current.current.localId));
      }),
    remove: () =>
      perform(async () => {
        if (!session.current) return;
        const record = session.current.current;
        await repository.delete(record.localId, record.revision);
        open(undefined);
      }),
    reopenSaved: () =>
      perform(async () => {
        if (!session.current) return;
        await session.current.discardPending();
        const record = await repository.load(session.current.current.localId);
        open(record);
      }, false),
    retry: () =>
      perform(async () => {
        await session.current?.flush();
      }, false),
    export: () => {
      if (!latest.current || invalidRef.current) {
        setError('Corrija os dados antes de exportar.');
        return;
      }
      try {
        downloadProject(latest.current);
      } catch (cause) {
        setError(storageErrorMessage(cause));
      }
    },
  };
}
