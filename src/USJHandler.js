// USJ State Machine Handler for Verses, Chapters, and Counting

/**
 * State machine for extracting chapters, verses, and counts from a USJ file.
 */
export class USJHandler {
    constructor(usj) {
        this.usj = usj;
    }

    /**
     * Count the total number of chapters in the USJ file.
     * @returns {number} Total chapters.
     */
    nbchapters() {
        let chapterCount = 0;
        this.traverse(this.usj.content, (item) => {
            if (item.marker === 'c' && item.number) {
                chapterCount++;
            }
        });
        return chapterCount;
    }

    /**
     * Count the total number of verses in the USJ file.
     * @returns {number} Total verses.
     */
    nbverses() {
        let verseCount = 0;
        this.traverse(this.usj.content, (item) => {
            if (item.marker === 'v' && item.number) {
                verseCount++;
            }
        });
        return verseCount;
    }

    /**
     * Extract the content of a specific verse.
     * @param {string} reference - Verse reference in the format "<chapter>:<verse>".
     * @returns {string} The extracted verse content.
     */
    verse(reference) {
        const [targetChapter, targetVerse] = reference.split(':');
        let currentChapter = null;
        let collecting = false;
        let verseContent = '';

        this.traverse(this.usj.content, (item) => {
            if (item.marker === 'c' && item.number) {
                currentChapter = item.number;
            } else if (item.marker === 'v' && item.number && currentChapter === targetChapter) {
                collecting = item.number === targetVerse;
            } else if (collecting && typeof item === 'string') {
                verseContent += item;
            }
        });

        return verseContent.trim();
    }

    /**
     * Extract the content of a range of verses.
     * @param {string} range - Verse range reference in the format "<chapter>:<start>-<chapter>:<end>".
     * @returns {string} The extracted range of verses.
     */
    verseRange(range) {
        const [startRef, endRef] = range.split('-');
        const [startChapter, startVerse] = startRef.split(':');
        const [endChapter, endVerse] = endRef.split(':');
        let currentChapter = null;
        let collecting = false;
        let rangeContent = '';

        this.traverse(this.usj.content, (item) => {
            if (item.marker === 'c' && item.number) {
                currentChapter = item.number;
            } else if (item.marker === 'v' && item.number && currentChapter >= startChapter && currentChapter <= endChapter) {
                const verseNumber = parseInt(item.number, 10);
                const inRange = verseNumber >= startVerse && verseNumber <= endVerse;

                collecting = inRange;
            }
            if (collecting && typeof item === 'string') {
                rangeContent += item;
            }
        });

        return rangeContent.trim();
    }

    /**
     * Extract the full content of a specific chapter.
     * @param {string} chapterNumber - The chapter number to extract.
     * @returns {string} The extracted chapter content.
     */
    chapter(chapterNumber) {
        let currentChapter = null;
        let collecting = false;
        let chapterContent = '';

        this.traverse(this.usj.content, (item) => {
            if (item.marker === 'c' && item.number) {
                currentChapter = item.number;
                collecting = currentChapter === chapterNumber;
            } else if (collecting && typeof item === 'string') {
                chapterContent += item;
            }
        });

        return chapterContent.trim();
    }

    /**
     * Traverse the content array and execute a callback on each item.
     * @param {array} content - USJ content array.
     * @param {function} callback - Callback to execute on each item.
     */
    traverse(content, callback) {
        for (const item of content) {
            callback(item);
            if (item.content) {
                this.traverse(item.content, callback);
            }
        }
    }

    /**
     * Extracts all verses from the USJ JSON object, excluding footnotes and cross-references.
     * @returns {object} Map of verse IDs to their cleaned text content.
     */
    extractVerses() {
        const verses = {};
        let currentChapter = null;
        let currentVerse = null;
        let currentContent = '';
        let inFootnoteOrXref = false;

        this.traverse(this.usj.content, (item) => {
            // Handle chapter marker
            if (item.marker === 'c' && item.number) {
                currentChapter = item.number;
                currentVerse = null;
                currentContent = '';
            }
            // Handle verse marker
            else if (item.marker === 'v' && item.number) {
                if (currentChapter && currentVerse) {
                    verses[`${currentChapter}:${currentVerse}`] = currentContent.trim();
                }
                currentVerse = item.number;
                currentContent = '';
            }
            // Enter footnote or cross-reference marker
            else if (item.marker === 'f' || item.marker === 'x') {
                inFootnoteOrXref = true;
            }
            // Exit footnote or cross-reference marker
            else if (inFootnoteOrXref && (item.marker === 'f*' || item.marker === 'x*')) {
                inFootnoteOrXref = false;
            }
            // Add string content only if not in a footnote or cross-reference
            else if (!inFootnoteOrXref && typeof item === 'string') {
                if (!currentContent.endsWith(item)) {
                    currentContent += item;
                }
            }
            // Add word content (type: "char") if not in a footnote or cross-reference
            else if (!inFootnoteOrXref && item.type === 'char' && Array.isArray(item.content)) {
                const charContent = item.content.join('');
                if (!currentContent.endsWith(charContent)) {
                    currentContent += charContent;
                }
            }
        });

        // Capture the final verse after traversal
        if (currentChapter && currentVerse) {
            verses[`${currentChapter}:${currentVerse}`] = currentContent.trim();
        }

        return verses;
    }

    /**
     * Extracts all footnotes from the USJ content along with their references.
     * @returns {Array} Array of footnotes with their respective content and references.
     */
    extractFootnotes() {
        const footnotes = [];
        let currentChapter = null;
        let currentVerse = null;

        this.traverse(this.usj.content, (item) => {
            if (item.marker === 'c' && item.number) {
                currentChapter = item.number;
            } else if (item.marker === 'v' && item.number) {
                currentVerse = item.number;
            } else if (item.marker === 'f' && item.type === 'note') {
                footnotes.push({
                    content: item.content,
                    reference: `${currentChapter}:${currentVerse}`
                });
            }
        });

        return footnotes;
    }

    /**
     * Extracts quoted text (fq or xq) from a footnote content array.
     * @param {Array} content - Content array of the footnote.
     * @returns {Array} Array of quoted text strings.
     */
    extractQuotedText(content) {
        const quotes = [];

        content.forEach((item) => {
            if (item && typeof item === "object" && (item.marker === "fq" || item.marker === "xq")) {
                quotes.push(item.content.join(" "));
            } else if (Array.isArray(item)) {
                quotes.push(...this.extractQuotedText(item));
            }
        });

        return quotes;
    }

}

// Export the USJHandler class
// module.exports = USJHandler;
