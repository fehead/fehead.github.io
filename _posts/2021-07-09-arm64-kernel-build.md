---
title: "ARM64 리눅스 커널 빌드"
date: 2021-07-09 13:43:00
categories: linux kernel iamroot
---

# linux kernel 가져오기
```sh
$ mkdir -p ~/git
$ cd ~/git
$ git clone https://github.com/iamroot18/5.10.git
```

# arm64 컴파일러 설치

```sh
# debian 계열
$ sudo apt install gcc-aarch64-linux-gnu

# arch linux 계열
$ sudo pacman -S aarch64-linux-gnu-gcc
```

# CROSS 컴파일 환경 설정
```sh
$ export ARCH=arm64
$ export CROSS_COMPILE=aarch64-linux-gnu-
```

# 커널 컴파일
```sh
$ make defconfig
$ make -j$(nproc)
```

# 커널 확인
```sh
$ ls vmlinux System.map
System.map  vmlinux
$
```

# 커널 시작 코드 disassemble

* arch/arm64/kernel/head.S 파일 

```S
# vim arch/arm64/kernel/head.S
_head:
        /*
         * DO NOT MODIFY. Image header expected by Linux boot-loaders.
         */
#ifdef CONFIG_EFI
        /*
         * This add instruction has no meaningful effect except that
         * its opcode forms the magic "MZ" signature required by UEFI.
         */
        add     x13, x18, #0x16
        b       primary_entry
#else
        b       primary_entry                   // branch to kernel start, magic
        .long   0                               // reserved
#endif
        .quad   0                               // Image load offset from start of RAM, little-endian
        le64sym _kernel_size_le                 // Effective size of kernel image, little-endian
        le64sym _kernel_flags_le                // Informative flags, little-endian
        .quad   0                               // reserved
        .quad   0                               // reserved
        .quad   0                               // reserved
        .ascii  ARM64_IMAGE_MAGIC               // Magic number
```

* _head 심볼 찾기

```sh
$ grep " _head$" System.map
ffff800010000000 t _head
```

* _head disassemble

```sh
$ aarch64-linux-gnu-objdump --start-address=0xffff800010000000 --stop-address=0xffff800010000010 -d vmlinux
ffff800010000000 <_text>:
ffff800010000000:	91005a4d 	add	x13, x18, #0x16
ffff800010000004:	14563fff 	b	ffff800011590000 <primary_entry>
```

* _primary_entry disassemble

```sh
$ grep " primary_entry$" System.map
ffff800011590000 T primary_entry
```

```sh
$ aarch64-linux-gnu-objdump --start-address=0xffff800011590000 --stop-address=0xffff800011590100 -d vmlinux
ffff800011590000 <primary_entry>:
ffff800011590000:	94000008 	bl	ffff800011590020 <preserve_boot_args>
ffff800011590004:	97e1efff 	bl	ffff800010e0c000 <el2_setup>
ffff800011590008:	90ff5397 	adrp	x23, ffff800010000000 <_text>
ffff80001159000c:	924052f7 	and	x23, x23, #0x1fffff
ffff800011590010:	97e1f05d 	bl	ffff800010e0c184 <set_cpu_boot_mode_flag>
ffff800011590014:	9400000b 	bl	ffff800011590040 <__create_page_tables>
ffff800011590018:	97e1f1b5 	bl	ffff800010e0c6ec <__cpu_setup>
ffff80001159001c:	17e1f0d8 	b	ffff800010e0c37c <__primary_switch>
```

* 비슷하게 해당 심볼 disassemble

```sh
$ grep " preserve_boot_args$" System.map
ffff800011590020 t preserve_boot_args

$ aarch64-linux-gnu-objdump --start-address=0xffff800011590020 --stop-address=0xffff800011590050 -d vmlinux
ffff800011590020 <preserve_boot_args>:
ffff800011590020:	aa0003f5 	mov	x21, x0
ffff800011590024:	d0002e20 	adrp	x0, ffff800011b56000 <boot_args>
ffff800011590028:	91000000 	add	x0, x0, #0x0
ffff80001159002c:	a9000415 	stp	x21, x1, [x0]
ffff800011590030:	a9010c02 	stp	x2, x3, [x0, #16]
ffff800011590034:	d5033fbf 	dmb	sy
ffff800011590038:	d2800401 	mov	x1, #0x20                  	// #32
ffff80001159003c:	17aa9a00 	b	ffff80001003683c <__inval_dcache_area>
```

```sh
$ grep " __inval_dcache_area$" System.map
ffff80001003683c T __inval_dcache_area

$ aarch64-linux-gnu-objdump --start-address=0xffff80001003683c --stop-address=0xffff800010036a00 -d vmlinux
ffff80001003683c <__inval_dcache_area>:
ffff80001003683c:	d503245f 	bti	c
ffff800010036840:	8b000021 	add	x1, x1, x0
ffff800010036844:	d53b0023 	mrs	x3, ctr_el0
ffff800010036848:	d503201f 	nop
ffff80001003684c:	d3504c63 	ubfx	x3, x3, #16, #4
ffff800010036850:	d2800082 	mov	x2, #0x4                   	// #4
ffff800010036854:	9ac32042 	lsl	x2, x2, x3
ffff800010036858:	d1000443 	sub	x3, x2, #0x1
ffff80001003685c:	ea03003f 	tst	x1, x3
ffff800010036860:	8a230021 	bic	x1, x1, x3
ffff800010036864:	54000040 	b.eq	ffff80001003686c <__inval_dcache_area+0x30>  // b.none
ffff800010036868:	d50b7e21 	dc	civac, x1
ffff80001003686c:	ea03001f 	tst	x0, x3
ffff800010036870:	8a230000 	bic	x0, x0, x3
ffff800010036874:	54000060 	b.eq	ffff800010036880 <__inval_dcache_area+0x44>  // b.none
ffff800010036878:	d50b7e20 	dc	civac, x0
ffff80001003687c:	14000002 	b	ffff800010036884 <__inval_dcache_area+0x48>
ffff800010036880:	d5087620 	dc	ivac, x0
ffff800010036884:	8b020000 	add	x0, x0, x2
ffff800010036888:	eb01001f 	cmp	x0, x1
ffff80001003688c:	54ffffa3 	b.cc	ffff800010036880 <__inval_dcache_area+0x44>  // b.lo, b.ul, b.last
ffff800010036890:	d5033f9f 	dsb	sy
ffff800010036894:	d65f03c0 	ret
```

```sh
$ grep " el2_setup$" System.map
ffff800010e0c000 T el2_setup

$ aarch64-linux-gnu-objdump --start-address=0xffff800010e0c000 --stop-address=0xffff800010e0c200 -d vmlinux
ffff800010e0c000 <el2_setup>:
ffff800010e0c000:	d503245f 	bti	c
ffff800010e0c004:	d50041bf 	msr	spsel, #0x1
ffff800010e0c008:	d5384240 	mrs	x0, currentel
ffff800010e0c00c:	f100201f 	cmp	x0, #0x8
ffff800010e0c010:	540000e0 	b.eq	ffff800010e0c02c <el2_setup+0x2c>  // b.none
ffff800010e0c014:	d2a60a00 	mov	x0, #0x30500000            	// #810549248
ffff800010e0c018:	f2810000 	movk	x0, #0x800
ffff800010e0c01c:	d5181000 	msr	sctlr_el1, x0
ffff800010e0c020:	5281c220 	mov	w0, #0xe11                 	// #3601
ffff800010e0c024:	d5033fdf 	isb
ffff800010e0c028:	d65f03c0 	ret
ffff800010e0c02c:	d2a618a0 	mov	x0, #0x30c50000            	// #818216960
ffff800010e0c030:	f2810600 	movk	x0, #0x830
ffff800010e0c034:	d51c1000 	msr	sctlr_el2, x0
ffff800010e0c038:	d5380722 	mrs	x2, id_aa64mmfr1_el1
ffff800010e0c03c:	d3482c42 	ubfx	x2, x2, #8, #4
ffff800010e0c040:	d2e02000 	mov	x0, #0x100000000000000     	// #72057594037927936
ffff800010e0c044:	f2c06000 	movk	x0, #0x300, lsl #32
ffff800010e0c048:	f2b00000 	movk	x0, #0x8000, lsl #16
ffff800010e0c04c:	f2800000 	movk	x0, #0x0
ffff800010e0c050:	b4000082 	cbz	x2, ffff800010e0c060 <set_hcr>
ffff800010e0c054:	d2c00080 	mov	x0, #0x400000000           	// #17179869184
ffff800010e0c058:	f2b10000 	movk	x0, #0x8800, lsl #16
ffff800010e0c05c:	f2800000 	movk	x0, #0x0

ffff800010e0c060 <set_hcr>:
ffff800010e0c060:	d51c1100 	msr	hcr_el2, x0
ffff800010e0c064:	d5033fdf 	isb
ffff800010e0c068:	b5000082 	cbnz	x2, ffff800010e0c078 <set_hcr+0x18>
ffff800010e0c06c:	d53ce100 	mrs	x0, cnthctl_el2
ffff800010e0c070:	b2400400 	orr	x0, x0, #0x3
ffff800010e0c074:	d51ce100 	msr	cnthctl_el2, x0
ffff800010e0c078:	d51ce07f 	msr	cntvoff_el2, xzr
ffff800010e0c07c:	d5380400 	mrs	x0, id_aa64pfr0_el1
ffff800010e0c080:	d3586c00 	ubfx	x0, x0, #24, #4
ffff800010e0c084:	b4000120 	cbz	x0, ffff800010e0c0a8 <set_hcr+0x48>
ffff800010e0c088:	d53cc9a0 	mrs	x0, s3_4_c12_c9_5
ffff800010e0c08c:	b2400000 	orr	x0, x0, #0x1
ffff800010e0c090:	b27d0000 	orr	x0, x0, #0x8
ffff800010e0c094:	d51cc9a0 	msr	s3_4_c12_c9_5, x0
ffff800010e0c098:	d5033fdf 	isb
ffff800010e0c09c:	d53cc9a0 	mrs	x0, s3_4_c12_c9_5
ffff800010e0c0a0:	36000040 	tbz	w0, #0, ffff800010e0c0a8 <set_hcr+0x48>
ffff800010e0c0a4:	d51ccb1f 	msr	s3_4_c12_c11_0, xzr
ffff800010e0c0a8:	d5380000 	mrs	x0, midr_el1
ffff800010e0c0ac:	d53800a1 	mrs	x1, mpidr_el1
ffff800010e0c0b0:	d51c0000 	msr	vpidr_el2, x0
ffff800010e0c0b4:	d51c00a1 	msr	vmpidr_el2, x1
ffff800010e0c0b8:	d51c117f 	msr	hstr_el2, xzr
ffff800010e0c0bc:	d5380501 	mrs	x1, id_aa64dfr0_el1
ffff800010e0c0c0:	93482c20 	sbfx	x0, x1, #8, #4
ffff800010e0c0c4:	f100041f 	cmp	x0, #0x1
ffff800010e0c0c8:	5400006b 	b.lt	ffff800010e0c0d4 <set_hcr+0x74>  // b.tstop
ffff800010e0c0cc:	d53b9c00 	mrs	x0, pmcr_el0
ffff800010e0c0d0:	d34b3c00 	ubfx	x0, x0, #11, #5
ffff800010e0c0d4:	9a80b3e3 	csel	x3, xzr, x0, lt  // lt = tstop
ffff800010e0c0d8:	d3608c20 	ubfx	x0, x1, #32, #4
ffff800010e0c0dc:	b4000160 	cbz	x0, ffff800010e0c108 <set_hcr+0xa8>
ffff800010e0c0e0:	b5000122 	cbnz	x2, ffff800010e0c104 <set_hcr+0xa4>
ffff800010e0c0e4:	d5389ae4 	mrs	x4, pmbidr_el1
ffff800010e0c0e8:	927c0084 	and	x4, x4, #0x10
ffff800010e0c0ec:	b5000064 	cbnz	x4, ffff800010e0c0f8 <set_hcr+0x98>
ffff800010e0c0f0:	d2800a04 	mov	x4, #0x50                  	// #80
ffff800010e0c0f4:	d51c9904 	msr	pmscr_el2, x4
ffff800010e0c0f8:	d2860001 	mov	x1, #0x3000                	// #12288
ffff800010e0c0fc:	aa010063 	orr	x3, x3, x1
ffff800010e0c100:	14000002 	b	ffff800010e0c108 <set_hcr+0xa8>
ffff800010e0c104:	b2720063 	orr	x3, x3, #0x4000
ffff800010e0c108:	d51c1123 	msr	mdcr_el2, x3
ffff800010e0c10c:	d5380721 	mrs	x1, id_aa64mmfr1_el1
ffff800010e0c110:	d3504c20 	ubfx	x0, x1, #16, #4
ffff800010e0c114:	b4000040 	cbz	x0, ffff800010e0c11c <set_hcr+0xbc>
ffff800010e0c118:	d518a47f 	msr	s3_0_c10_c4_3, xzr
ffff800010e0c11c:	d51c211f 	msr	vttbr_el2, xzr
ffff800010e0c120:	b4000082 	cbz	x2, ffff800010e0c130 <install_el2_stub>
ffff800010e0c124:	5281c240 	mov	w0, #0xe12                 	// #3602
ffff800010e0c128:	d5033fdf 	isb
ffff800010e0c12c:	d65f03c0 	ret

ffff800010e0c130 <install_el2_stub>:
ffff800010e0c130:	d2a60a00 	mov	x0, #0x30500000            	// #810549248
ffff800010e0c134:	f2810000 	movk	x0, #0x800
ffff800010e0c138:	d5181000 	msr	sctlr_el1, x0
ffff800010e0c13c:	d2867fe0 	mov	x0, #0x33ff                	// #13311
ffff800010e0c140:	d51c1140 	msr	cptr_el2, x0
ffff800010e0c144:	d5380401 	mrs	x1, id_aa64pfr0_el1
ffff800010e0c148:	d3608c21 	ubfx	x1, x1, #32, #4
ffff800010e0c14c:	b40000c1 	cbz	x1, ffff800010e0c164 <install_el2_stub+0x34>
ffff800010e0c150:	9277f800 	and	x0, x0, #0xfffffffffffffeff
ffff800010e0c154:	d51c1140 	msr	cptr_el2, x0
ffff800010e0c158:	d5033fdf 	isb
ffff800010e0c15c:	d2803fe1 	mov	x1, #0x1ff                 	// #511
ffff800010e0c160:	d51c1201 	msr	zcr_el2, x1
ffff800010e0c164:	d0ffffa0 	adrp	x0, ffff800010e02000 <__hyp_stub_vectors>
ffff800010e0c168:	91000000 	add	x0, x0, #0x0
ffff800010e0c16c:	d51cc000 	msr	vbar_el2, x0
ffff800010e0c170:	d28078a0 	mov	x0, #0x3c5                 	// #965
ffff800010e0c174:	d51c4000 	msr	spsr_el2, x0
ffff800010e0c178:	d51c403e 	msr	elr_el2, x30
ffff800010e0c17c:	5281c240 	mov	w0, #0xe12                 	// #3602
ffff800010e0c180:	d69f03e0 	eret

```

```sh
$ grep " set_cpu_boot_mode_flag$" System.map
ffff800010e0c184 t set_cpu_boot_mode_flag

$ aarch64-linux-gnu-objdump --start-address=0xffff800010e0c184 --stop-address=0xffff800010e0c200 -d vmlinux
ffff800010e0c184 <set_cpu_boot_mode_flag>:
ffff800010e0c184:	d503245f 	bti	c
ffff800010e0c188:	d0007fe1 	adrp	x1, ffff800011e0a000 <__kvm_nvhe_$d+0x145c8>
ffff800010e0c18c:	91200021 	add	x1, x1, #0x800
ffff800010e0c190:	7138481f 	cmp	w0, #0xe12
ffff800010e0c194:	54000041 	b.ne	ffff800010e0c19c <set_cpu_boot_mode_flag+0x18>  // b.any
ffff800010e0c198:	91001021 	add	x1, x1, #0x4
ffff800010e0c19c:	b9000020 	str	w0, [x1]
ffff800010e0c1a0:	d5033fbf 	dmb	sy
ffff800010e0c1a4:	d5087621 	dc	ivac, x1
ffff800010e0c1a8:	d65f03c0 	ret

```

```sh
$ grep " __create_page_tables$" System.map
ffff800011590040 t __create_page_tables

$ aarch64-linux-gnu-objdump --start-address=0xffff800011590040 --stop-address=0xffff800011590200 -d vmlinux
ffff800011590040 <__create_page_tables>:
ffff800011590040:	d503245f 	bti	c
ffff800011590044:	aa1e03fc 	mov	x28, x30
ffff800011590048:	b00047e0 	adrp	x0, ffff800011e8d000 <init_pg_dir>
ffff80001159004c:	d0004801 	adrp	x1, ffff800011e92000 <init_pg_end>
ffff800011590050:	cb000021 	sub	x1, x1, x0
ffff800011590054:	97aa99fa 	bl	ffff80001003683c <__inval_dcache_area>
ffff800011590058:	b00047e0 	adrp	x0, ffff800011e8d000 <init_pg_dir>
ffff80001159005c:	d0004801 	adrp	x1, ffff800011e92000 <init_pg_end>
ffff800011590060:	cb000021 	sub	x1, x1, x0
ffff800011590064:	a8817c1f 	stp	xzr, xzr, [x0], #16
ffff800011590068:	a8817c1f 	stp	xzr, xzr, [x0], #16
ffff80001159006c:	a8817c1f 	stp	xzr, xzr, [x0], #16
ffff800011590070:	a8817c1f 	stp	xzr, xzr, [x0], #16
ffff800011590074:	f1010021 	subs	x1, x1, #0x40
ffff800011590078:	54ffff61 	b.ne	ffff800011590064 <__create_page_tables+0x24>  // b.any
ffff80001159007c:	d280e027 	mov	x7, #0x701                 	// #1793
ffff800011590080:	90ffff60 	adrp	x0, ffff80001157c000 <__end_rodata>
ffff800011590084:	90ffc3e3 	adrp	x3, ffff800010e0c000 <el2_setup>
ffff800011590088:	d2800605 	mov	x5, #0x30                  	// #48
ffff80001159008c:	d00043c6 	adrp	x6, ffff800011e0a000 <__kvm_nvhe_$d+0x145c8>
ffff800011590090:	912040c6 	add	x6, x6, #0x810
ffff800011590094:	f90000c5 	str	x5, [x6]
ffff800011590098:	d5033fbf 	dmb	sy
ffff80001159009c:	d5087626 	dc	ivac, x6
ffff8000115900a0:	90ffc3e5 	adrp	x5, ffff800010e0c000 <el2_setup>
ffff8000115900a4:	dac010a5 	clz	x5, x5
ffff8000115900a8:	f10040bf 	cmp	x5, #0x10
ffff8000115900ac:	5400012a 	b.ge	ffff8000115900d0 <__create_page_tables+0x90>  // b.tcont
ffff8000115900b0:	f0002ea6 	adrp	x6, ffff800011b67000 <__compound_literal.18+0x10>
ffff8000115900b4:	911160c6 	add	x6, x6, #0x458
ffff8000115900b8:	f90000c5 	str	x5, [x6]
ffff8000115900bc:	d5033fbf 	dmb	sy
ffff8000115900c0:	d5087626 	dc	ivac, x6
ffff8000115900c4:	d2804004 	mov	x4, #0x200                 	// #512
ffff8000115900c8:	f0002ea5 	adrp	x5, ffff800011b67000 <__compound_literal.18+0x10>
ffff8000115900cc:	f90230a4 	str	x4, [x5, #1120]
ffff8000115900d0:	f0002ea4 	adrp	x4, ffff800011b67000 <__compound_literal.18+0x10>
ffff8000115900d4:	f9423084 	ldr	x4, [x4, #1120]
ffff8000115900d8:	aa0303e5 	mov	x5, x3
ffff8000115900dc:	90ffc3e6 	adrp	x6, ffff800010e0c000 <el2_setup>
ffff8000115900e0:	912060c6 	add	x6, x6, #0x818
ffff8000115900e4:	91400401 	add	x1, x0, #0x1, lsl #12
ffff8000115900e8:	aa0103ee 	mov	x14, x1
ffff8000115900ec:	d280000d 	mov	x13, #0x0                   	// #0
ffff8000115900f0:	d367fccb 	lsr	x11, x6, #39
ffff8000115900f4:	aa0403ea 	mov	x10, x4
ffff8000115900f8:	d100054a 	sub	x10, x10, #0x1
ffff8000115900fc:	8a0a016b 	and	x11, x11, x10
ffff800011590100:	aa0403ea 	mov	x10, x4
ffff800011590104:	9b0d7d4a 	mul	x10, x10, x13
ffff800011590108:	8b0a016b 	add	x11, x11, x10
ffff80001159010c:	d367fc6a 	lsr	x10, x3, #39
ffff800011590110:	aa0403ed 	mov	x13, x4
ffff800011590114:	d10005ad 	sub	x13, x13, #0x1
ffff800011590118:	8a0d014a 	and	x10, x10, x13
ffff80001159011c:	cb0a016d 	sub	x13, x11, x10
ffff800011590120:	aa0103ec 	mov	x12, x1
ffff800011590124:	b240058c 	orr	x12, x12, #0x3
ffff800011590128:	f82a780c 	str	x12, [x0, x10, lsl #3]
ffff80001159012c:	91400421 	add	x1, x1, #0x1, lsl #12
ffff800011590130:	9100054a 	add	x10, x10, #0x1
ffff800011590134:	eb0b015f 	cmp	x10, x11
ffff800011590138:	54ffff49 	b.ls	ffff800011590120 <__create_page_tables+0xe0>  // b.plast
ffff80001159013c:	aa0e03e0 	mov	x0, x14
ffff800011590140:	aa0103ee 	mov	x14, x1
ffff800011590144:	d35efccb 	lsr	x11, x6, #30
ffff800011590148:	d280400a 	mov	x10, #0x200                 	// #512
ffff80001159014c:	d100054a 	sub	x10, x10, #0x1
ffff800011590150:	8a0a016b 	and	x11, x11, x10
ffff800011590154:	d280400a 	mov	x10, #0x200                 	// #512
ffff800011590158:	9b0d7d4a 	mul	x10, x10, x13
ffff80001159015c:	8b0a016b 	add	x11, x11, x10
ffff800011590160:	d35efc6a 	lsr	x10, x3, #30
ffff800011590164:	d280400d 	mov	x13, #0x200                 	// #512
ffff800011590168:	d10005ad 	sub	x13, x13, #0x1
ffff80001159016c:	8a0d014a 	and	x10, x10, x13
ffff800011590170:	cb0a016d 	sub	x13, x11, x10
ffff800011590174:	aa0103ec 	mov	x12, x1
ffff800011590178:	b240058c 	orr	x12, x12, #0x3
ffff80001159017c:	f82a780c 	str	x12, [x0, x10, lsl #3]
ffff800011590180:	91400421 	add	x1, x1, #0x1, lsl #12
ffff800011590184:	9100054a 	add	x10, x10, #0x1
ffff800011590188:	eb0b015f 	cmp	x10, x11
ffff80001159018c:	54ffff49 	b.ls	ffff800011590174 <__create_page_tables+0x134>  // b.plast
ffff800011590190:	aa0e03e0 	mov	x0, x14
ffff800011590194:	d355fccb 	lsr	x11, x6, #21
ffff800011590198:	d280400a 	mov	x10, #0x200                 	// #512
ffff80001159019c:	d100054a 	sub	x10, x10, #0x1
ffff8000115901a0:	8a0a016b 	and	x11, x11, x10
ffff8000115901a4:	d280400a 	mov	x10, #0x200                 	// #512
ffff8000115901a8:	9b0d7d4a 	mul	x10, x10, x13
ffff8000115901ac:	8b0a016b 	add	x11, x11, x10
ffff8000115901b0:	d355fc6a 	lsr	x10, x3, #21
ffff8000115901b4:	d280400d 	mov	x13, #0x200                 	// #512
ffff8000115901b8:	d10005ad 	sub	x13, x13, #0x1
ffff8000115901bc:	8a0d014a 	and	x10, x10, x13
ffff8000115901c0:	cb0a016d 	sub	x13, x11, x10
ffff8000115901c4:	926ba86d 	and	x13, x3, #0xffffffffffe00000
ffff8000115901c8:	aa0d03ec 	mov	x12, x13
ffff8000115901cc:	aa07018c 	orr	x12, x12, x7
ffff8000115901d0:	f82a780c 	str	x12, [x0, x10, lsl #3]
ffff8000115901d4:	914801ad 	add	x13, x13, #0x200, lsl #12
ffff8000115901d8:	9100054a 	add	x10, x10, #0x1
ffff8000115901dc:	eb0b015f 	cmp	x10, x11
ffff8000115901e0:	54ffff49 	b.ls	ffff8000115901c8 <__create_page_tables+0x188>  // b.plast
ffff8000115901e4:	b00047e0 	adrp	x0, ffff800011e8d000 <init_pg_dir>
ffff8000115901e8:	92cfffe5 	mov	x5, #0xffff8000ffffffff    	// #-140733193388033
ffff8000115901ec:	f2a20005 	movk	x5, #0x1000, lsl #16
ffff8000115901f0:	f2800005 	movk	x5, #0x0
ffff8000115901f4:	8b1700a5 	add	x5, x5, x23
ffff8000115901f8:	d2804004 	mov	x4, #0x200                 	// #512
ffff8000115901fc:	90004886 	adrp	x6, ffff800011ea0000 <_end>
ffff800011590200:	90ff5383 	adrp	x3, ffff800010000000 <_text>
ffff800011590204:	cb0300c6 	sub	x6, x6, x3
ffff800011590208:	8b0500c6 	add	x6, x6, x5
ffff80001159020c:	91400401 	add	x1, x0, #0x1, lsl #12
ffff800011590210:	aa0103ee 	mov	x14, x1
ffff800011590214:	d280000d 	mov	x13, #0x0                   	// #0
ffff800011590218:	d367fccb 	lsr	x11, x6, #39
ffff80001159021c:	aa0403ea 	mov	x10, x4
ffff800011590220:	d100054a 	sub	x10, x10, #0x1
ffff800011590224:	8a0a016b 	and	x11, x11, x10
ffff800011590228:	aa0403ea 	mov	x10, x4
ffff80001159022c:	9b0d7d4a 	mul	x10, x10, x13
ffff800011590230:	8b0a016b 	add	x11, x11, x10
ffff800011590234:	d367fcaa 	lsr	x10, x5, #39
ffff800011590238:	aa0403ed 	mov	x13, x4
ffff80001159023c:	d10005ad 	sub	x13, x13, #0x1
ffff800011590240:	8a0d014a 	and	x10, x10, x13
ffff800011590244:	cb0a016d 	sub	x13, x11, x10
ffff800011590248:	aa0103ec 	mov	x12, x1
ffff80001159024c:	b240058c 	orr	x12, x12, #0x3
ffff800011590250:	f82a780c 	str	x12, [x0, x10, lsl #3]
ffff800011590254:	91400421 	add	x1, x1, #0x1, lsl #12
ffff800011590258:	9100054a 	add	x10, x10, #0x1
ffff80001159025c:	eb0b015f 	cmp	x10, x11
ffff800011590260:	54ffff49 	b.ls	ffff800011590248 <__create_page_tables+0x208>  // b.plast
ffff800011590264:	aa0e03e0 	mov	x0, x14
ffff800011590268:	aa0103ee 	mov	x14, x1
ffff80001159026c:	d35efccb 	lsr	x11, x6, #30
ffff800011590270:	d280400a 	mov	x10, #0x200                 	// #512
ffff800011590274:	d100054a 	sub	x10, x10, #0x1
ffff800011590278:	8a0a016b 	and	x11, x11, x10
ffff80001159027c:	d280400a 	mov	x10, #0x200                 	// #512
ffff800011590280:	9b0d7d4a 	mul	x10, x10, x13
ffff800011590284:	8b0a016b 	add	x11, x11, x10
ffff800011590288:	d35efcaa 	lsr	x10, x5, #30
ffff80001159028c:	d280400d 	mov	x13, #0x200                 	// #512
ffff800011590290:	d10005ad 	sub	x13, x13, #0x1
ffff800011590294:	8a0d014a 	and	x10, x10, x13
ffff800011590298:	cb0a016d 	sub	x13, x11, x10
ffff80001159029c:	aa0103ec 	mov	x12, x1
ffff8000115902a0:	b240058c 	orr	x12, x12, #0x3
ffff8000115902a4:	f82a780c 	str	x12, [x0, x10, lsl #3]
ffff8000115902a8:	91400421 	add	x1, x1, #0x1, lsl #12
ffff8000115902ac:	9100054a 	add	x10, x10, #0x1
ffff8000115902b0:	eb0b015f 	cmp	x10, x11
ffff8000115902b4:	54ffff49 	b.ls	ffff80001159029c <__create_page_tables+0x25c>  // b.plast
ffff8000115902b8:	aa0e03e0 	mov	x0, x14
ffff8000115902bc:	d355fccb 	lsr	x11, x6, #21
ffff8000115902c0:	d280400a 	mov	x10, #0x200                 	// #512
ffff8000115902c4:	d100054a 	sub	x10, x10, #0x1
ffff8000115902c8:	8a0a016b 	and	x11, x11, x10
ffff8000115902cc:	d280400a 	mov	x10, #0x200                 	// #512
ffff8000115902d0:	9b0d7d4a 	mul	x10, x10, x13
ffff8000115902d4:	8b0a016b 	add	x11, x11, x10
ffff8000115902d8:	d355fcaa 	lsr	x10, x5, #21
ffff8000115902dc:	d280400d 	mov	x13, #0x200                 	// #512
ffff8000115902e0:	d10005ad 	sub	x13, x13, #0x1
ffff8000115902e4:	8a0d014a 	and	x10, x10, x13
ffff8000115902e8:	cb0a016d 	sub	x13, x11, x10
ffff8000115902ec:	926ba86d 	and	x13, x3, #0xffffffffffe00000
ffff8000115902f0:	aa0d03ec 	mov	x12, x13
ffff8000115902f4:	aa07018c 	orr	x12, x12, x7
ffff8000115902f8:	f82a780c 	str	x12, [x0, x10, lsl #3]
ffff8000115902fc:	914801ad 	add	x13, x13, #0x200, lsl #12
ffff800011590300:	9100054a 	add	x10, x10, #0x1
ffff800011590304:	eb0b015f 	cmp	x10, x11
ffff800011590308:	54ffff49 	b.ls	ffff8000115902f0 <__create_page_tables+0x2b0>  // b.plast
ffff80001159030c:	d5033fbf 	dmb	sy
ffff800011590310:	90ffff60 	adrp	x0, ffff80001157c000 <__end_rodata>
ffff800011590314:	f0ffff61 	adrp	x1, ffff80001157f000 <idmap_pg_end>
ffff800011590318:	cb000021 	sub	x1, x1, x0
ffff80001159031c:	97aa9948 	bl	ffff80001003683c <__inval_dcache_area>
ffff800011590320:	b00047e0 	adrp	x0, ffff800011e8d000 <init_pg_dir>
ffff800011590324:	d0004801 	adrp	x1, ffff800011e92000 <init_pg_end>
ffff800011590328:	cb000021 	sub	x1, x1, x0
ffff80001159032c:	97aa9944 	bl	ffff80001003683c <__inval_dcache_area>
ffff800011590330:	d65f0380 	ret	x28

```

```sh
$ grep " __cpu_setup$" System.map
ffff800010e0c6ec T __cpu_setup

$ aarch64-linux-gnu-objdump --start-address=0xffff800010e0c6ec --stop-address=0xffff800010e0c800 -d vmlinux
ffff800010e0c6ec <__cpu_setup>:
ffff800010e0c6ec:	d503245f 	bti	c
ffff800010e0c6f0:	d508871f 	tlbi	vmalle1
ffff800010e0c6f4:	d503379f 	dsb	nsh
ffff800010e0c6f8:	d2a00601 	mov	x1, #0x300000              	// #3145728
ffff800010e0c6fc:	d5181041 	msr	cpacr_el1, x1
ffff800010e0c700:	d2820001 	mov	x1, #0x1000                	// #4096
ffff800010e0c704:	d5100241 	msr	mdscr_el1, x1
ffff800010e0c708:	d5033fdf 	isb
ffff800010e0c70c:	d50348ff 	msr	daifclr, #0x8
ffff800010e0c710:	d5380501 	mrs	x1, id_aa64dfr0_el1
ffff800010e0c714:	93482c21 	sbfx	x1, x1, #8, #4
ffff800010e0c718:	f100043f 	cmp	x1, #0x1
ffff800010e0c71c:	5400004b 	b.lt	ffff800010e0c724 <__cpu_setup+0x38>  // b.tstop
ffff800010e0c720:	d51b9e1f 	msr	pmuserenr_el0, xzr
ffff800010e0c724:	d5380401 	mrs	x1, id_aa64pfr0_el1
ffff800010e0c728:	d36cbc21 	ubfx	x1, x1, #44, #4
ffff800010e0c72c:	b4000041 	cbz	x1, ffff800010e0c734 <__cpu_setup+0x48>
ffff800010e0c730:	d51bd27f 	msr	s3_3_c13_c2_3, xzr
ffff800010e0c734:	d2e00185 	mov	x5, #0xc000000000000       	// #3377699720527872
ffff800010e0c738:	f2c08005 	movk	x5, #0x400, lsl #32
ffff800010e0c73c:	f2b76885 	movk	x5, #0xbb44, lsl #16
ffff800010e0c740:	f29fffe5 	movk	x5, #0xffff
ffff800010e0c744:	d538042a 	mrs	x10, id_aa64pfr1_el1
ffff800010e0c748:	d3482d4a 	ubfx	x10, x10, #8, #4
ffff800010e0c74c:	f100095f 	cmp	x10, #0x2
ffff800010e0c750:	540000eb 	b.lt	ffff800010e0c76c <__cpu_setup+0x80>  // b.tstop
ffff800010e0c754:	d2801e0a 	mov	x10, #0xf0                  	// #240
ffff800010e0c758:	b3781d45 	bfi	x5, x10, #8, #8
ffff800010e0c75c:	b24043ea 	mov	x10, #0x1ffff               	// #131071
ffff800010e0c760:	d51810ca 	msr	gcr_el1, x10
ffff800010e0c764:	d518561f 	msr	tfsr_el1, xzr
ffff800010e0c768:	d518563f 	msr	tfsre0_el1, xzr
ffff800010e0c76c:	d518a205 	msr	mair_el1, x5
ffff800010e0c770:	d2e0080a 	mov	x10, #0x40000000000000      	// #18014398509481984
ffff800010e0c774:	f2c0060a 	movk	x10, #0x30, lsl #32
ffff800010e0c778:	f2b6aa0a 	movk	x10, #0xb550, lsl #16
ffff800010e0c77c:	f286a20a 	movk	x10, #0x3510
ffff800010e0c780:	d5380009 	mrs	x9, midr_el1
ffff800010e0c784:	92a00205 	mov	x5, #0xffffffffffefffff    	// #-1048577
ffff800010e0c788:	f29fffe5 	movk	x5, #0xffff
ffff800010e0c78c:	8a050129 	and	x9, x9, x5
ffff800010e0c790:	d2a8c1e5 	mov	x5, #0x460f0000            	// #1175388160
ffff800010e0c794:	f2800205 	movk	x5, #0x10
ffff800010e0c798:	eb05013f 	cmp	x9, x5
ffff800010e0c79c:	540000c1 	b.ne	ffff800010e0c7b4 <__cpu_setup+0xc8>  // b.any
ffff800010e0c7a0:	d2e00c05 	mov	x5, #0x60000000000000      	// #27021597764222976
ffff800010e0c7a4:	f2c00005 	movk	x5, #0x0, lsl #32
ffff800010e0c7a8:	f2a00005 	movk	x5, #0x0, lsl #16
ffff800010e0c7ac:	f2800005 	movk	x5, #0x0
ffff800010e0c7b0:	8a25014a 	bic	x10, x10, x5
ffff800010e0c7b4:	f0006ac9 	adrp	x9, ffff800011b67000 <__compound_literal.18+0x10>
ffff800010e0c7b8:	f9422d29 	ldr	x9, [x9, #1112]
ffff800010e0c7bc:	b340152a 	bfxil	x10, x9, #0, #6
ffff800010e0c7c0:	d5380705 	mrs	x5, id_aa64mmfr0_el1
ffff800010e0c7c4:	d34008a5 	ubfx	x5, x5, #0, #3
ffff800010e0c7c8:	d28000a6 	mov	x6, #0x5                   	// #5
ffff800010e0c7cc:	eb0600bf 	cmp	x5, x6
ffff800010e0c7d0:	9a8580c5 	csel	x5, x6, x5, hi  // hi = pmore
ffff800010e0c7d4:	b36008aa 	bfi	x10, x5, #32, #3
ffff800010e0c7d8:	d5380729 	mrs	x9, id_aa64mmfr1_el1
ffff800010e0c7dc:	92400d29 	and	x9, x9, #0xf
ffff800010e0c7e0:	b4000049 	cbz	x9, ffff800010e0c7e8 <__cpu_setup+0xfc>
ffff800010e0c7e4:	b259014a 	orr	x10, x10, #0x8000000000
ffff800010e0c7e8:	d518204a 	msr	tcr_el1, x10
ffff800010e0c7ec:	d2c18400 	mov	x0, #0xc2000000000         	// #13331578486784
ffff800010e0c7f0:	f2a69e80 	movk	x0, #0x34f4, lsl #16
ffff800010e0c7f4:	f29b23a0 	movk	x0, #0xd91d
ffff800010e0c7f8:	d65f03c0 	ret
ffff800010e0c7fc:	d51cd04d 	msr	tpidr_el2, x13
ffff800010e0c800:	d518c13f 	msr	disr_el1, xzr
ffff800010e0c804:	d281bd01 	mov	x1, #0xde8                 	// #3560
ffff800010e0c808:	8b0101c1 	add	x1, x14, x1
ffff800010e0c80c:	a9400c22 	ldp	x2, x3, [x1]
ffff800010e0c810:	d5182102 	msr	apiakeylo_el1, x2
ffff800010e0c814:	d5182123 	msr	apiakeyhi_el1, x3


```

```sh
$ grep " __primary_switch$" System.map
ffff800010e0c37c t __primary_switch

$ aarch64-linux-gnu-objdump --start-address=0xffff800010e0c37c --stop-address=0xffff800010e0c500 -d vmlinux
ffff800010e0c37c <__primary_switch>:
ffff800010e0c37c:	d503245f 	bti	c
ffff800010e0c380:	aa0003f3 	mov	x19, x0
ffff800010e0c384:	d5381014 	mrs	x20, sctlr_el1
ffff800010e0c388:	b0008401 	adrp	x1, ffff800011e8d000 <init_pg_dir>
ffff800010e0c38c:	97ffffc6 	bl	ffff800010e0c2a4 <__enable_mmu>
ffff800010e0c390:	97ffffe8 	bl	ffff800010e0c330 <__relocate_kernel>
ffff800010e0c394:	580002e8 	ldr	x8, ffff800010e0c3f0 <__primary_switch+0x74>
ffff800010e0c398:	90ff8fa0 	adrp	x0, ffff800010000000 <_text>
ffff800010e0c39c:	d63f0100 	blr	x8
ffff800010e0c3a0:	d5033fdf 	isb
ffff800010e0c3a4:	d5181014 	msr	sctlr_el1, x20
ffff800010e0c3a8:	d5033fdf 	isb
ffff800010e0c3ac:	941e0f25 	bl	ffff800011590040 <__create_page_tables>
ffff800010e0c3b0:	d508871f 	tlbi	vmalle1
ffff800010e0c3b4:	d503379f 	dsb	nsh
ffff800010e0c3b8:	d5181013 	msr	sctlr_el1, x19
ffff800010e0c3bc:	d5033fdf 	isb
ffff800010e0c3c0:	d508751f 	ic	iallu
ffff800010e0c3c4:	d503379f 	dsb	nsh
ffff800010e0c3c8:	d5033fdf 	isb
ffff800010e0c3cc:	97ffffd9 	bl	ffff800010e0c330 <__relocate_kernel>
ffff800010e0c3d0:	58000108 	ldr	x8, ffff800010e0c3f0 <__primary_switch+0x74>
ffff800010e0c3d4:	90ff8fa0 	adrp	x0, ffff800010000000 <_text>
ffff800010e0c3d8:	d61f0100 	br	x8
ffff800010e0c3dc:	016e2e20 	.word	0x016e2e20
ffff800010e0c3e0:	0045f8e8 	.word	0x0045f8e8
	...
ffff800010e0c3f8:	d503201f 	nop
ffff800010e0c3fc:	00000000 	udf	#0

```
