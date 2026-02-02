import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  User,
  Calendar,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Send
} from "lucide-react";
import CoachLayout from "@/components/coach/CoachLayout";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ErrorReportStatus = Database["public"]["Enums"]["error_report_status"];

interface ErrorReport {
  id: string;
  title: string;
  description: string;
  status: ErrorReportStatus;
  reported_at: string;
  resolved_at: string | null;
  coach_response: string | null;
  client_id: string;
  client_name?: string;
  exercise_name?: string;
}

const statusConfig: Record<ErrorReportStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof AlertCircle }> = {
  aperta: { label: "Aperta", variant: "destructive", icon: AlertCircle },
  in_lavorazione: { label: "In lavorazione", variant: "secondary", icon: Clock },
  risolta: { label: "Risolta", variant: "default", icon: CheckCircle },
  chiusa: { label: "Chiusa", variant: "outline", icon: CheckCircle },
};

const CoachReportsPage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.user_id) {
      fetchReports();
    }
  }, [profile?.user_id]);

  const fetchReports = async () => {
    setLoading(true);
    
    const { data: reportsData } = await supabase
      .from("error_reports")
      .select("*")
      .eq("coach_id", profile?.user_id)
      .order("reported_at", { ascending: false });

    if (reportsData && reportsData.length > 0) {
      const clientIds = [...new Set(reportsData.map(r => r.client_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", clientIds);

      const clientMap = new Map(profiles?.map(p => [p.user_id, `${p.first_name} ${p.last_name}`]) || []);

      setReports(reportsData.map(r => ({
        ...r,
        client_name: clientMap.get(r.client_id) || "Cliente"
      })));
    } else {
      setReports([]);
    }

    setLoading(false);
  };

  const handleRespond = async (reportId: string, newStatus: ErrorReportStatus) => {
    if (!response.trim() && newStatus !== "chiusa") {
      toast({ title: "Errore", description: "Inserisci una risposta", variant: "destructive" });
      return;
    }

    setSaving(true);

    const updateData: {
      status: ErrorReportStatus;
      coach_response: string | null;
      resolved_at: string | null;
    } = {
      status: newStatus,
      coach_response: response.trim() || selectedReport?.coach_response || null,
      resolved_at: newStatus === "risolta" ? new Date().toISOString() : null
    };

    const { error } = await supabase
      .from("error_reports")
      .update(updateData)
      .eq("id", reportId);

    if (error) {
      toast({ title: "Errore", description: "Impossibile aggiornare la segnalazione", variant: "destructive" });
    } else {
      toast({ title: "Successo", description: "Segnalazione aggiornata" });
      setSelectedReport(null);
      setResponse("");
      fetchReports();
    }

    setSaving(false);
  };

  const openReports = reports.filter(r => r.status === "aperta" || r.status === "in_lavorazione");
  const closedReports = reports.filter(r => r.status === "risolta" || r.status === "chiusa");

  return (
    <CoachLayout title="SEGNALAZIONI" icon={<MessageSquare className="w-6 h-6" />}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-wider flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-destructive" />
                Aperte ({openReports.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : openReports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nessuna segnalazione aperta</p>
              ) : (
                <div className="space-y-3">
                  {openReports.map(report => {
                    const config = statusConfig[report.status];
                    return (
                      <button
                        key={report.id}
                        onClick={() => {
                          setSelectedReport(report);
                          setResponse(report.coach_response || "");
                        }}
                        className={`w-full p-3 rounded-lg border text-left transition-colors hover:border-primary/50 ${
                          selectedReport?.id === report.id ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{report.title}</h4>
                          <Badge variant={config.variant} className="gap-1">
                            <config.icon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {report.client_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(parseISO(report.reported_at), "dd/MM/yyyy HH:mm", { locale: it })}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-wider flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Risolte ({closedReports.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {closedReports.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nessuna segnalazione risolta</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {closedReports.slice(0, 10).map(report => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className="w-full p-2 rounded text-left text-sm hover:bg-muted/50"
                    >
                      <span className="font-medium">{report.title}</span>
                      <span className="text-muted-foreground ml-2">- {report.client_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Report Detail */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display tracking-wider">
              {selectedReport ? "Dettaglio Segnalazione" : "Seleziona una segnalazione"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedReport ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Clicca su una segnalazione per visualizzarla</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">{selectedReport.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span>{selectedReport.client_name}</span>
                    <span>{format(parseISO(selectedReport.reported_at), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}</span>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Descrizione del problema:</p>
                  <p>{selectedReport.description}</p>
                </div>

                {selectedReport.coach_response && (
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm font-medium text-primary mb-1">La tua risposta:</p>
                    <p>{selectedReport.coach_response}</p>
                  </div>
                )}

                {(selectedReport.status === "aperta" || selectedReport.status === "in_lavorazione") && (
                  <>
                    <Textarea
                      placeholder="Scrivi la tua risposta al cliente..."
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleRespond(selectedReport.id, "in_lavorazione")}
                        variant="outline"
                        disabled={saving}
                      >
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <Clock className="w-4 h-4 mr-2" />
                        In Lavorazione
                      </Button>
                      <Button 
                        onClick={() => handleRespond(selectedReport.id, "risolta")}
                        disabled={saving || !response.trim()}
                      >
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <Send className="w-4 h-4 mr-2" />
                        Rispondi e Risolvi
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CoachLayout>
  );
};

export default CoachReportsPage;
