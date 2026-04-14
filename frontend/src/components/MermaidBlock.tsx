import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

let mermaidCounter = 0;

export default function MermaidBlock({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      themeVariables: isDark
        ? { primaryColor: '#818cf8', primaryTextColor: '#ffffff', primaryBorderColor: '#6366f1', lineColor: '#64748b', secondaryColor: '#1e293b', tertiaryColor: '#2e1065', noteBkgColor: '#1e1b4b', noteTextColor: '#e2e8f0', fontSize: '14px' }
        : { primaryColor: '#6366f1', primaryTextColor: '#ffffff', primaryBorderColor: '#4f46e5', lineColor: '#94a3b8', secondaryColor: '#f1f5f9', tertiaryColor: '#ede9fe', noteBkgColor: '#eff6ff', noteTextColor: '#1e293b', fontSize: '14px' },
      flowchart: { curve: 'basis', padding: 15 },
      mindmap: { padding: 20 },
    });
    const id = 'mermaid-' + (++mermaidCounter);
    mermaid.render(id, chart.trim()).then(({ svg }) => setSvg(svg)).catch(() => setError(true));
  }, [chart]);

  if (error) {
    return <pre className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 text-sm overflow-x-auto"><code>{chart}</code></pre>;
  }

  return <div ref={containerRef} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl my-4 flex justify-center [&>svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
