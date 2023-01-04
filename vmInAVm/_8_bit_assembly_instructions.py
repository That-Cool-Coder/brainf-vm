from dataclasses import dataclass

@dataclass
class CompileContext:
    named_jumps = {} # A jump has value None if it is never defined, only read
    current_program_pointer: int

@dataclass
class NamedJumpPlaceholder:
    # Class acting as a placeholder for a named jump, since we might not have resolved where it points to yet
    label_name: str

def instruction_compiler(num_required_args):
    # Automatically adds code to check if required num args are present, and auto registers in INSTRUCTION_COMPILERS
    # Each implementing function should return a list of ints+NamedJumpPlaceholders which represent its representation in machine code
    # Yes, having actual functions to generate the code is a bit overkill when a basic lookup table would have probably been enough,
    # But having functions allows us to be more flexible in future

    def wrapper(to_decorate):
        def inner_wrapper(compile_context, instruction_args):
            num_args_provided = len(instruction_args)

            if num_args_provided != num_required_args:
                raise ValueError(f'Incorrect number of args passed to {to_decorate.__name__}: {num_args_provided} given, expected {num_required_args}')

            result = to_decorate(compile_context, instruction_args)
            compile_context.current_program_pointer += len(result)
            return result

        INSTRUCTION_COMPILERS[to_decorate.__name__] = inner_wrapper
        return inner_wrapper
    return wrapper

def parse_jump_value(compile_context, jump_value):
    if jump_value.isdigit():
        return int(jump_value)
    else:
        return NamedJumpPlaceholder(jump_value)
        
def compile_jump_value(compile_context, jump_value):
    # Create code for setting r1 to jump target
    return [2, 1, parse_jump_value(compile_context, jump_value)]

INSTRUCTION_COMPILERS = {}

@instruction_compiler(1)
def label(cc, a):
    cc.named_jumps[a[0]] = cc.current_program_pointer
    return []

@instruction_compiler(0)
def quit(cc, a):
    return [0]

@instruction_compiler(1)
def zero(cc, a):
    return [1, int(a[0])]

@instruction_compiler(2)
def set(cc, a):
    return [2, int(a[0]), int(a[1])]

@instruction_compiler(2)
def copy(cc, a):
    return [3, int(a[0]), int(a[1])]

@instruction_compiler(2)
def move(cc, a):
    return [4, int(a[0]), int(a[1])]

@instruction_compiler(0)
def increment(cc, a):
    return [5]

@instruction_compiler(0)
def decrement(cc, a):
    return [6]

# Friendly jumps - jump to a label or index that is arg0
# (doesn't map directly to machine code)
@instruction_compiler(1)
def jump(cc, a):
    return compile_jump_value(cc, a[0]) + [7]

@instruction_compiler(1)
def jumpif(cc, a):
    return compile_jump_value(cc, a[0]) + [8]

@instruction_compiler(1)
def jumpifnot(cc, a):
    return compile_jump_value(cc, a[0]) + [9]

# dynamic jump - more bare bones jump that jumps to value of register 0
# (maps directly to machine code)
@instruction_compiler(0)
def djump(cc, a):
    return [7]

@instruction_compiler(0)
def djumpif(cc, a):
    return [8]

@instruction_compiler(0)
def djumpifnot(cc, a):
    return [9]

@instruction_compiler(0)
def getchar(cc, a):
    return [10]

@instruction_compiler(0)
def putchar(cc, a):
    return [11]

