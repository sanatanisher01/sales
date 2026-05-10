import React, { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Never show if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone === true) return; // iOS standalone

    // Check if user permanently dismissed (clicked "Not now" 3+ times)
    const dismissCount = parseInt(localStorage.getItem('pwa-dismiss-count') || '0');
    if (dismissCount >= 3) return;

    // Detect iOS Safari
    const isIOSDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafariBrowser = /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent);

    if (isIOSDevice && isSafariBrowser) {
      setIsIOS(true);
      // Show after 2 seconds on every page load (iOS can't auto-prompt)
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }

    // Android/Chrome — capture the browser's install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show immediately when browser is ready
      setTimeout(() => setShow(true), 1500);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also show on refresh if we previously captured the prompt
    // (some browsers fire it immediately on reload)
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setShow(false);
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      localStorage.setItem('pwa-dismiss-count', '3'); // don't show again
    }
  };

  const handleDismiss = () => {
    setShow(false);
    const count = parseInt(localStorage.getItem('pwa-dismiss-count') || '0');
    localStorage.setItem('pwa-dismiss-count', String(count + 1));
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop blur on mobile */}
      <div className="fixed inset-0 bg-black/20 z-[299] sm:hidden" onClick={handleDismiss} />

      <div className="fixed bottom-0 left-0 right-0 z-[300] sm:bottom-4 sm:left-auto sm:right-4 sm:w-80">
        <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">

          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="bg-primary-600 mx-3 mb-0 mt-2 sm:mt-0 sm:mx-0 sm:rounded-none rounded-2xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm">
                📍
              </div>
              <div>
                <div className="text-white font-bold">SalesTrack</div>
                <div className="text-primary-200 text-xs">Free · Works offline</div>
              </div>
            </div>
            <button onClick={handleDismiss}
              className="text-white/70 hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-lg">
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-4">
            {isIOS ? (
              <div className="space-y-3">
                <p className="font-semibold text-gray-800">Install on your iPhone</p>
                <p className="text-sm text-gray-500">Add SalesTrack to your home screen for quick access and push notifications.</p>
                <div className="space-y-2">
                  {[
                    { step: '1', icon: '⬆️', text: 'Tap the Share button at the bottom of Safari' },
                    { step: '2', icon: '➕', text: 'Scroll and tap "Add to Home Screen"' },
                    { step: '3', icon: '✅', text: 'Tap "Add" to install' },
                  ].map(({ step, icon, text }) => (
                    <div key={step} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-xl flex-shrink-0">{icon}</span>
                      <span className="text-sm text-gray-700">{text}</span>
                    </div>
                  ))}
                </div>
                <button onClick={handleDismiss}
                  className="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm min-h-[48px]">
                  Got it!
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-semibold text-gray-800">Install SalesTrack App</p>
                <p className="text-sm text-gray-500">Get the full app experience — faster, works offline, and receive push notifications.</p>
                <div className="flex gap-2">
                  <button onClick={handleInstall}
                    className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-bold text-sm min-h-[48px] hover:bg-primary-700 active:bg-primary-800 transition-colors">
                    📲 Install App
                  </button>
                  <button onClick={handleDismiss}
                    className="px-5 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium min-h-[48px] hover:bg-gray-200">
                    Later
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
