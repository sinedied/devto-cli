const path = require('path');
const { createInterface } = require('readline');
const fs = require('fs-extra');
const findUp = require('find-up');

const hostUrl = 'https://raw.githubusercontent.com';
const repositoryRegex = /.*\/(.*)\/(.*)\.git|^([^/]*)\/([^/]*)$/;
const imageRegex = /!\[(.*)]\((?!.*?:\/\/)([^ ]*?) *?( (?:'.*'|".*"))? *?\)/g;

const convertPathToPosix = path => path.replace(/\\/g, '/');

const isUrl = string => /^https?:\/\/\w/.test(string);

const getResourceUrl = repository => `${hostUrl}/${repository.user}/${repository.name}/master/`;

const getFullImagePath = (basePath, imagePath) => convertPathToPosix(path.normalize(path.join(basePath, imagePath)));

function parseRepository(string) {
  if (!string) {
    return null;
  }

  const match = string.match(repositoryRegex);
  if (!match) {
    return null;
  }

  const shorthand = Boolean(match[3]);
  return {
    user: shorthand ? match[3] : match[1],
    name: shorthand ? match[4] : match[2]
  };
}

async function getRepositoryFromPackage() {
  const pkgPath = await findUp('package.json');
  if (!pkgPath) {
    throw new Error(`Cannot find package.json.`);
  }

  const pkg = await fs.readJson(pkgPath);
  const repository = parseRepository((pkg.repository && pkg.repository.url) || pkg.repository);
  if (!repository) {
    throw new Error(
      `Cannot read repository from package.json.\nMake sure you have a "repository" attribute with your git repository URL.`
    );
  }

  return repository;
}

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
  parseRepository,
  getRepositoryFromPackage,
  updateImagesUrls,
  scaleNumber,
  prompt,
  replaceInFile
};
