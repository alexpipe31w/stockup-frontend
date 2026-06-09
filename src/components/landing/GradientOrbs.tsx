export default function GradientOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <div
        className="absolute animate-orb-1"
        style={{
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,255,0,0.04) 0%, transparent 70%)',
          filter: 'blur(100px)', top: '-10%', left: '-10%',
        }}
      />
      <div
        className="absolute animate-orb-2"
        style={{
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,255,0,0.03) 0%, transparent 70%)',
          filter: 'blur(80px)', bottom: '-5%', right: '-5%',
        }}
      />
    </div>
  );
}
