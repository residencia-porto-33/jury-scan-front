# JuryScan Web

Frontend do **JuryScan**, que apoia a **triagem inicial de extratos do CNIS** (Cadastro Nacional de
Informações Sociais) em escritórios de Direito Previdenciário. O profissional cola o texto ou envia o PDF do
CNIS, e o app mostra as pendências priorizadas, cada uma com o **trecho exato do documento** que a sustenta.

> **O JuryScan é uma ferramenta de apoio à triagem. O resultado não concede nem indefere benefícios, não
> substitui profissional habilitado e não constitui parecer jurídico. Revisão humana obrigatória.**

Esse aviso fica fixo em toda a tela de relatório e sai impresso em todas as páginas.

---

## Sumário

- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts](#scripts)
- [Arquitetura e fluxo de dados](#arquitetura-e-fluxo-de-dados)
- [Contrato consumido](#contrato-consumido)
- [Pendências com o backend](#pendências-com-o-backend)
- [Decisões técnicas](#decisões-técnicas)
- [Privacidade (LGPD)](#privacidade-lgpd)
- [Acessibilidade](#acessibilidade)
- [Testes](#testes)
- [Deploy](#deploy)

---

## Como rodar

Requisitos: **Node 22.13+** (testado com Node 24) e npm.

```bash
npm install

# Sem backend: o MSW intercepta POST /api/analyze no navegador
npm run dev:mock

# Com o backend FastAPI rodando em http://localhost:8000
cp .env.example .env.local   # ajuste VITE_API_BASE_URL se precisar
npm run dev
```

Abra `http://localhost:5173`.

### Cenários do modo mock

No `dev:mock`, um CNIS (texto com "CNIS", "NIT", "Relações Previdenciárias"...) recebe o relatório completo
de exemplo. Qualquer outro texto recebe a resposta de **pendência documental**. Para forçar um cenário,
inclua no texto colado:

| Marcador                                                                | Resultado                                                |
| ----------------------------------------------------------------------- | -------------------------------------------------------- |
| `#mock:sem_achados`                                                     | relatório sem inconsistências                            |
| `#mock:nao_cnis`                                                        | pendência documental                                     |
| `#mock:400` `#mock:413` `#mock:422` `#mock:500` `#mock:502` `#mock:504` | erro HTTP correspondente                                 |
| `#mock:429` `#mock:503`                                                 | serviço ocupado com `Retry-After: 10`                    |
| `#mock:rede`                                                            | falha de rede                                            |
| `#mock:invalido`                                                        | 200 fora do contrato (o adapter rejeita)                 |
| `#mock:lento`                                                           | nunca responde (teste o botão **Cancelar** ou o timeout) |

Arquivos de exemplo **fictícios**: `src/mocks/fixtures/cnis-ficticio.txt` (para colar) e
`src/test/fixtures/cnis-texto.pdf` / `cnis-imagem.pdf` (para enviar). CPF e NIT neles são inventados e
inválidos.

## Variáveis de ambiente

Toda variável `VITE_*` vai para o bundle e é **pública**. **Nunca** coloque chave de IA, token ou segredo no
frontend: eles ficam só no servidor.

| Variável                      | Padrão                  | Uso                                                                                   |
| ----------------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`           | `http://localhost:8000` | URL do backend, sem barra final. Também entra no `connect-src` da CSP.                |
| `VITE_REQUEST_TIMEOUT_MS`     | `90000`                 | Timeout de `POST /api/analyze`. Deixe um pouco acima do timeout do backend.           |
| `VITE_MIN_INPUT_CHARS`        | `200`                   | Mínimo de caracteres para liberar a análise.                                          |
| `VITE_MAX_INPUT_CHARS`        | `200000`                | Máximo de caracteres aceitos.                                                         |
| `VITE_MAX_PDF_MB`             | `20`                    | Tamanho máximo do PDF.                                                                |
| `VITE_PDF_MIN_CHARS_PER_PAGE` | `50`                    | Abaixo dessa média de caracteres visíveis por página, o PDF é tratado como escaneado. |
| `VITE_USE_MOCKS`              | `false`                 | `true` liga o MSW no navegador (o `dev:mock` já usa `.env.mock`).                     |

Os valores são lidos e validados em `src/shared/config/env.ts`; valor inválido cai no padrão.

## Scripts

| Comando                           | O que faz                                           |
| --------------------------------- | --------------------------------------------------- |
| `npm run dev`                     | Servidor de desenvolvimento                         |
| `npm run dev:mock`                | Desenvolvimento com MSW, sem backend                |
| `npm run build`                   | Build de produção em `dist/` (com CSP injetada)     |
| `npm run preview`                 | Serve o build localmente                            |
| `npm run lint`                    | ESLint (zero warnings)                              |
| `npm run typecheck`               | `tsc --noEmit` do app, dos testes e da config       |
| `npm test` / `npm run test:watch` | Vitest                                              |
| `npm run format` / `format:check` | Prettier                                            |
| `npm run fixtures:pdf`            | Regenera os PDFs de teste a partir do CNIS fictício |

## Arquitetura e fluxo de dados

```
src/
  app/            App.tsx (layout + composição), main.tsx, tema (index.css)
  features/
    input/        entrada: abas, textarea, upload, pdf.js, validação, heurística de CNIS
    analysis/     contrato (types.ts), client HTTP, erros, adapter, reducer, useAnalysis
    report/       relatório: só recebe dados JÁ normalizados
  shared/         componentes acessíveis genéricos, env.ts, logger.ts
  mocks/          handlers MSW e fixtures anonimizadas
  test/           setup do Vitest, helpers e PDFs de teste
```

```
 Navegador (tudo em memória)                                     Backend
┌────────────────────────────────────────────────────────────┐
│ PDF ──pdf.js (worker local)──► texto ─┐                    │
│ Texto colado ─────────────────────────┼─► validação ──────►│── POST /api/analyze ──► FastAPI
│                                       │                    │   { texto_input, origem }   (IA + Pydantic)
│                                       ▼                    │
│ ReportView ◄── NormalizedAnalysis ◄── normalizeAnalysis ◄──│◄── JSON (unknown)
└────────────────────────────────────────────────────────────┘
```

1. **Entrada** (`features/input`): o PDF é lido **localmente** pelo pdf.js, página a página, e as linhas da
   tabela do CNIS são reconstruídas pela posição Y/X dos fragmentos. O arquivo nunca vai para a rede.
2. **Estado** (`analysisReducer`): uma união discriminada `idle → extracting → ready → submitting →
success | error`. Os estados do documento do produto correspondem assim: _Carregando_ = `extracting`,
   _Processando_ = `submitting`. Transições inválidas não fazem nada.
3. **Envio** (`analyzeClient`): `fetch` + `AbortController`, com timeout e cancelamento manual.
4. **Validação** (`normalizeAnalysis`): type guards escritos à mão transformam o JSON `unknown` no modelo
   `NormalizedAnalysis`. Nenhum componente lê a resposta crua.
5. **Relatório** (`features/report`): risco, resumo, ações prioritárias e achados com evidência, filtros e
   "Conferido". Filtros, marcações e máscara ficam só em memória e somem em "Nova análise".

### Regras do adapter (`normalizeAnalysis`)

- Campo obrigatório ausente ou com tipo errado → `InvalidResponseError` → erro "Análise incompleta" (com retry).
- Enums tolerantes a acento e caixa (`média`, `Media`, `MÉDIO`...). Valor desconhecido → erro.
- Achado **sem evidência é descartado e contado** ("N achados foram descartados...").
- `confianca` vira 0–1: valores entre 0 e 100 são convertidos e o resultado é limitado ao intervalo.
- **Totais recalculados** a partir da lista validada (`alta + media + baixa + info === total === issues.length`).
  Se divergirem da API, um `warn` em dev registra **só os números**.
- Ordenação: severidade → confiança (decrescente) → identificador.
- Resumo ausente (`null`, `""`, `"N/A"`, `"não identificado"`...) vira `undefined` e a tela mostra
  "Não identificado". Nenhum valor é inventado.
- **Anti-alucinação:** cada evidência é procurada no texto enviado (ignorando espaços, quebras e caixa). Se
  não for encontrada, o achado ganha um selo "Trecho não encontrado literalmente". Se for encontrada, o botão
  "Ver no documento" destaca o trecho com `<mark>`.

## Contrato consumido

Fonte: [Swagger do JuryScan](https://residencia-porto-33.github.io/docs-swagger/). Cópia versionada em
[`docs/openapi.yaml`](docs/openapi.yaml). Tipos em `src/features/analysis/types.ts`.

```http
POST {VITE_API_BASE_URL}/api/analyze
Content-Type: application/json

{ "texto_input": "<texto do CNIS>", "origem": "texto_colado" | "upload_pdf" }
```

Resposta 200 (`AnalysisResult`): `analysis_request_id`, `status`, `document_summary { cpf, nit_pis_pasep,
periodo, vinculos[], contexto_beneficio }`, `issues[] { identificador_exibicao, severidade, categoria,
descricao?, evidencia, sugestao, impacto?, confianca }`, `severity_totals`, `risco_agregado`,
`acoes_prioritarias[]`.

| Situação                         | Mensagem ao usuário                                                  | Retry                        |
| -------------------------------- | -------------------------------------------------------------------- | ---------------------------- |
| 400                              | Texto inválido ou fora do tamanho permitido. Revise e tente de novo. | não (volta ao texto)         |
| 413                              | Documento grande demais para análise.                                | não                          |
| 422 ou resposta fora do contrato | A análise retornou incompleta. Tente novamente.                      | sim                          |
| 429 / 503                        | Serviço ocupado no momento. Tente novamente em instantes.            | sim (respeita `Retry-After`) |
| 502                              | Não foi possível concluir a análise agora.                           | sim                          |
| 504 ou timeout local             | A análise demorou mais que o esperado.                               | sim                          |
| rede/offline                     | Sem conexão com o servidor. Verifique sua internet.                  | sim                          |
| cancelado                        | Análise cancelada.                                                   | sim                          |
| outros (inclui 500)              | Algo deu errado. Tente novamente.                                    | sim                          |

O corpo das respostas de erro **nunca é lido nem exibido**. Não existe retry automático: o backend já repete
internamente no 422, e cada chamada custa uma inferência do modelo.

`GET /api/analyze/{analysis_request_id}` (status assíncrono) existe no Swagger, mas está **fora do escopo**
do MVP, que é síncrono.

## Pendências com o backend

Marcadas no código como `TODO(backend)`:

1. **Formato da pendência documental** (documento que não é CNIS): não está no Swagger. Hoje
   `isDocumentPending()` (`features/analysis/adapters/documentPending.ts`) reconhece categorias como
   `pendencia_documental`. Confirmar o valor exato ou um campo dedicado.
2. **Limites de tamanho**: o Swagger só declara `minLength: 1`. Confirmar o mínimo e o máximo reais e
   alinhar `VITE_MIN_INPUT_CHARS` / `VITE_MAX_INPUT_CHARS`.
3. **`vinculos`**: o Swagger declara `string[]`; o adapter também aceita objetos.
4. **`descricao` e `impacto`**: opcionais no Swagger (o rascunho do produto os tratava como obrigatórios). O
   front segue o Swagger e omite a seção quando faltam.
5. **413 / 429 / 503**: tratados de forma defensiva, mas não documentados no Swagger.
6. **`prompt_version` / `modelo_versao`**: aceitos se vierem, mas ausentes do Swagger.

> O documento de produto `docs/JuryScan.md` não estava disponível quando este frontend foi feito. A fonte de
> verdade foi a especificação técnica do frontend somada ao `openapi.yaml`. Quando o documento for
> adicionado, revise as divergências acima.

## Decisões técnicas

- **Sem Zod.** A validação oficial do contrato é Pydantic no backend ("Zod" era resquício de um rascunho). No
  front, a validação defensiva usa type guards escritos à mão em um único adapter.
- **Sem Redux/Zustand.** O app tem um fluxo só; `useReducer` com união discriminada deixa as transições
  explícitas e testáveis.
- **pdf.js local, build `legacy`.** O PDF nunca sai do navegador. O worker é servido pela própria origem e
  carregado sob demanda (fora do bundle inicial). O build `legacy` foi escolhido porque o build padrão do
  pdf.js 6 exige APIs muito recentes (ex.: `Uint8Array.prototype.toHex`) e quebraria em navegadores com
  poucos meses de atraso, comuns em escritórios.
- **TypeScript 6.0** (não 7.0): o `typescript-eslint` 8.72 ainda exige `typescript < 6.1`.
- **`jest-axe`** em vez de `vitest-axe`, que não é mantido desde jan/2025. Funciona com Vitest via
  `expect.extend`.
- **Sem `eslint-plugin-jsx-a11y`**: ainda não declara suporte ao ESLint 10. A cobertura vem do axe em cada
  estado e de testes de teclado e foco.
- **`fetch` nativo**, sem axios, com `credentials: 'omit'`, `cache: 'no-store'` e `referrerPolicy: 'no-referrer'`.

## Privacidade (LGPD)

- O **PDF não é enviado**: só o texto extraído (`texto_input`) vai para a API.
- Texto do CNIS, evidências e dados pessoais ficam **só em memória**. Nada de `localStorage`,
  `sessionStorage`, IndexedDB, cookies, query string ou `history.state`. O ESLint bloqueia essas APIs e um
  teste espiona todas durante o fluxo completo.
- **Sem `console.*`**: só o `logger` (`src/shared/lib/logger.ts`), que em produção não faz nada e em dev aceita
  apenas números e booleanos. Os erros capturados pelo React também passam por ele.
- Textarea com `spellCheck`, `autoComplete` e `autoCorrect` desligados: corretores avançados de alguns
  navegadores enviam o texto para servidores externos.
- "Ocultar dados pessoais" mascara CPF e NIT no resumo, nas evidências e no texto enviado (útil com a tela
  compartilhada).
- **Zero terceiros em runtime**: sem analytics, Sentry, pixels ou CDN. Fontes (Inter, JetBrains Mono) e
  ícones (lucide) vêm empacotados.
- `<meta name="referrer" content="no-referrer">` e **CSP** injetada no build (`csp.config.ts`), com
  `connect-src` restrito à origem da API. Na Vercel, `vercel.json` acrescenta `frame-ancestors 'none'`,
  `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` como cabeçalhos HTTP.
- "Nova análise" descarta texto, resultado, filtros e marcações.

### Auditoria de rede das dependências (`npm ls --omit=dev --all`)

| Dependência de runtime                                              | Faz requisição de rede?                                                                                                                               |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react`, `react-dom`, `scheduler`                                   | Não                                                                                                                                                   |
| `pdfjs-dist`                                                        | Não com a configuração usada (`getDocument({ data })`, sem `url`, `cMapUrl`, `standardFontDataUrl` nem wasm). O worker é carregado da própria origem. |
| `@napi-rs/canvas` (opcional do pdf.js)                              | Não. É só para Node e não entra no bundle do navegador.                                                                                               |
| `lucide-react`                                                      | Não (SVGs embutidos)                                                                                                                                  |
| `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` | Não (arquivos `.woff2` servidos pela própria origem)                                                                                                  |

Única requisição do app: `POST {VITE_API_BASE_URL}/api/analyze`. O MSW é dependência de desenvolvimento e
não entra no build de produção.

## Acessibilidade

Meta: **WCAG 2.2 AA**.

- Tudo operável por teclado: abas WAI-ARIA (setas, Home, End), link "Pular para o conteúdo", foco visível
  (contraste ≥ 3:1).
- Foco gerenciado: vai ao título do relatório quando a análise termina e ao título do alerta após um erro.
  "Ver no documento" leva ao trecho e oferece "Voltar ao achado".
- Região `aria-live="polite"` anuncia as mudanças de estado ("Analisando documento", "Análise concluída: 6
  achados, risco alto").
- Severidade e risco **nunca só por cor**: ícone + texto + cor.
- Botão "Analisar" desabilitado com `aria-disabled`, motivo visível e ligado por `aria-describedby`.
- Disclaimer fixo com `scroll-padding-top` igual à altura dele, para não cobrir o foco (2.4.11).
- Alvos de clique ≥ 24×24 px, `prefers-reduced-motion` respeitado, layout reflui a 320 px e com zoom de 200%.
- Contraste dos tokens verificado automaticamente (`src/app/contrast.test.ts`) nos temas claro e escuro
  (escuro via `prefers-color-scheme`).

## Testes

```bash
npm test
```

- **Unitários:** `normalizeAnalysis` (todas as regras), `locateEvidence`, `isDocumentPending`, `validation`,
  `cnisHeuristics`, `errors`, `analysisReducer` (transições válidas e no-op), filtros, máscara e
  `buildLines`.
- **pdf.js real:** `extractPdfText` com dois PDFs gerados por `npm run fixtures:pdf` (um com texto, um só
  imagem) e um PDF corrompido.
- **Integração (Testing Library + MSW):** colar → relatório; upload → prévia → relatório; cada linha da
  tabela de erros; `Retry-After`; timeout local; cancelar; duplo envio; retry com o mesmo texto; "Nova
  análise"; pendência documental.
- **Acessibilidade:** axe em idle, aviso de não-CNIS, erro, relatório, relatório sem achados e pendência
  documental, além de headings e landmarks.
- **LGPD:** espiona storage, cookies, URL, `history` e `console` durante o fluxo completo.

## Deploy

O CI (`.github/workflows/ci.yml`) roda `npm ci → lint → format:check → typecheck → test → build` em push e PR.

### Vercel (padrão)

1. Importe o repositório na Vercel (framework detectado: Vite; `vercel.json` já define build e headers).
2. Em _Settings → Environment Variables_, defina `VITE_API_BASE_URL` para cada ambiente (Production,
   Preview), além dos limites se forem diferentes do padrão.
3. Não ative Vercel Analytics nem Speed Insights (LGPD).

A CSP é gerada **no build** com a origem de `VITE_API_BASE_URL`. Ao trocar a URL da API, faça um novo deploy.
O backend precisa liberar CORS para a origem do frontend.

### Alternativas

- **Netlify:** build `npm run build`, publish `dist`. Replique os headers do `vercel.json` em um arquivo
  `netlify.toml` (`[[headers]]`).
- **GitHub Pages:** publique `dist/` com `actions/deploy-pages`. Se o site ficar em subcaminho, ajuste `base`
  no `vite.config.ts`. O Pages não permite cabeçalhos customizados, então vale só a CSP da meta tag.
# jury-scan-front
