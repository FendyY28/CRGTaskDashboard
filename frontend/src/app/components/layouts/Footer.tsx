export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
        
        <p className="text-xs font-medium text-gray-500">
          © {currentYear} <span className="font-bold" style={{ color: "#36A39D" }}>BSI</span> - Consumer Risk Group
        </p>

        <div className="flex items-center gap-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Project Monitoring System
          </p>
          <span className="hidden md:inline-block h-1 w-1 rounded-full bg-gray-300"></span>
          <p className="text-[10px] font-mono font-bold tracking-wider text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
            v1.0.0
          </p>
        </div>
        
      </div>
    </footer>
  );
}
