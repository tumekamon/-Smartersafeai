import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { listCertifications } from "@/lib/db";
import { isCertificationType } from "@/lib/certifications";
import { nowMs } from "@/lib/time";
import { CertificateUploadForm } from "@/components/certifications/certificate-upload-form";

export default async function NewCertificatePage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await getCurrentUser();
  if (user.readOnly) redirect("/settings/profile");
  const { type } = await searchParams;

  const onFile = Object.fromEntries(
    listCertifications(user.companyId)
      .filter((c) => c.userId === user.id)
      .map((c) => [c.type, c.expiresOn])
  );
  const today = new Date(nowMs()).toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <Link href="/settings/profile#certs" className="text-sm font-medium text-foreground/60 hover:text-foreground">
          ← My profile
        </Link>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">Add a certificate</h1>
        <p className="mt-1 text-sm text-foreground/60">Upload a training card or certificate. It counts once your supervisor has checked it.</p>
      </div>
      <CertificateUploadForm defaultType={type && isCertificationType(type) ? type : undefined} onFile={onFile} today={today} />
    </div>
  );
}
