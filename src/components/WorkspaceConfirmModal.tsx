import React from 'react';
import { AlertTriangle, Send, FileSpreadsheet, FileText, Mail, MessageSquare } from 'lucide-react';

export type WorkspaceActionType = 'send_email' | 'send_chat' | 'create_sheet' | 'create_doc';

interface WorkspaceConfirmModalProps {
  isOpen: boolean;
  actionType: WorkspaceActionType;
  title: string;
  details: {
    label: string;
    value: string;
  }[];
  summary: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const WorkspaceConfirmModal: React.FC<WorkspaceConfirmModalProps> = ({
  isOpen,
  actionType,
  title,
  details,
  summary,
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  if (!isOpen) return null;

  const getActionIcon = () => {
    switch (actionType) {
      case 'send_email':
        return <Mail size={22} className="text-[#DC2626]" />;
      case 'send_chat':
        return <MessageSquare size={22} className="text-[#DC2626]" />;
      case 'create_sheet':
        return <FileSpreadsheet size={22} className="text-emerald-600" />;
      case 'create_doc':
        return <FileText size={22} className="text-blue-600" />;
    }
  };

  const getButtonText = () => {
    if (isProcessing) return 'Processing...';
    switch (actionType) {
      case 'send_email':
        return 'Confirm & Send Email';
      case 'send_chat':
        return 'Confirm & Post to Chat';
      case 'create_sheet':
        return 'Confirm & Create Sheet';
      case 'create_doc':
        return 'Confirm & Create Document';
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 shrink-0">
            {getActionIcon()}
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-900 leading-snug">{title}</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{summary}</p>
          </div>
        </div>

        {/* Action Details Table */}
        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 space-y-2 text-xs">
          {details.map((item, idx) => (
            <div key={idx} className="flex items-start justify-between gap-3">
              <span className="font-semibold text-gray-500 shrink-0">{item.label}:</span>
              <span className="font-mono text-gray-800 break-all text-right max-w-xs">{item.value}</span>
            </div>
          ))}
        </div>

        {/* User Permission & Consent Notice */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-normal">
          <AlertTriangle size={14} className="shrink-0 text-amber-600" />
          <span>
            This action will modify your Google Workspace account with your explicit permission.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send size={13} />
            <span>{getButtonText()}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceConfirmModal;
