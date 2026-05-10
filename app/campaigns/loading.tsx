import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function CampaignsLoading() {
  return (
    <div className="min-h-screen bg-[#fffaf5] text-slate-900">
      <Navbar />
      <div className="flex mt-15">
        <Sidebar />
        <main className="flex-1 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl animate-pulse">
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="space-y-5">
                <div className="h-8 w-44 rounded-full bg-orange-100" />
                <div className="h-14 w-full rounded bg-slate-100" />
                <div className="h-14 w-5/6 rounded bg-slate-100" />
                <div className="h-20 w-full max-w-2xl rounded bg-slate-100" />
              </div>
              <div className="aspect-[4/4.2] rounded-[2rem] bg-slate-100" />
            </div>
            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-2xl border border-orange-100 bg-white">
                  <div className="aspect-[16/11] bg-slate-100" />
                  <div className="space-y-3 p-6">
                    <div className="h-5 rounded bg-slate-100" />
                    <div className="h-4 w-2/3 rounded bg-slate-100" />
                    <div className="h-16 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
