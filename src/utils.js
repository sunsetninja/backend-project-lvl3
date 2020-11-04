import path from 'path';

const urlToDirname = (url, postfix = '') => {
  const { hostname, pathname } = new URL(url);
  const { dir, name } = path.parse(`${hostname}${pathname}`);

  return `${path.join(dir, name).replace(/[^\w]/g, '-')}${postfix}`;
};

const urlToFilename = (url) => {
  const { ext } = path.parse(url.toString());

  return urlToDirname(url, ext || '.html');
};

export { urlToDirname, urlToFilename };
