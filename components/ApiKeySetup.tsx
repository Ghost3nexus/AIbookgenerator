import React, { useState } from 'react';
import { MagicWandIcon } from './Icons';

interface ApiKeySetupProps {
  onKeySaved: () => void;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onKeySaved }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSave = () => {
    if (apiKey.trim().startsWith('AIza')) {
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      onKeySaved();
    } else {
      alert('無効なAPIキーのようです。Google AI Studioで取得したAPIキーを入力してください。');
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white/60 backdrop-blur-xl p-8 sm:p-12 rounded-3xl shadow-2xl border-4 border-white/50 text-center">
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
    </div>
  );
};

export default ApiKeySetup;
