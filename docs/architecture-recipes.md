# Architecture Recipes

> Common patterns for building data-heavy apps with rustcn. Each recipe: when to use, diagram, code, tips.

---

## 1. Dashboard Pattern

**When:** Building analytics dashboards with stat cards, data tables, and aggregated metrics from large datasets.

```
┌─────────────────────────────────────────┐
│  Server Component                       │
│  ┌───────────┐  ┌───────────────────┐   │
│  │ StatCard   │  │ StatCard          │   │
│  │ (revenue)  │  │ (users)           │   │
│  └───────────┘  └───────────────────┘   │
│  ┌───────────────────────────────────┐   │
│  │ RustTable (50k rows, sortable)    │   │
│  │ ┌─────┐ ┌─────┐ ┌─────────────┐   │   │
│  │ │Sort │ │Filter│ │VirtualScroll│   │   │
│  │ └─────┘ └─────┘ └─────────────┘   │   │
│  └───────────────────────────────────┘   │
│  ┌───────────────────────────────────┐   │
│  │ KpiGrid (WASM aggregation)        │   │
│  └───────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

```tsx
// app/dashboard/page.tsx
import { StatCard, KpiGrid } from '@/components/rustcn/dashboard';
import { RustTable } from '@/components/rustcn/table';
import { getDashboardData } from '@/lib/data';

export default async function DashboardPage() {
  const { transactions, stats } = await getDashboardData();

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Revenue" value={stats.revenue} trend={stats.revenueTrend} />
        <StatCard label="Users" value={stats.activeUsers} trend={stats.userTrend} />
        <StatCard label="Orders" value={stats.orders} trend={stats.orderTrend} />
        <StatCard label="Conversion" value={stats.conversion} trend={stats.conversionTrend} />
      </div>

      <RustTable
        data={transactions}
        columns={[
          { key: 'date', label: 'Date', sortable: true },
          { key: 'customer', label: 'Customer', sortable: true },
          { key: 'amount', label: 'Amount', sortable: true },
          { key: 'status', label: 'Status', filterable: true },
        ]}
        sort
        filter
        virtualize
      />

      <KpiGrid
        data={transactions}
        aggregations={['sum:amount', 'avg:amount', 'count']}
        groupBy="status"
      />
    </div>
  );
}
```

**Performance tips:**
- Fetch all data in one server call — one round-trip, not three
- The `KpiGrid` uses WASM aggregation — batch multiple calculations together
- Virtualization in `RustTable` keeps DOM nodes low even with 50k rows
- StatCards are pure React — no WASM needed for single values

---

## 2. Form-Heavy Pattern (Multi-Step Checkout)

**When:** Complex forms with 10+ fields, multi-step flows, async validation (checking email uniqueness, coupon validity).

```
┌──────────────────────────────────────┐
│  RustForm (state machine)            │
│                                      │
│  Step 1        Step 2       Step 3   │
│  ┌─────┐      ┌─────┐      ┌─────┐  │
│  │Account│  →  │Ship │  →  │Pay  │  │
│  │2 fields│    │3 fields│   │2 fields│ │
│  └─────┘      └─────┘      └─────┘  │
│                                      │
│  WASM Validator (per-step, not all) │
│  ┌──────────────────────────────┐    │
│  │ Sync: required, email, regex │    │
│  │ Async: unique email, coupon  │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

```tsx
// app/checkout/page.tsx
'use client';

import { RustForm, RustFormSteps, RustFormField } from '@/components/rustcn/form';

const checkoutSchema = {
  step1: {
    email: { required: true, email: true, async: checkEmailUnique },
    name: { required: true, minLength: 2 },
  },
  step2: {
    address: { required: true },
    city: { required: true },
    zip: { required: true, pattern: /^\d{5}$/ },
  },
  step3: {
    cardNumber: { required: true, luhn: true },
    expiry: { required: true, pattern: /^\d{2}\/\d{2}$/ },
    coupon: { async: validateCoupon },
  },
};

function CheckoutPage() {
  const handleSubmit = async (data) => {
    await createOrder(data);
    router.push('/confirmation');
  };

  return (
    <RustForm schema={checkoutSchema} onSubmit={handleSubmit} multiStep>
      <RustFormSteps>
        <RustFormSteps.Step title="Account" nextLabel="Continue">
          <RustFormField name="email" />
          <RustFormField name="name" />
        </RustFormSteps.Step>

        <RustFormSteps.Step title="Shipping" nextLabel="Continue">
          <RustFormField name="address" />
          <RustFormField name="city" />
          <RustFormField name="zip" />
        </RustFormSteps.Step>

        <RustFormSteps.Step title="Payment" nextLabel="Place Order">
          <RustFormField name="cardNumber" />
          <RustFormField name="expiry" />
          <RustFormField name="coupon" optional />
        </RustFormSteps.Step>
      </RustFormSteps>
    </RustForm>
  );
}
```

**Performance tips:**
- Validation runs per-step only — step 1 doesn't validate step 3's schema
- Async validators (email uniqueness, coupon check) run in parallel, not sequentially
- The WASM engine validates the synchronous rules instantly; async calls fire after sync passes
- For 30+ fields total, WASM validation is 5-10x faster than Zod

---

## 3. Search Pattern (Command Palette)

**When:** Admin panels, developer tooling, file navigators — anywhere users search through 10k+ options.

```
┌─────────────────────────────────────┐
│  RustCommand                         │
│                                     │
│  [ Type a command...          ]     │
│  ┌───────────────────────────────┐  │
│  │ WASM Fuzzy Search Index       │  │
│  │ ┌─────┐ ┌──────┐ ┌────────┐  │  │
│  │ │Build│ │Search│ │Scoring │  │  │
│  │ │index│ │query │ │results │  │  │
│  │ └─────┘ └──────┘ └────────┘  │  │
│  │                               │  │
│  │ > deploy to production        │  │
│  │ > deploy staging              │  │
│  │ > redeploy last version       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

```tsx
// components/admin-command-palette.tsx
'use client';

import { RustCommand } from '@/components/rustcn/command';

interface Command {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

function AdminCommandPalette({ open, onOpenChange }: Props) {
  const commands: Command[] = useAllAdminCommands(); // 15,000+ items

  return (
    <RustCommand
      open={open}
      onOpenChange={onOpenChange}
      options={commands.map(cmd => ({
        value: cmd.id,
        label: cmd.label,
        category: cmd.category,
        shortcut: cmd.shortcut,
        onSelect: () => cmd.action(),
      }))}
      placeholder="Type a command..."
      minSearchLength={2}
      maxResults={50}
    />
  );
}
```

**Performance tips:**
- The WASM engine builds a fuzzy search index once on mount — subsequent searches are instant
- `minSearchLength={2}` avoids searching on single characters (too many results, bad UX)
- `maxResults={50}` caps the DOM output — the engine scores 15k items but returns top 50
- For < 1,000 options, use the JS fallback. It's fast enough and avoids WASM init cost

---

## 4. SSR Pattern (Next.js Server Components to Client)

**When:** Any rustcn component in a Next.js app where data is fetched server-side.

```
┌──────────────────────────────────────────┐
│  Server Component                        │
│  (fetches data, renders HTML)            │
│  │                                       │
│  ▼                                       │
│  <RustTable data={rows} />               │
│  (serialized as JSON in HTML)            │
│  │                                       │
│  ▼                                       │
│  Client Hydration                        │
│  ├─ WASM engine initializes (once)       │
│  ├─ Data parsed from JSON                │
│  └─ Sort/filter ready instantly          │
└──────────────────────────────────────────┘
```

```tsx
// app/products/page.tsx — Server Component (default)
import { RustTable } from '@/components/rustcn/table';
import { getProducts } from '@/lib/products';

export default async function ProductsPage() {
  const products = await getProducts(); // Runs on server — DB query, API call, etc.

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <RustTable
        data={products}
        columns={[
          { key: 'name', label: 'Name', sortable: true },
          { key: 'sku', label: 'SKU' },
          { key: 'price', label: 'Price', sortable: true },
          { key: 'stock', label: 'Stock', sortable: true },
        ]}
        sort
        filter
        virtualize
      />
    </div>
  );
}
```

```tsx
// If you need client-side interactivity:
// app/products/client-table.tsx — Client Component
'use client';

import { RustTable } from '@/components/rustcn/table';

export function ClientProductTable({ products }: { products: Product[] }) {
  const [filter, setFilter] = useState('');

  return (
    <RustTable
      data={products}
      filter={filter}
      sort
      virtualize
    />
  );
}
```

**Performance tips:**
- Server Component: data is already HTML-serialized. Client parses it once.
- WASM singleton initializes on first render — subsequent navigations reuse it
- For streaming, pass data as it arrives. The engine accepts new data without re-init
- Avoid passing functions from server to client — serialize data, define handlers on client

---

## 5. State Management Pattern

**When:** Real apps with server state, caching, mutations — not toy demos.

### React Query Pattern

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RustTable } from '@/components/rustcn/table';

function ManagedTable() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    staleTime: 30_000,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  if (isLoading) return <Skeleton />;

  return (
    <RustTable
      data={data}
      columns={[
        { key: 'id', label: 'Order', sortable: true },
        { key: 'status', label: 'Status', filterable: true },
        { key: 'actions', label: '', render: (row) => (
          row.status === 'pending' && (
            <button onClick={() => cancelMutation.mutate(row.id)}>
              Cancel
            </button>
          )
        )},
      ]}
      sort
      filter
    />
  );
}
```

### Server Actions Pattern

```tsx
// app/orders/page.tsx
import { RustTable } from '@/components/rustcn/table';
import { getOrders, cancelOrder } from '@/lib/actions';

export default async function OrdersPage() {
  const orders = await getOrders();

  return <RustTable data={orders} sort filter />;
}

// app/orders/cancel-form.tsx
'use client';

export function CancelButton({ orderId }: { orderId: string }) {
  return (
    <form action={async () => {
      'use server';
      await cancelOrder(orderId);
      revalidatePath('/orders');
    }}>
      <button type="submit">Cancel</button>
    </form>
  );
}
```

### Streaming Data Pattern

```tsx
import { RustTable } from '@/components/rustcn/table';

// Engine singleton reuses warm instance — no re-init on new data
function StreamingTable({ stream }: { stream: AsyncIterable<Row[]> }) {
  const [data, setData] = useState<Row[]>([]);

  useEffect(() => {
    const consume = async () => {
      for await (const batch of stream) {
        setData(prev => [...prev, ...batch]); // Engine re-sorts automatically
      }
    };
    consume();
  }, [stream]);

  return <RustTable data={data} sort virtualize />;
}
```

**Performance tips:**
- React Query: invalidate → refetch → new data flows in → engine re-processes. No manual reset.
- Server Actions: full page revalidation is fine — WASM singleton is cached across navigations
- Streaming: the engine singleton handles incremental data. Each batch is appended and re-sorted without re-initialization
- Never create a new engine instance per render. The component manages the singleton.
