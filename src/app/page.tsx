import { SignInForm } from "@/components/SignInForm";
import { getConfig } from "@/server/config";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const config = getConfig();
  const params = await searchParams;
  return (
    <SignInForm tenants={config.tenants} demoOnly={config.demoOnly} expired={params.expired === "1"} />
  );
}
