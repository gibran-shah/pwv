function pageLoad() {
  if (isSignedIn()) {
    renderSignedInContainer();
    wireElements();
  } else {
    renderSignedOutContainer();
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    username.value = 'gibran.shah.pwv@gmail.com';
    password.value = 'pwv.4real.123.@';
  }
}

function isSignedIn() {
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    const expirationTime = localStorage.getItem('expirationTime');
    if (expirationTime) {
      return parseInt(expirationTime) > Date.now();
    }
    return false;
  }

  return false;
}

function importFile() {
    ajax('import', 'GET');
}

function search() {
    const searchString = document.querySelector('#search-container input').value;
    ajax('fetch', 'GET', { searchString: searchString }, (response) => {
      const parsedResponse = JSON.parse(response);
      showResults(parsedResponse, searchString);
    });
}

function add() {
  console.log('add!!!');
    // const payload = {
    //   content: [ 'abc123', 'hello,s,u,g,a,r' ]
    // };
    // payload.content = encodeCommas(payload.content);
    // ajax('add', 'POST', payload);
}

function signIn() {
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  ajax(
    'auth/signin',
    'POST',
    { username: username.value, password: password.value },
    (response) => {
      const responseObj = JSON.parse(response);
      const { accessToken, expirationTime } = responseObj;
      if (accessToken && expirationTime) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('expirationTime', expirationTime);
        renderSignedInContainer();
        wireElements();
      } else {
        console.log('Could not log in');
      }
    }
  );
}

function signOut() {
  ajax(
    'auth/signout',
    'POST',
    null,
    (response) => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('expirationTime');
      renderSignedOutContainer();
    }
  );
}

function renderSignedInContainer() {
  const signedInContainer = document.getElementById('signed-in-container');
  const signedOutContainer = document.getElementById('signed-out-container');
  signedInContainer.style.display = 'flex';
  signedOutContainer.style.display = 'none';
  username.value = '';
  password.value = '';
}

function renderSignedOutContainer() {
  const signedInContainer = document.getElementById('signed-in-container');
  const signedOutContainer = document.getElementById('signed-out-container');
  signedInContainer.style.display = 'none';
  signedOutContainer.style.display = 'flex';
}

function wireElements() {
  const searchInput = document.querySelector('#search-container input');
  if (!window.keyPressEventListener && searchInput) {
    window.keyPressEventListener = searchInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        search();
      }
    });
  }
}

function showResults(results, searchString) {
  const resultsContainer = document.querySelector('#search-results-container');
  resultsContainer.innerHTML = '';

  if (results.length) {
    for (let i = 0; i < results.length; i++) {
      const group = results[i];
      const groupDiv = createGroupDiv(i);
      for (let j = 0; j < group.length; j++) {
        const line = group[j];
        const lineDiv = createLineDiv(group, line, i, j, searchString);
        groupDiv.append(lineDiv);
      }
      resultsContainer.append(groupDiv);
    }
  } else {
    const noResultsDiv = createNoResultsDiv();
    resultsContainer.append(noResultsDiv);
  }
}

function createGroupDiv(groupNum) {
  const groupDiv = document.createElement('div');
  groupDiv.id = `results-group-container-${groupNum}`;
  groupDiv.classList.add('results-group-container');
  return groupDiv;
}

function createLineDiv(group, line, groupNum, lineNum, searchString) {
  const lineDiv = document.createElement('div');
  lineDiv.id = `result-line-container-${groupNum}-${lineNum}`;
  lineDiv.classList.add('results-line-container');

  const numberDiv = document.createElement('div');
  numberDiv.innerHTML = `<span class='line-number-span'>${line.line}</span>`;
  lineDiv.append(numberDiv);

  const regex = new RegExp(searchString, 'gi');
  line.content = line.content.replace(regex, `<span class='search-string-instance'>$&</span>`);

  const contentDiv = document.createElement('div');
  contentDiv.classList.add('line-content-container');
  contentDiv.innerHTML = `<span class='line-content-span'>${line.content}</span>`;
  lineDiv.append(contentDiv);

  return lineDiv;
}

function createNoResultsDiv() {
  const noResultsDiv = document.createElement('div');
  noResultsDiv.id = 'no-results-container';
  noResultsDiv.innerHTML = 'No Matches';
  return noResultsDiv;
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
  const params = payload ? new URLSearchParams(payload) : null;
  const url = 'http://localhost:3000/' + endpoint + (params ? `?${params}` : '');

  xhttp.onreadystatechange = function() {
    if (this.readyState === 4) {
      if (this.status === 200) {
        if (callback instanceof Function) {
          callback(this.response);
        }
      } else {
        console.log('error: ', JSON.stringify(this));
      }
    }  
  };
  xhttp.open(method, url, true);
  xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  if (params && method === 'POST') {
    xhttp.send(params);
  } else {
    xhttp.send();
  }
}