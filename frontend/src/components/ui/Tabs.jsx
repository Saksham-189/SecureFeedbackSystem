import { cn } from "../../utils/cn";

/**
 * Tabs — accessible tabbed content with role-based ARIA attributes.
 *
 * @param {Array} tabs - [{ key, label, content?, icon? }]
 * @param {string} activeTab - currently active tab key
 * @param {function} onTabChange - callback with tab key
 * @param {ReactNode} children - rendered below tabs (alternative to tab.content)
 */
const Tabs = ({
    tabs = [],
    activeTab,
    onTabChange,
    children,
    className = "",
}) => {
    return (
        <div className={className}>
            <div
                className="flex gap-1 border-b border-slate-200 overflow-x-auto"
                role="tablist"
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        role="tab"
                        aria-selected={activeTab === tab.key}
                        onClick={() => onTabChange(tab.key)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3",
                            "text-sm font-medium whitespace-nowrap",
                            "border-b-2 -mb-px transition-all duration-200",
                            activeTab === tab.key
                                ? "border-blue-600 text-blue-700"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        )}
                    >
                        {tab.icon && <span>{tab.icon}</span>}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div role="tabpanel" className="pt-4">
                {children ||
                    tabs.find((t) => t.key === activeTab)?.content}
            </div>
        </div>
    );
};

export default Tabs;
