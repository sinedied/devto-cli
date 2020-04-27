const debug = require('debug')('devto');
const got = require('got');
const matter = require('gray-matter');
const pThrottle = require('p-throttle');

const apiUrl = 'https://dev.to/api';

// There's a limit of 10 articles created each 30 seconds by the same user,
// so we need to throttle the API calls in that case.
const throttledGotForCreate = pThrottle(got, 10, 30500);

async function getAllArticles(devtoKey) {
  try {
    // TODO: pagination
    const result = await got(`${apiUrl}/articles/me/all?per_page=1000`, {
      headers: { 'api-key': devtoKey },
      responseType: 'json'
    });
    return result.body;
  } catch (error) {
    if (error && error.response) {
      debug('Debug infos: %O', error.response.body);
    }

    throw error;
  }
}

async function getLastArticlesStats(devtoKey, number) {
  try {
    const result = await got(`${apiUrl}/articles/me?per_page=${number}`, {
      headers: { 'api-key': devtoKey },
      responseType: 'json'
    });
    return result.body.map(a => ({
      date: a.published_at,
      title: a.title,
      views: a.page_views_count,
      reactions: a.positive_reactions_count,
      comments: a.comments_count
    }));
  } catch (error) {
    if (error && error.response) {
      debug('Debug infos: %O', error.response.body);
    }

    throw error;
  }
}

async function updateRemoteArticle(article, devtoKey) {
  try {
    const markdown = matter.stringify(article, article.data);
    const { id } = article.data;
    // Throttle API calls in case of article creation
    const get = id ? got : throttledGotForCreate;
    const result = await get[id ? 'put' : 'post'](`${apiUrl}/articles${id ? `/${id}` : ''}`, {
      headers: { 'api-key': devtoKey },
      json: { article: { title: article.title, body_markdown: markdown } },
      responseType: 'json'
    });
    return result.body;
  } catch (error) {
    if (error && error.response) {
      debug('Debug infos: %O', error.response.body);
    }

    throw error;
  }
}

module.exports = {
  getAllArticles,
  getLastArticlesStats,
  updateRemoteArticle
};
