import { projectFingerprint } from './backup-status';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LocalProject, ProjectRepository, SaveState } from '@/domain/local-project';
import { portableProject } from '@/domain/portable-project';
import type { ProjectExport } from '@/domain/project';
import { storageErrorMessage } from '@/storage/project-repository';
import { ProjectAutosave } from './autosave';
import { downloadProject } from './project-files';
import type { ProjectChange } from '@/domain/local-files';
import type { RestorableBackup } from './restorable-backup';

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
  const mutation = useRef<Promise<boolean> | undefined>(undefined);
  const [formDirty, setFormDirty] = useState(false);
  const formDirtyRef = useRef(false);

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
              setActive((record) => (record?.localId === saved.localId ? saved : record));
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
      if (
        session.current?.dirty ||
        invalidRef.current ||
        mutation.current ||
        formDirtyRef.current
      ) {
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
      setActive((record) => (record ? { ...record, project: value } : record));
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

  function editProject(project: ProjectExport) {
    try {
      const value = portableProject(JSON.parse(JSON.stringify(project)));
      latest.current = value;
      edit(JSON.stringify(value.userData));
    } catch {
      invalidRef.current = true;
      setInvalid('Dados inválidos. A última versão válida permanece armazenada.');
    }
  }

  async function changeProject(change: ProjectChange): Promise<boolean> {
    if (busy || mutation.current) return false;
    setBusy(true);
    setError('');
    const operation = (async () => {
      try {
        if (invalidRef.current || !session.current || !(await session.current.flush()))
          return false;
        const current = session.current.current;
        const next = await change(current.project);
        if (next.files?.length && !repository.updateWithFiles)
          throw new Error('Este armazenamento não oferece suporte a arquivos.');
        const record = next.files?.length
          ? await repository.updateWithFiles!(
              current.localId,
              current.revision,
              next.project,
              next.files,
            )
          : await repository.update(current.localId, current.revision, next.project);
        open(record);
        setProjects(await repository.list());
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : storageErrorMessage(cause));
        return false;
      } finally {
        setBusy(false);
      }
    })();
    mutation.current = operation;
    try {
      return await operation;
    } finally {
      mutation.current = undefined;
    }
  }

  async function perform<T>(operation: () => Promise<T>, needsFlush = true) {
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
      const result = await operation();
      setProjects(await repository.list());
      return result;
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

  async function backup(record: LocalProject, project: ProjectExport) {
    try {
      downloadProject(project);
      if (!repository.recordBackup) return;
      const lastBackup = {
        createdAt: new Date().toISOString(),
        fingerprint: await projectFingerprint(project),
      };
      await repository.recordBackup(record.localId, lastBackup);
      setProjects((records) =>
        records.map((item) => (item.localId === record.localId ? { ...item, lastBackup } : item)),
      );
      setActive((current) =>
        current?.localId === record.localId ? { ...current, lastBackup } : current,
      );
    } catch (cause) {
      setError(storageErrorMessage(cause));
    }
  }

  return {
    flush: async () => {
      if (formDirtyRef.current) {
        setError('Salve ou cancele o lançamento antes de navegar.');
        return false;
      }
      if (mutation.current && !(await mutation.current)) return false;
      if (invalidRef.current) {
        setError('Corrija os dados antes de navegar.');
        return false;
      }
      const ok = session.current ? await session.current.flush() : true;
      if (!ok) setError('Resolva o erro de salvamento antes de navegar.');
      return ok;
    },
    exportRecord: (record: LocalProject) => {
      try {
        void backup(record, record.project);
      } catch (cause) {
        setError(storageErrorMessage(cause));
      }
    },
    projects,
    active,
    draft,
    invalid,
    saveState,
    error,
    busy,
    edit,
    editProject,
    changeProject,
    formDirty,
    setFormDirty: useCallback((dirty: boolean) => {
      formDirtyRef.current = dirty;
      setFormDirty(dirty);
    }, []),
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
        return record;
      }),
    create: (project: ProjectExport) =>
      perform(async () => {
        const record = await repository.create(project);
        await activate(record);
        return record;
      }),
    restore: (backup: RestorableBackup) =>
      perform(async () => {
        if (!repository.createWithFiles)
          throw new Error('Este armazenamento não oferece restauração de arquivos.');
        const record = await repository.createWithFiles(backup.project, backup.files);
        await activate(record);
        return record;
      }),
    duplicate: (localId = session.current?.current.localId) =>
      perform(async () => {
        if (!localId) return;
        const record = await repository.duplicate(localId);
        await activate(record);
        return record;
      }),
    remove: (localId = session.current?.current.localId) =>
      perform(async () => {
        if (!localId) return;
        const record = await repository.load(localId);
        if (!record) return;
        await repository.delete(localId, record.revision);
        if (session.current?.current.localId === localId) open(undefined);
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
        if (active) void backup(active, latest.current);
      } catch (cause) {
        setError(storageErrorMessage(cause));
      }
    },
  };
}
