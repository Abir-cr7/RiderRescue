/** The slanted "R" mark from the RiderRescue logo, redrawn as SVG so it stays crisp at any size. */
export function LogoMark({ className = 'h-9', fg = '#0F172A', bar = '#EF4444' }: { className?: string; fg?: string; bar?: string }) {
  return (
    <svg viewBox="0 0 273 319" className={className} role="img" aria-label="RiderRescue">
      <path
        fill={fg}
        fillRule="evenodd"
        d="M65 0H175C235 0 273 28 273 75C273 125 240 168 193 184L255 319H186L135 194H86L61 319H0Z
           M116 49H160C196 49 214 70 214 95C214 125 190 145 150 145H95Z"
      />
      <path fill={bar} d="M49 79H109L101 114H42Z" />
    </svg>
  );
}

/** Mark + serif wordmark + MOVE ON tagline (crimson, per the design system). */
export function Brand({ inverted = false, size = 'md' }: { inverted?: boolean; size?: 'md' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <span className="inline-flex items-center gap-3">
      <LogoMark className={lg ? 'h-14' : 'h-8'} fg={inverted ? '#FFFFFF' : '#0F172A'} />
      <span className="flex flex-col leading-none">
        <span className={`font-brand ${lg ? 'text-4xl' : 'text-2xl'} ${inverted ? 'text-white' : 'text-ink'}`}>RiderRescue</span>
        <span className={`mt-1 font-semibold tracking-wide text-crimson ${lg ? 'text-sm' : 'text-[11px]'}`}>MOVE ON</span>
      </span>
    </span>
  );
}
