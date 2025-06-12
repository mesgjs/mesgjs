" Vim indent file for Mesgjs
" Maintainer: Brian Katzung (initial concepts)

if exists("b:did_indent")
  finish
endif
let b:did_indent = 1

setlocal indentexpr=GetMesgjsIndent(v:lnum)
setlocal indentkeys+=0},0],0),:,!^F,o,O,e

function! GetMesgjsIndent(lnum)
  let lnum = a:lnum
  let line = getline(lnum)
  let prev = prevnonblank(lnum - 1)
  let prevline = getline(prev)
  let indent = indent(prev)

  " Outdenting line: starts with closing }, ], or )
  if line =~ '^\s*[]})]'
    return indent - &shiftwidth
  endif

  " Indent deeper after opening {, [, (
  if prevline =~ '[{[(]$'
    return indent + &shiftwidth
  endif

  " Align continued lines (basic heuristic)
  if prevline =~ '[{[(][^})\]]*$'
    return indent + &shiftwidth
  endif

  return indent
endfunction
