import {
  describe, test, expect, beforeAll, beforeEach, afterAll,
} from '@jest/globals';
import os from 'os';
import { promises as fs, existsSync } from 'fs';
import { URL } from 'url';
import path from 'path';
import nock from 'nock';
import loadPage from '../src/index.js';

const getFixturePath = (filename) => path.join('__tests__', '__fixtures__', filename);

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.enableNetConnect();
});

let output;
let assetsOutput;
beforeEach(async () => {
  output = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  assetsOutput = path.join(output, 'ru-hexlet-io-courses_files');
});

afterEach(() => {
  nock.cleanAll();
});

const origin = 'https://ru.hexlet.io/';
const pageurl = new URL('/courses', origin).toString();

describe('saving data', () => {
  let expectedHtml;
  let expectedImage;
  let expectedCss;
  let expectedJs;
  beforeAll(async () => {
    expectedHtml = await fs.readFile(getFixturePath('expected.html'), 'utf-8');
    expectedImage = await fs.readFile(getFixturePath('nodejs.png'));
    expectedCss = await fs.readFile(getFixturePath('application.css'));
    expectedJs = await fs.readFile(getFixturePath('runtime.js'));
  });

  beforeEach(async () => {
    const responseHtml = await fs.readFile(getFixturePath('page.html'), 'utf-8');
    nock(origin)
      .persist()
      .get('/courses')
      .reply(200, responseHtml);

    nock(origin)
      .get('/assets/application.css')
      .replyWithFile(200, getFixturePath('application.css'));

    nock(origin)
      .get('/packs/js/runtime.js')
      .replyWithFile(200, getFixturePath('runtime.js'));

    nock(origin)
      .get('/assets/professions/nodejs.png')
      .replyWithFile(200, getFixturePath('nodejs.png'));
  });

  test('should save page correctly', async () => {
    await loadPage(pageurl, output);
    const result = await fs.readFile(path.join(output, 'ru-hexlet-io-courses.html'), 'utf-8');

    expect(result).toEqual(expectedHtml);
  });

  test('should save static files correctly', async () => {
    await loadPage(pageurl, output);
    const image = await fs.readFile(path.join(assetsOutput, 'ru-hexlet-io-assets-professions-nodejs.png'));
    const css = await fs.readFile(path.join(assetsOutput, 'ru-hexlet-io-assets-application.css'));
    const js = await fs.readFile(path.join(assetsOutput, 'ru-hexlet-io-packs-js-runtime.js'));

    expect(image).toEqual(expectedImage);
    expect(css).toEqual(expectedCss);
    expect(js).toEqual(expectedJs);
  });
});

describe('handling errors', () => {
  test('should handle ENOTFOUND', async () => {
    const expectedError = `getaddrinfo ENOTFOUND ${origin}`;
    nock(origin)
      .persist()
      .get('/courses')
      .replyWithError(expectedError);

    await expect(loadPage(pageurl, output))
      .rejects.toThrow(expectedError);

    const outputExists = existsSync(path.join(output, 'ru-hexlet-io-courses.html'));

    expect(outputExists).toBe(false);
  });

  test.each([404, 500])('should handle %s', async (code) => {
    nock(origin)
      .persist()
      .get('/courses')
      .reply(code, '');

    await expect(loadPage(pageurl, output))
      .rejects.toThrow(new RegExp(code, 'i'));

    const outputExists = existsSync(path.join(output, 'ru-hexlet-io-courses.html'));

    expect(outputExists).toBe(false);
  });

  test('should handle ENOTDIR', async () => {
    nock(origin)
      .persist()
      .get('/courses')
      .reply(200, '');

    await expect(loadPage(pageurl, getFixturePath('expected.html')))
      .rejects.toThrow(/ENOTDIR/i);
  });

  test('should handle ENOENT', async () => {
    nock(origin)
      .persist()
      .get('/courses')
      .reply(200, '');

    await expect(loadPage(pageurl, path.join(output, 'filename.html')))
      .rejects.toThrow(/ENOENT/i);
  });
});
