const precompiledHeader = `
->>>>
`;

/*
This assembly is based off nasm in basic syntax
https://cs.lmu.edu/~ray/notes/nasmtutorial/

Here's a quick rundown:
-----------------------

This is how I want it to work:

; comments start with a semicolon

; define a label to jump to for start (can change name)
                global start

; the text section is the thing that runs
                section .text
start:          out     message

; the data section defines variables
                section .data
counter:        0 ; numbers are implicitly decimal
message:        "hello, I like to eat pies", 30 ; the number at the end here is length
quantity:       0x7a ; 0x means hexadecimal


This is what actually works

; comments start with a semicolon

; bss section: declares var names. locations are automatic
bss:
name

; text section: goes in order command then args
text:
inc name
dec 64
*/

/*
About the memory (internal compiler stuff):
-------------------------------------------

The memory is fragmented into chunks of two bytes.
The first byte in each chunk is a label and the second is a value
The memory pointer should always be left pointing to a label at the end of a command,
NOT THE VALUE

These are the valid labels:

255: First memory index marker
0: The internal counter
1: an actual memory value
*/

function assemblyToBf(assemblyCode, debugMode=false) {
    var brainFCode = precompiledHeader;

    var sections = assemblyCode.split('text:');
    var bss = sections[0];
    bss = bss.replace('bss:', ''); // remove labels
    var text = sections[1];

    var memPointers = readBssSection(bss);

    var lines = text.split('\n');
    for (var line of lines) {
        brainFCode += assemblyLineToBf(line, memPointers);
    }

    return brainFCode;
}

function readBssSection(bss) {
    var memPointers = {};
    var lines = bss.split('\n');
    var prevMemIdx = 4;
    for (var line of lines) {
        line = line.trim();
        if (line.length == 0) continue;
        
        memPointers[line] = prevMemIdx;
        prevMemIdx += 2;
    }
    return memPointers;
}

function assemblyLineToBf(line, memPointers) {
    line = line.trim();
    if (line.length == 0) return '';

    var tokens = line.split(' ');

    if (tokens[0] in publicCompilerFunctions) {
        return publicCompilerFunctions[tokens[0]](tokens, memPointers);
    }
    else return '';
}

const hiddenCompilerFunctions = {
    pts : () => '+[-<<+]-', // pointer to start
    mpt : (memIdx, memPointers) => {
        // move pointer to
        var code = '\n';
        code += hiddenCompilerFunctions.pts();

        // If the mem index is not a number, then find the number attached to id
        if (isNaN(memIdx)) memIdx = memPointers[memIdx];

        code += '>'.repeat(memIdx);
        return code;
    }
}

const publicCompilerFunctions = {
    inc : (tokens, memPointers) => {
        // increment
        var code = '\n';
        code += hiddenCompilerFunctions.mpt(tokens[1], memPointers);
        code += '>+<'
        return code;
    },
    dec : (tokens, memPointers) => {
        // decrement
        var code = '\n';
        code += hiddenCompilerFunctions.mpt(tokens[1], memPointers);
        code += '>-<'
        return code;
    },
    getl : (tokens, memPointers) => {
        // get a line and put it into token1, with token2 as max length

        var code = '\n';
        code += hiddenCompilerFunctions.mpt(tokens[1], memPointers);
        code += `|>${',>>'.repeat(tokens[2])}>`;
        return code;
    },
    out : (tokens, memPointers) => {
        // print string from token1 until you reach null char
        var code = '\n';
        code += hiddenCompilerFunctions.mpt(tokens[1], memPointers);
        code += '>[.>>]<';
        return code;
    }
}