---
​---
title: "Linux Kernel Debugging on WSL or ubuntu 20.04"
author: "임채훈"
date: "2024-05-12"
version: "1.4"
output: html_document
​---
---

## Linux Kernel Debugging on WSL or ubuntu 20.04

<div style="text-align: right"> 임채훈 infinite.run@gmail.com </div>
<div style="text-align: right">version 1.4 - 2024-05-12</div>

### 윈도우에 wsl  설치

1. wsl ubuntu 설치
   ```cmd
   c:\> wsl --install -d Ubuntu-22.04
   ```

   

2. 윈도우 재부팅

3. wsl 실행
   ![wsl 실행 ](./assets/image-20240421132706990.png)




### 터미널 환경설정

1. 복사, 붙여넣게 단축키 변경
   ![복사, 붙여넣기 변경](./assets/image-20240421140510270.png)



### 커널 컴파일

1. ubuntu 업그레이드

   ```sh
   $ sudo apt update
   $ sudo apt upgrade
   ```

2. 리눅스 크로스 컴파일러 설치
   ```sh
   $ sudo apt install -y gcc-aarch64-linux-gnu g++-aarch64-linux-gnu \
   	universal-ctags  cscope libssl-dev libncurses-dev \
   	autoconf automake autotools-dev curl libmpc-dev libmpfr-dev \
   	libgmp-dev gawk build-essential bison flex texinfo \
   	gperf libtool patchutils bc zlib1g-dev libexpat-dev \
   	binutils-aarch64-linux-gnu
   ```

3. 리눅스 커널 git clone
   ```sh
   $ mkdir ~/git/
   $ cd ~/git
   $ git clone https://github.com/torvalds/linux.git -b v6.4
   ```

4. 크로스 빌드 스크립트 작성
   ```sh
   $ cd ~/git
   $ vim kbuild.sh
   ```

   ```sh
   #!/bin/bash
   
   # kbuild.sh
   KERNEL_DIR=linux
   echo "configure build output path"
   
   KERNEL_TOP_PATH="$(cd "$(dirname "$0")" ; pwd -P)"
   BUILD_LOG="${KERNEL_TOP_PATH}/rpi_build_log.txt"
   
   export ARCH=arm64
   export CROSS_COMPILE=aarch64-linux-gnu-
   
   echo "move kernel source"
   cd ${KERNEL_DIR}
   
   echo "make defconfig"
   make defconfig
   
   echo "kernel build"
   make Image modules dtbs -j$(nproc) 2>&1 | tee $BUILD_LOG
   ```
   
   ```sh
   $ chmod +x kbuild.sh
   ```
   
5. 커널 빌드
   ```sh
   $ cd ~/git
   $ ./kbuild.sh
   ```

### 커널(start_kernel 이후)  QEMU디버깅

1. Qemu , gdb 설치

   ```sh
   $ sudo apt install  qemu-system-arm gdb-multiarch
   ```

2. Qemu 디버깅 스크립트 작성
   ```sh
   $ cd ~/git
   $ vim qemu-gdb.sh
   ```

   ```sh
   #!/bin/sh
   
   # qemu-gdb.sh
   OUT_DIR=linux
   
   qemu-system-aarch64 \
       -S \
       -machine virt \
       -cpu cortex-a57 \
       -machine type=virt \
       -nographic \
       -smp 4 \
       -m 4096 \
       -kernel ${OUT_DIR}/arch/arm64/boot/Image \
       --append "console=ttyAMA0 nokaslr" \
       -s &
   
   QEMU_PID=$!
   
   sleep 1
   
   echo gdb start...
   gdb-multiarch -ex "layout src" \
       -ex "set arch aarch64" \
       -ex "target remote localhost:1234" \
       -ex "b setup_arch" \
       ${OUT_DIR}/vmlinux
   
   kill -9 ${QEMU_PID}
   ```

3. 디버깅 시작

   ```sh
   $ cd ~/git
   $ chmod +x qemu-gdb.sh
   $ ./qemu-gdb.sh
   ```

   ![qemu-gdb](./assets/image-20240421135249494.png)

4. gdb 명령어 소개

   ```
   b {함수명}    브레이크 포인트 설정
     ex) (gdb) b setup_arch
     
   c             continue 실행 계속하기
     ex) (gdb) b setup_arch
         (gdb) c       --> setup_arch 까지 실행
         
   n             next 한라인 실행
     ex) (gdb) n      --> 한라인 실행
         (gdb) <enter> --> 엔터키만 누르면 이전 명령어 실행됨
   
   s             step 한 스텝실행(함수 안으로 들어감)
     ex) (gdb) s      --> 한라인 실행
         (gdb) <enter> --> 엔터키만 누르면 이전 명령어 실행됨
   
   p             변수 출력
     ex) (gdb) p boot_command_line   --> boot_command_line 변수 출력
         (gdb) p/10x boot_command_line  --> 헥사값 10개를 출력
   
   x             변수 출력
     ex) (gdb) x/s boot_command_line    --> boot_command_line 문자열을 출력
         (gdb) x/10x boot_command_line  --> 헥사값 10개를 출력
   
   i             infomation 정보출력
     ex) (gdb) i r TTMR0_EL1        --> TTMR0_EL1 레지스터 정보출력
   
   display       실행마다 변수출력
     ex) (gdb) display /10x boot_command_line --> 명령어 실행마다 boot_command_line 출력
         (gdb) n
            1: /x boot_command_line = {0x0 <repeats 2048 times>}
         (gdb) <enter>
            1: /x boot_command_line = {0x0 <repeats 2048 times>}
   
   delete        삭제
     ex) (gdb) delete display 1   --> 첫번째 display정보 삭제(위의 boot_command_line)
   ```
   



### 커널(head.S) QEMU디버깅

1. Qemu 디버깅 스크립트 작성

   ```sh
   $ cd ~/git
   $ vim qemu-gdb-headS.sh
   ```

   ```sh
   #!/bin/sh
   
   # qemu-gdb-headS.sh
   OUT_DIR=linux
   READELF_BIN=aarch64-linux-gnu-readelf
   PADDR_KIMG=0x40200000
   VADDR_KIMG=$(grep "\<_text\>" ${OUT_DIR}/System.map | head -1 |awk '{print "0x"$1}')
   VOFFSET=$(python3 -c "print(hex($VADDR_KIMG - $PADDR_KIMG))")
   
   SEC_HEAD_TEXT=$(${READELF_BIN} -S ${OUT_DIR}/vmlinux | grep ' \.head\.text ' |cut -c 10- |awk '{print "0x"$3}')
   SEC_RODATA_TEXT=$(${READELF_BIN} -S ${OUT_DIR}/vmlinux | grep ' \.rodata\.text ' |cut -c 10- |awk '{print "0x"$3}')
   SEC_INIT_TEXT=$(${READELF_BIN} -S ${OUT_DIR}/vmlinux | grep ' \.init\.text ' |cut -c 10- |awk '{print "0x"$3}')
   SEC_INIT_DATA=$(${READELF_BIN} -S ${OUT_DIR}/vmlinux | grep ' \.init\.data ' |cut -c 10- |awk '{print "0x"$3}')
   SEC_DATA=$(${READELF_BIN} -S ${OUT_DIR}/vmlinux | grep ' \.data ' |cut -c 10- |awk '{print "0x"$3}')
   SEC_ALT=$(${READELF_BIN} -S ${OUT_DIR}/vmlinux | grep ' \.altinstructions ' |cut -c 10- |awk '{print "0x"$3}')
   
   P_HEAD_TEXT=$(python3 -c "print(hex(${SEC_HEAD_TEXT} - ${VOFFSET}))")
   P_RODATA_TEXT=$(python3 -c "print(hex(${SEC_RODATA_TEXT} - ${VOFFSET}))")
   P_INIT_TEXT=$(python3 -c "print(hex(${SEC_INIT_TEXT} - ${VOFFSET}))")
   P_INIT_DATA=$(python3 -c "print(hex(${SEC_INIT_DATA} - ${VOFFSET}))")
   P_DATA=$(python3 -c "print(hex(${SEC_DATA} - ${VOFFSET}))")
   P_ALT=$(python3 -c "print(hex(${SEC_ALT} - ${VOFFSET}))")
   
   qemu-system-aarch64 \
   	-S \
       -machine virt \
       -cpu cortex-a57 \
       -machine type=virt \
       -nographic \
       -smp 4 \
       -m 4096 \
   	-kernel ${OUT_DIR}/arch/arm64/boot/Image \
       --append "console=ttyAMA0 nokaslr" \
       -s &
   
   QEMU_PID=$!
   
   sleep 1
   
   echo gdb start...
   gdb-multiarch -ex "layout asm" \
       -ex "set arch aarch64" \
   	-ex "layout reg" \
   	-ex "target remote localhost:1234" \
   	-ex "add-symbol-file ${OUT_DIR}/vmlinux \
   	-s .head.text ${P_HEAD_TEXT} \
   	-s .rodata.text ${P_RODATA_TEXT} \
   	-s .init.text ${P_INIT_TEXT} \
   	-s .init.data ${P_INIT_DATA} \
   	-s .data ${P_DATA} \
   	-s .altinstructions ${P_ALT} " \
   	-ex "b *0x40200000"
   
   kill -9 ${QEMU_PID}
   ```

2. 디버깅 시작

   ```sh
   $ cd ~/git
   $ chmod +x qemu-gdb-headS.sh
   $ ./qemu-gdb-headS.sh
   ```

   ![qemu-gdb-headS](/home/fehead/.config/Typora/typora-user-images/image-20240512162245911.png)

   ```gdb
   #엔터키, y 입력
   dd symbol table from file "out2/vmlinux" at
           .head.text_addr = 0x40200000
           .rodata.text_addr = 0x41c6f800
           .init.text_addr = 0x41c80000
           .init.data_addr = 0x41d75000
           .data_addr = 0x424d0000
           .altinstructions_addr = 0x41d15404
   (y or n) y
   Reading symbols from out2/vmlinux...
   +b *0x40200000
   (gdb) c  <-- c(continue) 입력
   +c
   Continuing.
   
   Thread 1 hit Breakpoint 1, 0x0000000040200000 in _text ()
   (gdb) ni  <-- ni(next instruction) 입력 다음 어셈블리 명령어 실행
   
   ```

3. gdb 명령어 소개 -  어셈블리용

   ```
   b {레이블,*주소}    브레이크 포인트 설정
     ex) (gdb) b primary_entry
         (gdb) b *0x41c740a8    --> 0x41c740a8 주소에 브레이크 포인트 설정
     
   c             continue 실행 계속하기
     ex) (gdb) b *0x41c740a8 
         (gdb) c       --> 0x41c740a8 주소까지 실행
         
   ni            next instrction 한개의  명령어 실행
     ex) (gdb) ni      --> 한개의  명령어 실행
         (gdb) <enter> --> 엔터키만 누르면 이전 명령어 실행됨
   
   si            step instrction 한개의 명령어 스텝실행(함수 안으로 들어감)
     ex) (gdb) si      --> 한개의  명령어 실행
         (gdb) <enter> --> 엔터키만 누르면 이전 명령어 실행됨
   
   i             infomation 정보출력
     ex) (gdb) i r TTBR0_EL1        --> TTMR0_EL1 레지스터 정보출력
         (gdb) i r TTB<tab키 2회시 자동완성>
   ```

   



### 커널 분석 환경 설정

1. tag, cscope 설치
   ```sh
   $ sudo apt install -y universal-ctags  cscope
   ```

2. tag, cscope 생성 스크립트 작성

   ```sh
   $ mkdir ~/bin
   $ cd ~/bin
   $ vim make_tags.sh
   ```

   ```sh
   #!/bin/sh
   
   # ~/bin/make_tags.sh
   make ARCH=arm64 tags cscope -j$(nproc)
   ```

   ```sh
   $ chmod +x ~/bin/make_tags.sh
   ```

3. kernel tag 생성

   ```sh
   # wsl 터미널 한번은 재시작 필요함
   $ cd ~/git/linux
   $ make_tags.sh
   ```

4. vim script 생성

   ```sh
   $ cd ~
   $ mv .vimrc .vimrc.bak
   $ vi .vimrc
   ```

   ```
   set diffopt+=iwhite
   
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
   set mouse=
   set ls=2	"last statusbar
   
   syntax on
   set cc=80	" 80라인 컬럼 표시
   colorscheme ron
   
   "============ kernel source 경로 ===========
   let kernel_src_home=$PWD
   "============ ctags, scope 경로 ===========
   if filereadable(kernel_src_home . "/cscope.out")
   	set sw=8 ts=8 sts=8
   	exe "set tags+=" . kernel_src_home . "/tags"
   	exe "cscope add " . kernel_src_home . "/cscope.out"
   endif
   
   set csprg=/usr/bin/cscope
   set nocsverb
   set csverb
   set csto=0
   set csre
   set cst
   
   "============= cscope 설정 ===========
   "Find this C Symbol
   func! Css()
   	let css = expand("<cword>")
   	" new
   	exe "cs find s ".css
   	if getline(1) == ""
   		exe "q!"
   	endif
   endfunc
   nmap ,css :call Css() <cr>
   
   "Find functions calling this function
   func! Csc()
   	let csc = expand("<cword>")
   	" new
   	exe "cs find c ".csc
   	if getline(1) == ""
   		exe "q!"
   	endif
   endfunc
   nmap ,csc :call Csc() <cr>
   
   "Find functions called by this function
   func! Csd()
   	let csd = expand("<cword>")
   	" new
   	exe "cs find d ".csd
   	if getline(1) == ""
   		exe "q!"
   	endif
   endfunc
   nmap ,csd :call Csd() <cr>
   
   "Find this definition
   func! Csg()
   	let csg = expand("<cword>")
   	" new
   	exe "cs find g ".csg
   	if getline(1) == ""
   		exe "q!"
   	endif
   endfunc
   nmap ,csg :call Csg() <cr>
   
   "=============== man page ================
   func! Man()
   	let sm = expand("<cword>")
   	exe "!man -S 2:3:4:5:6:7:8:9:tcl:n:l:p:o ".sm
   endfunc
   nmap ,m :call Man()<cr><cr>
   
   nmap <F2> <esc>:set nu! <cr>
   
   nmap <F8> <ESC>O/* IAMROOT20 <C-R>=strftime("%Y%m%d")<CR><CR><SPACE>*<SPACE><CR>*/<ESC><UP><END>a
   nmap <F9> <ESC>a/* IAMROOT20 <C-R>=strftime("%Y%m%d")<CR><SPACE>*/<LEFT><ESC>
   ```

5. 커널 소스 분석

   ```sh
   $ cd ~/git/linux
   # linux 커널 소스 최상위 디렉토리에서 vim를 실행해야함.
   $ vim       # 혹은 vim -t setup_arch
   ```

6. 커널 분석이동 vim 명령어

   ```
   ESC키를 눌러 명령어 상태에서 함수나 변수위에서
   # 아래 3개만 알면 대충 됩니다. 
   ctrl + ]      --> 해당 tag(심볼, 함수로) 로 이동
   ctrl + t      --> 소스로 복귀
   ,css          --> 해당 cscope(심볼, 함수로) 로 이동
   
   # 추가로 알면 좋을것들.
   :tag setup_arch --> 해당 tag로 이동
   :tag head.S   --> 해당 파일로 이동
   :tags         --> 추척한 파일들 목록 보기.
   ,csc          --> cscope : Find functions calling this function
   ,csd          --> cscope : Find this definition
   ```
   
   

