class VirtualMachine {
    // This is a virtual machine class
    // It's 'machine code' is modified BrainF***

    // It runs slightly differently fron normaly BrainF because
    // the , function waits for a key press and writes it to memory

    // We also have the $ symbol to clear memory and * to dump it, but these don't do anything except help debugging

    constructor(name, memorySize, getCharFunc=null, putTextFunc=null, autosaveMemory=false) {
        this.name = name;
        this.memory = new Uint8Array(memorySize);
        
        this.getCharFunc = getCharFunc || (x => prompt(x));
        this.putTextFunc = putTextFunc || (x => console.log(x));
        this.autosaveMemory = autosaveMemory;

        this.crntProgram = null;
        this.programIndex = 0;
        this.hasCrashed = false;
        this.memPointer = 0;
        
        this.debugSymbol = '*'; // if this symbol is found in the bf, then dump memory to terminal
        this.clearMemorySymbol = '$'; // if this symbol is found in the bf, then clear memory
        this.crashMessage = 'Virtual machine crashed during execution. Check that it has enough memory.';
    }

    saveMemory() {
        // JSON doesn't like Uint8Arrays, so we convert it to regular array
        var localStorageKey = `${this.name}_vm_memory`;
        var memAsArray = [].slice.call(this.memory);
        localStorage.setItem(localStorageKey, JSON.stringify(memAsArray));
    }

    loadMemory() {
        var localStorageKey = `${this.name}_vm_memory`;
        if (localStorage.getItem(localStorageKey)) {
            // The memory is saved as a regular array (not Uint8Array),
            // so we need to convert it
            var memAsArray = JSON.parse(localStorage.getItem(localStorageKey));
            this.memory = new Uint8Array(memAsArray);
        }
    }

    async run(program) {
        this.crntProgram = program;
        this.programIndex = 0;
        this.hasCrashed = false;

        this.inputBuffer = ''; // thing to hold input

        var executionInfo = new VirtualMachineExecutionInfo();
        executionInfo.startRun();

        while (this.programIndex < this.crntProgram.length && ! this.hasCrashed) {
            switch(this.crntProgram[this.programIndex]) {
                case '<':
                    this.memPointer --;
                    if (this.memPointer < 0) this.hasCrashed = true;
                    break;
                case '>':
                    this.memPointer ++;
                    if (this.memPointer >= this.memory.length) this.hasCrashed = true;
                    break;
                case '-':
                    this.memory[this.memPointer] --;
                    break;
                case '+':
                    this.memory[this.memPointer] ++;
                    break;
                case ',':
                    var keyCode = await this.getCharFunc();
                    this.memory[this.memPointer] = keyCode;
                    break;
                case '.':
                    var char = String.fromCharCode(this.memory[this.memPointer]);
                    if (char == ' ') char = ' '; // javascript type errors
                    this.putTextFunc(char);
                    break;
                case '[':
                    this.handleSquareBracket();
                    break;
                case ']':
                    this.handleSquareBracket();
                    break;
                case this.debugSymbol:
                    var memory = new Array(...this.memory);
                    while(memory[memory.length-1] === 0) memory.pop(); // remove trailing zeroes
                    var memoryText = memory.length > 0 ? memory.toString() : '(all zeroes)';
                    this.putTextFunc(
                        `Mem pointer: ${this.memPointer} Memory: ${memoryText}\r\n`);
                    break;
                case this.clearMemorySymbol:
                    this.memory.fill(0);
                    this.memPointer = 0;
                    break;
                
            }
            this.programIndex ++;
            executionInfo.instructionExecuted();
        }
        executionInfo.finishRun();

        if (this.hasCrashed) {
            this.putTextFunc(this.crashMessage);
        }
        if (this.autosaveMemory) {
            this.saveMemory();
        }

        return executionInfo;
    }

    handleSquareBracket() {
        if (this.crntProgram[this.programIndex] == '[') {
            // Only jump to the matching bracket if value is zero
            if (this.memory[this.memPointer] != 0) return;

            // Go forwards, keeping track of the nesting level
            var nestingLevel = 0;
            this.programIndex ++;
            while (this.programIndex < this.crntProgram.length) {
                // If we are at a closing bracket,
                // and the nesting level is the same as before, then exit
                if (this.crntProgram[this.programIndex] == ']' &&
                    nestingLevel == 0) {
                    return;
                }
                // Otherwise just keep track of nesting
                else if (this.crntProgram[this.programIndex] == '[') {
                    nestingLevel ++;
                }
                else if (this.crntProgram[this.programIndex] == ']') {
                    nestingLevel --;
                }
                this.programIndex ++;
            }
        }
        else if (this.crntProgram[this.programIndex] == ']') {
            // Only jump to the matching bracket if value is not zero
            if (this.memory[this.memPointer] == 0) return;

            // Go forwards, keeping track of the nesting level
            var nestingLevel = 0;
            this.programIndex --;
            while (this.programIndex >= 0) {
                // If we are at a closing bracket,
                // and the nesting level is the same as before, then exit
                if (this.crntProgram[this.programIndex] == '[' &&
                    nestingLevel == 0) {
                    return;
                }
                // Otherwise just keep track of nesting
                else if (this.crntProgram[this.programIndex] == ']') {
                    nestingLevel ++;
                }
                else if (this.crntProgram[this.programIndex] == '[') {
                    nestingLevel --;
                }
                this.programIndex --;
            }
            // Then we need to add because this takes one too many
            this.programIndex ++;
        }
    }
}

class VirtualMachineExecutionInfo {
    // Thing providing stats on execution of the VM

    constructor() {
        this.numInstructionsExecuted = 0;
    }

    startRun() {
        this.startedTime = new Date();
    }

    finishRun() {
        this.finishedTime = new Date();
        this.executionDuration = this.finishedTime - this.startedTime;
        this.instructionsPerSecond = this.numInstructionsExecuted / this.executionDuration * 1000;
    }

    instructionExecuted() {
        this.numInstructionsExecuted ++;
    }
}