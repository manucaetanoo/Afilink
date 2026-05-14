import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import SellerOnboardingForm from "./SellerOnboardingForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SellerOnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "SELLER") {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { storeSlug: true },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.storeSlug) {
    redirect("/dashboard/seller");
  }

  return <SellerOnboardingForm />;
}
