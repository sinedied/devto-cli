const got = require('got');
const matter = require('gray-matter');
const pThrottle = require('p-throttle');

const apiUrl = 'https://dev.to/api';

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
      throw new Error(error.response.body);
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
      throw new Error(error.response.body);
    }

    throw error;
  }
}

async function updateRemoteArticle(article, devtoKey) {
  try {
    const markdown = matter.stringify(article, article.data);
    const { id } = article.data;
    const callApi = () =>
      got[id ? 'put' : 'post'](`${apiUrl}/articles${id ? `/${id}` : ''}`, {
        headers: { 'api-key': devtoKey },
        json: { article: { title: article.title, body_markdown: markdown } },
        responseType: 'json'
      });

    // There's a limit of 10 articles created each 30 seconds by the same user,
    // so we need to throttle the API calls in that case.
    const result = await (id ? callApi() : pThrottle(callApi, 10, 31000));
    return result.body;
  } catch (error) {
    if (error && error.response) {
      throw new Error(error.response.body.error);
    }

    throw error;
  }
}

module.exports = {
  getAllArticles,
  getLastArticlesStats,
  updateRemoteArticle
};
