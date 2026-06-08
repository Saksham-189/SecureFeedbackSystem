import { cn } from "../../utils/cn";
import Skeleton from "./Skeleton";

/**
 * Table — responsive data table with loading, empty, and error states.
 *
 * @param {Array} columns - [{ key, label, render?, className? }]
 * @param {Array} data - row objects
 * @param {boolean} loading
 * @param {string} emptyMessage
 * @param {function} onRowClick - optional row click handler
 */
const Table = ({
    columns = [],
    data = [],
    loading = false,
    emptyMessage = "No data available",
    onRowClick,
    className = "",
}) => {
    if (loading) {
        return <Skeleton.Table rows={5} cols={columns.length || 4} />;
    }

    return (
        <div className={cn("overflow-x-auto", className)}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-[#c6c6cd] bg-[#f2f4f6]">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={cn(
                                    "text-left px-4 py-3 sf-label",
                                    col.className
                                )}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="text-center py-12 text-[#45464d]"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, index) => (
                            <tr
                                key={row.id || index}
                                onClick={() => onRowClick?.(row)}
                                className={cn(
                                    "border-b border-[#c6c6cd] last:border-0",
                                    "hover:bg-[#f7f9fb] transition-colors",
                                    onRowClick && "cursor-pointer"
                                )}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={cn(
                                            "px-4 py-3.5 text-[#191c1e]",
                                            col.className
                                        )}
                                    >
                                        {col.render
                                            ? col.render(row[col.key], row)
                                            : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Table;
