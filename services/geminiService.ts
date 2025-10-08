import { ArtStyle, Theme, Story, Page } from '../types';

async function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// A helper function to call our API proxy
async function callProxy(endpoint: string, payload: object) {
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint, payload }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || 'API request failed';
        throw new Error(errorMessage);
    }
    return response.json();
}

const storySchema = {
    type: "OBJECT",
    properties: {
        title: { type: "STRING", description: "絵本のタイトル" },
        character_description: { type: "STRING", description: "物語全体で一貫して使用する主人公の詳細な説明（外見、性格など）。" },
        pages: {
            type: "ARRAY",
            description: "8ページからなる物語のページ配列。",
            items: {
                type: "OBJECT",
                properties: {
                    page_number: { type: "INTEGER" },
                    text: { type: "STRING", description: "そのページの物語の文章。4〜6歳の子ども向けに、ひらがなを多く使った、心温まる優しい言葉で書いてください。" },
                    image_prompt: { type: "STRING", description: "そのページのイラストを生成するための詳細な英語のプロンプト。character_descriptionを必ず反映させてください。" }
                },
                required: ["page_number", "text", "image_prompt"]
            }
        },
        afterword: { type: "STRING", description: "あとがき。物語の教訓や、読者への優しいメッセージ。" }
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
    
    const promptParts: any[] = [
        {
            text: `以下の要件で絵本の構成をJSON形式で生成してください:
- 物語のアイデア: ${idea}
- テーマ: ${theme}
- アートスタイル: ${artStyle}
- 対象読者: 4-6歳
`
        }
    ];

    if (characterImage) {
        const base64Data = await fileToBase64(characterImage);
        promptParts.push({ text: "この画像を主人公の参考にしてください。" });
        promptParts.push({
            inlineData: { data: base64Data, mimeType: characterImage.type },
        });
    }

    const storyResponse = await callProxy('models/gemini-2.5-flash:generateContent', {
        contents: [{ parts: promptParts }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: storySchema,
        }
    });

    const storyData = JSON.parse(storyResponse.candidates[0].content.parts[0].text);

    const generatedImagesResponses = [];

    // Generate Cover Image
    const coverPrompt = `Book cover illustration for a children's book titled '${storyData.title}'. Featuring the main character: ${storyData.character_description}. Style: ${artStyle}.`;
    const coverImageResponse = await callProxy('models/imagen-4.0-generate-001:predict', {
        instances: [{ prompt: coverPrompt }],
        parameters: { sampleCount: 1, aspectRatio: '4:3' }
    });
    generatedImagesResponses.push(coverImageResponse);

    // Generate Page Images sequentially
    for (const page of storyData.pages) {
        const prompt = `${page.image_prompt}, in the style of ${artStyle}. ${storyData.character_description}`;
        const pageImageResponse = await callProxy('models/imagen-4.0-generate-001:predict', {
            instances: [{ prompt }],
            parameters: { sampleCount: 1, aspectRatio: '4:3' }
        });
        generatedImagesResponses.push(pageImageResponse);
    }

    const coverImageUrl = `data:image/png;base64,${generatedImagesResponses[0].predictions[0].bytesBase64Encoded}`;
    const pageImageUrls = generatedImagesResponses.slice(1).map(res => `data:image/png;base64,${res.predictions[0].bytesBase64Encoded}`);

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


const coverRegenSchema = {
    type: "OBJECT",
    properties: {
        new_title: { type: "STRING", description: "修正指示に基づいて更新された、絵本の新しいタイトル。" },
        new_image_prompt: { type: "STRING", description: "修正指示に基づいて更新された、新しい表紙イラストを生成するための詳細な英語のプロンプト。" }
    },
    required: ["new_title", "new_image_prompt"]
};

export async function regenerateCover(
    characterDescription: string,
    artStyle: ArtStyle,
    currentTitle: string,
    instruction: string
): Promise<{ newTitle: string; newCoverImageUrl: string }> {
    const systemInstruction = `あなたは絵本の表紙をデザインするデザイナーです。ユーザーの指示に従い、タイトルとイラストのアイデアを更新してください。`;

    const userPrompt = `
    現在の表紙の情報:
    - タイトル: "${currentTitle}"

    ユーザーからの修正指示: "${instruction}"

    上記の指示に基づき、この絵本の新しいタイトルと、表紙イラスト生成用の新しい英語プロンプトをJSON形式で生成してください。
    イラストのプロンプトには、必ず主人公の特徴「${characterDescription}」とアートスタイル「${artStyle}」を反映させてください。
    `;

    const regenResponse = await callProxy('models/gemini-2.5-flash:generateContent', {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: coverRegenSchema,
        },
    });

    const regenData = JSON.parse(regenResponse.candidates[0].content.parts[0].text);
    const newTitle = regenData.new_title;
    const newImagePrompt = `Book cover illustration for a children's book titled '${newTitle}'. Featuring the main character: ${characterDescription}. Style: ${artStyle}. ${regenData.new_image_prompt}`;
    
    const imageResponse = await callProxy('models/imagen-4.0-generate-001:predict', {
        instances: [{ prompt: newImagePrompt }],
        parameters: {
            sampleCount: 1,
            aspectRatio: '4:3'
        }
    });

    const newCoverImageUrl = `data:image/png;base64,${imageResponse.predictions[0].bytesBase64Encoded}`;

    return { newTitle, newCoverImageUrl };
}

const pageRegenSchema = {
    type: "OBJECT",
    properties: {
        new_text: { type: "STRING", description: "修正指示に基づいて更新された、そのページの新しい物語の文章。" },
        new_image_prompt: { type: "STRING", description: "修正指示に基づいて更新された、新しいイラストを生成するための詳細な英語のプロンプト。" }
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

    const regenResponse = await callProxy('models/gemini-2.5-flash:generateContent', {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: pageRegenSchema,
        },
    });

    const regenData = JSON.parse(regenResponse.candidates[0].content.parts[0].text);
    const newText = regenData.new_text;
    const newImagePrompt = `${regenData.new_image_prompt}, in the style of ${artStyle}. ${characterDescription}`;
    
    const imageResponse = await callProxy('models/imagen-4.0-generate-001:predict', {
        instances: [{ prompt: newImagePrompt }],
        parameters: {
            sampleCount: 1,
            aspectRatio: '4:3'
        }
    });

    const newImageUrl = `data:image/png;base64,${imageResponse.predictions[0].bytesBase64Encoded}`;

    return { newText, newImageUrl };
}