" Vim syntax file for Mesgjs
" Maintainer: Brian Katzung (initial concepts)
" Description: Basic syntax highlighting for Mesgjs (.msjs files)

if exists("b:current_syntax")
  finish
endif

syntax case match

" NOTE: Vim is last-match-wins

" --- Regular Words ---
syntax match msjsWords "\m\([^ \n\t(){}\[\]!#%='\"/]\|/\([/*]\)\@!\)\+"
" highlight def link msjsWords Special

" --- Op-words ---
" syntax match msjsEquals "="
syntax match msjsOpWords "\m\(=\([!#%@:]\|[+-][0-9]\)\@=\|\([@:]\)\@!\([`~@#$%^&*=|.:,;<>?]\|!\(}\)\@!\|[+-]\([0-9]\)\@!\)\)\+"
highlight def link msjsOpWords Operator

" --- Embedded JavaScript ---
syntax region msjsJsEmbed start="@js{" end="@}" contains=NONE keepend
highlight def link msjsJsEmbed Comment

" --- Comments ---
syntax match msjsComment "\m//.*$" contains=NONE
syntax region msjsComment start="/\*" end="\*/" contains=NONE keepend
highlight def link msjsComment Comment

" --- Numbers ---
syntax match msjsNumber "\m[+-]\?\(0[bB][01]\+\|0[oO][0-7]\+\|0[xX][0-9A-Fa-f]\+\|[0-9]\+\)n\?\([0-9A-Za-z]\)\@!"
syntax match msjsNumber "\m[+-]\?[0-9]\+\(\.[0-9]\+\)\?\([eE][+-]\?[0-9]\+\)\?\([0-9A-Za-z]\)\@!"
highlight def link msjsNumber Number

" --- Strings ---
syntax region msjsString start=/'/ skip=/\\'/ end=/'/ contains=NONE keepend
syntax region msjsString start=/"/ skip=/\\"/ end=/"/ contains=NONE keepend
highlight def link msjsString String

" --- Debug ---
syntax match msjsDebug "@debug{"
highlight def link msjsDebug Keyword

" --- Special Primitives ---
syntax match msjsPrimitive "\m\(@t\|@f\|@n\|@u\|@mid\)\($\|\W\)\@="
highlight def link msjsPrimitive Special

" --- Special Objects ---
syntax match msjsSpecialObj "\m\(@c\|@d\)\($\|\W\)\@="
highlight def link msjsSpecialObj Special

" --- Storage Objects ---
syntax match msjsStorageObj "\m\(%[*/]\?\|#\|!\(}\)\@!\)?\?"
syntax match msjsStorageObj "\m\(@gss\|@mps\)\($\|\W\)\@="
highlight def link msjsStorageObj Identifier

" --- Blocks ---
syntax match msjsCodeBlock "\m[{}]"
syntax match msjsCodeReturning "\m!}"
highlight def link msjsCodeBlock Identifier
highlight def link msjsCodeReturning Keyword

" --- Lists ---
syntax match msjsList "\m[\[\]]"
highlight def link msjsList Identifier

" --- Messages ---
syntax match msjsMessage "\m[()]"
highlight def link msjsMessage Identifier

" --- Custom Styles ---
highlight Comment term=NONE gui=NONE guifg=SlateBlue
highlight Constant term=NONE gui=NONE guifg=Red
highlight Identifer term=NONE gui=NONE guifg=DarkCyan
highlight Special term=NONE gui=NONE guifg=Purple
"highlight Statement term=NONE cterm=NONE ctermfg=3 gui=NONE guifg=Orange
highlight Statement term=NONE gui=NONE guifg=Orange

let b:current_syntax = "mesgjs"
