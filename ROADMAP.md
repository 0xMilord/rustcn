# ROADMAP: Rustcn — Performance-Augmented Component System

> **Mission:** Components that feel instant, no matter how big your data gets.

---

## 🧠 Mindset: Wedge, Not Platform

We're attacking **one problem** with **one solution** that provides **undeniable improvement**.

Not: registry, protocols, ecosystems, 50 components.
Just: one table so fast it embarrasses every JS library.

**Depth beats breadth in v0.1.**

---

## 📅 Phase 0: Foundation + Visible Proof (Weeks 1–4)

### 🎯 Goal: Dev feels speed instantly. Installs in 60 seconds.

| Task | Owner | Status |
|------|-------|--------|
| Set up Rust workspace (`Cargo.toml`) | | ⬜ |
| Implement `engine-core` (memory, bindings, errors, singleton) | | ⬜ |
| Build CLI skeleton (`npx rustcn add table`) | | ⬜ |
| Build **benchmark CLI** (`npx rustcn bench table`) | | ⬜ |
| Create first engine: **Form Validator** (Rust) | | ⬜ |
| Generate JS/TS bindings for validator | | ⬜ |
| **Build RustTable component** (React + Tailwind + WASM engine + fallback) | | ⬜ |
| **Build RustForm component** (React + Tailwind + WASM engine + fallback) | | ⬜ |
| **Add JS fallback layer** (Zod-based, result parity guaranteed) | | ⬜ |
| **Define serialization cost thresholds** | | ⬜ |
| Wire up React example (table + form with live data) | | ⬜ |
| **Build side-by-side visual demo** (10k rows: JS laggy vs rustcn smooth) | | ⬜ |
| Write basic docs (README, quickstart) | | ⬜ |

**Deliverables:**
- ✅ Working `npx rustcn add table` command
- ✅ **2 visible components**: RustTable, RustForm (copy-pasteable, Tailwind-first)
- ✅ Form validator engine (WASM) + JS fallback with result parity
- ✅ **Benchmark CLI that proves 10x speedup**
- ✅ **Visual demo: laggy vs smooth — you feel it**
- ✅ < 50 KB WASM binary + < 10 KB component bundle
- ✅ Threshold guidelines documented

**Success Criteria:**
```bash
# The hook — no install, instant proof
npx rustcn bench table

# Expected output:
# JS (lodash):    120ms
# Rust (rustcn):    8ms
# ━━━━━━━━━━━━━━━━━━━━━
# 15x faster ⚡
```

```bash
# The onboarding — zero Rust required, visible component
npx create-rustcn-app my-demo
cd my-demo
npm install
npm run dev
# → Working dashboard with RustTable + RustForm
# → Dev sees: beautiful UI. Dev feels: instant performance.
```

**Visual Demo Requirement (non-negotiable):**
- Side-by-side page: JS table vs rustcn table
- Same 10k rows dataset
- JS version visibly laggy on sort/scroll
- rustcn version smooth
- If dev has to measure it instead of feel it, we failed

---

## 📅 Phase 1: Core Components + Engines + SSR (Weeks 5–10)

### 🎯 Goal: Ship 5–8 insanely good components, all backed by Rust engines

| Task | Owner | Status |
|------|-------|--------|
| Build **Data Table Engine** (sort, filter, paginate) | | ⬜ |
| Build **Markdown Parser** (parse, render, sanitize) | | ⬜ |
| Generate TS bindings for both engines | | ⬜ |
| **Build JS fallbacks for table + markdown** | | ⬜ |
| **Ship remaining components:** RustInput, RustModal, RustCommand, RustMarkdown, Dashboard Blocks | | ⬜ |
| **Implement simple registry** (`rustcn add <thing>` → it works) | | ⬜ |
| **Build hosted playground** (`rustcn.dev/demo` — paste JSON, see lag vs smooth) | | ⬜ |
| **Add Next.js SSR example** | | ⬜ |
| **Add Edge runtime support** (Cloudflare Workers) | | ⬜ |
| **Add Node.js runtime support** (wasmtime via NAPI) | | ⬜ |
| Implement WASM singleton + warm instance reuse | | ⬜ |
| Implement hot reload in `rustcn dev` | | ⬜ |
| Add WASM optimization pipeline (`wasm-opt`) | | ⬜ |
| Write engine docs (API reference, guides) | | ⬜ |
| **Write "When to Use rustcn" guide** | | ⬜ |
| **Write Patterns & Anti-Patterns guide** | | ⬜ |
| **Write Architecture Recipes** (Dashboard pattern, Form-heavy pattern) | | ⬜ |

**Deliverables:**
- ✅ 5–8 components: Table, Form, Input, Modal, Command, Markdown, Dashboard Blocks
- ✅ 3 engines: validator, table, markdown (all with WASM + JS fallback)
- ✅ **Simple registry**: `rustcn add table` works. No marketplace, no platform.
- ✅ **Hosted playground**: paste JSON → see comparison → share link
- ✅ Framework examples: React (primary)
- ✅ **SSR/Edge/Node examples**: Next.js, Cloudflare Workers
- ✅ Hot reload dev server
- ✅ Production-ready WASM builds
- ✅ Documented use-case boundaries + patterns + recipes

**Success Criteria:**
- Each engine < 50 KB gzipped (+ fallback bundle < 40 KB)
- Each component bundle < 10 KB
- Table sorts 10k rows in < 10 ms
- Markdown renders 50 KB doc in < 5 ms
- **Same API works in browser, SSR, and Edge**
- Fallback activates automatically when WASM unsupported
- **Dev installs for component, notices performance, explores engine**
- **Playground gets shared: "try with your own data"**

---

## 📅 Phase 2: Developer Experience (Weeks 11–16)

### 🎯 Goal: Make rustcn the easiest WASM dev tool

| Task | Owner | Status |
|------|-------|--------|
| Implement **registry versioning** (`@latest`, `@canary`) | | ⬜ |
| Implement `rustcn snippet <component>` (stealable code) | | ⬜ |
| Build **DevTools panel** (flamegraph, timeline, memory, trace) | | ⬜ |
| Add TypeScript type generation (auto `.d.ts`) | | ⬜ |
| Create documentation site (Docusaurus/VitePress) | | ⬜ |
| Add benchmark suite (vs Zod, AG Grid, marked) | | ⬜ |
| Publish components to npm (`@rustcn/react`) | | ⬜ |
| Publish engines to npm (`@rustcn/engine-*`) | | ⬜ |
| Write contributing guide + issue templates | | ⬜ |
| **Add misuse warnings** (console.warn when data below threshold) | | ⬜ |
| **Visual regression testing** (Percy/Chromatic) | | ⬜ |
| **Dark mode + theme customization** | | ⬜ |
| **State management guides** (React Query, Server Actions, streaming) | | ⬜ |

**Deliverables:**
- ✅ Registry with versioning (`@latest`, `@canary`, semver)
- ✅ Stealable code snippets (shadcn-style)
- ✅ DevTools with **flamegraphs, execution traces, memory snapshots**
- ✅ Auto-generated TypeScript types
- ✅ Public docs + benchmarks
- ✅ Architecture recipes + anti-pattern warnings
- ✅ Dark mode + theming
- ✅ State management integration guides

**Success Criteria:**
- `rustcn add table@canary` installs canary build
- `rustcn snippet form` → copies working component code
- DevTools shows **flamegraph** with serialize/execute/deserialize breakdown
- Benchmarks prove 2-10x speedup vs JS alternatives
- Misuse warnings fire when data size < 50% of threshold
- Components visually identical across light/dark mode

---

## 📅 Phase 3: Ecosystem (Weeks 17–24)

### 🎯 Goal: Build community and extensibility

| Task | Owner | Status |
|------|-------|--------|
| Implement plugin system with **sandbox + permissions** | | ⬜ |
| Add `rustcn create-engine <name>` scaffold | | ⬜ |
| **Add `rustcn create-component <name>` scaffold** | | ⬜ |
| **Evaluate MCP protocol** (only if real usage patterns demand it) | | ⬜ |
| Build engine marketplace (web UI) — only if community demands it | | ⬜ |
| **Build component showcase gallery** (like shadcn/ui) | | ⬜ |
| Add CI/CD templates (GitHub Actions) | | ⬜ |
| Publish 2 new community engines | | ⬜ |
| **Publish 2 new community components** | | ⬜ |
| Reach 1,000 GitHub stars | | ⬜ |
| Host first community call / AMA | | ⬜ |

**Deliverables:**
- ✅ Plugin architecture with **sandboxed execution** (only if needed)
- ✅ Custom engine + component scaffolding
- ✅ Community contributions flowing in
- ✅ Active community

**Success Criteria:**
- 2+ community-contributed engines (sandboxed)
- 2+ community-contributed components
- 1,000+ GitHub stars
- 50+ contributors
- Plugin permission model prevents unsafe operations

**Note on MCP/Protocols:** Only build if real usage patterns show a need. Don't freeze bad abstractions before we know what devs actually do.

---

## 📅 Phase 4: Advanced Features (Weeks 25–36)

### 🎯 Goal: Expand beyond v1 scope

| Task | Owner | Status |
|------|-------|--------|
| Build **Image Optimizer Engine** | | ⬜ |
| Build **Search Engine** (Tantivy-lite) | | ⬜ |
| Build **Charting Engine** (SVG/Canvas) | | ⬜ |
| **Ship matching components** (ImageGallery, SearchInput, Charts) | | ⬜ |
| Implement Design System Compiler (v3 vision) | | ⬜ |
| Add Web Worker support (async engines) | | ⬜ |
| Optimize WASM size to < 30 KB per engine | | ⬜ |
| Reach 10,000 npm downloads/month | | ⬜ |

**Deliverables:**
- ✅ 3 new engines (image, search, charts)
- ✅ 3 matching components
- ✅ Design System Compiler prototype
- ✅ Sub-30 KB WASM binaries
- ✅ 10k monthly downloads

---

## 📅 Phase 5: Production Hardening (Weeks 37–52)

### 🎯 Goal: Enterprise-ready

| Task | Owner | Status |
|------|-------|--------|
| Add WASI support (server-side Rust) | | ⬜ |
| Implement comprehensive test suite (90%+ cov) | | ⬜ |
| Add security audit pipeline | | ⬜ |
| Build standalone DevTools browser extension | | ⬜ |
| Support React Server Components | | ⬜ |
| Reach 5,000 GitHub stars | | ⬜ |
| Secure sponsorships / funding | | ⬜ |

**Deliverables:**
- ✅ Enterprise-grade stability
- ✅ Security certifications
- ✅ Browser extension DevTools
- ✅ Sustainable funding

---

## 📊 Milestone Tracker

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Phase 0 complete | Week 4 | ⬜ |
| Phase 1 complete | Week 10 | ⬜ |
| Phase 2 complete | Week 16 | ⬜ |
| Phase 3 complete | Week 24 | ⬜ |
| Phase 4 complete | Week 36 | ⬜ |
| Phase 5 complete | Week 52 | ⬜ |

---

## 🚨 Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| WASM tooling changes break builds | High | Pin versions, CI testing |
| Slow adoption vs JS alternatives | High | **Benchmark-first onboarding, 10x proof** |
| Binary size grows uncontrollably | Medium | Aggressive optimization, tree-shaking |
| Community contributions stall | Medium | Active outreach, good first issues |
| Browser WASM support regresses | Low | **Graceful JS fallbacks (always available)** |
| **Devs misuse WASM on small data** | High | **Threshold enforcement + console warnings** |
| **SSR/Edge runtime incompatibility** | High | **Test matrix: browser + Node + Cloudflare + Vercel Edge** |
| **Fallback bundle too large** | Medium | **Bundle subsets only, not full Zod/TanStack** |
| **Components look like shadcn clones** | High | **Same model, different behavior. Rust-powered features as differentiator.** |
| **No visible payoff → no adoption** | Critical | **Phase 0 requires visual demo. Laggy vs smooth. Non-negotiable.** |
| **Over-engineering before v0.1** | Critical | **5-8 components. Simple registry. No MCP. Ship fast, optimize later.** |

---

## 🎯 North Star Metrics

| Metric | 6 Months | 12 Months |
|--------|----------|-----------|
| GitHub Stars | 2,000 | 5,000 |
| Monthly npm downloads | 10,000 | 50,000 |
| Components shipped | 5–8 (Phase 1) | 15+ |
| Engines shipped | 6 | 10+ |
| Active contributors | 15 | 50+ |
| Framework integrations | React (primary) + SSR/Edge | 5+ |
| **Benchmarks run (CLI)** | **5,000+** | **50,000+** |
| **Fallback activation rate** | **< 5%** | **< 3%** |
| **Component → engine exploration rate** | **20%** | **40%** |
| **Playground visits (paste JSON demo)** | **10,000+** | **100,000+** |

---

## 🧭 Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Week 1 | Start with Form Validator | Most universal need, easiest to benchmark |
| Week 1 | **Components before engines (distribution-first)** | Devs install what they see. Engines retain them. |
| Week 1 | **5–8 components max at launch** | Insanely good ones. Not 50 mediocre ones. Depth beats breadth. |
| Week 1 | **Visual demo required in Phase 0** | If dev has to measure instead of feel, we fail. |
| Week 1 | **JS fallback mandatory** | Enterprises won't adopt without correctness guarantee |
| Week 1 | **Benchmark CLI before anything else** | "Show, don't tell" — 60-second hook is everything |
| Week 1 | **Zero-Rust adoption path** | npm install only, no Rust toolchain needed |
| Week 1 | **SSR/Edge support in Phase 1** | Next.js devs are the primary audience |
| Week 1 | **Wedge mindset, not platform** | One problem, one solution, undeniable improvement |
| Week 1 | **Simple registry, no marketplace** | Mapping layer, not a platform. Avoid over-engineering. |
| Week 1 | **MCP protocol deferred** | Phase 3+ only. Don't freeze bad abstractions before real usage. |
| Week 1 | **Problem-first entry points** | "Fix slow tables" not "WASM engine toolkit" |
| Week 1 | **Result parity guarantee** | WASM = JS fallback. Always. Tested every release. |
| Week 1 | **Hosted playground** | Paste JSON → see comparison → share link. Viral distribution. |
| Week 4 | **Threshold enforcement** | Prevent misuse → prevent churn |
| Week 11 | DevTools before marketplace | Debugging is critical for adoption |
| Week 11 | **State management guides** | React Query, Server Actions, streaming — real apps have this |

---

## 🪜 Upgrade Path (clear ladder)

1. **Use component**: `<RustTable data={data} />` — zero config
2. **Use hook**: `const table = useRustTable(data)` — custom UI, same engine
3. **Use engine directly**: `new DataTableEngine(data)` — build whatever you want
4. **Write custom engine**: `engine-core` + `wasm-bindgen` — extend rustcn

Each step is explicit, documented, and optional.

---

## 📝 Notes

- **Pace:** Aggressive but realistic. Each phase builds on the last.
- **Community:** Open source from Day 1. All decisions public.
- **Funding:** Phase 5 assumes some revenue/sponsorship for full-time work.
- **Flexibility:** Roadmap adjusts based on community feedback and adoption data.
- **Cut ruthlessly:** If a feature doesn't contribute to "components that feel instant," it's deferred.
- **Resist the urge:** Don't add 17 features, 4 frameworks, and a plugin system before shipping v0.1. Good ideas die in repos with aesthetic READMEs.
- **Ship v0.1 before you "improve" anything.** Perfection is the enemy of adoption.

---

## 🧠 Adoption Loop (the real growth engine)

1. Dev installs for **component** (`npx rustcn add table`)
2. Notices **performance** (10k rows scroll smooth)
3. Explores **engine** (`useRustTable` hook → discovers WASM)
4. Builds custom logic with Rust (becomes power user)
5. Contributes back (community growth)

---

> **Final word:** Components that feel instant, no matter how big your data gets.  
> **One-liner:** "shadcn with a performance brain."
