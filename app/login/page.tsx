import { redirect } from "next/navigation";
import { ROLE_INFO, ROLES } from "@/lib/roles";
import { getSession } from "@/lib/session";
import { listCompanies, listUsers } from "@/lib/db";
import { brandVars } from "@/lib/color";
import { LoginForm, type DemoAccount } from "@/components/login-form";
import { BrandLockup } from "@/components/ui/brand-mark";
import { ClearOfflineData } from "@/components/offline/clear-offline-data";

/**
 * Sign in (design canvas W01). Mobile first: one column. On wide screens a navy
 * band carries the brand promise next to the form.
 */
export default async function LoginPage() {
  const session = await getSession();
  if (session?.userId) {
    redirect("/dashboard");
  }

  const company = listCompanies()[0];
  const featured = listUsers(company?.id ?? "").filter((u) => u.featured && !u.readOnly);
  // One demo account per level, L1 to L4, in level order.
  const accounts: DemoAccount[] = ROLES.flatMap((r) =>
    featured
      .filter((u) => u.role === r)
      .map((u) => ({
        id: u.id,
        level: ROLE_INFO[r].level,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role === "ADMIN" ? "Owner · admin" : ROLE_INFO[r].label,
        email: u.email,
      }))
  );

  return (
    <div
      className="tenant-theme grid min-h-screen flex-1 bg-background lg:grid-cols-[1fr_1fr]"
      style={company ? (brandVars(company.primaryColor) as React.CSSProperties) : undefined}
    >
      <ClearOfflineData />
      <section className="navy-scope hidden flex-col justify-between p-12 lg:flex xl:p-16">
        <BrandLockup size={40} />
        <div className="max-w-lg">
          <p className="eyebrow" style={{ color: "#c9daec" }}>Field safety, proved</p>
          <h1 className="disp mt-4 text-5xl leading-[1.05] xl:text-6xl">Nothing counts as safe until someone has proved it.</h1>
          <p className="mt-6 text-lg leading-relaxed text-[#c9daec]">
            Report in three taps, fix with a photo, and every record closes with a name and a time on it.
          </p>
        </div>
        <p className="eyebrow" style={{ color: "#c9daec" }}>{company?.name}</p>
      </section>

      <section className="flex justify-center px-6 py-14 lg:items-center">
        <div className="flex w-full max-w-md flex-col gap-8">
          <div className="flex flex-col gap-4 lg:hidden">
            <BrandLockup />
          </div>
          <div className="flex flex-col gap-3">
            <span className="eyebrow">{company?.name}</span>
            <h2 className="disp text-[44px] leading-none">Sign in</h2>
          </div>
          <LoginForm accounts={accounts} />
        </div>
      </section>
    </div>
  );
}
