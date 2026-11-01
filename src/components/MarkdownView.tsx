import React from 'react';

interface MarkdownViewProps {
  content: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-sm italic">
        No content generated yet. Provide cleaning notes and click "Formalize Text".
      </div>
    );
  }

  // Parse lines into structured elements
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const formatInline = (text: string): React.ReactNode => {
    // Parse bold, italic, code inline
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    // Simple parser for **bold** and `code`
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = regex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(remaining.substring(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={keyIdx++} className="font-semibold text-gray-900">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={keyIdx++}
            className="px-1.5 py-0.5 rounded bg-red-50 text-[#DC2626] font-mono text-xs border border-red-100"
          >
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em key={keyIdx++} className="italic text-gray-700">
            {token.slice(1, -1)}
          </em>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < remaining.length) {
      parts.push(remaining.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="my-3 p-4 rounded-lg bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto border border-gray-800"
          >
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-base font-bold text-gray-900 mt-5 mb-2 pb-1 border-b border-gray-100 flex items-center gap-2"
        >
          <span className="w-1.5 h-4 bg-[#DC2626] rounded-full inline-block" />
          {formatInline(trimmed.substring(4))}
        </h3>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-lg font-bold text-gray-900 mt-6 mb-2 pb-1.5 border-b border-gray-200 flex items-center gap-2"
        >
          <span className="w-2 h-4.5 bg-[#DC2626] rounded inline-block" />
          {formatInline(trimmed.substring(3))}
        </h2>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-xl font-extrabold text-gray-900 mt-4 mb-3 pb-2 border-b-2 border-red-100"
        >
          {formatInline(trimmed.substring(2))}
        </h1>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={`li-${i}`} className="ml-5 list-disc text-sm text-gray-700 leading-relaxed my-1 pl-1">
          {formatInline(trimmed.substring(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s(.*)$/);
      elements.push(
        <li key={`num-${i}`} className="ml-5 list-decimal text-sm text-gray-700 leading-relaxed my-1 pl-1">
          {formatInline(match ? match[2] : trimmed)}
        </li>
      );
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-3 pl-4 border-l-3 border-[#DC2626] bg-red-50/40 py-2 pr-3 text-sm italic text-gray-800 rounded-r"
        >
          {formatInline(trimmed.substring(2))}
        </blockquote>
      );
    } else if (trimmed.length === 0) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
    } else {
      elements.push(
        <p key={`p-${i}`} className="text-sm text-gray-800 leading-relaxed my-2">
          {formatInline(trimmed)}
        </p>
      );
    }
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <pre
        key="code-unclosed"
        className="my-3 p-4 rounded-lg bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto"
      >
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-0.5 font-sans leading-relaxed text-gray-800">{elements}</div>;
};

export default MarkdownView;
