# Project structure

```
underwriting-copilot/
├─ app/
│  ├─ api/
│  │  ├─ admin/
│  │  │  └─ index-document/route.ts     # proxy -> FastAPI /admin/index-document
│  │  ├─ analytics/route.ts             # operations metrics
│  │  ├─ applications/
│  │  │  ├─ route.ts                    # GET queue lists
│  │  │  └─ [id]/
│  │  │     ├─ route.ts                 # GET full case profile
│  │  │     ├─ assess/route.ts          # POST -> FastAPI /assess, persist
│  │  │     ├─ action/route.ts          # POST commit decision (+override log)
│  │  │     ├─ override/route.ts        # POST/GET overrides
│  │  │     └─ assign/route.ts          # POST assign to me
│  │  └─ compliance/
│  │     └─ fairness/route.ts           # demographic parity
│  ├─ underwriter/
│  │  ├─ page.tsx                       # View 1: queue dashboard (tabs)
│  │  └─ [id]/page.tsx                  # View 2: case detail (3-column)
│  ├─ compliance/
│  │  ├─ page.tsx                       # View 3 (server)
│  │  └─ ComplianceClient.tsx           # View 3 (client)
│  ├─ operations/
│  │  ├─ page.tsx                       # View 4 (server)
│  │  └─ OperationsClient.tsx           # View 4 (client)
│  ├─ globals.css
│  ├─ layout.tsx                        # root layout + nav + dark theme
│  └─ page.tsx                          # redirect -> /underwriter
├─ components/
│  ├─ ui/                               # shadcn-style Radix primitives
│  │  ├─ badge.tsx  button.tsx  card.tsx  dialog.tsx
│  │  ├─ input.tsx  label.tsx  select.tsx  tabs.tsx  textarea.tsx
│  ├─ AppNav.tsx
│  ├─ AdjudicationPanel.tsx             # verdict + adverse action + override
│  ├─ CitationPanel.tsx                 # compliance checklist + drawer
│  ├─ ShapWaterfall.tsx                 # SHAP horizontal bar chart
│  ├─ QueueTable.tsx                    # searchable/filterable queue table
│  ├─ RiskTierBadge.tsx
│  └─ StatCard.tsx
├─ lib/
│  ├─ ai-service.ts                     # FastAPI client (assess, indexDocument)
│  ├─ auth.ts                           # demo auth shim
│  ├─ prisma.ts                         # Prisma singleton
│  ├─ types.ts                          # exact backend data contracts
│  └─ utils.ts
├─ prisma/
│  ├─ schema.prisma                     # 8 tables + enums
│  └─ seed.ts                           # 5 users + 7 sample applications
├─ public/
├─ .env.example
├─ .dockerignore
├─ .eslintrc.json
├─ .gitignore
├─ Dockerfile
├─ docker-compose.yml
├─ next.config.js
├─ package.json
├─ postcss.config.js
├─ tailwind.config.ts
├─ tsconfig.json
└─ README.md
```
