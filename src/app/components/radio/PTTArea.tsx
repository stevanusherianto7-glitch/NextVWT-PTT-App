import React from 'react';
import { ProgressBar } from '../ProgressBar';
import { usePTTStore } from '../../store/usePTTStore';

interface PTTAreaProps {
  lcd: React.ReactNode;
  footer: React.ReactNode;
}

export function PTTArea({ lcd, footer }: PTTAreaProps) {
  const { isPowerOn, showModulator, progress } = usePTTStore();

  return (
    <div className="w-full h-[424px] flex flex-col justify-start items-center relative">
      {/* Themed Faceplate Container */}
      <div
        className="w-full flex flex-col items-center pt-6 pb-3 relative z-10 transition-all duration-300"
        style={{
          borderRadius: '40px 40px 200px 200px / 40px 40px 90px 90px',
          background: 'var(--panel-bg)',
          boxShadow: 'var(--panel-shadow)',
          border: 'var(--panel-border)',
          backdropFilter: 'var(--panel-blur)',
        }}
      >
        {/* 3D Faceplate Outer Highlight and Shadow Overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            borderRadius: '40px 40px 200px 200px / 40px 40px 90px 90px',
            boxShadow:
              'inset 0 3px 4px rgba(100, 116, 139, 0.5), inset 3px 0 4px rgba(100, 116, 139, 0.5), inset 4px 4px 6px rgba(100, 116, 139, 0.45), inset -4px -4px 8px rgba(0, 0, 0, 0.35), inset 0 -3px 5px rgba(0, 0, 0, 0.3)',
          }}
        />

        {/* Render LCD Panel */}
        {lcd}

        {/* Progress Bar (Modulator) */}
        {showModulator && (
          <div
            className={`mt-2 flex justify-center transition-opacity duration-300 w-full ${isPowerOn ? 'opacity-100' : 'opacity-30'}`}
          >
            <ProgressBar progress={progress} />
          </div>
        )}

        {/* Render Control Buttons */}
        {footer}
      </div>
    </div>
  );
}
