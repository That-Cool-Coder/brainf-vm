; Basic program printing out A to Z (it's veeery slow currently)

; r2 is current character value
    set         2   65
; r3 is end of loop
    set         3   91

label       start_loop
    move        2   0
    putchar
    increment
    copy        0   2
    copy        3   1
    sub
    jumpif      start_loop