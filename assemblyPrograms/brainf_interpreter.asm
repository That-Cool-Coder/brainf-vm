; brainf interpreting program (WIP, needs compiler improvements)

section d
i temp
i input
a memory 100
i end_char 113 ; q
s start_message 51 Type chars to run them in BrainF. Type 'q' to stop.
s end_message 8 Finished

; brainf char codes
i less_than 60
i greater_than 62
i plus 43
i minus 45
i left_bracket 91
i right_bracket 93
i comma 44
i full_stop 46

section t
; start message
cls
outa start_message
outr 10
outr 13

; code for checking if we should terminate
ich input
out input
cpy input temp
sub end_char temp

luz temp

; code for checking if we should terminate
ich input
out input
cpy input temp
sub end_char temp

eluz temp

; end message
outr 10
outr 13
outa end_message


