import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  ArrowRight,
  Copy,
  Download,
  Check,
  RotateCcw,
  BookOpen,
  Wand2,
  FileCode,
  Eye,
  Columns,
  Info,
  Mail,
} from 'lucide-react';
import { MarkdownView } from './MarkdownView';
import { DataDictionaryResult, DatasetSummary } from '../types';

interface MethodologyTabProps {
  notes: string;
  setNotes: (notes: string) => void;
  methodologyText: string;
  setMethodologyText: (text: string) => void;
  onGenerateMethodology: () => void;
  dictionary: DataDictionaryResult | null;
  fileSummary: DatasetSummary | null;
  onNavigateToWorkspace?: () => void;
  isLoading: boolean;
}

const TEMPLATE_NOTES = [
  {
    title: 'Clinical Imputation & Bounds',
    desc: 'Blood pressure & CEA biomarker rules',
    text: `1. Removed null values in 'age' by median imputation stratified by gender.
2. Blood pressure readings with systolic BP > 180 or < 80 were flagged as measurement artifacts and removed.
3. CEA biomarker missing lab values were marked as missing-at-random (MAR) and imputed via predictive mean matching (k=5).
4. Subject identifiers were hashed with SHA-256 for HIPAA/de-identification compliance.
5. All visit timestamps were normalized to ISO-8601 UTC.`,
  },
  {
    title: 'SaaS Churn & Financial Outliers',
    desc: 'Spend z-scores & ticket count scaling',
    text: `1. Account spend values were log-transformed (log1p) to normalize heavy-tailed right skew.
2. Handled extreme support tickets (> 3 standard deviations from mean) via 99th percentile winsorization.
3. Subscription tier was one-hot encoded into binary indicator vectors.
4. Churned status converted from string to binary boolean (1 = Churned, 0 = Active).
5. Excluded test accounts with tenure < 1 day.`,
  },
  {
    title: 'IoT Sensor Spikes & Drift',
    desc: 'Battery drops & calibration thresholds',
    text: `1. Filtered high particulate matter spikes (PM2.5 > 300 ug/m3) lasting < 2 consecutive readings as optical fog noise.
2. Corrected temperature and humidity readings where sensor battery voltage dropped below 3.65V using calibrated baseline offset.
3. Interpolated missing sensor pings with forward-fill limited to max 3 hours window.
4. Standardized all time stamps across UTC microsecond boundaries.`,
  },
];

export const MethodologyTab: React.FC<MethodologyTabProps> = ({
  notes,
  setNotes,
  methodologyText,
  setMethodologyText,
  onGenerateMethodology,
  dictionary,
  fileSummary,
  onNavigateToWorkspace,
  isLoading,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'notes' | 'preview'>('split');

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  const lineCount = notes ? notes.split('\n').length : 0;

  const handleCopyMethodology = () => {
    if (!methodologyText) return;
    navigator.clipboard.writeText(methodologyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!methodologyText) return;
    const filename = fileSummary
      ? `${fileSummary.filename.replace('.csv', '')}_data_cleaning_methodology.md`
      : 'data_cleaning_methodology.md';
    const blob = new Blob([methodologyText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleInjectDictionary = () => {
    if (!dictionary || !dictionary.columns) {
      alert('No data dictionary available. Please generate one in the Schema tab first.');
      return;
    }

    let injection = `\n\n### AI Schema Audit Recommendations (${fileSummary?.filename || 'Dataset'}):\n`;
    for (const col of dictionary.columns) {
      injection += `- [${col.risk_flag} Risk] ${col.column_name} (${col.inferred_type}): ${col.cleaning_recommendation}\n`;
    }

    setNotes(notes ? `${notes}${injection}` : injection.trim());
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Title & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Methodology & Preprocessing Log Writer
          </h2>
          <p className="text-sm text-gray-500">
            Synthesize informal data cleaning notes into peer-reviewed academic methodology prose.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'split' ? 'bg-white text-gray-900 font-semibold shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Split View"
            >
              <Columns size={13} />
              <span className="hidden md:inline">Split</span>
            </button>
            <button
              onClick={() => setViewMode('notes')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'notes' ? 'bg-white text-gray-900 font-semibold shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Raw Notes Only"
            >
              <FileCode size={13} />
              <span className="hidden md:inline">Notes</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                viewMode === 'preview' ? 'bg-white text-gray-900 font-semibold shadow-2xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Formal Methodology Preview"
            >
              <Eye size={13} />
              <span className="hidden md:inline">Methodology</span>
            </button>
          </div>

          {/* Primary Action Button: Crimson Red */}
          <button
            onClick={onGenerateMethodology}
            disabled={isLoading || !notes.trim()}
            className="flex items-center gap-2 bg-[#DC2626] hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold text-xs tracking-tight shadow-md shadow-red-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles size={16} />
            <span>{isLoading ? 'Formalizing Text...' : 'Formalize Methodology'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Preset Note Snippets */}
      <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <BookOpen size={13} className="text-[#DC2626]" />
            Quick Preprocessing Note Templates
          </span>
          <div className="flex items-center gap-2">
            {dictionary && (
              <button
                onClick={handleInjectDictionary}
                className="text-xs font-semibold text-[#DC2626] hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Wand2 size={12} />
                <span>Inject Dictionary Recommendations</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {TEMPLATE_NOTES.map((tmpl, idx) => (
            <button
              key={idx}
              onClick={() => setNotes(tmpl.text)}
              className="text-left p-2.5 rounded-xl bg-white border border-gray-200 hover:border-[#DC2626] hover:bg-red-50/30 transition-all cursor-pointer group shadow-2xs"
            >
              <div className="text-xs font-bold text-gray-900 group-hover:text-[#DC2626] truncate">
                {tmpl.title}
              </div>
              <div className="text-[11px] text-gray-500 truncate">{tmpl.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div
        className={`grid gap-6 ${
          viewMode === 'split'
            ? 'grid-cols-1 lg:grid-cols-2'
            : 'grid-cols-1'
        } min-h-[580px]`}
      >
        {/* LEFT PANE: Raw Notes Editor */}
        {(viewMode === 'split' || viewMode === 'notes') && (
          <div className="flex flex-col bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
            {/* Pane Header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Raw Cleaning Notes & Lab Logs
                </h3>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-gray-400 font-mono">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{lineCount} lines</span>
                {notes && (
                  <button
                    onClick={() => setNotes('')}
                    className="text-gray-400 hover:text-red-600 transition-colors ml-1 cursor-pointer"
                    title="Clear notes"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Textarea */}
            <div className="flex-1 p-5 relative flex flex-col bg-gray-50/30">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter informal data cleaning steps, e.g.:
- Dropped null rows in column 'age'
- Log-transformed income to handle extreme outliers
- Normalized dates to ISO-8601
- Removed duplicate patient IDs..."
                className="w-full flex-1 min-h-[460px] p-4 text-xs font-mono text-gray-800 bg-white border border-gray-200 rounded-xl outline-none resize-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] leading-relaxed shadow-inner"
              />

              <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 px-1">
                <span>Supports bullet lists, rough scripts, or informal notes.</span>
                <span>AI generates structured academic subsections.</span>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT PANE: Academic Methodology Text */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className="flex flex-col bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
            {/* Pane Header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Formal Methodology Section (Publication-Ready)
                </h3>
              </div>

              {methodologyText && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyMethodology}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                    title="Copy methodology to clipboard"
                  >
                    {copied ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} className="text-gray-500" />
                    )}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleDownloadMarkdown}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                    title="Download as .md file"
                  >
                    <Download size={12} className="text-gray-500" />
                    <span>.md</span>
                  </button>

                  {onNavigateToWorkspace && (
                    <>
                      <button
                        onClick={onNavigateToWorkspace}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                        title="Publish to Google Docs in Workspace Hub"
                      >
                        <FileText size={12} className="text-blue-600" />
                        <span>Google Docs</span>
                      </button>

                      <button
                        onClick={onNavigateToWorkspace}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                        title="Email via Gmail in Workspace Hub"
                      >
                        <Mail size={12} className="text-red-600" />
                        <span>Gmail</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Output Container */}
            <div className="flex-1 p-6 overflow-y-auto max-h-[560px] bg-white">
              {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-3 border-gray-200 border-t-[#DC2626] rounded-full animate-spin" />
                  <p className="text-xs font-semibold text-[#DC2626] animate-pulse">
                    Synthesizing formal academic prose...
                  </p>
                </div>
              ) : methodologyText ? (
                <div className="prose prose-sm max-w-none text-gray-800">
                  <MarkdownView content={methodologyText} />
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-3 text-gray-400">
                  <FileText size={36} className="text-gray-200" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-600">
                      Academic methodology text will appear here.
                    </p>
                    <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                      Write or paste your cleaning notes on the left, then click{' '}
                      <strong className="text-[#DC2626]">"Formalize Methodology"</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MethodologyTab;
