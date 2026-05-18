# Tech Stack Decisions
## Lumina AI Visibility Platform

**Status:** Decided
**Version:** 1.0.0
**Date:** 2026-05-18
**Owner:** Chief Technical Architect

> This document is the canonical tech stack reference for the Lumina AI Visibility Platform.
> All agents, developers, and tooling must treat these decisions as immutable unless
> a formal ADR (Architecture Decision Record) supersedes a specific entry.
> Agents must never infer stack choices from context — always read from this document.

---

## Decision Summary

| Concern | Decision |
|---|---|
| Frontend Framework | React + TypeScript + Vite |
| Routing | TanStack Router (file-based, type-safe) |
| UI Components | shadcn/ui + Tailwind CSS |
| Component Variants | CVA (class-variance-authority) |
| Design Tokens | tokens.json → CSS custom properties → Tailwind theme |
| Server State | TanStack Query |
| Client State | React Context + URL search params |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Charts | Nivo (via wrapper components) |
| Real-Time | SignalR (@microsoft/signalr) |
| API Mocking | MSW (Mock Service Worker) |
| Unit Testing (FE) | Vitest + React Testing Library |
| E2E Testing | Playwright |
| Component Docs | Storybook |
| Package Manager | pnpm |
| Backend Framework | ASP.NET Core (C#) |
| API Style | Controller-based REST + OpenAPI/Swagger |
| Architecture | Layered modular monolith |
| Database | PostgreSQL + EF Core + Npgsql |
| Validation (BE) | FluentValidation |
| Error Responses | ProblemDetails |
| Message Bus | MassTransit (Azure Service Bus prod, RabbitMQ local) |
| Fast Jobs | Hangfire (PostgreSQL persistence) |
| Auth | Clerk |
| Tenancy | Workspace-based (internal) |
| Unit Testing (BE) | xUnit + FluentAssertions + NSubstitute |
| Integration Testing (BE) | Testcontainers PostgreSQL + WebApplicationFactory |
| Formatting | Centralized formatters.ts with Intl APIs |

---

## 1. Frontend Framework — React + TypeScript + Vite

**Decision:** React with TypeScript in strict mode, built with Vite.

**Constraints this places on agents:**
- All components must be written in TypeScript. No `.jsx` files. No `.js` files in `src/`.
- TypeScript strict mode is mandatory. The following `tsconfig.json` settings are non-negotiable:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- No `any` types except at API boundaries where external data enters the system. Every `any` must include an explicit cast and a comment explaining why.
- All component props must be fully typed with named interfaces or type aliases.
- All async function return types must be explicitly declared — no inferred returns.

**Canonical pattern — functional component with typed props:**
```typescript
// src/features/trackers/components/TrackerCard.tsx
interface TrackerCardProps {
  tracker: Tracker
  onSelect: (id: string) => void
  isActive?: boolean
}

export function TrackerCard({ tracker, onSelect, isActive = false }: TrackerCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 cursor-pointer transition-colors',
        isActive ? 'border-primary-600 bg-primary-50' : 'border-border-default bg-surface-primary'
      )}
      onClick={() => onSelect(tracker.id)}
    >
      <h3 className="text-sm font-medium text-neutral-900">{tracker.name}</h3>
      <p className="text-xs text-neutral-500">{tracker.platform}</p>
    </div>
  )
}
```

**Why not Next.js:** Lumina is a single-page application that lives entirely behind authentication. There is no public-facing content that benefits from SSR or SSG. Vite provides significantly faster HMR during development. Next.js would add server-side complexity (middleware, server components, edge runtime decisions) that creates unnecessary cognitive overhead for agents without delivering value for this use case.

---

## 2. Routing — TanStack Router (File-Based, Type-Safe)

**Decision:** TanStack Router with file-based route generation and full type safety.

**Constraints this places on agents:**
- All routes are defined via file-based routing under `src/routes/`.
- Route params and search params must be fully typed — no `string` coercion or manual parsing.
- Data prefetching uses route loaders that call TanStack Query's `ensureQueryData`.
- Route guards for auth and workspace validation use `beforeLoad`.

**Canonical pattern — route file with loader and component:**
```typescript
// src/routes/brands/$brandId/trackers/$trackerId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { queryClient } from '@/lib/queryClient'
import { trackerQueryOptions } from '@/hooks/useTrackers'
import { TrackerDetailPage } from '@/features/trackers/pages/TrackerDetailPage'

export const Route = createFileRoute('/brands/$brandId/trackers/$trackerId')({
  component: TrackerDetailPage,
  loader: ({ params }) =>
    queryClient.ensureQueryData(trackerQueryOptions(params.trackerId)),
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
})
```

**Search params pattern — typed filter state in URL:**
```typescript
// src/routes/brands/$brandId/findings.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const findingsSearchSchema = z.object({
  platform: z.enum(['chatgpt', 'perplexity', 'gemini', 'all']).optional().default('all'),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'all']).optional().default('all'),
  dateRange: z.enum(['7d', '30d', '90d']).optional().default('30d'),
  page: z.number().optional().default(1),
})

export const Route = createFileRoute('/brands/$brandId/findings')({
  component: FindingsPage,
  validateSearch: findingsSearchSchema,
})
```

**Route file structure:**
```
src/routes/
  __root.tsx                            → Root layout, auth context provider
  index.tsx                             → Dashboard redirect
  login.tsx                             → Login page
  brands/
    $brandId/
      route.tsx                         → Brand layout with sidebar
      index.tsx                         → Brand overview
      trackers/
        index.tsx                       → Tracker list
        $trackerId.tsx                  → Tracker detail
        new.tsx                         → Create tracker form
      findings/
        index.tsx                       → Findings list with filters
        $findingId.tsx                  → Finding detail
      discovery/
        index.tsx                       → Discovery dashboard
        crawl/$crawlId.tsx              → Crawl progress/results
      analytics/
        index.tsx                       → Analytics overview
        visibility-score.tsx            → Visibility score trends
        competitive.tsx                 → Competitive analysis
  settings/
    index.tsx                           → Workspace settings
    team.tsx                            → Team management
```

**Why not React Router:** TanStack Router provides full type safety for route params and search params at the type level. Navigating to `/brands/$brandId` with a missing `brandId` is a compile-time error, not a runtime bug. It pairs naturally with TanStack Query through loaders and the shared query client. React Router v6's type safety is bolt-on and incomplete.

---

## 3. UI Components — shadcn/ui + Tailwind CSS

**Decision:** shadcn/ui component library with Tailwind CSS for styling. Radix UI primitives underpin shadcn/ui.

**Constraints this places on agents:**
- Use shadcn/ui components first for any interactive primitive (Button, Dialog, Select, Dropdown, Tabs, Tooltip, etc.).
- shadcn/ui components are copied into `src/components/ui/` — they are owned code, not node_modules.
- Customization happens exclusively through CVA variants and Tailwind token classes. Never modify the internal Radix primitive wiring of a shadcn component.
- No inline `style={{}}` props for visual styling — Tailwind classes only.
- No raw hex values, rgb values, or arbitrary pixel values anywhere in component files.
- No arbitrary Tailwind values (e.g., `w-[347px]`). Use token-mapped classes only.
- Dark mode and responsive variants follow Tailwind conventions — no custom media queries in component files.

**Canonical pattern — using a shadcn/ui component:**
```typescript
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function CreateTrackerDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default" size="md">Create Tracker</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Tracker</DialogTitle>
        </DialogHeader>
        <CreateTrackerForm />
      </DialogContent>
    </Dialog>
  )
}
```

**Component file structure:**
```
src/components/
  ui/                    → shadcn/ui primitives (Button, Dialog, Select, etc.)
  charts/                → Nivo chart wrappers
  layout/                → Shell, Sidebar, TopBar, PageHeader
  shared/                → Cross-feature reusable components (EmptyState, StatusBadge)
```

**Why not Material UI or Chakra UI:** shadcn/ui components are unstyled/headless, built on Radix primitives, and give full control over styling. Material UI imposes opinionated design decisions and a heavyweight runtime. Chakra UI's styling system conflicts with Tailwind. shadcn/ui's approach of copying components into the project means agents modify real source code, not fight a theming API.

---

## 4. Component Variants — CVA (class-variance-authority)

**Decision:** All component variant styling uses CVA. No exceptions.

**Constraints this places on agents:**
- ALL conditional class logic in components must use CVA variant definitions.
- Never use string concatenation or ternary expressions to build className strings.
- Use `cn()` from `@/lib/utils` for merging CVA output with additional className overrides.
- Variant names must be descriptive string literals — never booleans for variant selection.

**Canonical pattern — CVA component with variants:**
```typescript
// src/components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700',
        secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
        outline: 'border border-border-default bg-transparent hover:bg-neutral-50',
        ghost: 'hover:bg-neutral-100',
        destructive: 'bg-error-600 text-white hover:bg-error-700',
        link: 'text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { buttonVariants }
```

**cn() utility — the only way to merge classes:**
```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Correct vs incorrect patterns:**
```typescript
// CORRECT — CVA variant with cn() merge
<div className={cn(cardVariants({ variant: 'elevated' }), className)} />

// WRONG — string concatenation
<div className={`border ${isActive ? 'border-blue-600' : 'border-gray-300'}`} />

// WRONG — ternary in className
<div className={isActive ? 'bg-blue-50 border-blue-600' : 'bg-white border-gray-200'} />

// WRONG — raw Tailwind color values instead of token classes
<div className="bg-blue-600 text-white" />  // should be bg-primary-600
```

---

## 5. Design Tokens — tokens.json → CSS Custom Properties → Tailwind Theme

**Decision:** All visual values (colors, spacing, typography, shadows, radii) originate from `design-tokens/tokens.json` and flow through a build pipeline into CSS custom properties and Tailwind theme configuration.

**Constraints this places on agents:**
- Never use raw hex, rgb, hsl, or arbitrary pixel values in component files.
- Never use Tailwind's default color palette (e.g., `blue-500`, `gray-300`). All color classes must reference the token-derived theme (e.g., `primary-600`, `neutral-300`).
- Before adding a new token, check `TOKENS.md` for existing tokens that serve the purpose.
- All visual values in components come from Tailwind classes that reference the token theme.

**Token pipeline flow:**
```
tokens.json
  ↓ generate-css.js
tokens.css (CSS custom properties: --color-primary-600, --spacing-4, etc.)
  +
tailwind-tokens.js (Tailwind theme extension)
  ↓
Component classes: bg-primary-600, text-neutral-700, border-border-default
```

**tokens.json structure (excerpt):**
```json
{
  "color": {
    "primary": {
      "50": { "value": "#eff6ff" },
      "100": { "value": "#dbeafe" },
      "500": { "value": "#3b82f6" },
      "600": { "value": "#2563eb" },
      "700": { "value": "#1d4ed8" }
    },
    "neutral": {
      "50": { "value": "#fafafa" },
      "100": { "value": "#f5f5f5" },
      "300": { "value": "#d4d4d4" },
      "500": { "value": "#737373" },
      "700": { "value": "#404040" },
      "900": { "value": "#171717" }
    },
    "error": {
      "600": { "value": "#dc2626" },
      "700": { "value": "#b91c1c" }
    },
    "success": {
      "600": { "value": "#16a34a" }
    },
    "warning": {
      "600": { "value": "#d97706" }
    }
  },
  "border": {
    "default": { "value": "{color.neutral.300}" }
  },
  "surface": {
    "primary": { "value": "{color.neutral.50}" },
    "secondary": { "value": "#ffffff" }
  }
}
```

**Tailwind config — how tokens become classes:**
```typescript
// tailwind.config.ts
import tokens from './tailwind-tokens.js'

export default {
  theme: {
    extend: {
      colors: {
        'primary': tokens.colors.primary,     // primary-50 through primary-700
        'neutral': tokens.colors.neutral,
        'error': tokens.colors.error,
        'success': tokens.colors.success,
        'warning': tokens.colors.warning,
        'border-default': 'var(--color-border-default)',
        'surface-primary': 'var(--color-surface-primary)',
        'surface-secondary': 'var(--color-surface-secondary)',
      },
      fontFamily: tokens.fontFamily,
      borderRadius: tokens.borderRadius,
      boxShadow: tokens.boxShadow,
      spacing: tokens.spacing,
    },
  },
}
```

**Canonical usage in components:**
```typescript
// CORRECT — token-derived Tailwind classes
<div className="bg-surface-primary border border-border-default rounded-lg shadow-card">
  <h2 className="text-lg font-semibold text-neutral-900">Tracker Overview</h2>
  <p className="text-sm text-neutral-500">Last scanned 2 hours ago</p>
  <Badge variant="success">Active</Badge>
</div>

// WRONG — raw hex values
<div style={{ backgroundColor: '#fafafa', borderColor: '#d4d4d4' }}>

// WRONG — Tailwind default palette
<div className="bg-gray-50 border-gray-300">
```

---

## 6. Server State — TanStack Query

**Decision:** All server data is fetched and cached via TanStack Query hooks. No exceptions.

**Constraints this places on agents:**
- No `fetch()` or `axios` calls inside component files — all API calls go through the API layer (`src/api/`) and are consumed via TanStack Query hooks.
- No server data stored in React Context or any client state manager.
- Query keys follow a hierarchical factory pattern for consistent invalidation.
- Query options are defined as standalone functions for reuse in route loaders.
- Mutations use `useMutation` with explicit `onSuccess` invalidation — no manual cache manipulation except where optimistic updates are required.

**Canonical pattern — query key factory + hook:**
```typescript
// src/hooks/useTrackers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTrackers, getTracker, createTracker } from '@/api/trackersApi'
import type { TrackerFilters, CreateTrackerRequest } from '@/types/trackers'

export const trackerKeys = {
  all: ['trackers'] as const,
  lists: () => [...trackerKeys.all, 'list'] as const,
  list: (filters: TrackerFilters) => [...trackerKeys.lists(), filters] as const,
  details: () => [...trackerKeys.all, 'detail'] as const,
  detail: (id: string) => [...trackerKeys.details(), id] as const,
}

export function trackerQueryOptions(id: string) {
  return {
    queryKey: trackerKeys.detail(id),
    queryFn: () => getTracker(id),
  }
}

export function useTrackers(filters: TrackerFilters) {
  return useQuery({
    queryKey: trackerKeys.list(filters),
    queryFn: () => getTrackers(filters),
  })
}

export function useTracker(id: string) {
  return useQuery(trackerQueryOptions(id))
}

export function useCreateTracker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTrackerRequest) => createTracker(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trackerKeys.lists() })
    },
  })
}
```

**API layer pattern — clean separation from hooks:**
```typescript
// src/api/trackersApi.ts
import { apiClient } from '@/api/client'
import type { Tracker, TrackerFilters, CreateTrackerRequest } from '@/types/trackers'

export async function getTrackers(filters: TrackerFilters): Promise<Tracker[]> {
  const response = await apiClient.get<Tracker[]>('/api/trackers', { params: filters })
  return response.data
}

export async function getTracker(id: string): Promise<Tracker> {
  const response = await apiClient.get<Tracker>(`/api/trackers/${id}`)
  return response.data
}

export async function createTracker(data: CreateTrackerRequest): Promise<Tracker> {
  const response = await apiClient.post<Tracker>('/api/trackers', data)
  return response.data
}
```

**Why not SWR:** TanStack Query provides superior mutation support with built-in optimistic updates, structured query invalidation via key factories, and first-class prefetching that integrates with TanStack Router loaders. SWR's mutation story requires additional abstraction to reach the same level of capability.

---

## 7. Client State — React Context + URL Search Params

**Decision:** React Context for small app-level UI state. URL search params for filter and view state. No dedicated client state library in v1.

**Constraints this places on agents:**
- React Context is used only for: sidebar collapsed state, active theme, toast notifications, and similar ephemeral UI concerns.
- URL search params (managed by TanStack Router) hold all filter state, pagination, sorting, and view toggles. This makes views bookmarkable and shareable.
- Do NOT use Zustand, Jotai, Redux, or any third-party state library in v1.
- Server data never lives in React Context — that is TanStack Query's responsibility.

**Canonical pattern — React Context for UI state:**
```typescript
// src/contexts/SidebarContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react'

interface SidebarContextValue {
  collapsed: boolean
  toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <SidebarContext.Provider value={{ collapsed, toggleSidebar: () => setCollapsed(c => !c) }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) throw new Error('useSidebar must be used within SidebarProvider')
  return context
}
```

**Canonical pattern — URL search params for filters:**
```typescript
// Inside a route component
import { useSearch, useNavigate } from '@tanstack/react-router'

function FindingsFilters() {
  const { platform, sentiment, dateRange } = useSearch({ from: '/brands/$brandId/findings' })
  const navigate = useNavigate()

  function setPlatformFilter(value: string) {
    navigate({
      search: (prev) => ({ ...prev, platform: value, page: 1 }),
    })
  }

  return (
    <Select value={platform} onValueChange={setPlatformFilter}>
      {/* options */}
    </Select>
  )
}
```

**Why not Zustand:** Lumina v1 has minimal true client state. TanStack Query handles all server state. URL search params handle filter, pagination, and view state. The remaining UI state (sidebar toggle, theme preference) is trivially handled by React Context. Adding Zustand would be premature abstraction — it introduces a new pattern agents must learn and maintain for negligible benefit. If v2 introduces complex client-only workflows, Zustand can be added at that point.

---

## 8. Forms — React Hook Form + Zod

**Decision:** All forms use React Hook Form with Zod schema validation via `@hookform/resolvers/zod`.

**Constraints this places on agents:**
- Every form uses `useForm` with a `zodResolver`. No manual `useState` for form fields.
- Validation schemas are defined in Zod. Form data types are derived via `z.infer<>` — never manually duplicated.
- Error messages are defined in the Zod schema, not in component JSX.
- Complex forms with conditional fields use Zod's `.refine()` and `.superRefine()` — no imperative validation in `onSubmit`.

**Canonical pattern — form with Zod validation:**
```typescript
// src/features/trackers/components/CreateTrackerForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateTracker } from '@/hooks/useTrackers'

const trackerSchema = z.object({
  name: z.string().min(1, 'Tracker name is required').max(100, 'Name must be 100 characters or fewer'),
  brandId: z.string().uuid('Invalid brand ID'),
  platforms: z.array(z.string()).min(1, 'Select at least one platform'),
  promptTemplate: z.string().min(10, 'Prompt template must be at least 10 characters'),
  schedule: z.enum(['daily', 'weekly', 'manual']),
})

type TrackerFormData = z.infer<typeof trackerSchema>

export function CreateTrackerForm({ brandId }: { brandId: string }) {
  const createTracker = useCreateTracker()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TrackerFormData>({
    resolver: zodResolver(trackerSchema),
    defaultValues: {
      brandId,
      platforms: [],
      schedule: 'daily',
    },
  })

  async function onSubmit(data: TrackerFormData) {
    await createTracker.mutateAsync(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-neutral-700">Tracker Name</label>
        <Input {...register('name')} placeholder="e.g., Brand Mentions in ChatGPT" />
        {errors.name && <p className="text-sm text-error-600 mt-1">{errors.name.message}</p>}
      </div>
      {/* ... other fields ... */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Tracker'}
      </Button>
    </form>
  )
}
```

---

## 9. Tables — TanStack Table

**Decision:** All data tables use TanStack Table with typed column definitions.

**Constraints this places on agents:**
- Column definitions use `createColumnHelper<T>()` for full type safety.
- Tables receive data as props — no data fetching inside table components.
- Sorting, filtering, and pagination state lives in URL search params (via TanStack Router), not in component state.
- Cell renderers are pure functions — no side effects, no hooks inside cell render functions.

**Canonical pattern — typed table with column helper:**
```typescript
// src/features/findings/components/FindingsTable.tsx
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table'
import type { Finding } from '@/types/findings'
import { SentimentBadge } from '@/components/shared/SentimentBadge'
import { formatRelativeDate } from '@/lib/formatters'

const columnHelper = createColumnHelper<Finding>()

const columns = [
  columnHelper.accessor('platform', {
    header: 'Platform',
    cell: (info) => <span className="font-medium text-neutral-900">{info.getValue()}</span>,
  }),
  columnHelper.accessor('prompt', {
    header: 'Prompt',
    cell: (info) => (
      <span className="text-sm text-neutral-700 truncate max-w-xs block">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('sentiment', {
    header: 'Sentiment',
    cell: (info) => <SentimentBadge sentiment={info.getValue()} />,
  }),
  columnHelper.accessor('mentionCount', {
    header: 'Mentions',
    cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
  }),
  columnHelper.accessor('discoveredAt', {
    header: 'Discovered',
    cell: (info) => formatRelativeDate(info.getValue()),
  }),
]

interface FindingsTableProps {
  data: Finding[]
}

export function FindingsTable({ data }: FindingsTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <table className="w-full text-sm">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} className="border-b border-border-default">
            {headerGroup.headers.map((header) => (
              <th key={header.id} className="text-left py-3 px-4 text-neutral-500 font-medium">
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="border-b border-border-default hover:bg-neutral-50">
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="py-3 px-4">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## 10. Charts — Nivo (via Wrapper Components)

**Decision:** All charts use Nivo, accessed exclusively through wrapper components in `src/components/charts/`.

**Constraints this places on agents:**
- No direct Nivo imports in feature components. Feature code imports from `@/components/charts/`.
- Chart wrapper components receive prepared data as props. No business metric calculation, data transformation, or API calls inside chart wrappers.
- Chart wrappers provide sensible Lumina-branded defaults (colors from tokens, consistent margins, typography) but allow override via props.
- All chart containers must have explicit height (via Tailwind class, not inline style).

**Canonical pattern — bar chart wrapper:**
```typescript
// src/components/charts/BarChartWrapper.tsx
import { ResponsiveBar, type BarDatum } from '@nivo/bar'

interface BarChartWrapperProps {
  data: BarDatum[]
  keys: string[]
  indexBy: string
  axisBottomLabel?: string
  axisLeftLabel?: string
  colorScheme?: string[]
}

const defaultColors = [
  'var(--color-primary-600)',
  'var(--color-primary-400)',
  'var(--color-neutral-400)',
]

export function BarChartWrapper({
  data,
  keys,
  indexBy,
  axisBottomLabel,
  axisLeftLabel,
  colorScheme = defaultColors,
}: BarChartWrapperProps) {
  return (
    <div className="h-[300px]">
      <ResponsiveBar
        data={data}
        keys={keys}
        indexBy={indexBy}
        margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
        padding={0.3}
        colors={colorScheme}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          legend: axisBottomLabel,
          legendPosition: 'middle',
          legendOffset: 40,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          legend: axisLeftLabel,
          legendPosition: 'middle',
          legendOffset: -50,
        }}
        theme={{
          text: { fontFamily: 'var(--font-family-sans)', fontSize: 12 },
          axis: { ticks: { text: { fill: 'var(--color-neutral-500)' } } },
          grid: { line: { stroke: 'var(--color-neutral-100)' } },
        }}
      />
    </div>
  )
}
```

**Canonical pattern — line chart wrapper:**
```typescript
// src/components/charts/LineChartWrapper.tsx
import { ResponsiveLine, type Serie } from '@nivo/line'

interface LineChartWrapperProps {
  data: Serie[]
  xScaleType?: 'point' | 'time'
  enableArea?: boolean
  yAxisLabel?: string
}

export function LineChartWrapper({
  data,
  xScaleType = 'point',
  enableArea = false,
  yAxisLabel,
}: LineChartWrapperProps) {
  return (
    <div className="h-[300px]">
      <ResponsiveLine
        data={data}
        margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
        xScale={{ type: xScaleType }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        enableArea={enableArea}
        colors={['var(--color-primary-600)', 'var(--color-error-600)', 'var(--color-success-600)']}
        pointSize={6}
        pointColor="var(--color-surface-secondary)"
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        useMesh
        axisLeft={{
          legend: yAxisLabel,
          legendPosition: 'middle',
          legendOffset: -50,
        }}
        theme={{
          text: { fontFamily: 'var(--font-family-sans)', fontSize: 12 },
          axis: { ticks: { text: { fill: 'var(--color-neutral-500)' } } },
          grid: { line: { stroke: 'var(--color-neutral-100)' } },
        }}
      />
    </div>
  )
}
```

**Usage in feature component:**
```typescript
// src/features/analytics/components/VisibilityTrend.tsx
import { LineChartWrapper } from '@/components/charts/LineChartWrapper'
import { useVisibilityTrend } from '@/hooks/useAnalytics'

export function VisibilityTrend({ brandId }: { brandId: string }) {
  const { data, isLoading } = useVisibilityTrend(brandId)

  if (isLoading) return <ChartSkeleton />

  // Data transformation happens HERE, not inside the chart wrapper
  const chartData = transformToNivoSeries(data)

  return <LineChartWrapper data={chartData} enableArea yAxisLabel="Visibility Score" />
}
```

**Why not Recharts:** Nivo provides a broader range of chart types (radar, sankey, waffle, heatmap) that Lumina's competitive analysis features will need. Nivo has better TypeScript support with fully typed datum interfaces. Its declarative configuration model produces more predictable output from agents than Recharts' component-composition API.

---

## 11. Real-Time — SignalR (@microsoft/signalr)

**Decision:** `@microsoft/signalr` for all real-time communication between the ASP.NET Core backend and the React frontend.

**Constraints this places on agents:**
- A shared `useSignalR` hook manages hub connection lifecycle (connect, reconnect, disconnect on unmount).
- Hub connections are scoped per authenticated user and workspace.
- SignalR is used for: discovery crawl progress, scan execution progress, analysis pipeline updates, and real-time notification delivery.
- Components never create `HubConnection` instances directly — they consume the `useSignalR` hook.

**Canonical pattern — useSignalR hook:**
```typescript
// src/hooks/useSignalR.ts
import { useEffect, useRef, useCallback } from 'react'
import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
  HubConnectionState,
} from '@microsoft/signalr'
import { useAuth } from '@/hooks/useAuth'

interface UseSignalROptions {
  hubUrl: string
  onReconnecting?: () => void
  onReconnected?: () => void
}

export function useSignalR({ hubUrl, onReconnecting, onReconnected }: UseSignalROptions) {
  const connectionRef = useRef<HubConnection | null>(null)
  const { getToken } = useAuth()

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => getToken(),
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    connection.onreconnecting(() => onReconnecting?.())
    connection.onreconnected(() => onReconnected?.())

    connection.start().catch(console.error)
    connectionRef.current = connection

    return () => {
      connection.stop()
    }
  }, [hubUrl, getToken])

  const on = useCallback(
    <T>(event: string, handler: (data: T) => void) => {
      connectionRef.current?.on(event, handler)
      return () => connectionRef.current?.off(event, handler)
    },
    []
  )

  const invoke = useCallback(
    async <T>(method: string, ...args: unknown[]): Promise<T> => {
      if (connectionRef.current?.state !== HubConnectionState.Connected) {
        throw new Error('SignalR connection not established')
      }
      return connectionRef.current.invoke<T>(method, ...args)
    },
    []
  )

  return { on, invoke, connection: connectionRef.current }
}
```

**Usage in feature component — crawl progress:**
```typescript
// src/features/discovery/hooks/useCrawlProgress.ts
import { useEffect, useState } from 'react'
import { useSignalR } from '@/hooks/useSignalR'

interface CrawlProgress {
  crawlId: string
  pagesScanned: number
  totalPages: number
  status: 'running' | 'completed' | 'failed'
}

export function useCrawlProgress(crawlId: string) {
  const [progress, setProgress] = useState<CrawlProgress | null>(null)
  const { on } = useSignalR({ hubUrl: '/hubs/discovery' })

  useEffect(() => {
    const unsubscribe = on<CrawlProgress>('CrawlProgressUpdated', (data) => {
      if (data.crawlId === crawlId) {
        setProgress(data)
      }
    })
    return unsubscribe
  }, [crawlId, on])

  return progress
}
```

---

## 12. API Mocking — MSW (Mock Service Worker)

**Decision:** All API mocking in development, Storybook, and tests uses MSW.

**Constraints this places on agents:**
- MSW request handlers are defined alongside their corresponding API modules in `src/api/__mocks__/`.
- MSW is used in Storybook (via `msw-storybook-addon`) for all stories that display API data.
- MSW is used in Vitest for all tests that exercise API-dependent logic.
- Never use `vi.mock()` or `jest.mock()` for API modules — MSW intercepts at the network level.
- Mock data factories produce realistic Lumina domain objects (trackers, findings, brands).

**Canonical pattern — MSW handler:**
```typescript
// src/api/__mocks__/trackersHandlers.ts
import { http, HttpResponse } from 'msw'
import { mockTrackers, mockTracker } from './data/trackers'

export const trackersHandlers = [
  http.get('/api/trackers', ({ request }) => {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')

    const filtered = brandId
      ? mockTrackers.filter((t) => t.brandId === brandId)
      : mockTrackers

    return HttpResponse.json(filtered)
  }),

  http.get('/api/trackers/:id', ({ params }) => {
    const tracker = mockTracker(params.id as string)
    if (!tracker) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(tracker)
  }),

  http.post('/api/trackers', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString() },
      { status: 201 }
    )
  }),
]
```

**Mock data factory pattern:**
```typescript
// src/api/__mocks__/data/trackers.ts
import type { Tracker } from '@/types/trackers'

export const mockTrackers: Tracker[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'ChatGPT Brand Mentions',
    brandId: 'brand-001',
    platform: 'chatgpt',
    schedule: 'daily',
    status: 'active',
    lastScanAt: '2026-05-17T14:30:00Z',
    createdAt: '2026-04-01T10:00:00Z',
  },
  // ... more mock trackers
]

export function mockTracker(id: string): Tracker | undefined {
  return mockTrackers.find((t) => t.id === id)
}
```

**Test setup:**
```typescript
// src/test/setup.ts
import { setupServer } from 'msw/node'
import { trackersHandlers } from '@/api/__mocks__/trackersHandlers'
import { findingsHandlers } from '@/api/__mocks__/findingsHandlers'

export const server = setupServer(...trackersHandlers, ...findingsHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

## 13. Testing — Frontend (Vitest + React Testing Library + Playwright)

**Decision:** Vitest and React Testing Library for unit and component tests. Playwright for end-to-end tests.

### Unit / Component Testing

**Constraints this places on agents:**
- Test files are co-located with their source files: `TrackerCard.test.tsx` next to `TrackerCard.tsx`.
- Query elements by accessible role and label text — never by CSS class name or DOM structure.
- Use `userEvent` from `@testing-library/user-event` over `fireEvent` for realistic interaction simulation.
- Use MSW for all API mocking — no `vi.mock()` for API modules.
- `data-testid` is reserved for E2E tests only — unit tests must not rely on test IDs.

**Canonical pattern — component test:**
```typescript
// src/features/trackers/components/TrackerCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TrackerCard } from './TrackerCard'
import { mockTrackers } from '@/api/__mocks__/data/trackers'

const tracker = mockTrackers[0]

describe('TrackerCard', () => {
  it('renders tracker name and platform', () => {
    render(<TrackerCard tracker={tracker} onSelect={vi.fn()} />)

    expect(screen.getByText('ChatGPT Brand Mentions')).toBeInTheDocument()
    expect(screen.getByText('chatgpt')).toBeInTheDocument()
  })

  it('calls onSelect with tracker id when clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(<TrackerCard tracker={tracker} onSelect={onSelect} />)

    await user.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith(tracker.id)
  })

  it('applies active styling when isActive is true', () => {
    render(<TrackerCard tracker={tracker} onSelect={vi.fn()} isActive />)

    const card = screen.getByRole('button')
    expect(card.className).toContain('border-primary-600')
  })
})
```

**Hook test pattern:**
```typescript
// src/hooks/useTrackers.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { useTrackers } from './useTrackers'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useTrackers', () => {
  it('returns tracker list for given filters', async () => {
    const { result } = renderHook(
      () => useTrackers({ brandId: 'brand-001' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
  })
})
```

### E2E Testing — Playwright

**Constraints this places on agents:**
- E2E tests live in `/e2e/` at the project root, not inside `src/`.
- Page Object Models live in `/e2e/pages/`.
- Use `data-testid` attributes for E2E selectors — stable across refactors.
- E2E tests cover critical user journeys, not individual components.

**Critical E2E flows for Lumina:**
```
1. Discovery → Tracker Creation → Scan → Findings Review
2. Brand Setup → Platform Selection → Initial Scan
3. Findings List → Filter → Detail → Export
4. Analytics Dashboard → Date Range Change → Competitive View
```

**Canonical pattern — Playwright test:**
```typescript
// e2e/trackers/create-tracker.spec.ts
import { test, expect } from '@playwright/test'
import { TrackerPage } from '../pages/TrackerPage'

test.describe('Create Tracker Flow', () => {
  test('user can create a new tracker and see it in the list', async ({ page }) => {
    const trackerPage = new TrackerPage(page)

    await trackerPage.goto()
    await trackerPage.clickCreateTracker()
    await trackerPage.fillTrackerName('Perplexity Mentions')
    await trackerPage.selectPlatform('perplexity')
    await trackerPage.selectSchedule('daily')
    await trackerPage.submit()

    await expect(page.getByTestId('tracker-list')).toContainText('Perplexity Mentions')
  })
})
```

---

## 14. Component Docs — Storybook

**Decision:** Storybook for component documentation and visual development.

**Constraints this places on agents:**
- Every reusable component in `src/components/` must have a `.stories.tsx` file.
- One story per variant/state combination.
- Feature-level components (`src/features/*/components/`) have optional stories.
- Stories for API-dependent components use MSW addon for mock data.
- Stories are co-located with their components.

**Canonical pattern — component stories:**
```typescript
// src/components/ui/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = { args: { children: 'Create Tracker', variant: 'default' } }
export const Secondary: Story = { args: { children: 'Cancel', variant: 'secondary' } }
export const Outline: Story = { args: { children: 'Export', variant: 'outline' } }
export const Ghost: Story = { args: { children: 'Settings', variant: 'ghost' } }
export const Destructive: Story = { args: { children: 'Delete', variant: 'destructive' } }
export const SmallSize: Story = { args: { children: 'Filter', variant: 'default', size: 'sm' } }
export const LargeSize: Story = { args: { children: 'Get Started', variant: 'default', size: 'lg' } }
export const Disabled: Story = { args: { children: 'Submit', variant: 'default', disabled: true } }
```

**MSW-dependent story pattern:**
```typescript
// src/features/trackers/components/TrackerList.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { TrackerList } from './TrackerList'
import { trackersHandlers } from '@/api/__mocks__/trackersHandlers'

const meta: Meta<typeof TrackerList> = {
  title: 'Features/Trackers/TrackerList',
  component: TrackerList,
  parameters: {
    msw: { handlers: trackersHandlers },
  },
}

export default meta
type Story = StoryObj<typeof TrackerList>

export const WithData: Story = { args: { brandId: 'brand-001' } }
export const Empty: Story = { args: { brandId: 'brand-empty' } }
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/trackers', async () => {
          await delay('infinite')
          return HttpResponse.json([])
        }),
      ],
    },
  },
}
```

---

## 15. Backend Framework — ASP.NET Core (C#)

**Decision:** ASP.NET Core with controller-based REST APIs and OpenAPI/Swagger documentation.

**Constraints this places on agents:**
- Controllers are thin dispatchers. They validate input, call a handler, and return a DTO. No business logic in controllers.
- Commands (write operations) mutate state. Queries (read operations) read state. They are separate classes.
- Handlers orchestrate domain logic. One handler per command or query.
- DTOs are explicitly mapped — no AutoMapper. Mapping methods live on the DTO or in a static mapper class.
- No generic repository pattern. Handlers interact with `DbContext` directly.
- All endpoints produce OpenAPI documentation via Swagger attributes.

**Canonical pattern — thin controller:**
```csharp
// Controllers/TrackersController.cs
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class TrackersController : ControllerBase
{
    private readonly CreateTrackerHandler _createHandler;
    private readonly GetTrackersHandler _getHandler;
    private readonly GetTrackerByIdHandler _getByIdHandler;

    public TrackersController(
        CreateTrackerHandler createHandler,
        GetTrackersHandler getHandler,
        GetTrackerByIdHandler getByIdHandler)
    {
        _createHandler = createHandler;
        _getHandler = getHandler;
        _getByIdHandler = getByIdHandler;
    }

    [HttpPost]
    [ProducesResponseType(typeof(TrackerDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateTrackerCommand command)
    {
        var result = await _createHandler.HandleAsync(command);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<TrackerDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] GetTrackersQuery query)
    {
        var result = await _getHandler.HandleAsync(query);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(TrackerDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _getByIdHandler.HandleAsync(id);
        if (result is null) return NotFound();
        return Ok(result);
    }
}
```

**Canonical pattern — handler with explicit DTO mapping:**
```csharp
// Handlers/CreateTrackerHandler.cs
public class CreateTrackerHandler
{
    private readonly LuminaDbContext _db;
    private readonly ICurrentUser _currentUser;

    public CreateTrackerHandler(LuminaDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<TrackerDto> HandleAsync(CreateTrackerCommand command)
    {
        var tracker = new Tracker
        {
            Id = Guid.NewGuid(),
            Name = command.Name,
            BrandId = command.BrandId,
            Platforms = command.Platforms,
            PromptTemplate = command.PromptTemplate,
            Schedule = command.Schedule,
            WorkspaceId = _currentUser.WorkspaceId,
            CreatedBy = _currentUser.UserId,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Trackers.Add(tracker);
        await _db.SaveChangesAsync();

        return TrackerDto.FromEntity(tracker);
    }
}
```

**Canonical pattern — explicit DTO mapping (no AutoMapper):**
```csharp
// DTOs/TrackerDto.cs
public record TrackerDto(
    Guid Id,
    string Name,
    Guid BrandId,
    List<string> Platforms,
    string Schedule,
    string Status,
    DateTime? LastScanAt,
    DateTime CreatedAt)
{
    public static TrackerDto FromEntity(Tracker entity) => new(
        entity.Id,
        entity.Name,
        entity.BrandId,
        entity.Platforms,
        entity.Schedule.ToString().ToLowerInvariant(),
        entity.Status.ToString().ToLowerInvariant(),
        entity.LastScanAt,
        entity.CreatedAt
    );
}
```

**Why no AutoMapper:** AutoMapper introduces implicit mapping logic that agents cannot trace. When a DTO field doesn't populate correctly, agents must search through AutoMapper profiles, conventions, and custom resolvers. Explicit `FromEntity` methods are greppable, debuggable, and produce compile errors when entity shapes change.

**Why no generic repositories:** Generic repositories add a layer of abstraction over EF Core that is itself already a repository and unit-of-work pattern. They hide EF Core's powerful query capabilities (Include, projection, split queries) behind a lowest-common-denominator interface. Handlers use DbContext directly, which is simpler and more powerful.

---

## 16. Database — EF Core + PostgreSQL + Npgsql

**Decision:** Entity Framework Core with Npgsql provider targeting PostgreSQL.

**Constraints this places on agents:**
- Handlers query `DbContext` directly — no repository abstraction.
- Entity configurations live in separate `IEntityTypeConfiguration<T>` files, one per entity.
- Migrations are generated and applied via EF Core CLI (`dotnet ef migrations add`, `dotnet ef database update`).
- Use `AsNoTracking()` for all read-only queries.
- Use projection (`.Select()`) for list queries to avoid over-fetching.

**Canonical pattern — entity configuration:**
```csharp
// Data/Configurations/TrackerConfiguration.cs
public class TrackerConfiguration : IEntityTypeConfiguration<Tracker>
{
    public void Configure(EntityTypeBuilder<Tracker> builder)
    {
        builder.ToTable("trackers");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Name).HasMaxLength(100).IsRequired();
        builder.Property(t => t.Platforms).HasColumnType("jsonb");
        builder.Property(t => t.Schedule).HasConversion<string>();
        builder.HasIndex(t => new { t.WorkspaceId, t.BrandId });
        builder.HasOne<Brand>().WithMany().HasForeignKey(t => t.BrandId);
    }
}
```

**Canonical pattern — handler querying DbContext:**
```csharp
// Handlers/GetTrackersHandler.cs
public class GetTrackersHandler
{
    private readonly LuminaDbContext _db;
    private readonly ICurrentUser _currentUser;

    public GetTrackersHandler(LuminaDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<List<TrackerDto>> HandleAsync(GetTrackersQuery query)
    {
        return await _db.Trackers
            .AsNoTracking()
            .Where(t => t.WorkspaceId == _currentUser.WorkspaceId)
            .Where(t => query.BrandId == null || t.BrandId == query.BrandId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new TrackerDto(
                t.Id, t.Name, t.BrandId, t.Platforms,
                t.Schedule.ToString().ToLowerInvariant(),
                t.Status.ToString().ToLowerInvariant(),
                t.LastScanAt, t.CreatedAt))
            .ToListAsync();
    }
}
```

---

## 17. Validation (Backend) — FluentValidation

**Decision:** All command validation uses FluentValidation. Validators are auto-registered via assembly scanning.

**Constraints this places on agents:**
- Every command class has a corresponding validator class.
- Validators are registered via `AddValidatorsFromAssembly` at startup.
- Validation failures return RFC 7807 `ProblemDetails` responses with a 400 status code.
- Validators contain only input validation — business rules live in handlers.

**Canonical pattern — command validator:**
```csharp
// Validators/CreateTrackerCommandValidator.cs
public class CreateTrackerCommandValidator : AbstractValidator<CreateTrackerCommand>
{
    public CreateTrackerCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Tracker name is required")
            .MaximumLength(100).WithMessage("Tracker name must be 100 characters or fewer");

        RuleFor(x => x.BrandId)
            .NotEmpty().WithMessage("Brand ID is required");

        RuleFor(x => x.Platforms)
            .NotEmpty().WithMessage("At least one platform must be selected")
            .ForEach(p => p.Must(BeValidPlatform).WithMessage("Invalid platform: {PropertyValue}"));

        RuleFor(x => x.PromptTemplate)
            .MinimumLength(10).WithMessage("Prompt template must be at least 10 characters")
            .When(x => !string.IsNullOrEmpty(x.PromptTemplate));

        RuleFor(x => x.Schedule)
            .IsInEnum().WithMessage("Schedule must be daily, weekly, or manual");
    }

    private static bool BeValidPlatform(string platform)
    {
        return new[] { "chatgpt", "perplexity", "gemini", "copilot", "claude" }.Contains(platform);
    }
}
```

**ProblemDetails integration:**
```csharp
// Middleware/ValidationExceptionMiddleware.cs
// FluentValidation failures are caught and returned as ProblemDetails
// Response example:
// {
//   "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
//   "title": "Validation Error",
//   "status": 400,
//   "errors": {
//     "Name": ["Tracker name is required"],
//     "Platforms": ["At least one platform must be selected"]
//   }
// }
```

---

## 18. Message Bus — MassTransit (Azure Service Bus / RabbitMQ)

**Decision:** MassTransit for all durable asynchronous messaging. Azure Service Bus in production, RabbitMQ for local development.

**Constraints this places on agents:**
- All durable background work flows through MassTransit consumers — not Hangfire, not Task.Run, not fire-and-forget threads.
- Multi-step scan orchestration uses MassTransit saga/state machines.
- Message contracts are defined in a shared contracts project.
- Consumers are idempotent — they must handle duplicate delivery safely.
- Transport configuration is environment-based: Azure Service Bus in production and staging, RabbitMQ in development and CI.

**Canonical pattern — message contract:**
```csharp
// Contracts/Messages/ScanRequested.cs
namespace Lumina.Contracts.Messages;

public record ScanRequested(
    Guid ScanId,
    Guid TrackerId,
    Guid WorkspaceId,
    List<string> Platforms,
    string PromptTemplate,
    DateTime RequestedAt
);
```

**Canonical pattern — consumer:**
```csharp
// Consumers/ScanRequestedConsumer.cs
public class ScanRequestedConsumer : IConsumer<ScanRequested>
{
    private readonly LuminaDbContext _db;
    private readonly IPlatformScannerFactory _scannerFactory;
    private readonly ILogger<ScanRequestedConsumer> _logger;

    public ScanRequestedConsumer(
        LuminaDbContext db,
        IPlatformScannerFactory scannerFactory,
        ILogger<ScanRequestedConsumer> logger)
    {
        _db = db;
        _scannerFactory = scannerFactory;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ScanRequested> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Processing scan {ScanId} for tracker {TrackerId}", msg.ScanId, msg.TrackerId);

        foreach (var platform in msg.Platforms)
        {
            var scanner = _scannerFactory.Create(platform);
            var findings = await scanner.ExecuteAsync(msg.PromptTemplate);

            _db.Findings.AddRange(findings.Select(f => new Finding
            {
                Id = Guid.NewGuid(),
                ScanId = msg.ScanId,
                TrackerId = msg.TrackerId,
                Platform = platform,
                Prompt = f.Prompt,
                Response = f.Response,
                Sentiment = f.Sentiment,
                MentionCount = f.MentionCount,
                DiscoveredAt = DateTime.UtcNow,
            }));
        }

        await _db.SaveChangesAsync();
        await context.Publish(new ScanCompleted(msg.ScanId, msg.TrackerId, DateTime.UtcNow));
    }
}
```

**Canonical pattern — saga state machine for multi-step scan orchestration:**
```csharp
// Sagas/ScanOrchestrationSaga.cs
public class ScanOrchestrationSaga : MassTransitStateMachine<ScanOrchestrationState>
{
    public State Scanning { get; private set; } = null!;
    public State Analyzing { get; private set; } = null!;
    public State Completed { get; private set; } = null!;
    public State Failed { get; private set; } = null!;

    public Event<ScanRequested> ScanRequested { get; private set; } = null!;
    public Event<ScanCompleted> ScanCompleted { get; private set; } = null!;
    public Event<AnalysisCompleted> AnalysisCompleted { get; private set; } = null!;

    public ScanOrchestrationSaga()
    {
        InstanceState(x => x.CurrentState);

        Event(() => ScanRequested, x => x.CorrelateById(ctx => ctx.Message.ScanId));
        Event(() => ScanCompleted, x => x.CorrelateById(ctx => ctx.Message.ScanId));
        Event(() => AnalysisCompleted, x => x.CorrelateById(ctx => ctx.Message.ScanId));

        Initially(
            When(ScanRequested)
                .Then(ctx => ctx.Saga.TrackerId = ctx.Message.TrackerId)
                .TransitionTo(Scanning));

        During(Scanning,
            When(ScanCompleted)
                .Publish(ctx => new AnalyzeFindings(ctx.Saga.CorrelationId, ctx.Saga.TrackerId))
                .TransitionTo(Analyzing));

        During(Analyzing,
            When(AnalysisCompleted)
                .Then(ctx => ctx.Saga.CompletedAt = DateTime.UtcNow)
                .TransitionTo(Completed)
                .Finalize());
    }
}
```

---

## 19. Fast Jobs — Hangfire (PostgreSQL Persistence)

**Decision:** Hangfire for simple fire-and-forget background jobs and scheduled recurring tasks.

**Constraints this places on agents:**
- Hangfire is used only for: triggering discovery crawls, scheduling recurring scan executions, and sending notification digests.
- Hangfire jobs must be simple dispatchers that publish MassTransit messages — they do not contain business logic themselves.
- No long chains of Hangfire continuations. If a workflow has more than one step, use MassTransit saga orchestration.
- Hangfire uses PostgreSQL for job persistence (same database, separate schema).

**Canonical pattern — scheduled job that dispatches to MassTransit:**
```csharp
// Jobs/ScheduledScanJob.cs
public class ScheduledScanJob
{
    private readonly IBus _bus;
    private readonly LuminaDbContext _db;

    public ScheduledScanJob(IBus bus, LuminaDbContext db)
    {
        _bus = bus;
        _db = db;
    }

    public async Task ExecuteAsync()
    {
        var dueTrackers = await _db.Trackers
            .AsNoTracking()
            .Where(t => t.Status == TrackerStatus.Active)
            .Where(t => t.Schedule == Schedule.Daily)
            .Where(t => t.LastScanAt == null || t.LastScanAt < DateTime.UtcNow.AddHours(-23))
            .ToListAsync();

        foreach (var tracker in dueTrackers)
        {
            await _bus.Publish(new ScanRequested(
                Guid.NewGuid(),
                tracker.Id,
                tracker.WorkspaceId,
                tracker.Platforms,
                tracker.PromptTemplate,
                DateTime.UtcNow));
        }
    }
}

// Registration at startup:
// RecurringJob.AddOrUpdate<ScheduledScanJob>("daily-scans", j => j.ExecuteAsync(), Cron.Hourly);
```

---

## 20. Formatting — Centralized formatters.ts with Intl APIs

**Decision:** All date, time, number, currency, and percentage formatting goes through centralized formatter functions using browser Intl APIs.

**Constraints this places on agents:**
- Never use `.toLocaleDateString()`, `moment`, `dayjs`, or manual string formatting in components.
- All formatting functions live in `src/lib/formatters.ts`.
- Formatters accept workspace-level locale, timezone, and currency configuration from day one.
- Components call formatter functions — they never construct `Intl.DateTimeFormat` or `Intl.NumberFormat` instances directly.

**Canonical pattern — formatters.ts:**
```typescript
// src/lib/formatters.ts

// Workspace config — injected at app level, defaults for development
interface FormatConfig {
  locale: string
  timezone: string
  currency: string
}

let config: FormatConfig = {
  locale: 'en-US',
  timezone: 'America/New_York',
  currency: 'USD',
}

export function setFormatConfig(newConfig: Partial<FormatConfig>) {
  config = { ...config, ...newConfig }
}

// --- Date / Time ---

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat(config.locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: config.timezone,
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat(config.locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: config.timezone,
  }).format(new Date(date))
}

export function formatRelativeDate(date: string | Date): string {
  const rtf = new Intl.RelativeTimeFormat(config.locale, { numeric: 'auto' })
  const diffMs = new Date(date).getTime() - Date.now()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    if (Math.abs(diffHours) < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60))
      return rtf.format(diffMinutes, 'minute')
    }
    return rtf.format(diffHours, 'hour')
  }
  return rtf.format(diffDays, 'day')
}

// --- Numbers ---

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(config.locale).format(value)
}

export function formatPercent(value: number, decimals: number = 1): string {
  return new Intl.NumberFormat(config.locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat(config.locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

// --- Currency ---

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
  }).format(value)
}
```

**Usage in components:**
```typescript
import { formatDate, formatNumber, formatPercent } from '@/lib/formatters'

function TrackerSummary({ tracker }: { tracker: Tracker }) {
  return (
    <div>
      <p>Last scan: {formatDate(tracker.lastScanAt)}</p>
      <p>Total mentions: {formatNumber(tracker.totalMentions)}</p>
      <p>Positive sentiment: {formatPercent(tracker.positiveSentimentRatio)}</p>
    </div>
  )
}
```

---

## 21. Auth — Clerk

**Decision:** Clerk for authentication and user management.

**Constraints this places on agents:**
- Frontend uses `@clerk/clerk-react` for auth UI and session management.
- Backend validates Clerk JWTs via middleware.
- Workspace (tenant) ID is extracted from Clerk session claims.
- No custom auth flows — use Clerk's pre-built components for sign-in, sign-up, and user profile.

---

## 22. Tenancy — Workspace-Based (Internal)

**Decision:** Multi-tenancy is implemented via workspace scoping. All data queries include a workspace ID filter.

**Constraints this places on agents:**
- Every database entity that is tenant-specific has a `WorkspaceId` column.
- All queries filter by `ICurrentUser.WorkspaceId` — no exceptions.
- The `ICurrentUser` interface provides `UserId`, `WorkspaceId`, and role claims extracted from the Clerk JWT.
- Row-level security is enforced at the handler level — not via database-level RLS policies.

---

## 23. Backend Testing — xUnit + FluentAssertions + NSubstitute

**Decision:** xUnit for test framework. FluentAssertions for assertions. NSubstitute for mocking.

**Constraints this places on agents:**
- Unit tests mock dependencies via NSubstitute. Handler tests mock DbContext or use in-memory providers.
- Integration tests use `Testcontainers` for real PostgreSQL instances and `WebApplicationFactory` for full HTTP pipeline testing.
- No Moq — use NSubstitute for all mocking needs.

**Canonical pattern — handler unit test:**
```csharp
// Tests/Handlers/CreateTrackerHandlerTests.cs
public class CreateTrackerHandlerTests
{
    private readonly LuminaDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly CreateTrackerHandler _handler;

    public CreateTrackerHandlerTests()
    {
        _db = TestDbContextFactory.Create();
        _currentUser = Substitute.For<ICurrentUser>();
        _currentUser.WorkspaceId.Returns(Guid.Parse("aaaa-bbbb-cccc-dddd"));
        _currentUser.UserId.Returns(Guid.Parse("1111-2222-3333-4444"));
        _handler = new CreateTrackerHandler(_db, _currentUser);
    }

    [Fact]
    public async Task HandleAsync_CreatesTracker_ReturnsDto()
    {
        var command = new CreateTrackerCommand
        {
            Name = "ChatGPT Mentions",
            BrandId = Guid.NewGuid(),
            Platforms = new List<string> { "chatgpt" },
            PromptTemplate = "What do you know about {brand}?",
            Schedule = Schedule.Daily,
        };

        var result = await _handler.HandleAsync(command);

        result.Should().NotBeNull();
        result.Name.Should().Be("ChatGPT Mentions");
        result.Platforms.Should().ContainSingle("chatgpt");

        var saved = await _db.Trackers.FindAsync(result.Id);
        saved.Should().NotBeNull();
        saved!.WorkspaceId.Should().Be(_currentUser.WorkspaceId);
    }
}
```

**Canonical pattern — integration test with Testcontainers:**
```csharp
// Tests/Integration/TrackersApiTests.cs
public class TrackersApiTests : IClassFixture<LuminaWebApplicationFactory>
{
    private readonly HttpClient _client;

    public TrackersApiTests(LuminaWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateTracker_Returns201_WithValidCommand()
    {
        var command = new
        {
            Name = "Integration Test Tracker",
            BrandId = Guid.NewGuid(),
            Platforms = new[] { "chatgpt", "perplexity" },
            PromptTemplate = "Test prompt for {brand}",
            Schedule = "daily",
        };

        var response = await _client.PostAsJsonAsync("/api/trackers", command);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<TrackerDto>();
        body!.Name.Should().Be("Integration Test Tracker");
    }

    [Fact]
    public async Task CreateTracker_Returns400_WhenNameMissing()
    {
        var command = new { BrandId = Guid.NewGuid(), Platforms = new[] { "chatgpt" } };

        var response = await _client.PostAsJsonAsync("/api/trackers", command);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problem!.Title.Should().Be("Validation Error");
    }
}
```

---

## Constraints Summary for Agents

This section consolidates the agent rules from all decisions above into a single scannable reference.

### Always

```
- Use TypeScript strict mode — no loose compiler settings
- Use CVA (class-variance-authority) for all component variant styling
- Use cn() from @/lib/utils for all conditional class merging
- Use design tokens via Tailwind theme classes — never raw values
- Use TanStack Query for all server data fetching and caching
- Use React Hook Form + Zod for all form handling and validation
- Use TanStack Table for all data tables
- Use Nivo chart wrappers from src/components/charts/ for all charts
- Use MSW for all API mocking in tests and Storybook
- Use named exports for all components, hooks, and utilities
- Use FluentValidation for all backend command validation
- Use explicit DTO mapping via static FromEntity methods
- Co-locate feature code: components, hooks, types, and tests per feature
- Use AsNoTracking() for all read-only EF Core queries
- Use ProblemDetails for all error responses
- Use MassTransit for all durable async workflows
- Use the centralized formatters.ts for all date/number/currency formatting
- Use URL search params for filter and view state
- Use query key factories for TanStack Query cache management
- Use userEvent over fireEvent in component tests
- Use data-testid selectors for Playwright E2E tests only
- Use pnpm for all package operations
```

### Never

```
- Raw hex, rgb, hsl, or pixel values in component files
- style={{}} for visual styling
- Arbitrary Tailwind values (e.g., w-[347px], bg-[#1a2b3c])
- Tailwind default color palette (e.g., blue-500, gray-300) — use token classes
- String concatenation or ternaries for className logic — use CVA
- Direct fetch() or axios calls in component files
- Server data in React Context — use TanStack Query
- Zustand, Jotai, Redux, or any client state library in v1
- Generic repository pattern — use DbContext directly
- AutoMapper — use explicit DTO mapping
- Direct Nivo imports outside src/components/charts/ wrappers
- any types without explicit boundary casting and justification comment
- jest.mock() or vi.mock() for API modules — use MSW
- Manual form state with useState — use React Hook Form
- Business logic in controllers — use handlers
- Long Hangfire continuation chains — use MassTransit sagas
- CSS class names or DOM structure queries in unit tests — use accessible roles
- npm or yarn — use pnpm
```

### Decisions Pending (do not guess — leave as TODO)

```
- Error monitoring (Sentry or equivalent)
- Analytics / product analytics provider
- Email service provider
- CDN / asset hosting strategy
- CI/CD pipeline tooling
- Feature flags service
```

---

## Change Log

| Version | Date | Change | Approved By |
|---|---|---|---|
| 1.0.0 | 2026-05-18 | Initial decisions recorded — adapted from BOLD framework for Lumina platform | CTA |
