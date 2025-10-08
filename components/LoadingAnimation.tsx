import React, { useState, useEffect } from 'react';
import { BookOpenIcon, SparklesIcon } from './Icons';

interface LoadingAnimationProps {
  message?: string | null;
}

const messages = [
  "魔法のインクを混ぜています...",
  "物語の星々を集めています...",
  "イラストに命を吹き込んでいます...",
  "素敵な夢を紡いでいます...",
  "もうすぐ、あなたの物語が完成します！"
];

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ message }) => {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        if (message) return; // Don't cycle if a specific message is provided

        const intervalId = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
        }, 3000);

        return () => clearInterval(intervalId);
    }, [message]);

  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <div className="relative w-48 h-48">
        <BookOpenIcon className="w-full h-full text-indigo-400 drop-shadow-lg" />
        <SparklesIcon className="absolute top-0 -right-2 w-12 h-12 text-rose-400 animate-ping" />
        <SparklesIcon className="absolute -bottom-4 -left-2 w-8 h-8 text-purple-400 animate-ping animation-delay-500" />
        <SparklesIcon className="absolute bottom-10 right-2 w-6 h-6 text-indigo-300 animate-pulse animation-delay-1000" />
      </div>
      <h2 className="text-4xl font-display text-indigo-600 mt-12">絵本を生成中...</h2>
      <p className="text-slate-600 mt-4 text-lg transition-opacity duration-500">{message || messages[messageIndex]}</p>
    </div>
  );
};

export default LoadingAnimation;