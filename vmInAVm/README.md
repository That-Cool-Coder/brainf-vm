# VM in a VM

So I decided that the base brainf language was too limited to do things like jumping to arbitrary program positions (through compile tricks), so I decided to create a VM in a vm.

There will be a compiler that parses some level of code, then transforms it into a simpler machine code which is then bundled with an interpreter (aka the inner VM). The machine code langauge is then executed by the bundled interpreter.

I also ended up writing another language targeting BF, for writing the compiler in. It's a more bare-bones and less managed system than the assembly compiler I created previously. Compiler is macro_compiler.py, call it like so: `python macro_compiler.py in.bfm out.bf`. `.bfm` stands for BrainF Macro.

It's possible that the final compiler will have a final pass going through the BFM compiler.

#### Conventions used when writing bfm programs
- Comments are just written in the non-BF characters (same as normal BF). Because a comma is a BF character, we use two spaces to represent a comma
- Major sections of the code are written by adding a capslock comment and then indenting the section, like so:
```
DO STUFF
    INITIALIZE
        +<-[+<->>+]+>>>+<--++
    COPY
        ->>[->-<<]+<
```
- If a major comment comes just before a control-structure macro that indents anyway, you don't have to indent twice
- Minor comments are written in lower-case letters at the end of most lines
- Groups of 3-4 macros related to doing the same thing can be put one after another on the same line to save space and give a better indication of structure
- The `!rem!` macro is available for creating comments that may include brainf characters, do not feel compelled to always use it though
- When using the `!alias!` macro, prefix the name of the aliased variable with `al_`.