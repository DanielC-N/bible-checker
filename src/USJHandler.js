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
}

// Export the USJHandler class
// module.exports = USJHandler;
