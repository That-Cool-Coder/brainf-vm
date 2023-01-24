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
        function onMultipleInstructionsExecuted(num) {
            return onInstructionExecuted.repeat(num - 1);
        }

        for (var charIdx = 0; charIdx < program.length; charIdx ++) {
            var validChar = true;
            var char = program[charIdx];
            switch (char) {
                case '<':
                    var count = 1;
                    while (program[charIdx + 1] == '<') {
                        count ++;
                        charIdx ++;
                    }
                    functionBody += `i -= ${count};` + onMultipleInstructionsExecuted(count);
                    break;
                case '>':
                    var count = 1;
                    while (program[charIdx + 1] == '>') {
                        count ++;
                        charIdx ++;
                    }
                    functionBody += `i += ${count};` + onMultipleInstructionsExecuted(count);
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
                    if ('+-'.includes(program[charIdx + 1]) && program[charIdx + 2] == ']') {
                        functionBody += 'm[i] = 0;' + onMultipleInstructionsExecuted(2);
                        charIdx += 2;
                        break;
                    }
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
        executionInfo.startRun();
        var func = this.jit(program, this.fillExecutionInfo);
        await func(this, executionInfo);
        executionInfo.finishRun();

        if (this.autosaveMemory) {
            this.saveMemory();
        }

        return executionInfo;
    }
}