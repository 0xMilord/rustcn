# rustcn

> **Components that feel instant, no matter how big your data gets.**

shadcn with a performance brain. Beautiful React components powered by Rust WASM under the hood.

---

## Fix slow tables. Fix laggy forms. Fix heavy markdown.

10k rows. JS lags. rustcn doesn't.

```bash
# The 60-second proof
npx rustcn bench table

# Expected:
# JS (lodash):    120ms
# Rust (rustcn):    8ms
# -----------------------
# 15x faster
```

---

## Quick Start

```bash
# Scaffold a project
npx rustcn init my-app
cd my-app

# Add components
npx rustcn add table
npx rustcn add form

# Start building
npm install
npm run dev
```

---

## 3-Line Mental Model

1. Install component (`npx rustcn add table`)
2. It auto-chooses Rust or JS based on your data
3. You get faster UI

Everything else is optional depth.

---

## Components

| Component | Problem Solved | Behavior Edge |
|-----------|---------------|---------------|
| **Table** | Laggy sorting on large datasets | Virtualization ON by default, instant filter |
| **Form** | Sluggish multi-step validation | Async validation, instant feedback at 30+ fields |
| **Input** | Manual validation wiring | Real-time validation, type-safe |
| **Command Palette** | Slow search on large sets | Rust-powered fuzzy search on 10k+ items |
| **Modal** | Dialog boilerplate | Clean, accessible, themed |
| **Markdown** | Markdown chokes on large docs | Instant render at 50KB+ |

---

## When to Use (and When Not To)

| Use rustcn | Don't use rustcn |
|---------------|---------------------|
| 10k+ table rows | Arrays under 100 items |
| Multi-step forms (10+ fields) | Single input validation |
| Large markdown docs (50KB+) | Simple renders |

**Honest truth:** If your dataset is small, JS is faster. We'll warn you.

---

## Architecture

```
UI Layer (React + Tailwind)    <- what you see
    |
rustcn Components               <- distribution
    |
rustcn Engines (WASM)           <- the moat
```

- **Copy-pasteable**: You own the code. No lock-in.
- **JS fallback**: Always bundled. If WASM fails, your app works.
- **Zero Rust required**: npm install only.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full picture.

---

## Roadmap

- **Phase 0** (now): Table + Form components, benchmark CLI, visual demo
- **Phase 1**: 5-8 components, SSR/Edge/Node support
- **Phase 2**: DevTools, docs, benchmark suite
- **Phase 3**: Community ecosystem, plugins

See [ROADMAP.md](ROADMAP.md) for details.

---

## Development

```bash
# Run Rust tests
cargo test --workspace

# Run TypeScript checks
cd bindings && npm run build

# Run demo
cd examples/react-demo && npm install && npm run dev
```

---

## License

MIT
