import { promises as fs } from 'fs';
import axios from 'axios';
import path from 'path';

const urlToFilename = (url) => `${url.replace(/^http?s:\/\//, '').replace(/[^\w]/g, '-')}.html`;

const loadPage = (pageurl, outputdir) => axios.get(pageurl)
  .then(({ data }) => fs.writeFile(path.join(outputdir, urlToFilename(pageurl)), data));

export default loadPage;
