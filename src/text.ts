export const getLines = (text: string, numRows: number, numColumns: number): string[] => {
    text = removeNonAscii(text);
    if (numColumns === undefined) {
        numColumns = 0;
    }
    if (numRows === undefined) {
        numRows = 0;
    }
    const lines: string[] = [];
    const groups: string[] = text.split('\n');
    for (const group of groups) {
        if (lines.length >= numRows) {
            break;
        }
        const words: string[] = group.split(' ');
        if (words.length === 0) {
            continue;
        }
        let currentWord = 0;
        for (let i = lines.length; i < numRows; i++) {
            if (currentWord >= words.length) {
                break;
            }
            let currentLine = '';
            let charsOnCurrentLine = 0;
            for (let k = currentWord; k < words.length; k++) {
                const currentWordLength = words[currentWord].length;
                const potentialCharsAdded = (charsOnCurrentLine === 0 ? 0 : 1) + currentWordLength;
                if (charsOnCurrentLine === 0 && currentWordLength > numColumns) {
                    currentLine += words[currentWord].slice(0, numColumns);
                    charsOnCurrentLine += numColumns;
                    words[currentWord] = words[currentWord].slice(numColumns);
                } else if (charsOnCurrentLine + potentialCharsAdded <= numColumns) {
                    currentLine += ((charsOnCurrentLine === 0 ? '' : ' ') + words[currentWord]);
                    charsOnCurrentLine += potentialCharsAdded;
                    currentWord++;
                } else {
                    break;
                }
            }
            lines.push(currentLine);
        }
    }
    const numLinesMissing = numRows - lines.length;
    for (let i = 0; i < numLinesMissing; i++) {
        lines.push('');
    }
    return lines;
};

const removeNonAscii = (text: string) => {
    return text.replace(/[^\x00-\xFF]/g, '');
};