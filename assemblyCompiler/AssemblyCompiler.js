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
class AssemblyCompiler {
    // Increment the first memory tag and move to the next cell to prepare for mem init
    static precompiledHeader = '+>>\n';

    // this is inserted into the bf to act as a placeholder for where a memory address should be
    // eg m15m, the 15th mem pointer
    static memoryPlaceholderPrefix = 'm';
    static memoryPlaceholderPostfix = 'm';

    // dictionary of memory index : is used. If memory index is not in here then it's unused
    static usedTempMemory = {};

    // Stack so that the front and back of control structures can share information between each other, like temp variables or whatever
    // Can be any data type.
    // Push something on when you enter a structure and pop it when you exit
    // (top is more nested)
    static controlStructureDataStack = [];

    static crntLineNumber = 0;

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
        mpt : (memIdx, debugMode) => {
            // move pointer to
            var code = '';
            code += this.internCompileFuncs.pts(debugMode);

            // If the mem index is not a number, then put a placeholder
            if (isNaN(memIdx)) {
                if (this.memPointers[memIdx] == undefined) throw new UndefinedVariableException(memIdx, this.crntLineNumber);
                code += this.memoryPlaceholderPrefix + this.memPointers[memIdx].memStart + this.memoryPlaceholderPostfix;
            }
            // Else just move to that index
            else code += '>'.repeat(memIdx);
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

        inc : (memAddr, debugMode) => {
            // increment item at memAddr
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr, debugMode);
            code += '>+<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        dec : (memAddr, debugMode) => {
            // decrement item at memAddr
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr, debugMode);
            code += '>-<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        add : (fromAddr, toAddr, debugMode) => {
            // Add fromAddr to toAddr (changing toAddr)
            // How this works: first move value to tempAddr
            // AND toAddr simulanously (deleting value in fromAddr).
            // Then move value from tempAddr to toAddr, restoring

            var tempAddr = this.allocTempMemory();
            var code = '';

            // First make destination empty
            code += this.internCompileFuncs.zer(tempAddr, debugMode);

            // Then, while value of fromAddr is > 0, increment toAddr/internalCounter and decrement fromAddr
            code += `${this.mpt(fromAddr)}>[-<${this.mpt(toAddr)}>+<${this.mpt(tempAddr)}>+<${this.mpt(fromAddr)}>]<`;

            // Then move value from temp storage to fromAddr, restoring it
            code += this.internCompileFuncs.mv(tempAddr, fromAddr, debugMode);

            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            this.freeTempMemory(tempAddr);
            return code;
        },
        sub : (fromAddr, toAddr, debugMode) => {
            // Subtract fromAddr from toAddr (changing toAddr)
            // How this works: first move value to an tempAddr
            // AND toAddr simulanously (deleting value in fromAddr).
            // Then move value from tempAddr to toAddr, restoring



            var tempAddr = this.allocTempMemory();
            var code = '';

            // First make destination empty
            code += this.internCompileFuncs.zer(tempAddr, debugMode);

            // Then, while value of fromAddr is > 0, increment internalCounter
            // and decrement fromAddr/toAddr
            code += `${this.mpt(fromAddr)}>[-<${this.mpt(toAddr)}>-<${this.mpt(tempAddr)}>+<${this.mpt(fromAddr)}>]<`;

            // Then move value from temp storage to fromAddr, restoring it
            code += this.internCompileFuncs.mv(tempAddr, fromAddr, debugMode);

            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            this.freeTempMemory(tempAddr);
            return code;
        },
        mult : (fromAddr, toAddr, debugMode) => {
            // Multiply the value of toAddr by fromAddr, modifying toAddr
            // How this works: Use tempAddr1 to keep track of how many times to add fromAddr.



            var tempAddr1 = this.allocTempMemory();
            var code = '';
            
            // Setup a counter for times to add
            code += this.internCompileFuncs.zer(toAddr, debugMode);

            // Clear the target address
            code += this.internCompileFuncs.cpy(fromAddr, toAddr, debugMode);

            // Move to tempAddr1 to init loop
            code += `${this.mpt(tempAddr1)}>[<`;

            code += this.internCompileFuncs.add(fromAddr, toAddr, debugMode);

            // Decrement loop counter and end loop
            code += `${this.mpt(tempAddr1)}>-]<`;
            
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            this.freeTempMemory(tempAddr1);
            return code;
        },
        div : (dividend, divisor, debugMode) => {
            // Divide dividend by divisor, writing the result into dividend

            var tempAddr1 = this.allocTempMemory();
            var tempAddr2 = this.allocTempMemory();
            var tempAddr3 = this.allocTempMemory();
            var code = '';

            // Init all temp values
            code += this.internCompileFuncs.zer(tempAddr1, debugMode);
            code += this.internCompileFuncs.zer(tempAddr2, debugMode);
            code += this.internCompileFuncs.zer(tempAddr3, debugMode);

            // x[temp0+x-]
            code += this.internCompileFuncs.mv(dividend, tempAddr1, debugMode);
            // temp0[
            code += `${this.mpt(tempAddr1)}>[<`;
            //     y[temp1+temp2+y-]
            //     temp2[y+temp2-]
            code += this.internCompileFuncs.cpy(divisor,
                tempAddr2, tempAddr3, debugMode);
            //     temp1[
            code += `${this.mpt(tempAddr2)}>[<`;
            //         temp2+
            code += this.internCompileFuncs.inc(tempAddr3, debugMode);
            //         temp0-[temp2[-]temp3+temp0-]
            //         temp3[temp0+temp3-]
            //         temp2[
            //             temp1-
            //             [x-temp1[-]]+
            //         temp2-]
            //     temp1-]
            //     x+
            // temp0]
            
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            this.freeTempMemory(tempAddr1);
            this.freeTempMemory(tempAddr2);
            this.freeTempMemory(tempAddr3);
            return code;
        },

        // Booleans and comparisons
        // ------------------------
        neq : (memAddr1, memAddr2, outputAddr, debugMode) => {
            // Write zero to outputAddr if memAddr1 and memAddr2 are equal, else a nonzero value

            var code = '';
            code += this.internCompileFuncs.cpy(memAddr1, outputAddr, debugMode);
            code += this.internCompileFuncs.sub(memAddr2, outputAddr);
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        bool : (memAddr, debugMode) => {
            //  Converts value of memAddr to boolean - if it's zero leaves it at zero, otherwise sets it to one

            var tempAddr = this.allocTempMemory();
            var code = '';
            code += this.internCompileFuncs.cpy(memAddr, tempAddr, debugMode);
            code += `${this.mpt(tempAddr)}>[<${this.mpt(memAddr)}>-[-]+<${this.mpt(tempAddr)}>[-]]<`;
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            this.freeTempMemory(tempAddr);
            return code;
        },
        not : (memAddr, debugMode) => {
            // inverts value of memAddr. only works if memAddr has value of 0 or 1
            var code = '';
            code += this.mpt(memAddr) + '>-<' + this.internCompileFuncs.bool(memAddr, debugMode);
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        or : (memAddr1, memAddr2, debugMode) => {
            // Or operator, writes result into memAddr2
            // (assumes both values are already booleans)

            var code = '';
            code += this.internCompileFuncs.add(memAddr1, memAddr2, debugMode);
            code += this.internCompileFuncs.bool(memAddr2, debugMode);
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        and : (memAddr1, memAddr2, debugMode) => {
            // And operator, writes result into memAddr2
            // (assumes both values are already booleans)

            var tempAddr = this.allocTempMemory();

            var code = '';
            code += this.internCompileFuncs.cpy(memAddr1, tempAddr, debugMode);
            code += this.internCompileFuncs.add(memAddr2, tempAddr, debugMode);
            code += this.internCompileFuncs.zer(memAddr2, debugMode);
            code += this.mpt(tempAddr) + '>[-[<';
            code += this.mpt(memAddr2) + '>[-]+<';
            code += this.mpt(tempAddr) + '>[-]]]<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);

            this.freeTempMemory(tempAddr);

            return code;
        },

        // Memory manipulation
        // -------------------

        zer : (memAddr, debugMode) => {
            // Set item at memAddr to 0
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr, debugMode);
            code += '>[-]<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        zera : (memAddr, debugMode) => {
            // Zero (clear) a string or array starting at memAddr
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr, debugMode);
            code += '-----[+++++>[-]>-----]+++++';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        mv : (fromAddr, toAddr, debugMode) => {
            // Move the value from fromAddr to toAddr and leave fromAddr at zero

            var code = '';

            // First make destination empty
            code += this.internCompileFuncs.zer(toAddr, debugMode);

            // Then, while value of fromAddr is > 0, increment toAddr and decrement fromAddr
            code += `${this.mpt(fromAddr)}>[-<${this.mpt(toAddr)}>+<${this.mpt(fromAddr)}>]<`;

            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        cpy : (fromAddr, toAddr, debugMode) => {
            // Copy the value from fromAddr to toAddr
            // How this works: first move value to tempAddr
            // AND toAddr simulanously (deleting value in fromAddr).
            // Then move value from tempAddr to toAddr, restoring

            var tempAddr = this.allocTempMemory();
            var code = '';

            // First make destinations empty
            code += this.internCompileFuncs.zer(toAddr, debugMode);
            code += this.internCompileFuncs.zer(tempAddr, debugMode);

            // Then, while value of fromAddr is > 0, increment toAddr/internalCounter and decrement fromAddr
            code += `${this.mpt(fromAddr)}>[-<${this.mpt(toAddr)}>+<${this.mpt(tempAddr)}>+<${this.mpt(fromAddr)}>]<`;

            // Then move value from temp storage to fromAddr, restoring it
            code += this.internCompileFuncs.mv(tempAddr, fromAddr, debugMode);

            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            this.freeTempMemory(tempAddr);
            return code;
        },
        set : (memAddr, value, debugMode) => {
            // Set the item at memAddr to value
            var code = '';
            code += this.internCompileFuncs.zer(memAddr, debugMode);
            code += '>' + '+'.repeat(value) + '<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        gt : (memAddr1, memAddr2, outputAddr, debugMode) => {
            // Write into outputAddr whether memAddr1 is greater than memAddr2

            var tempAddr1 = this.allocTempMemory();
            var tempAddr2 = this.allocTempMemory();
            var tempAddr3 = this.allocTempMemory();
            var tempAddr4 = this.allocTempMemory();

            var code = '';
            code += this.internCompileFuncs.cpy(memAddr1, tempAddr3, debugMode);
            code += this.internCompileFuncs.cpy(memAddr2, tempAddr4, debugMode);
            code += this.mpt(tempAddr1) + '>[-]+[<';
            code += this.internCompileFuncs.cpy(tempAddr3, tempAddr1, debugMode);
            code += this.internCompileFuncs.bool(tempAddr1, debugMode);
            code += this.internCompileFuncs.not(tempAddr1, debugMode);
            code += this.internCompileFuncs.cpy(tempAddr4, tempAddr2, debugMode);
            code += this.internCompileFuncs.bool(tempAddr2, debugMode);
            code += this.internCompileFuncs.not(tempAddr2, debugMode);
            code += this.internCompileFuncs.or(tempAddr1, tempAddr2, debugMode);
            code += `${this.mpt(tempAddr2)}>[[-]<${this.mpt(tempAddr1)}>[-]<${this.mpt(tempAddr2)}>]<`;
            code += this.internCompileFuncs.dec(tempAddr3, debugMode);
            code += this.internCompileFuncs.dec(tempAddr4, debugMode);
            code += this.internCompileFuncs.zer(tempAddr1, debugMode);
            code += this.mpt(tempAddr1) + '>]<';

            // code += this.internCompileFuncs.inc(tempAddr3, debugMode);
            code += this.internCompileFuncs.zer(outputAddr, debugMode);
            code += this.mpt(tempAddr3) + '>[<';
            code += this.internCompileFuncs.inc(outputAddr, debugMode);
            code += this.internCompileFuncs.zer(tempAddr3, debugMode);
            code += this.mpt(tempAddr3) + '>]<';

            code += this.internCompileFuncs.addDebugSpacing(debugMode);

            this.freeTempMemory(tempAddr1);
            this.freeTempMemory(tempAddr2);
            this.freeTempMemory(tempAddr3);
            this.freeTempMemory(tempAddr4);

            return code;
        },

        // Input/output stuff:
        // -------------------

        out : (memAddr, debugMode) => {
            // output a single char at memAddr
            // planned: add an offset
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr, debugMode);
            code += '>.<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        outa : (memAddr, debugMode) => {
            // output a whole string or array starting from memAddr
            // (continue until the label of the next memory item is 5)
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr, debugMode);
            code += '-----[+++++>.>-----]+++++';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        outr : (value, debugMode) => {
            // Output a raw value as an ascii code
            var tempAddr = this.allocTempMemory();
            var code = this.internCompileFuncs.zer(tempAddr, {}, debugMode);
            code += `>${'+'.repeat(value)}.<`;
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            this.freeTempMemory(tempAddr);
            return code;
        },
        lbr : (debugMode) => {
            // Line break. Output a newline and a carriage return
            var code = '';
            code += this.internCompileFuncs.outr(13, false);
            code += this.internCompileFuncs.outr(10, false);
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        ich : (memAddr, debugMode) => {
            // Get a character input and write it to memAddr
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr, debugMode);
            code += '>,<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        iln : (memAddr, debugMode) => {
            // Get a line and write it to string or arr starting at memAddr
            // (bad things will happen when the line is longer than the string)

            // Alg: write chars into the string until char is newline
            // after finishing, set the char that is newline to 0

            var code = '';

            // First clear the target string
            code += this.internCompileFuncs.zera(memAddr, debugMode);

            code += this.internCompileFuncs.mpt(memAddr, debugMode);
            code += '>,----------[++++++++++>>,----------]++++++++++[-]<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },

        // Control structures
        // ------------------

        luz : (memAddr, debugMode) => {
            // Start of a loop - loop until value at memAddr is zero
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr);
            code += '>[<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        eluz : (memAddr, debugMode) => {
            // End a loop-until-zero
            var code = '';
            code += this.internCompileFuncs.mpt(memAddr);
            code += '>]<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        ifz : (memAddr, debugMode) => {
            // If memAddr is 0, run the code between here and eifz
            // Alg based off https://esolangs.org/wiki/Brainfuck_algorithms#if_.28x.29_.7B_code1_.7D_else_.7B_code2_.7D

            var tempAddr1 = this.allocTempMemory();
            var tempAddr2 = this.allocTempMemory();

            this.controlStructureDataStack.push(tempAddr1);

            var code = '';
            code += this.internCompileFuncs.zer(tempAddr1, debugMode);
            code += '>+<';
            code += this.internCompileFuncs.zer(tempAddr2, debugMode);
            code += `${this.mpt(memAddr)}>[<${this.mpt(tempAddr1)}>-<${this.mpt(memAddr)}>[<${this.mpt(tempAddr2)}>+<${this.mpt(memAddr)}>-]]<`;
            code += `${this.mpt(tempAddr2)}>[<${this.mpt(memAddr)}>+<${this.mpt(tempAddr2)}>-]<`;
            code += `${this.mpt(tempAddr1)}>[<`;

            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            // (don't free temp1 here - that's done out of the loop)
            this.freeTempMemory(tempAddr2);

            return code;
        },
        eifz : (debugMode) => {
            // End of ifz

            var tempAddr1 = this.controlStructureDataStack.pop();

            var code = '';
            code += this.internCompileFuncs.mpt(tempAddr1);
            code += '>-]<';
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            this.freeTempMemory(tempAddr1);
            
            return code;
        },
        ifp : (memAddr, debugMode) => {
            // If memAddr is positive (if not zero)

            var tempAddr = this.allocTempMemory();
            this.controlStructureDataStack.push(tempAddr);

            var code = '';
            code += this.internCompileFuncs.cpy(memAddr, tempAddr, debugMode);
            code += `${this.mpt(tempAddr)}>[<`

            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            // (don't free temp here - it's freed in eifp)

            return code;
        },
        eifp : (debugMode) => {
            // End if ifp

            var tempAddr = this.controlStructureDataStack.pop();
            
            var code = '';
            code += `${this.mpt(tempAddr)}>[-]]<`
            
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            this.freeTempMemory(tempAddr);

            return code;
        },
        ieq : (memAddr1, memAddr2, debugMode) => {
            // Run code if memAddr1 and memAddr2 are equal

            var tempAddr = this.allocTempMemory();

            var code = '';
            code += this.internCompileFuncs.neq(memAddr1, memAddr2, tempAddr);
            code += this.internCompileFuncs.ifz(tempAddr, debugMode);
            code += this.internCompileFuncs.addDebugSpacing(code);
            this.freeTempMemory(tempAddr);

            return code;
        },
        eieq : (debugMode) => {
            // End of ieq
            var code = '';
            code += this.internCompileFuncs.eifz(debugMode);
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        },
        inq : (memAddr1, memAddr2, debugMode) => {
            // Run code if memAddr1 and memAddr2 are not equal

            var tempAddr = this.allocTempMemory();

            var code = '';
            code += this.internCompileFuncs.neq(memAddr1, memAddr2, tempAddr, debugMode);
            code += this.internCompileFuncs.ifp(tempAddr, debugMode);
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            this.freeTempMemory(tempAddr);
            
            return code;
        },
        einq : (debugMode) => {
            // End of inq
            var code = '';
            code += this.internCompileFuncs.eifp(debugMode);
            code += this.internCompileFuncs.addDebugSpacing(debugMode);
            return code;
        }

    }

    // A list of public compiler functions which all accept the same three arguments:
    // <array of tokens of command>, <dict of memory pointers>, <bool of debugMode>
    // These compiler functions are the ones usable by dict lookup
    static publicCompileFuncs = {
        mpt : (tokens, debugMode) => {
            // Move pointer to token1
            // Mainly used for preparing inline brainF
            return this.internCompileFuncs.mpt(tokens[1], debugMode);
        },
        bf : (tokens, debugMode) => {
            // Inline brainF code
            var brainF = tokens.slice(1).join(' ');
            return this.internCompileFuncs.bf(brainF, debugMode);
        },

        // Maths
        // -----

        inc : (tokens, debugMode) => {
            // Increment token1
            return this.internCompileFuncs.inc(tokens[1], debugMode);
        },
        dec : (tokens, debugMode) => {
            // Decrement token1
            return this.internCompileFuncs.dec(tokens[1], debugMode);
        },
        add : (tokens, debugMode) => {
            // Add the value of token1 to token2, changing token2
            return this.internCompileFuncs.add(tokens[1], tokens[2], debugMode);
        },
        sub : (tokens, debugMode) => {
            // Subtract the value of token1 to token2, changing token2
            return this.internCompileFuncs.sub(tokens[1], tokens[2], debugMode);
        },
        mult : (tokens, debugMode) => {
            // Multiply token1 by token2, changing token2
            return this.internCompileFuncs.mult(tokens[1], tokens[2], debugMode);
        },

        // Booleans and comparisons
        // ------------------------
        neq : (tokens, debugMode) => {
            // Write a zero into token3 if token1 and token2 are equal, else writes a nonzero value
            return this.internCompileFuncs.neq(tokens[1], tokens[2], tokens[3], debugMode);
        },
        bool : (tokens, debugMode) => {
            // Convert token1 to boolean - if it's zero leave it, else set it to 1
            return this.internCompileFuncs.bool(tokens[1], debugMode);
        },
        not : (tokens, debugMode) => {
            // inverts value of token1. Assumes token1 is either 0 or 1
            return this.internCompileFuncs.not(tokens[1], debugMode);
        },
        or : (tokens, debugMode) => {
            // or operator on token1 and token2, writes result into token2.
            // assumes both values are already booleans
            return this.internCompileFuncs.or(tokens[1], tokens[2], debugMode);
        },
        and : (tokens, debugMode) => {
            // and operator on token1 and token2, writes result into token2.
            // assumes both values are already booleans
            return this.internCompileFuncs.and(tokens[1], tokens[2], debugMode);
        },
        gt : (tokens, debugMode) => {
            // Write into token3 whether token1 is greater than token2
            return this.internCompileFuncs.gt(tokens[1], tokens[2], tokens[3], debugMode);
        },
        
        // Memory management
        // -----------------

        zer : (tokens, debugMode) => {
            // Set token1 to 0
            return this.internCompileFuncs.zer(tokens[1], debugMode);
        },
        zera : (tokens, debugMode) => {
            // Zero (clear) string or array at token1
            return this.internCompileFuncs.zera(tokens[1], debugMode);
        },
        mv : (tokens, debugMode) => {
            // Move value from token1 to token2
            // (empties token1)
            return this.internCompileFuncs.mv(tokens[1], tokens[2], debugMode);
        },
        cpy : (tokens, debugMode) => {
            // Copy value from token1 to token2
            return this.internCompileFuncs.cpy(tokens[1], tokens[2], debugMode);
        },
        set : (tokens, debugMode) => {
            // Set token1 to token2 (read token2 as number)
            return this.internCompileFuncs.set(tokens[1], Number(tokens[2]), debugMode);
        },
        seta : (tokens, debugMode) => {
            // Set item in array
            // token1[token2] to token3
            var memAddr = tokens[1];
            memAddr += Number(tokens[2]) * 2;
            return this.internCompileFuncs.set(memAddr, Number(tokens[3]), debugMode);
        },
        aac : (tokens, debugMode) => {
            // Array access
            // copy token1[token2] into token3
            var memAddr = tokens[1];
            memAddr += Number(tokens[2]) * 2;
            return this.internCompileFuncs.cpy(memAddr, tokens[3], debugMode);
        },

        // Input/output stuff:
        // -------------------

        out : (tokens, debugMode) => {
            // Output single value at token1
            return this.internCompileFuncs.out(tokens[1], debugMode);
        },
        outa : (tokens, debugMode) => {
            // Output string or array starting from token1
            return this.internCompileFuncs.outa(tokens[1], debugMode);
        },
        outr : (tokens, debugMode) => {
            // Interpret token1 as an ascii char and output it
            return this.internCompileFuncs.outr(Number(tokens[1]), debugMode);
        },
        lbr : (tokens, debugMode) => {
            // Line break. Output a newline and a carriage return
            return this.internCompileFuncs.lbr(debugMode);
        },
        cls : (tokens, debugMode) => {
            // Clear the screen
            return this.internCompileFuncs.outr(4, debugMode);
        },
        ich : (tokens, debugMode) => {
            // Get a character in and write it to token1
            return this.internCompileFuncs.ich(tokens[1], debugMode);
        },
        icha : (tokens, debugMode) => {
            // Get a character in and write it to the string or arr at token1
            // and with the offset from start of token2 (default offset = 0)
            var memAddr = tokens[1];
            if (tokens[2]) memAddr += Number(tokens[2]) * 2;
            return this.internCompileFuncs.ich(memAddr, debugMode);
        },
        iln : (tokens, debugMode) => {
            // Get a line and write it to string or arr starting at token1
            // (bad things will happen when the line is longer than the string)
            return this.internCompileFuncs.iln(tokens[1], debugMode);
        },

        // Control structures
        // ------------------

        luz : (tokens, debugMode) => {
            // Start of a loop - loop until value at token1 is zero
            var memAddr = tokens[1];
            return this.internCompileFuncs.luz(memAddr, debugMode);
        },
        eluz : (tokens, debugMode) => {
            // End of a loop-until-zero. Token1 says what value to look at for checking end
            var memAddr = tokens[1];
            return this.internCompileFuncs.eluz(memAddr, debugMode);
        },
        ifz : (tokens, debugMode) => {
            // If token1 is 0, run the following code
            return this.internCompileFuncs.ifz(tokens[1], debugMode);
        },
        eifz : (tokens, debugMode) => {
            // End of ifz
            return this.internCompileFuncs.eifz(debugMode);
        },
        ifp : (tokens, debugMode) => {
            // If token 1 is not zero, run the following code
            return this.internCompileFuncs.ifp(tokens[1], debugMode);
        },
        eifp : (tokens, debugMode) => {
            // End of ifp
            return this.internCompileFuncs.eifp(debugMode);
        },
        ieq : (tokens, debugMode) => {
            // Run the following code if token1 == token2
            return this.internCompileFuncs.ieq(tokens[1], tokens[2], debugMode);
        },
        eieq : (tokens, debugMode) => {
            // End of ieq
            return this.internCompileFuncs.eieq(debugMode);
        },
        inq : (tokens, debugMode) => {
            // Run the following code if token1 and token2 are not equal
            return this.internCompileFuncs.inq(tokens[1], tokens[2], debugMode);
        },
        einq : (tokens, debugMode) => {
            // End of inq
            return this.internCompileFuncs.einq(debugMode);
        }
    }

    // This is used so often that a shortcut is needed
    static mpt = this.internCompileFuncs.mpt;

    static compile(assemblyCode, debugMode=false) {
        this.usedTempMemory = {};

        // Split text and data section
        var assemblyLines = assemblyCode.split('\n');
        var [dataSection, textSection] = this.splitSections(assemblyLines);

        this.memPointers = this.readDataSection(dataSection);

        // Compile text section first so we know how much temp memory is needed
        this.crntLineNumber = dataSection.length + 2; // (add 2 to account for the 2 section headers)
        var textSectionBrainF = '';
        for (var line of textSection) {
            line = line.trim();
            this.crntLineNumber += 1;
            if (line.length == 0) continue;
            if (line[0] == ';') continue;

            var tokens = line.split(' ');
            if (tokens[0] in this.publicCompileFuncs) {
                var compilerFunction = this.publicCompileFuncs[tokens[0]];
                textSectionBrainF += compilerFunction(tokens, debugMode);
                if (debugMode) brainFCode += '\n';
            }
            else throw new UnknownCommandException(tokens[0], this.crntLineNumber);
        };
        
        // Compile memory-init code
        var memoryInitBrainF = this.initMemory(debugMode);

        textSectionBrainF = this.fillMemoryPlaceholders(textSectionBrainF);

        // Combine compiled code
        var brainFCode = this.precompiledHeader + memoryInitBrainF + textSectionBrainF;
        brainFCode = this.optimize(brainFCode);

        return brainFCode;
    }

    static allocTempMemory() {
        if (spnr.obj.keys(this.usedTempMemory).length == 0) {
            // 2 is the first valid address
            this.usedTempMemory[2] = true;
            return 2;
        }

        var freedMemory = spnr.obj.keys(this.usedTempMemory)
            .filter(key => this.usedTempMemory[key] == false);
        // First try and use memory that's already been freed
        if (freedMemory.length > 0) {
            this.usedTempMemory[freedMemory[0]] = true;
            return freedMemory[0];
        }
        // Otherwise add more temp memory
        else {
            var address = this.highestUsedTempMemory() + 2;
            this.usedTempMemory[address] = true;
            return address;
        }
    }
    
    static freeTempMemory(address) {
        this.usedTempMemory[address] = false;
    }

    static highestUsedTempMemory() {
        // Highest temp memory that is used at any point
        if (spnr.obj.keys(this.usedTempMemory).length == 0) return 0;
        else return Number(spnr.obj.keys(this.usedTempMemory).map(Number).sort((a, b) => a - b).reverse()[0]);
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
        // Addresses are relative to start of data section memory, not absolute
        var memPointers = {};

        var nextFreeMemIdx = 0;

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

    static initMemory(debugMode) {
        /* Compile BrainF that will initiate the memory variables
        To minimise code size, this doesn't reset the pointer to the start after
        each initialisation, instead just moving the pointer to the next
        free memory address (eg the one after the last var made)
        */

        var code = '';

        // If there are no memory items, just quit
        if (spnr.obj.keys(this.memPointers).length == 0) return '';

        // Go to start of usable memory
        var firstPointerName = spnr.obj.keys(this.memPointers)[0];
        code += this.internCompileFuncs.mpt(this.memPointers[firstPointerName].memStart + this.highestUsedTempMemory() + 2, this.memPointers);

        for (var name in this.memPointers) {
            var pointerInfo = this.memPointers[name];
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

    static fillMemoryPlaceholders(brainFCode) {
        var highestUsedTempMemory = this.highestUsedTempMemory();
        for (var pointerInfo of spnr.obj.values(this.memPointers)) {
            brainFCode = spnr.str.replaceAll(brainFCode,
                this.memoryPlaceholderPrefix + (pointerInfo.memStart) + this.memoryPlaceholderPostfix,
                '>'.repeat(pointerInfo.memStart + highestUsedTempMemory + 2));
        }
        return brainFCode;
    }
}