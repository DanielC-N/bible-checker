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
            readName: "Duplicated or out-of-order chapter/verse",
            description: "Checks for duplicated or out-of-order chapter/verse numbers.",
            level: "major",
            enabled: false,
        },
        {
            name: "chapterverse::missing_verses",
            readName: "Missing verses",
            description: "Detects missing verses in the target compared to the source.",
            level: "major",
            enabled: false,
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
        },
        {
            name: "numbers_check::mismatches",
            readName: "Missing numbers",
            description: "Checks if numbers from the source are correctly reported in the target.",
            level: "major",
            enabled: false,
        },
        {
            name: "footnote::quotation_mismatch",
            readName: "Unmatched footnote quotations",
            description: "Detects footnote quotations that do not match the verse or are missing words.",
            level: "minor",
            enabled: false,
        },
        
    ];

    return recipe;
}
