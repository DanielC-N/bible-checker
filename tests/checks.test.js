import { checks } from '../dist/index.js';
import fs from 'fs';
import path from 'path';

describe('Run Checks Functionality Tests', () => {
    let sourceText, targetText, recipe;

    beforeAll(() => {
        const targetFilePath = path.resolve(__dirname, './mock_data/SRC_FR_TIT.json');
        const sourceFilePath = path.resolve(__dirname, './mock_data/TAR_ENG_TITUS.json');

        sourceText = fs.readFileSync(sourceFilePath, 'utf8');
        targetText = fs.readFileSync(targetFilePath, 'utf8');

        // Recipe with all checks enabled
        recipe = [
            {
                name: "versestats::verse_stats",
                description: "Checks for empty, short, and long verses",
                level: "minor",
                enabled: false,
                parameters: { short_threshold: 20 }
            },
            {
                name: "chapterverse::integrity_check",
                description: "Checks for missing, duplicated, or out-of-order chapter/verse numbers.",
                level: "major",
                enabled: false
            },
            {
                name: "textquality::repeated_words_whitespace",
                description: "Detects consecutive repeated words and excessive whitespace.",
                level: "minor",
                enabled: true
            },
            {
                name: "textquality::unmatched_punctuation",
                description: "Checks for unmatched punctuation pairs like quotes, parentheses, or brackets.",
                level: "minor",
                enabled: true
            }
        ];
    });

    test('Detect consecutive repeated words and whitespace issues', () => {
        const result = checks(sourceText, targetText, recipe);

        console.log("result.checks ==",result.checks);
        const repeatedWordsCheck = result.checks.find(c => c.name === 'textquality::repeated_words_whitespace');
        expect(repeatedWordsCheck).toBeDefined();
        expect(Array.isArray(repeatedWordsCheck.issues)).toBe(true);
        expect(repeatedWordsCheck.issues.length).toBeGreaterThan(0);

        const issue = repeatedWordsCheck.issues.find(issue => issue.verse === '3:3');
        expect(issue).toBeDefined();
        expect(issue.repeated_words).toContain('nous');
        expect(issue.positions).toContain(59);
        expect(issue.whitespace_issue).toBe(false);
        expect(issue.comment).toBe('Consecutive repeated words: nous');
    });

    test('Detect unmatched punctuation issues', () => {
        const result = checks(sourceText, targetText, recipe);

        const punctuationCheck = result.checks.find(c => c.name === 'textquality::unmatched_punctuation');
        expect(punctuationCheck).toBeDefined();
        expect(Array.isArray(punctuationCheck.issues)).toBe(true);
        expect(punctuationCheck.issues.length).toBeGreaterThan(0);

        const issue = punctuationCheck.issues.find(issue => issue.verse === '1:4');
        expect(issue).toBeDefined();
        expect(issue.unmatched_punctuation).toBe(']');
        expect(issue.comment).toBe('Unmatched punctuation found: ]');
    });
});
