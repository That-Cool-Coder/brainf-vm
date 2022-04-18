section d
; Runtime vars (define before constants because they're used more so should be at start of memory)
i temp1
i temp2
i input
i frame_count 0
i enemy_move_counter 0
i playing 1
i died 0
i player_pos_x 30
i player_pos_y 30
i enemy_pos_x 5
i enemy_pos_y 5
i player_offset_x
i player_offset_y

; Constants
i false 0
i true 1
i half_max_int 128
i int_to_digit 48
i player_char 64 ; @ symbol
i enemy_char 88 ; capital X
s heading 11 Weird Game
s instructions 71 Use arrow keys to move around. Press q to quit. Press any key to start.
s lose_text 9 You died
s win_text 15 You won somehow
i enemy_move_interval 2
i quit_button 113 ; q
i left 17
i right 18
i up 19
i down 20
i reset_cursor 2

section t

; Introduction
; ------------
cls
outa heading
lbr
outa instructions
ich input
cls

; Main loop
; ---------
luz playing
    ; Get input
    ; ---------
    ich input

    ; check quit button
    ieq input quit_button
        zer playing
    eieq

    ; check left arrow
    ieq input left
        dec player_pos_x
    eieq

    ; check right arrow
    ieq input right
        inc player_pos_x
    eieq

    ; check up arrow
    ieq input up
        dec player_pos_y
    eieq

    ; check down arrow
    ieq input down
        inc player_pos_y
    eieq

    ; Calculate player/enemy offset
    ; -----------------------------
    cpy player_pos_x player_offset_x
    sub enemy_pos_x player_offset_x

    cpy player_pos_y player_offset_y
    sub enemy_pos_y player_offset_y

    ; Move Enemy
    ; ----------

    ; Loop to make it move every nth frame
    inc enemy_move_counter
    cpy enemy_move_counter temp1
    sub enemy_move_interval temp1
    ifz temp1
        zer enemy_move_counter

        ; Actual moving
		add half_max_int player_offset_x
		add half_max_int player_offset_y
        
        ; Right
        gt player_offset_x half_max_int temp2
        ifp temp2
        	inc enemy_pos_x
        eifp temp2
        ; Left
        gt half_max_int player_offset_x temp2
        ifp temp2
        	dec enemy_pos_x
        eifp temp2
        ; Up
        gt player_offset_y half_max_int temp2
        ifp temp2
        	inc enemy_pos_y
        eifp temp2
        ; Down
        gt half_max_int player_offset_y temp2
        ifp temp2
        	dec enemy_pos_y
        eifp temp2
        
        ; Reset these after we messed them up above
        sub half_max_int player_offset_x
        sub half_max_int player_offset_y
    eifz temp1

    ; Check enemy colliding with player
    ; ---------------------------------
    ifz player_offset_x
        ifz player_offset_y
            zer playing
            inc died
        eifz
    eifz
    
    cls

    ; Draw the player
    ; ---------------
    cpy player_pos_x temp1
    cpy player_pos_y temp2

    ; Go to correct column
    luz temp1
        dec temp1
        out right
    eluz temp1

    ; Go to correct row
    luz temp2
        dec temp2
        out down
    eluz temp2

    out player_char

    ; Draw the enemy
    ; ---------------
    cpy enemy_pos_x temp1
    cpy enemy_pos_y temp2

    out reset_cursor

    ; Go to correct column
    luz temp1
        dec temp1
        out right
    eluz temp1

    ; Go to correct row
    luz temp2
        dec temp2
        out down
    eluz temp2

    out enemy_char


    inc frame_count
eluz playing

; Print outcome
; -------------

cls

; won
ifz died
  ;outa win_text
eifz
; died
ifp died
  outa lose_text
eifp died

