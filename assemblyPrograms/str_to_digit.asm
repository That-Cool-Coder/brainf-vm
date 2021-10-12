; convert an input character into a integer and back again

section d
s message 15 Enter a digit: 
s input 1
i str_result
i digit_result
i offset 48
i counter

section t
cls
outa message
ich input

; str to int
cpy offset counter
cpy input digit_result
luz counter
dec counter
dec digit_result
eluz counter

; int to str
cpy offset counter
cpy digit_result str_result
luz counter
inc str_result
dec counter
eluz counter

outr 10
outr 13
out str_result