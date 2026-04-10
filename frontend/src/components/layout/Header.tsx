import { BookOpen } from "lucide-react";

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E2E8F0]">
      <div className="flex items-center gap-2">
        <BookOpen className="text-[#3B82F6]" size={24} />
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">StudyGen</h1>
          <p className="text-[#64748B] text-sm">Transforme aulas em material de estudo</p>
        </div>
      </div>
    </header>
  );
}
