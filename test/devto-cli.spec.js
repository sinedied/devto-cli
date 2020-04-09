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
    run(['--help']);
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^Usage/));
  });

  it('should display version', async () => {
    run(['--version']);
    expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^\d+/));
  });
});
