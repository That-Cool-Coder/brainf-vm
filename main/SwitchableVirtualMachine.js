class SwitchableVirtualMachine {
    // Thing that looks like a VM to the terminal, so we can switch between the two easily.
    // Probably doesn't work well with load/save memory

    constructor(name, memorySize, getCharFunc=null, putTextFunc=null, autosaveMemory=false) {
        this.jitVm = new JitVirtualMachine(name, memorySize, getCharFunc, putTextFunc, autosaveMemory);
        this.basicVm = new BasicVirtualMachine(name, memorySize, getCharFunc, putTextFunc, autosaveMemory);

        this.basicVm.memory = this.jitVm.memory;

        this.usingJit = false;
    }

    async run(program) {
        if (this.usingJit) return await this.jitVm.run(program);
        else return await this.basicVm.run(program);
    }
}