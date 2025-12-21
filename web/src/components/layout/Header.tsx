

interface HeaderProps {}

export function Header({}: HeaderProps) {
  return (
    <header className="bg-white border-b border-neutral-200 px-8 py-6 flex-shrink-0">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">CPU Monitoring Dashboard</h1>
          <p className="text-neutral-500 mt-1">Monitor performance metrics across all customer accounts</p>
        </div>
      </div>
    </header>
  );
}
