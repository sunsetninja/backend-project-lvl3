import { promises as fs } from 'fs';
import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import Listr from 'listr';
import { URL } from 'url';
import 'axios-debug-log';
import debug from 'debug';

const debugLog = debug('page-loader');

const urlToDirname = (url) => `${url.replace(/^http?s:\/\//, '').replace(/[^\w]/g, '-')}`;

const urlToFilename = (url, extention = '') => `${urlToDirname(url)}${extention}`;

const getAssetsFullname = (dirname, url) => path.join(dirname, urlToFilename(url.replace(/\.[^/.]+$/, ''), path.extname(url) || '.html'));

const tagsMapping = {
  img: 'src',
  script: 'src',
  link: 'href',
};

const loadPage = (pageurl, outputdir = process.cwd()) => {
  const { origin } = new URL(pageurl);
  const htmlFilename = urlToFilename(pageurl, '.html');
  const assetsDirname = `${urlToDirname(pageurl)}_files`;
  const assetsOutputdir = path.join(outputdir, assetsDirname);

  debugLog('page url', pageurl);
  debugLog('output dir', outputdir);
  debugLog('output assets dir', assetsOutputdir);

  return axios.get(pageurl)
    .then(({ data: html }) => {
      const $ = cheerio.load(html, { decodeEntities: false });

      const tasks = Object.keys(tagsMapping).flatMap((tagname) => {
        const tags = $(tagname);

        const tagsWithUrls = tags
          .map((_, tag) => {
            const url = $(tag).attr(tagsMapping[tagname]);
            return ({ tag, url: url ? new URL(url, origin) : url });
          })
          .filter((_, { url }) => url && url.origin === origin)
          .map((_, { tag, url }) => ({ tag, url: url.toString() }))
          .get();

        tagsWithUrls.forEach(({ tag, url }) => {
          $(tag).attr(tagsMapping[tagname], getAssetsFullname(assetsDirname, url));
        });

        const urls = tagsWithUrls.map(({ url }) => url);

        return urls.map(
          (url) => {
            debugLog('asset url', url);

            return {
              title: url,
              task: () => axios.get(url, { responseType: 'arraybuffer' })
                .then(({ data }) => {
                  const assetsPath = getAssetsFullname(assetsOutputdir, url);

                  debugLog('asset output', assetsPath);

                  return fs.writeFile(assetsPath, data);
                })
                .catch(() => {
                  debugLog('asset download error', url);
                }),
            };
          },
        );
      });

      return fs.writeFile(path.join(outputdir, htmlFilename), $.root().html())
        .then(() => fs.access(assetsOutputdir).catch(() => { fs.mkdir(assetsOutputdir); }))
        .then(() => {
          const listr = new Listr(tasks, { concurrent: true });
          return listr.run();
        }).then(() => {
          console.log(`Loaded into ${outputdir}`);
        });
    });
};

export default loadPage;
