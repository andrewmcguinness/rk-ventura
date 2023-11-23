importScripts('./rummi.js');

onmessage = (ev) => {
  console.log(['worker', ev]);
  let soln = solve(ev.data);
  postMessage(soln);
};

