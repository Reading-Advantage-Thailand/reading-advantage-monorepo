function printFullWidthLine() {
    const width = process.stdout.columns;
    const line = '-'.repeat(width);
    console.log(line);
}

exports.printFullWidthLine = printFullWidthLine;