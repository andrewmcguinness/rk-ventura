# RK-Ventura

This is a collection of tools implented as javascript to run in a
browser, relating to a (once) commercially available tabletop game
using tiles.

A group on the cruise ship "Ventura" played the "twist" game variant
with unofficial rules emphasizing finding complete solutions with no
tiles left over, rather than minimising outstanding point values.

The code on the web page "play.html" allows for entering of all groups
on the table, as well as the tiles in a player's rack, and looks for a
complete solution.

At this point the code seems correct, and can frequently either find a
solution or exhaustively determine that there is no solution within
seconds to a few minutes. On some occasions though, it can take hours
or perhaps much longer.

"tests.html" contains a test suite and a facility for solving a single input string.

"random.html" generates random sets of tiles and attempts to solve them.

## Implementation

The guts of the implementation in rummi.js is the method "canadd", which generates legal
combinations of tiles, and "solveN", which does the search for solutions. SolveN recurses once
per tile used, so with 112 tiles in the game 112 is the stack depth. It would be possible to
build explicit stacks and change the recursion to a loop.

The solve code runs in a WebWorker to allow the UI thread to stay responsive. It uses only a single
one; it would be possible to pool a few WebWorkers and parallelise the search.

## Status

Next phase is either better search pruning (possibly involving some cache?), or better UI
(being developed on a cruise ship without internet access, the developer could only really
use features he already knew).

## Links

[https://rummikub.com/product/rummikub-with-a-twist/](Official game site)

[https://www.pocruises.com/cruise-ships/ventura/overview](Ventura)
