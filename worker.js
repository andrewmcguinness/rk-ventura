importScripts('./rummi.js');

function post_progress(solve_state) {
  postMessage(solve_state);
}


onmessage = (ev) => {
  console.log(['worker received', ev.data]);

  if (ev.data.test_vector) {
    postMessage(test_vector(ev.data.test_vector.cases, ev.data.test_vector.bag_size, post_progress));
    return;
  }
    
  let soln = solve(ev.data, post_progress);
  postMessage(soln);
};

