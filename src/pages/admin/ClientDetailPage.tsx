import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  ArrowLeft, 
  Loader2, 
  CreditCard, 
  Dumbbell, 
  Calendar,
  Phone,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  Euro,
  FileText,
  Plus
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import CreateWorkoutPlanDialog from "@/components/admin/CreateWorkoutPlanDialog";
import EditWorkoutPlanDialog from "@/components/admin/EditWorkoutPlanDialog";
import WorkoutPlanViewDialog from "@/components/admin/WorkoutPlanViewDialog";
import WorkoutPlanCard from "@/components/admin/WorkoutPlanCard";
import CoachAssignmentManager from "@/components/admin/CoachAssignmentManager";
import type { Database } from "@/integrations/supabase/types";
import { format, differenceInDays, isPast } from "date-fns";
import { it } from "date-fns/locale";

type UserRole = Database["public"]["Enums"]["user_role"];
type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  fiscal_code: string | null;
  emergency_contact: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: SubscriptionStatus;
  notes: string | null;
  membership_plans?: {
    id: string;
    name: string;
    price: number;
    duration_months: number;
  };
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  method: string;
  status: string;
  notes: string | null;
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const roleLabels: Record<UserRole, string> = {
  admin: "Amministratore",
  coach: "Coach",
  cliente_palestra: "Cliente Palestra",
  cliente_coaching: "Cliente Coaching"
};

const ClientDetailPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Dialog state for creating/editing workout plan
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [editPlanId, setEditPlanId] = useState<string | null>(null);
  const [viewPlanId, setViewPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchClientData();
    }
  }, [userId]);

  const fetchClientData = async () => {
    setLoading(true);

    // Fetch profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      toast({ title: "Errore", description: "Cliente non trovato", variant: "destructive" });
      navigate("/admin/utenti");
      return;
    }

    setProfile(profileData);

    // Fetch related data in parallel
    const [subsRes, paymentsRes, plansRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("*, membership_plans(id, name, price, duration_months)")
        .eq("user_id", userId)
        .order("end_date", { ascending: false }),
      supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .order("payment_date", { ascending: false }),
      supabase
        .from("workout_plans")
        .select("*")
        .eq("client_id", userId)
        .order("created_at", { ascending: false })
    ]);

    setSubscriptions((subsRes.data as unknown as Subscription[]) || []);
    setPayments(paymentsRes.data || []);
    setWorkoutPlans(plansRes.data || []);
    setLoading(false);
  };

  const getSubscriptionStatus = (sub: Subscription) => {
    const daysLeft = differenceInDays(new Date(sub.end_date), new Date());
    
    if (isPast(new Date(sub.end_date))) {
      return { label: "Scaduto", variant: "destructive" as const, icon: AlertTriangle };
    } else if (daysLeft <= 7) {
      return { label: `${daysLeft}g rimasti`, variant: "secondary" as const, icon: Clock };
    }
    return { label: "Attivo", variant: "default" as const, icon: CheckCircle };
  };

  const activeSubscription = subscriptions.find(s => 
    s.status === "attivo" && !isPast(new Date(s.end_date))
  );

  const totalPayments = payments
    .filter(p => p.status === "completato")
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <AdminLayout title="DETTAGLIO CLIENTE" icon={<User className="w-6 h-6" />} showBackLink>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <AdminLayout title="DETTAGLIO CLIENTE" icon={<User className="w-6 h-6" />} showBackLink>
      <Button 
        variant="ghost" 
        onClick={() => navigate("/admin/utenti")} 
        className="mb-4 gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Torna all'elenco utenti
      </Button>

      {/* Header con info cliente */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-12 h-12 text-primary" />
            </div>
            
            {/* Info principale */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-display tracking-wider">
                  {profile.first_name} {profile.last_name}
                </h2>
                <Badge variant="outline">{roleLabels[profile.role]}</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                {profile.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {profile.phone}
                  </div>
                )}
                {profile.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {profile.address}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Iscritto dal {format(new Date(profile.created_at), "dd MMM yyyy", { locale: it })}
                </div>
              </div>
            </div>

            {/* Stats rapide */}
            <div className="flex gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-display text-primary">
                  {activeSubscription ? "✓" : "✗"}
                </p>
                <p className="text-xs text-muted-foreground">Abbonamento</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-display">{workoutPlans.length}</p>
                <p className="text-xs text-muted-foreground">Schede</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-display">€{totalPayments}</p>
                <p className="text-xs text-muted-foreground">Pagato</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs con dettagli */}
      <Tabs defaultValue="subscription">
        <TabsList className="mb-4">
          <TabsTrigger value="subscription" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Abbonamento
          </TabsTrigger>
          <TabsTrigger value="workout" className="gap-2">
            <Dumbbell className="w-4 h-4" />
            Schede
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <Euro className="w-4 h-4" />
            Pagamenti
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <FileText className="w-4 h-4" />
            Anagrafica
          </TabsTrigger>
          <TabsTrigger value="coach" className="gap-2">
            <User className="w-4 h-4" />
            Coach
          </TabsTrigger>
        </TabsList>
        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-wider">Abbonamenti</CardTitle>
              <CardDescription>Storico abbonamenti del cliente</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun abbonamento registrato</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Piano</TableHead>
                      <TableHead>Inizio</TableHead>
                      <TableHead>Fine</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Prezzo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => {
                      const status = getSubscriptionStatus(sub);
                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">
                            {sub.membership_plans?.name || "Piano sconosciuto"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(sub.start_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            {format(new Date(sub.end_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="gap-1">
                              <status.icon className="w-3 h-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            €{sub.membership_plans?.price || 0}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Schede Allenamento */}
        <TabsContent value="workout">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display tracking-wider">Schede di Allenamento</CardTitle>
                <CardDescription>Schede create per questo cliente</CardDescription>
              </div>
              <Button className="gap-2" onClick={() => setIsCreatePlanOpen(true)}>
                <Plus className="w-4 h-4" />
                Nuova Scheda
              </Button>
            </CardHeader>
            <CardContent>
              {workoutPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuna scheda assegnata</p>
                  <Button 
                    variant="outline" 
                    className="mt-4 gap-2"
                    onClick={() => setIsCreatePlanOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Crea la prima scheda
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {workoutPlans.map((plan) => (
                    <WorkoutPlanCard
                      key={plan.id}
                      plan={plan}
                      onEdit={(planId) => setEditPlanId(planId)}
                      onView={(planId) => setViewPlanId(planId)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Pagamenti */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-wider">Storico Pagamenti</CardTitle>
              <CardDescription>Tutti i pagamenti registrati</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Euro className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun pagamento registrato</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Importo</TableHead>
                      <TableHead>Metodo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.payment_date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">€{payment.amount}</TableCell>
                        <TableCell className="capitalize">{payment.method}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "completato" ? "default" : "secondary"}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Anagrafica */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-wider">Dati Anagrafici</CardTitle>
              <CardDescription>Informazioni personali del cliente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Nome completo</p>
                  <p className="font-medium">{profile.first_name} {profile.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefono</p>
                  <p className="font-medium">{profile.phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Indirizzo</p>
                  <p className="font-medium">{profile.address || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data di nascita</p>
                  <p className="font-medium">
                    {profile.date_of_birth 
                      ? format(new Date(profile.date_of_birth), "dd/MM/yyyy")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Codice Fiscale</p>
                  <p className="font-medium">{profile.fiscal_code || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contatto di emergenza</p>
                  <p className="font-medium">{profile.emergency_contact || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Coach */}
        <TabsContent value="coach">
          <CoachAssignmentManager 
            clientId={profile.user_id} 
            clientRole={profile.role}
            onUpdate={fetchClientData}
          />
        </TabsContent>
      </Tabs>

      {/* Create Workout Plan Dialog */}
      {profile && (
        <CreateWorkoutPlanDialog
          open={isCreatePlanOpen}
          onOpenChange={setIsCreatePlanOpen}
          clientId={profile.user_id}
          clientName={`${profile.first_name} ${profile.last_name}`}
          onSuccess={fetchClientData}
        />
      )}

      {/* Edit Workout Plan Dialog */}
      <EditWorkoutPlanDialog
        planId={editPlanId}
        open={!!editPlanId}
        onOpenChange={(open) => !open && setEditPlanId(null)}
        onSuccess={fetchClientData}
      />

      {/* View Workout Plan Dialog */}
      <WorkoutPlanViewDialog
        planId={viewPlanId}
        open={!!viewPlanId}
        onOpenChange={(open) => !open && setViewPlanId(null)}
      />
    </AdminLayout>
  );
};

export default ClientDetailPage;
