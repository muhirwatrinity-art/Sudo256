import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { TabType, SessionState, DatasetSummary, DataDictionaryResult } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { UploadTab } from './components/UploadTab';
import { SchemaTab } from './components/SchemaTab';
import { MethodologyTab } from './components/MethodologyTab';
import { WorkspaceTab } from './components/WorkspaceTab';
import { LoadingSpinner } from './components/LoadingSpinner';
import { initAuth, googleSignIn, logout, getAccessToken } from './services/firebase';
import { User } from 'firebase/auth';

const STORAGE_KEY = 'rds_research_session_v1';

const INITIAL_SESSION: SessionState = {
  activeTab: 'upload',
  connectionStatus: 'checking',
  fileSummary: null,
  dictionary: null,
  cleaningNotes: '',
  methodologyText: '',
  lastUpdated: new Date().toISOString(),
};

export default function App() {
  // Load initial session from localStorage if available
  const [session, setSession] = useState<SessionState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_SESSION,
          ...parsed,
          connectionStatus: 'checking', // always recheck on reload
        };
      }
    } catch (e) {
      console.warn('Could not parse saved session from localStorage', e);
    }
    return INITIAL_SESSION;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('AI Engine Processing...');
  const [loadingSubMessage, setLoadingSubMessage] = useState('Synthesizing statistical schema and risk heuristics...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Google Workspace Auth State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessTokenState(token);
      },
      () => {
        // Not authenticated with token
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoadingAuth(true);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setAccessTokenState(result.accessToken);
      showToast(`Connected Google Workspace as ${result.user.displayName || result.user.email}`);
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setErrorMessage(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessTokenState(null);
    showToast('Signed out of Google Workspace');
  };

  // Sync session changes to localStorage
  useEffect(() => {
    try {
      const { connectionStatus, ...toSave } = session;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Failed to save session to localStorage', e);
    }
  }, [session]);

  const updateSession = useCallback(<K extends keyof SessionState>(key: K, value: SessionState[K]) => {
    setSession((prev) => ({
      ...prev,
      [key]: value,
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const showToast = useCallback((msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  }, []);

  // 1. Connection Health Check on mount & interval
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          updateSession('connectionStatus', 'online');
        } else {
          updateSession('connectionStatus', 'offline');
        }
      } catch {
        updateSession('connectionStatus', 'offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [updateSession]);

  // 2. File Upload Handler -> POST /api/upload
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setLoadingMessage('Importing Dataset...');
    setLoadingSubMessage('Reading CSV bytes and extracting structural summary...');
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Upload failed with status ${response.status}`);
      }

      // Store summary in session and automatically navigate to schema view
      setSession((prev) => ({
        ...prev,
        fileSummary: data,
        activeTab: 'upload', // Keep in upload to review table preview first, or user can click analyze
        lastUpdated: new Date().toISOString(),
      }));

      showToast(`Successfully loaded "${data.filename}" (${data.row_count} rows)`);
    } catch (err: any) {
      console.error('File upload error:', err);
      setErrorMessage(err.message || 'Failed to upload CSV file.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Select Benchmark Sample Handler
  const handleSelectSample = async (sampleKey: string) => {
    setIsLoading(true);
    setLoadingMessage('Loading Benchmark Dataset...');
    setLoadingSubMessage('Configuring reference schema and test preview...');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load benchmark dataset');
      }

      setSession((prev) => ({
        ...prev,
        fileSummary: data,
        dictionary: null, // Reset previous dictionary so user can generate fresh
        activeTab: 'upload',
        lastUpdated: new Date().toISOString(),
      }));

      showToast(`Loaded "${data.filename}" benchmark`);
    } catch (err: any) {
      console.error('Sample loading error:', err);
      setErrorMessage(err.message || 'Failed to load sample dataset.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. AI Schema Analysis -> POST /api/analyze-schema
  const handleAnalyzeSchema = async () => {
    if (!session.fileSummary) {
      setErrorMessage('Please upload a dataset first before analyzing the schema.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('AI Engine Analyzing Schema...');
    setLoadingSubMessage('Inferring semantic data types, assessing quality risks, and calculating audit score...');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/analyze-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: session.fileSummary }),
      });

      const data: DataDictionaryResult = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error || 'AI Schema analysis failed');
      }

      setSession((prev) => ({
        ...prev,
        dictionary: data,
        activeTab: 'schema',
        lastUpdated: new Date().toISOString(),
      }));

      showToast(`Data Dictionary generated: ${data.columns.length} columns categorized`);
    } catch (err: any) {
      console.error('Schema analysis error:', err);
      setErrorMessage(err.message || 'AI schema analysis encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. AI Methodology Generator -> POST /api/generate-methodology
  const handleGenerateMethodology = async () => {
    if (!session.cleaningNotes.trim()) {
      setErrorMessage('Please enter informal data cleaning notes first.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('AI Engine Drafting Methodology...');
    setLoadingSubMessage('Synthesizing formal academic prose with statistical justifications...');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/generate-methodology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: session.cleaningNotes,
          dataset_summary: session.dictionary?.dataset_summary || session.fileSummary?.filename,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate methodology section');
      }

      updateSession('methodologyText', data.methodology);
      showToast('Formal academic methodology generated!');
    } catch (err: any) {
      console.error('Methodology generation error:', err);
      setErrorMessage(err.message || 'Failed to generate methodology section.');
    } finally {
      setIsLoading(false);
    }
  };

  // Transfer recommendations from Schema Tab into Methodology notes
  const handleTransferToMethodology = (recommendationsText: string) => {
    setSession((prev) => ({
      ...prev,
      cleaningNotes: prev.cleaningNotes
        ? `${prev.cleaningNotes}\n\n${recommendationsText}`
        : recommendationsText,
      activeTab: 'methodology',
      lastUpdated: new Date().toISOString(),
    }));
    showToast('Injected recommendations into Methodology Log');
  };

  // Reset Session
  const handleResetSession = () => {
    if (confirm('Are you sure you want to reset your workspace? This will clear all uploaded data and analysis.')) {
      localStorage.removeItem(STORAGE_KEY);
      setSession({
        ...INITIAL_SESSION,
        connectionStatus: session.connectionStatus,
      });
      showToast('Workspace reset to initial state');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans overflow-hidden">
      {/* Crimson Red Loading Spinner Overlay */}
      {isLoading && (
        <LoadingSpinner message={loadingMessage} subMessage={loadingSubMessage} />
      )}

      {/* Floating Error Toast */}
      {errorMessage && (
        <div className="fixed top-4 right-6 z-60 bg-[#DC2626] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200 max-w-md">
          <AlertCircle size={20} className="shrink-0" />
          <div className="text-xs font-medium leading-relaxed">{errorMessage}</div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-white/20 rounded-lg text-white ml-2 cursor-pointer"
            title="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Floating Success Toast */}
      {successToast && (
        <div className="fixed top-4 right-6 z-60 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-150 text-xs font-semibold">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <Header
        connectionStatus={session.connectionStatus}
        fileSummary={session.fileSummary}
        dictionary={session.dictionary}
        methodologyText={session.methodologyText}
        onSelectSample={handleSelectSample}
        onResetSession={handleResetSession}
        user={user}
        accessToken={accessToken}
        onSignIn={handleGoogleSignIn}
        onOpenWorkspace={() => updateSession('activeTab', 'workspace')}
      />

      {/* App Body: Sidebar + Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={session.activeTab}
          setActiveTab={(tab: TabType) => updateSession('activeTab', tab)}
          fileSummary={session.fileSummary}
          dictionary={session.dictionary}
          methodologyText={session.methodologyText}
          notes={session.cleaningNotes}
        />

        {/* Right Main Panel */}
        <main className="flex-1 overflow-y-auto bg-white p-6 sm:p-8">
          {session.activeTab === 'upload' && (
            <UploadTab
              fileSummary={session.fileSummary}
              onFileUpload={handleFileUpload}
              onSelectSample={handleSelectSample}
              onNavigateToSchema={() => {
                if (session.dictionary) {
                  updateSession('activeTab', 'schema');
                } else {
                  handleAnalyzeSchema();
                }
              }}
              onNavigateToWorkspace={() => updateSession('activeTab', 'workspace')}
              isLoading={isLoading}
            />
          )}

          {session.activeTab === 'schema' && (
            <SchemaTab
              dictionary={session.dictionary}
              fileSummary={session.fileSummary}
              onAnalyzeSchema={handleAnalyzeSchema}
              onNavigateToUpload={() => updateSession('activeTab', 'upload')}
              onTransferToMethodology={handleTransferToMethodology}
              onNavigateToWorkspace={() => updateSession('activeTab', 'workspace')}
              isLoading={isLoading}
            />
          )}

          {session.activeTab === 'methodology' && (
            <MethodologyTab
              notes={session.cleaningNotes}
              setNotes={(notes: string) => updateSession('cleaningNotes', notes)}
              methodologyText={session.methodologyText}
              setMethodologyText={(text: string) => updateSession('methodologyText', text)}
              onGenerateMethodology={handleGenerateMethodology}
              dictionary={session.dictionary}
              fileSummary={session.fileSummary}
              onNavigateToWorkspace={() => updateSession('activeTab', 'workspace')}
              isLoading={isLoading}
            />
          )}

          {session.activeTab === 'workspace' && (
            <WorkspaceTab
              user={user}
              accessToken={accessToken}
              onSignIn={handleGoogleSignIn}
              onSignOut={handleGoogleSignOut}
              fileSummary={session.fileSummary}
              dictionary={session.dictionary}
              methodologyText={session.methodologyText}
              onImportDataset={(summary) => {
                setSession((prev) => ({
                  ...prev,
                  fileSummary: summary,
                  dictionary: null,
                  activeTab: 'upload',
                  lastUpdated: new Date().toISOString(),
                }));
                showToast(`Imported "${summary.filename}" from Google Sheets`);
              }}
              isLoadingAuth={isLoadingAuth}
            />
          )}
        </main>
      </div>
    </div>
  );
}
