import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";

export default function ScanRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      navigate(`/app/catalog?item=${id}`, { replace: true });
    } else {
      navigate("/app/dashboard", { replace: true });
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
