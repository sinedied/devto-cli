const chalk = require('chalk');
const { getArticlesFromRemoteData, generateArticleFilename, saveArticleToFile } = require('../article');
const { getAllArticles } = require('../devto');

async function init(devtoKey) {
  try {
    const remoteData = await getAllArticles(devtoKey);
    const remoteArticles = getArticlesFromRemoteData(remoteData, true);

    console.info(chalk`Found {green ${remoteArticles.length}} article(s) to import`);

    const processArticle = async article => {
      const newArticle = generateArticleFilename(article);
      await saveArticleToFile(newArticle);
    };

    await Promise.all(remoteArticles.map(processArticle));
    console.info(`Done.`);
  } catch (error) {
    console.error(chalk`Error: ${error.message}`);
    console.error(`Import failed`);
  }
}

module.exports = init;
