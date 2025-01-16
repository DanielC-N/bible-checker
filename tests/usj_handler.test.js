import { USJHandler } from '../dist/USJHandler.js';
import fs from 'fs';
import path from 'path';

describe('USJHandler Core Functionality Tests', () => {
    let usjData;
    let handler;

    beforeAll(() => {
        // Load a sample USJ file for testing
        const filePath = path.resolve(__dirname, './mock_data/SRC_FR_TIT.json');
        const usjContent = fs.readFileSync(filePath, 'utf8');
        usjData = JSON.parse(usjContent);

        // Initialize the USJHandler with the loaded data
        handler = new USJHandler(usjData);
    });

    test('Count total chapters in USJ file', () => {
        const totalChapters = handler.nbchapters();

        expect(totalChapters).toBeGreaterThan(0);
        // console.log(`Total Chapters: ${totalChapters}`);
    });

    test('Count total verses in USJ file', () => {
        const totalVerses = handler.nbverses();

        expect(totalVerses).toBeGreaterThan(0);
        // console.log(`Total Verses: ${totalVerses}`);
    });

    test('Extract a specific verse', () => {
        const verseContent = handler.verse('1:1');

        expect(verseContent).toBeDefined();
        expect(typeof verseContent).toBe('string');
        expect(verseContent.length).toBeGreaterThan(0);
        // console.log('Verse 1:1 Content:', verseContent);
    });

    test('Extract a range of verses', () => {
        const rangeContent = handler.verseRange('1:1-1:3');

        expect(rangeContent).toBeDefined();
        expect(typeof rangeContent).toBe('string');
        expect(rangeContent.length).toBeGreaterThan(0);
        // console.log('Range 1:1-1:3 Content:', rangeContent);
    });

    test('Extract a full chapter', () => {
        const chapterContent = handler.chapter('1');

        expect(chapterContent).toBeDefined();
        expect(typeof chapterContent).toBe('string');
        expect(chapterContent.length).toBeGreaterThan(0);
        // console.log('Chapter 1 Content:', chapterContent);
    });

    test('Handle invalid chapter or verse', () => {
        const invalidVerse = handler.verse('99:99');
        const invalidChapter = handler.chapter('99');

        expect(invalidVerse).toBe('');
        expect(invalidChapter).toBe('');
    });
});
