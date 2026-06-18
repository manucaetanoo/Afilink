import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isShopifyVisibleForEmail } from "@/lib/features";
import NewProductPageClient from "./NewProductPageClient";

export default async function NewProductPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "SELLER") {
    redirect("/login");
  }

  if (!session.user.storeSlug) {
    redirect("/onboarding/seller");
  }

  return (
    <NewProductPageClient
      shopifyImportEnabled={isShopifyVisibleForEmail(session.user.email)}
    />
  );
}
