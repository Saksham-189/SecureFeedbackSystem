import { useEffect, useCallback } from "react";
import { cn } from "../../utils/cn";

const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
};

/**
 * Modal — accessible overlay dialog.
 *
 * - Traps focus conceptually (closes on Escape)
 * - Prevents body scroll when open
 * - Click-outside to close
 * - Animated entry/exit
 */
const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = "md",
    footer = null,
}) => {
    const handleEscape = useCallback(
        (e) => {
            if (e.key === "Escape") onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Dialog */}
            <div
                className={cn(
                    "relative w-full bg-white rounded shadow-2xl",
                    "border border-blue-100",
                    "animate-scale-in",
                    "max-h-[90vh] flex flex-col",
                    sizeClasses[size]
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="
                            w-8 h-8 rounded-xl
                            flex items-center justify-center
                            text-slate-400 hover:text-slate-600
                            hover:bg-slate-100 transition-colors
                        "
                        aria-label="Close dialog"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 overflow-y-auto flex-1">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
