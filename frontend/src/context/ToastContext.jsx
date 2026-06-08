/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from "react";

const ToastContext = createContext();

const TOAST_VARIANTS = {
    success: {
        bg: "bg-white border-emerald-300",
        text: "text-emerald-800",
        icon: "OK",
        iconBg: "bg-emerald-100 text-emerald-700",
    },
    error: {
        bg: "bg-white border-red-300",
        text: "text-red-800",
        icon: "!",
        iconBg: "bg-red-100 text-red-600",
    },
    warning: {
        bg: "bg-white border-amber-300",
        text: "text-amber-800",
        icon: "!",
        iconBg: "bg-amber-100 text-amber-600",
    },
    info: {
        bg: "bg-white border-blue-300",
        text: "text-blue-800",
        icon: "i",
        iconBg: "bg-blue-100 text-blue-600",
    },
};

const TOAST_DURATION = 4000;
let toastIdCounter = 0;

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef({});

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.map((toast) => (
            toast.id === id ? { ...toast, exiting: true } : toast
        )));

        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
            if (timersRef.current[id]) {
                clearTimeout(timersRef.current[id]);
                delete timersRef.current[id];
            }
        }, 200);
    }, []);

    const addToast = useCallback((message, variant = "info", duration = TOAST_DURATION) => {
        const id = ++toastIdCounter;
        setToasts((prev) => [...prev, { id, message, variant, exiting: false }]);
        timersRef.current[id] = setTimeout(() => removeToast(id), duration);
        return id;
    }, [removeToast]);

    const toast = useMemo(() => ({
        success: (message) => addToast(message, "success"),
        error: (message) => addToast(message, "error"),
        warning: (message) => addToast(message, "warning"),
        info: (message) => addToast(message, "info"),
    }), [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast, toast }}>
            {children}
            <div
                className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full"
                aria-live="polite"
                aria-label="Notifications"
            >
                {toasts.map((toastItem) => {
                    const style = TOAST_VARIANTS[toastItem.variant] || TOAST_VARIANTS.info;
                    return (
                        <div
                            key={toastItem.id}
                            role="alert"
                            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded border shadow-sm ${style.bg} ${style.text} ${toastItem.exiting ? "animate-fade-out-down" : "animate-fade-in-up"}`}
                        >
                            <span className={`flex-shrink-0 min-w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold px-1 ${style.iconBg}`}>
                                {style.icon}
                            </span>
                            <p className="text-sm font-medium flex-1 pt-0.5">{toastItem.message}</p>
                            <button
                                onClick={() => removeToast(toastItem.id)}
                                className="flex-shrink-0 mt-0.5 text-current opacity-50 hover:opacity-100 transition-opacity text-lg leading-none"
                                aria-label="Dismiss notification"
                            >
                                x
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context;
};
