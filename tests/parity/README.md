# Result Parity Tests

These tests verify that WASM engine output = JS fallback output for identical inputs.

**Guarantee:** If results differ, that's a bug, not a feature.

## Running

```bash
# Rust parity tests
cargo test parity

# JS parity tests (when bindings tests are set up)
cd bindings && npm test
```
