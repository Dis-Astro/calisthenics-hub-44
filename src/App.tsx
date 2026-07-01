import { lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageLoader from "@/components/PageLoader";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

const Index = lazy(() => import("./pages/Index"));
const Contatti = lazy(() => import("./pages/Contatti"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const ClientDetailPage = lazy(() => import("./pages/admin/ClientDetailPage"));
const SubscriptionManagement = lazy(() => import("./pages/admin/SubscriptionManagement"));
const CalendarManagement = lazy(() => import("./pages/admin/CalendarManagement"));
const WorkoutPlanEditor = lazy(() => import("./pages/admin/WorkoutPlanEditor"));
const GymHoursManagement = lazy(() => import("./pages/admin/GymHoursManagement"));
const CourseManagement = lazy(() => import("./pages/admin/CourseManagement"));
const MembershipPlanManagement = lazy(() => import("./pages/admin/MembershipPlanManagement"));
const AdminReportsPage = lazy(() => import("./pages/admin/AdminReportsPage"));
const StructurePerformancePage = lazy(() => import("./pages/admin/StructurePerformancePage"));
const ExpensesManagement = lazy(() => import("./pages/admin/ExpensesManagement"));
const ExerciseManagement = lazy(() => import("./pages/admin/ExerciseManagement"));

const SegretariaDashboard = lazy(() => import("./pages/segretaria/SegretariaDashboard"));

const CoachDashboard = lazy(() => import("./pages/coach/CoachDashboard"));
const CoachClientsPage = lazy(() => import("./pages/coach/CoachClientsPage"));
const CoachWorkoutsPage = lazy(() => import("./pages/coach/CoachWorkoutsPage"));
const CoachCalendarPage = lazy(() => import("./pages/coach/CoachCalendarPage"));
const CoachReportsPage = lazy(() => import("./pages/coach/CoachReportsPage"));

const PalestraDashboard = lazy(() => import("./pages/cliente/PalestraDashboard"));
const CoachingDashboard = lazy(() => import("./pages/cliente/CoachingDashboard"));
const WorkoutPlanPage = lazy(() => import("./pages/cliente/WorkoutPlanPage"));
const WorkoutArchivePage = lazy(() => import("./pages/cliente/WorkoutArchivePage"));
const ReportIssuePage = lazy(() => import("./pages/cliente/ReportIssuePage"));
const ProgressPage = lazy(() => import("./pages/cliente/ProgressPage"));
const AppointmentsPage = lazy(() => import("./pages/cliente/AppointmentsPage"));
const DocumentsPage = lazy(() => import("./pages/cliente/DocumentsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60_000,
    },
  },
});

interface AppRoute {
  path: string;
  element: ReactNode;
  allowedRoles?: UserRole[];
}

const adminOnly: UserRole[] = ["admin"];
const segretariaRoles: UserRole[] = ["segretaria", "admin"];
const coachRoles: UserRole[] = ["coach", "admin"];
const palestraRoles: UserRole[] = ["cliente_palestra", "cliente_corso"];
const coachingRoles: UserRole[] = ["cliente_coaching"];

const publicRoutes: AppRoute[] = [
  { path: "/", element: <Index /> },
  { path: "/contatti", element: <Contatti /> },
  { path: "/login", element: <Login /> },
];

const protectedRoutes: AppRoute[] = [
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/admin", element: <AdminDashboard />, allowedRoles: adminOnly },
  { path: "/admin/utenti", element: <UserManagement />, allowedRoles: adminOnly },
  { path: "/admin/utenti/nuovo", element: <UserManagement />, allowedRoles: adminOnly },
  { path: "/admin/utenti/:userId", element: <ClientDetailPage />, allowedRoles: adminOnly },
  { path: "/admin/utenti/:userId/scheda/nuova", element: <WorkoutPlanEditor />, allowedRoles: adminOnly },
  { path: "/admin/utenti/:userId/scheda/:planId/modifica", element: <WorkoutPlanEditor />, allowedRoles: adminOnly },
  { path: "/admin/abbonamenti", element: <SubscriptionManagement />, allowedRoles: adminOnly },
  { path: "/admin/calendario", element: <CalendarManagement />, allowedRoles: adminOnly },
  { path: "/admin/orari", element: <GymHoursManagement />, allowedRoles: adminOnly },
  { path: "/admin/corsi", element: <CourseManagement />, allowedRoles: adminOnly },
  { path: "/admin/esercizi", element: <ExerciseManagement />, allowedRoles: adminOnly },
  { path: "/admin/piani", element: <MembershipPlanManagement />, allowedRoles: adminOnly },
  { path: "/admin/segnalazioni", element: <AdminReportsPage />, allowedRoles: adminOnly },
  { path: "/admin/andamento-struttura", element: <StructurePerformancePage />, allowedRoles: adminOnly },
  { path: "/admin/spese", element: <ExpensesManagement />, allowedRoles: adminOnly },
  { path: "/segretaria", element: <SegretariaDashboard />, allowedRoles: segretariaRoles },
  { path: "/segretaria/*", element: <SegretariaDashboard />, allowedRoles: segretariaRoles },
  { path: "/coach", element: <CoachDashboard />, allowedRoles: coachRoles },
  { path: "/coach/clienti", element: <CoachClientsPage />, allowedRoles: coachRoles },
  { path: "/coach/schede", element: <CoachWorkoutsPage />, allowedRoles: coachRoles },
  { path: "/coach/calendario", element: <CoachCalendarPage />, allowedRoles: coachRoles },
  { path: "/coach/segnalazioni", element: <CoachReportsPage />, allowedRoles: coachRoles },
  { path: "/coach/*", element: <CoachDashboard />, allowedRoles: coachRoles },
  { path: "/palestra", element: <PalestraDashboard />, allowedRoles: palestraRoles },
  { path: "/palestra/*", element: <PalestraDashboard />, allowedRoles: palestraRoles },
  { path: "/coaching", element: <CoachingDashboard />, allowedRoles: coachingRoles },
  { path: "/coaching/scheda", element: <WorkoutPlanPage />, allowedRoles: coachingRoles },
  { path: "/coaching/scheda/:dayId", element: <WorkoutPlanPage />, allowedRoles: coachingRoles },
  { path: "/coaching/archivio", element: <WorkoutArchivePage />, allowedRoles: coachingRoles },
  { path: "/coaching/progressi", element: <ProgressPage />, allowedRoles: coachingRoles },
  { path: "/coaching/appuntamenti", element: <AppointmentsPage />, allowedRoles: coachingRoles },
  { path: "/coaching/segnala", element: <ReportIssuePage />, allowedRoles: coachingRoles },
  { path: "/coaching/documenti", element: <DocumentsPage />, allowedRoles: coachingRoles },
  { path: "/coaching/*", element: <CoachingDashboard />, allowedRoles: coachingRoles },
];

const renderProtectedRoute = ({ path, element, allowedRoles }: AppRoute) => (
  <Route
    key={path}
    path={path}
    element={<ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>}
  />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {publicRoutes.map(({ path, element }) => (
                <Route key={path} path={path} element={element} />
              ))}
              {protectedRoutes.map(renderProtectedRoute)}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
