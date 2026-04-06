# When to Use rustcn (and When Not To)

> **Rule of thumb: If serialization cost > execution savings, use JS.**

---

## Decision Tree

```
Start: Do I need this component?
│
├─ Is my data SMALL?
│  ├─ Table < 1,000 rows          → Use JS
│  ├─ Form < 10 fields             → Use JS
│  └─ Markdown < 10 KB             → Use JS
│
├─ Is my data LARGE?
│  ├─ Table >= 1,000 rows          → Use rustcn ✓
│  ├─ Form >= 10 fields            → Use rustcn ✓
│  └─ Markdown >= 10 KB            → Use rustcn ✓
│
└─ Is the operation REPEATED?
   ├─ Sort/filter on every keystroke → Use rustcn ✓
   ├─ Fuzzy search on 10k+ items     → Use rustcn ✓
   └─ One-off calculation            → Use JS
```

**Quick answer:** If your dataset crosses the threshold below, rustcn gets faster. Below it, the JS→WASM→JS serialization overhead makes things slower. We'll warn you in the console if you misuse it.

---

## Engine Thresholds

| Engine | Min Data for WASM | JS Faster Below | Reason |
|--------|-------------------|-----------------|--------|
| **Form Validator** | 10+ fields | < 10 fields | Serialization overhead only pays off for complex schemas |
| **Data Table** | 1,000+ rows | < 1,000 rows | Sorting/pagination/aggregation benefits kick in here |
| **Markdown Parser** | 10 KB+ input | < 10 KB | Small docs parse fast in JS either way |
| **Command Search** | 10,000+ items | < 10,000 items | Fuzzy search on large sets benefits from Rust speed |
| **Dashboard Blocks** | 5+ stat cards with large datasets | < 5 cards or tiny data | WASM-powered aggregation shines with batched updates |

---

## Good Use Cases

### Tables with large datasets
```tsx
// 10k rows from an API — sorting and filtering lag in JS
<RustTable data={apiResponse.rows} sort filter virtualize />
```

### Multi-step forms with complex validation
```tsx
// 30+ fields across 4 steps — validation feels instant with Rust
<RustForm schema={checkoutSchema} multiStep onSubmit={handleSubmit} />
```

### Command palette with huge option sets
```tsx
// 15k commands — fuzzy search stays snappy
<RustCommand options={allCommands} onSelect={runCommand} />
```

### Server-side data to client component
```tsx
// Next.js Server Component — WASM auto-selects on the client
export default async function Page() {
  const rows = await getRowsFromDB();
  return <RustTable data={rows} sort filter />;
}
```

### React Query integration
```tsx
// Server state — engine consumes it, doesn't replace it
function MyTable() {
  const { data } = useQuery({ queryKey: ['rows'], queryFn: fetchRows });
  return <RustTable data={data} sort filter />;
}
```

---

## Bad Use Cases

### Single-field form
```tsx
// DON'T — use native HTML5 validation
// <RustForm schema={{ email: { required: true } }}>
//   <RustFormField name="email" />
// </RustForm>
```

### Small arrays
```tsx
// DON'T — JS handles 50 items faster than WASM round-trip
// <RustTable data={smallList} sort />
```

---

## Console Warning Explanation

When data falls below 50% of the threshold, rustcn logs:

```
[rustcn] Data size is below threshold. JS fallback would be faster.
Consider removing rustcn for this use case.
```

**What it means:** The time spent serializing your data into WASM, executing the operation, and deserializing the result back to JS exceeds what the native JS engine would take. The JS fallback (Zod, TanStack, etc.) is still used — your app works correctly — but you're paying a performance penalty for no gain.

**What to do:**
1. Check your data size against the thresholds above
2. If consistently below, remove rustcn for that component
3. If sometimes above/sometimes below, rustcn auto-selects the right path — no action needed

**This is not an error.** Your app works fine. It's a suggestion that you'd get better performance without rustcn for that specific use case.

---

## The Honest Summary

| Scenario | Use | Why |
|----------|-----|-----|
| Data-heavy dashboard with 50k rows | rustcn | WASM sorting/filtering is 10-15x faster |
| Multi-step checkout with 30 fields | rustcn | Complex validation without UI thread blocking |
| Command palette for admin tools | rustcn | Fuzzy search on 10k+ items stays instant |
| Blog post rendering (2 KB markdown) | JS | `marked` handles this in < 1 ms |
| Contact form with 3 fields | JS | Native HTML5 validation is enough |
| Product list with 50 items | JS | Array.sort is faster than WASM round-trip |

**Bottom line:** rustcn augments JavaScript where it's weakest — large datasets, repeated compute, complex validation. It doesn't replace JavaScript for trivial operations. We're transparent about when JS wins.
