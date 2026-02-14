'use client';

type Props = {
  id: string;
  alt?: string;
  className?: string; // optional, falls du später Varianten willst
};

export default function ThemeThumb({ id, alt = '', className = '' }: Props) {
  return (
    <div className={`h-10 w-16 overflow-hidden rounded-lg bg-slate-100 ${className}`}>
      <img
        src={`/images/themes/${id}.jpg`}
        alt={alt}
        className="h-full w-full object-cover object-center"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = '/images/demo.jpg';
        }}
      />
    </div>
  );
}
