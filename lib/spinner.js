const ora = require('ora');
const debug = require('debug')('spinner');

function createSpinner(debugFunc) {
  if (debug.enabled) {
    const noop = () => {};
    return {
      set text(string) {
        debugFunc(string);
      },
      start: noop,
      stop: noop
    };
  }

  const spinner = ora({ color: 'green', spinner: 'point' });
  return spinner;
}

module.exports = {
  createSpinner
};
