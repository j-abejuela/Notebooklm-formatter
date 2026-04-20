/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { 
  ClipboardCopy, 
  Check, 
  FileText, 
  Eraser, 
  Sparkles,
  Type,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const formatTextLocally = () => {
    if (!input.trim()) return;

    const lines = input.split('\n');
    const processedLines: string[] = [];
    let inList = false;

    // Common NotebookLM meta-text to filter out
    const filterPhrases = [
      "I have started generating",
      "You will be able to access them",
      "help you review!",
      "Here is a detailed text reviewer",
      "covering the core concepts",
      "from your new source document",
      "_CONTEXT_"
    ];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Skip empty lines at the start or if they are just meta-text
      if (!line) {
        processedLines.push('');
        continue;
      }

      if (filterPhrases.some(phrase => line.includes(phrase))) {
        continue;
      }

      // 1. Handle TOPIC as H1
      if (line.toUpperCase().includes('TOPIC:')) {
        const topic = line.replace(/###|TOPIC:|\*\*/gi, '').trim();
        processedLines.push(`# ${topic}`);
        continue;
      }

      // 2. Handle Major Sections (e.g., **1. What is...**)
      // Regex matches lines starting with ** followed by a number and period
      if (line.match(/^\*\*\d+\./)) {
        const section = line.replace(/\*\*/g, '').trim();
        processedLines.push(`## ${section}`);
        continue;
      }

      // 3. Handle Sub-sections or bold headers that aren't numbered
      if (line.startsWith('###')) {
        processedLines.push(line);
        continue;
      }

      // 4. Handle Lists
      if (line.startsWith('*') || line.startsWith('-')) {
        // Clean up the bullet and preserve the rest
        // NotebookLM often uses *   **Key:** Value
        processedLines.push(line);
        continue;
      }

      // Default: just keep the line but clean up double bolding if any
      processedLines.push(line);
    }

    const result = processedLines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .trim();

    setOutput(result);
  };

  const handleCopy = async () => {
    if (!outputRef.current) return;

    try {
      // We want to copy the exact HTML that the browser renders, including the KaTeX 
      // visual elements. When manually selecting text, the browser handles the hidden 
      // elements intelligently. We simulate this by letting the browser's Selection API
      // handle the extraction into the clipboard, rather than forcibly grabbing raw innerHTML.
      
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(outputRef.current);
      
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Use the execCommand 'copy' which natively handles the complex DOM
        // structure of KaTeX much better than constructing a Blob manually.
        document.execCommand('copy');
        
        // Clean up the selection
        selection.removeAllRanges();
      }

      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy rich text:', err);
      // Fallback to plain text
      await navigator.clipboard.writeText(output);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const clearAll = () => {
    setInput('');
    setOutput('');
  };

  const [activeTab, setActiveTab] = useState<'input' | 'output'>('input');

  return (
    <div className="h-screen flex flex-col bg-bg text-text-main font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 md:px-8 h-16 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="text-primary">
            <FileText className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="font-bold text-lg md:text-xl tracking-tight text-primary uppercase truncate">DocFormat Local</h1>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <div className="bg-green-50 text-green-700 text-[0.7rem] px-3 py-1 rounded-full font-bold border border-green-100 flex items-center gap-1.5">
            <Zap className="w-3 h-3 fill-current" />
            LOCAL
          </div>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex border-b border-border bg-white shrink-0">
        <button 
          onClick={() => setActiveTab('input')}
          className={cn(
            "flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2",
            activeTab === 'input' ? "border-primary text-primary" : "border-transparent text-text-muted"
          )}
        >
          Source
        </button>
        <button 
          onClick={() => setActiveTab('output')}
          className={cn(
            "flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2",
            activeTab === 'output' ? "border-primary text-primary" : "border-transparent text-text-muted"
          )}
        >
          Preview
        </button>
      </div>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden relative">
        {/* Input Section */}
        <section className={cn(
          "p-4 md:p-6 flex flex-col gap-4 border-r border-border overflow-hidden transition-all",
          activeTab === 'input' ? "flex" : "hidden lg:flex"
        )}>
          <div className="flex items-center justify-between shrink-0">
            <div className="flex flex-col">
              <h2 className="text-[0.875rem] font-semibold uppercase tracking-wider text-text-muted">
                NotebookLM Source
              </h2>
              <span className="text-[0.75rem] text-text-muted">Paste your distorted text here</span>
            </div>
          </div>
          <div className="relative flex-1 overflow-hidden flex flex-col">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your NotebookLM text here..."
              className="flex-1 w-full p-4 md:p-6 bg-white border border-border rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none font-sans text-[0.9rem] leading-relaxed text-text-muted"
            />
            <div className="absolute bottom-4 left-4">
              <button
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    setInput(text);
                  } catch (err) {
                    console.error('Failed to read clipboard:', err);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-md text-[0.875rem] font-semibold text-text-main hover:bg-gray-50 active:scale-95 shadow-sm transition-all"
              >
                <ClipboardCopy className="w-4 h-4" />
                Paste
              </button>
            </div>
          </div>
        </section>

        {/* Output Section */}
        <section className={cn(
          "p-4 md:p-6 flex flex-col gap-4 overflow-hidden transition-all",
          activeTab === 'output' ? "flex" : "hidden lg:flex"
        )}>
          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-[0.875rem] font-semibold uppercase tracking-wider text-text-muted">
              Word-Ready Preview
            </h2>
            <div className="hidden sm:flex gap-2 text-text-muted text-[0.7rem] font-medium italic">
              Headings & lists auto-detected
            </div>
          </div>
          
          <div className="flex-1 bg-[#D1D5DB] rounded-lg p-4 md:p-8 overflow-hidden flex justify-center">
            <div className="w-full max-w-[600px] h-full overflow-hidden">
              {!output && (
                <div className="w-full h-full bg-white shadow-lg flex flex-col items-center justify-center text-text-muted gap-4 p-8 md:p-12 text-center">
                  <div className="w-12 h-12 md:w-16 h-16 bg-bg rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 md:w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-main">Ready to Process</p>
                    <p className="text-sm">Paste text on the left and click "Reformat Locally".</p>
                  </div>
                </div>
              )}

              {output && (
                <div className="word-page" ref={outputRef}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                    {output}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Toolbar Footer */}
      <footer className="bg-white border-t border-border px-4 md:px-8 py-3 md:h-16 flex flex-wrap items-center justify-end gap-2 md:gap-3 shrink-0">
        <button 
          onClick={clearAll}
          className="flex-1 sm:flex-none px-4 py-2 md:px-5 md:py-2.5 border border-border rounded-md text-[0.875rem] font-semibold text-text-main hover:bg-gray-50 transition-all"
        >
          Clear
        </button>
        <button
          onClick={() => {
            formatTextLocally();
            if (window.innerWidth < 1024) setActiveTab('output');
          }}
          disabled={!input.trim()}
          className={cn(
            "flex-[2] sm:flex-none flex items-center justify-center gap-2 px-4 py-2 md:px-6 md:py-2.5 rounded-md font-bold text-[0.875rem] transition-all shadow-sm",
            !input.trim() 
              ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
              : "bg-primary text-white hover:opacity-90 active:scale-95"
          )}
        >
          <Zap className="w-4 h-4" />
          Reformat
        </button>
        {output && (
          <button
            onClick={handleCopy}
            className={cn(
              "w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 md:px-6 md:py-2.5 rounded-md font-bold text-[0.875rem] transition-all shadow-sm",
              isCopied 
                ? "bg-green-600 text-white" 
                : "bg-primary text-white hover:opacity-90 active:scale-95"
            )}
          >
            {isCopied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
            {isCopied ? 'Copied!' : 'Copy for Word'}
          </button>
        )}
      </footer>
    </div>
  );
}
