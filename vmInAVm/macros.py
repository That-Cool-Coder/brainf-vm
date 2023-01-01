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

def macro_function(num_required_args):
    # Automatically adds code to check if required num args are present, and auto registers in MACRO_COMPILERS

    def wrapper(to_decorate):
        def inner_wrapper(compile_context, macro_args):
            num_args_provided = len(macro_args)
            if num_args_provided != num_required_args:
                raise ValueError(f'Incorrect number of args passed to {to_decorate.__name__}: {num_args_provided} instead of {num_required_args}')
            return to_decorate(compile_context, macro_args)
        # inner_wrapper.is_macro_function = True
        MACRO_COMPILERS[to_decorate.__name__] = inner_wrapper
        return inner_wrapper
    return wrapper

def maybe_read_var(compile_context: CompileContext, address_or_var: str):
    # Utility func for getting the address of a maybe-var.
    # If value passed in is a digit string then returns that. Else returns address of var with that name.
    
    if address_or_var.isdigit():
        return int(address_or_var)
    else:
        try:
            return compile_context.variables[address_or_var]
        except KeyError as e:
            raise ValueError(f'Undefined variable: {address_or_var}')

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
    # End of ifnz

    return lvi(cc, a[0]) + '[-]]'

@macro_function(2)
def ifz(cc, a):
    # If a0 is zero. (a1 is temp)
    # (destructive on a0)

    return (
        lvi(cc, a[1]) + '[-]+' + lvi(cc, a[0]) + '[' + lvi(cc, a[1]) + lvi(cc, a[0]) + '[-]]' + # setup not var
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