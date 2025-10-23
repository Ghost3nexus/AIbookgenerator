import React, { useState, useEffect } from 'react';
import { MagicWandIcon, KeyIcon } from './Icons';

interface ApiKeySetupProps {
  onKeySaved: () => void;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onKeySaved }) => {
  const [apiKey, setApiKey] = useState('');
  const [storedKey, setStoredKey] = useState<string | null>(null);

  useEffect(() => {
    const key = localStorage.getItem('GEMINI_API_KEY');
    setStoredKey(key);
  }, []);

  const handleSave = () => {
    if (apiKey.trim().startsWith('AIza')) {
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      alert('APIキーを保存しました！');
      onKeySaved();
    } else {
      alert('無効なAPIキーのようです。Google AI Studioで取得したAPIキーを入力してください。');
    }
  };

  const handleReset = () => {
    if (window.confirm('保存されているAPIキーを削除しますか？')) {
      localStorage.removeItem('GEMINI_API_KEY');
      setStoredKey(null);
      setApiKey('');
      alert('APIキーを削除しました。新しいキーを入力してください。');
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  }

  const commonWrapper = (children: React.ReactNode) => (
    <div className="w-full bg-white/60 backdrop-blur-xl p-8 sm:p-12 rounded-3xl shadow-2xl border-4 border-white/50 text-center">
        {children}
    </div>
  );

  if (storedKey) {
    return commonWrapper(
        <>
            <KeyIcon className="w-16 h-16 mx-auto text-indigo-500 drop-shadow-lg" />
            <h2 className="text-3xl sm:text-4xl font-display mt-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-sky-500">
                APIキー設定済み
            </h2>
            <p className="text-slate-600 mt-4 text-lg">
                現在、Gemini APIキーが設定されています。
            </p>
            <div className="my-6 p-4 bg-slate-800/80 rounded-xl text-white font-mono text-center shadow-inner">
                {storedKey.slice(0, 8)}*******************
            </div>
            <button
                onClick={handleReset}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xl py-4 px-6 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 ease-in-out font-display tracking-wider"
            >
                🔄 APIキーを入れ直す
            </button>
        </>
    );
  }

  return commonWrapper(
    <>
      <MagicWandIcon className="w-16 h-16 mx-auto text-indigo-500 drop-shadow-lg" />
      <h2 className="text-3xl sm:text-4xl font-display mt-4 text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-indigo-500">
        はじめに
      </h2>
      <p className="text-slate-600 mt-4 text-lg">
        このアプリを使用するには、あなたのGoogle Gemini APIキーが必要です。
      </p>
      <form onSubmit={handleSubmit} className="my-6 space-y-4">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="ここにGemini APIキーを貼り付け"
          className="w-full p-4 border-4 border-indigo-300 rounded-2xl focus:ring-4 focus:ring-indigo-400/50 focus:border-indigo-500 transition-all duration-200 text-lg bg-slate-800 text-white placeholder-slate-400 shadow-inner"
        />
        <button
          type="submit"
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xl py-4 px-6 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 ease-in-out font-display tracking-wider"
        >
          APIキーを保存して開始
        </button>
      </form>
      <p className="text-sm text-slate-500 mt-4">
        APIキーはあなたのブラウザにのみ保存され、外部に送信されることはありません。
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline font-semibold ml-1"
        >
          APIキーの取得はこちら
        </a>
      </p>
    </>
  );
};

export default ApiKeySetup;