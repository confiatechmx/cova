import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden bg-zinc-50 flex flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 md:pl-[72px] pb-[72px] md:pb-0 flex flex-col h-full overflow-hidden w-full relative">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 h-full">
          {children}
        </main>
      </div>
    </div>
  );
}
