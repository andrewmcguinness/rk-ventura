
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

function ordering(c) {
  return (rank(c) << 3) + colour(c) + (isjoker(c) << 10);
}

function tilesort(x,y) {
  return ordering(x)-ordering(y);
}

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
  return s.split(/ +/).map(tocard).filter(x=>x);
}

ST_BAD = 0;
ST_INCOMPLETE = 1;
ST_GOOD = 2;

function Details(arr1, next) {
  if (arr1.tiles) { // copy
    Object.assign(this, arr1);
    this.tiles = arr1.tiles.slice(0);
    if (arr1.mirror_tiles) this.mirror_tiles = arr1.mirror_tiles.slice(0);
  } else if (arr1.length == 0) {
    this.tiles = [];
    this.mirrored = false;
    this.complete = false;
  } else if ((arr1.length == 1) && (!isjoker(arr1[0]))) { // new
    let c = arr1[0];
    this.tiles = arr1.slice(0)
    this.straight = 1;
    this.set = 1;
    this.colours = 1<<colour(c);
    this.lowrank = rank(c);
    this.lowcolour = colour(c);
    this.highrank = rank(c);
    this.highcolour = colour(c);
    this.mirrored = false;
    this.complete = false;
  }
  return this;
}

// number of physical tiles in a group
Details.prototype.physical = function() {
  if (this.mirrored) return this.tiles.length + this.mirror_tiles.length + 1;
  else return this.tiles.length;
}


/* ret.tiles is all actual tiles in the right order,
 * except when mirrored -- then it is all the tiles left of the mirror.
 * mirror_tiles is the tiles right of the mirror (reversed).
 * mirror joker is not stored at all
 */
Details.prototype.canadd = function(c) {
  let sz = this.physical();
  if (c == J_MIRROR) {
    if (sz == 1) {
      let ret = new Details(this, c);
      ret.mirrored = true;
      ret.complete = false;
      ret.set = 2;
      ret.straight = 2;
      ret.mirror_tiles = [];
      return ret;
    }
    else return ST_BAD;
  }
  
  if (this.mirrored) {
    /* restrictions on mirrors:
     * buildup is normal tile, mirror, mirror first tile (real or JS),
     * extend with normal tile, mirror, next tile (real or JS), etc.
     * no JD or JC. No JS on both sides
     */
    if (this.complete) { // currently balanced - extend the real half
      if (this.set) {
	if ((rank(c) == this.lowrank) && !(this.colours & (1 << colour(c)))) {
	  let ret = new Details(this, c);
	  ret.colours = this.colours | (1 << colour(c));
	  ret.tiles.push(c);
	  ret.complete = false;
	  ret.straight = false;
	  ++ret.set;
	  return ret;
	}
      }
      if (this.straight) {
	if ((rank(c) == (this.highrank + 1)) && (colour(c) == this.highcolour)) {
	  let ret = new Details(this, c);
	  ++ret.highrank;
	  ++ret.straight;
	  ret.tiles.push(c);
	  ret.set = false;
	  ret.complete = false
	  return ret;
	}
      }
    } else { // unbalanced, need to balance
      let tomirror = this.tiles[this.tiles.length - 1];
      if (c == tomirror) {
	let ret = new Details(this, c);
	ret.mirror_tiles.push(c);
	ret.complete = true;
	return ret;
      }
      if (c == J_SINGLE) {
	let ret = new Details(this, c);
	ret.mirror_tiles.push(c);
	ret.complete = true;
	return ret;
      }
      return ST_BAD;
    }
  }

  if (sz == 0) {
    if (isjoker(c)) return ST_BAD;
    return new Details([c]);
  }

  if (this.set && (rank(c) == this.lowrank) &&
      (this.set < 4) &&
      !(this.colours & (1 << colour(c)))) {
    let ret = new Details(this, c);
    ret.colours |= (1 << colour(c));
    ret.tiles.push(c);
    ret.complete = (sz >= 2);
    ret.straight = false;
    ret.set = this.set + 1;
    return ret;
  }

  if (this.set && (this.set < 4) &&
      c == J_SINGLE) {
    let ret = new Details(this, c);
    ret.tiles.push(c);
    ++ret.set;
    if (ret.straight) {
      ++ret.straight;
      if (this.highrank < 12) ret.highrank += 1;
      else ret.lowrank -= 1;
    }
    ret.complete = (sz >= 2);
    return ret;
  }

  if (this.set && (this.set < 3) &&
      c == J_DOUBLE) {
    let ret = new Details(this, c);
    ret.tiles.push(c);
    ret.complete = (sz >= 2);
    ret.set += 2;
    if (ret.straight) ret.straight += 2;
    return ret;
  }

  if (this.straight && (rank(c) == (this.highrank + 1)) && (colour(c) == this.highcolour)) {
    let ret = new Details(this, c);
    ret.highrank++
    ret.tiles.push(c);
    ret.set = false;
    ++ret.straight;
    ret.complete = (sz >= 2);
    return ret;
  }

  if (this.straight && ((this.highrank < 12) || (this.lowrank > 2)) &&
      ((c == J_SINGLE)||(c == J_DOUBLE))) {
    let ret = new Details(this, c),
	j = (c == J_DOUBLE)?2:1;
    if (this.highrank < 12) {
      ret.highrank += j;
      ret.tiles.push(c);
    } else {
      ret.lowrank -= j;
      ret.tiles.unshift(c);
    }
    ret.straight += j;
    ret.complete = (sz >= 2);
    return ret;
  }

  if (this.straight && (c == J_CHANGE) && (this.highrank < 12)) {
    let ret = new Details(this, c);
    ret.tiles.push(c);
    ++ret.highrank;
    ret.complete = false;
    ret.set = false;
    ++ret.straight;
    ret.highcolour = 16 + this.highcolour;
    return ret;
  }

  if (this.straight && (this.highcolour >= 16) &&
      (rank(c) == (this.highrank + 1)) && ((colour(c) + 16) != this.highcolour)) {
    let ret = new Details(this, c);
    ++ret.highrank;
    ++ret.straight;
    ret.highcolour = colour(c);
    ret.tiles.push(c);
    ret.complete = true;
    return ret;
  }

  if (this.straight && (this.highcolour > 16) && ((c == J_SINGLE) || (c == J_DOUBLE))) {
    let j = (c == J_DOUBLE)?2:1;
    if ((this.highrank + j) > 13) return ST_BAD;
    let ret = new Details(this, c);
    ret.highrank += j;
    ret.tiles.push(c);
    ret.complete = true;
    return ret;
  }

  return ST_BAD;
}

// return a pool with element i removed
function pool_remove(pool, el) {
  const ret = pool.slice(0, pool.length - 1);
  for (let i = el; i < ret.length; ++i)
    ret[i] = pool[i+1];
  return ret;
}

// working is a group that is being built up
// cursor is the index in the pool of the last non-joker tile added (latest in pool sort order)
// pool is the tiles available
// state holds counters.
function solveN(details, cursor, pool, state, depth) {
    if (pool.length == 0) {
      if (!details) return [];
      else return null;
    }
  if (!details) {
      let pool2 = pool.slice(1),
	  w = [pool[0]];
    return solveN(new Details(w), 0, pool2, state, depth);
  }

    for (let i = cursor; i < pool.length; ++i) {
      ++(state.vars.count);
      if (!(state.vars.count & 0xffffff)) {
	if (state.cb) {
	  state.vars.working = cardsstr(details.tiles);
	  state.vars.pool = pool.length;
	  state.vars.depth = depth;
	  state.cb(state.vars);
	}
      }
      while((i > 0) && (pool[i] == pool[i-1])) ++i; // skip duplicates if failed already
      if (i >= pool.length) break;

      let next = pool[i],
	  st = details.canadd(next);

      if (st) {
	let pool2 = pool_remove(pool, i);

	if (st.complete) {
	  ++(state.vars.begins);
	  let attempt = solveN(null, 0, pool2, state, depth+1);
	  if (attempt) {
	    attempt.unshift(st);
	    return attempt;
	  }
	}

	let attempt = solveN(st, (isjoker(next))?cursor:i, pool2, state, depth);
	if (attempt) {
	  return attempt;
	}
      }
    }
}

function solve(tiles, cb) {
  let state = { cb: cb, vars:
		{ count: 0, begins: 0,
		  completed: false, succeeded: false,
		  start_time: new Date().getTime() } },
      sorted = new Int8Array(tiles);
  sorted.sort(tilesort);
  state.vars.solution = solveN(null, 0, sorted, state, 0);
  state.vars.completed = true;
  state.vars.succeeded = !!(state.vars.solution);
  state.vars.end_time = new Date().getTime();
  state.vars.elapsed = state.vars.end_time - state.vars.start_time;

  return state.vars;
}

function sol_len(solve_output) {
    if (solve_output.solution) return solve_output.solution.length;
    return 0;
}


// Rendering code

function prettytile(c, doc) {
  const el = doc.createElement('span');
  let t = colour(c);
  if (isjoker(c)) {
    el.classList.add('joker');
    --t;
  }
  el.classList.add('tilecolour-' + Colours[t]);
  el.textContent = cardstr(c);
  return el;
}
    
function prettymeld(arr) {
  let det = arr;
  if (!det.tiles) det = new Details(arr);

  if (det.mirrored) {
    return det.tiles.concat([J_MIRROR]).concat(det.mirror_tiles.slice(0).reverse());
  } else {
    return det.tiles;
  }
}

function itemof(arr) {
  const li = document.createElement('li');
  prettymeld(arr).map(c => prettytile(c, document)).forEach(el => {
    el.classList.add('tile');
    li.appendChild(el);
    li.append(document.createTextNode(' '));
  });
  return li;
}

// write a solution into a div with id 'solution'
function solve_complete(tiles, start_time, soln) {
  let display = document.getElementById('solution');
  console.log(soln);
  if (soln.solution) {
    for (let meld of soln.solution) {
      const li = itemof(meld);
      display.appendChild(li);
    }
  }
  document.getElementById('solvestatus').textContent =
    'Considered ' + soln.begins + '/' + soln.count + ' nodes in ' + soln.elapsed + 'ms - ' +
    (soln.succeeded?'Solved':'Not Solved');
  return soln;
}
	  

// random hands

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

function random_solve(n, cb) {
    const a = bag().slice(0,n),
	  out = solve(a, cb);
    out.src = a;
    return out;
}

function test_vector(cases, bag_size, cb) {
  out = [];
  for (let i = 0; i < cases; ++i) out.push(random_solve(bag_size, cb));
  return out;
}

//  TESTS

// helpers for old tests
function make_details(arr) {
  if (!arr.length) return ST_BAD;
  let det = new Details(arr.slice(0,1));
  for (let i = 1; i < arr.length; ++i) {
    det = det.canadd(arr[i]);
    if (!det) return det;
  }
  return det;
}

function canadd(arr, c) {
  const d = make_details(arr).canadd(c);
  if (d) return d.complete?ST_GOOD:ST_INCOMPLETE;
  else return ST_BAD;
}

function isaset(arr) {
    let det = make_details(arr);
    if (det.set) return [det.lowrank];
    else return [0];
}

function isastraight(arr1) {
    let det = make_details(arr1);
    if (det.straight) return [det.lowrank, det.lowcolour];
    else return [0];
}


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
    add10: function() { return make_details(tocards('Y12 JC R12')) == ST_BAD; },
    add11: function() { return canadd(tocards('Y11'), tocard('JS')) == ST_INCOMPLETE; },
    add12: function() { return canadd(tocards('Y12 R12 B12'), tocard('JD')) == ST_BAD; },
    add13: function() { return canadd(tocards('R12 B12'), tocard('JD')) == ST_GOOD; },
    run1: function() { return check(isastraight(tocards('R5 R6 R7')))[0] == 5; },
    run2: function() { return check(isastraight(tocards('R5 T6 R7')))[0] == 0; },
    run3: function() { return check(isastraight(tocards('T5 T6 T8')))[0] == 0; },
    run4: function() { return check(isastraight(tocards('T4 T5 T6')))[0] == 4; },
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
    addr6: function() { return make_details([5,7]) == ST_BAD; }, // 5,7 is broken 
    addr7: function() { return canadd([5], 7) == ST_BAD; }, // 5,7 is broken
    addrj1: function() { return check(canadd(tocards('Y6 JS Y8'), tocard('Y9'))) == ST_GOOD; },
    addrj2: function() { return canadd(tocards('Y8 Y9 JS'), tocard('Y11')) == ST_GOOD; },
    addrj3: function() { return canadd(check(tocards('Y8 Y9 JD')), tocard('Y11')) == ST_BAD; },
    addrj6: function() { return canadd(tocards('Y7 Y8 JD'), tocard('Y5')) == ST_BAD; },
    addrj8: function() { return check(canadd(tocards('Y6 JS Y8'), tocard('Y9'))) == ST_GOOD; },
    pretty2: function() { return isaset([3,4,5,8,32]) == 0; },
    jc1: function() { return check(isastraight(tocards('T5 T6 JS B9')))[0] == 0; },
    jc2: function() { return check(isastraight(tocards('B5 B6 JC T8')))[0] == 5; },
    jc3: function() { return check(isastraight(tocards('T5 T6 JC B8')))[0] == 5; },
    jc4: function() { return canadd(tocards('Y8 Y9 JS'), tocard('JC')) == ST_INCOMPLETE; },
    jc5: function() { return check(canadd(tocards('Y7 Y8 Y9 JC'), tocard('Y11'))) == ST_BAD; },
    jc6: function() { return canadd(tocards('Y7 JS Y9 JC'), tocard('R11')) == ST_GOOD; },
    jc7: function() { return check(isastraight(tocards('Y8 Y9 JC Y11')))[0] == 0; },
    jm1: function() { return isaset(tocards('R1 JM R1'))[0] == 1; },
    jm2: function() { return isaset(tocards('R1 JM T1'))[0] == 0; },
    jm3: function() { return check(isaset(tocards('R3 JM R3 T3 T3')))[0] == 3; },
    jm4: function() { return check(isastraight(tocards('R3 JM R3 R4 R4')))[0] == 3; },
    jm5: function() { return check(isastraight(tocards('R3 JM R3 R4 JS')))[0] == 3; },
    jm6: function() { return check(isastraight(tocards('R3 R3 JM R4')))[0] == 0; },
  jm7: function() { return make_details(tocards('R1 JM')).complete == false; },
    jm8: function() { return canadd(tocards('R9 JM R9'), tocard('T10')) == ST_BAD; },
    jm9: function() { return check(canadd(tocards('R9 JM R9'), tocard('T10'))) == ST_BAD; },
    jm10: function() { return check(canadd(tocards('R9 JM R9'), tocard('R10'))) == ST_INCOMPLETE; },
    jm11: function() { return check(isastraight(tocards('T10 JM R9')))[0] == 0; },
    jm12: function() { return check(canadd(tocards('R9 JM R9 R10'), tocard('R10'))) == ST_GOOD; },
    jm13: function() { return check(canadd(tocards('R9 JM R9 R10'), tocard('R8'))) == ST_BAD; },
    jm14: function() { return check(canadd(tocards('R9 JM R9'), tocard('T10'))) == ST_BAD; },
    jm15: function() { return canadd([26, 48], 9) == ST_BAD; },
    jm15: function() { return isaset([26, 48, 9]) == 0; },

  solve1: function() { return check(JSON.stringify(solve(tocards('R5 R6 R7')).solution.map(x => x.tiles))) == '[[5,6,7]]'; },
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
	let d = make_details(tocards('Y7 Y8 Y9 Y10'));
	check(JSON.stringify(d));
	return (d.straight && (d.lowrank = 7) && (d.highrank = 10) &&
		(d.lowcolour == 2) && (d.highcolour == 2) &&
		(!d.set) && (!d.mirrored));
    },
    rdet2: function() { return !make_details(tocards('Y7 Y8 Y9 Y11')).straight; },
    rdet3: function() { return !make_details(tocards('Y8 Y9 Y11')).straight; },
    rdet4: function() { return make_details(tocards('Y8 Y9')).straight == 2; },
    rdet5: function() { return make_details(tocards('Y8 Y9')).highrank == 9; },
    rjdet1: function() { return make_details(tocards('Y8 Y9 JS Y11')).straight == 4; },
    rjdet2: function() { return make_details(tocards('Y8 Y9 JD Y11')).straight == undefined; },
    rjdet3: function() { return make_details(tocards('Y8 Y9 JD Y12')).straight == 5; },
    rjdet4: function() { return make_details(tocards('Y8 Y9 JS JS Y12')).straight == 5; },
    rjdet5: function() { return make_details(tocards('Y8 Y9 JS Y11')).highrank == 11; },
    rjdet6: function() { return make_details(tocards('Y8 Y9 Y10 JS')).highrank == 11; },
    sdet1: function() { return make_details(tocards('B5 R5 T5')).set == 3; },
    sdet2: function() { return make_details(tocards('B5 R6 T5')).set == undefined; },
    sdet3: function() { return make_details(tocards('B5 R5')).set == 2; },
    sdet4: function() { return make_details(tocards('B5 B5 Y5')).set == undefined; },
    sdet5: function() { return make_details(tocards('B5')).set == 1; },
    sjdet1: function() { return make_details(tocards('B5 R5 JD')).set == 4; },
    sjdet2: function() { return make_details(tocards('B5 R5 Y5 JD')).set == undefined; },
    sjdet3: function() { return make_details(tocards('B5 R5 Y5 JS')).set == 4; },
    smdet1: function() { return make_details(tocards('B5 B5 JS')).set == undefined; },
    smdet2: function() { return make_details(tocards('B5 JM B5')).set == 2; },
    smdet3: function() { return make_details(tocards('B5 JM R5')).set == undefined; },
    smdet4: function() { return make_details(tocards('B5 JM B5 R5')).set == 3; },
    smdet5: function() { return make_details(tocards('B5 JM B5 R5 R5')).set == 3; },
    rmdet1: function() { return make_details(tocards('B5 B5 JM')).straight = true; },
    rmdet2: function() { return !check(make_details(tocards('B5 B6 JM'))).straight; },
    rmdet3: function() { return !make_details(tocards('B5 JM T5')).straight; },
    rmdet4: function() { return make_details(tocards('B5 JM B5 B6 B6')).straight == 3; },
    rmdet5: function() { return make_details(tocards('B5 JM JS')).straight == 2; },
    rmdet6: function() { return make_details(tocards('R9 JM R9 R10')).set == false; },
    scdet1: function() { return make_details(tocards('R5 JC T7')).straight == 3; },
    scdet2: function() { return make_details(tocards('R5 JC R7')).straight == undefined; },
    scdet1: function() { return make_details(tocards('R5 JC T8')).straight == undefined; },
  smadd1: function() { return check(make_details(tocards('R1')).canadd(tocard('JM'))).complete == false; },
  smadd2: function() { return check(make_details(tocards('R1 JM')).canadd(tocard('R1'))).complete; },
  jdadd1: function() { return make_details([3, 19, 32]).canadd(35) == false; },
//  solve10: function() { return check(solve(make_details([ 13, 48, 13, 45, 16, 61, 61]))).solution.pop().length != 6; },
  jm16: function() { return make_details([13, 48, 13, 45]).canadd(48) == ST_BAD; },
  jm17: function() { return make_details([3, 19, 32]).canadd(35) == false; },
}
