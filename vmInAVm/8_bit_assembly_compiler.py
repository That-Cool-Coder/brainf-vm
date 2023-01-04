# Assembly compiler for compiling to 8bitvm format - see 8bitvm documentation for list of opcodes
# Use ; for comments
# It also supports the label command which creates a label for jumping to

import argparse

from _8_bit_assembly_instructions import INSTRUCTION_COMPILERS, CompileContext, NamedJumpPlaceholder

def compile_assembly(assembly: str, vm_code: str, dump_machine_code=False):
    parsed_lines = parse_assembly(assembly)

    machine_code = []
    compile_context = CompileContext(0)
    for line in parsed_lines:
        instruction_name = line[0]
        if instruction_name in INSTRUCTION_COMPILERS:
            machine_code += INSTRUCTION_COMPILERS[instruction_name](compile_context, line[1:])
        else:
            raise ValueError(f'Unknown instruction: "{instruction_name}"')

    machine_code += [0] # make it quit at end - VM doesn't do this automatically

    # Fill in named jumps
    for idx, value in enumerate(machine_code):
        if isinstance(value, NamedJumpPlaceholder):
            if value.label_name in compile_context.named_jumps:
                machine_code[idx] = compile_context.named_jumps[value.label_name]
            else:
                raise ValueError(f'Undefined label: {value.label_name}')

    # Instruction addresses are reversed in the VM
    if dump_machine_code:
        print(machine_code)

    machine_code.reverse()

    initialization_code = ''
    for value in machine_code:
        if value > 255:
            raise ValueError(f'Cannot have a value over 255 ({value} was provided)')
        initialization_code += '+' * value + '>'

    return initialization_code + vm_code

def parse_assembly(assembly: str):
    lines = assembly.splitlines()
    parsed_lines = []
    for line in lines:
        parsed_line = line.split(';')[0].split(' ')
        parsed_line = map(lambda x: x.strip(), parsed_line)
        parsed_line = list(filter(lambda x: len(x) > 0, parsed_line))
        if len(parsed_line) > 0:
            parsed_lines.append(parsed_line)
    return parsed_lines

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('infile', help='Path to input .asm file')
    parser.add_argument('-o', '--outfile', help='Path to output .bf file. If not provided then generates it based on name of .asm', required=False)
    parser.add_argument('-d', '--dump', help='Dump machine code before converting it into Brainf', action='store_true')

    args = parser.parse_args()
    if args.outfile is None:
        args.outfile = ''.join(args.infile.split('.')[:-1]) + '.bf'
    
    return args

if __name__ == '__main__':
    args = parse_args()

    with open('8bitvm.bf', 'r') as f:
        vm_code = f.read()

    with open(args.infile, 'r') as f:
        assembly = f.read()

    try:
        machine_code = compile_assembly(assembly, vm_code, args.dump)

        with open(args.outfile, 'w+') as f:
            f.write(machine_code)
    except ValueError as e:
        print(f'Failed compiling assembly: {e}')
