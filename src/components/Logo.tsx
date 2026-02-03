/**
 * Logo – Browo Koordinator
 * Zeigt das Logo-Bild (und optional Text). Nutzt /logo.png aus public/ für zuverlässige Auslieferung.
 */
const LOGO_SRC = '/logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function Logo({ size = 'md', showText = true }: LogoProps) {
  const imageHeights = {
    sm: 'h-10',
    md: 'h-12',
    lg: 'h-16',
  };
  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <img
        src={LOGO_SRC}
        alt="Browo Koordinator"
        className={`${imageHeights[size]} w-auto max-w-[200px] object-contain object-center flex-shrink-0`}
        loading="eager"
        decoding="async"
      />
      {showText && (
        <span className={`font-semibold text-[#101828] ${textSizes[size]} whitespace-nowrap`}>
          Browo Koordinator
        </span>
      )}
    </div>
  );
}
