import { Suspense } from "react";
import { BrandsPanel } from "@/components/brands/brands-panel";

export default function BrandsPage() {
  return (
    <Suspense>
      <BrandsPanel />
    </Suspense>
  );
}
