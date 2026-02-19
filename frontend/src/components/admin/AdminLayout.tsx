import { useState, ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import { Menu } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  icon?: ReactNode;
  showBackLink?: boolean;
}

const AdminLayout = ({ children, title, icon, showBackLink = false }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        showBackLink={showBackLink}
      />

      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center px-6">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="lg:hidden text-foreground mr-4"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground tracking-widest uppercase">Admin / {title}</span>
            <div className="flex items-center gap-3">
              {icon && <span className="text-primary">{icon}</span>}
              <h1 className="font-display text-2xl tracking-wider">{title}</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
