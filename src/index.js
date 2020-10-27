import { promises as fs } from 'fs';
import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import { URL } from 'url';
import 'axios-debug-log';

const urlToDirname = (url) => `${url.replace(/^http?s:\/\//, '').replace(/[^\w]/g, '-')}`;

const urlToFilename = (url, extention = '') => `${urlToDirname(url)}${extention}`;

const getAssetsFullname = (dirname, url) => path.join(dirname, urlToFilename(url.replace(/\.[^/.]+$/, ''), path.extname(url) || '.html'));

const tagsMapping = {
  img: 'src',
  script: 'src',
  link: 'href',
};

const loadPage = (pageurl, outputdir = process.cwd()) => axios.get(pageurl)
  .then(({ data: html }) => {
    const $ = cheerio.load(html, { decodeEntities: false });

    const { origin } = new URL(pageurl);
    const htmlFilename = urlToFilename(pageurl, '.html');
    const assetsDirname = `${urlToDirname(pageurl)}_files`;

    const promises = Object.keys(tagsMapping).flatMap((tagname) => {
      const tags = $(tagname);

      const tagsWithUrls = tags
        .map((_, tag) => ({ tag, url: new URL($(tag).attr(tagsMapping[tagname]), origin) }))
        .filter((_, { url }) => url.origin === origin)
        .map((_, { tag, url }) => ({ tag, url: url.toString() }))
        .get();

      tagsWithUrls.forEach(({ tag, url }) => {
        $(tag).attr(tagsMapping[tagname], getAssetsFullname(assetsDirname, url));
      });

      const urls = tagsWithUrls.map(({ url }) => url);

      return urls.map(
        (url) => axios.get(url, { responseType: 'arraybuffer' })
          .then(({ data }) => {
            const assetsPath = path.join(outputdir, getAssetsFullname(assetsDirname, url));

            return fs.writeFile(assetsPath, data);
          }),
      );
    });

    return fs.writeFile(path.join(outputdir, htmlFilename), $.root().html())
      .then(() => {
        const fullAssetsPath = path.join(outputdir, assetsDirname);
        return fs.access(fullAssetsPath).catch(() => { fs.mkdir(fullAssetsPath); });
      })
      .then(() => Promise.all(promises));
  });

export default loadPage;
