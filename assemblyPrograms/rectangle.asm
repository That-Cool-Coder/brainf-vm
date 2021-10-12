; this program will draw an ASCII rectangle in the console

section d
s startingMessage 35 Press keys until cool stuff happens
s endingMessage 4 Done
s char 1 #
i null 0
i width 60
i height 29
i loopIdx 0

section t
outa startingMessage
ich null
cls

; right
cpy width loopIdx
luz loopIdx
out char
ich null
dec loopIdx
eluz loopIdx

; down
cpy height loopIdx
luz loopIdx
outr 17
outr 20
out char
ich null
dec loopIdx
eluz loopIdx

; left
cpy width loopIdx
luz loopIdx
outr 17
outr 17
out char
ich null
dec loopIdx
eluz loopIdx

; up
cpy height loopIdx
luz loopIdx
outr 17
outr 19
out char
ich null
dec loopIdx
eluz loopIdx


cls
outa endingMessage