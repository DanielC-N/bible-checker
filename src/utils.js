import { USJHandler } from './USJHandler.js';

const numeralMapping = {
    // Arabic and Eastern Arabic numerals
    "0": ["0", "٠"],
    "1": ["1", "١"],
    "2": ["2", "٢"],
    "3": ["3", "٣"],
    "4": ["4", "٤"],
    "5": ["5", "٥"],
    "6": ["6", "٦"],
    "7": ["7", "٧"],
    "8": ["8", "٨"],
    "9": ["9", "٩"],
};

export function normalizeNumber(symbol) {
    for (const [normalized, variants] of Object.entries(numeralMapping)) {
        if (variants.includes(symbol)) {
            return normalized;
        }
    }
    return null;
}

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

export function extractNumbers(text) {
    const numberRegex = /[\d٠-٩]/g;
    return [...text.matchAll(numberRegex)].map((match) => normalizeNumber(match[0])).filter(Boolean);
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
    const sourceVerses = extractVerses(source);
    const targetVerses = extractVerses(target);

    for (const [key, sourceText] of Object.entries(sourceVerses)) {
        const targetText = targetVerses[key] || '';

        const sourceLength = sourceText.trim().length;
        const targetLength = targetText.trim().length;

        // Detect empty source or target verses
        if (sourceLength === 0 && targetLength > 0) {
            issues.push({
                verse: key,
                source_length: sourceLength,
                target_length: targetLength,
                verse_text: targetText,
                difference: null,
                comment: 'Source verse is empty, but target contains text.'
            });
        } else if (sourceLength > 0 && targetLength === 0) {
            issues.push({
                verse: key,
                source_length: sourceLength,
                target_length: targetLength,
                verse_text: sourceText,
                difference: null,
                comment: 'Target verse is empty, but source contains text.'
            });
        } else if (sourceLength > 0 && targetLength > 0) {
            // Detect short or long verses
            const diffPercentage = ((targetLength - sourceLength) / sourceLength) * 100;

            if (Math.abs(diffPercentage) > threshold) {
                issues.push({
                    verse: key,
                    source_length: sourceLength,
                    target_length: targetLength,
                    verse_text: sourceText,
                    difference: `${parseFloat(Math.abs(diffPercentage).toFixed(2))}%`,
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
 * Checks for duplicated or out-of-order chapter/verse numbers.
 * @param {object} source - Parsed JSON object of the source text.
 * @param {object} target - Parsed JSON object of the target text.
 * @returns {object} Report of chapter/verse integrity issues.
 */
export function checkChapterVerseIntegrity(source, target) {
    const issues = [];
    const sourceChapters = extractChapterVerses(source);
    const targetChapters = extractChapterVerses(target);
    const sourceVerses = extractVerses(source);
    const targetVerses = extractVerses(target);

    function validateIntegrity(chapterVerses, textType, verses) {
        const seen = new Set();
        let lastChapter = 0;
        let lastVerse;

        for (let [chapter, versesInChapter] of Object.entries(chapterVerses)) {
            lastVerse = 0;
            chapter = parseInt(chapter, 10);

            if (chapter < lastChapter) {
                issues.push({
                    type: 'out_of_order',
                    chapter,
                    comment: `${textType} has out-of-order chapter ${chapter}.`,
                });
            }
            lastChapter = chapter;

            for (const verse of versesInChapter) {
                if (verse < lastVerse) {
                    issues.push({
                        type: 'out_of_order',
                        chapter,
                        verse,
                        verse_text: verses[`${chapter}:${verse}`],
                        comment: `${textType} has out-of-order verse ${verse} in chapter ${chapter}.`,
                    });
                }
                if (seen.has(`${chapter}:${verse}`)) {
                    issues.push({
                        type: 'duplicate',
                        chapter,
                        verse,
                        verse_text: verses[`${chapter}:${verse}`],
                        comment: `${textType} has duplicate verse ${verse} in chapter ${chapter}.`,
                    });
                }
                seen.add(`${chapter}:${verse}`);
                lastVerse = verse;
            }
        }
    }

    // validateIntegrity(sourceChapters, 'Source', sourceVerses);
    validateIntegrity(targetChapters, 'Target', targetVerses);

    return {
        check: 'chapter_verse_integrity',
        issues,
    };
}

/**
 * Detects missing verses in the target compared to the source.
 * @param {object} source - Parsed JSON object of the source text.
 * @param {object} target - Parsed JSON object of the target text.
 * @returns {object} Report of missing verses.
 */
export function detectMissingVerses(source, target) {
    const issues = [];
    const sourceChapters = extractChapterVerses(source);
    const targetChapters = extractChapterVerses(target);
    const sourceVerses = extractVerses(source);

    for (const [chapter, verses] of Object.entries(sourceChapters)) {
        const targetVerses = targetChapters[chapter] || [];
        const missingVerses = verses.filter((verse) => !targetVerses.includes(verse));

        for (const missingVerse of missingVerses) {
            issues.push({
                chapter: parseInt(chapter, 10),
                verse: missingVerse,
                verse_text: sourceVerses[`${chapter}:${missingVerse}`],
                comment: `Target is missing verse ${missingVerse} in chapter ${chapter}.`,
            });
        }
    }

    return {
        check: 'missing_verses',
        issues,
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
        const repeatPositions = [];
        const whitespacePositions = [];
        let excessiveWhitespace = /\s{2,}/.test(text);

        // Detect consecutive repeated words with positions
        for (let i = 0; i < words.length - 1; i++) {
            const currentWord = words[i].toLowerCase().replace(/[.,!?"()]/g, '');
            const nextWord = words[i + 1].toLowerCase().replace(/[.,!?"()]/g, '');
            if (currentWord && currentWord === nextWord) {
                consecutiveRepeats.push(currentWord);
                repeatPositions.push(i);
            }
        }

        // Detect excessive whitespaces with positions
        if (excessiveWhitespace) {
            const matches = [...text.matchAll(/\s{2,}/g)];
            for (const match of matches) {
                whitespacePositions.push(match.index);
            }
        }

        if (consecutiveRepeats.length > 0 || excessiveWhitespace) {
            issues.push({
                verse: key,
                repeated_words: consecutiveRepeats,
                positions: repeatPositions,
                whitespace_positions: whitespacePositions,
                whitespace_issue: excessiveWhitespace,
                comment: consecutiveRepeats.length > 0
                    ? `Consecutive repeated words: ${[...new Set(consecutiveRepeats)].join(', ')}`
                    : "Excessive whitespace detected",
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
 * @param {object|null} pair_punctuation_list - Optional custom punctuation pairs.
 * @returns {object} Report of unmatched punctuation issues.
 */
export function detectUnmatchedPunctuation(target, pair_punctuation_list = null) {
    const issues = [];
    const targetVerses = extractVerses(target);

    // Define default punctuation pairs or use provided ones
    let PAIR_PUNCTUATION = {
        '(': ')',
        '[': ']',
        '{': '}',
        '«': '»',
        // '"': '"',
        // "'": "'",
    };

    if (pair_punctuation_list !== null) {
        PAIR_PUNCTUATION = pair_punctuation_list;
    }

    let stack = []; // Shared stack for punctuation tracking
    let toggles = {}; // Toggles for characters that are the same for opening and closing
    let openVerse = null; // Keeps track of the verse where punctuation started

    // Initialize toggles for symmetric punctuation
    for (const char of Object.keys(PAIR_PUNCTUATION)) {
        if (PAIR_PUNCTUATION[char] === char) {
            toggles[char] = false; // False means "not inside"
        }
    }

    for (const [key, text] of Object.entries(targetVerses)) {
        for (const char of text) {
            if (PAIR_PUNCTUATION[char]) {
                if (PAIR_PUNCTUATION[char] === char) {
                    // Handle symmetric punctuation using toggles
                    toggles[char] = !toggles[char];
                    if (toggles[char]) {
                        // Entering a symmetric punctuation
                        if (stack.length === 0) openVerse = key;
                        stack.push({ char, verse: key });
                    } else {
                        // Exiting a symmetric punctuation
                        const last = stack.pop();
                        if (!last || last.char !== char) {
                            issues.push({
                                verse: key,
                                unmatched_punctuation: char,
                                comment: `Unmatched closing punctuation: ${char}`,
                            });
                        // } else if (last.verse !== key) {
                        //     issues.push({
                        //         verse: `${last.verse} - ${key}`,
                        //         unmatched_punctuation: last.char,
                        //         comment: `Punctuation "${last.char}" started in verse ${last.verse} and matched in verse ${key}.`,
                        //     });
                        }
                    }
                } else {
                    // Handle asymmetric punctuation (e.g., (), {}, etc.)
                    if (stack.length === 0) openVerse = key;
                    stack.push({ char, verse: key });
                }
            } else if (Object.values(PAIR_PUNCTUATION).includes(char)) {
                // Handle closing punctuation
                const last = stack.pop();
                if (!last || PAIR_PUNCTUATION[last.char] !== char) {
                    // Unmatched closing punctuation
                    issues.push({
                        verse: key,
                        unmatched_punctuation: char,
                        comment: `Unmatched closing punctuation: ${char}`,
                    });
                // } else if (last.verse !== key) {
                //     // Matched punctuation spanning multiple verses
                //     issues.push({
                //         verse: `${last.verse} - ${key}`,
                //         unmatched_punctuation: last.char,
                //         comment: `Punctuation "${last.char}" started in verse ${last.verse} and matched in verse ${key}.`,
                //     });
                }
            }
        }
    }

    // Remaining unmatched opening punctuation in the stack
    if (stack.length > 0) {
        const unmatchedSet = new Set();
        while (stack.length > 0) {
            const unmatched = stack.pop();
            if (!unmatchedSet.has(unmatched.char)) {
                unmatchedSet.add(unmatched.char);
                issues.push({
                    verse: openVerse,
                    unmatched_punctuation: unmatched.char,
                    comment: `Unmatched opening punctuation: ${unmatched.char}`,
                });
            }
        }
    }

    return {
        check: 'unmatched_punctuation',
        issues,
    };
}

/**
 * Detects number mismatches between source and target verses.
 * @param {object} source - Parsed JSON object of the source text.
 * @param {object} target - Parsed JSON object of the target text.
 * @returns {object} Report of number mismatches.
 */
export function detectNumberMismatches(source, target) {
    const issues = [];
    const sourceVerses = extractVerses(source);
    const targetVerses = extractVerses(target);

    const numberRegex = /\b\d+\b/g;

    for (const [verseKey, sourceText] of Object.entries(sourceVerses)) {
        const sourceNumbers = [...sourceText.matchAll(numberRegex)].map(match => ({
            number: match[0],
            position: match.index
        }));

        const targetText = targetVerses[verseKey] || '';
        const targetNumbers = [...targetText.matchAll(numberRegex)].map(match => ({
            number: match[0],
            position: match.index
        }));

        const sourceNumberSet = new Set(sourceNumbers.map(item => item.number));
        const targetNumberSet = new Set(targetNumbers.map(item => item.number));

        const missingNumbers = [...sourceNumberSet].filter(num => !targetNumberSet.has(num));
        const extraNumbers = [...targetNumberSet].filter(num => !sourceNumberSet.has(num));

        if (missingNumbers.length > 0 || extraNumbers.length > 0) {
            issues.push({
                verse: verseKey,
                verse_text: sourceText,
                missing_numbers: missingNumbers.map(num => ({
                    number: num,
                    position: sourceNumbers.find(item => item.number === num)?.position || -1
                })),
                extra_numbers: extraNumbers.map(num => ({
                    number: num,
                    position: targetNumbers.find(item => item.number === num)?.position || -1
                })),
                comment: `Number mismatches detected. Missing: [${missingNumbers.join(', ')}], Extra: [${extraNumbers.join(', ')}]`
            });
        }
    }

    return {
        check: 'numbers_check::mismatches',
        issues
    };
}