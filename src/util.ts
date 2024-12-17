import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline';
import fs from 'fs-extra';
import { type Article, type Repository } from './models.js';

const hostUrl = 'https://raw.githubusercontent.com';
const relativeImageRegex = /!\[(.*)]\((?!.*?:\/\/)([^ ]*?) *?( (?:'.*'|".*"))? *?\)/g;
const imageRegex = /!\[(.*)]\(([^ ]*?) *?( (?:'.*'|".*"))? *?\)/g;

export const convertPathToPosix = (path: string): string => path.replace(/\\/g, '/');
const isUrl = (string: string): boolean => /^https?:\/\/\w/.test(string);
const getResourceUrl = (repository: Repository, branch: string): string =>
  `${hostUrl}/${repository.user}/${repository.name}/${branch}/`;
const getFullImagePath = (basePath: string, imagePath: string): string =>
  convertPathToPosix(path.normalize(path.join(basePath, imagePath)));

export function updateRelativeImageUrls(article: Article, repository: Repository, branch: string): Article {
  const data = { ...article.data };
  let { content } = article;
  const basePath = path.dirname(article.file!);
  let match;

  while ((match = relativeImageRegex.exec(article.content))) {
    const [link, alt = '', imagePath, title = ''] = match;

    if (imagePath) {
      const fullPath = getFullImagePath(basePath, imagePath);
      const newLink = `![${alt}](${getResourceUrl(repository, branch)}${fullPath}${title})`;
      content = content.replace(link, newLink);
    }
  }

  if (data.cover_image && !isUrl(data.cover_image)) {
    const fullPath = getFullImagePath(basePath, data.cover_image);
    data.cover_image = `${getResourceUrl(repository, branch)}${fullPath}`;
  }

  return { ...article, content, data };
}

export function getImageUrls(article: Article): string[] {
  const urls = [];
  let match;

  while ((match = imageRegex.exec(article.content))) {
    const url = match[2];
    if (url) {
      urls.push(url);
    }
  }

  if (article.data.cover_image) {
    urls.push(article.data.cover_image);
  }

  return urls;
}

export function scaleNumber(number: number, maxLength = 5): string {
  const suffix = ['', 'K', 'M', 'G', 'T', 'P'];
  const divisor = 1000;
  let index = 0;
  let result = '';

  while (number >= divisor) {
    number /= divisor;
    index++;
  }

  maxLength -= suffix[index].length;
  result = number.toString();

  for (let p = result.length; result.length > maxLength; p--) {
    result = number.toPrecision(p);
  }

  return result + suffix[index];
}

export async function prompt(question: string): Promise<string> {
  const read = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve, _) => {
    read.question(question, (answer) => {
      read.close();
      resolve(answer);
    });
  });
}

export async function replaceInFile(file: string, stringToReplace: string, replacement: string) {
  const content = await fs.readFile(file, 'utf8');
  const toReplaceRegExp = new RegExp(stringToReplace, 'g');
  const newContent = content.replace(toReplaceRegExp, replacement);
  await fs.writeFile(file, newContent);
}

export function validateTags(tags: string): string[] {
  const tagsArray = tags.split(',').map((tag) => tag.trim());
  const MAX_TAGS = 4;
  const INVALID_TAGS = tagsArray.filter((tag) => !/^[a-z\d-]+$/i.test(tag));

  if (tagsArray.length > MAX_TAGS) {
    throw new Error(`Too many tags. Max allowed: ${MAX_TAGS}`);
  }

  if (INVALID_TAGS.length > 0) {
    throw new Error(`Invalid tags: ${INVALID_TAGS.join(', ')}`);
  }

  return tagsArray;
}
