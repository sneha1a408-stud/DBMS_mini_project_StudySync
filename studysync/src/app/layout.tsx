import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';

export const metadata: Metadata = {
  title: 'StudySync – Smart Study Group Matching',
  description: 'Discover compatible study partners and form productive study groups based on availability, skills, learning style, and shared courses.',
  keywords: 'study groups, study partners, university, student matching, collaborative learning',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
