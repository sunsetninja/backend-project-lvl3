import { promises as fs } from 'fs';
import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import Listr from 'listr';
import { URL } from 'url';
import 'axios-debug-log';
import debug from 'debug';

const debugLog = debug('page-loader');

const urlToDirname = (url, postfix = '') => {
  const { hostname, pathname } = new URL(url);
  const { dir, name } = path.parse(`${hostname}${pathname}`);

  return `${path.join(dir, name).replace(/[^\w]/g, '-')}${postfix}`;
};

const urlToFilename = (url) => {
  const { ext } = path.parse(url.toString());

  return urlToDirname(url, ext || '.html');
};

const getAssets = (data, origin, assetsDirname) => {
  const $ = cheerio.load(data, { decodeEntities: false });

  const tagsMapping = {
    img: 'src',
    script: 'src',
    link: 'href',
  };

  const assets = Object.keys(tagsMapping)
    .flatMap((tagname) => $(tagname)
      .filter((_, tag) => $(tag).attr(tagsMapping[tagname]))
      .map((_, tag) => ({
        tag: $(tag),
        url: new URL($(tag).attr(tagsMapping[tagname]), origin),
      }))
      .filter((_, { url }) => url.origin === origin)
      .each((_, { tag, url }) => {
        tag.attr(
          tagsMapping[tagname],
          path.join(assetsDirname, urlToFilename(url)),
        );
      })
      .map((_, { tag, url }) => ({ tag, url: url.toString() }))
      .get());

  return { html: $.root().html(), assets };
};

const loadAsset = (url, outputdir) => {
  debugLog('asset url', url);
  return () => axios.get(url, { responseType: 'arraybuffer' })
    .then(({ data }) => {
      const assetsPath = path.join(outputdir, urlToFilename(url));

      debugLog('asset output', assetsPath);

      return fs.writeFile(assetsPath, data);
    })
    .catch(() => {
      debugLog('asset download error', url);
    });
};

const loadPage = (pageurl, outputdir = process.cwd()) => {
  const { origin } = new URL(pageurl);

  const htmlFilename = urlToFilename(pageurl);
  const assetsDirname = urlToDirname(pageurl, '_files');
  const assetsOutputdir = path.join(outputdir, assetsDirname);
  const htmlPath = path.join(outputdir, htmlFilename);

  debugLog('page url', pageurl);
  debugLog('htmlPath', htmlPath);
  debugLog('output dir', outputdir);
  debugLog('output assets dir', assetsOutputdir);

  let html;
  let assets;
  return axios.get(pageurl)
    .then(({ data }) => {
      const result = getAssets(data, origin, assetsDirname);

      html = result.html;
      assets = result.assets;

      return fs.access(assetsOutputdir).catch(() => fs.mkdir(assetsOutputdir));
    })
    .then(() => fs.writeFile(htmlPath, html))
    .then(() => {
      const listr = new Listr(
        assets
          .map(({ url }) => ({
            title: url,
            task: loadAsset(url, assetsOutputdir),
          })),
        { concurrent: true },
      );
      return listr.run();
    })
    .then(() => htmlPath);
};

export default loadPage;
