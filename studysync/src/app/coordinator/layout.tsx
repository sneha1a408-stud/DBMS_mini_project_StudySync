import { CoordinatorSidebar } from '@/components/layout/Sidebar';

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <CoordinatorSidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
