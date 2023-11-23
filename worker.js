importScripts('./rummi.js');

onmessage = (ev) => {
  console.log(['worker received', ev.data]);
  let soln = solve(ev.data);
  postMessage(soln);
};

