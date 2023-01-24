class BasicVirtualMachine extends AbstractVirtualMachine {
    // Slow but friendly virtual machine that is useful for prototyping

    constructor(name, memorySize, getCharFunc=null, putTextFunc=null, autosaveMemory=false) {
        super(name, memorySize, getCharFunc, putTextFunc, autosaveMemory);

        this.crntProgram = null;
        this.programIndex = 0;
        this.hasCrashed = false;
        this.memPointer = 0;
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
                    this.handleDebugSymbol(this.memPointer);
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
        this.handleAutoSave();

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