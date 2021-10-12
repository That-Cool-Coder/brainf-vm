section d
; parameters
i fizz_trigger 3
i buzz_trigger 15
s fizz 4 fizz
s buzz 4 buzz
i start 1
i end 10

; long-life runtime variables
i difference
i counter
i crnt_value
i fizzbuzz_trigger

; utility constants
i int_to_digit 48

; misc temp vars
i temp
i temp_mult
i temp_div
i temp_mod

section t

cls

; setup counter
cpy end difference
sub start difference
cpy difference counter

; setup fizzbuzz_trigger
cpy fizz_trigger fizzbuzz_trigger
mult buzz_trigger fizzbuzz_trigger

luz counter
  ; setup crnt_value
  cpy difference crnt_value
  sub counter crnt_value
  inc crnt_value

  ; print crnt value for debug
  add int_to_digit crnt_value
  out crnt_value
  sub int_to_digit crnt_value

  ; calc mod value for fizz
  cpy crnt_value temp_div
  div fizz_trigger temp_div
  out temp_div
  cpy temp_div temp_mult
  mult fizz_trigger temp_mult
  cpy crnt_value temp_mod
  sub temp_mult temp_mod
  add int_to_digit temp_mod
  out temp_mod
  ; calc mod value for buzz

  ; calc mod value for fizzbuzz
  
  dec counter
  zer counter
eluz counter