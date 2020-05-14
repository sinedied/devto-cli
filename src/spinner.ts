import Debug, { Debugger } from 'debug';
import ora from 'ora';

const debug = Debug('spinner');

export function createSpinner(debugFunc: Debugger) {
  if (debug.enabled) {
    const noop = () => {};
    return {
      set text(string: string) {
        debugFunc(string);
      },
      start: noop,
      stop: noop
    };
  }

  const spinner = ora({ color: 'green', spinner: 'point' });
  return spinner;
}
