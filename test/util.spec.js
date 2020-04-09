const {
  convertPathToPosix,
  parseRepository,
  getRepositoryFromPackage,
  updateImagesUrls,
  scaleNumber
} = require('../lib/util');

describe('utilities', () => {
  describe('convertPathToPosix', () => {
    it('should convert a windows path', () => {
      expect(convertPathToPosix('c:\\test\\path')).toEqual('c:/test/path');
    });

    it('should not change a posix path', () => {
      expect(convertPathToPosix('./posix/path')).toEqual('./posix/path');
    });
  });

  describe('parseRepository', () => {
    it('should return null', () => {
      expect(parseRepository()).toBe(null);
      expect(parseRepository('not-a-repo')).toBe(null);
    });

    it('should parse full repo', () => {
      expect(parseRepository('https://github.com/sinedied/devto-cli.git')).toEqual({
        user: 'sinedied',
        name: 'devto-cli'
      });
    });

    it('should parse shorthand repo', () => {
      expect(parseRepository('sinedied/devto-cli')).toEqual({ user: 'sinedied', name: 'devto-cli' });
    });
  });

  describe('getRepositoryFromPackage', () => {
    it('should get repo from same dir', async () => {
      expect(await getRepositoryFromPackage()).toEqual({ user: 'sinedied', name: 'devto-cli' });
    });

    it('should get repo from child dir', async () => {
      process.chdir('test');
      expect(await getRepositoryFromPackage()).toEqual({ user: 'sinedied', name: 'devto-cli' });
      process.chdir('..');
    });
  });

  describe('updateImagesUrls', () => {
    const repository = { user: 'me', name: 'repo' };

    it('should update local images with full github url', () => {
      const article = {
        file: 'test.md',
        data: {},
        content: `
          ![blurb](local/image.jpg)
          ![](/image.png)
          ![](./image.gif "with title")
          ![](http://site.com/image.jpg)`
      };
      const updatedArticle = updateImagesUrls(article, repository);
      expect(updatedArticle.content).toMatchInlineSnapshot(`
        "
                  ![blurb](https://raw.githubusercontent.com/me/repo/master/local/image.jpg)
                  ![](https://raw.githubusercontent.com/me/repo/master/image.png)
                  ![](https://raw.githubusercontent.com/me/repo/master/image.gif \\"with title\\")
                  ![](http://site.com/image.jpg)"
      `);
    });

    it('should update cover image url', () => {
      const article = {
        file: 'test.md',
        data: { cover_image: './local.jpg' },
        content: ''
      };
      const updatedArticle = updateImagesUrls(article, repository);
      expect(updatedArticle.data).toEqual({
        cover_image: 'https://raw.githubusercontent.com/me/repo/master/local.jpg'
      });
    });

    it('should not change cover image url', () => {
      const article = {
        file: 'test.md',
        data: { cover_image: 'https://distant.jpg' },
        content: ''
      };
      const updatedArticle = updateImagesUrls(article, repository);
      expect(updatedArticle.data).toEqual({ cover_image: 'https://distant.jpg' });
    });
  });

  describe('scaleNumber', () => {
    it('should convert number to string', () => {
      expect(scaleNumber(123)).toEqual('123');
    });

    it('should scale to K and round number', () => {
      expect(scaleNumber(12365)).toEqual('12.4K');
    });

    it('should scale to G and round number', () => {
      expect(scaleNumber(1234567890)).toEqual('1.23G');
    });

    it('should scale to K and round number with specified length', () => {
      expect(scaleNumber(12365, 6)).toEqual('12.37K');
    });
  });
});
