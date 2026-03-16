export default function Pagination({ page, setPage, total, perPage = 20 }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / perPage));
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const btn = (label, target, active = false, disabled = false) => (
    <button
      key={label}
      onClick={() => !disabled && setPage(target)}
      disabled={disabled}
      className={`min-w-[36px] h-9 px-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
        active
          ? 'bg-indigo-600 text-white'
          : disabled
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center justify-between mt-6">
      <p className="text-sm text-gray-500">
        Page <span className="font-medium text-gray-900">{page}</span> of{' '}
        <span className="font-medium text-gray-900">{totalPages}</span>
        {total != null && (
          <span className="ml-1">
            ({total.toLocaleString()} total)
          </span>
        )}
      </p>
      <div className="flex items-center gap-1">
        {btn('«', 1, false, page === 1)}
        {btn('‹', page - 1, false, page === 1)}
        {getPages().map((p, i) =>
          p === '...'
            ? <span key={`dots-${i}`} className="px-1.5 text-gray-400 text-sm">...</span>
            : btn(String(p), p, p === page)
        )}
        {btn('›', page + 1, false, page === totalPages)}
        {btn('»', totalPages, false, page === totalPages)}
      </div>
    </div>
  );
}
