declare module 'hasbin' {
  function hasbin(name: string, cb: (exists: boolean) => void): void;
  export = hasbin;
}
