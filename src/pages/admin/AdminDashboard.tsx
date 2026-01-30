import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Settings, 
  UserPlus,
  FileText,
  BarChart3,
  Bell,
  LogOut,
  Menu,
  X,
  Dumbbell,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    { icon: BarChart3, label: "Dashboard", href: "/admin", active: true },
    { icon: Users, label: "Utenti", href: "/admin/utenti" },
    { icon: UserPlus, label: "Nuovo Utente", href: "/admin/utenti/nuovo" },
    { icon: Calendar, label: "Calendario", href: "/admin/calendario" },
    { icon: CreditCard, label: "Abbonamenti", href: "/admin/abbonamenti" },
    { icon: FileText, label: "Documenti", href: "/admin/documenti" },
    { icon: Dumbbell, label: "Esercizi", href: "/admin/esercizi" },
    { icon: Clock, label: "Orari Palestra", href: "/admin/orari" },
    { icon: Bell, label: "Notifiche", href: "/admin/notifiche" },
    { icon: Settings, label: "Impostazioni", href: "/admin/impostazioni" },
  ];

  const stats = [
    { label: "Clienti Attivi", value: "0", icon: Users, color: "text-primary" },
    { label: "Abbonamenti in Scadenza", value: "0", icon: CreditCard, color: "text-destructive" },
    { label: "Appuntamenti Oggi", value: "0", icon: Calendar, color: "text-success" },
    { label: "Nuove Segnalazioni", value: "0", icon: Bell, color: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background border-r border-sidebar-border
        transform transition-transform duration-300 lg:translate-x-0 lg:static
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
            <Link to="/admin" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl tracking-wider text-sidebar-foreground">ADMIN</span>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="ml-auto lg:hidden text-sidebar-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-sm transition-colors
                  ${item.active 
                    ? 'bg-sidebar-accent text-sidebar-primary' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="mb-3 px-4">
              <p className="text-sm font-medium text-sidebar-foreground">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-muted-foreground">Amministratore</p>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-sidebar-foreground hover:text-destructive"
              onClick={signOut}
            >
              <LogOut className="w-5 h-5" />
              Esci
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center px-6">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="lg:hidden text-foreground mr-4"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-display text-2xl tracking-wider">PANNELLO ADMIN</h1>
        </header>

        {/* Content */}
        <div className="flex-1 p-6">
          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-2xl font-display tracking-wider mb-2">
              Benvenuto, {profile?.first_name}!
            </h2>
            <p className="text-muted-foreground">
              Ecco una panoramica della tua palestra.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <Card key={stat.label} className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-display tracking-wider mt-1">{stat.value}</p>
                    </div>
                    <stat.icon className={`w-10 h-10 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display tracking-wider">Azioni Rapide</CardTitle>
                <CardDescription>Operazioni comuni</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/admin/utenti/nuovo">
                  <Button className="w-full justify-start gap-3" variant="secondary">
                    <UserPlus className="w-5 h-5" />
                    Crea Nuovo Utente
                  </Button>
                </Link>
                <Link to="/admin/calendario">
                  <Button className="w-full justify-start gap-3" variant="secondary">
                    <Calendar className="w-5 h-5" />
                    Gestisci Calendario
                  </Button>
                </Link>
                <Link to="/admin/abbonamenti">
                  <Button className="w-full justify-start gap-3" variant="secondary">
                    <CreditCard className="w-5 h-5" />
                    Registra Pagamento
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display tracking-wider">Attività Recenti</CardTitle>
                <CardDescription>Ultime operazioni nel sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna attività recente</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
