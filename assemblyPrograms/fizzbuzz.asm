section d
s fizz 4 fizz
s buzz 4 buzz

i start 1
i end 10
i difference
i counter
i crnt_value
i temp
i temp_mult
i temp_mod
i int_to_digit 48

section t

; 

; Setup counter
cpy end difference
sub start difference
cpy difference counter

luz counter
  ; setup crnt_value
  cpy difference crnt_value
  sub counter crnt_value
  inc crnt_value

  ;print crnt value
  add int_to_digit crnt_value
  out crnt_value

  

  dec counter
eluz counter