importScripts('./rummi.js');

function post_progress(solve_state) {
  postMessage(solve_state);
}


onmessage = (ev) => {
  let soln = solve(ev.data, post_progress);
  postMessage(soln);
};
