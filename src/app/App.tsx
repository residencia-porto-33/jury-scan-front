export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
          <p className="text-xl font-semibold tracking-tight">JuryScan</p>
          <p className="text-sm text-fg-muted">Triagem assistiva de CNIS · revisão humana obrigatória</p>
        </div>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <h1 className="text-2xl font-semibold">Analisar extrato do CNIS</h1>
      </main>
      <footer className="border-t border-line bg-surface">
        <p className="mx-auto max-w-7xl px-4 py-3 text-sm text-fg-muted">
          Ferramenta de apoio à triagem. Não constitui parecer jurídico.
        </p>
      </footer>
    </div>
  );
}
