interface PageLoaderProps {
  message?: string;
}

const PageLoader = ({ message = "Caricamento..." }: PageLoaderProps) => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  </div>
);

export default PageLoader;
