import Debug from 'debug';
import path from 'path';
import fs from 'fs-extra';
import globby from 'globby';
import matter from 'gray-matter';
import slugify from 'slugify';
import got from 'got';
import pMap from 'p-map';
import { updateRelativeImageUrls, getImageUrls } from './util';
import { Repository } from './repo';
import { RemoteArticleData } from './api';

const debug = Debug('article');
export const defaultArticlesFolder = 'posts';

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

export async function getArticlesFromFiles(filesGlob: string[]): Promise<Article[]> {
  const files = await globby(filesGlob);
  return Promise.all(files.map(getArticleFromFile));
}

async function getArticleFromFile(file: string): Promise<Article> {
  const content = await fs.readFile(file, 'utf-8');
  const article = matter(content, { language: 'yaml' });
  return { file, ...article };
}

export function getArticlesFromRemoteData(data: RemoteArticleData[]): Article[] {
  return (data || []).map(getArticleFromRemoteData);
}

function generateFrontMatterMetadata(remoteData: RemoteArticleData): ArticleMetadata {
  const { data: frontmatter } = matter(remoteData.body_markdown);
  // Note: series info is missing here as it's not available through the dev.to API yet
  const metadata: ArticleMetadata = {
    title: frontmatter.title ? null : remoteData.title,
    description: frontmatter.description ? null : remoteData.description,
    tags: frontmatter.tags ? null : remoteData.tag_list.join(', '),
    cover_image: frontmatter.cover_image ? null : remoteData.cover_image,
    canonical_url:
      frontmatter.canonical_url || remoteData.url === remoteData.canonical_url ? null : remoteData.canonical_url,
    published: remoteData.published ? true : null,
    id: remoteData.id,
    date: remoteData.published_at
  };

  // Clean up unset properties
  for (const p in metadata) {
    if (metadata[p] === null || metadata[p] === undefined) {
      delete metadata[p];
    }
  }

  return metadata;
}

function getArticleFromRemoteData(data: RemoteArticleData): Article {
  const article = matter(data.body_markdown);
  return {
    ...article,
    file: null,
    data: {
      ...article.data,
      ...generateFrontMatterMetadata(data)
    }
  };
}

export function prepareArticleForDevto(article: Article, repository: Repository): Article {
  return updateRelativeImageUrls(article, repository);
}

export async function saveArticleToFile(article: Article) {
  try {
    if (!article.file) {
      throw new Error('no filename provided');
    }

    const markdown = matter.stringify(article.content, article.data, { lineWidth: -1 } as any);
    await fs.ensureDir(path.dirname(article.file));
    await fs.writeFile(article.file, markdown);
    debug('Saved article "%s" to file "%s"', article.data.title, article.file);
  } catch (error) {
    throw new Error(`Cannot write to file "${article.file}": ${error}`);
  }
}

export async function updateLocalArticle(article: Article, remoteData: RemoteArticleData): Promise<Article> {
  const data = { ...article.data };
  const newArticle = { ...article, data };
  let hasChanged = false;

  if (remoteData.id) {
    data.id = remoteData.id;
    hasChanged = true;
  }

  if (remoteData.published_at) {
    data.date = remoteData.published_at;
    hasChanged = true;
  }

  return { ...newArticle, hasChanged };
}

export function generateArticleFilename(article: Article): Article {
  if (!article.data || !article.data.title) {
    throw new Error('No title found');
  }

  const name = slugify(article.data.title as string, { lower: true, strict: true });
  const file = path.join(defaultArticlesFolder, name + '.md');
  return { ...article, file };
}

export function reconcileLocalArticles(remoteArticles: Article[], localArticles: Article[], idOnly = true): Article[] {
  return localArticles.map((article) => {
    if (article.data.id) {
      return article;
    }

    const title = article.data.title?.trim();
    const remoteArticle = remoteArticles.find((a) => a.data.title?.trim() === title);

    if (remoteArticle && remoteArticle.data.id) {
      debug('Reconciled article "%s" to ID %s', article.data.title, remoteArticle.data.id);
      const reconciledMetadata = idOnly ? { id: remoteArticle.data.id } : { ...remoteArticle.data };

      return {
        ...article,
        data: {
          ...article.data,
          ...reconciledMetadata
        },
        hasChanged: true
      };
    }

    return article;
  });
}

function areArticlesEqual(article1: Article, article2: Article): boolean {
  // Note: ignore date for comparison, since dev.to does not always format it the same way,
  // and it's not meant to be updated anyways
  const options: any = { lineWidth: -1 };
  const a1 = matter.stringify(article1, { ...article1.data, date: null }, options);
  const a2 = matter.stringify(article2, { ...article2.data, date: null }, options);
  return a1 === a2;
}

export function checkIfArticleNeedsUpdate(remoteArticles: Article[], article: Article): boolean {
  if (!article.data.id) {
    return true;
  }

  const remoteArticle = remoteArticles.find((a) => a.data.id === article.data.id);
  if (!remoteArticle) {
    throw new Error(`Cannot find published article on dev.to: ${article.data.title}`);
  }

  return !areArticlesEqual(remoteArticle, article);
}

export async function createNewArticle(file: string) {
  const article = {
    file,
    content: `My article content`,
    data: {
      title: 'My article title',
      description: 'My article description',
      tags: '',
      cover_image: '',
      canonical_url: null,
      published: false
    }
  };

  await saveArticleToFile(article);
}

export async function checkArticleForOfflineImages(article: Article): Promise<boolean> {
  try {
    const urls = getImageUrls(article);
    debug('Found %s image(s) to check for "%s"', urls.length, article.data.title);

    const checkUrl = async (url: string) => {
      debug('Checking image "%s"…', url);
      await got(url);
      return false;
    };

    await pMap(urls, checkUrl, { concurrency: 5 });
    return false;
  } catch (error) {
    if (error.response) {
      debug('Image "%s" appears to be offline', error.response.requestUrl);
    } else {
      debug('Error while checking image: %s', error.toString());
    }

    return true;
  }
}
