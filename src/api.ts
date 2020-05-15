import Debug from 'debug';
import got from 'got';
import matter from 'gray-matter';
import pThrottle from 'p-throttle';
import { Article } from './article';

const debug = Debug('devto');
const apiUrl = 'https://dev.to/api';
const paginationLimit = 1000;

// There's a limit of 10 articles created each 30 seconds by the same user,
// so we need to throttle the API calls in that case.
const throttledPostForCreate = pThrottle(got.post, 10, 30500);

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

export async function getAllArticles(devtoKey: string): Promise<RemoteArticleData[]> {
  try {
    const articles = [];
    let page = 1;
    const getPage = (page: number) =>
      got(`${apiUrl}/articles/me/all`, {
        searchParams: { per_page: paginationLimit, page },
        headers: { 'api-key': devtoKey },
        responseType: 'json'
      });

    // Handle pagination
    let newArticles: any[];
    do {
      debug('Requesting articles (page %s)', page);
      // eslint-disable-next-line no-await-in-loop
      const result = await getPage(page++);
      newArticles = result.body as any[];
      articles.push(...newArticles);
    } while (newArticles.length === paginationLimit);

    debug('Found %s remote article(s)', articles.length);
    return articles;
  } catch (error) {
    if (error && error.response) {
      debug('Debug infos: %O', error.response.body);
    }

    throw error;
  }
}

export async function getLastArticlesStats(devtoKey: string, number: number): Promise<ArticleStats[]> {
  try {
    const result = await got<any[]>(`${apiUrl}/articles/me`, {
      searchParams: { per_page: number || 10 },
      headers: { 'api-key': devtoKey },
      responseType: 'json'
    });
    return result.body.map((a) => ({
      date: a.published_at,
      title: a.title,
      views: a.page_views_count,
      reactions: a.positive_reactions_count,
      comments: a.comments_count
    }));
  } catch (error) {
    if (error && error.response) {
      debug('Debug infos: %O', error.response.body);
    }

    throw error;
  }
}

export async function updateRemoteArticle(article: Article, devtoKey: string): Promise<RemoteArticleData> {
  try {
    const markdown = matter.stringify(article, article.data, { lineWidth: -1 } as any);
    const { id } = article.data;
    // Throttle API calls in case of article creation
    const get: any = id ? got.put : throttledPostForCreate;
    const result = await get(`${apiUrl}/articles${id ? `/${id}` : ''}`, {
      headers: { 'api-key': devtoKey },
      json: { article: { title: article.data.title, body_markdown: markdown } },
      responseType: 'json'
    });
    return result.body;
  } catch (error) {
    if (error && error.response) {
      debug('Debug infos: %O', error.response.body);
    }

    throw error;
  }
}
