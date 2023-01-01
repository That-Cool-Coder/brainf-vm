# very primitive macro compiler to make basic stuff like ifs bearable
import sys

import macros

# Macro format:
# Macros are started with an exclamation mark and ended by an exclamation mark.
# Between the marks there comes the name of the macro, and the values passed to it (space separated)

def compile_macros(macro_text):
    sections = macro_text.split('!')
    result = ''
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
    return result

if __name__ == '__main__':
    with open(sys.argv[1], 'r', encoding='utf-8') as in_file:
        try:
            result = compile_macros(in_file.read())
            with open(sys.argv[2], 'w+', encoding='utf-8') as out_file:
                out_file.write(result)
        except ValueError as e:
            print(f'Failed compiling: {e}')