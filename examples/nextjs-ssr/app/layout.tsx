import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'rustcn — Next.js SSR Example',
  description: 'Demonstrates rustcn components with Next.js Server Components',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
