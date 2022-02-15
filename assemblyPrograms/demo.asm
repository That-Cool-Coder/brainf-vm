; simple demo program

section d
s prompt1 18 Type a character: 
s prompt2 29 Type a line and press enter: 
s input 100
s outputPrefix 10 You said: 

section t
cls
outa prompt1
outr 10
outr 13
ich input
outa outputPrefix
outa input

outr 10
outr 13
outa prompt2
outr 10
outr 13
iln input
outa outputPrefix
outa input

outr 10
outr 13