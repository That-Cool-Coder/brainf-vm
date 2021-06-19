var terminal = new Terminal();
var machine = new VirtualMachine('machine', 500,
    () => terminal.getChar(), x => terminal.write(x), true);
terminal.linkVirtualMachine(machine);
//machine.loadMemory();