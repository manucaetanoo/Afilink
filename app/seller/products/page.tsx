import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import SellerProductsPage from "./SellerProductsPage";

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "SELLER") {
    redirect("/login");
  }

  if (!session.user.storeSlug) {
    redirect("/onboarding/seller");
  }

  return <SellerProductsPage />;
}
