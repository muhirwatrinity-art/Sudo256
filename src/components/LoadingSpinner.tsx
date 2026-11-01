import React from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  subMessage?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'AI Engine Processing...',
  subMessage = 'Synthesizing statistical schema and risk heuristics...',
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm transition-all duration-300">
      <div className="relative flex items-center justify-center">
        {/* Outer subtle grey ring */}
        <div className="w-20 h-20 border-4 border-gray-100 rounded-full shadow-inner"></div>

        {/* Primary Crimson Red spinning ring */}
        <div
          className="w-20 h-20 border-4 border-[#DC2626] border-t-transparent border-r-transparent rounded-full animate-spin absolute top-0 left-0"
          style={{ animationDuration: '0.85s' }}
        ></div>

        {/* Inner pulsing icon */}
        <div className="absolute flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-[#DC2626] animate-pulse">
          <Sparkles size={20} />
        </div>
      </div>

      {/* Primary Message */}
      <div className="mt-6 text-center max-w-sm px-4">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">{message}</h3>
        <p className="mt-1 text-sm text-[#DC2626] font-medium animate-pulse">{subMessage}</p>
        <div className="mt-4 flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
