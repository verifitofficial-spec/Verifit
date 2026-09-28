import { SkeletonBlock, SkeletonCard } from '@/components/Skeleton';

export default function ClientDashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full border-b border-slate-900">
        <SkeletonBlock className="h-8 w-40" />
        <SkeletonBlock className="h-9 w-24 rounded-xl" />
      </header>

      <section className="max-w-4xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
          <SkeletonBlock className="h-6 w-1/3" />
          <SkeletonBlock className="h-4 w-1/2" />
          <div className="space-y-3 pt-2">
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-16 w-full" />
          </div>
        </div>

        <SkeletonCard />
        <SkeletonCard />

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <SkeletonBlock className="h-6 w-1/4 mb-4" />
          <SkeletonBlock className="h-[300px] w-full" />
        </div>
      </section>

      <footer className="border-t border-slate-900 py-6 max-w-7xl mx-auto w-full">
        <SkeletonBlock className="h-3 w-40 mx-auto" />
      </footer>
    </main>
  );
}