
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
// compatibility shim for old test cases
function isaset(arr) {
    let det = detailed(arr);
    if (det.set) return [det.lowrank];
    else return [0];
}

// compatibility shim for old test cases
function isastraight(arr1) {
    let det = detailed(arr1);
    if (det.straight) return [det.lowrank, det.lowcolour];
    else return [0];
}

// d is a detail object
function straightdetails(d) {
    let arr = d.tiles,
	jokers = d.jokers.slice(0); // copy to count through
    d.straight = false;
    if (jokers[3] == 1) { // J_MIRROR
	d.mirrored = true;
	jokers[3] = 0;
	if (!arr.length) {
	    return; // TODO other jokers could be there
	}
	d.lowrank = rank(arr[0]);
	d.lowcolour = colour(arr[0]);
	d.highrank = d.lowrank - 1;
	d.highcolour = d.lowcolour;
	for (let i = 0; i < arr.length; ++i) {
	    let c = arr[i],
		pair = i + 1;
	    if ((pair < arr.length) && (arr[pair] == c)) {
		i = pair;
	    }
	    else if (jokers[1]) { // pair of the run tile is a JS
		--jokers[1];
	    }
	    else return; // not paired
	    
	    if (colour(c) != d.highcolour) return; // colour wrong
	    if (rank(c) != d.highrank + 1) return;
	    ++d.highrank;
	}
	// every card is paired and following straight
	if ((jokers[1] + jokers[2] + jokers[3]) > 0)
	    return; // TODO extra jokers included

	d.straight = true;
	return;
    }
    
    if (!arr[0]) return; // hand with only jokers

    d.lowrank = rank(arr[0]);
    d.lowcolour = colour(arr[0]);
    d.highrank = d.lowrank;
    d.highcolour = d.lowcolour;
    for (var i = 1; i < arr.length; ++i) {
	const c = arr[i];
	if ((colour(c) == d.highcolour) &&
	    (rank(c) <= 1 + d.highrank + jokers[1] + (2*jokers[2]) )) {
	    while (jokers[2] && (rank(c) >= d.highrank + 3)) {
		--jokers[2];
		d.highrank += 2;
	    }
	    while (jokers[1] && (rank(c) > d.highrank + 1)) {
		--jokers[1];
		++d.highrank;
	    }
	    if (rank(c) == d.highrank + 1) {
		++d.highrank;
	    } else return;
	}
	else if ((jokers[4] > 0) &&  // J_CHANGE
		 (colour(c) != d.highcolour) &&
		 (rank(c) == d.highrank + 2)) {
	    --jokers[4];
	    d.highcolour = colour(c);
	    d.highrank += 2;
	}
	else return;
    }
    while (jokers[2]) {
	if (d.highrank < 12) d.highrank += 2;
	else d.lowrank -= 2;
	--jokers[2];
    }
    while (jokers[1]) {
	if (d.highrank < 13) ++d.highrank;
	else --d.lowrank;
	--jokers[1];
    }
    if (jokers[3] + jokers[4] > 0) return;
    if ((d.lowrank < 1) || (d.highrank > 13)) return;
    d.straight = true;
    return;
}

// d is a detail structure
function setdetails(d) {
    d.set = false;
    d.colours = 0;
    if (!d.tiles.length) return;
    let jokers = d.jokers.slice(0);
    if (jokers[4]) return; // no change joker in a set
    if (jokers[3] > 1) return; // two mirrors??
    
    if (jokers[3]) {
	d.mirrored = true;
	if (physical(d) < 3) return;
	let c = d.tiles[0];
	d.lowrank = rank(c);
	for (let i = 1; i < d.tiles.length; i += 2) {
	    if ((d.tiles[i] != d.tiles[i-1]) || (rank(d.tiles[i]) != d.lowrank))
		return;
	    d.colours |= (1 << colour(d.tiles[i]));
	}
	if (d.tiles.length%2) {
	    let odd = d.tiles[d.tiles.length - 1];
	    if (rank(odd) != d.lowrank) return;
	}
	d.set = true;
	return;
    }

    d.colours = 1 << colour(d.tiles[0]);
    d.lowrank = rank(d.tiles[0]);

    for (var i = 1; i < d.tiles.length; ++i) {
	const c = d.tiles[i];
	if (rank(c) != d.lowrank) return;
	const cbit = 1 << colour(c);
	if (d.colours & cbit) return; // dupe colour
	d.colours |= cbit;
    }
    if (d.tiles.length + jokers[1] + (2*jokers[2]) > 4) return;

    d.set = true;
    return;
}

// number of physical tiles in a group
function physical(dets) {
    return dets.tiles.length + dets.jokers[1] + dets.jokers[2] + dets.jokers[3] + dets.jokers[4];
}

function detailed(arr1) {
    let jokers = separate(arr1.slice(0)),
	details = {
	    jokers: jokers,
	    tiles: jokers[0],
	    straight: false,
	    set: false,
	    colours: 0,
	    lowrank: 0,
	    lowcolour: -1,
	    highrank: 0,
	    highcolour: -1,
	    mirrored: false
	};
    jokers[0] = null; // tidy up
    straightdetails(details);
    setdetails(details);
    return details;
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
    let jokers = separate(arr),
	arr2 = jokers[0],
	low = rank(arr2[0]),
	runcolour = colour(arr2[0]),
	skip = 0,
	ordered = [arr2[0]];
    for (var i = 1; i < arr.length; ++i) {
	const c = arr2[i];
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
    console.log(arr);
    let det = detailed(arr);
    if (det.set) {
	arr.sort();
	return arr;
    }
    else return prettystraight(arr) || arr.sort();
}

function canadd_t(dets, c) {
    let sz = physical(dets);
    if (c == J_MIRROR) return (sz == 1)*ST_INCOMPLETE;

    if (sz == 0) return (!isjoker(c))*ST_INCOMPLETE;

    if (dets.mirrored) {
	if (dets.set) {
	    if ((rank(c) == dets.lowrank) && !(dets.colours & (1 << colour(c))))
		return ST_INCOMPLETE;
	    if (((dets.tiles.length + dets.jokers[1] + 2 * dets.jokers[2]) < 7) &&
		c == J_SINGLE)
		return ST_INCOMPLETE;
	}
	if (dets.straight) {
	    if ((rank(c) == (dets.highrank + 1)) && (colour(c) == dets.highcolour))
		return ST_INCOMPLETE;
	    if (((dets.highrank < 12) || (dets.lowrank > 2)) &&
		(c == J_SINGLE))
		return ST_INCOMPLETE;
	}
	if (!(dets.set || dets.straight)) {
	    let spare = dets.tiles[dets.tiles.length - 1];
	    if (spare == c) return ST_GOOD;
	    if (c == J_SINGLE) return ST_GOOD;
	}
	return ST_BAD;
    }

    if (dets.set && (rank(c) == dets.lowrank) &&
	((dets.tiles.length + dets.jokers[1] + 2 * dets.jokers[2]) < 4) &&
	!(dets.colours & (1 << colour(c))))
	return (sz >= 2)?ST_GOOD:ST_INCOMPLETE;
    if (dets.set && ((dets.tiles.length + dets.jokers[1] + 2 * dets.jokers[2]) < 4) &&
	c == J_SINGLE)
	return (sz >= 2)?ST_GOOD:ST_INCOMPLETE;
    if (dets.set && ((dets.tiles.length + dets.jokers[1] + 2 * dets.jokers[2]) < 3) &&
	c == J_DOUBLE)
	return (sz >= 2)?ST_GOOD:ST_INCOMPLETE;
    if (dets.straight && (rank(c) == (dets.highrank + 1)) && (colour(c) == dets.highcolour))
	return (sz >= 2)?ST_GOOD:ST_INCOMPLETE;
    if (dets.straight && ((dets.highrank < 12) || (dets.lowrank > 2)) &&
	((c == J_SINGLE)||(c == J_DOUBLE)))
	return (sz >= 2)?ST_GOOD:ST_INCOMPLETE;
    if (dets.straight && (c == J_CHANGE)) return ST_INCOMPLETE;
    if ((!dets.straight) && (dets.jokers[4]) && (rank(c) == dets.highrank + 2) &&
	(colour(c) != dets.highcolour)) return ST_GOOD;
    if ((!dets.straight) && (dets.jokers[4]) && (c == J_SINGLE) &&
	(dets.highrank < 12)) return ST_GOOD;
    if ((!dets.straight) && (dets.jokers[4]) && (c == J_DOUBLE) &&
	(dets.highrank < 11)) return ST_GOOD;

    return ST_BAD;
}

function canadd(arr, c) {
    return canadd_t(detailed(arr), c);
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

function solveN(working, pool, state) {
    if (pool.length == 0) {
	if (working.length == 0) return [];
	else return null;
    }
    if (working.length == 0) {
	let pool2 = pool.slice(1);
	return solveN([pool[0]], pool2, state);
    }
    let details = detailed(working);
    for (let i = 0; i < pool.length; ++i) {
	++(state.count);
	let st = ST_INCOMPLETE;
	if (working.length) {
	    st = canadd_t(details, pool[i]);
	}
	if (st) {
	    let pool2 = pool.slice(0), // TODO keep one pool2 and switch it around
		next = pool2.splice(i, 1)[0];

	    if (st == ST_GOOD) {
		++(state.begins);
		let attempt = solveN([], pool2, state);
		if (attempt) {
		    working.push(next);
		    attempt.push(working);
		    return attempt;
		}
	    }
	    
	    let working2 = working.slice(0);
	    working2.push(next);
	    let attempt = solveN(working2, pool2, state);
	    if (attempt) {
		return attempt;
	    }
	}
    }
}

function solve(tiles) {
    const order = c => (rank(c) << 3) + colour(c) + (isjoker(c) << 10);
    
    let state = { count: 0, begins: 0 },
	sorted = tiles.slice(0);
    sorted.sort((x,y)=>(order(x)-order(y)));
    state.solution = solveN([], sorted, state);

    return state;
}

function sol_len(solve_output) {
    if (solve_output.solution) return solve_output.solution.length;
    return 0;
}

function bag() {
    let out = [];
    for (let i = 1 ; i <= 64; ++i) {
	if ((i%16)<14) { out.push(i); out.push(i); }
    }
    for (let i = 0 ; i < out.length - 1; ++i) {
	let j = i + Math.floor(Math.random() * (out.length - i));
	if (j > i) {
	    out[j] += out[i];
	    out[i] = out[j] - out[i];
	    out[j] = out[j] - out[i];
	}
    }
    return out;
}

function random_solve(n) {
    const a = bag().slice(0,n),
	  out = solve(a);
    out.src = a;
    return out;
}

function test_vector(cases, bag_size) {
    out = [];
    for (let i = 0; i < cases; ++i) out.push(random_solve(bag_size));
    return out;
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
    run8: function() { return check(JSON.stringify(isastraight(tocards('Y8 JD Y9')))) == '[8,2]'; },
    run9: function() { return isastraight(tocards('Y8 Y9 Y10 Y6'))[0] == 0; },
    run10: function() { return check(JSON.stringify(isastraight(tocards('Y6 JS Y8 Y9')))) == '[6,2]'; },
    addr1: function() { return canadd(tocards('Y8 Y9 Y10'), tocard('Y11')) == ST_GOOD; },
    addr2: function() { return check(canadd(tocards('Y8 Y9 Y10'), tocard('Y6'))) == ST_BAD; },
    addr3: function() { return canadd(tocards('Y8 Y9 Y10'), tocard('T7')) == ST_BAD; },
    addr4: function() { return canadd(tocards('Y8 Y9 Y10'), tocard('Y8')) == ST_BAD; },
    addr5: function() { return canadd(tocards('Y8 Y9 Y10'), tocard('Y11')) == ST_GOOD; },
    addr6: function() { return canadd([5,7], 6) == ST_BAD; }, // 5,7 is broken 
    addr7: function() { return canadd([5], 7) == ST_BAD; }, // 5,7 is broken
    addrj1: function() { return check(canadd(tocards('Y6 JS Y8'), tocard('Y9'))) == ST_GOOD; },
    addrj2: function() { return canadd(tocards('Y8 JS Y9'), tocard('Y11')) == ST_GOOD; },
    addrj3: function() { return canadd(check(tocards('Y8 JD Y9')), tocard('Y11')) == ST_BAD; },
    addrj4: function() { return canadd(tocards('Y8 JD Y7'), tocard('Y11')) == ST_GOOD; },
//    addrj5: function() { return canadd(tocards('Y8 JD Y7'), tocard('Y6')) == ST_GOOD; },
    addrj6: function() { return canadd(tocards('Y8 JD Y7'), tocard('Y5')) == ST_BAD; },
//    addrj7: function() { return canadd(tocards('Y8 JD Y7'), tocard('Y4')) == ST_GOOD; },
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
    jm8: function() { return canadd(tocards('R9 R9 JM'), tocard('T10')) == ST_BAD; },
    jm9: function() { return check(canadd(tocards('R9 R9 JM'), tocard('T10'))) == ST_BAD; },
    jm10: function() { return check(canadd(tocards('R9 R9 JM'), tocard('R10'))) == ST_INCOMPLETE; },
    jm11: function() { return check(isastraight(tocards('T10 JM R9')))[0] == 0; },
    jm12: function() { return check(canadd(tocards('R9 R9 JM R10'), tocard('R10'))) == ST_GOOD; },
    jm13: function() { return check(canadd(tocards('R9 R9 JM R10'), tocard('R8'))) == ST_BAD; },
    jm14: function() { return check(canadd(tocards('R9 R9 JM'), tocard('T10'))) == ST_BAD; },
    jm15: function() { return canadd([26, 48], 9) == ST_BAD; },
    jm15: function() { return isaset([26, 48, 9]) == 0; },

    solve1: function() { return check(JSON.stringify(solve(tocards('R5 R6 R7')).solution)) == '[[5,6,7]]'; },
    solve2: function() { return check(solve(tocards('R5 R6 R8')).solution) == null; },
    solve3: function() { return check(solve([26]).solution) == null; },
    solve4: function() { return check(solve([5,6,7,26]).solution) == null; },
    solve5: function() { return sol_len(check(solve(tocards('R5 R6 R7 T10 T11 T12')))) == 2; },
    solve6: function() { return sol_len(check(solve(tocards('R2 R3 R4 R5 JS B2 Y2 R8 T9 T10 JD')))) == 3; },
//    solve7: function() { return (solve(tocards('R9 R9 JM B8 B9 B10 B11 B12 B13 B11 R11 Y11 R10 B10 Y10 T10 T11 T12 Y7 Y8 Y9 Y10 R2 B2 Y2 T2 Y12 B12 R12 R3 Y3 T3'))).solution.length == 9; },
    solve7: function() { return sol_len(check((solve(tocards('R1 R1 JM'))))) == 1; },
    solve8: function() { return sol_len(check((solve(tocards('R9 R9 JM B8 B9 B10 B11 B12 B13 B11 R11 Y11 R10 B10 Y10 T10'))))) == 5; },
    solve9: function() { return check(solve(tocards('T10 JM R9 R9'))).solution == null; },
    rdet1: function() {
	let d = detailed(tocards('Y7 Y8 Y9 Y10'));
	check(JSON.stringify(d));
	return (d.straight && (d.lowrank = 7) && (d.highrank = 10) &&
		(d.lowcolour == 2) && (d.highcolour == 2) &&
		(!d.set) && (!d.mirrored));
    },
    rdet2: function() { return detailed(tocards('Y7 Y8 Y9 Y11')).straight == false; },
    rdet3: function() { return detailed(tocards('Y8 Y9 Y11')).straight == false; },
    rdet4: function() { return detailed(tocards('Y8 Y9')).straight == true; },
    rdet5: function() { return detailed(tocards('Y8 Y9')).highrank == 9; },
    rjdet1: function() { return detailed(tocards('Y8 Y9 Y11 JS')).straight == true; },
    rjdet2: function() { return detailed(tocards('Y8 Y9 Y11 JD')).straight == false; },
    rjdet3: function() { return detailed(tocards('Y8 Y9 Y12 JD')).straight == true; },
    rjdet4: function() { return detailed(tocards('Y8 Y9 Y12 JS JS')).straight == true; },
    rjdet5: function() { return detailed(tocards('Y8 Y9 Y11 JS')).highrank == 11; },
    rjdet6: function() { return detailed(tocards('Y8 Y9 Y10 JS')).highrank == 11; },
    sdet1: function() { return detailed(tocards('B5 R5 T5')).set == true; },
    sdet2: function() { return detailed(tocards('B5 R6 T5')).set == false; },
    sdet3: function() { return detailed(tocards('B5 R5')).set == true; },
    sdet4: function() { return detailed(tocards('B5 B5 Y5')).set == false; },
    sdet5: function() { return detailed(tocards('B5')).set == true; },
    sjdet1: function() { return detailed(tocards('B5 R5 JD')).set == true; },
    sjdet2: function() { return detailed(tocards('B5 R5 Y5 JD')).set == false; },
    sjdet3: function() { return detailed(tocards('B5 R5 Y5 JS')).set == true; },
    smdet1: function() { return detailed(tocards('B5 B5 JS')).set == false; },
    smdet2: function() { return detailed(tocards('B5 B5 JM')).set == true; },
    smdet3: function() { return detailed(tocards('B5 R5 JM')).set == false; },
    smdet4: function() { return detailed(tocards('B5 R5 B5 JM')).set == false; },
    smdet5: function() { return detailed(tocards('B5 R5 B5 R5 JM')).set == true; },
    rmdet1: function() { return detailed(tocards('B5 B5 JM')).straight = true; },
    rmdet2: function() { return check(detailed(tocards('B5 B6 JM'))).straight == false; },
    rmdet3: function() { return detailed(tocards('B5 T5 JM')).straight == false; },
    rmdet4: function() { return detailed(tocards('B5 B5 B6 B6 JM')).straight == true; },
    rmdet5: function() { return detailed(tocards('B5 JS JM')).straight == true; },
    rmdet6: function() { return detailed(tocards('R9 R9 JM R10')).set == false; },
    scdet1: function() { return detailed(tocards('R5 T7 JC')).straight == true; },
    scdet2: function() { return detailed(tocards('R5 R7 JC')).straight == false; },
    scdet1: function() { return detailed(tocards('R5 T8 JC')).straight == false; },
    smadd1: function() { return check(canadd_t(detailed(tocards('R1')), tocard('JM'))) == ST_INCOMPLETE; },
    smadd2: function() { return check(canadd_t(detailed(tocards('R1 JM')), tocard('R1'))) == ST_GOOD; },
    jdadd1: function() { return canadd_t(detailed([3, 19, 32]), 35) == false; },
}
