import React, { useState } from 'react';
import { ArtStyle, Theme } from '../types';
import { 
    MagicWandIcon, UploadIcon, SparklesIcon, AlertIcon, 
    FriendshipIcon, CourageIcon, AdventureIcon, FamilyIcon,
    WatercolorIcon, AnimeIcon, CrayonIcon, DigitalArtIcon,
    BookIcon
} from './Icons';

interface IdeaFormProps {
  onGenerate: (
    idea: string,
    characterImage: File | null,
    theme: Theme,
    artStyle: ArtStyle,
    pageCount: number
  ) => void;
  error: string | null;
}

const themeIcons: Record<Theme, React.ReactNode> = {
  [Theme.Friendship]: <FriendshipIcon className="w-full h-full text-rose-500" />,
  [Theme.Courage]: <CourageIcon className="w-full h-full text-orange-500" />,
  [Theme.Adventure]: <AdventureIcon className="w-full h-full text-sky-600" />,
  [Theme.Family]: <FamilyIcon className="w-full h-full text-green-500" />,
};

const artStyleIcons: Record<ArtStyle, React.ReactNode> = {
    [ArtStyle.Watercolor]: <WatercolorIcon className="w-full h-full text-blue-400" />,
    [ArtStyle.Anime]: <AnimeIcon className="w-full h-full text-pink-400" />,
    [ArtStyle.Crayon]: <CrayonIcon className="w-full h-full text-red-500" />,
    [ArtStyle.Digital]: <DigitalArtIcon className="w-full h-full text-purple-500" />,
};

const SelectionCard = ({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) => (
    <div
        onClick={onClick}
        className={`p-4 rounded-xl border-4 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl flex flex-col items-center justify-center gap-2 text-center w-32 h-32
        ${isActive
            ? 'bg-indigo-500 border-white text-white shadow-xl scale-105'
            : 'bg-white/70 border-white/50 hover:bg-indigo-100'
        }`}
    >
        <div className="w-12 h-12">{icon}</div>
        <span className="font-bold text-sm">{label}</span>
    </div>
);


const IdeaForm: React.FC<IdeaFormProps> = ({ onGenerate, error }) => {
  const [idea, setIdea] = useState('');
  const [characterImage, setCharacterImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(Theme.Adventure);
  const [artStyle, setArtStyle] = useState<ArtStyle>(ArtStyle.Watercolor);
  const [pageCount, setPageCount] = useState<number>(4);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCharacterImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim()) {
      onGenerate(idea, characterImage, theme, artStyle, pageCount);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white/60 backdrop-blur-xl p-8 sm:p-12 rounded-3xl shadow-2xl border-4 border-white/50">
        <div className="text-center mb-10">
            <SparklesIcon className="w-16 h-16 mx-auto text-indigo-500 drop-shadow-lg" />
            <h2 className="text-4xl sm:text-5xl font-display mt-4 text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-indigo-500">魔法の呪文を唱えよう</h2>
            <p className="text-slate-600 mt-4 text-lg">あなたのアイデアから、世界にひとつだけの絵本が生まれます。</p>
        </div>

        {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md flex items-start" role="alert">
                <AlertIcon className="w-6 h-6 mr-3"/>
                <div>
                    <p className="font-bold">おっと！</p>
                    <p>{error}</p>
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">
            <div>
                <label htmlFor="idea" className="block text-xl font-bold mb-3 text-slate-700">1. 物語のアイデアを入力</label>
                <textarea
                    id="idea"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="例：うちの猫の「ソラ」が、お月様へ冒険に出かける話"
                    className="w-full h-32 p-4 border-4 border-indigo-300 rounded-2xl focus:ring-4 focus:ring-indigo-400/50 focus:border-indigo-500 transition-all duration-200 text-lg bg-slate-800 text-white placeholder-slate-400 shadow-inner"
                    required
                />
            </div>

            <div>
                <label className="block text-xl font-bold mb-3 text-slate-700">2. 主人公の画像をアップロード (任意)</label>
                 <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-64 border-4 border-indigo-300 border-dashed rounded-2xl cursor-pointer bg-indigo-50/50 hover:bg-indigo-100/70 transition-colors duration-200">
                    {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="h-full w-full object-contain rounded-lg p-2" />
                    ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                            <UploadIcon className="w-12 h-12 mb-4 text-slate-400"/>
                            <p className="mb-2 text-lg text-slate-500"><span className="font-semibold">クリックしてアップロード</span></p>
                            <p className="text-sm text-slate-500">ペットの写真や子供の絵など</p>
                        </div>
                    )}
                    <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleImageChange} />
                </label>
            </div>

            <div>
                <h3 className="text-xl font-bold mb-4 text-slate-700">3. ページ数を選ぶ</h3>
                <div className="flex flex-wrap justify-center gap-4">
                    {[4, 6, 8].map((count) => (
                        <SelectionCard
                            key={count}
                            icon={<BookIcon className="w-full h-full text-slate-500" />}
                            label={`${count}ページ`}
                            isActive={pageCount === count}
                            onClick={() => setPageCount(count)}
                        />
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-xl font-bold mb-4 text-slate-700">4. テーマを選ぶ</h3>
                <div className="flex flex-wrap justify-center gap-4">
                    {Object.values(Theme).map((t) => (
                        <SelectionCard key={t} icon={themeIcons[t]} label={t} isActive={theme === t} onClick={() => setTheme(t)} />
                    ))}
                </div>
            </div>
            
            <div>
                <h3 className="text-xl font-bold mb-4 text-slate-700">5. アートスタイルを選ぶ</h3>
                <div className="flex flex-wrap justify-center gap-4">
                     {Object.values(ArtStyle).map((s) => (
                        <SelectionCard key={s} icon={artStyleIcons[s]} label={s} isActive={artStyle === s} onClick={() => setArtStyle(s)} />
                    ))}
                </div>
            </div>

            <div className="pt-6">
                <button type="submit" className="w-full flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-2xl py-5 px-6 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 ease-in-out font-display tracking-wider button-boing border-4 border-white/50">
                    <SparklesIcon className="w-8 h-8 mr-4" />
                    絵本をつくる！
                </button>
            </div>
        </form>
    </div>
  );
};

export default IdeaForm;