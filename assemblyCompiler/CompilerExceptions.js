class CompilerException extends Error {
    constructor(message, lineNumber=undefined) {
        super(message);
        this.name = 'CompilerException';
        this.lineNumber = lineNumber;
    }

    toString() {
        return `${this.name}: ${this.message} (line ${this.lineNumber})`;
    }
}

class UndefinedVariableException extends CompilerException {
    constructor(variableName, lineNumber) {
        super(`Unknown variable "${variableName}"`, lineNumber);
        this.name = 'UndefinedVariableException';
    }
}

class UnknownCommandException extends CompilerException {
    constructor(commandName, lineNumber) {
        super(`Unknown command "${commandName}"`, lineNumber);
        this.name = "UnknownCommandException";
    }
}