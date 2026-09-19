import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { BrandProvider } from "@/components/providers/brand-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto px-6 py-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </BrandProvider>
  );
}
