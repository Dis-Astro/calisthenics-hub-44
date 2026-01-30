import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Calendar, 
  CreditCard, 
  UserPlus,
  BarChart3,
  Bell,
  LogOut,
  Menu,
  X,
  Dumbbell,
  Clock,
  BookOpen,
  ChevronRight
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface Stats {
  totalClients: number;
  expiringSubscriptions: number;
  todayAppointments: number;
  activeCourses: number;
}

const AdminDashboard = () => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({ totalClients: 0, expiringSubscriptions: 0, todayAppointments: 0, activeCourses: 0 });
  const [loading, setLoading] = useState(true);

  const navigationItems = [
    { icon: BarChart3, label: "Dashboard", href: "/admin" },
    { icon: Users, label: "Utenti", href: "/admin/utenti" },
    { icon: Calendar, label: "Calendario", href: "/admin/calendario" },
    { icon: CreditCard, label: "Abbonamenti", href: "/admin/abbonamenti" },
    { icon: BookOpen, label: "Corsi", href: "/admin/corsi" },
    { icon: Dumbbell, label: "Esercizi", href: "/admin/esercizi" },
    { icon: Clock, label: "Orari Palestra", href: "/admin/orari" },
  ];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [clientsRes, expiringRes, appointmentsRes, coursesRes] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).in("role", ["cliente_palestra", "cliente_coaching"]),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "attivo").lte("end_date", weekFromNow),
      supabase.from("appointments").select("*", { count: "exact", head: true }).gte("start_time", today).lt("start_time", today + "T23:59:59"),
      supabase.from("courses").select("*", { count: "exact", head: true }).eq("is_active", true)
    ]);

    setStats({
      totalClients: clientsRes.count || 0,
      expiringSubscriptions: expiringRes.count || 0,
      todayAppointments: appointmentsRes.count || 0,
      activeCourses: coursesRes.count || 0
    });
    setLoading(false);
  };

  const statCards = [
    { label: "Clienti Attivi", value: stats.totalClients, icon: Users, color: "text-primary" },
    { label: "Abbonamenti in Scadenza", value: stats.expiringSubscriptions, icon: CreditCard, color: "text-destructive" },
    { label: "Appuntamenti Oggi", value: stats.todayAppointments, icon: Calendar, color: "text-green-500" },
    { label: "Corsi Attivi", value: stats.activeCourses, icon: BookOpen, color: "text-blue-500" },
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
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-sm transition-colors
                    ${isActive 
                      ? 'bg-sidebar-accent text-sidebar-primary' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
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
            {statCards.map((stat) => (
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
                <Link to="/admin/utenti">
                  <Button className="w-full justify-between" variant="secondary">
                    <span className="flex items-center gap-3">
                      <UserPlus className="w-5 h-5" />
                      Gestisci Utenti
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/admin/calendario">
                  <Button className="w-full justify-between" variant="secondary">
                    <span className="flex items-center gap-3">
                      <Calendar className="w-5 h-5" />
                      Gestisci Calendario
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/admin/abbonamenti">
                  <Button className="w-full justify-between" variant="secondary">
                    <span className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5" />
                      Gestisci Abbonamenti
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/admin/corsi">
                  <Button className="w-full justify-between" variant="secondary">
                    <span className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5" />
                      Gestisci Corsi
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display tracking-wider">Accesso Rapido</CardTitle>
                <CardDescription>Altre sezioni</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/admin/esercizi">
                  <Button className="w-full justify-between" variant="outline">
                    <span className="flex items-center gap-3">
                      <Dumbbell className="w-5 h-5" />
                      Libreria Esercizi
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/admin/orari">
                  <Button className="w-full justify-between" variant="outline">
                    <span className="flex items-center gap-3">
                      <Clock className="w-5 h-5" />
                      Orari Palestra
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
