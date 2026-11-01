import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  MessageSquare,
  Mail,
  Send,
  Upload,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  LogOut,
  Layers,
  ChevronRight,
  ShieldCheck,
  Search,
  Sparkles,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  listRecentSpreadsheets,
  readSpreadsheetValues,
  createSpreadsheetWithData,
  createDocumentWithContent,
  listChatSpaces,
  sendChatMessage,
  sendEmail,
  SheetFile,
  ChatSpace,
} from '../services/workspace';
import { DatasetSummary, DataDictionaryResult } from '../types';
import { WorkspaceConfirmModal, WorkspaceActionType } from './WorkspaceConfirmModal';

interface WorkspaceTabProps {
  user: User | null;
  accessToken: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  fileSummary: DatasetSummary | null;
  dictionary: DataDictionaryResult | null;
  methodologyText: string;
  onImportDataset: (summary: DatasetSummary) => void;
  isLoadingAuth: boolean;
}

export const WorkspaceTab: React.FC<WorkspaceTabProps> = ({
  user,
  accessToken,
  onSignIn,
  onSignOut,
  fileSummary,
  dictionary,
  methodologyText,
  onImportDataset,
  isLoadingAuth,
}) => {
  const [activeService, setActiveService] = useState<'sheets' | 'docs' | 'chat' | 'gmail'>('sheets');

  // Sheets state
  const [recentSheets, setRecentSheets] = useState<SheetFile[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [customSheetUrlOrId, setCustomSheetUrlOrId] = useState('');
  const [createdSheetUrl, setCreatedSheetUrl] = useState<string | null>(null);

  // Docs state
  const [createdDocUrl, setCreatedDocUrl] = useState<string | null>(null);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  // Chat state
  const [chatSpaces, setChatSpaces] = useState<ChatSpace[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<string>('');
  const [chatMessageText, setChatMessageText] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatSuccess, setChatSuccess] = useState<string | null>(null);

  // Gmail state
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // Confirmation Modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmActionType, setConfirmActionType] = useState<WorkspaceActionType>('send_email');
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmSummary, setConfirmSummary] = useState('');
  const [confirmDetails, setConfirmDetails] = useState<{ label: string; value: string }[]>([]);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<(() => Promise<void>) | null>(null);

  // Load sheets when authenticated
  useEffect(() => {
    if (accessToken && activeService === 'sheets' && recentSheets.length === 0) {
      loadSheets();
    }
    if (accessToken && activeService === 'chat' && chatSpaces.length === 0) {
      loadChatSpaces();
    }
  }, [accessToken, activeService]);

  // Pre-fill email and chat text from current dataset / dictionary / methodology
  useEffect(() => {
    const datasetName = fileSummary?.filename || 'Research Dataset';
    const qualityScore = dictionary ? `${Math.round(dictionary.overall_data_quality_score * 100)}%` : 'Audited';

    if (!emailSubject) {
      setEmailSubject(`[Research Data Studio] Dataset Audit & Methodology: ${datasetName}`);
    }

    if (!emailBody) {
      let body = `Dear Research Team,\n\nPlease find the dataset profiling and methodology summary for "${datasetName}".\n\n`;
      if (dictionary) {
        body += `Data Quality Score: ${qualityScore}\n`;
        body += `Summary: ${dictionary.dataset_summary}\n\n`;
        body += `Column Risks Identified:\n`;
        for (const col of dictionary.columns) {
          body += `- ${col.column_name} (${col.inferred_type}) [${col.risk_flag} Risk]: ${col.cleaning_recommendation}\n`;
        }
        body += `\n`;
      }
      if (methodologyText) {
        body += `Draft Methodology Section:\n${methodologyText}\n\n`;
      }
      body += `Generated via Research Data Studio.`;
      setEmailBody(body);
    }

    if (!chatMessageText) {
      let chatMsg = `📊 *Dataset Quality Update*: ${datasetName}\n`;
      if (dictionary) {
        chatMsg += `• Overall Quality Score: ${qualityScore}\n`;
        const highRisk = dictionary.columns.filter((c) => c.risk_flag === 'HIGH');
        chatMsg += `• High Risk Columns: ${highRisk.length > 0 ? highRisk.map((c) => c.column_name).join(', ') : 'None'}\n`;
        chatMsg += `• Summary: ${dictionary.dataset_summary}\n`;
      }
      if (methodologyText) {
        chatMsg += `• Formal methodology documentation has been compiled.`;
      }
      setChatMessageText(chatMsg);
    }
  }, [fileSummary, dictionary, methodologyText]);

  const loadSheets = async () => {
    if (!accessToken) return;
    setIsLoadingSheets(true);
    try {
      const files = await listRecentSpreadsheets(accessToken);
      setRecentSheets(files);
    } catch (err: any) {
      console.warn('Could not list recent spreadsheets:', err);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const loadChatSpaces = async () => {
    if (!accessToken) return;
    setIsLoadingChat(true);
    setChatError(null);
    try {
      const spaces = await listChatSpaces(accessToken);
      setChatSpaces(spaces);
      if (spaces.length > 0) {
        setSelectedSpace(spaces[0].name);
      }
    } catch (err: any) {
      console.warn('Chat spaces error:', err);
      setChatError(err.message || 'Could not list Google Chat spaces.');
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Helper to extract spreadsheet ID from URL or bare ID
  const extractSpreadsheetId = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : trimmed;
  };

  // Import sheet values into dataset
  const handleImportSheet = async (spreadsheetId: string) => {
    if (!accessToken) return;
    setIsLoadingSheets(true);
    try {
      const id = extractSpreadsheetId(spreadsheetId);
      const data = await readSpreadsheetValues(accessToken, id);

      if (data.headers.length === 0 || data.rows.length === 0) {
        alert('The selected Google Spreadsheet contains no tabular data.');
        return;
      }

      // Convert rows to preview objects
      const previewRows = data.rows.slice(0, 10).map((row) => {
        const obj: Record<string, any> = {};
        data.headers.forEach((h, idx) => {
          obj[h] = row[idx] ?? '';
        });
        return obj;
      });

      // Infer primitive types
      const dtypes: Record<string, string> = {};
      data.headers.forEach((h, idx) => {
        let isNum = true;
        for (const row of data.rows.slice(0, 20)) {
          const val = row[idx];
          if (val && isNaN(Number(val))) {
            isNum = false;
            break;
          }
        }
        dtypes[h] = isNum ? 'Integer / Float' : 'String';
      });

      const summary: DatasetSummary = {
        filename: `${data.title || 'GoogleSheet'}.csv`,
        columns: data.headers,
        dtypes,
        preview: previewRows,
        row_count: data.rows.length,
        col_count: data.headers.length,
        uploaded_at: new Date().toISOString(),
      };

      onImportDataset(summary);
      alert(`Imported "${summary.filename}" (${summary.row_count} rows, ${summary.col_count} columns) into Research Data Studio!`);
    } catch (err: any) {
      console.error('Failed to import Google Sheet:', err);
      alert(`Import Error: ${err.message}`);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  // Export Data Dictionary to Google Sheets
  const handleExportToSheets = () => {
    if (!accessToken) return;
    if (!dictionary && !fileSummary) {
      alert('No data or dictionary available to export.');
      return;
    }

    const title = `[Research Data Studio] ${fileSummary?.filename || 'Dataset'} Data Dictionary`;
    const values: any[][] = [
      ['Column Name', 'Inferred Type', 'Risk Flag', 'Description', 'Cleaning Recommendation'],
    ];

    if (dictionary) {
      for (const col of dictionary.columns) {
        values.push([
          col.column_name,
          col.inferred_type,
          col.risk_flag,
          col.description,
          col.cleaning_recommendation,
        ]);
      }
    } else if (fileSummary) {
      for (const col of fileSummary.columns) {
        values.push([col, fileSummary.dtypes[col] || 'String', 'LOW', '', '']);
      }
    }

    // Trigger confirmation modal
    setConfirmActionType('create_sheet');
    setConfirmTitle('Create Google Spreadsheet');
    setConfirmSummary(`Create a new Google Spreadsheet in your Google Drive with the data dictionary.`);
    setConfirmDetails([
      { label: 'Spreadsheet Title', value: title },
      { label: 'Rows to Insert', value: `${values.length} rows` },
      { label: 'Target Account', value: user?.email || 'Google Account' },
    ]);
    setPendingConfirmAction(() => async () => {
      const res = await createSpreadsheetWithData(accessToken, title, values);
      setCreatedSheetUrl(res.spreadsheetUrl);
    });
    setConfirmModalOpen(true);
  };

  // Export to Google Docs
  const handleExportToDocs = () => {
    if (!accessToken) return;
    const title = `[Research Dossier] ${fileSummary?.filename || 'Dataset'} Preprocessing Methodology`;

    let textContent = `RESEARCH DATASET DOSSIER & METHODOLOGY\n`;
    textContent += `Generated by Research Data Studio | ${new Date().toLocaleDateString()}\n\n`;

    if (fileSummary) {
      textContent += `1. DATASET PROFILE\n`;
      textContent += `Filename: ${fileSummary.filename}\n`;
      textContent += `Total Records: ${fileSummary.row_count}\n`;
      textContent += `Total Attributes: ${fileSummary.col_count}\n\n`;
    }

    if (dictionary) {
      textContent += `2. INFERRED CONTEXT & QUALITY AUDIT\n`;
      textContent += `Overall Data Quality Score: ${Math.round(dictionary.overall_data_quality_score * 100)}%\n`;
      textContent += `Context: ${dictionary.dataset_summary}\n\n`;

      textContent += `3. DATA DICTIONARY\n`;
      for (const col of dictionary.columns) {
        textContent += `- ${col.column_name} (${col.inferred_type}) [${col.risk_flag} Risk]: ${col.description}\n`;
        textContent += `  Recommendation: ${col.cleaning_recommendation}\n`;
      }
      textContent += `\n`;
    }

    if (methodologyText) {
      textContent += `4. FORMAL PREPROCESSING METHODOLOGY\n\n`;
      textContent += methodologyText.replace(/#/g, '');
    }

    setConfirmActionType('create_doc');
    setConfirmTitle('Create Google Doc');
    setConfirmSummary('Create a new Google Doc containing the formatted research dossier.');
    setConfirmDetails([
      { label: 'Document Title', value: title },
      { label: 'Content Size', value: `${textContent.length.toLocaleString()} characters` },
      { label: 'Destination', value: 'My Google Drive' },
    ]);
    setPendingConfirmAction(() => async () => {
      setIsCreatingDoc(true);
      try {
        const res = await createDocumentWithContent(accessToken, title, textContent);
        setCreatedDocUrl(res.documentUrl);
      } finally {
        setIsCreatingDoc(false);
      }
    });
    setConfirmModalOpen(true);
  };

  // Send Google Chat Message
  const handleSendChat = () => {
    if (!accessToken || !selectedSpace || !chatMessageText.trim()) return;

    setConfirmActionType('send_chat');
    setConfirmTitle('Post to Google Chat Space');
    setConfirmSummary('Post a research quality update message to the selected Google Chat conversation.');
    setConfirmDetails([
      { label: 'Chat Space', value: selectedSpace },
      { label: 'Message Preview', value: chatMessageText.slice(0, 100) + '...' },
      { label: 'Sender', value: user?.email || 'Authenticated User' },
    ]);
    setPendingConfirmAction(() => async () => {
      setChatSuccess(null);
      await sendChatMessage(accessToken, selectedSpace, chatMessageText);
      setChatSuccess('Message successfully posted to Google Chat!');
      setTimeout(() => setChatSuccess(null), 4000);
    });
    setConfirmModalOpen(true);
  };

  // Send Gmail
  const handleSendEmail = () => {
    if (!accessToken || !emailTo.trim() || !emailSubject.trim() || !emailBody.trim()) {
      alert('Please fill in recipient email, subject, and body.');
      return;
    }

    setConfirmActionType('send_email');
    setConfirmTitle('Send Email via Gmail');
    setConfirmSummary('Send this research dossier email to the specified recipient using your Gmail account.');
    setConfirmDetails([
      { label: 'Recipient (To)', value: emailTo },
      { label: 'Subject', value: emailSubject },
      { label: 'Sender Account', value: user?.email || 'Your Gmail' },
    ]);
    setPendingConfirmAction(() => async () => {
      setIsSendingEmail(true);
      setEmailSuccess(null);
      try {
        await sendEmail(accessToken, {
          to: emailTo,
          subject: emailSubject,
          bodyText: emailBody,
        });
        setEmailSuccess(`Email successfully dispatched to ${emailTo}`);
        setTimeout(() => setEmailSuccess(null), 4000);
      } finally {
        setIsSendingEmail(false);
      }
    });
    setConfirmModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Action Confirmation Modal */}
      <WorkspaceConfirmModal
        isOpen={confirmModalOpen}
        actionType={confirmActionType}
        title={confirmTitle}
        summary={confirmSummary}
        details={confirmDetails}
        onCancel={() => {
          setConfirmModalOpen(false);
          setPendingConfirmAction(null);
        }}
        onConfirm={async () => {
          if (pendingConfirmAction) {
            try {
              await pendingConfirmAction();
            } catch (err: any) {
              alert(`Action failed: ${err.message}`);
            }
          }
          setConfirmModalOpen(false);
          setPendingConfirmAction(null);
        }}
      />

      {/* Top Banner: Workspace Connectivity & Google Sign-In */}
      <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Google Workspace Collaboration Hub
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-[#DC2626] border border-red-200">
              Live APIs
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Sync datasets with Google Sheets, compile reports to Google Docs, notify teams via Google Chat, and email collaborators via Gmail.
          </p>
        </div>

        {/* Auth Button or User Profile */}
        <div>
          {user && accessToken ? (
            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl border border-gray-200">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-gray-300" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#DC2626] text-white flex items-center justify-center font-bold text-xs">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <div className="text-left pr-2">
                <div className="text-xs font-bold text-gray-900 leading-tight">
                  {user.displayName || 'Google Account'}
                </div>
                <div className="text-[11px] text-gray-500">{user.email}</div>
              </div>
              <button
                onClick={onSignOut}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                title="Sign out of Google"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              disabled={isLoadingAuth}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl shadow-xs transition-all cursor-pointer font-medium text-xs text-gray-700 hover:border-gray-400"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isLoadingAuth ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Workspace Service Tabs */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveService('sheets')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeService === 'sheets'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <FileSpreadsheet size={16} className="text-emerald-600" />
          <span>Google Sheets</span>
        </button>

        <button
          onClick={() => setActiveService('docs')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeService === 'docs'
              ? 'border-blue-600 text-blue-700 bg-blue-50/40 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <FileText size={16} className="text-blue-600" />
          <span>Google Docs</span>
        </button>

        <button
          onClick={() => setActiveService('chat')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeService === 'chat'
              ? 'border-[#DC2626] text-[#DC2626] bg-red-50/40 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <MessageSquare size={16} className="text-[#DC2626]" />
          <span>Google Chat</span>
        </button>

        <button
          onClick={() => setActiveService('gmail')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeService === 'gmail'
              ? 'border-red-600 text-red-700 bg-red-50/40 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Mail size={16} className="text-red-600" />
          <span>Gmail</span>
        </button>
      </div>

      {/* Authentication Prompt if not logged in */}
      {!accessToken && (
        <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 text-center space-y-4">
          <div className="w-12 h-12 bg-white rounded-xl border border-gray-200 shadow-2xs flex items-center justify-center mx-auto text-[#DC2626]">
            <ShieldCheck size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-gray-900">Google Workspace Authorization Required</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Sign in with your Google account to grant permission for reading/writing Sheets, Docs, Chat spaces, and Gmail dispatches.
            </p>
          </div>
          <button
            onClick={onSignIn}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#DC2626] hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Sign in with Google to Connect
          </button>
        </div>
      )}

      {/* SERVICE 1: GOOGLE SHEETS */}
      {accessToken && activeService === 'sheets' && (
        <div className="space-y-6">
          {/* Export Action Card */}
          <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-emerald-600" />
                  Export Data Dictionary to Google Sheets
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Creates a new spreadsheet in your Google Drive with column definitions, inferred types, risk ratings, and cleaning steps.
                </p>
              </div>

              <button
                onClick={handleExportToSheets}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Create Spreadsheet</span>
              </button>
            </div>

            {createdSheetUrl && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  Spreadsheet created successfully!
                </span>
                <a
                  href={createdSheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-bold text-emerald-700 underline hover:text-emerald-900 cursor-pointer"
                >
                  <span>Open in Google Sheets</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

          {/* Import by URL / ID */}
          <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-2xs space-y-3">
            <h3 className="font-bold text-sm text-gray-900">
              Import Tabular Data from Google Sheets
            </h3>
            <p className="text-xs text-gray-500">
              Paste any Google Spreadsheet URL or ID that you have permission to view to pull it into the Research Studio workspace:
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit or ID"
                value={customSheetUrlOrId}
                onChange={(e) => setCustomSheetUrlOrId(e.target.value)}
                className="flex-1 p-2.5 text-xs font-mono border border-gray-200 rounded-xl outline-none focus:border-emerald-600"
              />
              <button
                onClick={() => handleImportSheet(customSheetUrlOrId)}
                disabled={isLoadingSheets || !customSheetUrlOrId.trim()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isLoadingSheets ? 'Fetching...' : 'Import Sheet'}
              </button>
            </div>
          </div>

          {/* Recent Spreadsheets in Drive */}
          <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <span>Recent Spreadsheets in Your Google Drive</span>
                <button
                  onClick={loadSheets}
                  className="p-1 text-gray-400 hover:text-gray-700 rounded cursor-pointer"
                  title="Refresh list"
                >
                  <RotateCw size={13} className={isLoadingSheets ? 'animate-spin' : ''} />
                </button>
              </h3>
              <span className="text-xs text-gray-400 font-mono">
                {recentSheets.length} files found
              </span>
            </div>

            {recentSheets.length > 0 ? (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {recentSheets.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet size={16} className="text-emerald-600" />
                      <div>
                        <div className="text-xs font-semibold text-gray-900">{file.name}</div>
                        {file.modifiedTime && (
                          <div className="text-[10px] text-gray-400">
                            Modified: {new Date(file.modifiedTime).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                          title="Open in Sheets"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button
                        onClick={() => handleImportSheet(file.id)}
                        disabled={isLoadingSheets}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Load Dataset
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-3 text-center">
                {isLoadingSheets ? 'Scanning your Google Drive...' : 'No spreadsheets found in Drive.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* SERVICE 2: GOOGLE DOCS */}
      {accessToken && activeService === 'docs' && (
        <div className="space-y-6">
          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  Publish Research Methodology to Google Docs
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xl">
                  Compiles your active dataset profile, quality score metrics, full data dictionary, and peer-reviewed preprocessing methodology into a standalone, formatted Google Doc ready for collaborative editing.
                </p>
              </div>

              <button
                onClick={handleExportToDocs}
                disabled={isCreatingDoc}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={15} />
                <span>{isCreatingDoc ? 'Publishing...' : 'Export to Google Docs'}</span>
              </button>
            </div>

            {createdDocUrl && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                <span className="flex items-center gap-2 font-medium">
                  <CheckCircle2 size={16} className="text-blue-600" />
                  Google Doc compiled and saved to your Drive!
                </span>
                <a
                  href={createdDocUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-bold text-blue-700 underline hover:text-blue-900 cursor-pointer"
                >
                  <span>Open in Google Docs</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

            {/* Document Content Preview */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Document Sections to Be Created:
              </span>
              <ul className="text-xs text-gray-700 space-y-1 list-disc ml-4">
                <li>
                  <strong>Dataset Profile</strong>: {fileSummary?.filename || 'Active Dataset'} (
                  {fileSummary?.row_count || 0} rows × {fileSummary?.col_count || 0} columns)
                </li>
                <li>
                  <strong>Quality Audit</strong>:{' '}
                  {dictionary
                    ? `${Math.round(dictionary.overall_data_quality_score * 100)}% quality score`
                    : 'Not yet generated'}
                </li>
                <li>
                  <strong>Data Dictionary Table</strong>: {dictionary?.columns.length || 0} semantic
                  definitions
                </li>
                <li>
                  <strong>Formal Academic Methodology</strong>:{' '}
                  {methodologyText ? `${methodologyText.split(/\s+/).length} words` : 'Draft pending'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE 3: GOOGLE CHAT */}
      {accessToken && activeService === 'chat' && (
        <div className="space-y-6">
          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <MessageSquare size={18} className="text-[#DC2626]" />
                  Broadcast Quality Alerts to Google Chat
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Post research notifications, data hygiene alerts, and methodology status directly to your lab's Google Chat spaces.
                </p>
              </div>

              <button
                onClick={loadChatSpaces}
                className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
              >
                <RotateCw size={12} className={isLoadingChat ? 'animate-spin' : ''} />
                <span>Refresh Spaces</span>
              </button>
            </div>

            {chatError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <div className="leading-relaxed">
                  <strong>Notice:</strong> {chatError}
                  <div className="mt-1 text-[11px] text-amber-700">
                    Google Chat API requires a Google Workspace (Enterprise/Business) account. If using personal Gmail, use the Gmail or Sheets tab.
                  </div>
                </div>
              </div>
            )}

            {chatSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>{chatSuccess}</span>
              </div>
            )}

            {/* Space selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Target Chat Space</label>
              {chatSpaces.length > 0 ? (
                <select
                  value={selectedSpace}
                  onChange={(e) => setSelectedSpace(e.target.value)}
                  className="w-full p-2.5 text-xs border border-gray-200 rounded-xl bg-white outline-none focus:border-[#DC2626]"
                >
                  {chatSpaces.map((space) => (
                    <option key={space.name} value={space.name}>
                      {space.displayName || space.name} ({space.type || 'Space'})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="spaces/AAAAAAAAAAA"
                    value={selectedSpace}
                    onChange={(e) => setSelectedSpace(e.target.value)}
                    className="flex-1 p-2.5 text-xs font-mono border border-gray-200 rounded-xl outline-none"
                  />
                  <span className="text-[11px] text-gray-400 self-center">Space Name</span>
                </div>
              )}
            </div>

            {/* Chat message content */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Message Content</label>
              <textarea
                rows={5}
                value={chatMessageText}
                onChange={(e) => setChatMessageText(e.target.value)}
                placeholder="Enter update message to post to team chat space..."
                className="w-full p-3 text-xs font-mono border border-gray-200 rounded-xl outline-none focus:border-[#DC2626] leading-relaxed bg-gray-50"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSendChat}
                disabled={!selectedSpace || !chatMessageText.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#DC2626] hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send size={13} />
                <span>Post to Google Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE 4: GMAIL */}
      {accessToken && activeService === 'gmail' && (
        <div className="space-y-6">
          <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-2xs space-y-4">
            <div>
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Mail size={18} className="text-red-600" />
                Email Research Dossier via Gmail
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Send research data dictionaries and preprocessing methodology directly to co-investigators or lab members.
              </p>
            </div>

            {emailSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>{emailSuccess}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Recipient Email (To)
                </label>
                <input
                  type="email"
                  placeholder="collaborator@university.edu, reviewer@journal.org"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full p-2.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Email Subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-2.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-red-600 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Email Body</label>
                <textarea
                  rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full p-3 text-xs font-mono border border-gray-200 rounded-xl outline-none focus:border-red-600 leading-relaxed bg-gray-50"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSendEmail}
                disabled={isSendingEmail || !emailTo.trim() || !emailSubject.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#DC2626] hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send size={13} />
                <span>{isSendingEmail ? 'Sending...' : 'Send Email via Gmail'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceTab;
