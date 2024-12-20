import { USJHandler } from './USJHandler.js';

/**
 * Extracts verses from the USJ JSON format while skipping metadata like 'w' and 'zaln-*'.
 * @param {object} usj - Parsed USJ JSON object.
 * @returns {object} Map of verse IDs to their cleaned text content.
 */
export function extractVerses(usj) {
    const verses = {};
    let currentChapter = null;
    let currentVerse = null;
    let currentContent = '';

    function traverse(content) {
        for (const item of content) {
            if (item.marker === 'c' && item.number) {
                // New chapter: reset tracking
                currentChapter = item.number;
                currentVerse = null;
                currentContent = '';
            } else if (item.marker === 'v' && item.number) {
                // New verse: store previous verse and reset content
                if (currentChapter && currentVerse) {
                    verses[`${currentChapter}:${currentVerse}`] = currentContent.trim();
                }
                currentVerse = item.number;
                currentContent = '';
            } else if (typeof item === 'string') {
                // Append plain strings directly
                currentContent += item;
            } else if (item.type === 'char' && Array.isArray(item.content)) {
                // Extract content from char markers
                currentContent += item.content.join('');
            } else if (item.content) {
                // Recursively handle nested content
                traverse(item.content);
            }
        }
    }

    traverse(usj.content);

    // Save the last verse if it exists
    if (currentChapter && currentVerse) {
        verses[`${currentChapter}:${currentVerse}`] = currentContent.trim();
    }

    return verses;
}


/**
 * Extracts chapter and verse numbers from USJ content.
 * @param {object} text - USJ JSON object.
 * @returns {object} Map of chapters to arrays of verses.
 */
export function extractChapterVerses(text) {
    const handler = new USJHandler(text);
    const chapters = {};

    handler.traverse(text.content, (item) => {
        if (item.marker === 'c' && item.number) {
            handler.currentChapter = item.number;
            if (!chapters[handler.currentChapter]) {
                chapters[handler.currentChapter] = [];
            }
        } else if (item.marker === 'v' && item.number) {
            chapters[handler.currentChapter].push(parseInt(item.number, 10));
        }
    });

    return chapters;
}

/**
 * Detects short, long, or empty verses based on length comparison between source and target.
 * @param {object} source - Parsed JSON object of the source text.
 * @param {object} target - Parsed JSON object of the target text.
 * @param {number} threshold - Percentage difference to consider (default: 20%).
 * @returns {object} Report of short/long verses and empty verses.
 */
export function detectShortLongVerses(source, target, threshold = 20) {
    const issues = [];
    // const sourceHandler = new USJHandler(source);
    // const targetHandler = new USJHandler(target);

    const sourceVerses = extractVerses(source);
    const targetVerses = extractVerses(target);

    for (const [key, sourceText] of Object.entries(sourceVerses)) {
        const targetText = targetVerses[key] || '';

        const sourceLength = sourceText.trim().length;
        const targetLength = targetText.trim().length;

        // Detect empty source or target verses
        if (sourceLength === 0 && targetLength > 0) {
            issues.push({
                source_verse: key,
                source_length: sourceLength,
                target_length: targetLength,
                difference: null,
                comment: 'Source verse is empty, but target contains text.'
            });
        } else if (sourceLength > 0 && targetLength === 0) {
            issues.push({
                source_verse: key,
                source_length: sourceLength,
                target_length: targetLength,
                difference: null,
                comment: 'Target verse is empty, but source contains text.'
            });
        } else if (sourceLength > 0 && targetLength > 0) {
            // Detect short or long verses
            const diffPercentage = ((targetLength - sourceLength) / sourceLength) * 100;

            if (Math.abs(diffPercentage) > threshold) {
                issues.push({
                    source_verse: key,
                    source_length: sourceLength,
                    target_length: targetLength,
                    difference: parseFloat(diffPercentage.toFixed(2)),
                    comment: diffPercentage > 0
                        ? 'Target verse is too long compared to source.'
                        : 'Target verse is too short compared to source.'
                });
            }
        }
    }

    return {
        check: 'short_long_verses',
        issues
    };
}

/**
 * Checks for missing, duplicated, or out-of-order chapter/verse numbers.
 * @param {object} source - Parsed JSON object of the source text.
 * @param {object} target - Parsed JSON object of the target text.
 * @returns {object} Report of chapter/verse integrity issues.
 */
export function checkChapterVerseIntegrity(source, target) {
    const issues = [];
    const sourceChapters = extractChapterVerses(source);
    const targetChapters = extractChapterVerses(target);

    // Helper to validate order and duplication
    function validateIntegrity(chapterVerses, textType) {
        const seen = new Set();
        let lastChapter = 0;
        let lastVerse;

        for (let [chapter, verses] of Object.entries(chapterVerses)) {
            lastVerse = 0;
            chapter = parseInt(chapter, 10);
            if (chapter < lastChapter) {
                issues.push({
                    type: 'out_of_order',
                    chapter,
                    message: `${textType} has out-of-order chapter ${chapter}.`
                });
            }
            lastChapter = chapter;

            for (const verse of verses) {
                if (verse < lastVerse) {
                    issues.push({
                        type: 'out_of_order',
                        chapter,
                        verse,
                        message: `${textType} has out-of-order verse ${verse} in chapter ${chapter}.`
                    });
                }
                if (seen.has(`${chapter}:${verse}`)) {
                    issues.push({
                        type: 'duplicate',
                        chapter,
                        verse,
                        message: `${textType} has duplicate verse ${verse} in chapter ${chapter}.`
                    });
                }
                seen.add(`${chapter}:${verse}`);
                lastVerse = verse;
            }
        }
    }

    validateIntegrity(sourceChapters, 'Source');
    validateIntegrity(targetChapters, 'Target');

    // Detect missing verses in target
    for (const [chapter, verses] of Object.entries(sourceChapters)) {
        const targetVerses = targetChapters[chapter] || [];
        const missingVerses = verses.filter((verse) => !targetVerses.includes(verse));
        for (const missingVerse of missingVerses) {
            issues.push({
                type: 'missing',
                chapter: parseInt(chapter, 10),
                verse: missingVerse,
                message: `Target is missing verse ${missingVerse} in chapter ${chapter}.`
            });
        }
    }

    return {
        check: 'chapter_verse_integrity',
        issues
    };
}


/**
 * Detects consecutive repeated words and excessive whitespace in verses.
 * @param {object} target - Parsed JSON object of the target text.
 * @returns {object} Report of consecutive repeated words or whitespace issues.
 */
export function detectRepeatedWordsAndWhitespace(target) {
    const issues = [];
    const targetVerses = extractVerses(target);

    for (const [key, text] of Object.entries(targetVerses)) {
        const words = text.split(/\s+/);
        const consecutiveRepeats = [];
        const positions = [];
        let excessiveWhitespace = /\s{2,}/.test(text);

        // Detect consecutive repeated words with positions
        for (let i = 0; i < words.length - 1; i++) {
            const currentWord = words[i].toLowerCase().replace(/[.,!?"()]/g, '');
            const nextWord = words[i + 1].toLowerCase().replace(/[.,!?"()]/g, '');
            if (currentWord && currentWord === nextWord) {
                consecutiveRepeats.push(currentWord);
                positions.push(i);
            }
        }

        if (consecutiveRepeats.length > 0 || excessiveWhitespace) {
            issues.push({
                verse: key,
                repeated_words: consecutiveRepeats,
                positions: positions,
                whitespace_issue: excessiveWhitespace,
                comment: `Consecutive repeated words: ${[...new Set(consecutiveRepeats)].join(', ')}${excessiveWhitespace ? ' | Excessive whitespace detected' : ''}`,
            });
        }
    }

    return {
        check: 'repeated_words_and_whitespace',
        issues
    };
}

/**
 * Detects unmatched punctuation pairs across verses (e.g., quotes, parentheses).
 * @param {object} target - Parsed JSON object of the target text.
 * @returns {object} Report of unmatched punctuation issues.
 */
export function detectUnmatchedPunctuation(target, pair_punctuation_list=null) {
    const issues = [];
    const targetVerses = extractVerses(target);

    let PAIR_PUNCTUATION = {
        '(': ')',
        '[': ']',
        '{': '}',
        '"': '"',
    };

    if(pair_punctuation_list !== null) {
        PAIR_PUNCTUATION = pair_punctuation_list;
    }

    let stack = [];
    let openVerse = null;

    for (const [key, text] of Object.entries(targetVerses)) {
        for (const char of text) {
            if (PAIR_PUNCTUATION[char]) {
                // Opening punctuation: push to stack
                if (stack.length === 0) openVerse = key;
                stack.push({ char, verse: key });
            } else if (Object.values(PAIR_PUNCTUATION).includes(char)) {
                // Closing punctuation: check the stack
                const last = stack.pop();
                if (!last || PAIR_PUNCTUATION[last.char] !== char) {
                    // Unmatched closing punctuation
                    issues.push({
                        verse: key,
                        unmatched_punctuation: char,
                        comment: `Unmatched closing punctuation: ${char}`
                    });
                }
            }
        }
    }

    while (stack.length > 0) {
        const unmatched = stack.pop();
        issues.push({
            verse: openVerse,
            unmatched_punctuation: unmatched.char,
            comment: `Unmatched opening punctuation: ${unmatched.char}`
        });
    }

    return {
        check: 'unmatched_punctuation',
        issues
    };
}

