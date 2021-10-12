// Increment the first memory tag and move to the next cell to prepare for mem init
const precompiledHeader = `
+>>
`;

/*
This assembly is somewhat based of nasm
https://cs.lmu.edu/~ray/notes/nasmtutorial/

Here's a quick rundown:
-----------------------

This is how I want it to work:

; comments start with a semicolon

; the d (data) section defines variables (must go before t section)
; format of things in the d section is
; type name value extrainfo1 extrainfo2 extrainfoN
; type can be i (int, in decimal), s (string), a (array of ints)
; there aren't any bools yet, so just use an int

section d
i value 48 ; 48 = ascii '0'
s message 30 Hello, this is a message; the number in there is length (extra chars will be set to 0)

; the t (text) section is the thing that runs
section t
out value
inc value
out value
outa message
*/

/*
About the memory (internal compiler stuff):
-------------------------------------------

The memory is fragmented into chunks of two bytes.
The first byte in each chunk is a label and the second is a value
The memory pointer should always be left pointing to a label at the end of a command,
NOT THE VALUE

These are the valid labels:
(a string is just an array initialised differently)

0: unused memory item
1: first memory index marker
2: an internal counter
3: a one-cell memory value of type i, etc
4: a value in an array
5: array terminator (should follow a label 4)
*/

// This class is coded somewhat weirdly because...
// ...I'm trying to code it similarly to how I would code it in assembly
class AssemblyToBf {
    // memory indexes of the internal counters (add more if needed)
    static tempMemory = [
        2, 4, 6
    ];

    // A list of private internal compiler functions that have unique arguments
    // Using these requires knowledge of each individual function
    static internCompileFuncs = {
        addDebugSpacing : debugMode => {
            return debugMode ? '\n' : '';
        },
        pts : debugMode => {
            // pointer to start
            var code = '-[+<<-]+';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        mpt : (memIdx, memPointers, debugMode) => {
            // move pointer to
            var code = '';
            code += this.internCompileFuncs.pts(debugMode);

            // If the mem index is not a number, then find the number attached to id
            if (isNaN(memIdx)) memIdx = memPointers[memIdx].memStart;

            code += '>'.repeat(memIdx);
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        bf : (brainFCode, debugMode) => {
            // Inline BrainF
            var code = '';
            code += brainFCode;
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },

        // Maths
        // -----

        inc : (memAddr, memPointers, debugMode) => {
            // increment item at memAddr
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr, memPointers, debugMode);
            code += '>+<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        dec : (memAddr, memPointers, debugMode) => {
            // decrement item at memAddr
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr, memPointers, debugMode);
            code += '>-<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        add : (fromAddr, toAddr, tempAddr, memPointers, debugMode) => {
            // Add fromAddr to toAddr (changing toAddr)
            // How this works: first move value to tempAddr
            // AND toAddr simulanously (deleting value in fromAddr).
            // Then move value from tempAddr to toAddr, restoring

            // Shortcut
            var mpt = t => this.internCompileFuncs.mpt(t, memPointers, debugMode);

            var code = '';

            // First make destination empty
            code += this.internCompileFuncs.zer(tempAddr, memPointers, debugMode);

            // Then, while value of fromAddr is > 0, increment toAddr/internalCounter and decrement fromAddr
            code += `${mpt(fromAddr)}>[-<${mpt(toAddr)}>+<${mpt(tempAddr)}>+<${mpt(fromAddr)}>]<`;

            // Then move value from temp storage to fromAddr, restoring it
            code += this.internCompileFuncs.mv(tempAddr, fromAddr, memPointers, debugMode);

            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        sub : (fromAddr, toAddr, tempAddr, memPointers, debugMode) => {
            // Subtract fromAddr from toAddr (changing toAddr)
            // How this works: first move value to an tempAddr
            // AND toAddr simulanously (deleting value in fromAddr).
            // Then move value from tempAddr to toAddr, restoring

            // Shortcut
            var mpt = t => this.internCompileFuncs.mpt(t, memPointers, debugMode);

            var code = '';

            // First make destination empty
            code += this.internCompileFuncs.zer(tempAddr, memPointers, debugMode);

            // Then, while value of fromAddr is > 0, increment internalCounter
            // and decrement fromAddr/toAddr
            code += `${mpt(fromAddr)}>[-<${mpt(toAddr)}>-<${mpt(tempAddr)}>+<${mpt(fromAddr)}>]<`;

            // Then move value from temp storage to fromAddr, restoring it
            code += this.internCompileFuncs.mv(tempAddr, fromAddr, memPointers, debugMode);

            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        mult : (fromAddr, toAddr, tempAddr1, tempAddr2, memPointers, debugMode) => {
            // Multiply the value of toAddr by fromAddr, modifying toAddr
            // How this works: Use tempAddr1 to keep track of how many times to add fromAddr.
            // tempAddr2 is used as a true temp address and doesn't do anything but help the internals

            // Shortcut
            var mpt = t => this.internCompileFuncs.mpt(t, memPointers, debugMode);

            var code = '';
            
            // Setup a counter for times to add
            code += this.internCompileFuncs.zer(toAddr, memPointers, debugMode);

            // Clear the target address
            code += this.internCompileFuncs.cpy(fromAddr, toAddr, tempAddr2, memPointers, debugMode);

            // Move to tempAddr1 to init loop
            code += `${mpt(tempAddr1)}>[<`;

            code += this.internCompileFuncs.add(fromAddr, toAddr, tempAddr2, memPointers, debugMode);

            // Decrement loop counter and end loop
            code += `${mpt(tempAddr1)}>-]<`;
            
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        div : (dividend, divisor, quotient, memPointers, debugMode) => {
            // Divide dividend by divisor, writing the result into quotient
            
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },

        // Memory manipulation
        // -------------------

        zer : (memAddr, memPointers, debugMode) => {
            // Set item at memAddr to 0
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr, memPointers, debugMode);
            code += '>[-]<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        zera : (memAddr, memPointers, debugMode) => {
            // Zero (clear) a string or array starting at memAddr
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr, memPointers, debugMode);
            code += '-----[+++++>[-]>-----]+++++';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        mv : (fromAddr, toAddr, memPointers, debugMode) => {
            // Move the value from fromAddr to toAddr and leave fromAddr at zero

            // Shortcut
            var mpt = t => this.internCompileFuncs.mpt(t, memPointers, debugMode);

            var code = '';

            // First make destination empty
            code += this.internCompileFuncs.zer(toAddr, memPointers, debugMode);

            // Then, while value of fromAddr is > 0, increment toAddr and decrement fromAddr
            code += `${mpt(fromAddr)}>[-<${mpt(toAddr)}>+<${mpt(fromAddr)}>]<`;

            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        cpy : (fromAddr, toAddr, tempAddr, memPointers, debugMode) => {
            // Copy the value from fromAddr to toAddr
            // How this works: first move value to tempAddr
            // AND toAddr simulanously (deleting value in fromAddr).
            // Then move value from tempAddr to toAddr, restoring

            // Shortcut
            var mpt = t => this.internCompileFuncs.mpt(t, memPointers, debugMode);

            var code = '';

            // First make destinations empty
            code += this.internCompileFuncs.zer(toAddr, memPointers, debugMode);
            code += this.internCompileFuncs.zer(tempAddr, memPointers, debugMode);

            // Then, while value of fromAddr is > 0, increment toAddr/internalCounter and decrement fromAddr
            code += `${mpt(fromAddr)}>[-<${mpt(toAddr)}>+<${mpt(tempAddr)}>+<${mpt(fromAddr)}>]<`;

            // Then move value from temp storage to fromAddr, restoring it
            code += this.internCompileFuncs.mv(tempAddr, fromAddr, memPointers, debugMode);

            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        set : (memAddr, value, memPointers, debugMode) => {
            // Set the item at memAddr to value
            var code = '';
            code += this.internCompileFuncs.zer(memAddr, memPointers, debugMode);
            code += '>' + '+'.repeat(value) + '<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },

        // Input/output stuff:
        // -------------------

        out : (memAddr, memPointers, debugMode) => {
            // output a single char at memAddr
            // planned: add an offset
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr, memPointers, debugMode);
            code += '>.<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        outa : (memAddr, memPointers, debugMode) => {
            // output a whole string or array starting from memAddr
            // (continue until the label of the next memory item is 5)
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr, memPointers, debugMode);
            code += '-----[+++++>.>-----]+++++';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        outr : (value, debugMode) => {
            // Output a raw value as an ascii code
            var code = this.internCompileFuncs.zer(this.tempMemory[0], {}, debugMode);
            code += `>${'+'.repeat(value)}.<`;
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        lbr : (debugMode) => {
            // Line break. Output a newline and a carriage return
            code += this.internCompileFuncs.outr(13, false);
            code += this.internCompileFuncs.outr(10, false);
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        ich : (memAddr, memPointers, debugMode) => {
            // Get a character input and write it to memAddr
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr, memPointers, debugMode);
            code += '>,<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        iln : (memAddr, memPointers, debugMode) => {
            // Get a line and write it to string or arr starting at memAddr
            // (bad things will happen when the line is longer than the string)

            // Alg: write chars into the string until char is newline
            // after finishing, set the char that is newline to 0

            var code = '';

            // First clear the target string
            code += this.internCompileFuncs.zera(memAddr, memPointers, debugMode);

            code += this.internCompileFuncs.mpt(memAddr, memPointers, debugMode);
            code += '>,-------------[+++++++++++++>>,-------------]+++++++++++++[-]<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },

        // Control structures
        // ------------------

        luz : (memAddr, memPointers, debugMode) => {
            // Start of a loop - loop until value at memAddr is zero
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr);
            code += '>[<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        eluz : (memAddr, memPointers, debugMode) => {
            // End a loop-until-zero
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr);
            code += '>]<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        ifz : (memAddr, tempAddr1, tempAddr2, memPointers, debugMode) => {
            // If memAddr is 0, run the code between here and eifz
            // Alg based off https://esolangs.org/wiki/Brainfuck_algorithms#if_.28x.29_.7B_code1_.7D_else_.7B_code2_.7D

            // Shortcut
            var mpt = t => this.internCompileFuncs.mpt(t, memPointers, debugMode);

            var code = '';
            code += this.internCompileFuncs.zer(tempAddr1, memPointers, debugMode);
            code += '>+<';
            code += this.internCompileFuncs.zer(tempAddr2, memPointers, debugMode);
            code += `${mpt(memAddr)}>[<${mpt(tempAddr1)}>-<${mpt(memAddr)}>[<${mpt(tempAddr2)}>+<${mpt(memAddr)}>-]]<`;
            code += `${mpt(tempAddr2)}>[<${mpt(memAddr)}>+<${mpt(tempAddr2)}>-]<`;
            code += `${mpt(tempAddr1)}>[<`;
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        eifz : (memAddr, tempAddr1, tempAddr2, memPointers, debugMode) => {
            // End of ifz

            var code = '';
            code += this.internCompileFuncs.mpt(tempAddr1);
            code += '>-]<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        }
    }

    // A list of public compiler functions which all accept the same three arguments:
    // <array of tokens of command>, <dict of memory pointers>, <bool of debugMode>
    // These compiler functions are the ones usable by dict lookup
    static publicCompileFuncs = {
        mpt : (tokens, memPointers, debugMode) => {
            // Move pointer to token1
            // Mainly used for preparing inline brainF
            return this.internCompileFuncs.mpt(tokens[1], memPointers, debugMode);
        },
        bf : (tokens, memPointers, debugMode) => {
            // Inline brainF code
            var brainF = tokens.slice(1).join(' ');
            return this.internCompileFuncs.bf(brainF, debugMode);
        },

        // Maths
        // -----

        inc : (tokens, memPointers, debugMode) => {
            // Increment token1
            return this.internCompileFuncs.inc(tokens[1], memPointers, debugMode);
        },
        dec : (tokens, memPointers, debugMode) => {
            // Decrement token1
            return this.internCompileFuncs.dec(tokens[1], memPointers, debugMode);
        },
        add : (tokens, memPointers, debugMode) => {
            // Add the value of token1 to token2, changing token2
            return this.internCompileFuncs.add(tokens[1], tokens[2], this.tempMemory[0], memPointers, debugMode);
        },
        sub : (tokens, memPointers, debugMode) => {
            // Subtract the value of token1 to token2, changing token2
            return this.internCompileFuncs.sub(tokens[1], tokens[2], this.tempMemory[0], memPointers, debugMode);
        },
        mult : (tokens, memPointers, debugMode) => {
            // Multiply token1 by token2, changing token2
            return this.internCompileFuncs.mult(tokens[1], tokens[2], this.tempMemory[0], this.tempMemory[1], memPointers, debugMode)
        },
        
        // Memory management
        // -----------------

        zer : (tokens, memPointers, debugMode) => {
            // Set token1 to 0
            return this.internCompileFuncs.zer(tokens[1], memPointers, debugMode);
        },
        zera : (tokens, memPointers, debugMode) => {
            // Zero (clear) string or array at token1
            return this.internCompileFuncs.zera(tokens[1], memPointers, debugMode);
        },
        mv : (tokens, memPointers, debugMode) => {
            // Move value from token1 to token2
            // (empties token1)
            return this.internCompileFuncs.mv(tokens[1], tokens[2], memPointers, debugMode);
        },
        cpy : (tokens, memPointers, debugMode) => {
            // Copy value from token1 to token2
            return this.internCompileFuncs.cpy(tokens[1], tokens[2], this.tempMemory[0], memPointers, debugMode);
        },
        set : (tokens, memPointers, debugMode) => {
            // Set token1 to token2 (read token2 as number)
            return this.internCompileFuncs.set(tokens[1], Number(tokens[2]), memPointers, debugMode);
        },
        seta : (tokens, memPointers, debugMode) => {
            // Set item in array
            // token1[token2] to token3
            var memAddr = memPointers[tokens[1]].memStart;
            memAddr += Number(tokens[2]) * 2;
            return this.internCompileFuncs.set(memAddr, Number(tokens[3]), memPointers, debugMode);
        },
        aac : (tokens, memPointers, debugMode) => {
            // Array access
            // copy token1[token2] into token3
            var memAddr = memPointers[tokens[1]].memStart;
            memAddr += Number(tokens[2]) * 2;
            return this.internCompileFuncs.cpy(memAddr, tokens[3], memPointers, debugMode);
        },

        // Input/output stuff:
        // -------------------

        out : (tokens, memPointers, debugMode) => {
            // Output single value at token1
            return this.internCompileFuncs.out(tokens[1], memPointers, debugMode);
        },
        outa : (tokens, memPointers, debugMode) => {
            // Output string or array starting from token1
            return this.internCompileFuncs.outa(tokens[1], memPointers, debugMode);
        },
        outr : (tokens, memPointers, debugMode) => {
            // Interpret token1 as an ascii char and output it
            return this.internCompileFuncs.outr(Number(tokens[1]), debugMode);
        },
        lbr : (tokens, memPointers, debugMode) => {
            // Line break. Output a newline and a carriage return
            return this.internCompileFuncs.lrb(debugMode);
        },
        cls : (tokens, memPointers, debugMode) => {
            // Clear the screen
            return this.internCompileFuncs.outr(4, debugMode);
        },
        ich : (tokens, memPointers, debugMode) => {
            // Get a character in and write it to token1
            return this.internCompileFuncs.ich(tokens[1], memPointers, debugMode);
        },
        icha : (tokens, memPointers, debugMode) => {
            // Get a character in and write it to the string or arr at token1
            // and with the offset from start of token2 (default offset = 0)
            var memAddr = memPointers[tokens[1]].memStart;
            if (tokens[2]) memAddr += Number(tokens[2]) * 2;
            return this.internCompileFuncs.ich(memAddr, memPointers, debugMode);
        },
        iln : (tokens, memPointers, debugMode) => {
            // Get a line and write it to string or arr starting at token1
            // (bad things will happen when the line is longer than the string)
            return this.internCompileFuncs.iln(tokens[1], memPointers, debugMode);
        },

        // Control structures
        // ------------------

        luz : (tokens, memPointers, debugMode) => {
            // Start of a loop - loop until value at token1 is zero
            var memAddr = memPointers[tokens[1]].memStart;
            return this.internCompileFuncs.luz(memAddr, memPointers, debugMode);
        },
        eluz : (tokens, memPointers, debugMode) => {
            // End of a loop-until-zero. Token1 says what value to look at for checking end
            var memAddr = memPointers[tokens[1]].memStart;
            return this.internCompileFuncs.eluz(memAddr, memPointers, debugMode);
        },
        ifz : (tokens, memPointers, debugMode) => {
            // If token1 is 0, run the following code
            return this.internCompileFuncs.ifz(tokens[1], this.tempMemory[0], this.tempMemory[1], memPointers, debugMode);
        },
        eifz : (tokens, memPointers, debugMode) => {
            // End of ifz
            return this.internCompileFuncs.eifz(tokens[1], this.tempMemory[0], this.tempMemory[1], memPointers, debugMode);
        }
    }

    static compile(assemblyCode, debugMode=false) {
        var brainFCode = precompiledHeader;

        var assemblyLines = assemblyCode.split('\n');
        var [dataSection, textSection] = this.splitSections(assemblyLines);

        var memPointers = this.readDataSection(dataSection);
        brainFCode += this.initMemory(memPointers, debugMode);

        textSection.forEach(line => {
            line = line.trim();
            var tokens = line.split(' ');
            if (tokens[0] in this.publicCompileFuncs) {
                var compilerFunction = this.publicCompileFuncs[tokens[0]];
                brainFCode += compilerFunction(tokens, memPointers, debugMode);
                if (debugMode) brainFCode += '\n';
            }
        });

        brainFCode = this.optimize(brainFCode);

        return brainFCode;
    }

    static optimize(brainFCode) {
        // Optimize brainFCode without affecting its functionality
        
        const inverseSymbols = {
            '<' : '>',
            '+' : '-',
        };
        for (const symbol1 of spnr.obj.keys(inverseSymbols)) {
            const symbol2 = inverseSymbols[symbol1];
            brainFCode = spnr.str.replaceAll(brainFCode, symbol1 + symbol2, '');
            brainFCode = spnr.str.replaceAll(brainFCode, symbol2 + symbol1, '');
        }
        return brainFCode;
    }

    static splitSections(assemblyLines) {
        var crntSectionName = '';
        var dataSection = [];
        var textSection = [];
        assemblyLines.forEach(line => {
            if (line.slice(0, 'section'.length) == 'section') {
                crntSectionName = line['section '.length];
            }
            else if (crntSectionName == 'd') dataSection.push(line);
            else if (crntSectionName == 't') textSection.push(line);
        });
        return [dataSection, textSection];
    }

    static readDataSection(dataSection) {

        // in format name:{memStart:<int>, memEnd:<int>,
        //     type:<char>, initialVarValue:<value>}
        var memPointers = {};

        // Leave space at the start for counters (+ 2 for label at start of memory)
        var nextFreeMemIdx = 2 + this.tempMemory[this.tempMemory.length - 1];

        dataSection.forEach(line => {
            var tokens = line.split(' ');
            var varType = tokens[0];
            var varName = tokens[1];
            if (varType == 'i') {
                memPointers[varName] = {
                    memStart : nextFreeMemIdx,
                    memEnd : nextFreeMemIdx + 2,
                    type : varType,
                    initialVarValue : tokens[2] || null
                };
                nextFreeMemIdx += 2;
            }
            if (varType == 'a') {
                // Add 1 to allow for terminator
                var varLength = (Number(tokens[2]) + 1) * 2;

                memPointers[varName] = {
                    memStart : nextFreeMemIdx,
                    memEnd : nextFreeMemIdx + varLength,
                    type : varType,
                    initialVarValue : null // set val to null as arrays are inited to 0
                };
                nextFreeMemIdx += varLength;
            }
            if (varType == 's') {
                // Add 1 to allow for terminator
                var varLength = (Number(tokens[2]) + 1) * 2;

                memPointers[varName] = {
                    memStart : nextFreeMemIdx,
                    memEnd : nextFreeMemIdx + varLength,
                    type : varType,
                    initialVarValue : tokens.slice(3).join(' ')
                };
                nextFreeMemIdx += varLength;
            }
        });

        return memPointers;
    }

    static initMemory(memPointers, debugMode) {
        /* Compile BrainF that will initiate the memory variables
        To avoid lag, this doesn't reset the pointer to the start after
        each initialisation, instead just moving the pointer to the next
        free memory address (eg the one after the last var made)
        */

        var code = '';

        // If there are no memory items, just quit
        if (spnr.obj.keys(memPointers).length == 0) return '';

        // Go to start of usable memory
        var firstPointerName = spnr.obj.keys(memPointers)[0]
        code += this.internCompileFuncs.mpt(memPointers[firstPointerName].memStart);

        for (var name in memPointers) {
            var pointerInfo = memPointers[name];
            if (pointerInfo.type == 'i') {
                code += '+++'; // update label of memory
                code += '>'; // move to data chunk
                code += '+'.repeat(pointerInfo.initialVarValue || 0);
                code += '>'; // move forward to clean memory
            }
            if (pointerInfo.type == 'a') {
                // Divide by 2 because each char is 2 bytes
                var arrLength = (pointerInfo.memEnd - pointerInfo.memStart) / 2 - 1;

                // Fill in the main part of the string
                code += ''; // update label of memory
                for (var i = 0; i < arrLength; i ++) {
                    code += '++++>>'; // update label and move to next label
                }

                // Then put an end-of-array terminator label and move on
                code += '+++++>>';
            }
            if (pointerInfo.type == 's') {
                var initialVarValue = pointerInfo.initialVarValue;
                // Divide by 2 because each char is 2 bytes
                var strLength = (pointerInfo.memEnd - pointerInfo.memStart) / 2 - 1;
                // Trim or pad to the correct length
                initialVarValue = initialVarValue.slice(0, strLength);
                initialVarValue += '\0'.repeat(strLength - initialVarValue.length);

                // Fill in the main part of the string
                code += ''; // update label of memory
                for (var char of initialVarValue) {
                    code += '++++>'; // update label and move to data section
                    code += '+'.repeat(char.charCodeAt()); // increment
                    code += '>'; // move to label of next char
                }

                // Then put an end-of-array terminator label and move on
                code += '+++++>>';
            }
            if (debugMode) code += '\n\n';
        }
        return code;
    }
}