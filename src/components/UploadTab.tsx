import React, { useState, useRef } from 'react';
import {
  FileUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  Database,
  BarChart3,
  Hash,
  Calendar,
  Type as TypeIcon,
  HelpCircle,
} from 'lucide-react';
import { DatasetSummary } from '../types';

interface UploadTabProps {
  fileSummary: DatasetSummary | null;
  onFileUpload: (file: File) => void;
  onSelectSample: (sampleKey: string) => void;
  onNavigateToSchema: () => void;
  onNavigateToWorkspace?: () => void;
  isLoading: boolean;
}

export const UploadTab: React.FC<UploadTabProps> = ({
  fileSummary,
  onFileUpload,
  onSelectSample,
  onNavigateToSchema,
  onNavigateToWorkspace,
  isLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [searchPreview, setSearchPreview] = useState('');
  const [pastedCsv, setPastedCsv] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain') {
        onFileUpload(file);
      } else {
        alert('Please drop a valid .csv file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedCsv.trim()) return;
    const blob = new Blob([pastedCsv], { type: 'text/csv' });
    const file = new File([blob], 'manual_input.csv', { type: 'text/csv' });
    onFileUpload(file);
    setShowPasteModal(false);
    setPastedCsv('');
  };

  // Filter preview table rows by search query
  const filteredPreview = fileSummary
    ? fileSummary.preview.filter((row) => {
        if (!searchPreview) return true;
        const q = searchPreview.toLowerCase();
        return Object.values(row).some((val) => String(val).toLowerCase().includes(q));
      })
    : [];

  const getTypeIcon = (typeStr: string = '') => {
    const t = typeStr.toLowerCase();
    if (t.includes('int') || t.includes('number') || t.includes('float') || t.includes('decimal')) {
      return <Hash size={13} className="text-blue-500" />;
    }
    if (t.includes('date') || t.includes('time')) {
      return <Calendar size={13} className="text-amber-500" />;
    }
    if (t.includes('bool')) {
      return <CheckCircle2 size={13} className="text-emerald-500" />;
    }
    return <TypeIcon size={13} className="text-gray-500" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Title & Introduction */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Dataset Library & Import
            </h2>
            <p className="text-sm text-gray-500">
              Upload research CSVs for automated statistical profiling, schema inference, and data dictionary compilation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToWorkspace && (
              <button
                onClick={onNavigateToWorkspace}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-3 py-1.5 border border-emerald-200 rounded-lg hover:border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/60 transition-colors cursor-pointer"
                title="Import spreadsheet directly from Google Sheets"
              >
                <FileSpreadsheet size={13} className="text-emerald-600" />
                <span>Import from Google Sheets</span>
              </button>
            )}

            <button
              onClick={() => setShowPasteModal(true)}
              className="text-xs font-semibold text-gray-600 hover:text-[#DC2626] px-3 py-1.5 border border-gray-200 rounded-lg hover:border-red-200 bg-white hover:bg-red-50/50 transition-colors cursor-pointer"
            >
              Or Paste CSV Text
            </button>
          </div>
        </div>
      </div>

      {/* Dropzone Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 transition-all duration-200 flex flex-col items-center justify-center text-center group bg-white ${
          isDragging
            ? 'border-[#DC2626] bg-red-50/70 scale-[1.005] shadow-md shadow-red-100'
            : 'border-gray-300 hover:border-[#DC2626] hover:bg-red-50/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />

        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-[#DC2626] mb-4 group-hover:scale-105 group-hover:bg-[#DC2626] group-hover:text-white transition-all duration-200 shadow-xs">
          <FileUp size={34} strokeWidth={2.2} />
        </div>

        <h3 className="text-base font-bold text-gray-900 group-hover:text-[#DC2626] transition-colors">
          {isDragging ? 'Drop CSV File Here' : 'Click to Upload or Drag and Drop CSV'}
        </h3>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">
          Supports research datasets up to 50MB. Columns, data types, and sample previews are extracted instantly.
        </p>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-gray-400 font-medium">
          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 font-mono">
            .CSV
          </span>
          <span>UTF-8 encoded</span>
          <span>•</span>
          <span>RFC 4180 compliant</span>
        </div>
      </div>

      {/* Quick Benchmark Datasets Row */}
      <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            <Layers size={14} className="text-[#DC2626]" />
            <span>Instant Pre-loaded Benchmarks (1-Click Test)</span>
          </div>
          <span className="text-[11px] text-gray-400">No file on hand? Test with these:</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => onSelectSample('clinical')}
            disabled={isLoading}
            className="p-3 text-left rounded-xl bg-white border border-gray-200 hover:border-[#DC2626] hover:bg-red-50/40 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 group-hover:text-[#DC2626]">
                Clinical Oncology Trial
              </span>
              <span className="text-[10px] font-mono text-gray-400">10 rows × 9 cols</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
              Phase II subjects, dosages, CEA biomarkers, adverse event grades, and trial completion flags.
            </p>
          </button>

          <button
            onClick={() => onSelectSample('ecommerce')}
            disabled={isLoading}
            className="p-3 text-left rounded-xl bg-white border border-gray-200 hover:border-[#DC2626] hover:bg-red-50/40 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 group-hover:text-[#DC2626]">
                SaaS Customer Churn
              </span>
              <span className="text-[10px] font-mono text-gray-400">10 rows × 8 cols</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
              Tenure months, subscription spend, support tickets count, session duration, and churn status.
            </p>
          </button>

          <button
            onClick={() => onSelectSample('environmental')}
            disabled={isLoading}
            className="p-3 text-left rounded-xl bg-white border border-gray-200 hover:border-[#DC2626] hover:bg-red-50/40 transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 group-hover:text-[#DC2626]">
                Air Quality Sensor Grid
              </span>
              <span className="text-[10px] font-mono text-gray-400">10 rows × 9 cols</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
              Particulate matter (PM2.5, PM10), nitrogen dioxide, humidity, timestamps, and battery voltage.
            </p>
          </button>
        </div>
      </div>

      {/* Active Dataset Inspection Table */}
      {fileSummary && (
        <div className="space-y-4 pt-2">
          {/* Header & Meta Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#DC2626]">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-gray-900">
                    {fileSummary.filename}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Parsed Cleanly
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                  <span>
                    Rows:{' '}
                    <strong className="text-gray-900 font-mono">
                      {fileSummary.row_count.toLocaleString()}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Columns:{' '}
                    <strong className="text-gray-900 font-mono">
                      {fileSummary.col_count}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Uploaded:{' '}
                    <span className="text-gray-600">
                      {new Date(fileSummary.uploaded_at).toLocaleTimeString()}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Direct CTA to Tab 2 */}
            <button
              onClick={onNavigateToSchema}
              className="flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold text-xs tracking-tight shadow-md shadow-red-200 transition-all cursor-pointer"
            >
              <Sparkles size={16} />
              <span>Generate AI Data Dictionary</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Column Profile Chips */}
          <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 size={14} className="text-[#DC2626]" />
                Inferred Column Schema Snapshot ({fileSummary.columns.length})
              </span>
              <span className="text-[11px] text-gray-400">
                Click any column to jump to dictionary
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {fileSummary.columns.map((col) => {
                const type = fileSummary.dtypes[col] || 'String';
                const stat = fileSummary.stats?.[col];
                return (
                  <div
                    key={col}
                    onClick={onNavigateToSchema}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-red-50 hover:border-red-200 transition-colors text-xs cursor-pointer group"
                  >
                    {getTypeIcon(type)}
                    <span className="font-semibold text-gray-800 group-hover:text-[#DC2626] font-mono">
                      {col}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-gray-500 border border-gray-200 font-medium">
                      {type}
                    </span>
                    {stat && stat.nullCount > 0 && (
                      <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1 rounded">
                        {stat.nullCount} nulls
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table Preview */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            {/* Table Search & Filter Bar */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-white">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900">
                  Data Sample Preview (First {fileSummary.preview.length} Rows)
                </h4>
                <span className="text-xs text-gray-400">
                  Showing {filteredPreview.length} of {fileSummary.preview.length} sample rows
                </span>
              </div>

              <div className="relative w-64">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Filter sample preview rows..."
                  value={searchPreview}
                  onChange={(e) => setSearchPreview(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                />
              </div>
            </div>

            {/* Pure Crisp White Table */}
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50/90 text-gray-600 uppercase text-[11px] font-semibold sticky top-0 border-b border-gray-200 z-10">
                  <tr>
                    <th className="px-4 py-3 text-gray-400 w-12 font-mono text-center">#</th>
                    {fileSummary.columns.map((col) => (
                      <th key={col} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getTypeIcon(fileSummary.dtypes[col])}
                          <span className="font-mono">{col}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-gray-700">
                  {filteredPreview.length > 0 ? (
                    filteredPreview.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-red-50/30 transition-colors duration-100"
                      >
                        <td className="px-4 py-2.5 text-gray-400 text-center select-none text-[10px] font-sans">
                          {idx + 1}
                        </td>
                        {fileSummary.columns.map((col) => {
                          const val = row[col];
                          const isNull =
                            val === undefined || val === null || val === '' || val === 'NaN';
                          return (
                            <td
                              key={col}
                              className={`px-4 py-2.5 whitespace-nowrap max-w-xs truncate ${
                                isNull ? 'text-gray-300 italic font-sans' : 'text-gray-800'
                              }`}
                            >
                              {isNull ? 'NULL' : String(val)}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={fileSummary.columns.length + 1}
                        className="px-6 py-8 text-center text-gray-400 text-sm font-sans"
                      >
                        No matching sample rows found for "{searchPreview}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Paste CSV Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900">
                Paste Raw CSV / Delimited Snippet
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Paste comma-separated rows including headers to immediately parse and analyze:
            </p>

            <textarea
              rows={8}
              value={pastedCsv}
              onChange={(e) => setPastedCsv(e.target.value)}
              placeholder="patient_id,age,blood_pressure,treatment_arm&#10;P101,45,120,Active&#10;P102,62,145,Control"
              className="w-full p-3 font-mono text-xs border border-gray-200 rounded-xl outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] bg-gray-50"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePasteSubmit}
                disabled={!pastedCsv.trim()}
                className="px-5 py-2 text-xs font-semibold bg-[#DC2626] hover:bg-red-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Parse Dataset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadTab;
