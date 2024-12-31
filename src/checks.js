import { detectShortLongVerses, checkChapterVerseIntegrity, detectRepeatedWordsAndWhitespace, detectUnmatchedPunctuation } from './utils.js';

/**
 * Run all checks based on the provided recipe.
 * @param {object} source - Parsed JSON object of the source text.
 * @param {object} target - Parsed JSON object of the target text.
 * @param {array} recipe - Array of check definitions.
 * @returns {object} JSON report of checks.
 */
export function runChecks(source, target, recipe) {
    const report = [];

    for (const check of recipe) {
        if (!check.enabled) continue;
        let result;

        switch (check.name) {
            case 'versestats::verse_stats':
                result = detectShortLongVerses(source, target, check.parameters?.short_threshold || 20);
                break;

            case 'chapterverse::integrity_check':
                result = checkChapterVerseIntegrity(source, target);
                break;

            case 'chapterverse::missing_verses':
                result = detectMissingVerses(source, target);
                break;

            case 'textquality::repeated_words_whitespace':
                result = detectRepeatedWordsAndWhitespace(target);
                break;

            case 'textquality::unmatched_punctuation':
                result = detectUnmatchedPunctuation(target);
                break;

            // Add additional checks here as needed

            default:
                console.warn(`Unknown check: ${check.name}`);
                continue;
        }
        if (result?.issues?.length > 0) {
            report.push({
                name: check.name,
                readName: check.readName,
                description: check.description,
                level: check.level,
                issues: result.issues,
            });
        }
    }

    return { checks: report };
}
