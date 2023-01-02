# very primitive macro compiler to make basic stuff like ifs bearable
import sys
import argparse

import macros

# Macro format:
# Macros are started with an exclamation mark and ended by an exclamation mark.
# Between the marks there comes the name of the macro, and the values passed to it (space separated)

def compile_macros(macro_text, add_clear_char=False, optimise=True):
    sections = macro_text.split('!')
    result = ''

    if add_clear_char:
        result += '$'

    compile_context = macros.CompileContext()
    for idx, section in enumerate(sections):
        is_brainf = idx % 2 == 0
        if is_brainf:
            result += section
        else: # (is macro)
            macro_args = section.split(' ')
            macro_name = macro_args.pop(0)
            if macro_name in macros.MACRO_COMPILERS:
                result += macros.MACRO_COMPILERS[macro_name](compile_context, macro_args)
            else:
                raise ValueError(f'Macro {macro_name} does not exist')

    if optimise:
        # First remove invalid chars
        valid_chars = '+-<>[],.*$' # the last two chars are special ones for the BrainF interpreter included in this project
        result = ''.join([c for c in result if c in valid_chars])

        result = remove_inverses(result, ['+-', '<>'])
    
    return result

def remove_inverses(string: str, inverse_sets):
    # Inverse sets should be a list of 2-character strings, where each char are inverses
    # Remove all occurences of value followed by its inverse (or vice versa) in the string.
    # Also removes if there are multiple inverses: a+++---b gets turned into ab in the end, or if there are intertwined ones: a<++<>-->b goes to ab
    
    reversed_sets = [''.join(reversed(s)) for s in inverse_sets]
    all_sets = inverse_sets + reversed_sets;
    while any([s in string for s in all_sets]):
        for s in all_sets:
            string = string.replace(s, '')
    return string

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('infile', help='Path to input .bfm file')
    parser.add_argument('-o', '--outfile', help='Path to output .bf file. If not provided then generates it based on name of .bfm', required=False)
    parser.add_argument('-l', '--large', help='Whether to skip minifying the brainf', action='store_true')
    parser.add_argument('-c', '--clear', help='Whether to add the memory clearing code (only works in this BrainF interpreter)', action='store_true')

    args = parser.parse_args()
    if args.outfile is None:
        args.outfile = ''.join(args.infile.split('.')[:-1]) + '.bf'
    
    return args

if __name__ == '__main__':
    args = parse_args()

    with open(args.infile, 'r', encoding='utf-8') as in_file:
        try:
            result = compile_macros(in_file.read(), add_clear_char=args.clear, optimise=not args.large)
            with open(args.outfile, 'w+', encoding='utf-8') as out_file:
                out_file.write(result)
        except ValueError as e:
            print(f'Failed compiling: {e}')