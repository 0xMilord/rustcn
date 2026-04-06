import { describe, it, expect } from 'vitest';
import { executeTable } from '../fallbacks/table.js';

describe('table parity', () => {
  const rows = [
    { name: 'Charlie', age: 35, status: 'active' },
    { name: 'Alice', age: 28, status: 'active' },
    { name: 'Bob', age: 42, status: 'inactive' },
    { name: 'Diana', age: 31, status: 'active' },
    { name: 'Eve', age: 25, status: 'inactive' },
  ];

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'age', label: 'Age', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
  ];

  it('sort asc works', () => {
    const result = executeTable(rows, columns, [{ column: 'name', direction: 'asc' }], [], null);
    const names = result.rows.map(r => r.name as string);
    expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve']);
    expect(result.total_rows).toBe(5);
    expect(result.filtered_rows).toBe(5);
  });

  it('sort desc works', () => {
    const result = executeTable(rows, columns, [{ column: 'age', direction: 'desc' }], [], null);
    const ages = result.rows.map(r => r.age as number);
    expect(ages).toEqual([42, 35, 31, 28, 25]);
  });

  it('filter eq works', () => {
    const result = executeTable(rows, columns, [], [{ column: 'status', operator: 'eq', value: 'active' }], null);
    expect(result.filtered_rows).toBe(3);
    expect(result.total_rows).toBe(5);
  });

  it('filter contains works', () => {
    const result = executeTable(rows, columns, [], [{ column: 'name', operator: 'contains', value: 'li' }], null);
    expect(result.filtered_rows).toBe(2); // Charlie, Alice
  });

  it('filter gt works', () => {
    const result = executeTable(rows, columns, [], [{ column: 'age', operator: 'gt', value: 30 }], null);
    expect(result.filtered_rows).toBe(3);
  });

  it('pagination works', () => {
    const result = executeTable(rows, columns, [{ column: 'name', direction: 'asc' }], [], { page: 1, pageSize: 2 });
    expect(result.rows.length).toBe(2);
    expect(result.page).toBe(1);
    expect(result.page_size).toBe(2);
    expect(result.total_pages).toBe(3);
    const names = result.rows.map(r => r.name as string);
    expect(names).toEqual(['Alice', 'Bob']);
  });

  it('filter + sort combined works', () => {
    const result = executeTable(
      rows, columns,
      [{ column: 'age', direction: 'asc' }],
      [{ column: 'status', operator: 'eq', value: 'active' }],
      null
    );
    expect(result.filtered_rows).toBe(3);
    const ages = result.rows.map(r => r.age as number);
    expect(ages).toEqual([28, 31, 35]);
  });

  it('empty data works', () => {
    const result = executeTable([], columns, [], [], null);
    expect(result.rows).toEqual([]);
    expect(result.total_rows).toBe(0);
    expect(result.total_pages).toBe(1);
  });
});
