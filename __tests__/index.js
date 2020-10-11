import {
  describe, test, expect, beforeAll, beforeEach, afterAll,
} from '@jest/globals';
import os from 'os';
import { promises as fs } from 'fs';
import path from 'path';
import nock from 'nock';
import loadPage from '../src/index.js';

const getFixturePath = (filename) => path.join('__tests__', '__fixtures__', filename);

let responseHtml;
let expectedHtml;
let expectedImage;
let expectedCss;
let expectedJs;
beforeAll(async () => {
  responseHtml = await fs.readFile(getFixturePath('page.html'), 'utf-8');
  expectedHtml = await fs.readFile(getFixturePath('expected.html'), 'utf-8');
  expectedImage = await fs.readFile(getFixturePath('nodejs.png'));
  expectedCss = await fs.readFile(getFixturePath('application.css'));
  expectedJs = await fs.readFile(getFixturePath('runtime.js'));
});

afterAll(() => {
  nock.enableNetConnect();
});

let output;
beforeEach(async () => {
  nock('https://ru.hexlet.io/')
    .persist()
    .get('/courses')
    .reply(200, responseHtml);

  nock('https://ru.hexlet.io/')
    .get('/assets/application.css')
    .replyWithFile(200, getFixturePath('application.css'));

  nock('https://ru.hexlet.io/')
    .get('/packs/js/runtime.js')
    .replyWithFile(200, getFixturePath('runtime.js'));

  nock('https://ru.hexlet.io/')
    .get('/assets/professions/nodejs.png')
    .replyWithFile(200, getFixturePath('nodejs.png'));

  output = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

afterEach(() => {
  nock.cleanAll();
});

describe('Page loader test', () => {
  test('should save page correctly', async () => {
    await loadPage('https://ru.hexlet.io/courses', output);
    const result = await fs.readFile(path.join(output, 'ru-hexlet-io-courses.html'), 'utf-8');

    expect(result).toEqual(expectedHtml);
  });

  test('should save static files correctly', async () => {
    await loadPage('https://ru.hexlet.io/courses', output);
    const image = await fs.readFile(path.join(output, 'ru-hexlet-io-courses_files', 'ru-hexlet-io-assets-professions-nodejs.png'));
    const css = await fs.readFile(path.join(output, 'ru-hexlet-io-courses_files', 'ru-hexlet-io-assets-application.css'));
    const js = await fs.readFile(path.join(output, 'ru-hexlet-io-courses_files', 'ru-hexlet-io-packs-js-runtime.js'));

    expect(image).toEqual(expectedImage);
    expect(css).toEqual(expectedCss);
    expect(js).toEqual(expectedJs);
  });
});
