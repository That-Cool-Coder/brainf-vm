class VirtualMachine {
    // This is a virtual machine class
    // It's 'machine code' is modified BrainF***

    // It runs slightly differently fron normaly BrainF because
    // the , function waits for a key press and writes it to memory

    constructor(name, memorySize, getCharFunc=null, putTextFunc=null, autosaveMemory=false) {
        this.name = name;
        this.memory = new Uint8Array(memorySize);
        
        this.getCharFunc = getCharFunc || (x => prompt(x));
        this.putTextFunc = putTextFunc || (x => console.log(x));
        this.autosaveMemory = autosaveMemory;

        this.crntProgram = null;
        this.programIndex = 0;
        this.memPointer = 0;
        this.debugSymbol = '*'; // if this symbol is found in the bf, then dump memory to terminal
        this.clearMemorySymbol = '$'; // if this symbol is found in the bf, then clear memory
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

        this.inputBuffer = ''; // thing to hold input

        while (this.programIndex < this.crntProgram.length) {
            switch(this.crntProgram[this.programIndex]) {
                case '<':
                    this.memPointer --;
                    if (this.memoryPointer < 0) this.memPointer += this.memory.length;
                    break;
                case '>':
                    this.memPointer ++;
                    if (this.memoryPointer >= this.memory.length) this.memPointer = 0;
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
                    this.putTextFunc(
                        `Mem pointer: ${this.memPointer} Memory: ${this.memory.toString()}\n`);
                    break;
                case this.clearMemorySymbol:
                    this.memory.fill(0);
                    this.memPointer = 0;
                    break;
                
            }
            this.programIndex ++;
        }
        if (this.autosaveMemory) {
            this.saveMemory();
        }
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