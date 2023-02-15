function importFile() {
    ajax('import', 'GET');
}

function register() {
    ajax('auth', 'POST');
}

function add() {
    const payload = {
      content: [ 'abc123', 'hello,s,u,g,a,r' ]
    };
    payload.content = encodeCommas(payload.content);
    ajax('add', 'POST', payload);
}

function signIn() {
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  ajax(
    'auth/signin',
    'POST',
    {username: username.value, password: password.value},
    () => {
      const signinContainer = document.getElementById('signin-container');
      const signoutContainer = document.getElementById('signout-container');
      signinContainer.style.display = 'none';
      signoutContainer.style.display = 'block';
      username.value = '';
      password.value = '';
    }
  );
}

function signOut() {
  ajax(
    'auth/signout',
    'POST',
    null,
    () => {
      const signinContainer = document.getElementById('signin-container');
      const signoutContainer = document.getElementById('signout-container');
      signinContainer.style.display = 'block';
      signoutContainer.style.display = 'none';
    }
  );
}

function encodeCommas(array) {
  const regex = /,/g
  const newArray = [];

  for (let i = 0; i < array.length; i++) {
    newArray.push(array[i].replace(regex, '&comma;'));
  }
  return newArray;
}

function ajax(endpoint, method, payload, callback) {
  const xhttp = new XMLHttpRequest();
  const url = 'http://localhost:3000/' + endpoint;

  xhttp.onreadystatechange = function() {
    console.log('readyState: ', this.readyState);
    if (this.readyState === 4) {
      if (this.status === 200) {
          console.log('success!');
          if (callback) {
            callback();
          }
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