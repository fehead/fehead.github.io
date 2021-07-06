---
title: "ARM64 리눅스 커널 소스 분석 준비"
date: 2021-07-06 12:15:00
categories: linux kernel
---

# 리눅스 커널 소스 분석 준비

## 소스 분석 프로그램 설치
1. vim, git, ctags, cscope

* Debian 계열

```sh
$ sudo apt vim git ctags cscope
```

* ArchLinux 계열

```sh
$ sudo pacman -S vim git ctags cscope
```

## linux kernel 가져오기
```sh
$ mkdir -p ~/git
$ cd ~/git
$ git clone https://github.com/iamroot18/5.10.git
```

## vim 설정
```sh
$ vim ~/.vimrc
```

```vim
" .vimrc
set diffopt+=iwhite
"============ kernel source 경로 ===========
let kernel_src_home=$PWD

set nu
set ai
set si
set ci
set ts=4 sts=4 sw=4
set hlsearch
set nocompatible
set fileencodings=utf-8,euc-kr
set history=1000
set ruler
set nobackup
set title
set showmatch
set nowrap
set wmnu

set ls=2	"last statusbar

syntax on
set cc=80	" 80라인 컬럼 표시

colorscheme ron	" theme

"============= vim 창 크기 조절 ============
"nmap <s-h> <C-W><
"nmap <s-j> <C-W>-
"nmap <s-k> <C-W>+
"nmap <s-l> <C-W>>

"============= vim 창이동 ============
nmap <c-k> <c-w>k
nmap <c-j> <c-w>j
nmap <c-h> <c-w>h
nmap <c-l> <c-w>l

"===== 버퍼간 이동
nmap ,x :bn!<CR>	  " Switch to Next File Buffer
nmap ,z :bp!<CR>	  " Switch to Previous File Buffer
nmap ,w :bw<CR>	  " Close Current File Buffer

nmap ,1 :b!1<CR>	  " Switch to File Buffer #1
nmap ,2 :b!2<CR>	  " Switch to File Buffer #2
nmap ,3 :b!3<CR>	  " Switch to File Buffer #3
nmap ,4 :b!4<CR>	  " Switch to File Buffer #4
nmap ,5 :b!5<CR>	  " Switch to File Buffer #5
nmap ,6 :b!6<CR>	  " Switch to File Buffer #6
nmap ,7 :b!7<CR>	  " Switch to File Buffer #7
nmap ,8 :b!8<CR>	  " Switch to File Buffer #8
nmap ,9 :b!9<CR>	  " Switch to File Buffer #9
nmap ,0 :b!0<CR>	  " Switch to File Buffer #0


"============ ctags, scope 경로 ===========
if filereadable(kernel_src_home . "/cscope.out")
	set sw=8 ts=8 sts=8	"<F8>일반용, <F9>:커널 분석용
	exe "set tags+=" . kernel_src_home . "/tags"
	exe "cscope add " . kernel_src_home . "/cscope.out"
endif

set csprg=/usr/bin/cscope
set nocsverb
set csverb
set csto=0
set csre
set cst


"============= ctags 설정 ============
if version >= 500

"수평 분할 태그 점프(tag jump)
func! Sts()
	let st = expand("<cword>")
	exe "sts ".st
endfunc
nmap ,st :call Sts()<cr>

"새 버퍼로 태그 점프(tag jump)
func! Tj()
	let st = expand("<cword>")
	exe "tj ".st
endfunc
nmap ,tj :call Tj()<cr>
endif

nmap ,tp :tp <cr>   " 이전 태그로 이동
nmap ,tn :tn <cr>   " 다음 태그로 이동

"============= cscope 설정 ===========
"Find this C Symbol
func! Css()
	let css = expand("<cword>")
	new
	exe "cs find s ".css
	if getline(1) == ""
		exe "q!"
	endif
endfunc
nmap ,css :call Css() <cr>

"Find functions calling this function
func! Csc()
	let csc = expand("cword>")
	new
	exe "cs find c ".csc
	if getline(1) == ""
		exe "q!"
	endif
endfunc
nmap ,csc :call Csc() <cr>

"Find functions called by this function
func! Csd()
	let csd = expand("<cword>")
	new
	exe "cs find d ".csd
	if getline(1) == ""
		exe "q!"
	endif
endfunc
nmap ,csd :call Csd() <cr>

"Find this definition
func! Csg()
	let csg = expand("<cword>")
	new
	exe "cs find g ".csg
	if getline(1) == ""
		exe "q!"
	endif
endfunc
nmap ,csg :call Csg() <cr>

nmap ,cp :cp <cr>   " 이전 태그로 이동
nmap ,cn :cn <cr>   " 다음 태그로 이동

"=============== man page ================
func! Man()
	let sm = expand("<cword>")
	exe "!man -S 2:3:4:5:6:7:8:9:tcl:n:l:p:o ".sm
endfunc

nmap ,m :call Man()<cr><cr>


"========= 주석 매크로 ==========
func! CmtOn()	"주석 on
	exe "'<,'>norm i//"
endfunc

func! CmtOff()	"주석 off
	exe "'<,'>norm 2x"
endfunc

vmap <c-c> <esc>:call CmtOn() <cr>
vmap <c-x> <esc>:call CmtOff() <cr>
nmap <c-c> v:call CmtOn() <cr>
nmap <c-x> v:call CmtOff() <cr>

" visual 클립보드 복사
vmap <F3> "+y
" 클립보드 내용 붙여 넣기
nmap <F4> "+p

nmap <F5> :call IC_AnalyzingCode() <cr>
nmap <F6> :call IC_DailySummary() <cr>
nmap <F7> :call IC_FileSummary() <cr>
nmap <F8> A<tab>/* IAMROOT-12CD: 

" 커널분석용 설정
nmap <F9> :set ts=8 sw=8 sts=8 <cr>
" 일반 문서용 
nmap <F10> :set ts=4 sw=4 sts=4 <cr>
```

## linux kernel tag 생성
* make_tags.sh 스크립트 생성

```sh
$ cd ~/git/5.10
$ vim make_tags.sh
```

```sh
#!/bin/bash
TAGS="tags"
if [ "$1" == "emacs" ];then
	TAGS="TAGS"
fi

echo "make ${TAGS} ARCH=arm64"
make ${TAGS} ARCH=arm64 &
TAGS_PID=$!

echo "make cscope ARCH=arm64"
make cscope ARCH=arm64 &
CS_PID=$!

wait ${TAGS_PID} ${CS_PID}

echo done.
```

* make_tags.sh 실행

```sh
$ chmod +x make_tags.sh
$ ./make_tags.sh
```


### ARM64 리눅스 커널 분석 시작
* vim 실행

```sh
$ cd ~/git/5.10
$ vim
```

* vim에서 tags 사용

```vim
:ts {알고 싶은 함수나 전역변수, 파일명}

# 예제 (아래의 경우 :ts task_str 입력후 TAB키를 누르면 자동 완성됨)
:ts task_struct

# 원위치리로 오고 싶으면 ctrl + T 를 누르면 원위치로 돌아옴.

# 커서가 있는 함수나, 전역변수, struct를 알고 싶으면 해당 커서위에서
# ctrl + ] 를 누른다


# ctrl + ] -> ctrl + T 는 쌍을 이룸
```

* vim에서 cscope 사용

```vim
:cs find s {알고 싶은 함수나 전역변수, 파일명}
:cs f s {알고 싶은 함수나 전역변수, 파일명}
# 예제
:cs f s thread_info

:cs f e {string 형태로 정확하게 찾기 원할때}
# 예제 "struct thread_info {" 를 정확하게 찾기 원할때
:cs f e struct thread_info { 
# ctrl + T 를누르면 원위치로 돌아온다.
```


## 참조사이트
* [Iamroot ARM Kernel 분석 12차 D조][iamroot_utils]
* [문c 블로그][moon-c-blog]
* [류호은님 블로그][PR1ME's-blog]

[PR1Me's-blog]:	https://www.notion.so/PR1ME-s-Blog-21ccc53f274a4a728ee2a5c9bb3baa8c
[iamroot_utils]:	https://github.com/norux/iamroot_utils
[moon-c-blog]:	http://jake.dothome.co.kr/
