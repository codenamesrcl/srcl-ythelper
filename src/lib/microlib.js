const readline = require('readline');

function cleanupInvalidChars(input){
	input = input
		.replace(/\&/g, 'and')
		.replace(/[\|\*\/\\\:\:\,\[\]\"\'\?]/g, '-')
		;

		// * . " / \ [ ] : ; | , ? '
	return input;
}

function singleLineLog(msg){
	readline.clearLine(process.stdout, 0);
	if(process.stdout.cursorTo){
        process.stdout.cursorTo(0);
    }

    process.stdout.write(msg);
}

module.exports = {
	cleanupInvalidChars: cleanupInvalidChars,
	singleLineLog: singleLineLog
}