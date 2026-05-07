import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import PayoutRequestsClient from "@/components/admin/PayoutRequestsClient";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export default async function AdminPayoutsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (String(session.user.role).toUpperCase() !== "ADMIN") {
    redirect("/dashboard/seller");
  }

  const payoutRequests = await prisma.payoutRequest.findMany({
    where: {
      status: "PENDING",
    },
    orderBy: {
      requestedAt: "asc",
    },
    select: {
      id: true,
      kind: true,
      amount: true,
      status: true,
      requestedAt: true,
      paidAt: true,
      adminNotes: true,
      requester: {
        select: {
          name: true,
          email: true,
          role: true,
          payoutMethod: true,
          payoutHolderName: true,
          payoutDocumentType: true,
          payoutDocumentNumber: true,
          payoutEmail: true,
          payoutPhone: true,
          payoutCountry: true,
          payoutCurrency: true,
          bankName: true,
          bankAccountType: true,
          bankAccountNumber: true,
          bankAccountAlias: true,
          bankBranch: true,
          payoutNotes: true,
        },
      },
    },
  });

  const requests = payoutRequests.map((request) => ({
    ...request,
    requestedAt: request.requestedAt.toISOString(),
    paidAt: request.paidAt?.toISOString() ?? null,
  }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <div className="flex min-h-screen pt-16">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Plataforma
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Solicitudes de liquidacion
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Revisa datos de cobro, realiza el pago por fuera y marca la
                  solicitud como liquidada.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                {requests.length} solicitudes pendientes
              </div>
            </div>

            <section className="mt-8">
              <PayoutRequestsClient requests={requests} />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
