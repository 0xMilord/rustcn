import { UserTable } from '@/components/UserTable';
import { ServerMarkdown } from '@/components/ServerMarkdown';
import { getUsers, getStats, getCmsContent } from '@/lib/data';

/**
 * Next.js Server Component — demonstrates rustcn with SSR.
 *
 * Key concepts:
 * 1. Data is fetched on the server (no client-side JS needed)
 * 2. Server passes data to client components (UserTable)
 * 3. Server renders markdown to HTML (ServerMarkdown)
 * 4. Client components handle WASM/JS detection automatically
 */
export default async function Home() {
  // All data fetching happens on the server
  const [users, stats, cmsContent] = await Promise.all([
    getUsers(),
    getStats(),
    getCmsContent(),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">rustcn + Next.js</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Server Components fetch data. Client Components handle WASM. Same API, both contexts.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} />
        <StatCard title="Active Users" value={stats.activeUsers.toLocaleString()} />
        <StatCard title="Revenue" value={stats.revenue} />
        <StatCard title="Conversion Rate" value={stats.conversionRate} />
      </div>

      {/* User Table */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Users ({users.length})</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Server-fetched data → client-side sorting/filtering. WASM activates on client for large datasets.
        </p>
        <UserTable users={users} />
      </section>

      {/* Server-rendered Markdown */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Documentation</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Markdown rendered server-side. Fast initial paint, no JS needed.
        </p>
        <ServerMarkdown content={cmsContent} />
      </section>

      {/* Architecture Note */}
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-6 text-sm dark:border-gray-700">
        <h3 className="mb-2 font-semibold">How SSR Works with rustcn</h3>
        <pre className="mt-2 overflow-x-auto bg-gray-50 p-3 text-xs dark:bg-gray-900">
{`Server                    Client
├─ Fetch data             ├─ Receive HTML (fast paint)
├─ Render to HTML         ├─ Hydrate React
├─ Send HTML to client    ├─ WASM detection runs
                          ├─ If WASM supported + data large → WASM engine
                          └─ Else → JS fallback (always correct)`}
        </pre>
      </div>
    </main>
  );
}

/** Simple stat card — server-rendered, no interactivity needed */
function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight">{value}</dd>
    </div>
  );
}
