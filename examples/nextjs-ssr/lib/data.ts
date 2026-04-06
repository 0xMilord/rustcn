/**
 * Simulated server-side data fetching.
 * In production, these would call your database/API.
 */

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
}

/** Simulate fetching users from a database */
export async function getUsers(): Promise<User[]> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 50));

  return Array.from({ length: 500 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: i % 5 === 0 ? 'admin' : i % 3 === 0 ? 'editor' : 'viewer',
    status: i % 4 === 0 ? 'active' : i % 4 === 1 ? 'inactive' : 'pending',
    lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  }));
}

/** Simulate fetching dashboard stats */
export async function getStats() {
  await new Promise((r) => setTimeout(r, 30));
  return {
    totalUsers: 12847,
    activeUsers: 8432,
    revenue: '$48,290',
    conversionRate: '3.2%',
  };
}

/** Simulate fetching markdown content from CMS */
export async function getCmsContent(): Promise<string> {
  await new Promise((r) => setTimeout(r, 20));
  return `# Welcome to rustcn

This content is **fetched server-side** and rendered with rustcn's Markdown component.

## Why rustcn?

- \`10k rows\` — Tables that stay smooth at scale
- \`100 fields\` — Forms that validate instantly
- \`50 KB docs\` — Markdown that renders in milliseconds

> rustcn is shadcn with a performance brain.
> Components that feel instant, no matter how big your data gets.

---

### Architecture

\`\`\`
UI Layer (React + Tailwind)
    ↓
rustcn Components
    ↓
rustcn Engines (WASM)
\`\`\`

**Server components** pass data to **client components** seamlessly.
WASM auto-detection falls back to JS on server, activates on client.
`;
}
