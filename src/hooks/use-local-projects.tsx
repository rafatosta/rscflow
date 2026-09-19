import * as React from "react"

import { getLocalProject, listLocalProjects, localProjectSchema, type LocalProject, updateLocalProject } from "@/lib/projects"

export type SaveState = "saved" | "saving" | "error"
type LocalProjectsContextValue = { project: LocalProject | undefined; projects: LocalProject[]; saveState: SaveState; saveError: string | undefined; openProject: (localId: string) => Promise<void>; updateDraft: (update: (project: LocalProject) => LocalProject) => void; flush: () => Promise<boolean>; retrySave: () => Promise<boolean>; discardDraft: () => Promise<void>; refreshProjects: () => Promise<void> }
const LocalProjectsContext = React.createContext<LocalProjectsContextValue | null>(null)
const DEBOUNCE_MS = 600

export function LocalProjectsProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = React.useState<LocalProject | undefined>(undefined)
  const [projects, setProjects] = React.useState<LocalProject[]>([])
  const [saveState, setSaveState] = React.useState<SaveState>("saved")
  const [saveError, setSaveError] = React.useState<string | undefined>(undefined)
  const projectRef = React.useRef<LocalProject | undefined>(undefined)
  const persistedRevision = React.useRef<number | undefined>(undefined)
  const timer = React.useRef<number | undefined>(undefined)
  const queue = React.useRef(Promise.resolve(true))

  const refreshProjects = React.useCallback(async () => setProjects(await listLocalProjects()), [])
  React.useEffect(() => { void refreshProjects() }, [refreshProjects])
  React.useEffect(() => { projectRef.current = project }, [project])
  React.useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])
  React.useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (saveState === "saving") { event.preventDefault(); event.returnValue = "" } }
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn)
  }, [saveState])

  const persist = React.useCallback(async () => {
    const draft = projectRef.current
    const expectedRevision = persistedRevision.current
    if (!draft || expectedRevision === undefined) return true
    const valid = localProjectSchema.safeParse(draft)
    if (!valid.success) { setSaveState("error"); setSaveError("O rascunho contém dados inválidos. Corrija-os antes de salvar."); return false }
    setSaveState("saving"); setSaveError(undefined)
    try {
      const saved = await updateLocalProject(valid.data, expectedRevision)
      persistedRevision.current = saved.revision
      setProject((current) => current?.localId === saved.localId ? { ...current, revision: saved.revision, updatedAt: saved.updatedAt } : current)
      await refreshProjects()
      setSaveState("saved")
      return true
    } catch (error) { setSaveState("error"); setSaveError(error instanceof Error ? error.message : "Não foi possível salvar o rascunho local."); return false }
  }, [refreshProjects])
  const enqueue = React.useCallback(() => { queue.current = queue.current.then(persist, persist); return queue.current }, [persist])
  const schedule = React.useCallback(() => { if (timer.current) window.clearTimeout(timer.current); timer.current = window.setTimeout(() => { timer.current = undefined; void enqueue() }, DEBOUNCE_MS) }, [enqueue])
  const updateDraft = React.useCallback((update: (current: LocalProject) => LocalProject) => { const current = projectRef.current; if (!current) return; const next = { ...update(current), updatedAt: new Date().toISOString() }; projectRef.current = next; setProject(next); setSaveState("saving"); setSaveError(undefined); schedule() }, [schedule])
  const flush = React.useCallback(async () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = undefined; return enqueue() } return queue.current }, [enqueue])
  React.useEffect(() => {
    const interceptNavigation = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null
      if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || anchor.target) return
      const target = new URL(anchor.href)
      if (target.origin !== window.location.origin || target.pathname === window.location.pathname) return
      event.preventDefault()
      void flush().then((saved) => { if (saved) { window.history.pushState({}, "", `${target.pathname}${target.search}${target.hash}`); window.dispatchEvent(new PopStateEvent("popstate")) } })
    }
    document.addEventListener("click", interceptNavigation)
    return () => document.removeEventListener("click", interceptNavigation)
  }, [flush])
  const retrySave = React.useCallback(async () => { if (timer.current) window.clearTimeout(timer.current); return enqueue() }, [enqueue])
  const openProject = React.useCallback(async (localId: string) => { if (projectRef.current?.localId === localId) return; if (!(await flush())) return; const stored = await getLocalProject(localId); projectRef.current = stored; persistedRevision.current = stored?.revision; setProject(stored); setSaveState("saved"); setSaveError(undefined) }, [flush])
  const discardDraft = React.useCallback(async () => { const localId = projectRef.current?.localId; if (!localId) return; const stored = await getLocalProject(localId); projectRef.current = stored; persistedRevision.current = stored?.revision; setProject(stored); setSaveState("saved"); setSaveError(undefined) }, [])
  const value = React.useMemo(() => ({ project, projects, saveState, saveError, openProject, updateDraft, flush, retrySave, discardDraft, refreshProjects }), [project, projects, saveState, saveError, openProject, updateDraft, flush, retrySave, discardDraft, refreshProjects])
  return <LocalProjectsContext.Provider value={value}>{children}</LocalProjectsContext.Provider>
}
export function useLocalProjects() { const context = React.useContext(LocalProjectsContext); if (!context) throw new Error("useLocalProjects deve ser usado dentro de LocalProjectsProvider."); return context }
