import React, { useState } from 'react';
import { Star } from 'lucide-react';

type RatingStarsProps = {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
};

/**
 * 5-star rating control. Click a star to set; click the active star again to clear.
 * Hovering previews the prospective rating.
 */
export default function RatingStars({ value, onChange, size = 14, readOnly = false, className = '' }: RatingStarsProps) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      onMouseLeave={() => setHover(null)}
      role={readOnly ? undefined : 'radiogroup'}
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= display;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(star)}
            onClick={(event) => {
              if (readOnly || !onChange) return;
              event.stopPropagation();
              onChange(value === star ? 0 : star);
            }}
            className={`${readOnly ? 'cursor-default' : 'cursor-pointer'} transition-colors duration-100 disabled:cursor-default`}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            tabIndex={readOnly ? -1 : 0}
          >
            <Star
              size={size}
              strokeWidth={2}
              className={filled ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}
            />
          </button>
        );
      })}
    </div>
  );
}
