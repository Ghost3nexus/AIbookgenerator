import { GoogleGenAI, Type } from "@google/genai";
import { ArtStyle, Theme, Story, Page } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

const storySchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "絵本のタイトル" },
        character_description: { type: Type.STRING, description: "物語全体で一貫して使用する主人公の詳細な説明（外見、性格など）。" },
        pages: {
            type: Type.ARRAY,
            description: "8ページからなる物語のページ配列。",
            items: {
                type: Type.OBJECT,
                properties: {
                    page_number: { type: Type.INTEGER },
                    text: { type: Type.STRING, description: "そのページの物語の文章。4〜6歳の子ども向けに、ひらがなを多く使った、心温まる優しい言葉で書いてください。" },
                    image_prompt: { type: Type.STRING, description: "そのページのイラストを生成するための詳細な英語のプロンプト。character_descriptionを必ず反映させてください。" }
                },
                required: ["page_number", "text", "image_prompt"]
            }
        },
        afterword: { type: Type.STRING, description: "あとがき。物語の教訓や、読者への優しいメッセージ。" }
    },
    required: ["title", "character_description", "pages", "afterword"]
};

export async function generateStoryAndImages(
    idea: string,
    characterImage: File | null,
    theme: Theme,
    artStyle: ArtStyle
): Promise<Story> {
    const systemInstruction = `あなたは受賞歴のある児童文学作家であり、優しいイラストレーターです。ユーザーの断片的なアイデアを、4〜6歳の子どもを対象とした、心温まる約10ページの絵本（表紙、物語8ページ、あとがき）に変えるのがあなたの仕事です。物語は常にハッピーエンドにしてください。`;
    
    const promptParts: ({ text: string } | { inlineData: { data: string; mimeType: string } })[] = [
        {
            text: `以下の要件で絵本の構成をJSON形式で生成してください:
- 物語のアイデア: ${idea}
- テーマ: ${theme}
- アートスタイル: ${artStyle}
- 対象読者: 4-6歳
`
        }
    ];

    if(characterImage){
        promptParts.push({ text: "この画像を主人公の参考にしてください。" });
        promptParts.push(await fileToGenerativePart(characterImage));
    }

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptParts,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: storySchema,
        },
    });

    const storyData = JSON.parse(response.text);

    const imageGenerationPromises = storyData.pages.map((page: any) => {
        const prompt = `${page.image_prompt}, in the style of ${artStyle}. ${storyData.character_description}`;
        return ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: { numberOfImages: 1, aspectRatio: '4:3' }
        });
    });

    const coverImagePromise = ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `Book cover illustration for a children's book titled '${storyData.title}'. Featuring the main character: ${storyData.character_description}. Style: ${artStyle}.`,
        config: { numberOfImages: 1, aspectRatio: '4:3' }
    });
    
    imageGenerationPromises.unshift(coverImagePromise);

    const generatedImagesResponses = await Promise.all(imageGenerationPromises);

    const coverImageUrl = `data:image/png;base64,${generatedImagesResponses[0].generatedImages[0].image.imageBytes}`;
    const pageImageUrls = generatedImagesResponses.slice(1).map(res => `data:image/png;base64,${res.generatedImages[0].image.imageBytes}`);

    const finalStory: Story = {
        title: storyData.title,
        coverImageUrl: coverImageUrl,
        characterDescription: storyData.character_description,
        artStyle: artStyle,
        pages: storyData.pages.map((page: any, index: number) => ({
            id: page.page_number,
            text: page.text,
            imageUrl: pageImageUrls[index],
        })),
        afterword: storyData.afterword,
    };
    
    return finalStory;
}


const pageRegenSchema = {
    type: Type.OBJECT,
    properties: {
        new_text: { type: Type.STRING, description: "修正指示に基づいて更新された、そのページの新しい物語の文章。" },
        new_image_prompt: { type: Type.STRING, description: "修正指示に基づいて更新された、新しいイラストを生成するための詳細な英語のプロンプト。" }
    },
    required: ["new_text", "new_image_prompt"]
};


export async function regeneratePage(
    characterDescription: string,
    artStyle: ArtStyle,
    storyContext: string,
    currentPage: Page,
    instruction: string
): Promise<{ newText: string; newImageUrl: string }> {

    const systemInstruction = `あなたは絵本を修正する編集者です。ユーザーの指示に従い、指定されたページの内容を更新してください。物語の一貫性を保つことが重要です。`;
    
    const userPrompt = `
    物語のこれまでのあらすじ: ${storyContext}

    現在のページ内容:
    - テキスト: "${currentPage.text}"

    ユーザーからの修正指示: "${instruction}"

    上記の指示に基づき、このページの新しいテキストと、イラスト生成用の新しい英語プロンプトをJSON形式で生成してください。
    イラストのプロンプトには、必ず主人公の特徴「${characterDescription}」とアートスタイル「${artStyle}」を反映させてください。
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: pageRegenSchema,
        },
    });

    const regenData = JSON.parse(response.text);
    const newText = regenData.new_text;
    const newImagePrompt = `${regenData.new_image_prompt}, in the style of ${artStyle}. ${characterDescription}`;
    
    const imageResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: newImagePrompt,
        config: { numberOfImages: 1, aspectRatio: '4:3' }
    });

    const newImageUrl = `data:image/png;base64,${imageResponse.generatedImages[0].image.imageBytes}`;

    return { newText, newImageUrl };
}