# Patterns & Anti-Patterns

> Code examples showing the right way and the wrong way to use rustcn.

---

## Patterns (DO this)

### 1. Large Dataset with RustTable

When your API returns thousands of rows and sorting/filtering feels sluggish in JS.

```tsx
// DO — let the engine handle heavy lifting
import { RustTable } from '@/components/rustcn/table';

function UserTable() {
  const { data } = useQuery({ queryKey: ['users'], queryFn: fetchAllUsers });

  return (
    <RustTable
      data={data}
      columns={[
        { key: 'name', label: 'Name', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        { key: 'role', label: 'Role', filterable: true },
      ]}
      sort
      filter
      virtualize
      pageSize={50}
    />
  );
}
```

Virtualization is ON by default. No debounce needed on filter — the engine handles it synchronously.

---

### 2. Multi-Step Form with RustFormSteps

When you have a checkout flow, onboarding wizard, or any form with 10+ fields spread across steps.

```tsx
// DO — multi-step state machine handles validation per-step
import { RustForm, RustFormSteps } from '@/components/rustcn/form';

const checkoutSchema = {
  step1: { email: { required: true, email: true }, name: { required: true } },
  step2: { address: { required: true }, city: { required: true }, zip: { required: true } },
  step3: { cardNumber: { required: true, luhn: true }, expiry: { required: true } },
};

function CheckoutForm() {
  return (
    <RustForm schema={checkoutSchema} onSubmit={submitOrder} multiStep>
      <RustFormSteps.Step title="Account">
        <RustFormField name="email" />
        <RustFormField name="name" />
      </RustFormSteps.Step>

      <RustFormSteps.Step title="Shipping">
        <RustFormField name="address" />
        <RustFormField name="city" />
        <RustFormField name="zip" />
      </RustFormSteps.Step>

      <RustFormSteps.Step title="Payment">
        <RustFormField name="cardNumber" />
        <RustFormField name="expiry" />
      </RustFormSteps.Step>
    </RustForm>
  );
}
```

Validation runs per-step, not on every keystroke across all steps. The WASM engine validates the current step's schema only.

---

### 3. Command Palette with 10k+ Items

When you need fuzzy search across a massive option set (admin panels, developer tools, file navigators).

```tsx
// DO — Rust handles fuzzy search on large sets without lag
import { RustCommand } from '@/components/rustcn/command';

function AdminCommandPalette({ isOpen, onClose }) {
  // 15k commands — would lag with client-side JS filtering
  const commands = useAllAdminCommands(); // returns 15,000 items

  return (
    <RustCommand
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      options={commands}
      onSelect={(cmd) => executeCommand(cmd)}
      placeholder="Type a command..."
      minSearchLength={2}
    />
  );
}
```

The engine builds a fuzzy search index once. Subsequent keystrokes are O(1) lookups.

---

### 4. Server-Side Data to Client Component

Next.js Server Component fetches data, passes it to a client-side rustcn component.

```tsx
// app/dashboard/page.tsx — Server Component
import { RustTable } from '@/components/rustcn/table';
import { getDashboardRows } from '@/lib/data';

export default async function DashboardPage() {
  const rows = await getDashboardRows(); // Server action — runs on the server

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <RustTable data={rows} sort filter virtualize />
    </div>
  );
}
```

The WASM engine initializes on the client automatically. SSR sends the data as JSON; the client picks it up and sorts/filters it in WASM.

---

### 5. React Query Integration Pattern

rustcn doesn't replace your state management. It consumes it.

```tsx
// DO — React Query manages server state, rustcn handles presentation logic
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RustTable } from '@/components/rustcn/table';

function ManageableTable() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <RustTable
      data={data}
      columns={[
        { key: 'name', label: 'Name', sortable: true },
        { key: 'price', label: 'Price', sortable: true },
        { key: 'actions', label: '', render: (row) => (
          <button onClick={() => deleteMutation.mutate(row.id)}>Delete</button>
        )},
      ]}
      sort
      filter
    />
  );
}
```

After mutation invalidates the query, new data flows in. The engine singleton re-sorts and re-filters automatically — no manual reset needed.

---

## Anti-Patterns (DON'T do this)

### 1. Using rustcn for Single-Field Forms

```tsx
// DON'T — WASM overhead >> benefit
// <RustForm schema={{ email: { required: true, email: true } }}>
//   <RustFormField name="email" />
// </RustForm>

// DO — native HTML5 is enough
<input
  type="email"
  required
  className="border rounded px-3 py-2"
  placeholder="Email"
/>
```

You're paying WASM init + serialization cost for something the browser does natively. rustcn will log a console warning here.

---

### 2. Using rustcn for Arrays Under 100 Items

```tsx
// DON'T — JS array methods are faster for small data
// <RustTable data={categories} sort /> // 20 rows

// DO — plain JS
function CategoryList({ items }) {
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(
    () => [...items].sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : -1),
    [items, sortAsc]
  );

  return (
    <table>
      <thead onClick={() => setSortAsc(!sortAsc)}>...</thead>
      <tbody>{sorted.map(item => <tr key={item.id}>...</tr>)}</tbody>
    </table>
  );
}
```

At 20-100 rows, `Array.prototype.sort` runs in sub-millisecond time. The WASM round-trip takes longer.

---

### 3. Creating New Engine Every Render

```tsx
// DON'T — defeats the singleton pattern, reinitializes WASM on every render
// function BadTable({ items }) {
//   return <RustTable data={items} />;  // Re-inits every render
// }

// DO — memoize the data, let the singleton handle it
function GoodTable() {
  const data = useMemo(() => fetchRows(), []);
  return <RustTable data={data} sort filter />;
}
```

The WASM engine is a singleton. If you pass a new reference every render, the engine has to re-process. Memoize stable data references.

---

### 4. Ignoring Console Warnings

```
[rustcn] Data size is below threshold. JS fallback would be faster.
```

**What ignoring means:** Your app works correctly (the JS fallback handles it), but you're paying a performance penalty for no benefit.

**What to do instead:**
1. Check the data size — is it genuinely small, or is this a one-time spike?
2. If consistently small, remove rustcn for that component
3. If it fluctuates around the threshold, the auto-selection is working — the warning is informational, not actionable

```tsx
// If you consistently get this warning:
// DON'T — suppress or ignore
// DO — switch to JS

function SmallList({ items }) { // always < 50 items
  // Remove <RustTable>, use plain <table> with JS sort
  const sorted = useMemo(() => [...items].sort(byName), [items]);
  return <BasicTable data={sorted} />;
}
```

---

### 5. Mixing WASM and JS Paths Manually

```tsx
// DON'T — bypass the auto-selection logic
// function MyTable({ data }) {
//   const engine = useRef(new DataTableEngine());  // Manual WASM init
//   const sorted = engine.current.sort(data);      // Manual call
//   return <table>{sorted.map(...)}</table>;
// }

// DO — let the component handle engine selection
function MyTable({ data }) {
  return <RustTable data={data} sort />;
}
```

The hybrid component auto-selects WASM or JS based on data size, browser support, and memory conditions. Bypassing it means you lose the fallback guarantee and the console warnings.

Use the engine directly only when you're building custom UI (Layer 3 of the upgrade path). For standard components, use the component.
