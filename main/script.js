var terminal = new Terminal();
var machine = new VirtualMachine('machine', 500,
    // Wait for a valid character before submitting:
    async () => {
        while ((charCode = await terminal.getChar()) == null);
        return charCode;
    }, x => terminal.write(x), true);
terminal.linkVirtualMachine(machine);
//machine.loadMemory();