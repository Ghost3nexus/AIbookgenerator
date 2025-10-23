import React, { useState, useEffect, useRef } from 'react';
import { Story } from '../types';
import { ArrowLeftIcon, ArrowRightIcon, PlayIcon, StopIcon, DownloadIcon, EditIcon, SparklesIcon, UndoIcon, SaveIcon, RefreshIcon } from './Icons';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';

interface BookViewerProps {
  story: Story;
  onRestart: () => void;
  onRegeneratePage: (pageIndex: number, instruction: string) => Promise<void>;
  onTextEdit: (pageIndex: number, newText: string) => void;
  onTextEditSave: () => void;
  onUndo: () => void;
  canUndo: boolean;
}

const BookViewer: React.FC<BookViewerProps> = ({ story, onRestart, onRegeneratePage, onTextEdit, onTextEditSave, onUndo, canUndo }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(-1); // -1 for cover
  const { speak, stop, isSpeaking } = useSpeechSynthesis();
  
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState('');
  
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editInstruction, setEditInstruction] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const totalPages = story.pages.length + 1; // +1 for afterword page
  const isCover = currentPageIndex === -1;
  const isAfterword = currentPageIndex === story.pages.length;
  const currentPage = isCover || isAfterword ? null : story.pages[currentPageIndex];

  useEffect(() => {
    stop();
    if(currentPage) {
        setEditText(currentPage.text);
    }
    setIsEditingText(false);
  }, [currentPageIndex, stop, currentPage]);

  const handleNextPage = () => {
    if (currentPageIndex < story.pages.length) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > -1) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  const handlePlayNarration = () => {
    let textToRead = '';
    if (isCover) textToRead = story.title;
    else if (isAfterword) textToRead = story.afterword;
    else if(currentPage) textToRead = currentPage.text;

    if (isSpeaking) {
      stop();
    } else {
      speak(textToRead, 'ja-JP');
    }
  };
  
  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    // Use a timeout to allow React to render the off-screen pages before capturing
    setTimeout(async () => {
        // @ts-ignore
        const { jsPDF } = window.jspdf;
        // @ts-ignore
        const html2canvas = window.html2canvas;

        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [800, 600]
        });

        const pageElements = document.querySelectorAll('#pdf-render-container .pdf-page');
        if (pageElements.length === 0) {
            console.error("PDF生成用のページが見つかりませんでした。");
            setIsGeneratingPdf(false);
            return;
        }

        for (let i = 0; i < pageElements.length; i++) {
            try {
                const canvas = await html2canvas(pageElements[i] as HTMLElement, {
                    scale: 2,
                    useCORS: true,
                    width: 800,
                    height: 600
                });
                const imgData = canvas.toDataURL('image/jpeg', 0.9);
                if (i > 0) {
                    pdf.addPage([800, 600], 'landscape');
                }
                pdf.addImage(imgData, 'JPEG', 0, 0, 800, 600);
            } catch (error) {
                console.error(`PDFのページ${i}の描画に失敗しました:`, error);
            }
        }
        pdf.save(`${story.title}.pdf`);
        setIsGeneratingPdf(false);
    }, 100);
  };
  
  const handleRegenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInstruction.trim() || currentPage === null) return;
    setIsRegenerating(true);
    await onRegeneratePage(currentPageIndex, editInstruction);
    setIsRegenerating(false);
    setEditInstruction('');
    setShowEditPanel(false);
  };
  
  const handleSaveTextEdit = () => {
      if(currentPage){
          onTextEdit(currentPageIndex, editText);
          onTextEditSave();
          setIsEditingText(false);
      }
  };

  return (
    <div>
        <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl lg:text-5xl font-display text-center mb-6 text-indigo-700 drop-shadow-md">{story.title}</h2>
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                {/* Book display */}
                <div className="w-full lg:w-3/5 relative">
                    <div className="shadow-2xl rounded-lg overflow-hidden book-aspect bg-white border-4 border-white/50">
                        {isCover && <PageContent imageUrl={story.coverImageUrl} />}
                        {currentPage && (
                            <div className="w-full h-full flex flex-col md:flex-row" data-page-num={currentPageIndex + 1}>
                                <div className="w-full md:w-1/2 h-1/2 md:h-full bg-black">
                                    <img src={currentPage.imageUrl} alt={`Page ${currentPage.id}`} className="w-full h-full object-contain"/>
                                </div>
                                <div className="w-full md:w-1/2 p-6 flex items-center justify-center bg-indigo-50">
                                    {isEditingText ? (
                                        <textarea
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            className="w-full h-full text-2xl leading-loose resize-none border-4 border-indigo-300 rounded-lg p-4 bg-white/80 focus:ring-2 focus:ring-indigo-400"
                                        />
                                    ) : (
                                        <p className="text-2xl leading-loose whitespace-pre-wrap p-4">{currentPage.text}</p>
                                    )}
                                </div>
                            </div>
                        )}
                        {isAfterword && <PageContent title="あとがき" text={story.afterword} imageUrl={story.pages[0].imageUrl} isAfterword={true}/>}
                    </div>
                     <div className="flex justify-between items-center mt-4 w-full px-2">
                        <button onClick={handlePrevPage} disabled={isCover} className="p-4 rounded-full bg-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-100 transition-all transform hover:scale-110"><ArrowLeftIcon className="w-8 h-8 text-indigo-600"/></button>
                        <span className="text-slate-700 font-bold text-lg">{isCover ? '表紙' : isAfterword ? 'あとがき' : `ページ ${currentPageIndex + 1} / ${story.pages.length}`}</span>
                        <button onClick={handleNextPage} disabled={isAfterword} className="p-4 rounded-full bg-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-100 transition-all transform hover:scale-110"><ArrowRightIcon className="w-8 h-8 text-indigo-600"/></button>
                    </div>
                </div>

                {/* Controls */}
                <div className="w-full lg:w-2/5 xl:w-1/3 space-y-4">
                    <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border-4 border-white/50">
                        <h3 className="text-3xl font-display mb-6 text-center text-indigo-600">魔法の仕上げ 🪄</h3>
                        <div className="grid grid-cols-3 gap-4 justify-items-center">
                            <ControlButton icon={isSpeaking ? <StopIcon/> : <PlayIcon />} text={isSpeaking ? '停止' : 'ナレーション'} onClick={handlePlayNarration} active={isSpeaking} />
                            <ControlButton icon={<DownloadIcon />} text={isGeneratingPdf ? '作成中...' : 'PDF保存'} onClick={handleDownloadPdf} disabled={isGeneratingPdf}/>
                            <ControlButton icon={<SparklesIcon />} text="AIで修正" onClick={() => setShowEditPanel(!showEditPanel)} active={showEditPanel} disabled={isCover || isAfterword}/>
                            {isEditingText ?
                                <ControlButton icon={<SaveIcon />} text="テキスト保存" onClick={handleSaveTextEdit} /> :
                                <ControlButton icon={<EditIcon />} text="テキスト編集" onClick={() => setIsEditingText(true)} disabled={isCover || isAfterword}/>
                            }
                             <ControlButton icon={<UndoIcon />} text="元に戻す" onClick={onUndo} disabled={!canUndo}/>
                             <ControlButton icon={<RefreshIcon />} text="最初から" onClick={onRestart}/>
                        </div>
                    </div>
                    {showEditPanel && !isCover && !isAfterword && (
                        <div className="bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border-4 border-white/50">
                            <form onSubmit={handleRegenSubmit}>
                                <label htmlFor="regen-instruction" className="block font-bold mb-2 text-slate-700">AIへの修正指示:</label>
                                <textarea
                                    id="regen-instruction"
                                    value={editInstruction}
                                    onChange={(e) => setEditInstruction(e.target.value)}
                                    placeholder="例: このページの主人公をもっと笑顔にして"
                                    className="w-full h-24 p-2 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-400"
                                    required
                                />
                                <button type="submit" disabled={isRegenerating} className="w-full mt-3 flex items-center justify-center bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-full transition-colors disabled:bg-gray-400">
                                    {isRegenerating ? '生成中...' : 'このページを再生成'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
        {/* Off-screen renderer for PDF generation */}
        {isGeneratingPdf && (
            <div id="pdf-render-container" className="absolute -left-[9999px] top-0" aria-hidden="true">
                <div style={{width: 800, height: 600}} className="pdf-page bg-white flex flex-col justify-center items-center p-8 box-border">
                    <h2 className="text-5xl font-display text-center mb-6 shrink-0">{story.title}</h2>
                    <div className="w-full flex-grow relative">
                        <img src={story.coverImageUrl} alt={story.title} className="absolute top-0 left-0 w-full h-full object-contain" />
                    </div>
                </div>
                {story.pages.map((page, index) => (
                    <div key={`pdf-${page.id}`} style={{width: 800, height: 600}}>
                        <div className="w-full h-full flex flex-row pdf-page bg-white" data-page-num={index + 1}>
                             <div className="w-1/2 h-full bg-black"><img src={page.imageUrl} alt="" className="w-full h-full object-contain"/></div>
                            <div className="w-1/2 p-6 flex items-center justify-center bg-indigo-50">
                                <p className="text-xl leading-loose whitespace-pre-wrap">{page.text}</p>
                            </div>
                        </div>
                    </div>
                ))}
                <div style={{width: 800, height: 600}}>
                    <PageContent isPdfPage={true} title="あとがき" text={story.afterword} imageUrl={story.pages[0].imageUrl} isAfterword={true}/>
                </div>
            </div>
        )}
    </div>
  );
};


const ControlButton: React.FC<{icon: React.ReactNode, text: string, onClick: () => void, disabled?: boolean, active?: boolean}> = ({icon, text, onClick, disabled, active}) => (
    <div className="flex flex-col items-center gap-1">
        <button 
            onClick={onClick} 
            disabled={disabled} 
            className={`w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-2xl transition-all duration-300 transform hover:-translate-y-1
            ${active 
                ? 'bg-indigo-500 text-white shadow-lg' 
                : 'bg-white text-indigo-600 hover:bg-indigo-100 shadow-md'
            }
            ${disabled 
                ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 translate-y-0 shadow-none' 
                : ''
            }
            `}
        >
            <div className="w-8 h-8 sm:w-10 sm:h-10">{icon}</div>
        </button>
        <span className="text-xs sm:text-sm font-bold text-slate-600 text-center">{text}</span>
    </div>
)

const PageContent: React.FC<{title?: string, text?: string, imageUrl: string, isAfterword?: boolean, isPdfPage?: boolean}> = ({ title, text, imageUrl, isAfterword, isPdfPage }) => (
    <div className={`w-full h-full flex items-center justify-center relative ${isPdfPage ? 'pdf-page' : ''}`} data-page-num={isAfterword ? 'afterword' : 'cover'}>
        <img src={imageUrl} alt={title || ''} className="absolute inset-0 w-full h-full object-cover z-0" />
        {(title || text) && (
            <>
                <div className={`absolute inset-0 bg-black/30 ${isAfterword ? 'backdrop-blur-sm' : ''}`}></div>
                <div className="relative z-10 text-center text-white p-8">
                    {title && <h2 className="font-display text-5xl drop-shadow-lg">{title}</h2>}
                    {text && <p className="mt-4 text-2xl max-w-2xl mx-auto leading-relaxed whitespace-pre-wrap bg-black/30 p-4 rounded-lg">{text}</p>}
                </div>
            </>
        )}
    </div>
);


export default BookViewer;