import React from 'react';
import {
  Upload,
  Database,
  FileText,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  HardDrive,
  Info,
} from 'lucide-react';
import { TabType, DatasetSummary, DataDictionaryResult } from '../types';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  fileSummary: DatasetSummary | null;
  dictionary: DataDictionaryResult | null;
  methodologyText: string;
  notes: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  fileSummary,
  dictionary,
  methodologyText,
  notes,
}) => {
  const highRiskCount =
    dictionary?.columns.filter((c) => c.risk_flag === 'HIGH').length || 0;
  const medRiskCount =
    dictionary?.columns.filter((c) => c.risk_flag === 'MEDIUM').length || 0;

  return (
    <aside className="w-64 border-r border-gray-200 bg-white flex flex-col shrink-0 select-none">
      {/* Navigation Group */}
      <div className="p-3 border-b border-gray-100">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3">
          Workspace Navigation
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {/* Tab 1: Dataset Library & Upload */}
        <button
          onClick={() => setActiveTab('upload')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-150 text-left cursor-pointer group ${
            activeTab === 'upload'
              ? 'bg-red-50 text-[#DC2626] font-semibold border-l-4 border-[#DC2626] shadow-xs'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-lg transition-colors ${
                activeTab === 'upload'
                  ? 'bg-white text-[#DC2626] shadow-xs'
                  : 'text-gray-400 group-hover:text-[#DC2626]'
              }`}
            >
              <Upload size={18} />
            </div>
            <div>
              <div className="text-sm font-medium leading-tight">Dataset Library</div>
              <div className="text-[11px] text-gray-400 font-normal">Import & Previews</div>
            </div>
          </div>

          {fileSummary && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === 'upload'
                  ? 'bg-red-100 text-[#DC2626]'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {fileSummary.col_count} cols
            </span>
          )}
        </button>

        {/* Tab 2: Schema & Dictionary Generator */}
        <button
          onClick={() => setActiveTab('schema')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-150 text-left cursor-pointer group ${
            activeTab === 'schema'
              ? 'bg-red-50 text-[#DC2626] font-semibold border-l-4 border-[#DC2626] shadow-xs'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-lg transition-colors ${
                activeTab === 'schema'
                  ? 'bg-white text-[#DC2626] shadow-xs'
                  : 'text-gray-400 group-hover:text-[#DC2626]'
              }`}
            >
              <Database size={18} />
            </div>
            <div>
              <div className="text-sm font-medium leading-tight">Schema & Dictionary</div>
              <div className="text-[11px] text-gray-400 font-normal">Inference & Quality</div>
            </div>
          </div>

          {highRiskCount > 0 ? (
            <span
              className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-[#DC2626] border border-red-200"
              title={`${highRiskCount} High Risk columns identified`}
            >
              <AlertTriangle size={10} />
              {highRiskCount}
            </span>
          ) : dictionary ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {(dictionary.overall_data_quality_score * 100).toFixed(0)}%
            </span>
          ) : null}
        </button>

        {/* Tab 3: Methodology & Log Writer */}
        <button
          onClick={() => setActiveTab('methodology')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-150 text-left cursor-pointer group ${
            activeTab === 'methodology'
              ? 'bg-red-50 text-[#DC2626] font-semibold border-l-4 border-[#DC2626] shadow-xs'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-lg transition-colors ${
                activeTab === 'methodology'
                  ? 'bg-white text-[#DC2626] shadow-xs'
                  : 'text-gray-400 group-hover:text-[#DC2626]'
              }`}
            >
              <FileText size={18} />
            </div>
            <div>
              <div className="text-sm font-medium leading-tight">Methodology Log</div>
              <div className="text-[11px] text-gray-400 font-normal">Academic Section</div>
            </div>
          </div>

          {methodologyText ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Methodology drafted" />
          ) : notes.trim() ? (
            <span className="w-2 h-2 rounded-full bg-amber-400" title="Draft in progress" />
          ) : null}
        </button>

        {/* Tab 4: Google Workspace Collaboration Hub */}
        <button
          onClick={() => setActiveTab('workspace')}
          className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-150 text-left cursor-pointer group ${
            activeTab === 'workspace'
              ? 'bg-red-50 text-[#DC2626] font-semibold border-l-4 border-[#DC2626] shadow-xs'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-lg transition-colors ${
                activeTab === 'workspace'
                  ? 'bg-white text-[#DC2626] shadow-xs'
                  : 'text-gray-400 group-hover:text-[#DC2626]'
              }`}
            >
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium leading-tight">Google Workspace</div>
              <div className="text-[11px] text-gray-400 font-normal">Sheets, Docs, Chat, Mail</div>
            </div>
          </div>

          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-[#DC2626]">
            4 APIs
          </span>
        </button>
      </nav>

      {/* Dataset Quick Metrics Card in Sidebar */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50">
        {fileSummary ? (
          <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <HardDrive size={12} className="text-gray-500" />
                Active Dataset
              </span>
              <span className="text-[10px] font-mono font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                Loaded
              </span>
            </div>
            <div className="text-xs font-semibold text-gray-900 truncate">
              {fileSummary.filename}
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-gray-500 border-t border-gray-100 font-mono">
              <div>
                Rows: <strong className="text-gray-800">{fileSummary.row_count}</strong>
              </div>
              <div>
                Cols: <strong className="text-gray-800">{fileSummary.col_count}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-white border border-gray-200 text-center space-y-1">
            <FileSpreadsheet size={20} className="mx-auto text-gray-300" />
            <div className="text-xs font-medium text-gray-600">No Dataset Active</div>
            <p className="text-[11px] text-gray-400">
              Drop a CSV or choose a sample to analyze.
            </p>
          </div>
        )}

        {/* Quick helper tip */}
        <div className="mt-2.5 px-1 flex items-start gap-1.5 text-[11px] text-gray-400 leading-normal">
          <Info size={12} className="shrink-0 mt-0.5 text-gray-400" />
          <span>Research sessions persist automatically across tab navigation.</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
