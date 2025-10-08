
export interface Page {
  id: number;
  text: string;
  imageUrl: string;
  imagePrompt?: string;
}

export interface Story {
  title: string;
  coverImageUrl: string;
  characterDescription: string;
  artStyle: ArtStyle;
  pages: Page[];
  afterword: string;
}

export enum ArtStyle {
  Watercolor = "水彩画風",
  Anime = "アニメ風",
  Crayon = "クレヨン画風",
  Digital = "デジタルアート風",
}

export enum Theme {
  Friendship = "友情",
  Courage = "勇気",
  Adventure = "冒険",
  Family = "家族",
}