class AbstractVirtualMachine {
    // This is a virtual machine abstract base class.
    // It's abstract so that differing implementations offering varying balances of performance/usability can be created

    // The following specifications must be incorporated into

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

    handleAutoSave() {
        if (this.autosaveMemory) {
            this.saveMemory();
        }
    }

    async run(program) {
        // should accept program as a string and return a VirtualMachineExecutionInfo

        throw new Error('AbstractVirtualMachine.run() was not overridden')
    }

    handleDebugSymbol(memoryPointer) {
        var memory = new Array(...this.memory);
        while(memory[memory.length-1] === 0) memory.pop(); // remove trailing zeroes
        var memoryText = memory.length > 0 ? memory.toString() : '(all zeroes)';
        this.putTextFunc(
            `Mem pointer: ${memoryPointer} Memory: ${memoryText}\r\n`);
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