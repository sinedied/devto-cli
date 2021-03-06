const run = require('../devto-cli');

jest.mock('../lib/commands');

function mockConsole() {
  const methods = ['log', 'info', 'warn', 'error'];
  const originalConsole = { ...console };
  methods.forEach((method) => {
    console[method] = jest.fn();
  });
  return () => {
    global.console = originalConsole;
  };
}

describe('devto CLI', () => {
  let restoreConsole;

  beforeEach(() => {
    restoreConsole = mockConsole();
  });

  afterEach(() => {
    restoreConsole();
  });

  it('should display help', async () => {
    await run(['--help']);
    expect(console.info).toHaveBeenCalledWith(expect.stringMatching(/^Usage/));
  });

  it('should display version', async () => {
    await run(['--version']);
    expect(console.info).toHaveBeenCalledWith(expect.stringMatching(/^\d+/));
  });

  it('should run init command', async () => {
    const { init } = require('../lib/commands');
    await run(['init', '--token=123', '--repo=git/repo', '--pull', '--skip-git']);
    expect(init).toHaveBeenCalledWith({
      devtoKey: '123',
      repo: 'git/repo',
      pull: true,
      skipGit: true
    });
  });

  it('should run push command', async () => {
    const { push } = require('../lib/commands');
    await run(['push', 'posts/*.md', '--token=123', '--repo=git/repo', '--dry-run', '--reconcile', '--check-img']);
    expect(push).toHaveBeenCalledWith(['posts/*.md'], {
      devtoKey: '123',
      repo: 'git/repo',
      dryRun: true,
      reconcile: true,
      checkImages: true
    });
  });

  it('should run pull command', async () => {
    const { pull } = require('../lib/commands');
    await run(['pull', 'posts/*.md', '--token=123', '--repo=git/repo', '--reconcile']);
    expect(pull).toHaveBeenCalledWith(['posts/*.md'], {
      devtoKey: '123',
      repo: 'git/repo',
      reconcile: true
    });
  });

  it('should run new command', async () => {
    const { createNew } = require('../lib/commands');
    await run(['new', 'article']);
    expect(createNew).toHaveBeenCalledWith('article');
  });

  it('should run stats command', async () => {
    const { showStats } = require('../lib/commands');
    await run(['stats', '--token=123', '--number=20']);
    expect(showStats).toHaveBeenCalledWith({
      devtoKey: '123',
      number: 20,
      json: false
    });
  });
});
