; this program will print the word (eg "six") of the digit that you press

section d
; digit to string
s zero 4 zero
s one 3 one
s two 3 two
s three 5 three
s four 4 four
s five 4 five
s six 3 six
s seven 5 seven
s eight 5 eight
s nine 4 nine

s prompt 16 Enter a digit: 
i input 1
s output_prefix 10 You said: 

i result
i offset 48
i counter
i counter2

section t

; setup
cls
outa prompt
ich input

; echo the digit back
out input

; str to int 
cpy offset counter 
cpy input result
luz counter
dec counter
dec result
eluz counter

; newline and label
outr 10
outr 13
outa output_prefix

; if-statements
ifz result
outa zero
eifz result
dec result

ifz result
outa one
eifz result
dec result

ifz result
outa two
eifz result
dec result

ifz result
outa three
eifz result
dec result

ifz result
outa four
eifz result
dec result

ifz result
outa five
eifz result
dec result

ifz result
outa six
eifz result
dec result

ifz result
outa seven
eifz result
dec result

ifz result
outa eight
eifz result
dec result

ifz result
outa nine
eifz result
dec result