import path from 'path';
import { createInterface } from 'readline';
import fs from 'fs-extra';
import { Repository } from './repo';
import { Article } from './article';

const hostUrl = 'https://raw.githubusercontent.com';
const relativeImageRegex = /!\[(.*)]\((?!.*?:\/\/)([^ ]*?) *?( (?:'.*'|".*"))? *?\)/g;
const imageRegex = /!\[(.*)]\(([^ ]*?) *?( (?:'.*'|".*"))? *?\)/g;

export const convertPathToPosix = (path: string) => path.replace(/\\/g, '/');
const isUrl = (string: string) => /^https?:\/\/\w/.test(string);
const getResourceUrl = (repository: Repository) => `${hostUrl}/${repository.user}/${repository.name}/master/`;
const getFullImagePath = (basePath: string, imagePath: string) => convertPathToPosix(path.normalize(path.join(basePath, imagePath)));

export function updateRelativeImageUrls(article: Article, repository: Repository) {
  const data = { ...article.data };
  let { content } = article;
  const basePath = path.dirname(article.file as string);
  let match;

  while ((match = relativeImageRegex.exec(article.content))) {
    const [link, alt = '', imagePath, title = ''] = match;

    if (imagePath) {
      const fullPath = getFullImagePath(basePath, imagePath);
      const newLink = `![${alt}](${getResourceUrl(repository)}${fullPath}${title})`;
      content = content.replace(link, newLink);
    }
  }

  if (data.cover_image && !isUrl(data.cover_image)) {
    const fullPath = getFullImagePath(basePath, data.cover_image);
    data.cover_image = `${getResourceUrl(repository)}${fullPath}`;
  }

  return { ...article, content, data };
}

export function getImageUrls(article: Article) {
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

export function scaleNumber(number: number, maxLength = 5) {
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

export function prompt(question: string): Promise<string> {
  const read = createInterface({ input: process.stdin, output: process.stdout });
  // eslint-disable-next-line promise/param-names
  return new Promise((resolve, _) => {
    read.question(question, (answer) => {
      read.close();
      resolve(answer);
    });
  });
}

export async function replaceInFile(file: string, stringToReplace: string, replacement: string) {
  const content = await fs.readFile(file, 'utf-8');
  const newContent = content.replace(stringToReplace, replacement);
  await fs.writeFile(file, newContent);
}