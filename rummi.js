
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

