import { SkeletonBlock, SkeletonCard } from '@/components/Skeleton';

export default function TrainerDashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <SkeletonBlock className="h-7 w-48" />
          <SkeletonBlock className="h-9 w-28 rounded-xl" />
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 space-y-10">
        <SkeletonCard className="p-8" />
        <SkeletonCard className="p-8" />
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-4">
          <SkeletonBlock className="h-6 w-1/3" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 28 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-12" />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}