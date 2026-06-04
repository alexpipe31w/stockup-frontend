interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 32, showText = true, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="gradient-brand rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="#0A0A0F" />
        </svg>
      </div>
      {showText && (
        <span className="font-bold text-txt-primary tracking-tight" style={{ fontSize: size * 0.55 }}>
          Stockup
        </span>
      )}
    </div>
  );
}
