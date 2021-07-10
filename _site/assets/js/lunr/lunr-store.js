var store = [{
        "title": "github.io blog 만들기",
        "excerpt":"github.io 블로그 만들기 github site repository 만들기 {자신의 github ID}.github.io repository 만들기 프로그램 설치 git, ruby 설치 $ sudo apt install git ruby jekyll, bundler, webrick 설치 $ gem install jekyll bundler webrick $ export PATH=$PATH:$HOME/.local/share/gem/ruby/3.0.0/bin 블로그 개설 $ wget https://github.com/mmistakes/minimal-mistakes/archive/refs/heads/master.zip $ unzip master.zip $ export PATH=$PATH:$HOME/.local/share/gem/ruby/3.0.0/bin 참조사이트 Github 블로그...","categories": ["github"],
        "tags": [],
        "url": "/github/test-post/",
        "teaser": null
      },{
        "title": "ARM64 리눅스 커널 소스 분석 준비",
        "excerpt":"리눅스 커널 소스 분석 준비 소스 분석 프로그램 설치 vim, git, ctags, cscope Debian 계열 $ sudo apt install vim git ctags cscope ArchLinux 계열 $ sudo pacman -S vim git ctags cscope linux kernel 가져오기 $ mkdir -p ~/git $ cd ~/git $ git clone https://github.com/iamroot18/5.10.git vim 설정 $...","categories": ["linux","kernel"],
        "tags": [],
        "url": "/linux/kernel/prepare-linux-kernel-analysis/",
        "teaser": null
      },{
        "title": "ARM64 리눅스 커널 빌드",
        "excerpt":"linux kernel 가져오기 $ mkdir -p ~/git $ cd ~/git $ git clone -b mnth https://github.com/iamroot18/5.10.git arm64 컴파일러 설치 # debian 계열 $ sudo apt install gcc-aarch64-linux-gnu # arch linux 계열 $ sudo pacman -S aarch64-linux-gnu-gcc CROSS 컴파일 환경 설정 $ export ARCH=arm64 $ export CROSS_COMPILE=aarch64-linux-gnu- 커널 컴파일 $ make...","categories": ["linux","kernel","iamroot"],
        "tags": [],
        "url": "/linux/kernel/iamroot/arm64-kernel-build/",
        "teaser": null
      },{
        "title": "IAMROOT 18차 스터디 7차",
        "excerpt":"ARM System Developer’s Guide 1장 ARM Embedded Systems CISC vs RISC 명령서 사이즈 CISC : nByte 가변크기 RISC : 2, 4, 8byte 고정크기 BUS - 7page AHB -&gt; AXI APB -&gt; ? Memory remapping - 14page 2장 ARM Processor Fundamentals ALU (arithmetic logic unit) MAC (multiply-accumulate unit) Registers R0 ~...","categories": ["linux","kernel","iamroot"],
        "tags": [],
        "url": "/linux/kernel/iamroot/iamroot18-7th/",
        "teaser": null
      }]
