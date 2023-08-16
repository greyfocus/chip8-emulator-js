# CHIP-8 Emulator

Emulator with full support for the CHIP-8 operations implemented in plain Javascript. It has the following quirks enabled:

- `VF RESET` The AND, OR and XOR opcodes (8xy1, 8xy2 and 8xy3) reset the flags register to zero
- `Shifting` - The shift opcodes (8xy6 and 8xyE) only operate on vX instead of storing the shifted version of vY in vX (more information here). Test will show E1 if the shift opcodes behave differently.

## Run

In order to run the emulator, you will need a local HTTP server. 

For example, to use the builtin HTTP server from Python:

```shell
python -m http.server
```

## References
- [freecodecamp.org - Creating your very own CHIP-8 emulator](https://www.freecodecamp.org/news/creating-your-very-own-chip-8-emulator/) - The main starting point for this implementation.
- [CHIP-8 Technical Reference](http://devernay.free.fr/hacks/chip8/C8TECH10.HTM#2.2)
- [CHIP-8 Test Resources](https://github.com/Timendus/chip8-test-suite)
