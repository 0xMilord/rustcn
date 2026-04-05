# ARCHITECTURE: Rustcn — Performance-Augmented Component System

> **3-line mental model:**
> 1. Install component (`npx rustcn add table`)
> 2. It auto-chooses Rust or JS based on your data
> 3. You get faster UI
>
> Everything below is optional depth.

---

## 🏗️ System Overview (simplified)

```
┌─────────────────────┐
│  Dev installs:      │
│  rustcn add table   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Hybrid Component (React + Tailwind)│
│                                     │
│  <RustTable data={data} />          │
│    ├─ UI → React + Tailwind         │
│    └─ Logic → auto-chooses:         │
│         WASM engine  (fast path)    │
│         JS fallback   (safe path)   │
└─────────────────┬───────────────────┘
                  │
                  ▼
        ┌───────────────────┐
        │  Frontend App     │
        │  (React/Next.js)  │
        └───────────────────┘
```

That's it. The rest of this doc is for when you need to go deeper.

---

## 🧱 Architecture Layers

### Layer 1: **CLI (`rustcn`)**

```bash
npx rustcn add table        # Install component + engine + fallback
npx rustcn add form         # Install component + engine + fallback
npx rustcn add-engine table # Engine only (build your own UI)
npx rustcn bench table      # Benchmark: WASM vs JS
npx rustcn snippet table    # Copy stealable component code
```

The registry is a simple mapping layer. No marketplace. No platform. Just `add` → it works.

---

### Layer 2: **Engine Core**

Shared Rust libraries. WASM memory pooling, serialization, singleton instance management.

Key decision: **Singleton pattern**. WASM module loads once, reuses across calls. No re-init per render.

---

### Layer 2.5: **JS Fallback Layer**

Every engine ships with a pure JS fallback (Zod for validation, TanStack for tables, Marked for markdown).

**Detection logic:**
```ts
// Auto-run on every engine call
if (!wasmSupported || isLowMemoryDevice || dataSize < threshold) {
  return jsFallback();  // always correct, always available
}
```

**Result parity guarantee:**
WASM output = JS fallback output. Always.

If results differ, that's a bug, not a feature. We test parity on every release with identical input → identical output assertions.

---

### Layer 2.6: **Serialization Cost Model**

JS → serialize → WASM → deserialize → JS is NOT free.

For small data, **Rust is slower than JS** because serialization dominates.

**We enforce thresholds and warn on misuse:**
```ts
// Logged when data is below 50% of threshold
console.warn(
  `[rustcn] Data size is below threshold. ` +
  `JS fallback would be faster. Consider removing rustcn for this use case.`
);
```

**Honest thresholds:**

| Engine | Min Data for WASM | Reason |
|--------|-------------------|--------|
| Form Validator | 10+ fields | Serialization overhead only worth it for complex schemas |
| Data Table | 1,000+ rows | Sorting/pagination benefits kick in here |
| Markdown Parser | 10 KB+ | Small docs parse fast in JS either way |

---

### Layer 3: **Engine Modules**

Three engines at launch. Each is a standalone Rust crate compiled to WASM.

| Engine | Powers | Min Data |
|--------|--------|----------|
| Form Validator | Form, Input | 10+ fields |
| Data Table | Table, Dashboard | 1,000+ rows |
| Markdown Parser | Markdown Renderer | 10 KB+ |

---

### Layer 3.5: **UI Components** (Surface Layer — the distribution engine)

This is what developers **see** and **install**. Engines are invisible.

**5–8 components at launch. Not 50. Depth beats breadth.**

```
components/
├── table/
│   ├── RustTable.tsx          # Main component (copy-pasteable)
│   ├── useRustTable.ts        # Hook — connects to engine
│   ├── fallback.ts            # JS-only version
│   └── styles.ts              # Tailwind tokens
├── form/
│   ├── RustForm.tsx
│   ├── useRustForm.ts
│   └── fallback.ts
├── input/
│   ├── RustInput.tsx
│   └── useRustInput.ts
├── command/
│   ├── RustCommand.tsx
│   └── useRustSearch.ts       # WASM-powered fuzzy search
├── modal/
│   └── RustModal.tsx
├── markdown/
│   └── RustMarkdown.tsx
├── dashboard/
│   ├── StatCard.tsx
│   └── KpiGrid.tsx
└── shared/
    ├── ThemeProvider.tsx
    └── cn.ts                  # Tailwind class merger
```

**Hybrid Component Model:**
```tsx
// RustTable.tsx — what devs copy and own
export function RustTable({ data, sort, filter, virtualize, ...props }) {
  const table = useRustTable(data, { sort, filter });

  return (
    <div className={cn("overflow-auto", props.className)}>
      <TableHead columns={table.columns} />
      <TableBody rows={table.visibleRows} />
      <TablePagination onPageChange={table.goToPage} />
    </div>
  );
}
```

**Behavior Differentiators (not just UI):**

| Component | Behavior Edge Over JS Equivalent |
|-----------|----------------------------------|
| Table | Virtualization ON by default, instant filter (no debounce lag), smooth scroll at 100k rows |
| Form | Async validation baked in, multi-step state machine, instant feedback at 30+ fields |
| Command Palette | Rust-powered fuzzy search, feels instant on 10k+ items |
| Markdown | Instant render at 50 KB+, built-in XSS sanitization |

They don't just look the same. They **behave** better.

---

### Layer 3.6: **State Management Integration**

Real apps have server state, caching, mutations. We don't replace your state management — we consume it.

**React Query / TanStack Query:**
```tsx
function MyTable() {
  const { data } = useQuery({ queryKey: ['rows'], queryFn: fetchRows });
  return <RustTable data={data} sort filter />;  // just pass it
}
```

**Next.js Server Actions:**
```tsx
export default async function Page() {
  const rows = await getRowsFromDB();  // server action
  return <RustTable data={rows} />;    // SSR works, WASM or fallback auto-selected
}
```

**Streaming data:**
Engine reuses singleton instance. New data → no re-init, just re-process.

**Mutations:**
```tsx
function MyTable() {
  const { data, refetch } = useQuery(...);
  const table = useRustTable(data);

  const onDelete = async (id) => {
    await deleteRow(id);
    refetch();  // new data → engine re-sorts automatically
  };

  return <RustTable data={table.rows} />;
}
```

---

### Layer 4: **SSR / Edge / Node Runtime Support**

```
runtimes/
├── browser/    # WebAssembly in browser
├── node/       # wasmtime/wasmer via NAPI
└── edge/       # Cloudflare Workers / Vercel Edge
```

Auto-detected at import time. Same API, different runtime under the hood.

---

### Layer 5: **DevTools**

Answers: *"why is this slower than expected?"*

| View | What It Shows |
|------|---------------|
| **Flamegraph** | Which function is slow (serialize vs execute vs deserialize) |
| **Timeline** | When did this call happen and how long it took |
| **Memory Chart** | Is WASM memory leaking or stable |
| **Serialization Breakdown** | How much time is serialize vs execute vs deserialize |

---

## 🔄 Data Flow

```
1. Dev runs: npx rustcn add table
2. Gets: React component + hook + WASM engine + JS fallback
3. Renders: <RustTable data={data} />
4. Component auto-dispatches:
   ├─ Large data + WASM supported → WASM engine (fast)
   └─ Small data or WASM unsupported → JS fallback (safe)
5. Result returned → component re-renders
6. DevTools logs timing (if enabled)
```

---

## 📦 Build Pipeline

```
rustcn build
  ├── 1. Compile Rust → WASM (wasm-pack)
  ├── 2. Optimize WASM binary (wasm-opt -Oz)
  ├── 3. Generate TypeScript types
  ├── 4. Build React component bundles (Rollup)
  ├── 5. Build JS fallback bundles
  └── 6. Package as npm module
```

---

## 🔐 Security Model

- No `eval()` — WASM runs in sandboxed memory
- XSS sanitization — Markdown parser strips dangerous tags
- Input validation — All JS → WASM inputs validated before execution
- No filesystem access — WASM modules stateless and isolated

### Plugin Sandboxing (Phase 3+)
```toml
[plugins.my-plugin]
version = "1.2.0"
permissions = ["compute", "memory"]
max_memory_mb = 64
max_execution_ms = 100
```

MCP protocol is NOT included at launch. Phase 3+ only, after real usage patterns emerge.

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| WASM binary (per engine) | < 50 KB gzipped |
| Component bundle (React + Tailwind) | < 10 KB per component |
| Table sort (10k rows) | < 10 ms |
| Form validation (100 fields) | < 1 ms |
| Markdown parse (50 KB doc) | < 5 ms |
| WASM singleton init | < 50 ms (once, cached) |

---

## 🧪 Testing Strategy

- **Rust unit tests** — engine logic
- **WASM integration tests** — wasm-pack test
- **Component tests** — React Testing Library
- **Result parity tests** — WASM output = JS fallback output, always
- **Benchmark suite** — vs Zod, TanStack, marked
- **Cross-runtime tests** — browser, Node.js, Edge
- **Visual regression tests** — Percy/Chromatic

---

## 🔐 Lock-In vs Freedom

**Can you remove rustcn anytime?** Yes.

- Components are copy-paste code. You own them. Delete us, keep your UI.
- JS fallbacks are always bundled. If WASM breaks, your app still works.
- Engines are optional. Use components without engines, use engines without components.

**Exit path:**
```bash
# If you want to remove rustcn:
# 1. Keep your copied component files (you own them)
# 2. Remove @rustcn/react from package.json
# 3. Your UI still works (fallback or copied code)
```

---

## 🗂️ Project Structure

```
rustcn/
├── cli/                       # CLI tool
├── engine-core/               # Shared Rust libraries
├── engines/                   # 3 engines at launch
│   ├── form-validator/
│   ├── data-table/
│   └── markdown/
├── components/                # 5-8 components at launch
│   ├── table/
│   ├── form/
│   ├── input/
│   ├── command/
│   ├── modal/
│   ├── markdown/
│   └── dashboard/
├── runtimes/                  # browser, node, edge
├── devtools/                  # flamegraph, timeline, memory
├── fallbacks/                 # Zod, TanStack, Marked subsets
├── templates/                 # Project scaffolding
├── docs/                      # Documentation
├── examples/                  # React, Next.js SSR, comparison demos
├── Cargo.toml
├── rustcn.toml
└── README.md
```

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Rust Core | Rust 1.75+, `wasm-bindgen`, `serde`, `wasm-pack` |
| React Components | React 18+, TypeScript, Tailwind CSS |
| JS Fallbacks | Zod, TanStack Table, Marked (bundled subsets) |
| Node Runtime | `wasmtime` via NAPI-RS |
| Build Tooling | `wasm-pack`, `wasm-opt`, `Rollup` |
| Testing | `cargo test`, `wasm-pack test`, Playwright, React Testing Library |

---

## ⚠️ Known Limitations

1. **WASM thread support** — Web Workers async-only (no shared memory yet)
2. **Binary size** — WASM adds ~30-50 KB per engine (+ fallback ~20-40 KB)
3. **Browser support** — Requires WASM (all modern browsers, not IE11)
4. **Serialization cost** — For small data, JS is faster. We warn you.
5. **Edge runtime variance** — Cloudflare vs Vercel Edge have different WASM limits
6. **Component customization** — Copy-paste means you can break things. We provide good defaults.
7. **MCP protocol** — Not included at launch. Phase 3+ only.

---

## 📖 Opinionated Patterns

### Good: Large dataset, visible performance boost
```tsx
<RustTable data={apiResponse.rows} sort filter virtualize />
// 10k+ rows, smooth scrolling, instant sort
```

### Good: Multi-step form with complex validation
```tsx
<RustForm schema={checkoutSchema} onSubmit={handleSubmit}>
  <RustFormField name="email" />
  <RustFormField name="address" />
  <RustFormField name="card" />
</RustForm>
// Instant validation, no lag, 30+ fields
```

### Bad: Single field — use native HTML5
```tsx
// Don't do this
<RustForm schema={{ email: { required: true } }}>
  <RustFormField name="email" />
</RustForm>
// WASM overhead > benefit. We'll warn you.
```

### Bad: New engine every render
```tsx
// Don't do this
function BadTable({ items }) {
  return <RustTable data={items} />;  // New engine every render
}

// Do this
function GoodTable() {
  const data = useMemo(() => fetchRows(), []);
  return <RustTable data={data} />;  // Singleton reused
}
```
