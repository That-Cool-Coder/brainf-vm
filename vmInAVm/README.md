# VM in a VM

So I decided that the base brainf language was too limited to do things like jumping to arbitrary program positions (through compile tricks), so I decided to create a VM in a vm.

There will be a compiler that parses some level of code, then transforms it into a simpler machine code which is then bundled with an interpreter (aka the inner VM). The machine code langauge is then executed by the bundled interpreter.

I also ended up writing another language targeting BF, for writing the compiler in. It's a more bare-bones and less managed system than the assembly compiler I created previously. Compiler is macro_compiler.py, call it like so: `python macro_compiler.py in.bfm out.bf`. `.bfm` stands for BrainF Macro.

It's possible that the final compiler will have a final pass going through the BFM compiler.