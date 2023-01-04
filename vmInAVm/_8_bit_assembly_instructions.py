class CompileContext:
    pass # Yes it's overkill to have a class that does nothing.
    # But the code was already there to pass a context in, and we'll want it if we add named jumps

def instruction_compiler(num_required_args):
    # Automatically adds code to check if required num args are present, and auto registers in INSTRUCTION_COMPILERS
    # Each implementing function should return a list of ints which represent its representation in machine code
    # Yes, having actual functions to generate the code is a bit overkill when a basic lookup table would have probably been enough,
    # But having functions allows us to be more flexible in future

    def wrapper(to_decorate):
        def inner_wrapper(compile_context, instruction_args):
            num_args_provided = len(instruction_args)

            if num_args_provided != num_required_args:
                raise ValueError(f'Incorrect number of args passed to {to_decorate.__name__}: {num_args_provided} given, expected {num_required_args}')

            return to_decorate(compile_context, instruction_args)
        INSTRUCTION_COMPILERS[to_decorate.__name__] = inner_wrapper
        return inner_wrapper
    return wrapper

INSTRUCTION_COMPILERS = {}

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

@instruction_compiler(0)
def jump(cc, a):
    return [7]

@instruction_compiler(0)
def jump_if(cc, a):
    return [8]

@instruction_compiler(0)
def jump_if_not(cc, a):
    return [9]

@instruction_compiler(0)
def getchar(cc, a):
    return [10]

@instruction_compiler(0)
def putchar(cc, a):
    return [11]

