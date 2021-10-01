export type ArticleMetadata = Partial<{
  [key: string]: string | string[] | boolean | number | null;
  title: string | null;
  description: string | null;
  cover_image: string | null;
  tags: string | string[] | null;
  canonical_url: string | null;
  published: boolean | null;
  id: number | null;
  date: string | null;
}>;

export interface Article {
  file: string | null;
  data: ArticleMetadata;
  content: string;
  hasChanged?: boolean;
}

// This is a partial interface just enough for our needs
export interface RemoteArticleData {
  id: number;
  title: string;
  description: string;
  cover_image: string;
  tag_list: string[];
  canonical_url: string;
  url: string;
  published: boolean;
  published_at: string;
  body_markdown: string;
  page_views_count: number;
  positive_reactions_count: number;
  comments_count: number;
}

export interface ArticleStats {
  date: string;
  title: string;
  views: number;
  reactions: number;
  comments: number;
}

export interface Repository {
  user: string;
  name: string;
}
