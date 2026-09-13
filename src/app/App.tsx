import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useBlocker, useLocation, useNavigate } from 'react-router-dom';
import { FileText, FolderOpen, Menu } from 'lucide-react';
import type { LocalProject, ProjectRepository } from '@/domain/local-project';
import { DexieProjectRepository } from '@/storage/project-repository';
import { useLocalProjects } from '@/features/local-projects/use-local-projects';
import {
  parseRoute,
  projectPath,
  sections,
  primarySections,
} from '@/features/project-shell/routes';
import { projectTitle } from '@/features/project-shell/project-view';
import { ProjectHome } from '@/components/project-home';
import { ProjectSection } from '@/components/project-section';
import { Sheet } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';

export function App({ repository }: { repository?: ProjectRepository }) {
  const [defaultRepository] = useState(() => new DexieProjectRepository());
  const work = useLocalProjects(repository ?? defaultRepository);
  const location = useLocation();
  const navigate = useNavigate();
  const route = parseRoute(location.pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState<LocalProject>();
  const attempted = useRef('');
  const heading = useRef<HTMLHeadingElement>(null);
  const previousPath = useRef(location.pathname);
  const flushing = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname &&
      (Boolean(work.invalid) || work.saveState.status !== 'saved' || work.busy || work.formDirty),
  );
  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      flushing.current = false;
      return;
    }
    if (flushing.current) return;
    flushing.current = true;
    void work
      .flush()
      .then((ok) => {
        const current = blockerRef.current;
        if (current.state === 'blocked') {
          if (ok) current.proceed();
          else current.reset();
        }
      })
      .catch(() => {
        const current = blockerRef.current;
        if (current.state === 'blocked') current.reset();
      });
  }, [blocker, work]);

  const routeId = route.kind === 'project' ? route.id : '';
  useEffect(() => {
    if (work.busy || !routeId || work.active?.localId === routeId || attempted.current === routeId)
      return;
    if (!work.projects.some((record) => record.localId === routeId)) return;
    attempted.current = routeId;
    void work.select(routeId);
  }, [routeId, work]);
  useEffect(() => {
    attempted.current = '';
    setMenuOpen(false);
    const pathChanged = previousPath.current !== location.pathname;
    previousPath.current = location.pathname;
    if (pathChanged) heading.current?.focus();
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const current =
    route.kind === 'project' && work.active?.localId === route.id ? work.active : undefined;
  const title =
    route.kind === 'home'
      ? 'Meus projetos'
      : route.kind === 'missing'
        ? 'Página não encontrada'
        : sections.find(([path]) => path === route.section)![1];
  useEffect(() => {
    document.title = `${title} — RSCFlow`;
  }, [title]);
  const navigation = (
    <nav aria-label="Navegação principal" className="space-y-1">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `nav-link ${isActive ? 'bg-slate-800 text-cyan-200' : ''}`}
      >
        <FolderOpen size={18} aria-hidden="true" />
        Meus projetos
      </NavLink>
      {route.kind === 'project' && (
        <>
          <p className="px-3 pb-2 pt-6 text-xs uppercase tracking-wider text-slate-400">
            Processo de RSC
          </p>
          {sections
            .filter(([path]) => primarySections.includes(path))
            .map(([path, label]) => (
              <Fragment key={path}>
                <NavLink
                  key={path}
                  end
                  to={projectPath(route.id, path)}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'bg-slate-800 text-cyan-200' : ''}`
                  }
                >
                  {label}
                </NavLink>
              </Fragment>
            ))}
        </>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-cyan-300 focus:p-3 focus:text-slate-950"
      >
        Ir para o conteúdo
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-64 overflow-y-auto border-r border-slate-700 bg-slate-900 p-5 lg:block">
        <div className="mb-8 flex items-center gap-3 text-lg font-semibold text-cyan-200">
          <FileText aria-hidden="true" />
          RSCFlow
        </div>
        {navigation}
        <p className="mt-10 px-3 text-xs leading-5 text-slate-400">
          Processo de RSC · ferramenta não oficial
        </p>
      </aside>
      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-slate-700 bg-slate-950/95 px-4 py-3 backdrop-blur sm:px-8">
          <div className="lg:hidden">
            <Sheet
              title="Navegação"
              open={menuOpen}
              onOpenChange={setMenuOpen}
              trigger={
                <Button variant="outline" aria-label="Abrir menu">
                  <Menu size={20} />
                </Button>
              }
            >
              {navigation}
            </Sheet>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-slate-400">RSCFlow</p>
            <p className="truncate font-medium">
              {current ? projectTitle(current.project) : 'Projetos locais'}
            </p>
          </div>
          {current && (
            <>
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="order-last w-full text-sm text-cyan-200 sm:order-none sm:w-auto"
              >
                {work.invalid
                  ? 'Dados pendentes de correção'
                  : work.saveState.status === 'saving'
                    ? 'Salvando…'
                    : work.saveState.status === 'error'
                      ? 'Erro ao salvar'
                      : 'Salvo localmente'}
              </div>
              <Button variant="outline" onClick={work.export} disabled={Boolean(work.invalid)}>
                Exportar JSON
              </Button>
            </>
          )}
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          aria-busy={work.busy || work.saveState.status === 'saving'}
          className="mx-auto max-w-6xl px-4 py-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-300 sm:px-8"
        >
          <h1
            tabIndex={-1}
            ref={heading}
            className="mb-6 text-3xl font-semibold tracking-tight focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
          >
            {title}
          </h1>
          {work.error && (
            <div role="alert" className="mb-5 rounded border border-rose-500 p-4 text-rose-200">
              {work.error}
            </div>
          )}
          {work.invalid && route.kind === 'project' && (
            <p role="alert" className="mb-4 text-rose-200">
              {work.invalid}
            </p>
          )}
          {work.saveState.status === 'error' && (
            <div className="panel mb-5 space-y-3">
              <p className="text-rose-200">{work.saveState.message}</p>
              <Button onClick={() => void work.retry()} disabled={work.busy}>
                Tentar salvar novamente
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm('Descartar alterações e reabrir a versão salva?'))
                    void work.reopenSaved();
                }}
                disabled={work.busy}
              >
                Reabrir versão salva
              </Button>
            </div>
          )}
          {route.kind === 'home' ? (
            <ProjectHome
              projects={work.projects}
              active={work.active}
              busy={work.busy}
              onCreate={(project) => {
                void work.create(project).then((record) => {
                  if (record) void navigate(projectPath(record.localId));
                });
              }}
              onDuplicate={(record) => {
                void work.duplicate(record.localId).then((copy) => {
                  if (copy) void navigate(projectPath(copy.localId));
                });
              }}
              onDelete={setDeleting}
              onExport={work.exportRecord}
              onRefresh={() => void work.refresh()}
            />
          ) : route.kind === 'missing' ? (
            <div className="panel">
              <p>Este endereço não corresponde a uma seção da aplicação.</p>
              <Link className="mt-4 inline-block text-cyan-300 underline" to="/">
                Voltar aos projetos
              </Link>
            </div>
          ) : work.busy && !current ? (
            <p role="status">Carregando projeto…</p>
          ) : !work.projects.some((record) => record.localId === route.id) ? (
            <div className="panel">
              <h2 className="text-xl font-semibold">Projeto não encontrado neste navegador</h2>
              <p className="my-3">
                Ele pode ter sido excluído ou estar em outro navegador. Importe uma cópia JSON para
                continuar.
              </p>
              <Link className="text-cyan-300 underline" to="/">
                Voltar aos projetos
              </Link>
            </div>
          ) : current ? (
            <ProjectSection
              key={`${current.localId}/${route.section}`}
              record={current}
              section={route.section}
              draft={work.draft}
              invalid={work.invalid}
              busy={work.busy}
              edit={work.edit}
              editProject={work.editProject}
              save={work.changeProject}
              setFormDirty={work.setFormDirty}
              resolver={(repository ?? defaultRepository).fileResolver?.(current.localId)}
              onExport={work.export}
              onImport={(project) => {
                void work.create(project).then((record) => {
                  if (record) void navigate(projectPath(record.localId));
                });
              }}
            />
          ) : (
            <div className="panel">
              <p>Não foi possível abrir este projeto.</p>
              <Button onClick={() => void work.select(route.id)}>Tentar abrir novamente</Button>
            </div>
          )}
        </main>
      </div>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined);
        }}
        title="Excluir projeto local?"
        description={`A cópia local de “${deleting ? projectTitle(deleting.project) : ''}” será removida. Exporte um JSON antes se quiser preservá-la.`}
        busy={work.busy}
        onConfirm={() => {
          if (deleting)
            void work.remove(deleting.localId).then(() => {
              setDeleting(undefined);
            });
        }}
      />
    </div>
  );
}
