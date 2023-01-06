# Common code

from dataclasses import dataclass

@dataclass
class CompileContext:
    named_jumps = {} # A jump has value None if it is never defined, only read
    current_program_pointer: int

@dataclass
class NamedJumpPlaceholder:
    # Class acting as a placeholder for a named jump, since we might not have resolved where it points to yet
    label_name: str

def instruction_compiler(num_required_args: int, instruction_repository: dict):
    # Automatically adds code to check if required num args are present, and auto registers in INSTRUCTION_COMPILERS
    # Each implementing function should return a list of ints+NamedJumpPlaceholders which represent its representation in machine code
    # Yes, having actual functions to generate the code is a bit overkill when a basic lookup table would have probably been enough,
    # But having functions allows us to be more flexible in future
    # Feel free to make wrappers so that the instruction_repository does not have to be manually passed in all the time

    def wrapper(to_decorate):
        def inner_wrapper(compile_context, instruction_args):
            num_args_provided = len(instruction_args)

            if num_args_provided != num_required_args:
                raise ValueError(f'Incorrect number of args passed to {to_decorate.__name__}: {num_args_provided} given, expected {num_required_args}')

            result = to_decorate(compile_context, instruction_args)
            compile_context.current_program_pointer += len(result)
            return result

        instruction_repository[to_decorate.__name__] = inner_wrapper
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