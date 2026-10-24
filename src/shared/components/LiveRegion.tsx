/** Região `aria-live` sempre montada, para que leitores de tela percebam as mudanças. */
export function LiveRegion({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
