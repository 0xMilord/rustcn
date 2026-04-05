/**
 * @rustcn/react — Performance-augmented React components.
 *
 * shadcn with a performance brain.
 *
 * 3-line mental model:
 * 1. Import component
 * 2. It auto-chooses Rust or JS
 * 3. You get faster UI
 */

export { RustTable } from '../../components/table/index.js';
export { RustForm, RustFormField } from '../../components/form/index.js';
export { RustInput } from '../../components/input/index.js';
export { RustCommand } from '../../components/command/index.js';
export { RustModal, RustModalTrigger } from '../../components/modal/index.js';
export { RustMarkdown } from '../../components/markdown/index.js';
export { StatCard, KpiGrid } from '../../components/dashboard/index.js';
export { cn } from '../../components/shared/index.js';

export { useRustTable } from '../../components/table/useRustTable.js';
export { useRustForm } from '../../components/form/useRustForm.js';

export type {
  RustTableProps, ColumnDef, SortSpec, FilterCondition, TableResult,
  UseRustTableOptions, UseRustTableResult,
} from '../../components/table/index.js';
export type { RustFormProps, FormFieldProps, Schema, FieldSchema, ValidationResult } from '../../components/form/index.js';
export type { RustInputProps, ValidationRule } from '../../components/input/index.js';
export type { RustCommandProps, CommandItem } from '../../components/command/index.js';
export type { RustModalProps } from '../../components/modal/index.js';
export type { RustMarkdownProps } from '../../components/markdown/index.js';
export type { StatCardProps, KpiGridProps } from '../../components/dashboard/index.js';
