import {
  describe, test, expect, beforeAll,
} from '@jest/globals';
import os from 'os';
import { promises as fs } from 'fs';
import path from 'path';
import nock from 'nock';
import loadPage from '../src/index.js';

const getFixturePath = (filename) => path.join('__tests__', '__fixtures__', filename);

let expected;
const output = os.tmpdir();
beforeAll(async () => {
  expected = await fs.readFile(getFixturePath('page.html'), 'utf-8');
  nock('https://ru.hexlet.io/')
    .get('/courses')
    .reply(200, expected);
});

describe('Page loader test', () => {
  test('should save page correctly', async () => {
    await loadPage('https://ru.hexlet.io/courses', output);
    const result = await fs.readFile(path.join(output, 'ru-hexlet-io-courses.html'), 'utf-8');

    expect(result).toEqual(expected);
  });
});
