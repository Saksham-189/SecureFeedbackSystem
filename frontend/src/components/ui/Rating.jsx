import { useState } from "react";
import { cn } from "../../utils/cn";

/**
 * Rating — interactive star rating with hover preview.
 *
 * @param {number} value - current rating (1-5)
 * @param {function} onChange - callback with new rating
 * @param {boolean} readOnly - display mode (no interaction)
 * @param {number} max - maximum stars
 */
const Rating = ({
    value = 0,
    onChange,
    readOnly = false,
    max = 5,
    size = "md",
    className = "",
}) => {
    const [hoverValue, setHoverValue] = useState(0);

    const starSizes = {
        sm: "text-xl",
        md: "text-2xl",
        lg: "text-3xl",
    };

    return (
        <div
            className={cn("flex gap-1", className)}
            role="group"
            aria-label={`Rating: ${value} out of ${max}`}
        >
            {Array.from({ length: max }, (_, i) => {
                const starValue = i + 1;
                const isFilled = starValue <= (hoverValue || value);

                return (
                    <button
                        key={starValue}
                        type="button"
                        disabled={readOnly}
                        onClick={() => onChange?.(starValue)}
                        onMouseEnter={() => !readOnly && setHoverValue(starValue)}
                        onMouseLeave={() => !readOnly && setHoverValue(0)}
                        className={cn(
                            starSizes[size],
                            "transition-transform duration-150",
                            !readOnly && "hover:scale-125 cursor-pointer",
                            readOnly && "cursor-default"
                        )}
                        aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
                    >
                        <span className={isFilled ? "opacity-100" : "opacity-30"}>
                            ⭐
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default Rating;
