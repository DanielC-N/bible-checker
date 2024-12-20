import { runChecks } from './checks.js';
// import { extractVerses } from './utils.js';
// import { USJHandler } from './USJHandler.js';
// const { launchStateMachine } = require('./usj_handler');

/**
 * Main function exposed by the package.
 * @param {string} source - JSON string representing the source text.
 * @param {string} target - JSON string representing the target text.
 * @param {string|object} recipe - JSON string or object representing the list of checks to perform.
 * @returns {object} JSON report of all checks performed.
 */
export function checks(source, target, recipe) {
    try {
        const sourceData = JSON.parse(source);
        const targetData = JSON.parse(target);
        const recipeData = typeof recipe === 'string' ? JSON.parse(recipe) : recipe;

        return runChecks(sourceData, targetData, recipeData);
    } catch (error) {
        throw new Error('Invalid input: ' + error.message);
    }
}

/**
 * Returns the full list of available checks (recipe) with "enabled" set to false.
 * @returns {Array} Array of check definitions.
 */
export function getAvailableChecks() {
    const recipe = [
        {
            name: "versestats::verse_stats",
            readName: "Verse statistics",
            description: "Checks for empty, short and long verses",
            level: "minor",
            enabled: false,
            parameters: {
                short_threshold: 20
            }
        },
        {
            name: "chapterverse::integrity_check",
            readName: "Integrity check",
            description: "Checks for missing, duplicated, or out-of-order chapter/verse numbers",
            level: "major",
            enabled: false
        },
        {
            name: "textquality::repeated_words_whitespace",
            readName: "Repeated words and whitespace",
            description: "Detects repeated words and excessive whitespace in verses",
            level: "minor",
            enabled: false
        },
        {
            name: "textquality::unmatched_punctuation",
            readName: "Unmatched punctuation",
            description: "Checks for unmatched punctuation pairs like quotes, parentheses, or brackets",
            level: "minor",
            enabled: false
        }
    ];

    return recipe;
}



// const recipe_test = [
//     {
//         "name": "versestats::verse_stats",
//         "description": "Checks for empty, short and long verses",
//         "level": "minor",
//         "enabled": false,
//         "parameters": {
//             "short_threshold": 70
//         }
//     },
//     {
//         "name": "chapterverse::integrity_check",
//         "description": "Checks for duplicate or 'out of order' chapter/verse numbers",
//         "level": "major",
//         "enabled": false
//     },
//     {
//         name: "textquality::repeated_words_whitespace",
//         description: "Detects repeated words and excessive whitespace in verses",
//         level: "minor",
//         enabled: true
//     },
//     {
//         name: "textquality::unmatched_punctuation",
//         description: "Checks for unmatched punctuation pairs like quotes, parentheses, or brackets",
//         level: "minor",
//         enabled: true
//     }
// ]

// import fs from 'node:fs';
// import path from 'path';

// const src = fs.readFileSync(path.join('assets/SRC_FR_TIT.json'));
// const trg = fs.readFileSync(path.join('assets/SRC_FR_TIT.json'));

// console.log('src == ',JSON.parse(src));
// console.log(extractVerses(JSON.parse(trg)));

// const res = checks(src, trg, recipe_test);

// console.log(JSON.stringify(res, null, 4));

// const USJHandler = require('./usj_handler');

// const usjFile = JSON.parse(fs.readFileSync('assets/SRC_FR_TIT.json', 'utf8'));
// const handler = new USJHandler(usjFile);

// Extract chapter 3
// console.log('Chapters:', handler.nbchapters());

// Get total verses
// console.log('Verses:', handler.nbverses());

// Get full chapter
// console.log('Chapter 3:', handler.chapter('3'));

// Extract specific verse
// console.log('Verse 1:1:', handler.verse('1:1'));

// console.log('Verse 1:1:', handler.verseRange('1:3-1:4'));