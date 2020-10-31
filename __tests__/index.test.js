import {
  describe, test, expect, beforeAll, beforeEach, afterAll,
} from '@jest/globals';
import os from 'os';
import { promises as fs, existsSync } from 'fs';
import { URL } from 'url';
import path from 'path';
import nock from 'nock';
import loadPage from '../index.js';

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
  const assets = [
    ['image', {
      name: 'ru-hexlet-io-assets-professions-nodejs.png',
      expected: getFixturePath('nodejs.png'),
    }],
    ['css', {
      type: 'css',
      name: 'ru-hexlet-io-assets-application.css',
      expected: getFixturePath('application.css'),
    }],
    ['js', {
      name: 'ru-hexlet-io-packs-js-runtime.js',
      expected: getFixturePath('runtime.js'),
    }],
  ];

  beforeAll(async () => {
    expectedHtml = await fs.readFile(getFixturePath('expected.html'), 'utf-8');
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

  test('should save html correctly', async () => {
    await loadPage(pageurl, output);
    const result = await fs.readFile(path.join(output, 'ru-hexlet-io-courses.html'), 'utf-8');

    expect(result).toEqual(expectedHtml);
  });

  test.each(assets)('should save %s asset correctly', async (_, asset) => {
    await loadPage(pageurl, output);
    const expected = await fs.readFile(asset.expected);
    const result = await fs.readFile(path.join(assetsOutput, asset.name));

    expect(result).toEqual(expected);
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
