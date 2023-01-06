# Compilers for the virtual instructions - those which do not map to VM instructions,
# Instead they are convenience functions that don't need to be in asm, or compile-time helpers like labelled jumps.

from instructions_common import *

def virtual_instruction(num_required_args):
    return instruction_compiler(num_required_args, VIRTUAL_INSTRUCTIONS)

VIRTUAL_INSTRUCTIONS = {}

@virtual_instruction(1)
def label(cc, a):
    cc.named_jumps[a[0]] = cc.current_program_pointer
    return []

@virtual_instruction(1)
def grow(cc, a):
    # Increase reg0 by literal value in arg0
    return [5] * int(a[0])

@virtual_instruction(1)
def shrink(cc, a):
    # Decrease reg0 by literal value in arg0
    return [6] * int(a[0])

# Friendly jumps - jump to a label or index that is arg0
# (as opposed to having to manually set the reg0 then call jump)
@virtual_instruction(1)
def jump(cc, a):
    return compile_jump_value(cc, a[0]) + [7]

@virtual_instruction(1)
def jumpif(cc, a):
    return compile_jump_value(cc, a[0]) + [8]

@virtual_instruction(1)
def jumpifnot(cc, a):
    return compile_jump_value(cc, a[0]) + [9]