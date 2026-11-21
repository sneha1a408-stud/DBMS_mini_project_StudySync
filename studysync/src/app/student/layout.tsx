import { StudentSidebar } from '@/components/layout/Sidebar';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <StudentSidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
