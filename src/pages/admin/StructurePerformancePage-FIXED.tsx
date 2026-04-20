import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertTriangle,
  Loader2,
  Download,
  BarChart3
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay, eachMonthOfInterval } from "date-fns";
import { it } from "date-fns/locale";

interface KPIData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  marginPercentage: number;
  netCash: number;
  activeClients: number;
  averageClientValue: number;
  monthlyRecurringRevenue: number;
}

interface ChartDataPoint {
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface BusinessLineMetrics {
  name: string;
  revenue: number;
  costs: number;
  margin: number;
  clients: number;
  averageTicket: number;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

const StructurePerformancePageFIXED = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  const [kpiData, setKpiData] = useState<KPIData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    marginPercentage: 0,
    netCash: 0,
    activeClients: 0,
    averageClientValue: 0,
    monthlyRecurringRevenue: 0
  });

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessLineMetrics[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [period, customStartDate, customEndDate]);

  const getDateRange = () => {
    const today = new Date();
    let start, end;

    switch (period) {
      case "week":
        start = subDays(today, 7);
        end = today;
        break;
      case "month":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "quarter":
        start = startOfMonth(subMonths(today, 2));
        end = endOfMonth(today);
        break;
      case "year":
        start = startOfMonth(subMonths(today, 11));
        end = endOfMonth(today);
        break;
      case "custom":
        start = new Date(customStartDate);
        end = new Date(customEndDate);
        break;
      default:
        start = startOfMonth(today);
        end = endOfMonth(today);
    }

    return { start: startOfDay(start), end: endOfDay(end) };
  };

  const fetchData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");

    try {
      // Fetch payments with subscription and membership plan details
      const { data: payments } = await supabase
        .from("payments")
        .select("*, subscriptions(*, membership_plans(plan_type))")
        .gte("payment_date", startStr)
        .lte("payment_date", endStr);

      // Fetch expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("*")
        .gte("date", startStr)
        .lte("date", endStr);

      // Fetch active clients
      const { data: clients } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["cliente_palestra", "cliente_coaching", "cliente_corso"]);

      // Fetch subscriptions for MRR
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("*, membership_plans(price)")
        .eq("status", "active");

      // Calculate KPIs
      const totalRevenue = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalExpenses = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      const netProfit = totalRevenue - totalExpenses;
      const marginPercentage = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      const activeClients = clients?.length || 0;
      const averageClientValue = activeClients > 0 ? totalRevenue / activeClients : 0;
      const monthlyRecurringRevenue = (subscriptions || []).reduce(
        (sum, s) => sum + (s.membership_plans?.price || 0),
        0
      );

      setKpiData({
        totalRevenue,
        totalExpenses,
        netProfit,
        marginPercentage,
        netCash: totalRevenue - totalExpenses,
        activeClients,
        averageClientValue,
        monthlyRecurringRevenue
      });

      // Generate chart data based on period
      const chartDataPoints: ChartDataPoint[] = generateChartData(
        period,
        start,
        end,
        payments || [],
        expenses || []
      );
      setChartData(chartDataPoints);

      // Business metrics - using membership_plans.plan_type
      const palestra = (payments || []).filter(p => 
        p.subscriptions?.membership_plans?.plan_type === "cliente_palestra"
      ).reduce((sum, p) => sum + (p.amount || 0), 0);

      const coaching = (payments || []).filter(p => 
        p.subscriptions?.membership_plans?.plan_type === "cliente_coaching"
      ).reduce((sum, p) => sum + (p.amount || 0), 0);

      const corsi = (payments || []).filter(p => 
        p.subscriptions?.membership_plans?.plan_type === "cliente_corso"
      ).reduce((sum, p) => sum + (p.amount || 0), 0);

      const metrics: BusinessLineMetrics[] = [
        {
          name: "Palestra",
          revenue: palestra,
          costs: (expenses || []).filter(e => e.subcategory?.includes("Palestra")).reduce((sum, e) => sum + (e.amount || 0), 0),
          margin: 0,
          clients: (clients || []).filter(c => c.role === "cliente_palestra").length,
          averageTicket: 0
        },
        {
          name: "Coaching",
          revenue: coaching,
          costs: (expenses || []).filter(e => e.subcategory?.includes("Coaching")).reduce((sum, e) => sum + (e.amount || 0), 0),
          margin: 0,
          clients: (clients || []).filter(c => c.role === "cliente_coaching").length,
          averageTicket: 0
        },
        {
          name: "Corsi",
          revenue: corsi,
          costs: (expenses || []).filter(e => e.subcategory?.includes("Corsi")).reduce((sum, e) => sum + (e.amount || 0), 0),
          margin: 0,
          clients: (clients || []).filter(c => c.role === "cliente_corso").length,
          averageTicket: 0
        }
      ];

      metrics.forEach(m => {
        m.margin = m.revenue - m.costs;
        m.averageTicket = m.clients > 0 ? m.revenue / m.clients : 0;
      });

      setBusinessMetrics(metrics);

      // Generate alerts
      const newAlerts: string[] = [];
      if (marginPercentage < 30 && marginPercentage > 0) {
        newAlerts.push("⚠️ Margine di profitto sotto il 30%");
      }
      if (activeClients < 10) {
        newAlerts.push("⚠️ Numero di clienti attivi inferiore a 10");
      }
      if (totalExpenses > totalRevenue) {
        newAlerts.push("🔴 Le spese superano le entrate!");
      }
      setAlerts(newAlerts);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Errore", description: "Impossibile caricare i dati", variant: "destructive" });
      setLoading(false);
    }
  };

  const generateChartData = (
    period: string,
    start: Date,
    end: Date,
    payments: any[],
    expenses: any[]
  ): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];

    if (period === "week") {
      for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = format(date, "yyyy-MM-dd");
        
        const dayRevenue = payments.filter(p => p.payment_date === dateStr).reduce((sum, p) => sum + (p.amount || 0), 0);
        const dayExpenses = expenses.filter(e => e.date === dateStr).reduce((sum, e) => sum + (e.amount || 0), 0);

        data.push({
          label: format(date, "EEE", { locale: it }),
          revenue: dayRevenue,
          expenses: dayExpenses,
          profit: dayRevenue - dayExpenses
        });
      }
    } else if (period === "month") {
      for (let i = 1; i <= 30; i++) {
        const date = new Date(start);
        date.setDate(i);
        if (date > end) break;

        const dateStr = format(date, "yyyy-MM-dd");
        const dayRevenue = payments.filter(p => p.payment_date === dateStr).reduce((sum, p) => sum + (p.amount || 0), 0);
        const dayExpenses = expenses.filter(e => e.date === dateStr).reduce((sum, e) => sum + (e.amount || 0), 0);

        data.push({
          label: format(date, "d", { locale: it }),
          revenue: dayRevenue,
          expenses: dayExpenses,
          profit: dayRevenue - dayExpenses
        });
      }
    } else if (period === "quarter" || period === "year") {
      const months = eachMonthOfInterval({ start, end });
      months.forEach(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthStartStr = format(monthStart, "yyyy-MM-dd");
        const monthEndStr = format(monthEnd, "yyyy-MM-dd");

        const monthRevenue = payments
          .filter(p => p.payment_date >= monthStartStr && p.payment_date <= monthEndStr)
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        const monthExpenses = expenses
          .filter(e => e.date >= monthStartStr && e.date <= monthEndStr)
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        data.push({
          label: format(month, "MMM", { locale: it }),
          revenue: monthRevenue,
          expenses: monthExpenses,
          profit: monthRevenue - monthExpenses
        });
      });
    } else if (period === "custom") {
      const months = eachMonthOfInterval({ start, end });
      months.forEach(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthStartStr = format(monthStart, "yyyy-MM-dd");
        const monthEndStr = format(monthEnd, "yyyy-MM-dd");

        const monthRevenue = payments
          .filter(p => p.payment_date >= monthStartStr && p.payment_date <= monthEndStr)
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        const monthExpenses = expenses
          .filter(e => e.date >= monthStartStr && e.date <= monthEndStr)
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        data.push({
          label: format(month, "MMM yyyy", { locale: it }),
          revenue: monthRevenue,
          expenses: monthExpenses,
          profit: monthRevenue - monthExpenses
        });
      });
    }

    return data;
  };

  const KPICard = ({ label, value, icon: Icon, trend, color }: any) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-display tracking-wider mt-2">
              {typeof value === "number" && label.includes("€") ? `€${value.toFixed(2)}` : value}
            </p>
            {trend && (
              <div className="flex items-center gap-1 mt-2 text-xs">
                {trend > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={trend > 0 ? "text-green-500" : "text-red-500"}>
                  {Math.abs(trend)}%
                </span>
              </div>
            )}
          </div>
          <Icon className={`w-10 h-10 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout title="ANDAMENTO STRUTTURA" icon={<BarChart3 className="w-6 h-6" />}>
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display tracking-wider">Filtri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Periodo</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Ultima Settimana</SelectItem>
                    <SelectItem value="month">Questo Mese</SelectItem>
                    <SelectItem value="quarter">Questo Trimestre</SelectItem>
                    <SelectItem value="year">Questo Anno</SelectItem>
                    <SelectItem value="custom">Personalizzato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {period === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label>Data Inizio</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fine</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div className="flex items-end">
                <Button className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  Esporta
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
                <AlertTriangle className="w-5 h-5" />
                Avvisi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {alerts.map((alert, idx) => (
                  <li key={idx} className="text-sm text-yellow-800 dark:text-yellow-200">
                    {alert}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* KPI Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                label="Entrate Totali"
                value={kpiData.totalRevenue}
                icon={DollarSign}
                color="text-green-500"
              />
              <KPICard
                label="Spese Totali"
                value={kpiData.totalExpenses}
                icon={DollarSign}
                color="text-red-500"
              />
              <KPICard
                label="Utile Netto"
                value={kpiData.netProfit}
                icon={TrendingUp}
                color="text-blue-500"
              />
              <KPICard
                label="Margine %"
                value={`${kpiData.marginPercentage.toFixed(1)}%`}
                icon={BarChart3}
                color="text-purple-500"
              />
              <KPICard
                label="Cassa Netta"
                value={kpiData.netCash}
                icon={DollarSign}
                color="text-indigo-500"
              />
              <KPICard
                label="Clienti Attivi"
                value={kpiData.activeClients}
                icon={Users}
                color="text-orange-500"
              />
              <KPICard
                label="Valore Medio Cliente"
                value={kpiData.averageClientValue}
                icon={DollarSign}
                color="text-cyan-500"
              />
              <KPICard
                label="MRR"
                value={kpiData.monthlyRecurringRevenue}
                icon={TrendingUp}
                color="text-lime-500"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display tracking-wider">Andamento</CardTitle>
                  <CardDescription>Entrate, Spese e Utile</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#10B981" name="Entrate" />
                      <Line type="monotone" dataKey="expenses" stroke="#EF4444" name="Spese" />
                      <Line type="monotone" dataKey="profit" stroke="#3B82F6" name="Utile" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Business Lines */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display tracking-wider">Linee di Business</CardTitle>
                  <CardDescription>Ricavi per servizio</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={businessMetrics.filter(m => m.revenue > 0)}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {businessMetrics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Business Metrics Table */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display tracking-wider">Confronto Linee di Business</CardTitle>
                <CardDescription>Analisi dettagliata per servizio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Servizio</TableHead>
                        <TableHead>Ricavi</TableHead>
                        <TableHead>Costi</TableHead>
                        <TableHead>Margine</TableHead>
                        <TableHead>Clienti</TableHead>
                        <TableHead>Ticket Medio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {businessMetrics.map((metric) => (
                        <TableRow key={metric.name}>
                          <TableCell className="font-medium">{metric.name}</TableCell>
                          <TableCell>€{metric.revenue.toFixed(2)}</TableCell>
                          <TableCell>€{metric.costs.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={metric.margin > 0 ? "default" : "destructive"}>
                              €{metric.margin.toFixed(2)}
                            </Badge>
                          </TableCell>
                          <TableCell>{metric.clients}</TableCell>
                          <TableCell>€{metric.averageTicket.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default StructurePerformancePageFIXED;
