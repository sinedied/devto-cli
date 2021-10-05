import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const { getArticlesFromFiles } = await import('../src/article');
const __dirname = dirname(fileURLToPath(import.meta.url));

const resetCwd = () => {
  process.chdir(join(__dirname, '..'));
};

describe('articles', () => {
  beforeEach(resetCwd);
  afterEach(resetCwd);

  describe('getArticlesFromFiles', () => {
    it('should get articles from given glob', async () => {
      process.chdir('test');
      const articles = await getArticlesFromFiles(['fixtures/*.md']);
      expect(articles.length).toBe(1);
      expect(articles[0].data.title).toBe('this is an article');
    });

    it('should return an empty array', async () => {
      const articles = await getArticlesFromFiles(['*.md']);
      expect(articles).toEqual([]);
    });
  });
});
