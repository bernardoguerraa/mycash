export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Gradient mesh background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(20,184,166,0.08),transparent_50%)]" />
      <div className="w-full max-w-sm relative z-10">
        {children}
      </div>
    </div>
  )
}
