import React, { useState, useCallback } from 'react';
import { Page, Story, ArtStyle, Theme } from './types';
import { generateStoryAndImages, regeneratePage } from './services/geminiService';
import Header from './components/Header';
import IdeaForm from './components/IdeaForm';
import LoadingAnimation from './components/LoadingAnimation';
import BookViewer from './components/BookViewer';
import ApiKeySetup from './components/ApiKeySetup';
import { CloseIcon } from './components/Icons';

type AppState = 'API_SETUP' | 'FORM' | 'LOADING' | 'PREVIEW';

function getInitialState(): AppState {
    if (typeof window !== 'undefined' && localStorage.getItem('GEMINI_API_KEY')) {
        return 'FORM';
    }
    return 'API_SETUP';
}


const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(getInitialState);
  const [story, setStory] = useState<Story | null>(null);
  const [storyHistory, setStoryHistory] = useState<Story[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  
  const handleKeySaved = () => {
    if (appState === 'API_SETUP') {
      setAppState('FORM');
    }
    setShowApiKeyModal(false);
  };

  const handleStoryGeneration = useCallback(async (
    idea: string,
    characterImage: File | null,
    theme: Theme,
    artStyle: ArtStyle,
    pageCount: number
  ) => {
    setAppState('LOADING');
    setError(null);
    setStory(null);
    setStoryHistory([]);

    try {
      const newStory = await generateStoryAndImages(idea, characterImage, theme, artStyle, pageCount);
      setStory(newStory);
      setStoryHistory([newStory]);
      setAppState('PREVIEW');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '絵本の生成中にエラーが発生しました。もう一度お試しください。');
      setAppState('FORM');
    }
  }, []);

  const handlePageRegeneration = useCallback(async (
    pageIndex: number,
    instruction: string
  ): Promise<void> => {
    if (!story) return;

    setAppState('LOADING');
    setError(null);
    try {
      const currentStorySummary = story.pages.slice(0, pageIndex).map(p => p.text).join('\n');
      const { newText, newImageUrl } = await regeneratePage(
        story.characterDescription || '',
        story.artStyle,
        currentStorySummary,
        story.pages[pageIndex],
        instruction
      );
      
      const updatedPages = [...story.pages];
      updatedPages[pageIndex] = { ...updatedPages[pageIndex], text: newText, imageUrl: newImageUrl };
      
      const newStoryState: Story = { ...story, pages: updatedPages };
      setStory(newStoryState);
      setStoryHistory(prev => [...prev, newStoryState]);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'ページの再生成中にエラーが発生しました。');
    } finally {
        setAppState('PREVIEW');
    }
  }, [story]);

  const handleTextEdit = useCallback((pageIndex: number, newText: string) => {
    if (!story) return;
    const updatedPages = [...story.pages];
    updatedPages[pageIndex] = { ...updatedPages[pageIndex], text: newText };
    const newStoryState = { ...story, pages: updatedPages };
    setStory(newStoryState);
  }, [story]);
  
  const handleTextEditSave = useCallback(() => {
     if(story) {
        setStoryHistory(prev => [...prev, story]);
     }
  }, [story]);

  const handleUndo = useCallback(() => {
    if (storyHistory.length > 1) {
      const newHistory = [...storyHistory];
      newHistory.pop(); // Remove current state
      const previousStory = newHistory[newHistory.length - 1];
      setStory(previousStory);
      setStoryHistory(newHistory);
    }
  }, [storyHistory]);

  const handleRestart = () => {
    setAppState('FORM');
    setStory(null);
    setError(null);
    setStoryHistory([]);
  };

  const renderContent = () => {
    switch (appState) {
      case 'API_SETUP':
        return <ApiKeySetup onKeySaved={handleKeySaved} />;
      case 'LOADING':
        return <LoadingAnimation />;
      case 'PREVIEW':
        if (story) {
          return (
            <BookViewer
              story={story}
              onRestart={handleRestart}
              onRegeneratePage={handlePageRegeneration}
              onTextEdit={handleTextEdit}
              onTextEditSave={handleTextEditSave}
              onUndo={handleUndo}
              canUndo={storyHistory.length > 1}
            />
          );
        }
        return <LoadingAnimation />;
      case 'FORM':
      default:
        return (
          <IdeaForm onGenerate={handleStoryGeneration} error={error} />
        );
    }
  };

  return (
    <div className="min-h-screen text-slate-700">
      <Header onSettingsClick={() => setShowApiKeyModal(true)} showSettings={appState !== 'API_SETUP'} />
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>

      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full">
            <ApiKeySetup onKeySaved={handleKeySaved} />
            <button
              onClick={() => setShowApiKeyModal(false)}
              className="absolute top-0 right-0 -mt-4 -mr-4 w-12 h-12 bg-white/80 rounded-full text-slate-800 flex items-center justify-center hover:bg-white hover:scale-110 transition-transform shadow-lg"
              aria-label="閉じる"
            >
              <CloseIcon className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;