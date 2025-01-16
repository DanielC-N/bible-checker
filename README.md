# Bible Checker

**Bible Checker** is an NPM module designed to validate, compare, and analyze Bible translations. This module enables users to perform various checks on USJ-formatted Bible files, ensuring translation consistency and quality. It is highly configurable and supports modular checks for different validation needs.

---

## **Features**
- **USJ Handling**: Extract chapters, verses, or ranges from USJ files.  
- **Validation Checks**:
  - Detect **short, long, or empty verses**.
  - Verify **chapter and verse integrity** (missing, duplicated, or out-of-order).
  - Identify **consecutive repeated words** and **whitespace issues**.
  - Find **unmatched punctuation** (quotes, parentheses, brackets, etc.).  
- Optimized for performance and designed to scale with large scripture files.

---

## **Available Checks**

| **Name**                                 | **Description**                                                                 | **Level**  |
|------------------------------------------|---------------------------------------------------------------------------------|-----------|
| `versestats::verse_stats`                | Detects empty, short, and long verses based on a threshold percentage.          | `minor`   |
| `chapterverse::integrity_check`          | Verifies chapter/verse integrity (missing, duplicated, or out-of-order).        | `major`   |
| `textquality::repeated_words_whitespace` | Detects consecutive repeated words and excessive whitespace issues.             | `minor`   |
| `textquality::unmatched_punctuation`     | Finds unmatched punctuation pairs such as quotes, parentheses, and brackets.    | `minor`   |
| `chapterverse::missing_verses`           | Identifies verses that are missing in the target compared to the source text.   | `major`   |
| `numbers_check::mismatches`              | Checks for mismatched numbers between the source and target text.               | `minor`   |
| `footnote::quotation_mismatch`                 | Verifies the consistency of quoted text in footnotes against verse.         | `minor`   |


## Installation

Install the module via NPM:

```bash
npm install bible-checker
```

---

## Get Started

Follow these steps to start using the Bible Checker module:

### Step 1: Import the module

```javascript
import { USJHandler, getAvailableChecks } from 'bible-checker';
```

### Step 2: Use the USJHandler and extract chapters and verses

Ensure you have the source and target files in USJ format. For example:

- `SRC_FR_TIT.json` (Source file in French)
- `TAR_ENG_TITUS.json` (Target file in English)

Load the files into your script as strings:

```javascript
import fs from 'node:fs';

const sourceText = fs.readFileSync('path/to/SRC_FR_TIT.json', 'utf8');
const targetText = fs.readFileSync('path/to/TAR_ENG_TITUS.json', 'utf8');

const filePath = path.join('./assets/SRC_FR_TIT.json');
const usjContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Initialize the handler
const handler = new USJHandler(usjContent);

// Get total chapters and verses
console.log('Total Chapters:', handler.nbchapters());
console.log('Total Verses:', handler.nbverses());

// Extract a specific verse
console.log('Verse 1:1:', handler.verse('1:1'));

// Extract a range of verses
console.log('Range 1:1-1:3:', handler.verseRange('1:1-1:3'));

// Extract a full chapter
console.log('Chapter 1:', handler.chapter('1'));

```

### Step 3: Retrieve available checks

Get the default list of checks with `getAvailableChecks`:

```javascript
const recipe = getAvailableChecks();
console.log(recipe);
```
Output:

```json
[
    {
        "name": "versestats::verse_stats",
        "description": "Checks for empty, short, and long verses",
        "level": "minor",
        "enabled": false,
        "parameters": { "short_threshold": 20 }
    },
    {
        "name": "chapterverse::integrity_check",
        "description": "Checks for missing, duplicated, or out-of-order chapter/verse numbers.",
        "level": "major",
        "enabled": false
    },
    {
        "name": "textquality::repeated_words_whitespace",
        "description": "Detects consecutive repeated words and excessive whitespace.",
        "level": "minor",
        "enabled": false
    },
    {
        "name": "textquality::unmatched_punctuation",
        "description": "Checks for unmatched punctuation pairs like quotes, parentheses, or brackets.",
        "level": "minor",
        "enabled": false
    }
]
```

### Step 4: Customize your recipe

Enable the checks you want and modify their parameters if needed:

```javascript
recipe[0].enabled = true; // Enable short/long verses check
recipe[1].enabled = true; // Enable chapter/verse integrity check
recipe[0].parameters.short_threshold = 15; // Customize threshold
```

### Step 5: Run the checks

Pass the source, target, and customized recipe to the `checks` function:

```javascript
const result = checks(sourceText, targetText, recipe);
console.log(JSON.stringify(result, null, 2));
```

### Example Output
Here’s an example output from the `checks` function:

```json
{
  "checks": [
    {
      "name": "versestats::verse_stats",
      "description": "Checks for empty, short and long verses",
      "level": "minor",
      "issues": [
        {
          "source_verse": "TIT 1:1",
          "source_length": 342,
          "target_length": 114,
          "difference": -66.67,
          "comment": "Target verse is too short compared to source."
        }
      ]
    },
    {
      "name": "chapterverse::integrity_check",
      "description": "Checks for missing, duplicated, or out-of-order chapter/verse numbers",
      "level": "major",
      "issues": [
        {
          "type": "missing",
          "chapter": 1,
          "verse": 5,
          "message": "Target is missing verse 5 in chapter 1."
        }
      ]
    }
  ]
}
```

## API Reference

### `checks(source: string, target: string, recipe: Array): object`
Runs the specified checks on the source and target files based on the provided recipe.

#### Parameters:
- `source`: The source text as a JSON string.
- `target`: The target text as a JSON string.
- `recipe`: An array of checks with configuration.

#### Returns:
A JSON object containing the results of the checks.

#### Example:
```javascript
const result = checks(sourceText, targetText, recipe);
console.log(result);
```

---

### `getAvailableChecks(): Array`
Returns the full list of available checks with `enabled` set to `false` by default.

#### Returns:
An array of checks with descriptions and configuration options.

#### Example:
```javascript
const recipe = getAvailableChecks();
console.log(recipe);
```

---


---

## Contributing

Contributions are welcome! If you have ideas for additional checks or enhancements, feel free to submit an issue or pull request.

---

## License

This project is licensed under the **Creative Commons Attribution-ShareAlike 4.0 License**. See the [LICENSE](./LICENSE) file for details.

---

## Support

If you encounter any issues or have questions, please open an issue on [GitHub](https://github.com/DanielC-N/bible-checker).
