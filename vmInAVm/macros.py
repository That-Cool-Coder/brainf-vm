# file full of compilers for specific macros
# Each function takes a CompileContext (shortened to cc) and list of macro args (shortened to a), and returns generated text, with the option of having modified the compilecontext
# I didn't bother making an exhaustive list of possible functions, just made the ones that I needed as I went along.
# Inverses or very similar functions have been put one after the other with no blank line

from dataclasses import dataclass

@dataclass
class CompileContext:
    last_cursor_position: int = 0
    variables = {}

MACRO_COMPILERS = {}

def macro_function(num_required_args, variadic=False):
    # Automatically adds code to check if required num args are present, and auto registers in MACRO_COMPILERS

    def wrapper(to_decorate):
        def inner_wrapper(compile_context, macro_args):
            num_args_provided = len(macro_args)

            if variadic and not num_args_provided >= num_required_args:
                raise ValueError(f'Incorrect number of args passed to {to_decorate.__name__}: {num_args_provided} given, expected at least {num_required_args}')
            elif not variadic and num_args_provided != num_required_args:
                raise ValueError(f'Incorrect number of args passed to {to_decorate.__name__}: {num_args_provided} given, expected {num_required_args}')

            return to_decorate(compile_context, macro_args)
        # inner_wrapper.is_macro_function = True
        MACRO_COMPILERS[to_decorate.__name__] = inner_wrapper
        return inner_wrapper
    return wrapper

def read_var(compile_context: CompileContext, var: str):
    # Get the address of a variable
    # Only use this if you are certain that you have a variable and not a raw address - otherwise prefer maybe_read_var
    try:
        return compile_context.variables[var]
    except KeyError as e:
        raise ValueError(f'Undefined variable: {var}')

def maybe_read_var(compile_context: CompileContext, address_or_var: str):
    # Utility func for getting the address of a maybe-var.
    # If value passed in is a number then returns that. If value is a number prefixed with - then returns a negative number. Else returns address of var with that name.
    
    # Read positive values
    if address_or_var.isdigit():
        return int(address_or_var)
    # Read negative values
    elif address_or_var[0] == '-' and address_or_var[1:].isdigit():
        return int(address_or_var)
    # Try lookup var
    else:
        return read_var(compile_context, address_or_var)

def lvar_inner(compile_context: CompileContext, target): # target is address or var
    # Generates code for moving the pointer to a variable, also updates the compile context to reference the new position

    target_address = maybe_read_var(compile_context, target)
    delta = target_address - compile_context.last_cursor_position
    compile_context.last_cursor_position = target_address
    if delta >= 0:
        return '>' * delta
    else:
        return '<' * abs(delta)

# abbreviation
lvi = lvar_inner

# Misc

@macro_function(num_required_args=0, variadic=True)
def rem(cc, a):
    # Remark - a comment, deleted during compilation.
    # Useful because you can use brainf characters inside it

    return ''

# Variables:

@macro_function(2)
def dvar(cc, a):
    # define variable - a0 is name, a1 is address
    
    # If it is a number, not a valid var
    if a[0].isdigit():
        raise ValueError(f'Variable names cannot be digits-only ({a[0]} was provided)')

    cc.variables[a[0]] = int(a[1])
    return ''

@macro_function(3)
def dvari(cc, a):
    # define variable with initialization - a0 is name, a1 is address, a2 is value
    
    return dvar(cc, [a[0], a[1]]) + setl(cc, [a[1], a[2]])

@macro_function(1)
def lvar(cc, a):
    # Lookup variable called a0 and move the pointer to there

    return lvi(cc, a[0])

@macro_function(2)
def alias(cc, a):
    # Alias variable a0 to equal a1. Useful for giving general-purpose registers a specific purpose for a certain block of code

    cc.variables[a[0]] = read_var(cc, a[1])
    return ''

@macro_function(1)
def rmalias(cc, a):
    # Remove alias - delete the alias named a0

    if a[0] in cc.variables:
        del cc.variables[a[0]]
    else:
        raise ValueError(f'Cannot delete alias {a[0]}: it does not exist')
    return ''

# Memory pointer updating
# Not actually moving the memory pointer, but updating the position of the pointer in the compiler's understanding
# Intended to be used after performing unsafe operations through manual BF

@macro_function(1)
def movep(cc, a):
    # Move compile-checker pointer to a0

    cc.last_cursor_position = maybe_read_var(cc, a[0])
    return ''

@macro_function(1)
def movepl(cc, a):
    # Move compile-checker pointer to left by a0

    cc.last_cursor_position += int(a[0])
    return ''

@macro_function(1)
def movepr(cc, a):
    # Move compile-checker pointer to right by a0

    cc.last_cursor_position -= int(a[0])
    return ''

@macro_function(0)
def debugp(cc, a):
    # Debug pointer - prints what the compile-time pointer currently is to screen
    
    print(cc.last_cursor_position)
    return ''

# Basic memory management

@macro_function(2)
def setl(cc, a):
    # Set a0 to a literal in  a1
    return lvi(cc, a[0]) + '[-]' + ('+' * int(a[1]))

@macro_function(3)
def copy(cc, a):
    # copy a0 to a1, using a2 as temp
    return (
        lvi(cc, a[1]) + '[-]' + lvi(cc, a[2]) + '[-]' + # zero stuff
        loopz(cc, [a[0]]) + '-' + lvi(cc, a[1]) + '+' + lvi(cc, a[2]) + '+' + eloopz(cc, [a[0]]) +  # copy from a0 to a1 and a2 at same time
        move(cc, [a[2], a[0]]) # move a2 to a0
    )

@macro_function(2)
def move(cc, a):
    # Move a0 to a1, destroying a0 in the process. Faster than copy
    return (
        lvi(cc, a[1]) + '[-]' + # zero a1
        loopz(cc, [a[0]]) + lvi(cc, a[0]) + '-' + lvi(cc, a[1]) + '+' + eloopz(cc, [a[0]]) # Perform the move
    )

@macro_function(3)
def swap(cc, a):
    # Swap a0 and a1 using a2 as temp
    return (
        move(cc, [a[0], a[2]]) + move(cc, [a[1], a[0]]) + move(cc, [a[2], a[1]])
    )

# Flow control

@macro_function(1)
def loopz(cc, a):
    # Loop until a0 is zero

    return lvi(cc, a[0]) + '['
@macro_function(1)
def eloopz(cc, a):
    # End of loopz

    return lvi(cc, a[0]) + ']'

@macro_function(1)
def ifnz(cc, a):
    # If a0 is not zero

    return lvi(cc, a[0]) + '['
@macro_function(1)
def eifnz(cc, a):
    # End of ifnz (destructive on a0)

    return lvi(cc, a[0]) + '[-]]'

@macro_function(2)
def ifz(cc, a):
    # If a0 is zero. (a1 is temp)
    # (destructive on a0)

    return (
        lvi(cc, a[1]) + '[-]+' + lvi(cc, a[0]) + '[' + lvi(cc, a[1]) + '[-]' + lvi(cc, a[0]) + '[-]]' + # setup not var
        lvi(cc, a[1]) + '[' # Actually do the branch
    )
@macro_function(1)
def eifz(cc, a):
    # End of ifz. a0 is a1 from ifz

    return lvi(cc, a[0]) + '[-]]'

# @macro_function(4)
# def ieql(cc, a):
#     # If value at a0 is equal to the literal of a1. (a2, a3 are temp)
#     return (

#     )
# @macro_function(1)
# def eieql(cc, a):
#     # End of ieql. a0 is a3 from ieql

# Math

@macro_function(2)
def add(cc, a):
    # Calculate a0 + a1. Destructive on a0 and a1, result is in a0
    return (
        loopz(cc, [a[1]]) + 
        '-' + lvi(cc, a[0]) + '+' +
        eloopz(cc, [a[1]])
    )

@macro_function(2)
def sub(cc, a):
    # Calculate a0 - a1. Destructive on a0 and a1, result is in a0
    return (
        loopz(cc, [a[1]]) + 
        '-' + lvi(cc, a[0]) + '-' +
        eloopz(cc, [a[1]])
    )