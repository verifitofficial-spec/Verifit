export function SkeletonBlock({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse bg-slate-800/60 rounded-xl ${className}`} />;
  }
  
  export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 ${className}`}>
        <SkeletonBlock className="h-4 w-1/3" />
        <SkeletonBlock className="h-3 w-2/3" />
        <SkeletonBlock className="h-3 w-1/2" />
      </div>
    );
  }