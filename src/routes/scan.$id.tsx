import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/scan/$id")({
  component: ScanRedirect,
});

function ScanRedirect() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      // Redirect to catalog with the item detail sheet open
      navigate({
        to: "/app/catalog",
        search: { item: id },
        replace: true,
      });
    } else {
      // Fallback to dashboard if no ID
      navigate({
        to: "/app/dashboard",
        replace: true,
      });
    }
  }, [id, navigate]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Processing product scan...
        </p>
      </div>
    </div>
  );
}
