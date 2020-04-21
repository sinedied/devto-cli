const chalk = require('chalk');
const pMap = require('p-map');
const {
  getArticlesFromFiles,
  getArticlesFromRemoteData,
  prepareArticleForDevto,
  checkIfArticleNeedsUpdate,
  updateLocalArticle
} = require('../article');
const { getAllArticles, updateRemoteArticle } = require('../devto');
const { parseRepository, getRepositoryFromPackage } = require('../repo');

async function publishArticles(files, options) {
  options = options || {};
  try {
    const repository = parseRepository(options.repo) || (await getRepositoryFromPackage());
    const articles = await getArticlesFromFiles(files);

    console.info(chalk`Found {green ${articles.length}} article(s)`);
    console.info('Publishing articles on dev.to, please wait…');

    const remoteData = await getAllArticles(options.devtoKey);
    const remoteArticles = getArticlesFromRemoteData(remoteData);

    let hasChanges = false;
    const processArticle = async article => {
      const newArticle = prepareArticleForDevto(article, repository);
      const needsUpdate = checkIfArticleNeedsUpdate(remoteArticles, newArticle);

      if (needsUpdate && !options.dryRun) {
        const result = await updateRemoteArticle(newArticle, options.devtoKey);
        // TODO: show progress
        // TODO: set status, try/catch here

        const localArticle = await updateLocalArticle(article, result);
        hasChanges |= localArticle.hasChanged;
      }
    };

    await pMap(articles, processArticle, { concurrency: 5 });
    // TODO: log results

    if (hasChanges) {
      console.log('Some files has changed.');
    }
  } catch (error) {
    console.error(chalk`Error: ${error.message}`);
    console.error(`Publish failed`);
  }
}

module.exports = publishArticles;
