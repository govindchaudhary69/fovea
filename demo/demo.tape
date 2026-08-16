# Renders demo/fovea.gif.
#
#   brew install vhs
#   vhs demo/demo.tape
#
# Run it from the repository root. Re-run it after changing anything that
# affects how output looks, so the README never drifts from the code.

Output demo/fovea.gif

Set Shell zsh
Set FontSize 22
Set Width 1180
Set Height 560
Set Padding 26
Set TypingSpeed 45ms
Set Theme "Catppuccin Mocha"

Hide
Type "clear"
Enter
Show

# Plain text first, so the change is legible when the same lines come back.
Type "cat demo/sample.txt"
Sleep 600ms
Enter
Sleep 2.5s

Type "fovea < demo/sample.txt"
Sleep 600ms
Enter
Sleep 4s

Hide
Type "clear"
Enter
Show

# The quieter style: fade the tail instead of bolding the head.
Type "fovea --style dim-tail < demo/sample.txt"
Sleep 600ms
Enter
Sleep 4s
