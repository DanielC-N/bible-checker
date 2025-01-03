import { checks } from '../dist/index.js';
import fs from 'fs';
import path from 'path';
import { USJHandler } from '../dist/USJHandler.js';

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

    test('Detect excessive whitespace issues', () => {
        const result = checks(sourceText, targetText, recipe);
    
        const repeatedWordsCheck = result.checks.find(c => c.name === 'textquality::repeated_words_whitespace');
        expect(repeatedWordsCheck).toBeDefined();
        expect(Array.isArray(repeatedWordsCheck.issues)).toBe(true);
    
        const issue = repeatedWordsCheck.issues.find(issue => issue.verse === '1:4');
        expect(issue).toBeDefined();
        expect(issue.repeated_words).toHaveLength(0); // No repeated words
        expect(issue.positions).toHaveLength(0); // No repeated word positions
        expect(issue.whitespace_positions).toContain(155);
        expect(issue.whitespace_issue).toBe(true);
        expect(issue.comment).toBe('Excessive whitespace detected');
    });

    test('Detect consecutive repeated words', () => {
        const result = checks(sourceText, targetText, recipe);
    
        const repeatedWordsCheck = result.checks.find(c => c.name === 'textquality::repeated_words_whitespace');
        expect(repeatedWordsCheck).toBeDefined();
        expect(Array.isArray(repeatedWordsCheck.issues)).toBe(true);
    
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
        expect(issue.comment).toBe('Unmatched closing punctuation: ]');
    });

    test('Detect unmatched punctuation issues for ACTS', () => {
        let trgTxt =  fs.readFileSync(path.resolve(__dirname, './mock_data/ACT.json'), 'utf-8');
        const result = checks(trgTxt, trgTxt, recipe);

        // const myUSJ = new USJHandler(JSON.parse(trgTxt));

        // console.log(`myUSJ.verse("9:36")`,myUSJ.verse("9:36"));
        // console.log(`result.checks`,JSON.stringify(result.checks, null, 4));

        const punctuationCheck = result.checks.find(c => c.name === 'textquality::unmatched_punctuation');
        expect(punctuationCheck).toBeDefined();
        expect(Array.isArray(punctuationCheck.issues)).toBe(true);
        expect(punctuationCheck.issues.length).toBeGreaterThan(0);

        const issue = punctuationCheck.issues.find(issue => issue.verse === '1:4');
        const lenIssues = punctuationCheck.issues.length;
        expect(issue).toBeDefined();
        expect(lenIssues).toBe(1);
        expect(issue.unmatched_punctuation).toBe('(');
        expect(issue.comment).toBe('Unmatched opening punctuation: (');
    });

    test('Detect mismatched numbers between source and target', () => {
        recipe = [
            {
                name: "numbers_check::mismatches",
                readName: "Missing numbers",
                description: "Checks if numbers from the source are correctly reported in the target.",
                level: "major",
                enabled: true,
            }
        ];

        let trgTxt =  fs.readFileSync(path.resolve(__dirname, './mock_data/test_target_numbers.json'), 'utf-8');
        let srcTxt =  fs.readFileSync(path.resolve(__dirname, './mock_data/test_source_numbers.json'), 'utf-8');

        const result = checks(srcTxt, trgTxt, recipe);

        const check = result.checks[0];

        expect(result).toBeDefined();
        expect(check.name).toBe('numbers_check::mismatches');
        expect(check.issues).toBeInstanceOf(Array);
        expect(check.issues.length).toBe(1);
    
        const issue = check.issues[0];
        expect(issue.verse).toBe('1:1');
        expect(issue.missing_numbers).toEqual([{ number: "42", position: 61 }]);
        expect(issue.extra_numbers).toEqual([{ number: "99", position: 61 }]);
        expect(issue.comment).toBe("Number mismatches detected. Missing: [42], Extra: [99]");
    
    });
});
