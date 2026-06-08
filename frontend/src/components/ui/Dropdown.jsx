import { useState, useRef, useEffect } from "react";
import { cn } from "../../utils/cn";

/**
 * Dropdown — click-triggered popover menu.
 * Closes on outside click or Escape key.
 *
 * @param {ReactNode} trigger - the button/element that opens the dropdown
 * @param {Array} items - [{ label, onClick, icon?, danger? }]
 * @param {string} align - "left" | "right"
 */
const Dropdown = ({
    trigger,
    items = [],
    align = "right",
    className = "",
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };

        const handleEscape = (e) => {
            if (e.key === "Escape") setOpen(false);
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("keydown", handleEscape);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open]);

    return (
        <div ref={ref} className={cn("relative inline-block", className)}>
            <div onClick={() => setOpen(!open)}>
                {trigger}
            </div>

            {open && (
                <div
                    className={cn(
                        "absolute top-full mt-2 z-50",
                        "min-w-[180px] bg-white rounded",
                        "border border-[#c6c6cd] shadow-sm",
                        "py-1.5 animate-scale-in",
                        align === "right" ? "right-0" : "left-0"
                    )}
                    role="menu"
                >
                    {items.map((item, i) =>
                        item.divider ? (
                            <div
                                key={i}
                                className="border-t border-[#c6c6cd] my-1"
                            />
                        ) : (
                            <button
                                key={i}
                                role="menuitem"
                                onClick={() => {
                                    item.onClick?.();
                                    setOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-2.5",
                                    "px-4 py-2.5 text-sm text-left",
                                    "transition-colors",
                                    item.danger
                                        ? "text-red-700 hover:bg-red-50"
                                        : "text-[#191c1e] hover:bg-[#f7f9fb]"
                                )}
                            >
                                {item.icon && (
                                    <span className="text-base flex-shrink-0">
                                        {item.icon}
                                    </span>
                                )}
                                {item.label}
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default Dropdown;
