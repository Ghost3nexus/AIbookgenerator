import React, { useState, useCallback } from 'react';
import { Page, Story, ArtStyle, Theme } from './types';
import { generateStoryText, callProxy, regeneratePage, regenerateCover } from './services/geminiService';
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
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

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
      // 1. Generate story text and prompts only
      setLoadingMessage('物語のあらすじを考えています...');
      const storyTemplate = await generateStoryText(idea, characterImage, theme, artStyle);

      // 2. Generate cover image
      setLoadingMessage('表紙のイラストを生成中...');
      const coverPrompt = `Book cover illustration for a children's book titled '${storyTemplate.title}'. Featuring the main character: ${storyTemplate.characterDescription}. Style: ${artStyle}.`;
      const coverImageResponse = await callProxy('models/imagen-4.0-generate-001:predict', {
          instances: [{ prompt: coverPrompt }],
          parameters: { sampleCount: 1, aspectRatio: '4:3' }
      });
      const coverImageUrl = `data:image/png;base64,${coverImageResponse.predictions[0].bytesBase64Encoded}`;
      
      let inProgressStory: Story = { ...storyTemplate, coverImageUrl, pages: [] };
      setStory(inProgressStory);

      // 3. Generate page images one by one
      const finalPages: Page[] = [];
      for (let i = 0; i < storyTemplate.pages.length; i++) {
        const page = storyTemplate.pages[i];
        setLoadingMessage(`${i + 1}ページ目のイラストを生成中...`);
        const prompt = `${page.imagePrompt}, in the style of ${artStyle}. ${storyTemplate.characterDescription}`;
        const pageImageResponse = await callProxy('models/imagen-4.0-generate-001:predict', {
            instances: [{ prompt }],
            parameters: { sampleCount: 1, aspectRatio: '4:3' }
        });
        const imageUrl = `data:image/png;base64,${pageImageResponse.predictions[0].bytesBase64Encoded}`;
        
        const completedPage: Page = { ...page, imageUrl };
        finalPages.push(completedPage);

        // Update state after each image to show progress visually
        setStory({ ...inProgressStory, pages: [...finalPages] });
      }

      const finalStory = { ...inProgressStory, pages: finalPages };
      setStory(finalStory);
      setStoryHistory([finalStory]);
      setAppState('PREVIEW');

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '絵本の生成中にエラーが発生しました。もう一度お試しください。');
      setAppState('FORM');
    } finally {
      setLoadingMessage(null);
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
        return <LoadingAnimation message={loadingMessage} />;
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
        return <LoadingAnimation message="絵本の準備をしています..." />; // Fallback for partial story state
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