const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const {
  defaultArticlesFolder,
  getArticlesFromRemoteData,
  generateArticleFilename,
  saveArticleToFile,
  createNewArticle
} = require('../article');
const { getAllArticles } = require('../devto');
const { prompt, replaceInFile } = require('../util');
const { parseRepository } = require('../repo');

async function initWorkflow() {
  let repo = null;
  while (!repo) {
    // eslint-disable-next-line no-await-in-loop
    const string = await prompt(chalk`{green >} Enter your GitHub repository: {grey (username/repository)} `);
    repo = parseRepository(string) ? string : repo;
  }

  await fs.copy(path.join(__dirname, '../../template/.github'), '.github');
  await replaceInFile('.github/workflows/publish.yml', 'USERNAME/REPO', repo);
}

async function importArticlesFromDevTo(devtoKey) {
  if (!devtoKey) {
    throw new Error('No dev.to API key provided');
  }

  const remoteData = await getAllArticles(devtoKey);
  console.info(`Retrieving articles from dev.to…`);

  const remoteArticles = getArticlesFromRemoteData(remoteData);

  console.info(chalk`Found {green ${remoteArticles.length}} article(s) to import`);

  const processArticle = async article => {
    const newArticle = generateArticleFilename(article);
    await saveArticleToFile(newArticle);
  };

  await Promise.all(remoteArticles.map(processArticle));
}

async function init(devtoKey, pull = false) {
  try {
    await initWorkflow();

    if (pull) {
      await importArticlesFromDevTo(devtoKey);
    }

    const articlesFolderExists = await fs.exists(defaultArticlesFolder);
    if (!articlesFolderExists) {
      await createNewArticle(path.join(defaultArticlesFolder, 'article.md'));
    }

    console.info(`Init done.`);
    console.info(chalk`Take a look at {green .github/workflows/publish.yml} for next steps.`);
  } catch (error) {
    process.exitCode = -1;
    console.error(chalk`{red Error: ${error.message}}`);
    console.error(chalk`Init failed.`);
  }
}

module.exports = init;
