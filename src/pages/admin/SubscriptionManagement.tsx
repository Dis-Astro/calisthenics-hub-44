import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Plus,
  Search,
  Loader2,
  Calendar,
  Euro,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Package,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AdminLayout from "@/components/admin/AdminLayout";
import ClientLink from "@/components/admin/ClientLink";
import type { Database } from "@/integrations/supabase/types";
import { format, addMonths, differenceInDays, isPast, startOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { useSearchParams } from "react-router-dom";
type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];
type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];

interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_months: number;
  plan_type: string;
  is_active: boolean;
}

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: SubscriptionStatus;
  notes: string | null;
  profiles?: Profile;
  membership_plans?: MembershipPlan;
}

interface Payment {
  id: string;
  user_id: string;
  subscription_id: string;
  amount: number;
  billing_month: string;
  payment_date: string;
  method: string;
  status: PaymentStatus;
  receipt_number: string | null;
  notes: string | null;
  profiles?: Profile;
}

interface LessonPackage {
  id: string;
  user_id: string;
  total_lessons: number;
  remaining_lessons: number;
  price: number;
  notes: string | null;
  created_at: string;
}

const statusLabels: Record<SubscriptionStatus, string> = {
  attivo: "Attivo",
  scaduto: "Scaduto",
  sospeso: "Sospeso",
  cancellato: "Cancellato"
};

const statusBadgeVariant: Record<SubscriptionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  attivo: "default",
  scaduto: "destructive",
  sospeso: "secondary",
  cancellato: "outline"
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  completato: "Completato",
  in_attesa: "In Attesa",
  fallito: "Fallito",
  rimborsato: "Rimborsato"
};
type UserRole = Database["public"]["Enums"]["user_role"];

const planTypeLabels: Record<string, string> = {
  admin: "Amministratore",
  coach: "Coach",
  cliente_palestra: "Cliente Palestra",
  cliente_coaching: "Cliente Coaching",
  cliente_corso: "Cliente Corso"
};

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const getCurrentMonthKey = () => format(new Date(), "yyyy-MM");

const normalizeMonthKey = (value?: string | null) =>
  value && MONTH_KEY_RE.test(value) ? value : getCurrentMonthKey();

const parseDateAtStartOfDay = (value?: string | null) => {
  const datePart = value?.slice(0, 10);
  const date = datePart ? new Date(`${datePart}T00:00:00`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const monthStartDate = (monthKey: string) =>
  startOfMonth(parseDateAtStartOfDay(`${normalizeMonthKey(monthKey)}-01`));

const dateToMonthKey = (dateValue?: string | null) =>
  format(parseDateAtStartOfDay(dateValue), "yyyy-MM");

const monthKeyToDateString = (monthKey: string) => `${normalizeMonthKey(monthKey)}-01`;

const formatMonthKey = (monthKey: string) =>
  format(monthStartDate(monthKey), "MMMM yyyy", { locale: it });

const compareMonthKeys = (a: string, b: string) =>
  monthStartDate(a).getTime() - monthStartDate(b).getTime();

const LEGACY_BILLING_MONTH_RE = /\[mese-saldato:(\d{4}-(?:0[1-9]|1[0-2]))\]/i;

const getLegacyBillingMonthKey = (notes?: string | null) =>
  notes?.match(LEGACY_BILLING_MONTH_RE)?.[1] || null;

const withLegacyBillingMonthNote = (notes: string | null, billingMonthKey: string) =>
  [notes?.trim(), `[mese-saldato:${billingMonthKey}]`].filter(Boolean).join("\n");

const getPaymentBillingMonthKey = (payment: Pick<Payment, "billing_month" | "payment_date" | "notes">) =>
  payment.billing_month ? dateToMonthKey(payment.billing_month) : getLegacyBillingMonthKey(payment.notes) || dateToMonthKey(payment.payment_date);

const getSubscriptionDueMonthKey = (subscription: Subscription) =>
  dateToMonthKey(subscription.end_date);

interface MonthOption {
  value: string;
  label: string;
}

const MonthSelector = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: MonthOption[];
  onChange: (value: string) => void;
}) => {
  const safeValue = normalizeMonthKey(value);
  const hasValue = options.some(option => option.value === safeValue);
  const visibleOptions = hasValue
    ? options
    : [...options, { value: safeValue, label: formatMonthKey(safeValue) }]
        .sort((a, b) => compareMonthKeys(a.value, b.value));

  return (
    <div className="flex w-full items-end gap-1 rounded-md border bg-background p-1 md:w-auto">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 flex-shrink-0"
        title="Mese precedente"
        onClick={() => onChange(format(addMonths(monthStartDate(safeValue), -1), "yyyy-MM"))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-0 flex-1 md:w-[190px]">
        <Label className="sr-only">Mese operativo</Label>
        <Select value={safeValue} onValueChange={onChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Seleziona mese" />
          </SelectTrigger>
          <SelectContent>
            {visibleOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 flex-shrink-0"
        title="Mese successivo"
        onClick={() => onChange(format(addMonths(monthStartDate(safeValue), 1), "yyyy-MM"))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 flex-shrink-0 px-3"
        onClick={() => onChange(getCurrentMonthKey())}
      >
        Oggi
      </Button>
    </div>
  );
};

const SubscriptionManagement = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("monthly");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("filter") || "tutti");
  const [billingMonth, setBillingMonth] = useState(format(new Date(), "yyyy-MM"));
  
  // Data states
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [allPlans, setAllPlans] = useState<MembershipPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [lessonPackages, setLessonPackages] = useState<LessonPackage[]>([]);
  const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  // Plan management states
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    price: "",
    duration_months: "1",
    plan_type: "cliente_palestra" as UserRole,
    is_active: true
  });

  // Dialog states
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [isPackagePaymentDialogOpen, setIsPackagePaymentDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form states
  const [newSubscription, setNewSubscription] = useState({
    user_id: "",
    plan_id: "",
    notes: ""
  });

  const [newPayment, setNewPayment] = useState({
    subscription_id: "",
    amount: "",
    billing_month: billingMonth,
    method: "contanti",
    notes: ""
  });

  const [newPackage, setNewPackage] = useState({
    user_id: "",
    total_lessons: "",
    price: "",
    notes: ""
  });

  const [newPackagePayment, setNewPackagePayment] = useState({
    package_id: "",
    amount: "",
    method: "contanti",
    notes: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch all data in parallel
    const [subsRes, plansRes, allPlansRes, paymentsRes, clientsRes, packagesRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("*, membership_plans(id, name, price, duration_months)")
        .order("end_date", { ascending: true }),
      supabase
        .from("membership_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true }),
      supabase
        .from("membership_plans")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("*")
        .order("payment_date", { ascending: false })
        .limit(1000),
      supabase
        .from("profiles")
        .select("*")
        .in("role", ["cliente_palestra", "cliente_coaching", "cliente_corso"])
        .order("last_name", { ascending: true }),
      supabase
        .from("lesson_packages")
        .select("*")
        .order("created_at", { ascending: false })
    ]);

    if (subsRes.error) console.error("Subscriptions error:", subsRes.error);
    if (plansRes.error) console.error("Plans error:", plansRes.error);
    if (paymentsRes.error) console.error("Payments error:", paymentsRes.error);
    if (clientsRes.error) console.error("Clients error:", clientsRes.error);
    if (packagesRes.error) console.error("Packages error:", packagesRes.error);

    // Create profiles map for manual join
    const profilesMap = new Map((clientsRes.data || []).map(p => [p.user_id, p]));
    
    // Add profiles to subscriptions manually and filter out deleted users
    const subscriptionsWithProfiles = (subsRes.data || [])
      .map(sub => ({
        ...sub,
        profiles: profilesMap.get(sub.user_id)
      }))
      .filter(sub => sub.profiles);
    
    // Add profiles to payments manually and filter out deleted users
    const paymentsWithProfiles = (paymentsRes.data || [])
      .map(pay => ({
        ...pay,
        profiles: profilesMap.get(pay.user_id)
      }))
      .filter(pay => pay.profiles);

    setSubscriptions(subscriptionsWithProfiles as unknown as Subscription[]);
    setPlans(plansRes.data || []);
    setAllPlans((allPlansRes.data || []) as MembershipPlan[]);
    setPayments(paymentsWithProfiles as unknown as Payment[]);
    setClients(clientsRes.data || []);
    setLessonPackages((packagesRes.data || []) as unknown as LessonPackage[]);
    setLoading(false);
  };

  // Plan management functions
  const openCreatePlanDialog = () => {
    setEditingPlan(null);
    setPlanForm({ name: "", description: "", price: "", duration_months: "1", plan_type: "cliente_palestra", is_active: true });
    setIsPlanDialogOpen(true);
  };

  const openEditPlanDialog = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description || "",
      price: plan.price.toString(),
      duration_months: plan.duration_months.toString(),
      plan_type: plan.plan_type as UserRole,
      is_active: plan.is_active
    });
    setIsPlanDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.name || !planForm.price) {
      toast({ title: "Errore", description: "Compila nome e prezzo", variant: "destructive" });
      return;
    }
    setSavingPlan(true);
    const planData = {
      name: planForm.name,
      description: planForm.description || null,
      price: parseFloat(planForm.price),
      duration_months: parseInt(planForm.duration_months),
      plan_type: planForm.plan_type,
      is_active: planForm.is_active
    };

    if (editingPlan) {
      const { error } = await supabase.from("membership_plans").update(planData).eq("id", editingPlan.id);
      if (error) {
        toast({ title: "Errore", description: "Impossibile aggiornare il piano", variant: "destructive" });
      } else {
        toast({ title: "Successo", description: "Piano aggiornato" });
        setIsPlanDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from("membership_plans").insert(planData);
      if (error) {
        toast({ title: "Errore", description: "Impossibile creare il piano", variant: "destructive" });
      } else {
        toast({ title: "Successo", description: "Piano creato" });
        setIsPlanDialogOpen(false);
        fetchData();
      }
    }
    setSavingPlan(false);
  };

  const handleDeletePlan = async () => {
    if (!deletePlanId) return;
    const { error } = await supabase.from("membership_plans").delete().eq("id", deletePlanId);
    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare il piano", variant: "destructive" });
    } else {
      toast({ title: "Eliminato", description: "Piano eliminato" });
      fetchData();
    }
    setDeletePlanId(null);
  };

  const createPackage = async () => {
    if (!newPackage.user_id || !newPackage.total_lessons || !newPackage.price) {
      toast({ title: "Errore", description: "Compila tutti i campi obbligatori", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("lesson_packages").insert({
      user_id: newPackage.user_id,
      total_lessons: parseInt(newPackage.total_lessons),
      remaining_lessons: parseInt(newPackage.total_lessons),
      price: parseFloat(newPackage.price),
      notes: newPackage.notes || null,
      created_by: profile?.user_id
    });

    if (error) {
      toast({ title: "Errore", description: "Impossibile creare il pacchetto", variant: "destructive" });
    } else {
      toast({ title: "Pacchetto creato", description: `${newPackage.total_lessons} lezioni assegnate` });
      setNewPackage({ user_id: "", total_lessons: "", price: "", notes: "" });
      setIsPackageDialogOpen(false);
      fetchData();
    }
    setCreating(false);
  };

  // Delete lesson package
  const deletePackage = async () => {
    if (!deletingPackageId) return;
    const { error } = await supabase.from("lesson_packages").delete().eq("id", deletingPackageId);
    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare il pacchetto", variant: "destructive" });
    } else {
      toast({ title: "Eliminato", description: "Pacchetto lezioni eliminato" });
      fetchData();
    }
    setDeletingPackageId(null);
  };

  // Delete payment
  const deletePayment = async () => {
    if (!deletingPaymentId) return;
    const { error } = await supabase.from("payments").delete().eq("id", deletingPaymentId);
    if (error) {
      toast({ title: "Errore", description: "Impossibile eliminare il pagamento", variant: "destructive" });
    } else {
      toast({ title: "Pagamento eliminato" });
      fetchData();
    }
    setDeletingPaymentId(null);
  };

  // Record package payment (standalone, not linked to subscription)
  const recordPackagePayment = async () => {
    if (!newPackagePayment.package_id || !newPackagePayment.amount) {
      toast({ title: "Errore", description: "Seleziona un pacchetto e inserisci l'importo", variant: "destructive" });
      return;
    }
    setCreating(true);
    const pkg = lessonPackages.find(p => p.id === newPackagePayment.package_id);
    if (!pkg) { setCreating(false); return; }

    // We need a subscription_id for payments table — create a dummy approach
    // Better: record as a note on the package + use a general payment log
    // For now, insert into payments with a special note
    // Actually the payments table requires subscription_id, so let's just track it as a note update on the package
    // and show it in the payments tab via a workaround
    
    // Update: payments table requires subscription_id (NOT NULL), so we can't use it directly for packages.
    // Instead, let's update the package notes with payment info
    const paymentNote = `Pagamento €${newPackagePayment.amount} (${newPackagePayment.method}) - ${format(new Date(), "dd/MM/yyyy")}${newPackagePayment.notes ? ` - ${newPackagePayment.notes}` : ''}`;
    const existingNotes = pkg.notes || '';
    const updatedNotes = existingNotes ? `${existingNotes}\n${paymentNote}` : paymentNote;

    const { error } = await supabase.from("lesson_packages").update({ notes: updatedNotes }).eq("id", pkg.id);
    if (error) {
      toast({ title: "Errore", description: "Impossibile registrare il pagamento", variant: "destructive" });
    } else {
      toast({ title: "Pagamento registrato", description: `€${newPackagePayment.amount} per pacchetto lezioni` });
      setNewPackagePayment({ package_id: "", amount: "", method: "contanti", notes: "" });
      setIsPackagePaymentDialogOpen(false);
      fetchData();
    }
    setCreating(false);
  };

  const createSubscription = async () => {
    if (!newSubscription.user_id || !newSubscription.plan_id) {
      toast({
        title: "Errore",
        description: "Seleziona un cliente e un piano",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    const selectedPlan = plans.find(p => p.id === newSubscription.plan_id);
    if (!selectedPlan) {
      setCreating(false);
      return;
    }

    const startDate = new Date();
    const endDate = addMonths(startDate, selectedPlan.duration_months);

    const { error } = await supabase
      .from("subscriptions")
      .insert({
        user_id: newSubscription.user_id,
        plan_id: newSubscription.plan_id,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        status: "attivo",
        notes: newSubscription.notes || null
      });

    if (error) {
      console.error("Subscription error:", error);
      toast({
        title: "Errore",
        description: "Impossibile creare l'abbonamento",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Abbonamento creato",
        description: "L'abbonamento è stato attivato con successo"
      });
      setNewSubscription({ user_id: "", plan_id: "", notes: "" });
      setIsSubscriptionDialogOpen(false);
      fetchData();
    }
    setCreating(false);
  };

  const recordPayment = async () => {
    const billingMonthKey = normalizeMonthKey(newPayment.billing_month);

    if (!newPayment.subscription_id || !newPayment.amount) {
      toast({
        title: "Errore",
        description: "Seleziona un abbonamento e inserisci l'importo",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    const subscription = subscriptions.find(s => s.id === newPayment.subscription_id);
    if (!subscription) {
      setCreating(false);
      return;
    }

    const amount = parseFloat(newPayment.amount);
    if (!amount || amount <= 0) {
      toast({ title: "Importo non valido", variant: "destructive" });
      setCreating(false);
      return;
    }

    const paymentPayload: PaymentInsert = {
      subscription_id: subscription.id,
      user_id: subscription.user_id,
      amount,
      payment_date: format(new Date(), "yyyy-MM-dd"),
      billing_month: monthKeyToDateString(billingMonthKey),
      method: newPayment.method,
      status: "completato" as PaymentStatus,
      notes: newPayment.notes || null,
      recorded_by: profile?.user_id || null,
    };

    let { error } = await supabase.from("payments").insert(paymentPayload);

    if (error && /billing_month|schema cache|column/i.test(error.message || "")) {
      const { billing_month: _billingMonth, ...legacyPayload } = paymentPayload;
      const legacyPaymentPayload: PaymentInsert = {
        ...legacyPayload,
        notes: withLegacyBillingMonthNote(legacyPayload.notes, billingMonthKey),
      };
      ({ error } = await supabase
        .from("payments")
        .insert(legacyPaymentPayload));
    }

    if (error) {
      console.error("Payment error:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile registrare il pagamento",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Pagamento registrato",
        description: `Incasso registrato per ${formatMonthKey(billingMonthKey)}`
      });
      setNewPayment({ subscription_id: "", amount: "", billing_month: selectedBillingMonth, method: "contanti", notes: "" });
      setIsPaymentDialogOpen(false);
      fetchData();
    }
    setCreating(false);
  };

  const getExpirationStatus = (endDate: string) => {
    const end = new Date(endDate);
    const daysLeft = differenceInDays(end, new Date());
    
    if (isPast(end)) {
      return { label: "Scaduto", variant: "destructive" as const, icon: AlertTriangle };
    } else if (daysLeft <= 7) {
      return { label: `${daysLeft}g rimasti`, variant: "secondary" as const, icon: Clock };
    } else if (daysLeft <= 30) {
      return { label: `${daysLeft}g rimasti`, variant: "outline" as const, icon: Calendar };
    }
    return { label: `${daysLeft}g rimasti`, variant: "default" as const, icon: CheckCircle };
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const clientName = sub.profiles 
      ? `${sub.profiles.first_name} ${sub.profiles.last_name}`.toLowerCase()
      : "utente eliminato";
    if (!clientName.includes(searchTerm.toLowerCase())) return false;
    
    if (statusFilter === "scaduti") {
      return isPast(new Date(sub.end_date));
    } else if (statusFilter === "in_scadenza") {
      const daysLeft = differenceInDays(new Date(sub.end_date), new Date());
      return daysLeft >= 0 && daysLeft <= 7;
    }
    return true;
  });

  const selectedBillingMonth = normalizeMonthKey(billingMonth);
  const selectedMonthLabel = formatMonthKey(selectedBillingMonth);

  const monthOptions = useMemo(() => {
    const keys = new Set<string>([
      selectedBillingMonth,
      getCurrentMonthKey(),
      ...subscriptions.flatMap(sub => [dateToMonthKey(sub.start_date), dateToMonthKey(sub.end_date)]),
      ...payments.map(getPaymentBillingMonthKey),
    ]);

    const sortedKeys = Array.from(keys)
      .filter(key => MONTH_KEY_RE.test(key))
      .sort(compareMonthKeys);

    const first = sortedKeys[0] || getCurrentMonthKey();
    const last = sortedKeys[sortedKeys.length - 1] || getCurrentMonthKey();
    const from = addMonths(monthStartDate(first), -2);
    const to = addMonths(monthStartDate(last), 6);
    const options: MonthOption[] = [];

    for (let cursor = from; cursor <= to && options.length < 96; cursor = addMonths(cursor, 1)) {
      const value = format(cursor, "yyyy-MM");
      options.push({ value, label: formatMonthKey(value) });
    }

    return options;
  }, [selectedBillingMonth, subscriptions, payments]);

  const handleBillingMonthChange = (value: string) => {
    setBillingMonth(normalizeMonthKey(value));
  };

  const isInSelectedMonth = (monthKey: string) => normalizeMonthKey(monthKey) === selectedBillingMonth;

  const filteredPayments = payments.filter(payment => isInSelectedMonth(getPaymentBillingMonthKey(payment)));
  const monthlyCompletedPayments = filteredPayments.filter(payment => payment.status === "completato");
  const monthlyRevenue = monthlyCompletedPayments.reduce((total, payment) => total + payment.amount, 0);
  const getCompletedAmountForBillingMonth = (subscriptionId: string, monthKey: string) =>
    payments
      .filter(payment =>
        payment.subscription_id === subscriptionId &&
        payment.status === "completato" &&
        getPaymentBillingMonthKey(payment) === normalizeMonthKey(monthKey)
      )
      .reduce((total, payment) => total + payment.amount, 0);
  const isSubscriptionMonthPaid = (sub: Subscription, monthKey: string) =>
    getCompletedAmountForBillingMonth(sub.id, monthKey) >= (sub.membership_plans?.price || 0);
  const monthlyDueSubscriptions = [...filteredSubscriptions]
    .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
  const monthlyUnpaidDueSubscriptions = monthlyDueSubscriptions.filter(sub =>
    !isSubscriptionMonthPaid(sub, selectedBillingMonth)
  );

  const selectedPaymentSubscription = subscriptions.find(s => s.id === newPayment.subscription_id);
  const selectedPaymentDueMonthKey = selectedPaymentSubscription
    ? getSubscriptionDueMonthKey(selectedPaymentSubscription)
    : selectedBillingMonth;
  const selectedPaymentMonthPaidAmount = selectedPaymentSubscription
    ? getCompletedAmountForBillingMonth(selectedPaymentSubscription.id, normalizeMonthKey(newPayment.billing_month))
    : 0;

  const paymentMonthOptions = useMemo(() => {
    const optionMap = new Map(monthOptions.map(option => [option.value, option]));
    [selectedBillingMonth, selectedPaymentDueMonthKey, normalizeMonthKey(newPayment.billing_month)].forEach(monthKey => {
      optionMap.set(monthKey, { value: monthKey, label: formatMonthKey(monthKey) });
    });

    return Array.from(optionMap.values()).sort((a, b) => compareMonthKeys(a.value, b.value));
  }, [monthOptions, selectedBillingMonth, selectedPaymentDueMonthKey, newPayment.billing_month]);

  const expiringCount = subscriptions.filter(s => {
    const daysLeft = differenceInDays(new Date(s.end_date), new Date());
    return daysLeft <= 7 && daysLeft >= 0;
  }).length;

  const expiredCount = subscriptions.filter(s => isPast(new Date(s.end_date))).length;

  return (
    <AdminLayout title="ABBONAMENTI" icon={<CreditCard className="w-6 h-6" />}>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Users className="w-10 h-10 text-primary" />
            <div>
              <p className="text-2xl font-display">{subscriptions.length}</p>
              <p className="text-sm text-muted-foreground">Abbonamenti Totali</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <CheckCircle className="w-10 h-10 text-primary" />
            <div>
              <p className="text-2xl font-display">{subscriptions.filter(s => s.status === "attivo" && !isPast(new Date(s.end_date))).length}</p>
              <p className="text-sm text-muted-foreground">Attivi</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <Clock className="w-10 h-10 text-muted-foreground" />
            <div>
              <p className="text-2xl font-display">{expiringCount}</p>
              <p className="text-sm text-muted-foreground">In Scadenza (7gg)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <AlertTriangle className="w-10 h-10 text-destructive" />
            <div>
              <p className="text-2xl font-display">{expiredCount}</p>
              <p className="text-sm text-muted-foreground">Scaduti</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
        <div className="flex flex-col gap-4 mb-6 justify-between min-w-0">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:inline-flex md:h-10 md:w-auto">
            <TabsTrigger value="monthly">Mensile</TabsTrigger>
            <TabsTrigger value="subscriptions">Abbonamenti</TabsTrigger>
            <TabsTrigger value="packages">Pacchetti Lezioni</TabsTrigger>
            <TabsTrigger value="payments">Pagamenti</TabsTrigger>
            <TabsTrigger value="plans">Piani</TabsTrigger>
          </TabsList>
          <div className="flex flex-col md:flex-row gap-2 min-w-0">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setSearchParams(v === "tutti" ? {} : { filter: v }); }}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Filtra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti</SelectItem>
                <SelectItem value="scaduti">Scaduti</SelectItem>
                <SelectItem value="in_scadenza">In Scadenza (7gg)</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-0 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cerca cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <MonthSelector
              value={selectedBillingMonth}
              options={monthOptions}
              onChange={handleBillingMonthChange}
            />
            <Dialog open={isSubscriptionDialogOpen} onOpenChange={setIsSubscriptionDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full md:w-auto"><Plus className="w-4 h-4" />Nuovo Abbonamento</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display tracking-wider">Nuovo Abbonamento</DialogTitle>
                  <DialogDescription>Crea un nuovo abbonamento per un cliente</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Select value={newSubscription.user_id} onValueChange={(v) => setNewSubscription({...newSubscription, user_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Seleziona cliente" /></SelectTrigger>
                      <SelectContent>{clients.map(c => <SelectItem key={c.user_id} value={c.user_id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Piano *</Label>
                    <Select value={newSubscription.plan_id} onValueChange={(v) => setNewSubscription({...newSubscription, plan_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Seleziona piano" /></SelectTrigger>
                      <SelectContent>{plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - €{p.price} ({p.duration_months} mesi)</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Note</Label>
                    <Input value={newSubscription.notes} onChange={(e) => setNewSubscription({...newSubscription, notes: e.target.value})} placeholder="Note opzionali" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsSubscriptionDialogOpen(false)}>Annulla</Button>
                  <Button onClick={createSubscription} disabled={creating}>{creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Crea Abbonamento</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2 w-full md:w-auto"><Euro className="w-4 h-4" />Registra Pagamento</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display tracking-wider">Registra Pagamento</DialogTitle>
                  <DialogDescription>Registra un nuovo pagamento per un abbonamento</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Abbonamento *</Label>
                    <Select value={newPayment.subscription_id} onValueChange={(v) => {
                      const sub = subscriptions.find(s => s.id === v);
                      setNewPayment({
                        ...newPayment,
                        subscription_id: v,
                        amount: sub?.membership_plans?.price?.toString() || "",
                        billing_month: sub ? getSubscriptionDueMonthKey(sub) : selectedBillingMonth,
                      });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Seleziona abbonamento" /></SelectTrigger>
                      <SelectContent>{subscriptions.map(s => <SelectItem key={s.id} value={s.id}>{s.profiles?.first_name} {s.profiles?.last_name} - {s.membership_plans?.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mese saldato *</Label>
                    <Select
                      value={normalizeMonthKey(newPayment.billing_month)}
                      onValueChange={(v) => setNewPayment({ ...newPayment, billing_month: normalizeMonthKey(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona mese" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMonthOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}{option.value === selectedPaymentDueMonthKey ? " - scadenza attuale" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPaymentSubscription && (
                      <div className="rounded-md border border-primary/20 bg-primary/5 p-2 text-xs text-muted-foreground">
                        <p>
                          Registri un incasso per {formatMonthKey(normalizeMonthKey(newPayment.billing_month))}.
                          {selectedPaymentMonthPaidAmount > 0 ? ` Gia' incassati: €${selectedPaymentMonthPaidAmount.toFixed(2)}.` : " Nessun incasso gia' registrato per questo mese."}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Importo (€) *</Label>
                    <Input type="number" value={newPayment.amount} onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Metodo di Pagamento</Label>
                    <Select value={newPayment.method} onValueChange={(v) => setNewPayment({...newPayment, method: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contanti">Contanti</SelectItem>
                        <SelectItem value="carta">Carta</SelectItem>
                        <SelectItem value="bonifico">Bonifico</SelectItem>
                        <SelectItem value="satispay">Satispay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Note</Label>
                    <Input value={newPayment.notes} onChange={(e) => setNewPayment({...newPayment, notes: e.target.value})} placeholder="Note opzionali" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Annulla</Button>
                  <Button onClick={recordPayment} disabled={creating}>{creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Registra Pagamento</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <TabsContent value="monthly">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Mese operativo</p>
                  <p className="text-xl font-display tracking-wider">{selectedMonthLabel}</p>
                </div>
                <p className="text-sm text-muted-foreground">Saldo per mese saldato</p>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <Euro className="w-9 h-9 text-primary" />
                  <div>
                    <p className="text-2xl font-display">€{monthlyRevenue.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Saldato per {selectedMonthLabel}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <CreditCard className="w-9 h-9 text-primary" />
                  <div>
                    <p className="text-2xl font-display">{monthlyCompletedPayments.length}</p>
                    <p className="text-sm text-muted-foreground">Pagamenti completati</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <Calendar className="w-9 h-9 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-display">{monthlyDueSubscriptions.length}</p>
                    <p className="text-sm text-muted-foreground">Clienti controllati</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <AlertTriangle className="w-9 h-9 text-destructive" />
                  <div>
                    <p className="text-2xl font-display">{monthlyUnpaidDueSubscriptions.length}</p>
                    <p className="text-sm text-muted-foreground">Non incassati</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display tracking-wider">Situazione incassi del mese</CardTitle>
                  <CardDescription>{monthlyDueSubscriptions.length} abbonamenti controllati per {selectedMonthLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : monthlyDueSubscriptions.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground"><Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" /><p>Nessun abbonamento da mostrare</p></div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Piano</TableHead>
                          <TableHead>Scadenza attuale</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead className="text-right">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyDueSubscriptions.map((sub) => {
                          const expStatus = getExpirationStatus(sub.end_date);
                          const hasCompletedPayment = isSubscriptionMonthPaid(sub, selectedBillingMonth);
                          const paidAmount = getCompletedAmountForBillingMonth(sub.id, selectedBillingMonth);
                          return (
                            <TableRow key={sub.id}>
                              <TableCell>
                                {sub.profiles ? (
                                  <ClientLink userId={sub.user_id}>{sub.profiles.first_name} {sub.profiles.last_name}</ClientLink>
                                ) : (
                                  <span className="text-muted-foreground italic">Utente eliminato</span>
                                )}
                              </TableCell>
                              <TableCell>{sub.membership_plans?.name || "Piano"}</TableCell>
                              <TableCell>{format(new Date(sub.end_date), "dd MMM yyyy", { locale: it })}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  <Badge variant={expStatus.variant} className="gap-1">
                                    <expStatus.icon className="w-3 h-3" />{expStatus.label}
                                  </Badge>
                                  {hasCompletedPayment && <Badge variant="outline">Pagato</Badge>}
                                  {paidAmount > 0 && !hasCompletedPayment && <Badge variant="outline">€{paidAmount.toFixed(2)}</Badge>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-8 gap-1"
                                    onClick={() => {
                                      setNewPayment({
                                        subscription_id: sub.id,
                                        amount: sub.membership_plans?.price?.toString() || "",
                                        billing_month: selectedBillingMonth,
                                        method: "contanti",
                                        notes: "",
                                      });
                                      setIsPaymentDialogOpen(true);
                                    }}
                                  >
                                    <Euro className="w-3 h-3" />
                                    Incassa
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-display tracking-wider">Incassi del mese</CardTitle>
                  <CardDescription>{filteredPayments.length} pagamenti collegati al mese saldato</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : filteredPayments.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground"><Euro className="w-10 h-10 mx-auto mb-3 opacity-50" /><p>Nessun pagamento nel mese selezionato</p></div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Importo</TableHead>
                          <TableHead>Stato</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{format(new Date(payment.payment_date), "dd MMM yyyy", { locale: it })}</TableCell>
                            <TableCell>
                              {payment.profiles ? (
                                <ClientLink userId={payment.user_id}>{payment.profiles.first_name} {payment.profiles.last_name}</ClientLink>
                              ) : (
                                <span className="text-muted-foreground italic">Utente eliminato</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">€{payment.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={payment.status === "completato" ? "default" : "secondary"}>
                                {paymentStatusLabels[payment.status]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-wider">Abbonamenti Attivi</CardTitle>
              <CardDescription>{filteredSubscriptions.length} abbonamenti trovati</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : filteredSubscriptions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Nessun abbonamento trovato</p></div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead><TableHead>Tipo</TableHead><TableHead>Piano</TableHead>
                        <TableHead>Inizio</TableHead><TableHead>Scadenza</TableHead><TableHead>Stato</TableHead><TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscriptions.map((sub) => {
                        const expStatus = getExpirationStatus(sub.end_date);
                        const roleLabel = sub.profiles?.role === 'cliente_coaching' ? 'Coaching' : sub.profiles?.role === 'cliente_corso' ? 'Corso' : 'Palestra';
                        const roleVariant: "default" | "secondary" | "outline" =
                          sub.profiles?.role === 'cliente_coaching' ? 'default' : sub.profiles?.role === 'cliente_corso' ? 'secondary' : 'outline';
                        return (
                          <TableRow key={sub.id}>
                            <TableCell>
                              {sub.profiles ? (
                                <ClientLink userId={sub.user_id}>{sub.profiles.first_name} {sub.profiles.last_name}</ClientLink>
                              ) : (
                                <span className="text-muted-foreground italic">Utente eliminato ({sub.user_id.slice(0, 8)})</span>
                              )}
                            </TableCell>
                            <TableCell><Badge variant={roleVariant}>{roleLabel}</Badge></TableCell>
                            <TableCell>{sub.membership_plans?.name}</TableCell>
                            <TableCell>{format(new Date(sub.start_date), "dd MMM yyyy", { locale: it })}</TableCell>
                            <TableCell>{format(new Date(sub.end_date), "dd MMM yyyy", { locale: it })}</TableCell>
                            <TableCell>
                              <Badge variant={expStatus.variant} className="gap-1">
                                <expStatus.icon className="w-3 h-3" />{expStatus.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                className="gap-1 h-8"
                                onClick={() => {
                                  setNewPayment({
                                    subscription_id: sub.id,
                                    amount: sub.membership_plans?.price?.toString() || "",
                                    billing_month: getSubscriptionDueMonthKey(sub),
                                    method: "contanti",
                                    notes: "",
                                  });
                                  setIsPaymentDialogOpen(true);
                                }}
                              >
                                <Euro className="w-3 h-3" />
                                Incassa
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pacchetti Lezioni Tab */}
        <TabsContent value="packages">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-display tracking-wider">Pacchetti Lezioni Private</CardTitle>
                  <CardDescription>{lessonPackages.length} pacchetti registrati</CardDescription>
                </div>
                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <Dialog open={isPackagePaymentDialogOpen} onOpenChange={setIsPackagePaymentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="gap-2 w-full md:w-auto"><Euro className="w-4 h-4" />Registra Pagamento</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-display tracking-wider">Pagamento Pacchetto</DialogTitle>
                      <DialogDescription>Registra un pagamento per un pacchetto lezioni</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Pacchetto *</Label>
                        <Select value={newPackagePayment.package_id} onValueChange={(v) => {
                          const pkg = lessonPackages.find(p => p.id === v);
                          setNewPackagePayment({ ...newPackagePayment, package_id: v, amount: pkg?.price?.toString() || "" });
                        }}>
                          <SelectTrigger><SelectValue placeholder="Seleziona pacchetto" /></SelectTrigger>
                          <SelectContent>
                            {lessonPackages.map(pkg => {
                              const client = clients.find(c => c.user_id === pkg.user_id);
                              return (
                                <SelectItem key={pkg.id} value={pkg.id}>
                                  {client ? `${client.first_name} ${client.last_name}` : "—"} — {pkg.total_lessons} lezioni (€{pkg.price})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Importo (€) *</Label>
                        <Input type="number" value={newPackagePayment.amount} onChange={(e) => setNewPackagePayment({...newPackagePayment, amount: e.target.value})} placeholder="0.00" />
                      </div>
                      <div className="space-y-2">
                        <Label>Metodo di Pagamento</Label>
                        <Select value={newPackagePayment.method} onValueChange={(v) => setNewPackagePayment({...newPackagePayment, method: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contanti">Contanti</SelectItem>
                            <SelectItem value="carta">Carta</SelectItem>
                            <SelectItem value="bonifico">Bonifico</SelectItem>
                            <SelectItem value="satispay">Satispay</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Note</Label>
                        <Input value={newPackagePayment.notes} onChange={(e) => setNewPackagePayment({...newPackagePayment, notes: e.target.value})} placeholder="Note opzionali" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsPackagePaymentDialogOpen(false)}>Annulla</Button>
                      <Button onClick={recordPackagePayment} disabled={creating}>{creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Registra</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={isPackageDialogOpen} onOpenChange={setIsPackageDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 w-full md:w-auto"><Plus className="w-4 h-4" />Nuovo Pacchetto</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-display tracking-wider">Nuovo Pacchetto Lezioni</DialogTitle>
                      <DialogDescription>Assegna un pacchetto di lezioni private a un cliente</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Cliente *</Label>
                        <Select value={newPackage.user_id} onValueChange={(v) => setNewPackage({...newPackage, user_id: v})}>
                          <SelectTrigger><SelectValue placeholder="Seleziona cliente" /></SelectTrigger>
                          <SelectContent>{clients.map(c => <SelectItem key={c.user_id} value={c.user_id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Numero Lezioni *</Label>
                          <Input type="number" value={newPackage.total_lessons} onChange={(e) => setNewPackage({...newPackage, total_lessons: e.target.value})} placeholder="Es. 10" min="1" />
                        </div>
                        <div className="space-y-2">
                          <Label>Prezzo Pacchetto (€) *</Label>
                          <Input type="number" value={newPackage.price} onChange={(e) => setNewPackage({...newPackage, price: e.target.value})} placeholder="0.00" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Note</Label>
                        <Input value={newPackage.notes} onChange={(e) => setNewPackage({...newPackage, notes: e.target.value})} placeholder="Note opzionali..." />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsPackageDialogOpen(false)}>Annulla</Button>
                      <Button onClick={createPackage} disabled={creating}>{creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Crea Pacchetto</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : lessonPackages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun pacchetto lezioni</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Lezioni Totali</TableHead>
                        <TableHead>Rimanenti</TableHead>
                        <TableHead>Usate</TableHead>
                        <TableHead>Prezzo</TableHead>
                        <TableHead>Creato</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lessonPackages.map((pkg) => {
                        const client = clients.find(c => c.user_id === pkg.user_id);
                        const usedLessons = pkg.total_lessons - pkg.remaining_lessons;
                        return (
                          <TableRow key={pkg.id}>
                            <TableCell>
                              {client ? (
                                <ClientLink userId={client.user_id}>{client.first_name} {client.last_name}</ClientLink>
                              ) : "—"}
                            </TableCell>
                            <TableCell>{pkg.total_lessons}</TableCell>
                            <TableCell>
                              <Badge variant={pkg.remaining_lessons === 0 ? "destructive" : pkg.remaining_lessons <= 2 ? "secondary" : "default"}>
                                {pkg.remaining_lessons}
                              </Badge>
                            </TableCell>
                            <TableCell>{usedLessons}</TableCell>
                            <TableCell>€{pkg.price}</TableCell>
                            <TableCell>{format(new Date(pkg.created_at), "dd MMM yyyy", { locale: it })}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={pkg.notes || ''}>{pkg.notes || '—'}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => setDeletingPackageId(pkg.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="font-display tracking-wider">Storico Pagamenti</CardTitle>
                <CardDescription>{filteredPayments.length} pagamenti per {selectedMonthLabel}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit">Mese saldato</Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Euro className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Nessun pagamento nel mese selezionato</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Incasso</TableHead><TableHead>Mese saldato</TableHead><TableHead>Cliente</TableHead>
                        <TableHead>Importo</TableHead><TableHead>Metodo</TableHead><TableHead>Stato</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => {
                        return (
                          <TableRow key={payment.id}>
                            <TableCell>{format(new Date(payment.payment_date), "dd MMM yyyy", { locale: it })}</TableCell>
                            <TableCell>{formatMonthKey(getPaymentBillingMonthKey(payment))}</TableCell>
                            <TableCell>
                              {payment.profiles ? (
                                <ClientLink userId={payment.user_id}>{payment.profiles.first_name} {payment.profiles.last_name}</ClientLink>
                              ) : (
                                <span className="text-muted-foreground italic">Utente eliminato</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">€{payment.amount.toFixed(2)}</TableCell>
                            <TableCell className="capitalize">{payment.method}</TableCell>
                            <TableCell>
                              <Badge variant={payment.status === "completato" ? "default" : "secondary"}>
                                {paymentStatusLabels[payment.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-destructive hover:text-destructive"
                                  title="Elimina pagamento"
                                  onClick={() => setDeletingPaymentId(payment.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="font-display tracking-wider">Gestione Piani</CardTitle>
                <CardDescription>{allPlans.length} piani configurati</CardDescription>
              </div>
              <Button className="gap-2 w-full md:w-auto" onClick={openCreatePlanDialog}>
                <Plus className="w-4 h-4" />
                Nuovo Piano
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : allPlans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun piano configurato</p>
                  <Button variant="outline" className="mt-4 gap-2" onClick={openCreatePlanDialog}>
                    <Plus className="w-4 h-4" />Crea il primo piano
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Prezzo</TableHead>
                        <TableHead>Durata</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPlans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium">{plan.name}</TableCell>
                          <TableCell><span className="flex items-center gap-1"><Euro className="w-4 h-4" />{plan.price}</span></TableCell>
                          <TableCell>{plan.duration_months} {plan.duration_months === 1 ? "mese" : "mesi"}</TableCell>
                          <TableCell><Badge variant="outline">{planTypeLabels[plan.plan_type] || plan.plan_type}</Badge></TableCell>
                          <TableCell><Badge variant={plan.is_active ? "default" : "secondary"}>{plan.is_active ? "Attivo" : "Inattivo"}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEditPlanDialog(plan)}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeletePlanId(plan.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plan Create/Edit Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display tracking-wider">
              {editingPlan ? "Modifica Piano" : "Nuovo Piano"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan ? "Modifica i dettagli del piano" : "Crea un nuovo piano di abbonamento"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="Es. Abbonamento Mensile" />
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Input value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} placeholder="Descrizione opzionale..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prezzo (€) *</Label>
                <Input type="number" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Durata (mesi)</Label>
                <Select value={planForm.duration_months} onValueChange={(v) => setPlanForm({ ...planForm, duration_months: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mese</SelectItem>
                    <SelectItem value="2">2 mesi</SelectItem>
                    <SelectItem value="3">3 mesi</SelectItem>
                    <SelectItem value="6">6 mesi</SelectItem>
                    <SelectItem value="12">12 mesi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo di Piano</Label>
              <Select value={planForm.plan_type} onValueChange={(v: UserRole) => setPlanForm({ ...planForm, plan_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente_palestra">Cliente Palestra</SelectItem>
                  <SelectItem value="cliente_coaching">Cliente Coaching</SelectItem>
                  <SelectItem value="cliente_corso">Cliente Corso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Piano Attivo</Label>
              <Switch checked={planForm.is_active} onCheckedChange={(checked) => setPlanForm({ ...planForm, is_active: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSavePlan} disabled={savingPlan}>
              {savingPlan && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingPlan ? "Salva" : "Crea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Confirmation */}
      <AlertDialog open={!!deletePlanId} onOpenChange={() => setDeletePlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il piano?</AlertDialogTitle>
            <AlertDialogDescription>Questa azione non può essere annullata.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Package Confirmation */}
      <AlertDialog open={!!deletingPackageId} onOpenChange={() => setDeletingPackageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il pacchetto lezioni?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Il pacchetto e il suo storico verranno rimossi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={deletePackage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Delete Payment Confirmation */}
      <AlertDialog open={!!deletingPaymentId} onOpenChange={() => setDeletingPaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              L'operazione è irreversibile. Da usare in caso di errore di registrazione.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={deletePayment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default SubscriptionManagement;
