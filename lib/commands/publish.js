const chalk = require('chalk');
const pMap = require('p-map');
const { getArticlesFromFiles, prepareArticleForDevto, updateLocalArticle } = require('../article');
const { updateRemoteArticle } = require('../devto');
const { getRepositoryFromPackage } = require('../util');

async function publishArticles(files, options) {
  try {
    const repository = await getRepositoryFromPackage();
    const articles = await getArticlesFromFiles(files);

    console.info(chalk`Found {green ${articles.length}} article(s)`);
    console.info('Publishing articles on dev.to, please wait…');

    let hasChanges = false;
    const processArticle = async article => {
      const newArticle = prepareArticleForDevto(article, repository);

      // TODO: check if need to update before POST/PUT

      const result = await updateRemoteArticle(newArticle, options.devtoKey);
      // TODO: show progress
      // TODO: set status, try/catch here

      const localArticle = await updateLocalArticle(article, result);
      hasChanges |= localArticle.hasChanged;
    };

    await pMap(articles, processArticle, { concurrency: 5 });
    // TODO: log results

    if (hasChanges) {
      console.log('Some files has changed.');
    }
  } catch (error) {
    console.error(chalk`Error: ${error.message}`);
    throw new Error(`Publish failed`);
  }
}

module.exports = publishArticles;
