## Linux Kernel Debugging  on WSL

### 윈도우에 wsl  설치

1. wsl ubuntu 설치

```cmd
wsl --install -d Ubuntu-22.04
```

2. 윈도우 재부팅

3. wsl 실행
   ![wsl 실행 ](./assets/image-20240421132706990.png)

   

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
   $ cd git
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
   
   ARCH=arm64
   CROSS_COMPILE=aarch64-linux-gnu-
   
   KERNEL_TOP_PATH="$(cd "$(dirname "$0")" ; pwd -P)"
   BUILD_LOG="${KERNEL_TOP_PATH}/rpi_build_log.txt"
   
   echo "move kernel source"
   cd ${KERNEL_DIR}
   
   echo "make defconfig"
   make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- defconfig
   
   echo "kernel build"
   make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- Image modules dtbs -j$(nproc) 2>&1 | tee $BUILD_LOG
   ```

   ```sh
   $ chmod +x kbuild.sh
   ```

5. 커널 빌드
   ```sh
   $ cd ~/git
   $ ./kbuild.sh
   ```

### 커널  QEMU디버깅

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

### 터미널 환경설정

1. 복사, 붙여넣게 단축키 변경
   ![복사, 붙여넣기 변경](./assets/image-20240421140510270.png)



## 커널 분석 환경 설정

### tag, cscope  설정

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
   endiff
   
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
   :tags         --> 추척한 파일들 목록 보기.
   ,csc          --> cscope : Find functions calling this function
   ,csd          --> cscope : Find this definition
   ```

   

