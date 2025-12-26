import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NHomesUSA — Get Terms',
  description: 'Private lending intake powered by NHomesUSA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
