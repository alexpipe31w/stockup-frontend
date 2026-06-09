interface SectionHeaderProps {
  label: string;
  labelColor?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
}

export default function SectionHeader({
  label,
  labelColor = 'text-white/30',
  title,
  subtitle,
  centered = true,
}: SectionHeaderProps) {
  return (
    <div className={`mb-12 lg:mb-16 ${centered ? 'text-center' : ''}`}>
      <span className={`section-label ${labelColor} block mb-4`}>{label}</span>
      <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-white leading-tight tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg text-white/55 max-w-xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
