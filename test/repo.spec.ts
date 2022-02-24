import process from 'process';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
// eslint-disable-next-line import/no-extraneous-dependencies
import { jest } from '@jest/globals';

jest.unstable_mockModule('execa', () => ({
  __esModule: true,
  execa: jest.fn()
}));
jest.unstable_mockModule('hasbin', () => ({
  __esModule: true,
  default: jest.fn()
}));

const {
  getShorthandString,
  parseRepository,
  getRepositoryFromPackage,
  getRepositoryFromGit,
  getRepositoryFromStringOrEnv,
  getRepository,
  getCurrentBranchFromGit,
  getBranchFromStringOrEnv,
  getBranch
} = await import('../src/repo');

const __dirname = dirname(fileURLToPath(import.meta.url));

const resetEnv = () => {
  delete process.env.DEVTO_REPO;
  delete process.env.DEVTO_BRANCH;
};

const resetCwd = () => {
  process.chdir(path.join(__dirname, '..'));
};

const mockHasbin = (result: boolean) => (_: string, cb: (result: boolean) => boolean) => cb(result);

describe('repository methods', () => {
  describe('getShorthandString', () => {
    it('should return shorthand string', () => {
      expect(getShorthandString({ user: 'user', name: 'repo' })).toEqual('user/repo');
    });
  });

  describe('parseRepository', () => {
    it('should return null', () => {
      expect(parseRepository()).toBe(null);
      expect(parseRepository('not-a-repo')).toBe(null);
    });

    it('should parse http repo', () => {
      expect(parseRepository('https://github.com/sinedied/devto-cli.git')).toEqual({
        user: 'sinedied',
        name: 'devto-cli'
      });
    });

    it('should parse git repo', () => {
      expect(parseRepository('git@github.com:sinedied/devto-cli.git')).toEqual({
        user: 'sinedied',
        name: 'devto-cli'
      });
    });

    it('should parse shorthand repo', () => {
      expect(parseRepository('sinedied/devto-cli')).toEqual({ user: 'sinedied', name: 'devto-cli' });
    });
  });

  describe('getRepositoryFromPackage', () => {
    beforeEach(resetCwd);
    afterEach(resetCwd);

    it('should get repo from same dir', async () => {
      expect(await getRepositoryFromPackage()).toEqual({ user: 'sinedied', name: 'devto-cli' });
    });

    it('should not get repo from child dir', async () => {
      process.chdir('test');
      expect(await getRepositoryFromPackage(false)).toEqual(null);
    });

    it('should get repo from child dir', async () => {
      process.chdir('test');
      expect(await getRepositoryFromPackage(true)).toEqual({ user: 'sinedied', name: 'devto-cli' });
    });
  });

  describe('getRepositoryFromGit', () => {
    it('should return null if git is not installed', async () => {
      const hasbin: any = (await import('hasbin')).default;
      hasbin.mockImplementation(mockHasbin(false));

      expect(await getRepositoryFromGit()).toBe(null);
    });

    it('should return null if git returned an error', async () => {
      const hasbin: any = (await import('hasbin')).default;
      const execa: any = (await import('execa')).execa;
      hasbin.mockImplementation(mockHasbin(true));
      execa.mockImplementation(() => {
        throw new Error('git error');
      });

      expect(await getRepositoryFromGit()).toBe(null);
    });

    it('should get repo from git', async () => {
      const hasbin: any = (await import('hasbin')).default;
      const execa: any = (await import('execa')).execa;
      hasbin.mockImplementation(mockHasbin(true));
      execa.mockImplementation(async () => ({ stdout: 'git@github.com:user/repo.git' }));

      expect(await getRepositoryFromGit()).toEqual({ user: 'user', name: 'repo' });
    });
  });

  describe('getRepositoryFromStringOrEnv', () => {
    beforeEach(resetEnv);
    afterEach(resetEnv);

    it('should get repo from string', () => {
      expect(getRepositoryFromStringOrEnv('user/repo')).toEqual({ user: 'user', name: 'repo' });
    });

    it('should get repo from env', () => {
      process.env.DEVTO_REPO = 'user/repo';
      expect(getRepositoryFromStringOrEnv()).toEqual({ user: 'user', name: 'repo' });
    });

    it('should return null', () => {
      process.env.DEVTO_REPO = 'garbage';
      expect(getRepositoryFromStringOrEnv('garbage')).toBe(null);
      expect(getRepositoryFromStringOrEnv()).toBe(null);
    });
  });

  describe('getRepository', () => {
    beforeEach(() => {
      resetEnv();
      resetCwd();
    });
    afterEach(() => {
      resetEnv();
      resetCwd();
    });

    it('should get repo from string', async () => {
      expect(await getRepository('user/repo')).toEqual({ user: 'user', name: 'repo' });
    });

    it('should get repo from env', async () => {
      process.env.DEVTO_REPO = 'user/repo';
      expect(await getRepository()).toEqual({ user: 'user', name: 'repo' });
    });

    it('should get repo from git', async () => {
      const hasbin: any = (await import('hasbin')).default;
      const execa: any = (await import('execa')).execa;
      hasbin.mockImplementation(mockHasbin(true));
      execa.mockImplementation(async () => ({ stdout: 'git@github.com:user/repo.git' }));

      expect(await getRepository()).toEqual({ user: 'user', name: 'repo' });
    });

    it('should get repo from package', async () => {
      const hasbin: any = (await import('hasbin')).default;
      hasbin.mockImplementation(mockHasbin(false));

      expect(await getRepository('')).toEqual({ user: 'sinedied', name: 'devto-cli' });
    });

    it('should return null', async () => {
      const hasbin: any = (await import('hasbin')).default;
      hasbin.mockImplementation(mockHasbin(false));
      process.chdir('test');

      expect(await getRepository('garbage', false)).toBe(null);
      expect(await getRepository(undefined, false)).toBe(null);
    });
  });

  describe('getCurrentBranchFromGit', () => {
    it('should return null if git is not installed', async () => {
      const hasbin: any = (await import('hasbin')).default;
      hasbin.mockImplementation(mockHasbin(false));

      expect(await getCurrentBranchFromGit()).toBe(null);
    });

    it('should return null if git returned an error', async () => {
      const hasbin: any = (await import('hasbin')).default;
      const execa: any = (await import('execa')).execa;
      hasbin.mockImplementation(mockHasbin(true));
      execa.mockImplementation(() => {
        throw new Error('git error');
      });

      expect(await getCurrentBranchFromGit()).toBe(null);
    });

    it('should get current branch from git', async () => {
      const hasbin: any = (await import('hasbin')).default;
      const execa: any = (await import('execa')).execa;
      hasbin.mockImplementation(mockHasbin(true));
      execa.mockImplementation(async () => ({ stdout: 'main' }));

      expect(await getCurrentBranchFromGit()).toEqual('main');
    });
  });

  describe('getBranchFromStringOrEnv', () => {
    beforeEach(resetEnv);
    afterEach(resetEnv);

    it('should get branch from string', () => {
      expect(getBranchFromStringOrEnv('test')).toEqual('test');
    });

    it('should get branch from env', () => {
      process.env.DEVTO_BRANCH = 'toto';
      expect(getBranchFromStringOrEnv()).toEqual('toto');
    });

    it('should return null', () => {
      expect(getBranchFromStringOrEnv('')).toBe(null);
      expect(getBranchFromStringOrEnv()).toBe(null);
      process.env.DEVTO_BRANCH = '';
      expect(getBranchFromStringOrEnv()).toBe(null);
    });
  });

  describe('getBranch', () => {
    beforeEach(() => {
      resetEnv();
      resetCwd();
    });
    afterEach(() => {
      resetEnv();
      resetCwd();
    });

    it('should get branch from string', async () => {
      expect(await getBranch('test')).toEqual('test');
    });

    it('should get branch from env', async () => {
      process.env.DEVTO_BRANCH = 'main';
      expect(await getBranch()).toEqual('main');
    });

    it('should get branch from git', async () => {
      const hasbin: any = (await import('hasbin')).default;
      const execa: any = (await import('execa')).execa;
      hasbin.mockImplementation(mockHasbin(true));
      execa.mockImplementation(async () => ({ stdout: 'toto' }));

      expect(await getBranch()).toEqual('toto');
    });

    it('should return null', async () => {
      const hasbin: any = (await import('hasbin')).default;
      hasbin.mockImplementation(mockHasbin(false));

      expect(await getBranch('')).toBe(null);
      expect(await getBranch(undefined)).toBe(null);
    });
  });
});
