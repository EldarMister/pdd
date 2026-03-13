// Skeleton for product card
export function ProductSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="skeleton aspect-square" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
        <div className="skeleton h-6 w-2/3 rounded" />
        <div className="skeleton h-10 w-full rounded-xl" />
      </div>
    </div>
  )
}

// Grid of skeletons
export function ProductSkeletonGrid({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => <ProductSkeleton key={i} />)}
    </div>
  )
}

// Pagination
export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null

  const getPages = () => {
    const range = []
    const delta = 2
    for (let i = Math.max(2, page - delta); i <= Math.min(pages - 1, page + delta); i++) {
      range.push(i)
    }
    if (page - delta > 2) range.unshift('...')
    if (page + delta < pages - 1) range.push('...')
    range.unshift(1)
    if (pages > 1) range.push(pages)
    return range
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ←
      </button>

      {getPages().map((p, i) => (
        p === '...' ? (
          <span key={i} className="px-2 text-gray-400">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
              p === page
                ? 'bg-brand-500 text-white'
                : 'border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        )
      ))}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        →
      </button>
    </div>
  )
}

// Empty state
export function EmptyState({ title = 'Ничего не найдено', subtitle, action }) {
  return (
    <div className="text-center py-16 animate-fade-in">
      <div className="text-5xl mb-4">🔍</div>
      <h3 className="font-display font-bold text-xl text-gray-700 mb-2">{title}</h3>
      {subtitle && <p className="text-gray-500 mb-6">{subtitle}</p>}
      {action}
    </div>
  )
}

// Error state
export function ErrorState({ message, onRetry }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">⚠️</div>
      <p className="text-gray-600 mb-4">{message || 'Что-то пошло не так'}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">Попробовать снова</button>
      )}
    </div>
  )
}
