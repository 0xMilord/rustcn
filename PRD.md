# PRD: Rustcn — Performance-Augmented Component System

> **One-liner:** Components that feel instant, no matter how big your data gets.  
> **Tagline:** shadcn with a performance brain  
> **Vision:** Invisible infrastructure that makes frontend faster, safer, and smarter

---

## 🎯 Problem Statement

Developers don't wake up thinking: *"I need a performance brain."*

They think:

- *"my table is lagging"*
- *"forms feel sluggish"*
- *"markdown is choking on large docs"*
- *"search gets slower as data grows"*

Meanwhile, the current frontend ecosystem forces a choice:

- **Beautiful components** (shadcn/ui) — look great, slow down on heavy data
- **Performant logic** (TanStack, Zod) — work fine, require manual wiring
- **Rust frameworks** (Yew, Leptos) — fast, but rewrite everything

Rust frontend fails when it tries to **replace** JavaScript.  
Rust frontend wins when it **augments** JavaScript and removes its weaknesses.

---

## 💡 Solution

Build a **two-layer system** that makes components behave better, not just look good:

### Layer 1 — Surface (distribution): Beautiful, copy-pasteable React components
### Layer 2 — Core (moat): Rust engines powering them under the hood

Developers install for the **component**. They stay for the **performance**.

```tsx
// Looks like any table. Behaves like no other.
<RustTable data={data} sort filter virtualize />

// 10k rows. Scroll smooth. Filter instant. No debounce lag.
```

---

## 🧩 The Two-Layer Model

### Surface Layer: Components (what devs see)

We ship **5–8 killer components**, not 50 mediocre ones. Depth beats breadth.

| Component | Problem It Solves | Behavior Differentiator |
|-----------|-------------------|------------------------|
| **Table** | Laggy sorting/filtering on large datasets | Virtualization ON by default, instant filter feedback (no debounce), smooth scroll at 100k rows |
| **Form** | Sluggish multi-step validation | Async validation baked in, multi-step state machine, instant field feedback at 30+ fields |
| **Input** | Manual validation wiring | Real-time validation, type-safe, auto-error display |
| **Command Palette** | Slow search on large option sets | Rust-powered fuzzy search, feels instant on 10k+ items |
| **Modal** | Dialog boilerplate | Clean, accessible, themed — same as shadcn, but integrates with Form/Table seamlessly |
| **Markdown Renderer** | Markdown chokes on large docs | Instant render at 50 KB+, built-in XSS sanitization |
| **Dashboard Blocks** | Slow chart/stat updates | Batched updates, WASM-powered aggregation |

### Core Layer: Engines (what makes you special)

| Engine | Powers | Problem It Solves |
|--------|--------|-------------------|
| **Form Validator** | Form, Input | Multi-step checkout validation, complex wizard forms |
| **Data Table** | Table, Dashboard | Sorting, filtering, pagination at WASM speed |
| **Markdown Parser** | Markdown Renderer | Fast, secure Markdown → HTML |

We sell **components**. We retain with **engines**.

---

## 🚀 Key Features

### 1. **Problem-First Entry Points** (not architecture-first)

Homepage doesn't start with WASM, engines, or architecture. It starts with:

```
Fix slow tables
Fix laggy forms
Fix heavy markdown
```

Then shows:

> "10k rows. JS lags. rustcn doesn't. Try it."

### 2. **Benchmark-First Onboarding** (the 60-second hook)
```bash
npx rustcn bench table
```
Output:
```
JS (lodash):    120ms
Rust (rustcn):    8ms
━━━━━━━━━━━━━━━━━━━━━
15x faster ⚡
```
No signup. No install. Just **proof**.

### 3. **Zero-Rust Adoption Path**
- No Rust toolchain required
- Precompiled WASM binaries on npm
- Pure `npm install @rustcn/react` experience
- Rust is an implementation detail — the user never sees it

### 4. **Copy-Paste Components (shadcn-style)**
```bash
npx rustcn add table
```
Outputs:
- React component (Tailwind-first, customizable)
- Hook (`useRustTable`)
- Rust WASM module (auto-bundled)
- JS fallback (always included)

Dev sees: *their* code. *Their* styles. Just faster.

### 5. **Graceful Fallback + Result Parity**
```ts
if (!wasmSupported() || isLowMemoryDevice()) {
  return jsFallback()  // Zod / TanStack under the hood
}
```
**Guarantee:** WASM result = JS fallback result. Always.

If outputs differ, that's a bug, not a feature. We test parity on every release.

Enterprises don't gamble on WASM availability. They get **correctness first, speed second**.

### 6. **State Management Story** (because real apps have it)

Works with:
- **React Query / TanStack Query**: `<RustTable data={query.data} />` — just pass server state
- **Next.js Server Actions**: `const data = await getRows()` → `<RustTable data={data} />`
- **Streaming data**: Engine reuses singleton instance, no re-init on new data
- **Mutations**: Update data → engine re-sorts/re-filters automatically

We don't replace your state management. We consume it.

### 7. **Dual Registry** (simple, not a platform)

**Component Registry:**
```bash
npx rustcn add table
npx rustcn add form
npx rustcn add table@canary
```

**Engine Registry:**
```bash
npx rustcn add-engine validator
npx rustcn add-engine table@latest
```

The registry is a mapping layer, not a platform. No marketplace, no featured engines, no nonsense. Just `rustcn add <thing>` → it works.

### 8. **DevTools Layer**
- Flamegraphs for execution traces
- Memory snapshots
- Real-time validation error tracking
- "Why is this slower than expected?" — answered automatically

### 9. **SSR / Edge / Node Support**
- Node.js: WASM via `wasmtime` or `wasmer` runtime
- Edge: Cloudflare Workers / Vercel Edge compatible WASM
- SSR: Next.js server components supported from Day 1

---

## 📏 When to Use rustcn (and When Not To)

We define this upfront. If you misuse it, we'll tell you.

| ✅ Use rustcn | ❌ Don't use rustcn |
|---------------|---------------------|
| 10k+ table rows | Arrays under 100 items |
| Heavy Markdown parsing (50 KB+) | Simple `marked` renders |
| Multi-step form validation (10+ fields) | Single input validation |
| Repeated operations (search, filter loops) | One-off calls |
| SSR/Edge compute-heavy logic | Client-side trivial logic |

**Honest truth:** If your dataset is small, this will be slower. Use JS. We'll literally warn you in the console.

**Rule of thumb:** If serialization cost > execution savings, use JS.

---

## 📈 Success Metrics

| Metric | Target (6 months) |
|--------|-------------------|
| GitHub Stars | 2,000+ |
| Monthly npm downloads | 10,000+ |
| Components shipped | 5–8 (Table, Form, Input, Command, Modal, Markdown, Dashboard) |
| Engines shipped | 3 (validator, table, markdown) |
| Framework integrations | React (primary), Node.js |
| Contributor count | 15+ |
| Benchmarks run (CLI) | 5,000+ |

---

## 👤 Target Users

### Primary (distribution):
**React/Next.js developers** who want faster components without understanding Rust

### Retention (moat):
**Product teams** building data-heavy dashboards or complex forms

### Long-term:
**Power users** who become Rust-curious and build custom engines

### Secondary:
**Enterprise teams** needing reliability (fallback layer is a selling point, not a weakness)

---

## 🚫 Non-Goals

- ❌ 40–50 component library (5–8 insanely good ones, depth beats breadth)
- ❌ Support 5 frameworks at launch (React first, others later)
- ❌ Custom rendering engine (we're logic-first, not DOM-first)
- ❌ Mobile/desktop support (web + Node.js only for v1)
- ❌ Small-data optimization (we're transparent about when JS wins)
- ❌ Over-engineered WASM early (ship fast, optimize later)
- ❌ Platform builder mindset (registry, protocols, ecosystems) — we're wedge attackers
- ❌ MCP protocol (Phase 3+ only, after real usage patterns emerge)

---

## 🔮 Future Opportunities

| Phase | Feature |
|-------|---------|
| v2 | Image optimizer, charting engine, search engine (Tantivy-lite), more components |
| v3 | Design System Compiler (define once → generate React, HTML, Rust) |
| v4 | Rust DevTools standalone browser extension |
| v5 | WASM plugin marketplace with sandbox + permissions (MCP protocol considered here) |

---

## 🎨 Design System

- **Tailwind-first** — no custom CSS, no opinions
- **Token system** — clean defaults, easy overrides
- **Themeable** — dark mode, custom colors, spacing
- **Accessible** — ARIA, keyboard navigation, screen reader support
- **Copy-pasteable** — dev owns the code, no black box
- **Steal shamelessly from shadcn** — same `cn()` utility, same token model

**But:** Components *behave* better, not just look the same.
- Table: virtualization ON by default, instant filter (no debounce)
- Form: async validation, multi-step state machine
- Command: Rust-powered fuzzy search on 10k+ items

---

## 🧬 The Layered Mental Model

**3-line version (what 95% of devs need):**

```
1. Install component (npx rustcn add table)
2. It auto-chooses Rust or JS based on your data
3. You get faster UI
```

**Full version (for power users):**

```
UI Layer (React + Tailwind)          ← what devs see
    ↓
rustcn Components                     ← distribution engine
    ↓
rustcn Engines (WASM)                 ← the moat
```

Everything else is optional depth.

---

## 🔐 Lock-In vs Freedom (clear answer)

**Can you remove rustcn anytime?** Yes.

- Components are copy-paste code. You own them. Delete us, keep your UI.
- JS fallbacks are always bundled. If WASM breaks, your app still works.
- Engines are optional. Use components without engines, use engines without components.

We reduce fear by making exit trivial.

---

## 📌 Positioning Statement

> **rustcn** is shadcn with a performance brain.  
> Beautiful components powered by Rust under the hood.

**For developers:**  
> "Components that feel instant, no matter how big your data gets."

**For skeptics:**  
> "Looks like shadcn. Runs like Rust. If your data is small, use JS — we'll tell you."

---

## 🎯 Demo Distribution Strategy (how this spreads)

- **Hosted playground**: `rustcn.dev/demo` — paste JSON, see table lag vs smooth
- **Shareable links**: Dev pastes data → gets URL → shares with team
- **"Try with your own data"**: No signup, paste JSON → instant comparison
- **Side-by-side video**: 10k rows, JS visibly laggy, rustcn smooth — embedded in README, docs, Twitter

If dev has to *measure* speed instead of *feel* it, we failed.

---

## 🪜 Upgrade Path (clear ladder)

1. **Use component**: `<RustTable data={data} />` — zero config
2. **Use hook**: `const table = useRustTable(data)` — custom UI, same engine
3. **Use engine directly**: `new DataTableEngine(data)` — build whatever you want
4. **Write custom engine**: `engine-core` + `wasm-bindgen` — extend rustcn

Each step is explicit, documented, and optional.

---

## 📚 References

- [shadcn/ui](https://ui.shadcn.com/) — component model, stealable code, design system
- [Vite](https://vitejs.dev/) — DX inspiration
- [Tantivy](https://github.com/quickwit-oss/tantivy) — search engine reference
- [Zod](https://zod.dev/), [TanStack Table](https://tanstack.com/table) — JS alternatives we benchmark against
- [React Query](https://tanstack.com/query) — state management integration target
- [Yew](https://yew.rs/), [Leptos](https://leptos.dev/), [Dioxus](https://dioxuslabs.com/) — existing Rust frontend frameworks
