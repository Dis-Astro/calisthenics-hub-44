import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ClientLinkProps {
  userId?: string | null;
  children: ReactNode;
  className?: string;
}

const ClientLink = ({ userId, children, className }: ClientLinkProps) => {
  if (!userId) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link
      to={`/admin/utenti/${userId}`}
      className={cn(
        "font-medium text-foreground underline-offset-4 hover:text-primary hover:underline",
        className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </Link>
  );
};

export default ClientLink;
