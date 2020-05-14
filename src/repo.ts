import Debug from 'debug';
import fs from 'fs-extra';
import findUp from 'find-up';
import hasbin from 'hasbin';
import execa from 'execa';

export interface Repository {
  user: string;
  name: string;
}

const debug = Debug('repo');
const repositoryRegex = /.*[/:](.*)\/(.*)\.git|^([^/]*)\/([^/]*)$/;
const packageFile = 'package.json';

export const getShorthandString = (repo: Repository) => `${repo.user}/${repo.name}`;
export const hasGitInstalled = async () => new Promise((resolve) => hasbin('git', resolve));

export function parseRepository(string?: string) {
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

export async function getRepositoryFromPackage(searchUp?: boolean) {
  let pkgPath = null;

  if (searchUp) {
    pkgPath = await findUp(packageFile);
  } else if (await fs.pathExists(packageFile)) {
    pkgPath = packageFile;
  }

  if (!pkgPath) {
    debug('No package.json found');
    return null;
  }

  try {
    const pkg = await fs.readJson(pkgPath);
    const repository = parseRepository((pkg.repository && pkg.repository.url) || pkg.repository);
    debug(
      repository ? 'Repository found in package.json: ' : 'No repository found in package.json',
      repository ? getShorthandString(repository) : ''
    );
    return repository;
  } catch (error) {
    debug('Error while reading package.json:', error.toString());
    return null;
  }
}

export async function getRepositoryFromGit() {
  if (!(await hasGitInstalled())) {
    debug('Git binary not found');
    return null;
  }

  try {
    const { stdout } = await execa('git', ['remote', 'get-url', 'origin']);
    const repository = parseRepository(stdout);
    debug(
      repository ? 'Repository found in git origin: ' : 'No repository found in git origin',
      repository ? getShorthandString(repository) : ''
    );
    return repository;
  } catch (error) {
    debug(`Git error: ${error}`);
    return null;
  }
}

export function getRepositoryFromStringOrEnv(string?: string) {
  return parseRepository(string) || parseRepository(process.env.DEVTO_REPO);
}

export async function getRepository(string?: string, searchPackageUp = true) {
  return (
    getRepositoryFromStringOrEnv(string) || (await getRepositoryFromGit()) || getRepositoryFromPackage(searchPackageUp)
  );
}

export async function initGitRepository() {
  try {
    await execa('git', ['init']);
    debug('Git repository initialized');
  } catch (error) {
    debug(`Git error: ${error}`);
  }
}
