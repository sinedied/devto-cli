import Debug from 'debug';
import got, { Got, RequestError } from 'got';
import matter from 'gray-matter';
import pThrottle from 'p-throttle';
import { Article, RemoteArticleData, ArticleStats } from './models.js';

const debug = Debug('devto');
const apiUrl = 'https://dev.to/api';
const paginationLimit = 1000;

// There's a limit of 10 articles created each 30 seconds by the same user,
// so we need to throttle the API calls in that case.
// The insane type casting is due to typing issues with p-throttle.
const throttledPostForCreate = pThrottle({ limit: 10, interval: 30_500 })(got.post) as any as Got['post'];

export async function getAllArticles(devtoKey: string): Promise<RemoteArticleData[]> {
  try {
    const articles = [];
    let page = 1;
    const getPage = (page: number) =>
      got<RemoteArticleData[]>(`${apiUrl}/articles/me/all`, {
        searchParams: { per_page: paginationLimit, page },
        headers: { 'api-key': devtoKey },
        responseType: 'json'
      });

    // Handle pagination
    let newArticles: RemoteArticleData[];
    do {
      debug('Requesting articles (page %s)', page);
      // eslint-disable-next-line no-await-in-loop
      const result = await getPage(page++);
      newArticles = result.body;
      articles.push(...newArticles);
    } while (newArticles.length === paginationLimit);

    debug('Found %s remote article(s)', articles.length);
    return articles;
  } catch (error) {
    if (error instanceof RequestError && error?.response) {
      debug('Debug infos: %O', error.response.body);
    }

    throw error;
  }
}

export async function getLastArticlesStats(devtoKey: string, number: number): Promise<ArticleStats[]> {
  try {
    const result = await got<RemoteArticleData[]>(`${apiUrl}/articles/me`, {
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
    if (error instanceof RequestError && error.response) {
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
    const get = id ? got.put : throttledPostForCreate;
    const result = await get(`${apiUrl}/articles${id ? `/${id}` : ''}`, {
      headers: { 'api-key': devtoKey },
      json: { article: { title: article.data.title, body_markdown: markdown } },
      responseType: 'json'
    });
    return result.body as RemoteArticleData;
  } catch (error) {
    if (error instanceof RequestError && error.response) {
      debug('Debug infos: %O', error.response.body);
    }

    throw error;
  }
}
