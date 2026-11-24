import { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';

interface BagImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function BagImage({ src, alt, className = '', fallbackLabel }: BagImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#eef3ec] to-[#dde5db] text-[#2f4a3d] select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <ShoppingBag className="w-8 h-8 opacity-65 mb-1.5" strokeWidth={1.5} />
        {fallbackLabel && (
          <span className="text-[11px] font-medium text-[#69766d] px-3 text-center line-clamp-1">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
      loading="lazy"
    />
  );
}
