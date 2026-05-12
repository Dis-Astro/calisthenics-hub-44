import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Euro,
  Plus,
  Trash2,
  RefreshCw,
  LogOut,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Loader2,
} from "lucide-react";
import { format, addMonths, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";

interface Plan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  plan_type: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: string;
  membership_plans?: Plan;
}

interface Payment {
  id: string;
  subscription_id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  method: string;
  notes: string | null;
}

interface Client {
  user_id: string;
  first_name: string;
  last_name: string;
  role: string;
}

const methodLabels: Record<string, string> = {
  contanti: "Contanti",
  pos: "POS",
  bonifico: "Bonifico",
  satispay: "Satispay",
};

const SegretariaDashboard = () => {
  const { signOut, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Dialog: new/change subscription
  const [subDialog, setSubDialog] = useState<{
    open: boolean;
    clientId: string;
    clientName: string;
    currentSubId?: string;
  }>({ open: false, clientId: "", clientName: "" });
  const [subForm, setSubForm] = useState({ plan_id: "", start_date: format(new Date(), "yyyy-MM-dd") });
  const [savingSub, setSavingSub] = useState(false);

  // Dialog: register payment
  const [payDialog, setPayDialog] = useState<{
    open: boolean;
    subId: string;
    userId: string;
    clientName: string;
    planPrice: number;
    alreadyPaid: number;
  }>({ open: false, subId: "", userId: "", clientName: "", planPrice: 0, alreadyPaid: 0 });
  const [payForm, setPayForm] = useState({ amount: "", method: "contanti", notes: "" });
  const [savingPay, setSavingPay] = useState(false);

  // Delete payment confirm
  const [deletePayId, setDeletePayId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [cRes, sRes, pRes, plRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, first_name, last_name, role")
        .in("role", ["cliente_palestra", "cliente_coaching", "cliente_corso"])
        .order("last_name"),
      supabase
        .from("subscriptions")
        .select("*, membership_plans(id, name, price, duration_months, plan_type)")
        .order("end_date", { ascending: false }),
      supabase
        .from("payments")
        .select("*")
        .order("payment_date", { ascending: false }),
      supabase.from("membership_plans").select("*").eq("is_active", true).order("price"),
    ]);

    if (cRes.data) setClients(cRes.data as Client[]);
    if (sRes.data) setSubs(sRes.data as unknown as Subscription[]);
    if (pRes.data) setPayments(pRes.data as Payment[]);
    if (plRes.data) setPlans(plRes.data as Plan[]);
    setLoading(false);
  };

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q)
    );
  }, [clients, search]);

  // Get the most recent subscription for a client
  const getActiveSub = (userId: string): Subscription | undefined => {
    const userSubs = subs.filter((s) => s.user_id === userId);
    // Prefer status 'attivo', otherwise most recent end_date
    return (
      userSubs.find((s) => s.status === "attivo") ||
      userSubs.sort((a, b) => b.end_date.localeCompare(a.end_date))[0]
    );
  };

  const getSubPayments = (subId: string) => payments.filter((p) => p.subscription_id === subId);

  const toggleExpand = (userId: string) => {
    const next = new Set(expanded);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setExpanded(next);
  };

  // ---- Subscription create/change ----
  const openSubDialog = (clientId: string, clientName: string, currentSubId?: string) => {
    setSubForm({ plan_id: "", start_date: format(new Date(), "yyyy-MM-dd") });
    setSubDialog({ open: true, clientId, clientName, currentSubId });
  };

  const saveSubscription = async () => {
    if (!subForm.plan_id) {
      toast({ title: "Seleziona un piano", variant: "destructive" });
      return;
    }
    const plan = plans.find((p) => p.id === subForm.plan_id);
    if (!plan) return;
    setSavingSub(true);

    const start = new Date(subForm.start_date);
    const end = addMonths(start, plan.duration_months);

    // If changing plan: cancel current sub
    if (subDialog.currentSubId) {
      await supabase
        .from("subscriptions")
        .update({ status: "cancellato" })
        .eq("id", subDialog.currentSubId);
    }

    const { error } = await supabase.from("subscriptions").insert({
      user_id: subDialog.clientId,
      plan_id: subForm.plan_id,
      start_date: format(start, "yyyy-MM-dd"),
      end_date: format(end, "yyyy-MM-dd"),
      status: "attivo",
    });

    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: subDialog.currentSubId ? "Abbonamento cambiato" : "Abbonamento creato",
        description: `${plan.name} fino al ${format(end, "dd MMM yyyy", { locale: it })}`,
      });
      setSubDialog({ ...subDialog, open: false });
      fetchAll();
    }
    setSavingSub(false);
  };

  const renewSubscription = async (sub: Subscription) => {
    if (!sub.membership_plans) return;
    const newEnd = addMonths(new Date(sub.end_date), sub.membership_plans.duration_months);
    const { error } = await supabase
      .from("subscriptions")
      .update({ end_date: format(newEnd, "yyyy-MM-dd"), status: "attivo" })
      .eq("id", sub.id);
    if (error) {
      toast({ title: "Errore rinnovo", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rinnovato", description: `Fino al ${format(newEnd, "dd MMM yyyy", { locale: it })}` });
      fetchAll();
    }
  };

  // ---- Payment create/delete ----
  const openPayDialog = (sub: Subscription, clientName: string) => {
    const paid = getSubPayments(sub.id).reduce((sum, p) => sum + Number(p.amount), 0);
    const price = sub.membership_plans?.price ?? 0;
    const remaining = Math.max(price - paid, 0);
    setPayForm({
      amount: remaining > 0 ? remaining.toFixed(2) : "",
      method: "contanti",
      notes: "",
    });
    setPayDialog({
      open: true,
      subId: sub.id,
      userId: sub.user_id,
      clientName,
      planPrice: price,
      alreadyPaid: paid,
    });
  };

  const savePayment = async () => {
    const amt = parseFloat(payForm.amount);
    if (!amt || amt <= 0) {
      toast({ title: "Importo non valido", variant: "destructive" });
      return;
    }
    setSavingPay(true);
    const { error } = await supabase.from("payments").insert({
      subscription_id: payDialog.subId,
      user_id: payDialog.userId,
      amount: amt,
      payment_date: format(new Date(), "yyyy-MM-dd"),
      method: payForm.method,
      status: "completato",
      notes: payForm.notes || null,
      recorded_by: profile?.user_id,
    });
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Incasso registrato", description: `€${amt.toFixed(2)} (${methodLabels[payForm.method]})` });
      setPayDialog({ ...payDialog, open: false });
      fetchAll();
    }
    setSavingPay(false);
  };

  const confirmDeletePayment = async () => {
    if (!deletePayId) return;
    const { error } = await supabase.from("payments").delete().eq("id", deletePayId);
    if (error) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pagamento cancellato" });
      fetchAll();
    }
    setDeletePayId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display tracking-wider">SEGRETERIA</h1>
            <p className="text-xs text-muted-foreground">
              {profile?.first_name} {profile?.last_name}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Esci
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* Client list */}
        <div className="space-y-2">
          {filteredClients.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nessun cliente trovato</CardContent></Card>
          )}

          {filteredClients.map((client) => {
            const fullName = `${client.first_name} ${client.last_name}`;
            const sub = getActiveSub(client.user_id);
            const isOpen = expanded.has(client.user_id);

            const planPrice = sub?.membership_plans?.price ?? 0;
            const subPayments = sub ? getSubPayments(sub.id) : [];
            const paid = subPayments.reduce((s, p) => s + Number(p.amount), 0);
            const remaining = Math.max(planPrice - paid, 0);
            const fullyPaid = sub && remaining === 0 && planPrice > 0;

            const daysLeft = sub ? differenceInDays(new Date(sub.end_date), new Date()) : null;
            const expired = sub ? daysLeft! < 0 : false;
            const expiringSoon = sub ? daysLeft! >= 0 && daysLeft! <= 7 : false;

            return (
              <Card key={client.user_id} className="overflow-hidden">
                <button
                  onClick={() => toggleExpand(client.user_id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 text-left"
                >
                  {isOpen ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{fullName}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {sub ? sub.membership_plans?.name : "Nessun abbonamento"}
                    </div>
                  </div>
                  {sub ? (
                    <div className="flex items-center gap-2 shrink-0">
                      {expired ? (
                        <Badge variant="destructive">Scaduto</Badge>
                      ) : expiringSoon ? (
                        <Badge className="bg-amber-500 hover:bg-amber-500/80 text-black">{daysLeft}g</Badge>
                      ) : (
                        <Badge variant="default">{daysLeft}g</Badge>
                      )}
                      {fullyPaid ? (
                        <Badge variant="outline" className="border-green-500 text-green-500">Saldato</Badge>
                      ) : planPrice > 0 ? (
                        <Badge variant="outline" className="border-amber-500 text-amber-500">
                          €{paid.toFixed(0)}/{planPrice.toFixed(0)}
                        </Badge>
                      ) : null}
                    </div>
                  ) : (
                    <Badge variant="outline">—</Badge>
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-4">
                    {sub ? (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">Inizio</div>
                            <div>{format(new Date(sub.start_date), "dd/MM/yyyy")}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Scadenza</div>
                            <div>{format(new Date(sub.end_date), "dd/MM/yyyy")}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Prezzo</div>
                            <div>€{planPrice.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Da incassare</div>
                            <div className={remaining > 0 ? "text-amber-500 font-semibold" : "text-green-500 font-semibold"}>
                              €{remaining.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => openPayDialog(sub, fullName)} className="gap-2">
                            <Euro className="w-4 h-4" /> Registra incasso
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => renewSubscription(sub)} className="gap-2">
                            <RefreshCw className="w-4 h-4" /> Rinnova
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openSubDialog(client.user_id, fullName, sub.id)} className="gap-2">
                            <CreditCard className="w-4 h-4" /> Cambia abbonamento
                          </Button>
                        </div>

                        {/* Payments list */}
                        {subPayments.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Incassi</div>
                            {subPayments.map((p) => (
                              <div key={p.id} className="flex items-center justify-between text-sm bg-card border border-border rounded px-3 py-2">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <span className="font-semibold tabular-nums">€{Number(p.amount).toFixed(2)}</span>
                                  <Badge variant="secondary" className="text-xs">{methodLabels[p.method] ?? p.method}</Badge>
                                  <span className="text-muted-foreground text-xs">{format(new Date(p.payment_date), "dd/MM/yyyy")}</span>
                                  {p.notes && <span className="text-muted-foreground text-xs truncate">— {p.notes}</span>}
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => setDeletePayId(p.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-muted-foreground">Nessun abbonamento attivo</div>
                        <Button size="sm" onClick={() => openSubDialog(client.user_id, fullName)} className="gap-2">
                          <Plus className="w-4 h-4" /> Nuovo abbonamento
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </main>

      {/* Subscription dialog */}
      <Dialog open={subDialog.open} onOpenChange={(open) => setSubDialog({ ...subDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {subDialog.currentSubId ? "Cambia abbonamento" : "Nuovo abbonamento"}
            </DialogTitle>
            <DialogDescription>{subDialog.clientName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Piano *</Label>
              <Select value={subForm.plan_id} onValueChange={(v) => setSubForm({ ...subForm, plan_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleziona piano" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — €{p.price}/{p.duration_months}m
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data inizio</Label>
              <Input
                type="date"
                value={subForm.start_date}
                onChange={(e) => setSubForm({ ...subForm, start_date: e.target.value })}
              />
            </div>
            {subDialog.currentSubId && (
              <p className="text-xs text-muted-foreground">
                L'abbonamento attuale verrà cancellato e sostituito da quello nuovo.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialog({ ...subDialog, open: false })}>
              Annulla
            </Button>
            <Button onClick={saveSubscription} disabled={savingSub}>
              {savingSub && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={payDialog.open} onOpenChange={(open) => setPayDialog({ ...payDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registra incasso</DialogTitle>
            <DialogDescription>{payDialog.clientName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 rounded p-3">
              <div>
                <div className="text-xs text-muted-foreground">Prezzo piano</div>
                <div className="font-semibold">€{payDialog.planPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Già incassato</div>
                <div className="font-semibold">€{payDialog.alreadyPaid.toFixed(2)}</div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Importo (€) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                className="text-lg h-12"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Metodo</Label>
              <Select value={payForm.method} onValueChange={(v) => setPayForm({ ...payForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contanti">Contanti</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                  <SelectItem value="bonifico">Bonifico</SelectItem>
                  <SelectItem value="satispay">Satispay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (opzionale)</Label>
              <Input
                value={payForm.notes}
                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                placeholder="es. Acconto, saldo, prima rata..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog({ ...payDialog, open: false })}>
              Annulla
            </Button>
            <Button onClick={savePayment} disabled={savingPay}>
              {savingPay && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Registra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deletePayId} onOpenChange={(open) => !open && setDeletePayId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancellare questo incasso?</AlertDialogTitle>
            <AlertDialogDescription>L'operazione non può essere annullata.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePayment} className="bg-destructive">
              Cancella
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SegretariaDashboard;
