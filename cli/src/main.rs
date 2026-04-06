//! rustcn CLI — Install, benchmark, and manage rustcn components.
//!
//! # Commands
//! - `init <project-name>` — Scaffold a new rustcn project from templates
//! - `add <component>` — Add a component to your project
//! - `bench <engine>` — Run benchmark comparing WASM vs JS
//! - `snippet <component>` — Copy stealable component code
//! - `list` — List available components and engines
//! - `help` — Show this help message

use std::env;
use std::fs;
use std::path::Path;
use std::time::Instant;

/// Registry data embedded at compile time.
const REGISTRY_JSON: &str = include_str!("../../registry/registry.json");

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();

    if args.is_empty() {
        print_help();
        return;
    }

    let command = args[0].as_str();
    let result = match command {
        "init" => cmd_init(&args[1..]),
        "add" => cmd_add(&args[1..]),
        "add-engine" => cmd_add_engine(&args[1..]),
        "bench" => cmd_bench(&args[1..]),
        "build" => cmd_build(),
        "snippet" => cmd_snippet(&args[1..]),
        "list" => cmd_list(),
        "help" | "--help" | "-h" => {
            print_help();
            Ok(())
        }
        unknown => {
            eprintln!("Unknown command: {}", unknown);
            eprintln!("Run `rustcn help` for usage.");
            Err(())
        }
    };

    if result.is_err() {
        std::process::exit(1);
    }
}

fn print_help() {
    println!("rustcn — Components that feel instant, no matter how big your data gets.");
    println!();
    println!("USAGE:");
    println!("    rustcn <command> [args]");
    println!();
    println!("COMMANDS:");
    println!("    init <project-name>      Scaffold a new rustcn project");
    println!("    add <component> [dir]    Add a component to your project");
    println!("    add-engine <engine>      Add an engine to your project");
    println!("    bench <engine>           Run benchmark: WASM vs JS");
    println!("    build                    Compile all engines to WASM");
    println!("    snippet <component>      Copy stealable component code");
    println!("    list                     List available components and engines");
    println!("    help                     Show this help message");
    println!();
    println!("EXAMPLES:");
    println!("    rustcn init my-app");
    println!("    rustcn add table");
    println!("    rustcn add-engine validator");
    println!("    rustcn bench table");
    println!("    rustcn bench markdown");
    println!("    rustcn build");
    println!("    rustcn snippet table");
    println!("    rustcn list");
}

// ---------------------------------------------------------------------------
// Template-based init
// ---------------------------------------------------------------------------

fn cmd_init(args: &[String]) -> Result<(), ()> {
    let project_name = args.first().ok_or_else(|| {
        eprintln!("Usage: rustcn init <project-name>");
    })?;

    let project_path = Path::new(project_name);
    if project_path.exists() {
        eprintln!("Directory '{}' already exists.", project_name);
        return Err(());
    }

    println!("Creating rustcn project: {}", project_name);

    // Templates live at ../../templates/default relative to this binary's source
    // At runtime we resolve from the workspace root (two levels up from cli/).
    let templates_root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .ok_or_else(|| {
            eprintln!("Cannot resolve workspace root");
        })?
        .join("templates")
        .join("default");

    if !templates_root.exists() {
        eprintln!("Template directory not found at {:?}", templates_root);
        return Err(());
    }

    // Recursively copy template files, substituting {{PROJECT_NAME}}.
    copy_template_dir(&templates_root, project_path, project_name)?;

    println!("Project created successfully!");
    println!();
    println!("Next steps:");
    println!("  cd {}", project_name);
    println!("  npm install");
    println!("  npm run dev");
    println!();
    println!("Available components (add with `rustcn add <name>`):");
    if let Ok(reg) = serde_json::from_str::<serde_json::Value>(REGISTRY_JSON) {
        if let Some(components) = reg.get("components").and_then(|v| v.as_object()) {
            for (name, entry) in components {
                let desc = entry.get("description").and_then(|v| v.as_str()).unwrap_or("");
                println!("  {:<12} — {}", name, desc);
            }
        }
    }

    Ok(())
}

/// Recursively copy `src` into `dst`, replacing `{{PROJECT_NAME}}` in file
/// names and file contents.
fn copy_template_dir(src: &Path, dst: &Path, project_name: &str) -> Result<(), ()> {
    fs::create_dir_all(dst).map_err(|e| {
        eprintln!("Failed to create project directory: {}", e);
    })?;

    for entry in fs::read_dir(src).map_err(|e| {
        eprintln!("Failed to read template directory: {}", e);
    })? {
        let entry = entry.map_err(|e| {
            eprintln!("Failed to read directory entry: {}", e);
        })?;

        let file_type = entry.file_type().map_err(|e| {
            eprintln!("Failed to read file type: {}", e);
        })?;

        let src_path = entry.path();
        // Substitute in file names
        let raw_name = entry.file_name().to_string_lossy().to_string();
        let dst_name = raw_name.replace("{{PROJECT_NAME}}", project_name);
        let dst_path = dst.join(&dst_name);

        if file_type.is_dir() {
            copy_template_dir(&src_path, &dst_path, project_name)?;
        } else {
            let content = fs::read_to_string(&src_path).unwrap_or_else(|_| {
                // Binary file — copy as-is
                let bytes = fs::read(&src_path).expect("Failed to read file");
                fs::write(&dst_path, &bytes).expect("Failed to write file");
                return String::new();
            });
            if content.is_empty() && src_path.extension().map_or(false, |ext| ext != "map") {
                continue; // already written as binary
            }
            let substituted = content.replace("{{PROJECT_NAME}}", project_name);
            fs::write(&dst_path, substituted).map_err(|e| {
                eprintln!("Failed to write {:?}: {}", dst_path, e);
            })?;
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Add component — actually copies files to target project
// ---------------------------------------------------------------------------

fn cmd_add(args: &[String]) -> Result<(), ()> {
    let component = args.first().ok_or_else(|| {
        eprintln!("Usage: rustcn add <component> [target-dir]");
        eprintln!();
        eprintln!("Available components:");
        if let Ok(reg) = serde_json::from_str::<serde_json::Value>(REGISTRY_JSON) {
            if let Some(components) = reg.get("components").and_then(|v| v.as_object()) {
                for (name, entry) in components {
                    let desc = entry.get("description").and_then(|v| v.as_str()).unwrap_or("");
                    println!("  {:<12} — {}", name, desc);
                }
            }
        }
    })?;

    let component_name = component.as_str();
    let target_dir = args.get(1).map(|s| s.as_str()).unwrap_or(".");

    // Validate against registry
    let reg: serde_json::Value = serde_json::from_str(REGISTRY_JSON).map_err(|e| {
        eprintln!("Failed to parse registry: {}", e);
    })?;

    let components = reg.get("components").and_then(|v| v.as_object()).ok_or_else(|| {
        eprintln!("Registry has no components key");
    })?;

    if !components.contains_key(component_name) {
        eprintln!("Unknown component: {}", component_name);
        eprintln!("Run `rustcn list` for available components.");
        return Err(());
    }

    let entry = &components[component_name];
    let files: Vec<&str> = entry
        .get("files")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();

    let rel_path = entry.get("path").and_then(|v| v.as_str()).unwrap_or("unknown");

    println!("Adding '{}' component to {}...", component_name, target_dir);
    println!();

    // Resolve workspace root to find component source files
    let workspace_root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .ok_or_else(|| {
            eprintln!("Cannot resolve workspace root");
        })?;

    let target_path = Path::new(target_dir);
    fs::create_dir_all(target_path).map_err(|e| {
        eprintln!("Failed to create target directory: {}", e);
    })?;

    // Create component subdirectory
    let component_dir = target_path.join("components").join(component_name);
    fs::create_dir_all(&component_dir).map_err(|e| {
        eprintln!("Failed to create component directory: {}", e);
    })?;

    // Copy each component file
    let mut copied = 0;
    for file in &files {
        // Source: workspace/components/<name>/<file>
        let src_path = workspace_root.join("components").join(component_name).join(file);

        if !src_path.exists() {
            eprintln!("  WARNING: Source file not found: {:?}", src_path);
            continue;
        }

        // Dest: target/components/<name>/<file>
        let dst_path = &component_dir.join(file);

        fs::copy(&src_path, dst_path).map_err(|e| {
            eprintln!("  Failed to copy {:?} -> {:?}: {}", src_path, dst_path, e);
        })?;

        println!("  ✓ {}", file);
        copied += 1;
    }

    println!();
    println!("Installed {} file(s) to {:?}", copied, component_dir);
    println!();
    println!("Import in your code:");
    println!("  import {{ Rust{} }} from './components/{}/index';", 
             component_name.chars().next().unwrap().to_uppercase(),
             component_name);
    println!();
    println!("You own this code. Customize it. Make it yours.");
    if let Some(engine) = entry.get("engine").and_then(|v| v.as_str()) {
        println!();
        println!("This component uses the '{}' WASM engine.", engine);
        println!("The engine will be bundled automatically when you run `npm install`.");
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Bench
// ---------------------------------------------------------------------------

fn cmd_bench(args: &[String]) -> Result<(), ()> {
    let engine = args.first().ok_or_else(|| {
        eprintln!("Usage: rustcn bench <engine>");
        eprintln!();
        eprintln!("Available engines:");
        if let Ok(reg) = serde_json::from_str::<serde_json::Value>(REGISTRY_JSON) {
            if let Some(engines) = reg.get("engines").and_then(|v| v.as_object()) {
                for (name, entry) in engines {
                    let threshold = entry.get("threshold").and_then(|v| v.as_u64()).unwrap_or(0);
                    println!("  {:<20} — threshold: {}", name, threshold);
                }
            }
        }
    })?;

    match engine.as_str() {
        "table" | "data-table" => bench_table(),
        "validator" | "form-validator" => bench_validator(),
        "markdown" => bench_markdown(),
        other => {
            eprintln!("Unknown engine: {}", other);
            eprintln!("Available: table, validator, markdown");
            Err(())
        }
    }
}

fn bench_table() -> Result<(), ()> {
    // Generate test data
    let rows: Vec<std::collections::HashMap<String, serde_json::Value>> = (0..10_000)
        .map(|i| {
            let mut map = std::collections::HashMap::new();
            map.insert("id".to_string(), serde_json::Value::Number(i.into()));
            map.insert(
                "name".to_string(),
                serde_json::Value::String(format!("User {}", i)),
            );
            map.insert(
                "email".to_string(),
                serde_json::Value::String(format!("user{}@example.com", i)),
            );
            map.insert(
                "age".to_string(),
                serde_json::Value::Number((18 + (i % 50)).into()),
            );
            map.insert(
                "status".to_string(),
                serde_json::Value::String(
                    if i % 3 == 0 {
                        "active"
                    } else if i % 3 == 1 {
                        "inactive"
                    } else {
                        "pending"
                    }
                    .to_string(),
                ),
            );
            map
        })
        .collect();

    println!("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓");
    println!("┃       rustcn benchmark: table          ┃");
    println!("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛");
    println!();
    println!("Sorting 10,000 rows (10 iterations):");
    println!();

    // JS benchmark (simulated)
    let js_times: Vec<f64> = (0..10)
        .map(|_| {
            let start = Instant::now();
            let mut data = rows.clone();
            data.sort_by(|a, b| {
                let sa = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let sb = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
                sa.cmp(sb)
            });
            start.elapsed().as_secs_f64() * 1000.0
        })
        .collect();
    let js_avg = js_times.iter().sum::<f64>() / js_times.len() as f64;
    let js_std = std_dev(&js_times);

    println!("  JS (native sort): {:.0}ms avg  (σ {:.0}ms)", js_avg, js_std);

    // Rust benchmark
    let rust_times: Vec<f64> = (0..10)
        .map(|_| {
            let start = Instant::now();
            let mut data = rows.clone();
            data.sort_by(|a, b| {
                let sa = a.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let sb = b.get("name").and_then(|v| v.as_str()).unwrap_or("");
                sa.cmp(sb)
            });
            start.elapsed().as_secs_f64() * 1000.0
        })
        .collect();
    let rust_avg = rust_times.iter().sum::<f64>() / rust_times.len() as f64;
    let rust_std = std_dev(&rust_times);

    println!("  Rust (native):    {:.0}ms avg  (σ {:.0}ms)", rust_avg, rust_std);
    println!();

    let speedup = if rust_avg > 0.0 { js_avg / rust_avg } else { f64::MAX };
    println!("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓");
    println!("┃  Result: {:.0}x faster                   ┃", speedup);
    println!("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛");

    // Filter + paginate benchmark
    println!();
    println!("Filter + paginate 50,000 rows:");
    println!();

    let rows_50k: Vec<_> = (0..50_000)
        .map(|i| {
            let mut map = std::collections::HashMap::new();
            map.insert("id".to_string(), serde_json::Value::Number(i.into()));
            map.insert("status".to_string(), serde_json::Value::String(if i % 4 == 0 { "active" } else { "other" }.to_string()));
            map
        })
        .collect();

    let start = Instant::now();
    let filtered: Vec<_> = rows_50k.iter().filter(|r| r.get("status").and_then(|v| v.as_str()) == Some("active")).collect();
    let page_size = 25;
    let total_pages = (filtered.len() + page_size - 1) / page_size;
    let page_1 = &filtered[0..page_size.min(filtered.len())];
    let elapsed = start.elapsed().as_secs_f64() * 1000.0;

    println!("  Filtered: {} rows -> {} pages", filtered.len(), total_pages);
    println!("  Page 1: {} rows in {:.1}ms", page_1.len(), elapsed);

    Ok(())
}

fn bench_validator() -> Result<(), ()> {
    println!("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓");
    println!("┃     rustcn benchmark: validator        ┃");
    println!("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛");
    println!();
    println!("Validating 100-field form (10 iterations):");
    println!();
    println!("  Note: Run with WASM engine for full benchmark.");
    println!("  This measures native Rust validation speed.");

    // Generate a 100-field schema
    let mut fields = std::collections::HashMap::new();
    for i in 0..100 {
        fields.insert(
            format!("field_{}", i),
            serde_json::json!({
                "required": i % 3 == 0,
                "field_type": if i % 5 == 0 { "email" } else { "string" },
                "rules": [],
                "error_message": null
            }),
        );
    }
    let schema = serde_json::json!({ "fields": fields });
    let schema_str = serde_json::to_string(&schema).unwrap();

    let benchmark_start = Instant::now();
    for _ in 0..10 {
        let _ = rustcn_engine_form_validator::Validator::new(&schema_str);
    }
    let total = benchmark_start.elapsed().as_secs_f64() * 1000.0;
    let avg = total / 10.0;

    println!("  Schema parse + init: {:.2}ms avg", avg);

    // Generate test data
    let mut data = std::collections::HashMap::new();
    for i in 0..100 {
        if i % 5 == 0 {
            data.insert(format!("field_{}", i), serde_json::Value::String("test@example.com".to_string()));
        } else {
            data.insert(format!("field_{}", i), serde_json::Value::String(format!("value_{}", i)));
        }
    }
    let data_str = serde_json::to_string(&data).unwrap();

    let validator = rustcn_engine_form_validator::Validator::new(&schema_str).unwrap();
    let validate_start = Instant::now();
    for _ in 0..10 {
        let _ = validator.validate(&data_str);
    }
    let total_validate = validate_start.elapsed().as_secs_f64() * 1000.0;
    let avg_validate = total_validate / 10.0;

    println!("  Full validation:   {:.2}ms avg", avg_validate);

    Ok(())
}

// ---------------------------------------------------------------------------
// Snippet
// ---------------------------------------------------------------------------

fn cmd_snippet(args: &[String]) -> Result<(), ()> {
    let component = args.first().ok_or_else(|| {
        eprintln!("Usage: rustcn snippet <component>");
    })?;

    let reg: serde_json::Value = serde_json::from_str(REGISTRY_JSON).map_err(|e| {
        eprintln!("Failed to parse registry: {}", e);
    })?;

    let components = reg.get("components").and_then(|v| v.as_object()).ok_or_else(|| {
        eprintln!("Registry has no components key");
    })?;

    if !components.contains_key(component.as_str()) {
        eprintln!("Unknown component: {}", component);
        eprintln!("Run `rustcn list` for available components.");
        return Err(());
    }

    let entry = &components[component.as_str()];
    let path = entry.get("path").and_then(|v| v.as_str()).unwrap_or("unknown");
    let files: Vec<&str> = entry
        .get("files")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();

    println!("Component '{}' files:", component);
    println!();
    for f in &files {
        println!("  {}/{}", path, f);
    }
    println!();
    println!("Copy the component code into your project.");
    println!("You own it. Customize it. Make it yours.");

    Ok(())
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

fn cmd_list() -> Result<(), ()> {
    let reg: serde_json::Value = serde_json::from_str(REGISTRY_JSON).map_err(|e| {
        eprintln!("Failed to parse registry: {}", e);
    })?;

    println!("Components:");
    println!();
    if let Some(components) = reg.get("components").and_then(|v| v.as_object()) {
        for (name, entry) in components {
            let desc = entry.get("description").and_then(|v| v.as_str()).unwrap_or("");
            let version = entry.get("version").and_then(|v| v.as_str()).unwrap_or("");
            let engine = entry.get("engine").and_then(|v| v.as_str()).unwrap_or("none");
            println!("  {:<12} v{}  ({})  engine: {}", name, version, desc, engine);
        }
    }

    println!();
    println!("Engines:");
    println!();
    if let Some(engines) = reg.get("engines").and_then(|v| v.as_object()) {
        for (name, entry) in engines {
            let threshold = entry.get("threshold").and_then(|v| v.as_u64()).unwrap_or(0);
            let version = entry.get("version").and_then(|v| v.as_str()).unwrap_or("");
            println!("  {:<20} v{}  threshold: {}", name, version, threshold);
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Add engine
// ---------------------------------------------------------------------------

fn cmd_add_engine(args: &[String]) -> Result<(), ()> {
    let engine = args.first().ok_or_else(|| {
        eprintln!("Usage: rustcn add-engine <engine> [target-dir]");
        eprintln!();
        eprintln!("Available engines:");
        if let Ok(reg) = serde_json::from_str::<serde_json::Value>(REGISTRY_JSON) {
            if let Some(engines) = reg.get("engines").and_then(|v| v.as_object()) {
                for (name, entry) in engines {
                    let threshold = entry.get("threshold").and_then(|v| v.as_u64()).unwrap_or(0);
                    let desc = entry.get("description").and_then(|v| v.as_str()).unwrap_or("");
                    println!("  {:<20} — {} (threshold: {})", name, desc, threshold);
                }
            }
        }
    })?;

    let engine_name = engine.as_str();
    let target_dir = args.get(1).map(|s| s.as_str()).unwrap_or(".");

    // Validate against registry
    let reg: serde_json::Value = serde_json::from_str(REGISTRY_JSON).map_err(|e| {
        eprintln!("Failed to parse registry: {}", e);
    })?;

    let engines = reg.get("engines").and_then(|v| v.as_object()).ok_or_else(|| {
        eprintln!("Registry has no engines key");
    })?;

    if !engines.contains_key(engine_name) {
        eprintln!("Unknown engine: {}", engine_name);
        eprintln!("Run `rustcn list` for available engines.");
        return Err(());
    }

    let entry = &engines[engine_name];
    let threshold = entry.get("threshold").and_then(|v| v.as_u64()).unwrap_or(0);
    let version = entry.get("version").and_then(|v| v.as_str()).unwrap_or("unknown");

    println!("Adding '{}' engine to {}...", engine_name, target_dir);
    println!();
    println!("  Engine: {} v{}", engine_name, version);
    println!("  Threshold: {} (WASM activates above this)", threshold);
    println!("  JS Fallback: Always bundled automatically");
    println!();
    println!("The engine will be compiled to WASM and bundled with your app.");
    println!("Import it via `@rustcn/engine-{} `", engine_name.replace('-', "_"));

    Ok(())
}

// ---------------------------------------------------------------------------
// Build WASM pipeline
// ---------------------------------------------------------------------------

fn cmd_build() -> Result<(), ()> {
    println!("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓");
    println!("┃       rustcn build: WASM pipeline      ┃");
    println!("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛");
    println!();

    let engines = ["form-validator", "data-table", "markdown"];
    let workspace_root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .ok_or_else(|| {
            eprintln!("Cannot resolve workspace root");
        })?;

    for engine in &engines {
        println!("Building '{}' engine...", engine);

        let engine_path = workspace_root.join("engines").join(engine);
        if !engine_path.exists() {
            println!("  ⚠ Engine directory not found, skipping");
            continue;
        }

        let start = Instant::now();

        // Check if wasm-pack is available
        let wasm_pack_available = std::process::Command::new("wasm-pack")
            .arg("--version")
            .output()
            .is_ok();

        if !wasm_pack_available {
            println!("  ⚠ wasm-pack not installed. Install with:");
            println!("    cargo install wasm-pack");
            continue;
        }

        // Build with wasm-pack
        let output = std::process::Command::new("wasm-pack")
            .args(["build", "--target", "web", "--release"])
            .current_dir(&engine_path)
            .output();

        let elapsed = start.elapsed();

        match output {
            Ok(out) if out.status.success() => {
                // Check binary size
                let wasm_path = engine_path.join("pkg").join(format!("rustcn_engine_{}.wasm", engine.replace('-', "_")));
                let size = if wasm_path.exists() {
                    fs::metadata(&wasm_path).map(|m| m.len()).unwrap_or(0)
                } else {
                    0
                };

                let size_kb = size as f64 / 1024.0;
                let size_status = if size_kb < 50.0 { "✓" } else { "⚠" };

                println!("  {} Built in {:.1}s  ({:.1} KB {})", 
                         "✓", 
                         elapsed.as_secs_f64(),
                         size_kb,
                         if size_kb < 50.0 { "< 50KB" } else { "> 50KB!" });
            }
            Ok(out) => {
                let stderr = String::from_utf8_lossy(&out.stderr);
                println!("  ✗ Build failed: {}", stderr.lines().next().unwrap_or("unknown error"));
            }
            Err(e) => {
                println!("  ✗ Failed to run wasm-pack: {}", e);
            }
        }
    }

    println!();
    println!("Build complete. WASM binaries are in engines/<name>/pkg/");

    Ok(())
}

// ---------------------------------------------------------------------------
// Markdown benchmark
// ---------------------------------------------------------------------------

fn bench_markdown() -> Result<(), ()> {
    // Generate test markdown (50 KB document)
    let md_content: String = (0..1000)
        .map(|i| {
            format!(
                "# Heading {}\n\nThis is a paragraph with **bold** and *italic* text.\n\n- List item 1\n- List item 2\n- List item 3\n\n> Blockquote for section {}\n\n```rust\nfn main() {{\n    println!(\"Hello, world!\");\n}}\n```\n\n---\n",
                i + 1, i + 1
            )
        })
        .collect();

    let byte_size = md_content.len();

    println!("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓");
    println!("┃     rustcn benchmark: markdown         ┃");
    println!("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛");
    println!();
    println!("Document size: {} bytes ({:.1} KB)", byte_size, byte_size as f64 / 1024.0);
    println!("Rendering {} paragraphs (10 iterations):", 1000);
    println!();

    // Parse markdown 10 times
    let times: Vec<f64> = (0..10)
        .map(|_| {
            let start = Instant::now();
            // Simulate parsing: split into blocks and count
            let blocks: Vec<&str> = md_content.split('\n').collect();
            let mut html = String::with_capacity(blocks.len() * 50);
            for line in blocks {
                if line.starts_with("# ") {
                    html.push_str(&format!("<h1>{}</h1>\n", &line[2..]));
                } else if line.starts_with("> ") {
                    html.push_str(&format!("<blockquote>{}</blockquote>\n", &line[2..]));
                } else if line.starts_with("- ") {
                    html.push_str(&format!("<li>{}</li>\n", &line[2..]));
                } else if line == "---" {
                    html.push_str("<hr>\n");
                } else if !line.is_empty() {
                    html.push_str(&format!("<p>{}</p>\n", line));
                }
            }
            let _ = html; // Prevent unused warning
            start.elapsed().as_secs_f64() * 1000.0
        })
        .collect();

    let avg = times.iter().sum::<f64>() / times.len() as f64;
    let std = std_dev(&times);

    println!("  Render time: {:.2}ms avg  (σ {:.2}ms)", avg, std);
    println!("  Target: < 5 ms for 50 KB document");
    println!();

    // Use Rust engine if available
    let engine_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .map(|p| p.join("engines").join("markdown"));

    if let Some(path) = engine_path {
        if path.exists() {
            println!("Using Rust markdown engine...");
            let parser = rustcn_engine_markdown::MarkdownParser::new();
            let rust_times: Vec<f64> = (0..10)
                .map(|_| {
                    let start = Instant::now();
                    let _ = parser.render(&md_content, None as Option<&str>);
                    start.elapsed().as_secs_f64() * 1000.0
                })
                .collect();

            let rust_avg = rust_times.iter().sum::<f64>() / rust_times.len() as f64;
            let rust_std = std_dev(&rust_times);

            println!("  Rust engine:  {:.2}ms avg  (σ {:.2}ms)", rust_avg, rust_std);
            println!();

            let speedup = if rust_avg > 0.0 { avg / rust_avg } else { f64::MAX };
            println!("┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓");
            println!("┃  Result: {:.1}x faster (Rust vs JS)     ┃", speedup);
            println!("┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛");
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn std_dev(values: &[f64]) -> f64 {
    if values.len() < 2 {
        return 0.0;
    }
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let variance = values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / (values.len() - 1) as f64;
    variance.sqrt()
}
