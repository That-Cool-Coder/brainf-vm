; Basic program printing out A to Z (it's veeery slow currently)

; r2 is current character value
    set         2   65

label       start_loop
    move        2   0
    putchar
    increment
    copy        0   2
    shrink      91 ; 90 is value of Z, we do 91 to avoid OBOE
    jumpif      start_loop