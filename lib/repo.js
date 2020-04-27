const debug = require('debug')('repo');
const fs = require('fs-extra');
const findUp = require('find-up');
const hasbin = require('hasbin');
const execa = require('execa');

const repositoryRegex = /.*[/:](.*)\/(.*)\.git|^([^/]*)\/([^/]*)$/;
const packageFile = 'package.json';

const getShorthandString = (repo) => `${repo.user}/${repo.name}`;
const hasGitInstalled = async () => new Promise((resolve) => hasbin('git', resolve));

function parseRepository(string) {
  if (!string) {
    return null;
  }

  const match = string.match(repositoryRegex);
  if (!match) {
    return null;
  }

  const shorthand = Boolean(match[3]);
  return {
    user: shorthand ? match[3] : match[1],
    name: shorthand ? match[4] : match[2]
  };
}

async function getRepositoryFromPackage(searchUp) {
  let pkgPath = null;

  if (searchUp) {
    pkgPath = await findUp(packageFile);
  } else if (await fs.exists(packageFile)) {
    pkgPath = packageFile;
  }

  if (!pkgPath) {
    debug('No package.json found');
    return null;
  }

  try {
    const pkg = await fs.readJson(pkgPath);
    const repository = parseRepository((pkg.repository && pkg.repository.url) || pkg.repository);
    debug(repository ? 'Repository found in package.json' : 'No repository found in package.json');
    return repository;
  } catch (error) {
    debug('Error while reading package.json:', error.toString());
    return null;
  }
}

async function getRepositoryFromGit() {
  if (!(await hasGitInstalled())) {
    debug('Git binary not found');
    return null;
  }

  try {
    const { stdout } = await execa('git', ['remote', 'get-url', 'origin']);
    const repository = parseRepository(stdout);
    debug(repository ? 'Repository found in git origin' : 'No repository found in git origin');
    return repository;
  } catch (error) {
    debug(`Git error: ${error}`);
    return null;
  }
}

function getRepositoryFromStringOrEnv(string) {
  return parseRepository(string) || parseRepository(process.env.DEVTO_REPO);
}

async function getRepository(string, searchPackageUp = true) {
  return (
    getRepositoryFromStringOrEnv(string) || (await getRepositoryFromGit()) || getRepositoryFromPackage(searchPackageUp)
  );
}

async function initGitRepository() {
  try {
    await execa('git', ['init']);
    debug('Git repository initialized');
  } catch (error) {
    debug(`Git error: ${error}`);
  }
}

module.exports = {
  getShorthandString,
  parseRepository,
  getRepositoryFromPackage,
  getRepositoryFromGit,
  getRepositoryFromStringOrEnv,
  getRepository,
  hasGitInstalled,
  initGitRepository
};
