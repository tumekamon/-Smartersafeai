import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { listCertifications } from "@/lib/db";
import { isCertificationType } from "@/lib/certifications";
import { nowMs } from "@/lib/time";
import { CertificateUploadForm } from "@/components/certifications/certificate-upload-form";
import { IconChevronLeft } from "@/components/ui/icons";

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
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <Link href="/settings/profile#certs" className="ds-back self-start">
        <IconChevronLeft width={18} height={18} /> My profile
      </Link>
      <h1 className="disp text-[34px] leading-none">Add a certificate</h1>
      <CertificateUploadForm defaultType={type && isCertificationType(type) ? type : undefined} onFile={onFile} today={today} />
    </div>
  );
}
