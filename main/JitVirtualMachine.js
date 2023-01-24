class JitVirtualMachine extends AbstractVirtualMachine {
    // Faster but less safe in event of memory breaches, etc

    constructor(name, memorySize, getCharFunc=null, putTextFunc=null, autosaveMemory=false) {
        super(name, memorySize, getCharFunc, putTextFunc, autosaveMemory);

        async function a() {};
        this.AsyncFunction = a.constructor;
    }

    jit(program) {
        // JIT-compile a program to a JS function

        // shortened variable names are used to minimise memory footprint when generating
        // x = executionInfo v = virtual machine. m = memory array. i = index.

        var functionBody = 'var v = virtualMachine; var m = v.memory; var i = 0;';
        functionBody += 'var o = () => {v.putTextFunc(String.fromCharCode(m[i]));};'; // shortcut to generate and output char

        var deterministicChars = '+-<>'; // chars that can be pre-computed during compilation, which is really great for code that goes in busy loops.

        var l = program.length;
        for (var charIdx = 0; charIdx < l; charIdx ++) {
            var char = program[charIdx];
            if (deterministicChars.includes(char)) {
                var pointer = 0;
                var deltas = {};
                while (deterministicChars.includes(program[charIdx])) {
                    var char = program[charIdx];
                    if (char == '<') pointer --;       
                    if (char == '>') pointer ++;
                    if (char == '-') deltas[pointer] = (deltas[pointer] || 0) - 1;
                    if (char == '+') deltas[pointer] = (deltas[pointer] || 0) + 1;
                    charIdx ++;
                }

                charIdx --;

                for (var relativePointer in deltas) {
                    var firstHalf = relativePointer == 0 ? 'm[i]' : `m[i + ${relativePointer}]`;
                    functionBody += firstHalf + '+=' + deltas[relativePointer] + ';';
                }

                if (pointer != 0) functionBody += `i += ${pointer};`;
            }
            else if (char == '[') {
                if ('+-'.includes(program[charIdx + 1]) && program[charIdx + 2] == ']') {
                    functionBody += 'm[i] = 0;';
                    charIdx += 2;
                }
                else {
                    functionBody += 'while (m[i]) {';
                }
            }

            else if (char == ']') functionBody += '}';
            else if (char == ',') functionBody += 'm[i] = await v.getCharFunc();';
            else if (char == '.') functionBody += 'o();';
            else if (char == this.debugSymbol) functionBody += 'v.handleDebugSymbol(i);';
            else if (char == this.clearMemorySymbol) functionBody += 'i = 0; m.fill(0);';
        }

        return this.AsyncFunction('virtualMachine', functionBody);
    }
    async run(program) {
        var executionInfo = new VirtualMachineExecutionInfo();
        executionInfo.startRun();
        var func = this.jit(program);
        await func(this);
        executionInfo.finishRun();

        if (this.autosaveMemory) {
            this.saveMemory();
        }

        return executionInfo;
    }
}

class JitCommand {
    // abstract class I guess
}

class PointerMoveCommand extends JitCommand {
    constructor(delta) {
        this.delta = delta;
    }
}

class AddCommand extends JitCommand {
    constructor(delta) {
        this.delta = delta;
    }
}

class StartLoopCommand extends JitCommand {

}

class EndLoopCommand extends JitCommand {
    
}

class InputCommand extends JitCommand {
    
}

class OutputCommand extends JitCommand {
    
}