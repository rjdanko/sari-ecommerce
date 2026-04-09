'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

const sizeMap = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export default function StarRating({
  rating,
  maxStars = 5,
  size = 'md',
  interactive = false,
  onChange,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  const displayRating = interactive && hovered > 0 ? hovered : rating;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxStars }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= Math.round(displayRating);

        return (
          <button
            key={starValue}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starValue)}
            onMouseEnter={() => interactive && setHovered(starValue)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={cn(
              'p-0 border-0 bg-transparent transition-transform duration-100',
              interactive && 'hover:scale-110 cursor-pointer',
              !interactive && 'cursor-default',
            )}
          >
            <Star
              className={cn(
                sizeMap[size],
                filled
                  ? 'text-sari-400 fill-sari-400'
                  : 'text-gray-200 fill-gray-200',
                interactive && hovered >= starValue && 'text-sari-300 fill-sari-300',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
