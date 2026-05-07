import {  } from "react-router-dom";
import { SalesGrid } from "@/components/sales/SalesGrid";

export default SalesPage;

function SalesPage() {
  return (
    <div className="mx-auto max-w-[1400px] h-full flex flex-col px-4 md:px-0">
      <div className="flex-1 nexa-card overflow-hidden bg-background my-4">
        <SalesGrid />
      </div>
    </div>
  );
}
