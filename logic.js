function importFile() {
    ajax('import', 'GET');
}

function register() {
    ajax('auth', 'POST');
}

function signIn() {
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  ajax('auth/signin', 'POST', {username: username.value, password: password.value});
}

function ajax(endpoint, method, payload) {
  const xhttp = new XMLHttpRequest();
  const url = 'http://localhost:3000/' + endpoint;

  xhttp.onreadystatechange = function() {
    console.log('readyState: ', this.readyState);
    if (this.readyState === 4) {
      if (this.status === 200) {
          console.log('success!');
      } else {
          console.log('error: ', JSON.stringify(this));
      }
    }  
  };
  xhttp.open(method, url, true);
  xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  if (payload) {
    xhttp.send(new URLSearchParams(payload));
  } else {
    xhttp.send();
  }
}