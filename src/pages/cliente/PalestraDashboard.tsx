import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Clock, 
  FileText,
  CreditCard,
  LogOut,
  Phone,
  MapPin,
  CalendarDays
} from "lucide-react";
import { Link } from "react-router-dom";

// Dashboard SEMPLICE per clienti palestra
const PalestraDashboard = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-xl tracking-wider">AREA CLIENTI</h1>
          <Button 
            variant="ghost" 
            size="sm"
            className="gap-2 text-muted-foreground hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            Esci
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-display tracking-wider mb-2">
            Ciao, {profile?.first_name}!
          </h2>
          <p className="text-muted-foreground">
            Benvenuto nella tua area riservata.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link to="/palestra/orari">
            <Card className="bg-card border-border hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Clock className="w-10 h-10 text-primary mb-4" />
                <h3 className="font-display text-lg tracking-wider">ORARI</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Orari di apertura della palestra
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/palestra/abbonamento">
            <Card className="bg-card border-border hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <CreditCard className="w-10 h-10 text-primary mb-4" />
                <h3 className="font-display text-lg tracking-wider">ABBONAMENTO</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Stato e scadenza abbonamento
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/palestra/documenti">
            <Card className="bg-card border-border hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <FileText className="w-10 h-10 text-primary mb-4" />
                <h3 className="font-display text-lg tracking-wider">DOCUMENTI</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Contratti e documenti
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Subscription Status */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-display tracking-wider flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Il Tuo Abbonamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6 text-muted-foreground">
                <p>Nessun abbonamento attivo</p>
                <p className="text-sm mt-2">Contatta la reception per attivare</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-display tracking-wider">Contatti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefono</p>
                  <p className="font-medium">+39 XXX XXX XXXX</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Indirizzo</p>
                  <p className="font-medium">Via Example, 123</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PalestraDashboard;
