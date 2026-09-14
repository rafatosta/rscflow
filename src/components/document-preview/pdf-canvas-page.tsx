import { useEffect, useMemo, useRef, useState } from 'react';
import type { PDFPageProxy } from 'pdfjs-dist';

export function PdfCanvasPage({
  page,
  label,
  thumbnail,
}: {
  page: PDFPageProxy;
  label: string;
  thumbnail: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const viewport = useMemo(
    () => page.getViewport({ scale: thumbnail ? 0.32 : 1.6 }),
    [page, thumbnail],
  );
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let active = true;
    setFailed(false);
    const render = page.render({ canvas, canvasContext: context, viewport });
    void render.promise.catch((error: unknown) => {
      if (active && (!(error instanceof Error) || error.name !== 'RenderingCancelledException'))
        setFailed(true);
    });
    return () => {
      active = false;
      render.cancel();
    };
  }, [page, viewport]);
  const Element = thumbnail ? 'div' : 'article';
  return (
    <Element
      className={`document-pdf-page mx-auto overflow-hidden bg-white ${thumbnail ? '' : 'shadow-2xl'}`}
      style={{ aspectRatio: `${viewport.width} / ${viewport.height}` }}
      {...(thumbnail ? { 'aria-hidden': true } : { 'aria-label': label })}
    >
      <canvas
        ref={canvasRef}
        width={Math.ceil(viewport.width)}
        height={Math.ceil(viewport.height)}
        className="block h-full w-full"
      />
      {failed && !thumbnail && <p role="alert">Não foi possível desenhar esta página.</p>}
    </Element>
  );
}
