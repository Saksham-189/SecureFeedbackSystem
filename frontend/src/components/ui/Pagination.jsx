import { cn } from "../../utils/cn";

/**
 * Pagination — page navigation with prev/next and numbered buttons.
 */
const Pagination = ({
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    className = "",
}) => {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    const pages = getVisiblePages();

    return (
        <nav
            className={cn("flex items-center justify-center gap-1.5", className)}
            aria-label="Pagination"
        >
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="
                    px-3 py-2 rounded-xl text-sm font-medium
                    text-slate-600 hover:bg-blue-50
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-colors
                "
                aria-label="Previous page"
            >
                ←
            </button>

            {pages[0] > 1 && (
                <>
                    <PageButton
                        page={1}
                        active={currentPage === 1}
                        onClick={onPageChange}
                    />
                    {pages[0] > 2 && (
                        <span className="px-2 text-slate-400">…</span>
                    )}
                </>
            )}

            {pages.map((page) => (
                <PageButton
                    key={page}
                    page={page}
                    active={page === currentPage}
                    onClick={onPageChange}
                />
            ))}

            {pages[pages.length - 1] < totalPages && (
                <>
                    {pages[pages.length - 1] < totalPages - 1 && (
                        <span className="px-2 text-slate-400">…</span>
                    )}
                    <PageButton
                        page={totalPages}
                        active={currentPage === totalPages}
                        onClick={onPageChange}
                    />
                </>
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="
                    px-3 py-2 rounded-xl text-sm font-medium
                    text-slate-600 hover:bg-blue-50
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-colors
                "
                aria-label="Next page"
            >
                →
            </button>
        </nav>
    );
};

function PageButton({ page, active, onClick }) {
    return (
        <button
            onClick={() => onClick(page)}
            aria-current={active ? "page" : undefined}
            className={cn(
                "w-9 h-9 rounded-xl text-sm font-medium transition-all",
                active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-blue-50"
            )}
        >
            {page}
        </button>
    );
}

export default Pagination;
