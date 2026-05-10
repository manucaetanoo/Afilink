import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-[#fffaf6] text-slate-900">
      <Navbar />
      <div className="flex min-h-screen pt-15">
        <Sidebar />
        <main className="flex-1 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl animate-pulse">
            <div className="mx-auto h-4 w-48 rounded bg-orange-100" />
            <div className="mx-auto mt-5 h-10 w-full max-w-xl rounded bg-slate-100" />
            <div className="mx-auto mt-4 h-5 w-full max-w-2xl rounded bg-slate-100" />
            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-2xl border border-orange-100 bg-white">
                  <div className="aspect-[4/4.6] bg-slate-100" />
                  <div className="space-y-3 p-5">
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
