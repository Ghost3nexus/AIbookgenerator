import React, { useState, useCallback } from 'react';
import { Page, Story, ArtStyle, Theme } from './types';
import { generateStoryAndImages, regeneratePage, regenerateCover } from './services/geminiService';
import Header from './components/Header';
import IdeaForm from './components/IdeaForm';
import LoadingAnimation from './components/LoadingAnimation';
import BookViewer from './components/BookViewer';

type AppState = 'FORM' | 'LOADING' | 'PREVIEW';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('FORM');
  const [story, setStory] = useState<Story | null>(null);
  const [storyHistory, setStoryHistory] = useState<Story[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleStoryGeneration = useCallback(async (
    idea: string,
    characterImage: File | null,
    theme: Theme,
    artStyle: ArtStyle
  ) => {
    setAppState('LOADING');
    setError(null);
    setStory(null);
    setStoryHistory([]);

    try {
      const newStory = await generateStoryAndImages(idea, characterImage, theme, artStyle);
      setStory(newStory);
      setStoryHistory([newStory]);
      setAppState('PREVIEW');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '絵本の生成中にエラーが発生しました。もう一度お試しください。');
      setAppState('FORM');
    }
  }, []);

  const handleCoverRegeneration = useCallback(async (
    instruction: string
  ): Promise<void> => {
    if (!story) return;

    setAppState('LOADING');
    setError(null);
    try {
      const { newTitle, newCoverImageUrl } = await regenerateCover(
        story.characterDescription,
        story.artStyle,
        story.title,
        instruction
      );
      
      const newStoryState: Story = { ...story, title: newTitle, coverImageUrl: newCoverImageUrl };
      setStory(newStoryState);
      setStoryHistory(prev => [...prev, newStoryState]);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '表紙の再生成中にエラーが発生しました。');
    } finally {
        setAppState('PREVIEW');
    }
  }, [story]);

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
    // Note: We don't push to history on every keystroke, maybe on blur or save.
    // For simplicity, we'll add a separate button or auto-save logic if needed.
    // Here we'll just update the current state.
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
      case 'LOADING':
        return <LoadingAnimation />;
      case 'PREVIEW':
        if (story) {
          return (
            <BookViewer
              story={story}
              onRestart={handleRestart}
              onRegeneratePage={handlePageRegeneration}
              onRegenerateCover={handleCoverRegeneration}
              onTextEdit={handleTextEdit}
              onTextEditSave={handleTextEditSave}
              onUndo={handleUndo}
              canUndo={storyHistory.length > 1}
            />
          );
        }
        return null; // Should not happen
      case 'FORM':
      default:
        return (
          <IdeaForm onGenerate={handleStoryGeneration} error={error} />
        );
    }
  };

  return (
    <div className="min-h-screen text-slate-700">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;