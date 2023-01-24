class JitVirtualMachine extends AbstractVirtualMachine {
    // Faster but less safe in event of memory breaches, etc

    constructor(name, memorySize, getCharFunc=null, putTextFunc=null, autosaveMemory=false, fillExecutionInfo=false) {
        super(name, memorySize, getCharFunc, putTextFunc, autosaveMemory);
        this.fillExecutionInfo = fillExecutionInfo;
    }

    jit(program, createExecutionInfo=false) {
        // JIT-compile a program to a JS function

        // shortened variable names are used to minimise memory footprint when generating
        // x = executionInfo v = virtual machine. m = memory array. i = index.

        var functionBody = 'var x = executionInfo; var l = x.instructionExecuted.bind(x); var v = virtualMachine; var m = v.memory; var i = 0;';
        functionBody += 'var o = () => {var d = String.fromCharCode(m[i]); if (d == " ") d = " "; v.putTextFunc(d);};'; // shortcut to generate and output char

        var onInstructionExecuted = createExecutionInfo ? 'l();' : '';
        for (var char of program) {
            var validChar = true;
            switch (char) {
                case '<':
                    functionBody += 'i--;';
                    break;
                case '>':
                    functionBody += 'i++;';
                    break;
                case '-':
                    functionBody += 'm[i]--;';
                    break;
                case '+':
                    functionBody += 'm[i]++;';
                    break;
                case ',':
                    functionBody += 'm[i] = await v.getCharFunc();';
                    break;
                case '.':
                    functionBody += 'o();';
                    break;
                case '[':
                    functionBody += 'while (m[i] != 0) {';
                    break;
                case ']':
                    functionBody += '}';
                    break;
                case this.debugSymbol:
                    functionBody += 'v.handleDebugSymbol(i);';
                    break;
                case this.clearMemorySymbol:
                    functionBody += 'i = 0; m.fill(0);';
                    break;
                default:
                    validChar = false;
                    break;
            }
            if (validChar) functionBody += onInstructionExecuted;
        }

        async function a() {};
        var AsyncFunction = a.constructor;

        return AsyncFunction('virtualMachine', 'executionInfo', functionBody);
    }

    async run(program) {
        var executionInfo = new VirtualMachineExecutionInfo();
        var func = this.jit(program, this.fillExecutionInfo);
        executionInfo.startRun();
        await func(this, executionInfo);
        executionInfo.finishRun();

        if (this.autosaveMemory) {
            this.saveMemory();
        }

        return executionInfo;
    }
}