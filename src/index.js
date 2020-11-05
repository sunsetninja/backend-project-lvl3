import { promises as fs } from 'fs';
import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import Listr from 'listr';
import { URL } from 'url';
import 'axios-debug-log';
import debug from 'debug';
import { urlToDirname, urlToFilename } from './utils.js';

const debugLog = debug('page-loader');

const processData = (data, origin, assetsDirname) => {
  const $ = cheerio.load(data, { decodeEntities: false });

  const tagsMapping = {
    img: 'src',
    script: 'src',
    link: 'href',
  };

  const assetsUrls = Object.keys(tagsMapping)
    .flatMap((tagname) => $(tagname)
      .map((_, tag) => $(tag))
      .filter((_, tag) => tag.attr(tagsMapping[tagname]))
      .map((_, tag) => ({
        tag,
        url: new URL(tag.attr(tagsMapping[tagname]), origin),
      }))
      .filter((_, { url }) => url.origin === origin)
      .each((_, { tag, url }) => {
        tag.attr(
          tagsMapping[tagname],
          path.join(assetsDirname, urlToFilename(url)),
        );
      })
      .map((_, { url }) => url.toString())
      .get());

  return { html: $.root().html(), assetsUrls };
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

  return axios.get(pageurl)
    .then(({ data }) => processData(data, origin, assetsDirname))
    .then((result) => fs.access(assetsOutputdir)
      .catch(() => fs.mkdir(assetsOutputdir))
      .then(() => {
        debugLog('output assets dir', assetsOutputdir);
        return result;
      }))
    .then((result) => fs.writeFile(htmlPath, result.html)
      .then(() => result))
    .then(({ assetsUrls }) => {
      const listr = new Listr(
        assetsUrls
          .map((url) => ({
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
