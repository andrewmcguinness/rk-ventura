
function rank(c) {
    return (c & 0x0F);
}

function colour(c) {
    return (c & 0x70) >> 4;
}

function isjoker(c) {
    return !(rank(c));
}

function joker(c) {
    return ((rank(c) == 0) && (colour(c)));
}

function cardstr(c) {
    r = rank(c);
    if (r) return Colours[colour(c)] + rank(c);
    return Jokers[colour(c) - 1];
}

function cardsstr(arr) {
    return arr.map(cardstr).join(' ');
}

const Colours = [ 'R', 'T', 'Y', 'B' ],
      Jokers = [ 'JS', 'JD', 'JM', 'JC' ],
      J_SINGLE = 0x10,
      J_DOUBLE = 0x20,
      J_MIRROR = 0x30,
      J_CHANGE = 0x40;

// for testing, not optimised

function card(c, r) {
    return (c << 4) | r;
}

function tocard(s) {
    if (s[0] == 'J')
	for (let i = 0; i < 4; ++i)
	    if (Jokers[i] == s) return card(i+1, 0);

    for (let i = 0; i < 4; ++i) {
	if (Colours[i] == s[0])
	    return card(i, s.substring(1) - 0);
    }
    return 0;
}

function tocards(s) {
    return s.split(" ").map(tocard);
}

ST_BAD = 0;
ST_INCOMPLETE = 1;
ST_GOOD = 2;

function separate(arr) {
    const order = c => (rank(c) << 3) + colour(c) + (isjoker(c) << 10);
    
    arr.sort((x,y)=>(order(x) - order(y)));
    let out = [arr, 0, 0, 0, 0], tot = 0;
    for (i = arr.length - 1; i >= 0; --i) {
	let c = arr[i];
	if (isjoker(c)) {
	    ++out[colour(c)]; ++tot;
	} else break;
    }
    arr.splice(arr.length - tot);
    return out;
}

// constraint: never begin a straight with a joker
// returns [is, extra-info]
function isaset(arr) {
    if (!arr.length) return [0, -1]; // error

    if (arr.includes(J_MIRROR)) {
	if (arr.length < 3) return [0, -2]; // mirror requires 3
	let jokers = separate(arr.slice(0)),
	    arr2 = jokers[0],
	    setrank = rank(arr2[0]), // todo JS JM R1
	    colours = 0;
	for (let i = 1; i < arr2.length; i += 2) {
	    if ((arr2[i] != arr2[i-1]) || (rank(arr2[i]) != setrank))
		return [0];
	    colours |= (1 << colour(arr2[i]));
	}
	return [setrank, colours, 0];
    }

    let colours = 1 << colour(arr[0]),
	setrank = rank(arr[0]),
	skip = 0;
    for (var i = 1; i < arr.length; ++i) {
	const c = arr[i];
	if (c == J_DOUBLE)
	    ++skip;
	if ((c != J_SINGLE) && (c != J_DOUBLE)) {
	    if (rank(c) != setrank) return [0];
	    const cbit = 1 << colour(c);
	    if (colours & cbit) return [0]; // dupe colour
	    colours |= cbit;
	}
    }
    if (arr.length + skip > 4) return [0]; // more than 4 colours
    return [setrank, colours, skip];
}

// returns start-of-straight, colour, skip-count
function isastraight(arr1) {
    if (!arr1.length) return [0, -2]; // error

    let jokers = separate(arr1.slice(0)),
	arr = jokers[0];
    jokers[0] = null; // tidy up

    if (jokers[3] == 1) { // J_MIRROR
	jokers[3] = 0;
	if (arr1.length < 3) return [0, -3];
	let half = [], runcolour = colour(arr[0]),
	    low = rank(arr[0]), skip = 0;;
	for (let i = 0; i < arr.length; ++i) {
	    let c = arr[i],
		pair = i + 1;
	    if ((pair < arr.length) && (arr[pair] == c)) {
		half.push(c);
		i = pair;
	    }
	    else if (jokers[1]) { // pair of the run tile is a JS
		half.push(c);
		--jokers[1];
	    }
	    if (colour(c) != runcolour) return [0, -5];
	    if ((i > 0) && (rank(c) != (low + (half.length) - 1))) {
		// TODO JS,JD
		return [0, -4];
	    }
	}
	return [low, runcolour, skip];
    }
    if (!arr[0]) return [0]; // hand with only jokers
    let low = rank(arr[0]),
	runcolour = colour(arr[0]),
	skip = 0;
    for (var i = 1; i < arr.length; ++i) {
	const c = arr[i];
	if ((colour(c) == runcolour) &&
	    (rank(c) == (low + i + skip)))
	    continue;
	else if ((jokers[1] > 0) &&
		 (colour(c) == runcolour) &&
		 (rank(c) == low + i + 1 + skip)) {
	    --jokers[1];
	    skip += 1;
	    continue;
	}
	else if ((jokers[2] > 0) &&
		 (colour(c) == runcolour) &&
		 (rank(c) == low + i + 2 + skip)) {
	    --jokers[2];
	    skip += 2;
	    continue;
	}
	else if ((jokers[4] > 0) &&  // J_CHANGE
		 (colour(c) != runcolour) &&
		 (rank(c) == low + i + 1 + skip)) {
	    --jokers[4];
	    console.log([low, skip, c, runcolour]);
	    runcolour = colour(c);
	    skip += 1;
	    continue;
	}
	else return [0, c, jokers];
    }
    let high = low + arr.length + skip - 1;
    while (jokers[2]) {
	if (high < 12) high += 2;
	else low -= 2;
	--jokers[2];
	skip += 2;
    }
    while (jokers[1]) {
	if (high < 13) ++high;
	else --low;
	--jokers[1];
	skip += 1;
    }
    while (jokers[4]) {
	if (high < 13) ++high;
	else --low;
	--jokers[4];
	skip += 1;
    }
    if ((low < 1) || (high > 13)) return [0];
    
    return [low, runcolour, skip];
}

function prettytile(c, doc) {
    const el = doc.createElement('span');
    el.classList.add('tilecolour-' + Colours[colour(c)]);
    if (isjoker(c)) el.classList.add('joker');
    el.textContent = cardstr(c);
    return el;
}
    
function prettystraight(arr1) {
    const arr = arr1.slice(0);
    if (!arr.length) return null; // error
    arr.sort((x,y)=>((x+(isjoker(x)*1000)-(y+(isjoker(y)*1000)))))
    let jokers = [0, 0, 0, 0], tot = 0;
    for (i = arr.length - 1; i >= 0; --i) {
	let c = arr[i];
	if (isjoker(c)) {
	    ++jokers[colour(c)]; ++tot;
	} else break;
    }
    arr.splice(arr.length - tot);
    let low = rank(arr[0]),
	runcolour = colour(arr[0]),
	skip = 0,
	ordered = [arr[0]];
    for (var i = 1; i < arr.length; ++i) {
	const c = arr[i];
	if ((colour(c) == runcolour) &&
	    (rank(c) == (low + i + skip))) {
	    ordered.push(c);
	}
	else if ((jokers[1] > 0) &&
		 (colour(c) == runcolour) &&
		 (rank(c) == low + i + 1 + skip)) {
	    --jokers[1];
	    skip += 1;
	    ordered.push(J_SINGLE);
	    ordered.push(c);
	}
	else if ((jokers[2] > 0) &&
		 (colour(c) == runcolour) &&
		 (rank(c) == low + i + 2 + skip)) {
	    --jokers[2];
	    skip += 2;
	    ordered.push(J_DOUBLE);
	    ordered.push(c);
	}
	else if ((jokers[4] > 0) &&  // J_CHANGE
		 (colour(c) != runcolour) &&
		 (rank(c) == low + i + 1 +skip)) {
	    --jokers[4];
	    runcolour = colour(c);
	    skip += 1;
	    ordered.push(J_CHANGE);
	    ordered.push(c);
	}
	else return null;
    }
    let high = low + arr.length + skip - 1;
    while (jokers[2]) {
	if (high < 12) {
	    high += 2;
	    ordered.push(J_DOUBLE);
	} else {
	    low -= 2;
	    ordered.unshift(J_DOUBLE);
	}
	--jokers[2];
	skip += 2;
    }
    while (jokers[1]) {
	if (high < 13) {
	    ++high;
	    ordered.push(J_SINGLE);
	} else {
	    --low;
	    ordered.unshift(J_SINGLE);
	}
	--jokers[1];
	skip += 1;
    }
    if ((low < 1) || (high > 13)) return null;
    
    return ordered;
}
		    
		   
function prettymeld(arr) {
    let out = arr.slice(0);
    if (isaset(arr)[0]) {
	arr.sort();
	return arr;
    }
    else return prettystraight(arr);
}

function isvalid(arr) {
    return isaset(arr) || isastraight(arr);
}

function canadd_asset(arr, c) {
    if (arr.length >= 4) return ST_BAD; // only 4 colours!
    let setval = isaset(arr);
    if (setval[0] &&
	(arr.length + setval[2] < 4) &&
	((c == J_SINGLE) ||
	 ((c == J_DOUBLE) && (arr.length + setval[2] < 3)) ||
	 ((setval[0] == rank(c)) && !(setval[1] & (1<<colour(c)))))
       )
	return (arr.length >= 2)?ST_GOOD:ST_INCOMPLETE;
    if (arr.includes(J_MIRROR)) {
	if (setval[0]) {
	    if ((setval[0] == rank(c)) && !(setval[1] && (1<<colour(c))))
		return ST_INCOMPLETE; // extending mirrored set that will need balancing
	    // TODO JM JS JS ???
	}
	else {
	    let arr2 = arr.slice(0);
	    arr2.push(c);
	    if (isaset(arr2)[0]) return ST_GOOD;
	}
	return ST_BAD;
    }

    
    if ((arr.length == 1) && (c == J_MIRROR)) return ST_INCOMPLETE;
    return ST_BAD;
}

function canadd_asstr(arr, c) {
    if (c == J_MIRROR) {
	if (arr.length != 1) return ST_BAD;
	return ST_INCOMPLETE;
    }
    const strdata = isastraight(arr);
    if (arr.includes(J_MIRROR)) {
	if (arr.length % 2) { // was odd length, now even
	    if (!strdata[0]) return ST_BAD; // wasn't a straight
	    if (colour(c) != strdata[1]) return ST_BAD;
	    let halflen = (arr.length - 1) / 2;
	    if (rank(c) != strdata[0] + halflen) return ST_BAD;
	    return ST_INCOMPLETE;
	}
	else { // was even length, now odd length
	    const added = arr.slice(0);
	    added.push(c);
	    const sd2 = isastraight(added);
	    if (sd2[0]) return ST_GOOD;
	    else return ST_BAD;
	}
    }
    if (!strdata[0]) return ST_BAD;

    const added = arr.slice(0);
    added.push(c);
    const sd2 = isastraight(added);
    
    if (!sd2[0]) return ST_BAD;
    if (added.length <= 2) return ST_INCOMPLETE;
    if ((added[0] == J_CHANGE) || (added[0] == J_MIRROR) ||
	(added[added.length - 1] == J_CHANGE) ||
	(added[added.length - 1] == J_MIRROR))
	return ST_INCOMPLETE;
    return ST_GOOD;
}

function canadd(arr, c) {
    return Math.max(canadd_asset(arr, c), canadd_asstr(arr, c));
}



//  TESTS


var G;
function check(val) {
    G.lastval = JSON.stringify(val);
    return val;
}

function runonetest(t) {
    G={};
    const result = (tests[t]())?'SUCCESS':'FAILURE';
    console.log(result);
}

function runtests() {
    G={};
    let out = { failed: [], all: [] };
    for (t in tests) {
	G.lastval = 'NOTUSED';
	if (!(tests[t]())) {
	    out.failed.push("FAILED:" + t + "\nwas " + G.lastval);
	    out.all.push("FAILED:" + t + "\nwas " + G.lastval);
	    console.log("FAILED:" + t + "\nwas " + G.lastval);
	} else {
	    out.all.push("SUCCESS: " + t);
	    console.log("SUCCESS: " + t);
	}
    }
    console.log("" + out.failed.length + " of " + Object.keys(tests).length + " failed.");
    return out;
}

function solve1(tiles) {
    if (isaset(tiles) || isastraight(tiles))
	return [tiles.slice(0)];
    else return false;
}

function solveN(working, pool, state) {
    if (pool.length == 0) {
	if (working.length == 0) return [];
	else return null;
    }
    for (let i = 0; i < pool.length; ++i) {
	let st = ST_INCOMPLETE;
	++(state.count);
	if (working.length) {
	    st = canadd(working, pool[i]);
	}
	if (st) {
	    let pool2 = pool.slice(0), // TODO keep one pool2 and switch it around
		last = pool2.pop();
	    if (i < pool2.length)
		pool2[i] = last;
	    if (st == ST_GOOD) {
		let attempt = solveN([], pool2, state);
		if (attempt) {
		    working.push(pool[i]);
		    attempt.push(working);
		    return attempt;
		}
	    }
	    
	    let working2 = working.slice(0);
	    working2.push(pool[i]);
	    let attempt = solveN(working2, pool2, state);
	    if (attempt) {
		return attempt;
	    }
	}
    }
}

function solve(tiles) {
    let state = { count: 0 },
	solution = solveN([], tiles, state);

    state.solution = solution;
    return state;
}


tests = {
    cardstr1: function() { return cardstr(20) == 'T4'; },
    cardstr2: function() { return cardstr(42) == 'Y10'; },
    cardstr3: function() { return cardstr(58) == 'B10'; },
    cardstr4: function() { return cardstr(49) == 'B1'; },
    cardstrj1: function() { return cardstr(32) == 'JD'; },
    cardstrj2: function() { return cardstr(64) == 'JC'; },
    parse1: function() { return tocard('T4') == 20; },
    parse2: function() { return tocard('Y10') == 42; },
    parse3: function() { return tocard('B10') == 58; },
    parse4: function() { return tocard('B1') == 49; },
    parsej1: function() { return tocard('JD') == 32; },
    parsej2: function() { return tocard('JC') == 64; },
    parsej3: function() { return tocard('JS') == J_SINGLE; },
    parsel1: function() { return check(tocards('B10 B1 JC T4').join()) == '58,49,64,20'; },
    parsel2: function() { return check(tocards('JD Y1 R13')[1]) == 33; },
    parsel3: function() { return check(tocards('Y5 JS R5'))[1] == J_SINGLE; },
    parsel4: function() { return check(tocards('Y5 JS R5'))[2] == 5; },
    parsel5: function() { return check(tocards('Y5 JS R5')).join() == '37,16,5'; },
    set1: function() { return check(isaset(tocards('B2 R2 Y2'))[0]) == 2; },
    set2: function() { return isaset(tocards('Y5 T5'))[0] == 5; },
    set3: function() { return check(isaset(tocards('B10 R1 T1'))[0]) == 0; },
    set4: function() { return isaset(tocards('B1 R10 T1'))[0] == 0; },
    set5: function() { return isaset(tocards('B1 R1 T10'))[0] == 0; },
    set6: function() { return isaset(tocards('B1 R1 B1'))[0] == 0; },
    set7: function() { return check(isaset(tocards('B1 JS B1'))[0]) == 0; },
    set8: function() { return check(isaset(tocards('B2 JS T2')))[0] == 2; },
    set9: function() { return check(isaset(tocards('B2 JS T2'))[0]) == 2; },
    set10: function() { return check(isaset(tocards('B2 JD T2'))[0]) == 2; },
    set11: function() { return check(isaset(tocards('B2 JD T2 Y2'))[0]) == 0; },
    add1: function() { return check(canadd(tocards('Y5 T5'), tocard('B6'))) == ST_BAD; },
    add2: function() { return canadd(tocards('Y5 T5'), tocard('B5')) == ST_GOOD; },
    add3: function() { return canadd(tocards('Y5 T5'), tocard('T5')) == ST_BAD; },
    add4: function() { return canadd(tocards('Y5 T5 R5'), tocard('B5')) == ST_GOOD; },
    add5: function() { return canadd(tocards('Y5'), tocard('B5')) == ST_INCOMPLETE; },
    add6: function() { return canadd(tocards('Y5'), tocard('Y5')) == ST_BAD; },
    add7: function() { return check(canadd(tocards('Y5 JS R5'), tocard('B5'))) == ST_GOOD; },
    add8: function() { return canadd(tocards('Y12 R12'), tocard('JS')) == ST_GOOD; },
    add9: function() { return canadd(tocards('Y12 R12'), tocard('JC')) == ST_BAD; },
    add10: function() { return canadd(tocards('Y12 JC R12'), tocard('JS')) == ST_BAD; },
    add11: function() { return canadd(tocards('Y11'), tocard('JS')) == ST_INCOMPLETE; },
    add12: function() { return canadd(tocards('Y12 R12 B12'), tocard('JD')) == ST_BAD; },
    add13: function() { return canadd(tocards('R12 B12'), tocard('JD')) == ST_GOOD; },
    run1: function() { return check(isastraight(tocards('R5 R6 R7')))[0] == 5; },
    run2: function() { return check(isastraight(tocards('R5 T6 R7')))[0] == 0; },
    run3: function() { return check(isastraight(tocards('T5 T6 T8')))[0] == 0; },
    run4: function() { return check(isastraight(tocards('T5 T6 T4')))[0] == 4; },
    run5: function() { return check(isastraight(tocards('T5 T6 JS T8')))[0] == 5; },
    run6: function() { return check(isastraight(tocards('T5 T6 JD T8')))[0] == 0; },
    run7: function() { return check(isastraight(tocards('T5 T6 JD T9')))[0] == 5; },
    run8: function() { return check(JSON.stringify(isastraight(tocards('Y8 JD Y9')))) == '[8,2,2]'; },
    run9: function() { return isastraight(tocards('Y8 Y9 Y10 Y6'))[0] == 0; },
    run10: function() { return check(JSON.stringify(isastraight(tocards('Y6 JS Y8 Y9')))) == '[6,2,1]'; },
    addr1: function() { return canadd(tocards('Y8 Y9 Y10'), tocard('Y7')) == ST_GOOD; },
    addr2: function() { return check(canadd(tocards('Y8 Y9 Y10'), tocard('Y6'))) == ST_BAD; },
    addr3: function() { return canadd(tocards('Y8 Y9 Y10'), tocard('T7')) == ST_BAD; },
    addr4: function() { return canadd(tocards('Y8 Y9 Y10'), tocard('Y8')) == ST_BAD; },
    addr5: function() { return canadd(tocards('Y8 Y9 Y10'), tocard('Y11')) == ST_GOOD; },
    addr6: function() { return canadd([5,7], 6) == ST_BAD; }, // 5,7 is broken 
    addr7: function() { return canadd([5], 7) == ST_BAD; }, // 5,7 is broken
    addrj1: function() { return check(canadd(tocards('Y6 JS Y8'), tocard('Y5'))) == ST_GOOD; },
    addrj2: function() { return canadd(tocards('Y8 JS Y9'), tocard('Y11')) == ST_GOOD; },
    addrj3: function() { return canadd(check(tocards('Y8 JD Y9')), tocard('Y11')) == ST_BAD; },
    addrj4: function() { return canadd(tocards('Y8 JD Y7'), tocard('Y11')) == ST_GOOD; },
    addrj5: function() { return canadd(tocards('Y8 JD Y7'), tocard('Y6')) == ST_GOOD; },
    addrj6: function() { return canadd(tocards('Y8 JD Y7'), tocard('Y5')) == ST_BAD; },
    addrj7: function() { return canadd(tocards('Y8 JD Y7'), tocard('Y4')) == ST_GOOD; },
    addrj8: function() { return check(canadd(tocards('Y6 JS Y8'), tocard('Y9'))) == ST_GOOD; },
    pretty1: function() { return JSON.stringify(prettymeld([3, 4, 5, 8, 32])) == '[3,4,5,32,8]'; },
    pretty2: function() { return isaset([3,4,5,8,32]) == 0; },
    jc1: function() { return check(isastraight(tocards('T5 T6 JS B9')))[0] == 0; },
    jc2: function() { return check(isastraight(tocards('B5 B6 JC T8')))[0] == 5; },
    jc3: function() { return check(isastraight(tocards('T5 T6 JC B8')))[0] == 5; },
    jc4: function() { return canadd(tocards('Y8 JS Y9'), tocard('JC')) == ST_INCOMPLETE; },
    jc5: function() { return check(canadd(tocards('Y7 Y8 Y9 JC'), tocard('Y11'))) == ST_BAD; },
    jc6: function() { return canadd(tocards('Y7 JS Y9 JC'), tocard('R11')) == ST_GOOD; },
    jc7: function() { return check(isastraight(tocards('Y8 Y9 JC Y11')))[0] == 0; },
    sep1: function() { return JSON.stringify(separate(tocards('JS R1 JD B2 T6'))) == '[[1,50,22],1,1,0,0]'; },
    jm1: function() { return isaset(tocards('R1 R1 JM'))[0] == 1; },
    jm2: function() { return isaset(tocards('R1 T1 JM'))[0] == 0; },
    jm3: function() { return check(isaset(tocards('R3 T3 R3 JM T3')))[0] == 3; },
    jm4: function() { return check(isastraight(tocards('R3 R4 R3 JM R4')))[0] == 3; },
    jm5: function() { return check(isastraight(tocards('R3 JS R3 JM R4')))[0] == 3; },
    jm6: function() { return check(isastraight(tocards('R3 R3 JM R4')))[0] == 0; },
    jm7: function() { return isaset(tocards('R1 JM'))[0] == 0; },
    jm8: function() { return canadd_asset(tocards('R9 R9 JM'), tocard('T10')) == ST_BAD; },
    jm9: function() { return check(canadd_asstr(tocards('R9 R9 JM'), tocard('T10'))) == ST_BAD; },
    jm10: function() { return check(canadd_asstr(tocards('R9 R9 JM'), tocard('R10'))) == ST_INCOMPLETE; },
    jm11: function() { return check(isastraight(tocards('T10 JM R9')))[0] == 0; },
    jm12: function() { return check(canadd_asstr(tocards('R9 R9 JM R10'), tocard('R10'))) == ST_GOOD; },
    jm13: function() { return check(canadd_asstr(tocards('R9 R9 JM R10'), tocard('R8'))) == ST_BAD; },
    jm14: function() { return check(canadd_asstr(tocards('R9 R9 JM'), tocard('T10'))) == ST_BAD; },
    jm15: function() { return canadd_asset([26, 48], 9) == ST_BAD; },
    jm15: function() { return isaset([26, 48, 9]) == 0; },

    solve1: function() { return check(JSON.stringify(solve(tocards('R5 R6 R7')).solution)) == '[[5,6,7]]'; },
    solve2: function() { return check(solve(tocards('R5 R6 R8')).solution) == null; },
    solve3: function() { return check(solve([26]).solution) == null; },
    solve4: function() { return check(solve([5,6,7,26]).solution) == null; },
    solve5: function() { return check(solve(tocards('R5 R6 R7 T10 T11 T12')).solution.length) == 2; },
    solve6: function() { return (solve(tocards('R2 R3 R4 R5 JS B2 Y2 R8 T9 T10 JD'))).solution.length == 3; },
//    solve7: function() { return (solve(tocards('R9 R9 JM B8 B9 B10 B11 B12 B13 B11 R11 Y11 R10 B10 Y10 T10 T11 T12 Y7 Y8 Y9 Y10 R2 B2 Y2 T2 Y12 B12 R12 R3 Y3 T3'))).solution.length == 9; },
    solve7: function() { return check((solve(tocards('R1 R1 JM')))).solution.length == 1; },
    solve8: function() { return check((solve(tocards('R9 R9 JM B8 B9 B10 B11 B12 B13 B11 R11 Y11 R10 B10 Y10 T10')))).solution.length == 5; },
    solve9: function() { return check(solve(tocards('T10 JM R9 R9'))).solution == null; }

}
