const path = require('path');
const { createInterface } = require('readline');
const fs = require('fs-extra');

const hostUrl = 'https://raw.githubusercontent.com';
const imageRegex = /!\[(.*)]\((?!.*?:\/\/)([^ ]*?) *?( (?:'.*'|".*"))? *?\)/g;

const convertPathToPosix = path => path.replace(/\\/g, '/');

const isUrl = string => /^https?:\/\/\w/.test(string);

const getResourceUrl = repository => `${hostUrl}/${repository.user}/${repository.name}/master/`;

const getFullImagePath = (basePath, imagePath) => convertPathToPosix(path.normalize(path.join(basePath, imagePath)));

function updateImagesUrls(article, repository) {
  const data = { ...article.data };
  let { content } = article;
  const basePath = path.dirname(article.file);
  let match;

  while ((match = imageRegex.exec(article.content))) {
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

function scaleNumber(number, maxLength = 5) {
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

function prompt(question) {
  const read = createInterface({ input: process.stdin, output: process.stdout });
  // eslint-disable-next-line promise/param-names
  return new Promise((resolve, _) => {
    read.question(question, answer => {
      read.close();
      resolve(answer);
    });
  });
}

async function replaceInFile(file, stringToReplace, replacement) {
  const content = await fs.readFile(file, 'utf-8');
  const newContent = content.replace(stringToReplace, replacement);
  await fs.writeFile(file, newContent);
}

module.exports = {
  convertPathToPosix,
  updateImagesUrls,
  scaleNumber,
  prompt,
  replaceInFile
};
