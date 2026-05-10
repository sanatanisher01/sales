import React from 'react';

export default function IOSInstallGuide({ show, onClose }) {
  if (!show) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[399]" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-[400] sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-80">
        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          <div className="bg-primary-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm">📍</div>
              <div>
                <div className="text-white font-bold text-sm">Install SalesTrack</div>
                <div className="text-primary-200 text-xs">Add to Home Screen</div>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center text-lg">✕</button>
          </div>
          <div className="px-4 py-4 space-y-3">
            {[
              { icon: '⬆️', text: 'Tap the Share button at the bottom of Safari' },
              { icon: '➕', text: 'Scroll down and tap "Add to Home Screen"' },
              { icon: '✅', text: 'Tap "Add" to install' },
            ].map(({ icon, text }, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-xl flex-shrink-0">{icon}</span>
                <span className="text-sm text-gray-700">{text}</span>
              </div>
            ))}
            <button onClick={onClose}
              className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm min-h-[48px] hover:bg-primary-700 transition-colors">
              Got it!
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
