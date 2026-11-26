import React, { useEffect, useState } from 'react';
import { Package } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F3F1EC] text-neutral-500 p-3 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package className="w-6 h-6 mb-1.5 stroke-[1.5]" />
        <span className="text-[11px] font-medium text-center line-clamp-2 max-w-[180px]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
