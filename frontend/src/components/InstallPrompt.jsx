import React, { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Don't show if user already dismissed
    if (localStorage.getItem('pwa-install-dismissed')) return;

    // Detect iOS Safari
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    const safari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    if (ios && safari) {
      setIsIOS(true);
      // Show iOS instructions after 3 seconds
      setTimeout(() => setShow(true), 3000);
      return;
    }

    // Android / Chrome — listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[300] sm:left-auto sm:right-4 sm:w-80">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-primary-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📍</span>
            <div>
              <div className="text-white font-bold text-sm">SalesTrack</div>
              <div className="text-primary-200 text-xs">Install as app</div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {isIOS ? (
            // iOS instructions
            <div className="text-sm text-gray-700 space-y-2">
              <p className="font-medium">Add to your home screen:</p>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="text-lg">1️⃣</span>
                <span>Tap the <strong>Share</strong> button <span className="text-lg">⬆️</span> at the bottom</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="text-lg">2️⃣</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="text-lg">3️⃣</span>
                <span>Tap <strong>"Add"</strong> to install</span>
              </div>
              <button
                onClick={handleDismiss}
                className="w-full mt-2 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium min-h-[44px]"
              >
                Got it
              </button>
            </div>
          ) : (
            // Android / Chrome
            <div className="text-sm text-gray-700">
              <p className="mb-3">Install SalesTrack on your phone for the best experience — works offline too.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl font-semibold text-sm min-h-[44px] hover:bg-primary-700 transition-colors"
                >
                  Install App
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium min-h-[44px]"
                >
                  Not now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
