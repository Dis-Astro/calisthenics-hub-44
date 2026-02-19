import { useEffect, useState } from "react";
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
  BookOpen,
  ChevronRight,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";

interface Stats {
  totalClients: number;
  expiringSubscriptions: number;
  todayAppointments: number;
  activeCourses: number;
}

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    expiringSubscriptions: 0,
    todayAppointments: 0,
    activeCourses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [clientsRes, expiringRes, appointmentsRes, coursesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .in("role", ["cliente_palestra", "cliente_coaching"]),
      supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "attivo")
        .lte("end_date", weekFromNow),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("start_time", today)
        .lt("start_time", today + "T23:59:59"),
      supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
    ]);

    setStats({
      totalClients: clientsRes.count || 0,
      expiringSubscriptions: expiringRes.count || 0,
      todayAppointments: appointmentsRes.count || 0,
      activeCourses: coursesRes.count || 0,
    });
    setLoading(false);
  };

  const statCards = [
    {
      label: "Clienti Attivi",
      value: stats.totalClients,
      icon: Users,
      color: "text-primary",
      href: "/admin/utenti",
    },
    {
      label: "Abbonamenti in Scadenza",
      value: stats.expiringSubscriptions,
      icon: CreditCard,
      color: "text-destructive",
      href: "/admin/abbonamenti",
    },
    {
      label: "Appuntamenti Oggi",
      value: stats.todayAppointments,
      icon: Calendar,
      color: "text-green-500",
      href: "/admin/calendario",
    },
    {
      label: "Corsi Attivi",
      value: stats.activeCourses,
      icon: BookOpen,
      color: "text-blue-500",
      href: "/admin/corsi",
    },
  ];

  return (
    <AdminLayout title="PANNELLO ADMIN" icon={<BarChart3 className="w-6 h-6" />}>
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
          <Link
            key={stat.label}
            to={stat.href}
            aria-label={`Vai a ${stat.label}`}
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
          >
            <Card className="bg-card border-border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-display tracking-wider mt-1">
                      {loading ? "—" : stat.value}
                    </p>
                  </div>
                  <stat.icon className={`w-10 h-10 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          </Link>
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
            <Link to="/admin/orari">
              <Button className="w-full justify-between" variant="outline">
                <span className="flex items-center gap-3">
                  <Clock className="w-5 h-5" />
                  Orari Palestra
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/admin/segnalazioni">
              <Button className="w-full justify-between" variant="outline">
                <span className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5" />
                  Segnalazioni
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
