import path from 'node:path';
import Debug from 'debug';
import fs from 'fs-extra';
import { globby } from 'globby';
import matter from 'gray-matter';
import slugify from 'slugify';
import got, { RequestError } from 'got';
import pMap from 'p-map';
import { updateRelativeImageUrls, getImageUrls, validateTags } from './util.js';
import { type Article, type ArticleMetadata, type RemoteArticleData, type Repository } from './models.js';

const debug = Debug('article');
export const defaultArticlesFolder = 'posts';

export async function getArticlesFromFiles(filesGlob: string[]): Promise<Article[]> {
  const files: string[] = await globby(filesGlob);
  const articles = await Promise.all(files.map(getArticleFromFile));
  return articles.filter((article) => article !== null);
}

async function getArticleFromFile(file: string): Promise<Article | null> {
  const content = await fs.readFile(file, 'utf8');
  const article = matter(content, { language: 'yaml' });

  // An article must have a least a title property and sync should not be disabled
  if (!article.data.title || (article.data.devto_sync !== undefined && !article.data.devto_sync)) {
    debug('File "%s" do not have a title or has sync disabled, skipping', file);
    return null;
  }

  return { file, ...article };
}

export function getArticlesFromRemoteData(data: RemoteArticleData[]): Article[] {
  return (data || []).map(getArticleFromRemoteData);
}

function generateFrontMatterMetadata(remoteData: RemoteArticleData): ArticleMetadata {
  const { data: frontmatter } = matter(remoteData.body_markdown);

  const tags: string[] = [];
  try {
    validateTags(remoteData.tag_list.join(', '));
  } catch (error) {
    // Use type guard or type assertion
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Tags validation failed for article "${remoteData.title}": ${errorMessage}`);
  }

  // Note: series info is missing here as it's not available through the dev.to API yet
  const metadata: ArticleMetadata = {
    title: frontmatter.title ? null : remoteData.title,
    description: frontmatter.description ? null : remoteData.description,
    tags: tags.join(', '),
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

export function prepareArticleForDevto(article: Article, repository: Repository, branch: string): Article {
  return updateRelativeImageUrls(article, repository, branch);
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
    throw new Error(`Cannot write to file "${article.file ?? ''}": ${String(error)}`);
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
  if (!article.data?.title) {
    throw new Error('No title found');
  }

  // Slugify has a typing issue with latest versions of typescript
  const name = (slugify as any)(article.data.title, { lower: true, strict: true }) as string;
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

    if (remoteArticle?.data.id) {
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
    throw new Error(`Cannot find published article on dev.to: ${article.data.title ?? '<no title>'}`);
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

export async function checkArticleForOfflineImages(article: Article): Promise<string | null> {
  try {
    const urls = getImageUrls(article);
    debug('Found %s image(s) to check for "%s"', urls.length, article.data.title);

    const checkUrl = async (url: string) => {
      debug('Checking image "%s"…', url);
      await got(url);
      return null;
    };

    await pMap(urls, checkUrl, { concurrency: 5 });
    return null;
  } catch (error) {
    if (error instanceof RequestError && error.response) {
      const url = error.response.requestUrl.toString();
      debug('Image "%s" appears to be offline', url);
      return url;
    }

    debug('Error while checking image: %s', String(error));
    return String(error);
  }
}
