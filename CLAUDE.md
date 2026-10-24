# JuryScan Web — convenções

Frontend React + Vite + TypeScript (strict) + Tailwind 4 do JuryScan: triagem **assistiva** de extratos do CNIS.
Nunca conclusivo, nunca parecer jurídico. Contrato da API: `docs/openapi.yaml` (cópia do Swagger oficial).

## Comandos

- `npm run dev` / `npm run dev:mock` (MSW no navegador, sem backend)
- `npm run lint` · `npm run typecheck` · `npm test` · `npm run build` — os quatro precisam passar antes de commit
- `npm run format` — Prettier

## Estrutura

- `src/features/input` — entrada (texto colado, PDF via pdf.js **local**), validação, heurística de CNIS
- `src/features/analysis` — `types.ts` (fonte única do contrato), client HTTP, `normalizeAnalysis`, reducer, `useAnalysis`
- `src/features/report` — só recebe dados **já normalizados**; nunca lê a resposta crua da API
- `src/shared` — componentes acessíveis genéricos, `env.ts`, `logger.ts`
- `src/mocks` — handlers MSW e fixtures **anonimizadas**

## Regras inegociáveis (LGPD)

- O PDF nunca sai do navegador; só `texto_input` vai para `POST /api/analyze`.
- Texto do CNIS, evidências e dados pessoais **só em memória**: proibido localStorage, sessionStorage, IndexedDB, cookies, query string, `history.state`.
- Proibido `console.*` — use `logger` de `src/shared/lib/logger.ts`, que só aceita metadados numéricos/booleanos.
- Zero analytics, telemetria, CDN ou fonte remota. Nenhuma dependência nova que faça requisição de rede.
- Nunca colocar segredo em variável `VITE_*` (vai para o bundle).
- Fixtures: só dados inventados (CPF/NIT inválidos).

## Convenções

- Estado com `useReducer` + união discriminada; sem Redux/Zustand. Sem Zod (validação com type guards no adapter).
- `fetch` nativo + `AbortController`; sem axios. Sem retry automático (só manual).
- Severidade/risco nunca só por cor: ícone + texto + cor. Alvos ≥ 24px, foco visível, `aria-live` para mudanças de estado.
- Divergências com o backend ficam marcadas com `TODO(backend)`.
- Commits convencionais (`feat(input): ...`, `fix(report): ...`).
