import { SignInForm } from "@/components/SignInForm";
import { Shell } from "@/components/Shell";
import { getConfig } from "@/server/config";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const config = getConfig();
  const params = await searchParams;
  return (
    <Shell>
      <SignInForm tenants={config.tenants} demoOnly={config.demoOnly} expired={params.expired === "1"} />
    </Shell>
  );
}
