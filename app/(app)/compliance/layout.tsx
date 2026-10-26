import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCompany } from "@/lib/db";
import { moduleVisible } from "@/lib/home-layout";

/** The admin can switch this area off for a role (Settings → What each role sees). */
export default async function ComplianceLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!moduleVisible(getCompany(user.companyId), user, "compliance")) redirect("/dashboard");
  return children;
}
