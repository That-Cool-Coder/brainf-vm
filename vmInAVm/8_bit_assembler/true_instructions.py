# Compilers for the true instructions - ones which correspond directly to a VM instruction

from instructions_common import *

def true_instruction(num_required_args):
    return instruction_compiler(num_required_args, TRUE_INSTRUCTIONS)

TRUE_INSTRUCTIONS = {}

@true_instruction(0)
def quit(cc, a):
    return [0]

@true_instruction(1)
def zero(cc, a):
    return [1, int(a[0])]

@true_instruction(2)
def set(cc, a):
    return [2, int(a[0]), int(a[1])]

@true_instruction(2)
def copy(cc, a):
    return [3, int(a[0]), int(a[1])]

@true_instruction(2)
def move(cc, a):
    return [4, int(a[0]), int(a[1])]

@true_instruction(0)
def increment(cc, a):
    return [5]

@true_instruction(0)
def decrement(cc, a):
    return [6]

# dynamic jump - more bare bones jump that jumps to value of register 0
# (maps directly to machine code)
@true_instruction(0)
def djump(cc, a):
    return [7]

@true_instruction(0)
def djumpif(cc, a):
    return [8]

@true_instruction(0)
def djumpifnot(cc, a):
    return [9]

@true_instruction(0)
def getchar(cc, a):
    return [10]

@true_instruction(0)
def putchar(cc, a):
    return [11]

@true_instruction(0)
def add(cc, a):
    return [12]

@true_instruction(0)
def sub(cc, a):
    return [13]