import { promises as fs } from 'fs';
import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import { URL } from 'url';

const urlToDirname = (url) => `${url.replace(/^http?s:\/\//, '').replace(/[^\w]/g, '-')}`;

const urlToFilename = (url, extention = '') => `${urlToDirname(url)}${extention}`;

const getStaticFullname = (dirname, url) => path.join(dirname, urlToFilename(url.replace(/\.[^/.]+$/, ''), path.extname(url) || '.html'));

const mapping = {
  img: 'src',
  script: 'src',
  link: 'href',
};

const loadPage = (pageurl, outputdir = process.cwd()) => axios.get(pageurl)
  .then(({ data: html }) => {
    const $ = cheerio.load(html, { decodeEntities: false });
    const { origin } = new URL(pageurl);
    const htmlFilename = urlToFilename(pageurl, '.html');
    const staticDirname = `${urlToDirname(pageurl)}_files`;

    const promises = Object.keys(mapping).map((tagname) => {
      const tags = $(tagname);

      const tagsWithUrls = tags
        .map((_, tag) => ({ tag, url: new URL($(tag).attr(mapping[tagname]), origin) }))
        .filter((_, { url }) => url.origin === origin)
        .map((_, { tag, url }) => ({ tag, url: url.toString() }));

      tagsWithUrls.each((_, { tag, url }) => {
        $(tag).attr(mapping[tagname], getStaticFullname(staticDirname, url));
      });

      const urls = tagsWithUrls.map((_, { url }) => url).get();

      return Promise.all(
        urls
          .map((url) => axios.get(url, { responseType: 'arraybuffer' })
            .then(({ data }) => {
              const staticPath = path.join(outputdir, getStaticFullname(staticDirname, url));

              return fs.writeFile(staticPath, data);
            })),
      );
    });

    return fs.writeFile(path.join(outputdir, htmlFilename), $.root().html())
      .then(() => fs.mkdir(path.join(outputdir, staticDirname)))
      .then(() => Promise.all(promises));
  });

export default loadPage;
