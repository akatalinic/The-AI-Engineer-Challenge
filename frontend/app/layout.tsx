import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Matrix Terminal Chat',
  description: 'A matrix-style terminal chat interface',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

