const debug = require('debug')('push');
const chalk = require('chalk');
const ora = require('ora');
const { table, getBorderCharacters } = require('table');
const pMap = require('p-map');
const {
  getArticlesFromFiles,
  getArticlesFromRemoteData,
  prepareArticleForDevto,
  checkIfArticleNeedsUpdate,
  updateLocalArticle,
  saveArticleToFile,
  reconcileLocalArticles
} = require('../article');
const { getAllArticles, updateRemoteArticle } = require('../devto');
const { getRepository } = require('../repo');

const syncStatus = {
  upToDate: chalk`{grey [UP-TO-DATE]}`,
  created: chalk`{green [CREATED]}`,
  updated: chalk`{green [UPDATED]}`,
  reconciled: chalk`{cyan [RECONCILED]}`,
  failed: chalk`{red [FAILED]}`,
  outOfSync: chalk`{yellow [OUT-OF-SYNC]}`
};
const publishedStatus = {
  draft: chalk`{grey [DRAFT]}`,
  published: chalk`{cyan [PUBLISHED]}`
};

function showResults(results) {
  const rows = results.map((r) => [r.status, r.publishedStatus, r.article.data.title]);
  const usedWidth = 27; // Status columns + padding
  const availableWidth = process.stdout.columns || 80;
  const maxTitleWidth = Math.max(availableWidth - usedWidth, 8);

  console.info(
    table(rows, {
      drawHorizontalLine: () => false,
      border: getBorderCharacters('void'),
      columnDefault: { paddingLeft: 0, paddingRight: 1 },
      columns: { 2: { truncate: maxTitleWidth, width: maxTitleWidth } }
    }).slice(0, -1)
  );
}

async function getRemoteArticles(devtoKey) {
  const remoteData = await getAllArticles(devtoKey);
  const remoteArticles = getArticlesFromRemoteData(remoteData);
  debug('Retrieved %s article(s)', remoteArticles.length);
  return remoteArticles;
}

async function processArticles(localArticles, remoteArticles, repository, options) {
  const processArticle = async (article) => {
    let newArticle = prepareArticleForDevto(article, repository);
    const needsUpdate = checkIfArticleNeedsUpdate(remoteArticles, newArticle);
    let status = newArticle.hasChanged ? syncStatus.reconciled : syncStatus.upToDate;
    let updateResult = null;

    if (needsUpdate) {
      try {
        if (!options.dryRun) {
          updateResult = await updateRemoteArticle(newArticle, options.devtoKey);
          newArticle = await updateLocalArticle(article, updateResult);
        }

        status = newArticle.data.id ? syncStatus.updated : syncStatus.created;
      } catch (error) {
        debug('Article update failed: %s', error.toString());
        status = syncStatus.failed;
      }
    }

    if (updateResult || newArticle.hasChanged) {
      try {
        debug('Article "%s" has pending changes', newArticle.data.title);
        if (!options.dryRun) {
          await saveArticleToFile(newArticle);
        }
      } catch (error) {
        debug('Cannot save article "%s": %s', newArticle.data.title, error.toString());
        status = syncStatus.outOfSync;
      }
    }

    return {
      article: newArticle,
      status,
      publishedStatus: newArticle.data.published ? publishedStatus.published : publishedStatus.draft
    };
  };

  return pMap(localArticles, processArticle, { concurrency: 5 });
}

async function push(files, options) {
  options = options || {};
  files = files.length > 0 ? files : ['posts/**/*.md'];
  debug('files: %O', files);
  debug('options: %O', options);

  if (!options.devtoKey) {
    process.exitCode = -1;
    return console.error(
      chalk`{red No dev.to API key provided.}\nUse {bold --token} option or {bold .env} file to provide one.`
    );
  }

  if (options.dryRun) {
    console.warn(chalk`{yellow Running in dry run mode, local and remote changes will be skipped}`);
  }

  const spinner = ora({ color: 'green', spinner: 'point' });

  try {
    const repository = getRepository(options.repo);
    if (!repository) {
      process.exitCode = -1;
      return console.error(
        chalk`{red No GitHub repository provided.}\nUse {bold --repo} option or {bold .env} file to provide one.`
      );
    }

    let articles = await getArticlesFromFiles(files);
    console.info(chalk`Found {green ${articles.length}} article(s)`);

    if (articles.length === 0) {
      console.warn(chalk`No articles to push.`);
      return;
    }

    spinner.text = 'Retrieving articles from dev.to…';
    spinner.start();
    const remoteArticles = await getRemoteArticles(options.devtoKey);

    if (options.reconcile) {
      spinner.text = 'Reconciling articles…';
      articles = reconcileLocalArticles(remoteArticles, articles);
    }

    spinner.text = 'Pushing articles to dev.to…';
    const results = await processArticles(articles, remoteArticles, repository, options);

    spinner.stop();
    showResults(results);

    const outOfSync = results.some((r) => r.status === syncStatus.outOfSync);
    if (outOfSync) {
      console.info(chalk`{yellow Some local files are out of sync. Retry pushing with {bold --reconcile} option.}`);
    }
  } catch (error) {
    spinner.stop();
    console.error(chalk`{red Error: ${error.message}}`);
    console.error('Push failed');
  }
}

module.exports = push;
