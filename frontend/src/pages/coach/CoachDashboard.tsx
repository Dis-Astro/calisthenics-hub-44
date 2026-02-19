import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Calendar,
  Dumbbell,
  ClipboardList,
  MessageSquare,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import CoachLayout from "@/components/coach/CoachLayout";

interface Stats {
  clientsCount: number;
  activePlansCount: number;
  todayAppointments: number;
  openReports: number;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface ErrorReport {
  id: string;
  title: string;
  status: string;
  reported_at: string;
  client_id: string;
}

const CoachDashboard = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    clientsCount: 0,
    activePlansCount: 0,
    todayAppointments: 0,
    openReports: 0,
  });
  const [myClients, setMyClients] = useState<Client[]>([]);
  const [recentReports, setRecentReports] = useState<ErrorReport[]>([]);

  useEffect(() => {
    if (profile?.user_id) {
      fetchData();
    }
  }, [profile?.user_id]);

  const fetchData = async () => {
    setLoading(true);
    const coachId = profile?.user_id;

    // Fetch my assigned clients
    const { data: assignments } = await supabase
      .from("coach_assignments")
      .select("client_id")
      .eq("coach_id", coachId);

    const clientIds = assignments?.map((a) => a.client_id) || [];

    // Fetch client profiles
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role, user_id")
        .in("user_id", clientIds);
      setMyClients(
        clients?.map((c) => ({
          id: c.user_id,
          first_name: c.first_name,
          last_name: c.last_name,
          role: c.role,
        })) || []
      );
    }

    // Count active workout plans
    const { count: plansCount } = await supabase
      .from("workout_plans")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", coachId)
      .eq("is_active", true);

    // Count today's appointments
    const today = new Date().toISOString().split("T")[0];
    const { count: appointmentsCount } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", coachId)
      .gte("start_time", today)
      .lt("start_time", today + "T23:59:59");

    // Fetch open reports
    const { data: reports, count: reportsCount } = await supabase
      .from("error_reports")
      .select("*", { count: "exact" })
      .eq("coach_id", coachId)
      .in("status", ["aperta", "in_lavorazione"])
      .order("reported_at", { ascending: false })
      .limit(5);

    setRecentReports(reports || []);
    setStats({
      clientsCount: clientIds.length,
      activePlansCount: plansCount || 0,
      todayAppointments: appointmentsCount || 0,
      openReports: reportsCount || 0,
    });
    setLoading(false);
  };

  const statCards = [
    { label: "Clienti Assegnati", value: stats.clientsCount, icon: Users, color: "text-primary" },
    { label: "Schede Attive", value: stats.activePlansCount, icon: Dumbbell, color: "text-green-500" },
    { label: "Appuntamenti Oggi", value: stats.todayAppointments, icon: Calendar, color: "text-blue-500" },
    { label: "Segnalazioni Aperte", value: stats.openReports, icon: MessageSquare, color: "text-destructive" },
  ];

  return (
    <CoachLayout title="PANNELLO COACH" icon={<ClipboardList className="w-6 h-6" />}>
      <div className="mb-8">
        <h2 className="text-2xl font-display tracking-wider mb-2">Ciao, {profile?.first_name}!</h2>
        <p className="text-muted-foreground">Gestisci i tuoi clienti e le loro schede di allenamento.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display tracking-wider flex items-center justify-between">
                  I Miei Clienti
                  <Link to="/coach/clienti">
                    <Button variant="ghost" size="sm"><ChevronRight className="w-4 h-4" /></Button>
                  </Link>
                </CardTitle>
                <CardDescription>{myClients.length} clienti assegnati</CardDescription>
              </CardHeader>
              <CardContent>
                {myClients.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nessun cliente assegnato</p>
                    <p className="text-sm">Appena assegnati, compariranno qui.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myClients.slice(0, 5).map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <span className="font-medium">{client.first_name} {client.last_name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{client.role.replace("_", " ")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display tracking-wider flex items-center justify-between">
                  Segnalazioni Recenti
                  <Link to="/coach/segnalazioni">
                    <Button variant="ghost" size="sm"><ChevronRight className="w-4 h-4" /></Button>
                  </Link>
                </CardTitle>
                <CardDescription>Feedback dai clienti</CardDescription>
              </CardHeader>
              <CardContent>
                {recentReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nessuna segnalazione</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentReports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <span className="font-medium truncate">{report.title}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            report.status === "aperta"
                              ? "bg-destructive/20 text-destructive"
                              : "bg-primary/20 text-primary"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </CoachLayout>
  );
};

export default CoachDashboard;
