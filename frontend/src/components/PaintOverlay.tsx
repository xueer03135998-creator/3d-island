export default function PaintOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0) 62%, rgba(120,170,230,0.16) 100%)' }}
      />
    </div>
  );
}
