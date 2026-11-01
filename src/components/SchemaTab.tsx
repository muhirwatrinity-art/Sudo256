import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  FileText,
  RotateCw,
  Info,
  ChevronRight,
  Database,
  ArrowUpRight,
  FileSpreadsheet,
} from 'lucide-react';
import { DataDictionaryResult, DatasetSummary, RiskLevel, ColumnDictionary } from '../types';

interface SchemaTabProps {
  dictionary: DataDictionaryResult | null;
  fileSummary: DatasetSummary | null;
  onAnalyzeSchema: () => void;
  onNavigateToUpload: () => void;
  onTransferToMethodology: (recommendationsText: string) => void;
  onNavigateToWorkspace?: () => void;
  isLoading: boolean;
}

export const SchemaTab: React.FC<SchemaTabProps> = ({
  dictionary,
  fileSummary,
  onAnalyzeSchema,
  onNavigateToUpload,
  onTransferToMethodology,
  onNavigateToWorkspace,
  isLoading,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [copied, setCopied] = useState(false);

  // If no dictionary yet
  if (!dictionary) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 text-[#DC2626] rounded-2xl flex items-center justify-center mx-auto border border-red-100 shadow-xs">
          <Database size={32} />
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Data Dictionary & Risk Assessment
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Generate an AI-inferred data dictionary with semantic type detection, variable descriptions, data cleaning recommendations, and risk severity flags.
          </p>
        </div>

        {fileSummary ? (
          <div className="p-6 bg-white border border-gray-200 rounded-2xl max-w-md mx-auto shadow-sm space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-xs">
                CSV
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{fileSummary.filename}</div>
                <div className="text-xs text-gray-500 font-mono">
                  {fileSummary.row_count} rows • {fileSummary.col_count} columns detected
                </div>
              </div>
            </div>

            <button
              onClick={onAnalyzeSchema}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-red-700 text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-md shadow-red-200 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={18} />
              <span>{isLoading ? 'Synthesizing Dictionary...' : 'Generate AI Data Dictionary'}</span>
            </button>
          </div>
        ) : (
          <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl max-w-md mx-auto bg-gray-50/50 space-y-4">
            <p className="text-xs text-gray-400">
              No dataset is currently loaded in the workspace.
            </p>
            <button
              onClick={onNavigateToUpload}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-300 text-xs font-semibold text-gray-800 hover:border-[#DC2626] hover:text-[#DC2626] transition-colors cursor-pointer shadow-2xs"
            >
              <span>Go to Dataset Library & Import</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Filter columns
  const filteredColumns = dictionary.columns.filter((col) => {
    const matchesRisk = riskFilter === 'ALL' || col.risk_flag === riskFilter;
    if (!matchesRisk) return false;
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      col.column_name.toLowerCase().includes(q) ||
      col.inferred_type.toLowerCase().includes(q) ||
      col.description.toLowerCase().includes(q) ||
      col.cleaning_recommendation.toLowerCase().includes(q)
    );
  });

  const highRiskColumns = dictionary.columns.filter((c) => c.risk_flag === 'HIGH');
  const medRiskColumns = dictionary.columns.filter((c) => c.risk_flag === 'MEDIUM');
  const lowRiskColumns = dictionary.columns.filter((c) => c.risk_flag === 'LOW');

  const qualityScorePct = Math.round(dictionary.overall_data_quality_score * 100);
  const qualityColor =
    qualityScorePct >= 80
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : qualityScorePct >= 60
      ? 'text-amber-600 bg-amber-50 border-amber-200'
      : 'text-[#DC2626] bg-red-50 border-red-200';

  const handleCopyMarkdown = () => {
    let md = `| Column Name | Inferred Type | Risk Level | Description | Recommended Cleaning |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const col of dictionary.columns) {
      md += `| \`${col.column_name}\` | ${col.inferred_type} | ${col.risk_flag} | ${col.description.replace(/\|/g, '-')} | ${col.cleaning_recommendation.replace(/\|/g, '-')} |\n`;
    }
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(dictionary, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileSummary?.filename.replace('.csv', '') || 'dataset'}_data_dictionary.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToMethodology = () => {
    let notesText = `### AI Audit & Recommended Cleaning Procedures:\n`;
    for (const col of dictionary.columns) {
      notesText += `- **${col.column_name}** (${col.inferred_type}, Risk: ${col.risk_flag}): ${col.cleaning_recommendation}\n`;
    }
    onTransferToMethodology(notesText);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner: Dataset Context & Quality Score Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Dataset Summary & Context */}
        <div className="lg:col-span-2 p-6 bg-white border border-gray-200 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Database size={13} className="text-[#DC2626]" />
              Inferred Dataset Context
            </span>
            <button
              onClick={onAnalyzeSchema}
              disabled={isLoading}
              className="text-xs font-semibold text-gray-500 hover:text-[#DC2626] flex items-center gap-1 transition-colors cursor-pointer"
              title="Regenerate dictionary with fresh analysis"
            >
              <RotateCw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span>Re-analyze</span>
            </button>
          </div>

          <p className="text-sm text-gray-800 leading-relaxed font-normal">
            {dictionary.dataset_summary}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">Risk Breakdown:</span>
            <button
              onClick={() => setRiskFilter(riskFilter === 'HIGH' ? 'ALL' : 'HIGH')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                riskFilter === 'HIGH'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-100 text-[#DC2626] border border-red-200 hover:bg-red-200'
              }`}
            >
              {highRiskColumns.length} HIGH RISK
            </button>
            <button
              onClick={() => setRiskFilter(riskFilter === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                riskFilter === 'MEDIUM'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'
              }`}
            >
              {medRiskColumns.length} MEDIUM
            </button>
            <button
              onClick={() => setRiskFilter(riskFilter === 'LOW' ? 'ALL' : 'LOW')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                riskFilter === 'LOW'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200'
              }`}
            >
              {lowRiskColumns.length} LOW RISK
            </button>
            {riskFilter !== 'ALL' && (
              <button
                onClick={() => setRiskFilter('ALL')}
                className="text-[11px] text-gray-400 hover:text-gray-600 underline ml-1 cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Right Col: Overall Quality Score Gauge */}
        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Data Quality Score
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${qualityColor}`}
            >
              {qualityScorePct >= 80 ? 'High' : qualityScorePct >= 60 ? 'Moderate' : 'Critical'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-4xl font-extrabold text-gray-900 tracking-tight font-mono">
              {qualityScorePct}%
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    qualityScorePct >= 80
                      ? 'bg-emerald-500'
                      : qualityScorePct >= 60
                      ? 'bg-amber-500'
                      : 'bg-[#DC2626]'
                  }`}
                  style={{ width: `${qualityScorePct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>0.0</span>
                <span>Audit Target: 1.0</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 leading-normal">
            Metric evaluates schema completeness, data type uniformity, and potential risk flags across all {dictionary.columns.length} columns.
          </p>
        </div>
      </div>

      {/* Table Toolbar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-base text-gray-900">
            Structured Data Dictionary ({filteredColumns.length} of {dictionary.columns.length})
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative w-52 sm:w-64">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search column, type, recommendation..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] bg-white"
            />
          </div>

          {/* Copy Table Markdown */}
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors cursor-pointer"
            title="Copy as Markdown table"
          >
            {copied ? (
              <Check size={13} className="text-emerald-600" />
            ) : (
              <Copy size={13} className="text-gray-500" />
            )}
            <span>{copied ? 'Copied' : 'Copy MD'}</span>
          </button>

          {/* Download JSON */}
          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors cursor-pointer"
            title="Download JSON dictionary"
          >
            <Download size={13} className="text-gray-500" />
            <span>JSON</span>
          </button>

          {/* Export to Google Sheets */}
          {onNavigateToWorkspace && (
            <button
              onClick={onNavigateToWorkspace}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
              title="Open Google Sheets export in Workspace Hub"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Google Sheets</span>
            </button>
          )}

          {/* Transfer Recommendations to Methodology */}
          <button
            onClick={handleSendToMethodology}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 rounded-lg transition-all shadow-xs cursor-pointer"
            title="Inject recommendations directly into Methodology Notes editor"
          >
            <FileText size={13} />
            <span>Draft Methodology Log</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* High-Contrast White Data Dictionary Table */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50/90 border-b border-gray-200 text-gray-600 uppercase text-[11px] font-semibold sticky top-0 z-10">
              <tr>
                <th className="px-5 py-3.5 font-semibold text-gray-900 w-44">
                  Column Name
                </th>
                <th className="px-5 py-3.5 font-semibold text-gray-900 w-36">
                  Inferred Type
                </th>
                <th className="px-5 py-3.5 font-semibold text-gray-900 w-28">
                  Risk Severity
                </th>
                <th className="px-5 py-3.5 font-semibold text-gray-900">
                  Description
                </th>
                <th className="px-5 py-3.5 font-semibold text-gray-900">
                  Cleaning Recommendation
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredColumns.length > 0 ? (
                filteredColumns.map((col, idx) => {
                  const isHighRisk = col.risk_flag === 'HIGH';
                  const isMedRisk = col.risk_flag === 'MEDIUM';

                  return (
                    <tr
                      key={col.column_name || idx}
                      className={`transition-colors duration-100 ${
                        isHighRisk ? 'hover:bg-red-50/40' : 'hover:bg-gray-50/70'
                      }`}
                    >
                      {/* Column Name */}
                      <td className="px-5 py-4 font-mono font-bold text-gray-900 align-top">
                        <div className="flex items-center gap-2">
                          {isHighRisk && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] shrink-0" />
                          )}
                          <span className="break-all">{col.column_name}</span>
                        </div>
                      </td>

                      {/* Inferred Type */}
                      <td className="px-5 py-4 align-top">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-gray-100 font-mono text-[11px] text-gray-700 font-medium border border-gray-200">
                          {col.inferred_type}
                        </span>
                      </td>

                      {/* Risk Flag with Crimson Red for High Risk */}
                      <td className="px-5 py-4 align-top">
                        {isHighRisk ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-100 text-[#DC2626] border border-red-300 shadow-2xs">
                            <AlertTriangle size={11} className="stroke-[2.5]" />
                            HIGH
                          </span>
                        ) : isMedRisk ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertCircle size={11} />
                            MEDIUM
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck size={11} />
                            LOW
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="px-5 py-4 text-gray-700 leading-relaxed align-top max-w-xs">
                        {col.description}
                      </td>

                      {/* Cleaning Recommendation */}
                      <td className="px-5 py-4 align-top text-gray-800 leading-relaxed font-sans max-w-sm">
                        <div
                          className={`p-2 rounded-lg text-xs ${
                            isHighRisk
                              ? 'bg-red-50/70 border border-red-200 text-gray-900'
                              : 'bg-gray-50 border border-gray-200 text-gray-800'
                          }`}
                        >
                          {col.cleaning_recommendation}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-400 text-sm font-sans"
                  >
                    No columns match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SchemaTab;
