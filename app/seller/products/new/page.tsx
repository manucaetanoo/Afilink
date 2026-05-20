import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import NewProductPageClient from "./NewProductPageClient";

export default async function NewProductPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "SELLER") {
    redirect("/login");
  }

  return <NewProductPageClient />;
}
