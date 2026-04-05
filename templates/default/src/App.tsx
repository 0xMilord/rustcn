import { RustTable, RustForm, RustFormField, RustInput } from '@rustcn/react';

const generateRows = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    age: 18 + (i % 50),
    status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'inactive' : 'pending',
  }));

export default function App() {
  const data = generateRows(10000);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">rustcn Dashboard</h1>
      <p className="text-muted-foreground">Components that feel instant, no matter how big your data gets.</p>

      <section>
        <h2 className="text-xl font-semibold mb-4">10,000 Rows</h2>
        <RustTable data={data} sort filter virtualize />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Smart Input</h2>
        <RustInput type="email" label="Email" rules={{ required: true }} className="max-w-sm" />
      </section>
    </div>
  );
}
