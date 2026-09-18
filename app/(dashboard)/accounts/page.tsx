import { Suspense } from "react";
import { AccountsPanel } from "@/components/accounts/accounts-panel";

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsPanel />
    </Suspense>
  );
}
