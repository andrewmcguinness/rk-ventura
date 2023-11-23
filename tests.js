

function clear() {
  for (let l of ['errors', 'output']) {
    const e = document.getElementById(l);
    while (e.firstChild) e.removeChild(e.firstChild);
  }
}
function err(x) {
  const li = document.createElement('li');
  li.textContent = x;
  document.getElementById('errors').appendChild(li);
}
function out(x) {
  const li = document.createElement('li');
  li.textContent = x;
  document.getElementById('output').appendChild(li);
}
function go() {
  const selected = document.getElementById('onetest').value;
  if (selected) return runonetest(selected);
  const results = runtests();
  console.log(results);
  for (let e of results.failed) err(e);
  for (let o of results.all) out(o);
}

function dosolve() {
  let arr = tocards(document.getElementById('hand').value),
      li = document.querySelector('#tosolve'),
      display = document.getElementById('solution');
  arr.sort((x, y) => (x - y));
  while (li.firstChild) li.removeChild(li.firstChild);
  arr.map(c => prettytile(c, document)).forEach(el => {
    li.appendChild(el);
    li.append(document.createTextNode(' '));
  });
  while (display.firstChild) display.removeChild(display.firstChild);
  document.getElementById('solvestatus').textContent = 'Working...';
  workersolve(arr);
}

function get_worker() {
  if (!window.solve_worker) solve_worker = new Worker('./worker.js');
  return solve_worker;
}

function workersolve(tiles) {
  get_worker();
  let starttm = new Date().getTime();

  solve_worker.onmessage = (msg) => {
    console.log('solve:', msg.data);
    if (msg.data.completed)
      solve_complete(tiles, starttm, msg.data);
    else {
      const seconds = (new Date().getTime() - msg.data.start_time)/1000;
      document.getElementById('solvestatus').textContent = 'Working ' + Math.floor(seconds) + 's';
    }
  }
  solve_worker.postMessage(tiles);
  console.log('waiting for solve');
}

function random_hands(cases, bag_size) {
  get_worker();
  solve_worker.onmessage = (msg) => {
    console.log(msg.data);
    lastmsg = msg.data;
  }
  solve_worker.postMessage({test_vector: {cases: cases, bag_size: bag_size}});
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
