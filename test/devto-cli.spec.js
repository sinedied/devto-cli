const run = require('../devto-cli');

jest.mock('../lib/commands');

function mockConsole() {
  const methods = ['log', 'info', 'warn', 'error'];
  const originalConsole = { ...console };
  methods.forEach(method => {
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
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^Usage/));
  });

  it('should display version', async () => {
    await run(['--version']);
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^\d+/));
  });

  it('should run init command', async () => {
    const { init } = require('../lib/commands');
    await run(['init', '--token=123', '--repo=git/repo', '--pull']);
    expect(init).toHaveBeenCalledWith({
      devtoKey: '123',
      repo: 'git/repo',
      pull: true
    });
  });

  it('should run publish command', async () => {
    const { publish } = require('../lib/commands');
    await run(['publish', 'posts/*.md', '--token=123', '--repo=git/repo', '--dry-run', '--reconcile', '--check-img']);
    expect(publish).toHaveBeenCalledWith(['posts/*.md'], {
      devtoKey: '123',
      repo: 'git/repo',
      dryRun: true,
      reconcile: true,
      checkImages: true
    });
  });

  it('should run pull command', async () => {
    const { pullUpdates } = require('../lib/commands');
    await run(['pull', 'posts/*.md', '--token=123', '--repo=git/repo', '--reconcile']);
    expect(pullUpdates).toHaveBeenCalledWith(['posts/*.md'], {
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
