import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { workTabsFor } from "@/components/work-tabs";

/** "Work" opens on the first tab this person can use: review queue for safety professionals, fixes otherwise. */
export default async function WorkPage() {
  const user = await getCurrentUser();
  redirect(workTabsFor(user, getCapabilities(user))[0].href);
}
