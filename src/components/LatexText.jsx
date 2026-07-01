import React, { useEffect, useState } from 'react';

export default function LatexText({ text }) {
  const [katexReady, setKatexReady] = useState(typeof window !== 'undefined' && !!window.katex);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.katex) {
      setKatexReady(true);
      return;
    }

    // Cargar dinámicamente si por algún motivo no cargó desde index.html
    let scriptTag = document.getElementById('katex-cdn-js');
    if (!scriptTag) {
      const linkTag = document.createElement('link');
      linkTag.rel = 'stylesheet';
      linkTag.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
      document.head.appendChild(linkTag);

      scriptTag = document.createElement('script');
      scriptTag.id = 'katex-cdn-js';
      scriptTag.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
      document.head.appendChild(scriptTag);
    }

    const interval = setInterval(() => {
      if (window.katex) {
        setKatexReady(true);
        clearInterval(interval);
      }
    }, 80);

    return () => clearInterval(interval);
  }, []);

  if (!text) return null;

  // Dividir por delimitadores LaTeX ($$...$$ o $...$)
  const parts = String(text).split(/(\$\$.+?\$\$|\$.+?\$)/g);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2);
          if (katexReady && window.katex) {
            try {
              const html = window.katex.renderToString(math, { displayMode: true, throwOnError: false });
              return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
            } catch {
              return <span key={index}>{part}</span>;
            }
          }
          return <span key={index} style={{ fontStyle: 'italic', fontFamily: 'serif' }}>{part}</span>;
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          if (katexReady && window.katex) {
            try {
              const html = window.katex.renderToString(math, { displayMode: false, throwOnError: false });
              return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
            } catch {
              return <span key={index}>{part}</span>;
            }
          }
          return <span key={index} style={{ fontStyle: 'italic', fontFamily: 'serif' }}>{part}</span>;
        } else {
          return <span key={index}>{part}</span>;
        }
      })}
    </span>
  );
}
