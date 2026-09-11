import { useLayoutEffect, useRef } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Button } from './button';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  busy?: boolean;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (open) return;
    const rememberActivation = (event: Event) => {
      if (!(event.target instanceof HTMLElement)) return;
      returnFocus.current =
        event.target.closest<HTMLElement>('button, a, input, select, textarea, [tabindex]') ??
        event.target;
    };
    if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement;
    document.addEventListener('click', rememberActivation, true);
    document.addEventListener('keydown', rememberActivation, true);
    return () => {
      document.removeEventListener('click', rememberActivation, true);
      document.removeEventListener('keydown', rememberActivation, true);
    };
  }, [open]);

  const changeOpen = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (nextOpen) return;
    const target = returnFocus.current;
    window.requestAnimationFrame(() => {
      if (target?.isConnected) target.focus();
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={changeOpen}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <AlertDialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-600 bg-slate-900 p-6 text-slate-50 shadow-xl"
          onCloseAutoFocus={(event) => {
            const target = returnFocus.current;
            if (!target?.isConnected) return;
            event.preventDefault();
            target.focus();
          }}
        >
          <AlertDialog.Title className="text-xl font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="my-4 leading-6 text-slate-300">
            {description}
          </AlertDialog.Description>
          <div className="flex flex-wrap justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={busy}>
                Cancelar
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                disabled={busy}
                onClick={(event) => {
                  event.preventDefault();
                  onConfirm();
                }}
              >
                Confirmar exclusão
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
