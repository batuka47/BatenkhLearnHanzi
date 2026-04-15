export default function Footer() {
  return (
    <footer className="border-t border-border bg-background py-4 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground tracking-tight">学</span>
          <span className="text-sm font-semibold text-foreground">LearnHanzi</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Made for Batenkh
        </p>
      </div>
    </footer>
  )
}