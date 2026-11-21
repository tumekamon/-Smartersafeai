import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCompany } from "@/lib/db";
import { moduleVisible } from "@/lib/home-layout";
import { isPlainWorker } from "@/components/nav-items";

/** The admin can switch this area off for a role (Settings → What each role sees). */
export default async function ComplianceLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!moduleVisible(getCompany(user.companyId), user, "compliance")) redirect("/dashboard");
  // Workers don't see the crew's certificates, permit log, stock or notices; their own
  // certificates are under My profile.
  if (isPlainWorker(user)) redirect("/settings/profile#certs");
  return children;
}
