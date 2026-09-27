import { redirect } from "next/navigation";
import Image from "next/image";
import { getSession } from "@/lib/session";
import { listCompanies, listProjects, listUsers } from "@/lib/db";
import { brandVars } from "@/lib/color";
import { LoginForm, type DemoAccount } from "@/components/login-form";
import { EvidenceScene } from "@/components/viz/evidence-scene";
import { IconCheckShield, IconSparkle } from "@/components/ui/icons";

const ROLE_LABELS = {
  ADMIN: "Admin",
  SAFETY_DIRECTOR: "Safety Director",
  SAFETY_MANAGER: "Safety Manager",
  SUPERVISOR: "Supervisor",
  WORKER: "Field Worker",
  CLIENT_VIEWER: "Client Viewer",
} as const;

function hueFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

export default async function LoginPage() {
  const session = await getSession();
  if (session?.userId) {
    redirect("/dashboard");
  }

  const company = listCompanies()[0];
  const accounts: DemoAccount[] = listUsers(company?.id ?? "")
    .filter((u) => u.featured)
    .map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      role: ROLE_LABELS[u.role],
      email: u.email,
      initials: `${u.firstName[0]}${u.lastName[0]}`,
      hue: hueFor(u.id),
    }));

  const project = listProjects(company?.id ?? "")[0];

  return (
    <div
      className="tenant-theme grid min-h-screen flex-1 lg:grid-cols-[1.1fr_1fr]"
      style={company ? (brandVars(company.primaryColor) as React.CSSProperties) : undefined}
    >
      <section className="hero relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14" style={{ borderRadius: 0 }}>
        <div className="absolute inset-0 z-0 pointer-events-none">
          <Image src={company?.heroImage ?? "/bg-hero.jpg"} alt="Construction background" fill className="object-cover opacity-30 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-transparent mix-blend-multiply" />
        </div>
        
        <div className="relative z-10 flex items-center gap-2.5">
          <span className="brand-mark flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-md">
            <IconCheckShield width={21} height={21} />
          </span>
          <div>
            <p className="text-base font-semibold drop-shadow-sm">SmartSafe AI</p>
            <p className="hero-muted text-xs font-medium drop-shadow-sm">Safety Intelligence Platform</p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <span className="ai-chip shadow-sm backdrop-blur-md">
            <IconSparkle width={12} height={12} />
            AI-assisted, human-decided
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight drop-shadow-md xl:text-5xl text-foreground">
            See the hazard before it becomes an incident.
          </h1>
          <div
            className="mt-6 overflow-hidden rounded-lg shadow-2xl backdrop-blur-sm"
            style={{ border: "1px solid var(--hero-tile-border)" }}
          >
            <EvidenceScene
              scene="panel"
              title="Missing GFCI protection"
              confidence={0.91}
              risk="high"
              fileName="IMG_2184.jpg"
              capturedAt={new Date().toISOString()}
              location="L3 · East"
            />
          </div>
        </div>

        <p className="relative z-10 hero-muted text-xs font-medium opacity-80 drop-shadow-sm">
          {company?.name}
          {project ? ` · ${project.shortName} project team` : ""}
        </p>
      </section>

      <section className="flex items-center justify-center bg-background px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="brand-mark flex h-9 w-9 items-center justify-center rounded-md text-white">
              <IconCheckShield width={19} height={19} />
            </span>
            <p className="text-sm font-semibold">SmartSafe AI</p>
          </div>
          <h2 className="mb-7 text-2xl font-semibold tracking-tight">Welcome back</h2>
          <LoginForm accounts={accounts} />
        </div>
      </section>
    </div>
  );
}
