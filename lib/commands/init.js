const debug = require('debug')('init');
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
const {
  getRepositoryFromStringOrEnv,
  parseRepository,
  getShorthandString,
  hasGitInstalled,
  initGitRepository
} = require('../repo');

async function createGitHubAction(repoString) {
  let repo = getRepositoryFromStringOrEnv(repoString);
  while (!repo) {
    // eslint-disable-next-line no-await-in-loop
    const string = await prompt(chalk`{green >} Enter your GitHub repository: {grey (username/repository)} `);
    repo = parseRepository(string);
  }

  await fs.copy(path.join(__dirname, '../../template/.github'), '.github');
  await replaceInFile('.github/workflows/publish.yml', 'USERNAME/REPO', getShorthandString(repo));
}

async function importArticlesFromDevTo(devtoKey) {
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

async function init(options) {
  options = options || {};
  options.pull = options.pull || false;
  debug('options: %O', options);

  if (options.pull && !options.devtoKey) {
    process.exitCode = -1;
    return console.error(
      chalk`{red No dev.to API key provided.}\nUse {bold --token} option or {bold .env} file to provide one.`
    );
  }

  try {
    await createGitHubAction(options.repo);

    if (options.pull) {
      await importArticlesFromDevTo(options.devtoKey);
    }

    const articlesFolderExists = await fs.exists(defaultArticlesFolder);
    if (!articlesFolderExists) {
      await createNewArticle(path.join(defaultArticlesFolder, 'article.md'));
    }

    if (!options.skipGit) {
      if (await hasGitInstalled()) {
        await initGitRepository();
      } else {
        console.warn(chalk`{yellow Cannot init git repository, git binary not found}`);
      }
    }

    console.info('Init done.');
    console.info(chalk`Take a look at {green .github/workflows/publish.yml} for next steps.`);
  } catch (error) {
    process.exitCode = -1;
    console.error(chalk`{red Error: ${error.message}}`);
    console.error('Init failed.');
  }
}

module.exports = init;
