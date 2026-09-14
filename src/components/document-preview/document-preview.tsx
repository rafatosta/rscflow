import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Lightbulb,
  Minus,
  PanelRight,
  Plus,
} from 'lucide-react';
import { Button } from '../ui/button';

export type DocumentPreviewPage = {
  id: string;
  label: string;
  content: ReactNode;
  thumbnail: ReactNode;
};

export type DocumentMetadata = {
  title: string;
  type: string;
  teacher?: string;
  campus?: string;
  regulation?: string;
  updatedAt?: string;
};

export type DocumentStatus = {
  label: string;
  description: string;
  tone: 'success' | 'warning' | 'destructive';
};

export type DocumentAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  primary?: boolean;
  disabled?: boolean;
  content?: ReactNode;
  onClick?: () => void;
};

export type DocumentPreviewProps = {
  heading?: string;
  pages: DocumentPreviewPage[];
  metadata: DocumentMetadata;
  status: DocumentStatus;
  actions: DocumentAction[];
  hint?: string;
  notices?: ReactNode;
};

function PageMap({
  pages,
  selected,
  onSelect,
}: {
  pages: DocumentPreviewPage[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav aria-label="Mapa de páginas" className="flex min-h-0 flex-col">
      <h3 className="subsection-title px-1 pb-4">Páginas ({pages.length})</h3>
      <ol className="document-page-map min-h-0 max-h-96 space-y-3 overflow-y-auto pr-2 lg:max-h-[calc(100vh-15rem)]">
        {pages.map((page, index) => (
          <li key={page.id}>
            <button
              type="button"
              aria-current={selected === index ? 'page' : undefined}
              aria-label={`Ir para ${page.label}`}
              className="document-thumbnail w-full rounded-xl border p-2 text-left"
              onClick={() => onSelect(index)}
            >
              <span className="block overflow-hidden rounded-md">{page.thumbnail}</span>
              <span className="mt-2 block text-center text-sm font-semibold tabular-nums">
                {index + 1}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ViewerToolbar({
  page,
  total,
  zoom,
  mode,
  onPage,
  onZoom,
  onMode,
}: {
  page: number;
  total: number;
  zoom: number;
  mode: 'single' | 'spread';
  onPage: (page: number) => void;
  onZoom: (zoom: number) => void;
  onMode: (mode: 'single' | 'spread') => void;
}) {
  const pageInput = useId();
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-b p-3 [border-color:rgb(var(--line))]">
      <Button
        variant="outline"
        aria-label="Página anterior"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </Button>
      <label htmlFor={pageInput} className="sr-only">
        Página atual
      </label>
      <input
        id={pageInput}
        className="field m-0 min-h-11 w-16 px-2 text-center tabular-nums"
        type="number"
        min={1}
        max={total}
        value={page}
        onChange={(event) => onPage(Number(event.target.value))}
      />
      <span role="status" aria-live="polite" className="text-sm tabular-nums">
        de {total}
      </span>
      <Button
        variant="outline"
        aria-label="Próxima página"
        onClick={() => onPage(page + 1)}
        disabled={page === total}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </Button>
      <span className="mx-1 h-7 border-l [border-color:rgb(var(--line))]" aria-hidden="true" />
      <Button
        variant="outline"
        aria-label="Diminuir zoom"
        onClick={() => onZoom(zoom - 10)}
        disabled={zoom <= 50}
      >
        <Minus size={17} aria-hidden="true" />
      </Button>
      <span className="min-w-14 text-center text-sm tabular-nums">{zoom}%</span>
      <Button
        variant="outline"
        aria-label="Aumentar zoom"
        onClick={() => onZoom(zoom + 10)}
        disabled={zoom >= 150}
      >
        <Plus size={17} aria-hidden="true" />
      </Button>
      <Button variant="outline" onClick={() => onZoom(100)}>
        Ajustar
      </Button>
      <span
        className="mx-1 hidden h-7 border-l sm:block [border-color:rgb(var(--line))]"
        aria-hidden="true"
      />
      <Button
        variant={mode === 'single' ? 'default' : 'outline'}
        aria-pressed={mode === 'single'}
        onClick={() => onMode('single')}
      >
        Página única
      </Button>
      <Button
        variant={mode === 'spread' ? 'default' : 'outline'}
        aria-pressed={mode === 'spread'}
        onClick={() => onMode('spread')}
      >
        <PanelRight size={17} aria-hidden="true" />
        Duas páginas
      </Button>
    </div>
  );
}

function DocumentInfo({ metadata, total }: { metadata: DocumentMetadata; total: number }) {
  const values = [
    ['Título', metadata.title],
    ['Tipo', metadata.type],
    ['Docente', metadata.teacher],
    ['Campus / unidade', metadata.campus],
    ['Regulamento', metadata.regulation],
    ['Última atualização', metadata.updatedAt],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  return (
    <section className="subpanel" aria-labelledby="document-info-title">
      <h3 id="document-info-title" className="flex items-center gap-2 font-semibold">
        <FileText size={19} aria-hidden="true" /> Informações do documento
      </h3>
      <dl className="mt-4 space-y-3 text-sm">
        {values.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[rgb(var(--ink-muted))]">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
        <div className="border-t pt-3 [border-color:rgb(var(--line))]">
          <dt className="text-[rgb(var(--ink-muted))]">Total de páginas</dt>
          <dd className="text-lg font-semibold">{total} páginas</dd>
        </div>
      </dl>
    </section>
  );
}

function ContextPanel({
  metadata,
  total,
  status,
  actions,
  hint,
  notices,
}: Omit<DocumentPreviewProps, 'heading' | 'pages'> & { total: number }) {
  return (
    <div className="space-y-4">
      <DocumentInfo metadata={metadata} total={total} />
      <section className="subpanel" aria-labelledby="document-status-title">
        <h3 id="document-status-title" className="font-semibold">
          Status
        </h3>
        <div className="document-status mt-3 rounded-lg border p-3" data-tone={status.tone}>
          <p className="font-semibold">{status.label}</p>
          <p className="mt-1 text-sm">{status.description}</p>
        </div>
      </section>
      <section className="subpanel" aria-labelledby="document-actions-title">
        <h3 id="document-actions-title" className="font-semibold">
          Ações
        </h3>
        <div className="mt-3 grid gap-2">
          {actions.map((action) =>
            action.content ? (
              <div key={action.id}>{action.content}</div>
            ) : (
              <Button
                key={action.id}
                variant={action.primary ? 'default' : 'outline'}
                disabled={action.disabled}
                onClick={action.onClick}
                className="w-full"
              >
                {action.icon}
                {action.label}
              </Button>
            ),
          )}
        </div>
      </section>
      {notices}
      {hint && (
        <aside className="notice text-sm" aria-label="Informação contextual">
          <p className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
            <span>{hint}</span>
          </p>
        </aside>
      )}
    </div>
  );
}

export function DocumentPreview({
  heading = 'Prévia de Documentos',
  pages,
  metadata,
  status,
  actions,
  hint,
  notices,
}: DocumentPreviewProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [mode, setMode] = useState<'single' | 'spread'>('single');
  const [mapOpen, setMapOpen] = useState(true);
  const [contextOpen, setContextOpen] = useState(true);
  const [desktopPanels, setDesktopPanels] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches,
  );
  const selectPage = (index: number) =>
    setPageIndex(
      Math.min(Math.max(Number.isFinite(index) ? Math.trunc(index) : 0, 0), pages.length - 1),
    );

  useEffect(() => {
    if (pageIndex >= pages.length) setPageIndex(Math.max(0, pages.length - 1));
  }, [pageIndex, pages.length]);

  useEffect(() => {
    const media = window.matchMedia?.('(min-width: 1024px)');
    if (!media) return;
    const update = () => setDesktopPanels(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const visiblePages =
    mode === 'spread'
      ? pages.slice(pageIndex, pageIndex + 2)
      : pages.slice(pageIndex, pageIndex + 1);
  const context = { metadata, total: pages.length, status, actions, hint, notices };

  return (
    <section className="space-y-4">
      <header>
        <p className="text-sm font-medium text-[rgb(var(--accent))]">{heading}</p>
        <h2 className="section-title mt-1">{metadata.title}</h2>
      </header>

      <div className="document-preview-grid grid min-w-0 gap-4 lg:grid-cols-[11rem_minmax(0,1fr)] xl:grid-cols-[11rem_minmax(0,1fr)_18rem]">
        <details
          open={desktopPanels || mapOpen}
          onToggle={(event) => {
            if (!desktopPanels) setMapOpen(event.currentTarget.open);
          }}
          className="responsive-preview-panel panel order-2 p-4 lg:order-1 lg:max-h-[calc(100vh-9rem)]"
        >
          <summary className="cursor-pointer font-semibold">
            Mapa de páginas ({pages.length})
          </summary>
          <div className="responsive-preview-content mt-4 max-h-96 lg:mt-0 lg:max-h-full">
            <PageMap pages={pages} selected={pageIndex} onSelect={selectPage} />
          </div>
        </details>
        <div className="order-1 min-w-0 overflow-hidden rounded-2xl border bg-[rgb(var(--surface))] [border-color:rgb(var(--line))] lg:order-2">
          <ViewerToolbar
            page={pageIndex + 1}
            total={pages.length}
            zoom={zoom}
            mode={mode}
            onPage={(page) => selectPage(page - 1)}
            onZoom={(value) => setZoom(Math.min(150, Math.max(50, value)))}
            onMode={setMode}
          />
          <div className="document-canvas overflow-auto p-3 sm:p-5">
            <div
              className={`mx-auto grid items-start justify-center gap-4 ${mode === 'spread' ? 'grid-cols-2' : 'grid-cols-1'}`}
              style={{ width: `${zoom}%` }}
            >
              {visiblePages.map((page) => (
                <div key={page.id} className="min-w-0">
                  {page.content}
                </div>
              ))}
            </div>
          </div>
        </div>
        <details
          open={desktopPanels || contextOpen}
          onToggle={(event) => {
            if (!desktopPanels) setContextOpen(event.currentTarget.open);
          }}
          className="responsive-preview-panel panel order-3 p-4 lg:col-span-2 xl:col-span-1 xl:p-0"
        >
          <summary className="cursor-pointer font-semibold">Informações e ações</summary>
          <div className="responsive-preview-content mt-4 lg:mt-0">
            <ContextPanel {...context} />
          </div>
        </details>
      </div>
      <div hidden aria-hidden="true" className="document-print-pages">
        {pages.map((page) => (
          <div key={page.id}>{page.content}</div>
        ))}
      </div>
    </section>
  );
}
