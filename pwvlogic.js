let lineToDelete = null;
let searchString = '';

function pageLoad() {
  if (isSignedIn()) {
    if (
      window.location.pathname === '/index.html'
      || window.location.pathname === ''
    ) {
      window.location.href = `${getHostName()}/signedin.html`;
    } else {
      wireElements();
    }
    //importFile();
  } else {
    if (
      window.location.pathname === '/signedin.html'
    ) {
      window.location.href = `${getHostName()}/index.html`;
    }
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
    searchString = document.querySelector('#search-container input').value;
    ajax('fetch', 'GET', { searchString: searchString }, (response) => {
      const parsedResponse = JSON.parse(response);
      showResults(parsedResponse, searchString);
    });
}

function add() {
  openModal('add');
}

function openModal(modal, data) {
  // disable scrolling on page
  const body = document.querySelector('body');
  body.style.height = '100vh';
  body.style['overflow-y'] = 'hidden';

  // bring modal into view:
  let backdrop;
  switch (modal) {
    case 'add':
      backdrop = document.querySelector('#add-lines-backdrop');
      break;
    case 'delete':
      backdrop = document.querySelector('#delete-line-backdrop');
      const modalBody = backdrop.querySelector('.modal-body');
      modalBody.innerHTML = modalBody.innerHTML.replace('[line-num]', data.lineNum);
      break;
    default:
      console.log(`ERROR: Unknown modal: ${modal}`);
      return;
  }; 
  backdrop.style.display = 'flex';
}

function submitNewLines() {
  const lines = document.querySelector('#new-lines-textarea').value;
  const payload = {
    content: lines.split('\n')
  };
  payload.content = encodeCommas(payload.content);
  ajax('add', 'POST', payload, function() {
    displaySuccessMessage('Lines added successfully');
    closeModal('add');
  }, function() {
    displayErrorMessage('Error adding lines');
    closeModal('add');
  });
}

function closeModal(modal) {
  let backdrop;
  switch (modal) {
    case 'add':
      backdrop = document.querySelector('#add-lines-backdrop');
      const textarea = document.querySelector('#new-lines-textarea');
      textarea.value = '';
      break;
    case 'delete':
      backdrop = document.querySelector('#delete-line-backdrop');
      break;
    default:
      console.log(`ERROR: Unknown modal: ${modal}.`);
      return;
  };

  backdrop.style.display = 'none';

  // enable scrolling on page
  const body = document.querySelector('body');
  body.style.height = '';
  body.style['overflow-y'] = '';
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
        window.location.href = `${getHostName()}/signedin.html`;
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
      window.location.href = `${getHostName()}/index.html`;
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
      const upperFetchMoreBtn = createFetchMoreButton(i, true);
      groupDiv.append(upperFetchMoreBtn);
      for (let j = 0; j < group.length; j++) {
        const line = group[j];
        const lineDiv = createLineDiv(line, i, j, searchString);
        groupDiv.append(lineDiv);
      }
      const lowerFetchMoreBtn = createFetchMoreButton(i, false);
      groupDiv.append(lowerFetchMoreBtn);
      resultsContainer.append(groupDiv);
      setLineIdsAndLineCount(i);
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

function createFetchMoreButton(groupNum, isUpper) {
  const fetchMoreBtn = document.createElement('button');
  fetchMoreBtn.id = `${isUpper ? 'upper' : 'lower'}-fetch-more-btn-${groupNum}`;
  fetchMoreBtn.classList.add('fetch-more-btn');
  fetchMoreBtn.innerHTML = `<img src='assets/images/${isUpper ? 'up-arrow' : 'down-arrow'}.png' />`;
  fetchMoreBtn.onclick = () => {
    fetchMore(groupNum, isUpper);
  };
  return fetchMoreBtn;
}

function fetchMore(groupNum, isUpper) {
  const lineNum = getLineNumberByIndex(groupNum, isUpper ? 0 : 'last');
  ajax(
    'fetch/byLineNum',
    'GET',
    {
      lineNum,
      count: 5,
      direction: isUpper ? 'before' : 'after'
    },
    (results) => { processFetchMoreResults(results, groupNum, isUpper); }
  );
}

function processFetchMoreResults(results, groupNum, isUpper) {
  const lines = JSON.parse(results);
  const fetchMoreBtn = document.querySelector(`#${isUpper ? 'upper' : 'lower'}-fetch-more-btn-${groupNum}`);
  const insertBeforeMe = isUpper ? fetchMoreBtn.nextSibling : fetchMoreBtn;
  const searchString = document.querySelector(`#search-container input`).value;

  for (let i = 0; i < lines.length; i++) {
    const newLine = createLineDiv(lines[i], groupNum, i, searchString);
    fetchMoreBtn.parentNode.insertBefore(newLine, insertBeforeMe);
  }

  const neighboringGroupNum = groupNum + (isUpper ? -1 : 1);
  if (shouldMergeGroups(groupNum, neighboringGroupNum)) {
    mergeGroups(groupNum, neighboringGroupNum);
  }

  setLineIdsAndLineCount(groupNum);
}

function shouldMergeGroups(groupNum, neighboringGroupNum) {
  const neighboringGroup = document.querySelector(`#results-group-container-${neighboringGroupNum}`);
  
  if (!neighboringGroup) {
    return false;
  }

  const group = document.querySelector(`#results-group-container-${groupNum}`);

  if (groupNum < neighboringGroupNum) {
    const lastLineNumInGroup = parseInt(
      document.querySelector(
        `#results-group-container-${groupNum} .results-line-container:last-of-type .line-number-span`
      ).innerHTML
    );
    const firstLineNumInNeighboringGroup = parseInt(
      document.querySelector(
        `#results-group-container-${neighboringGroupNum} .results-line-container:first-of-type .line-number-span`
      ).innerHTML
    );
    return lastLineNumInGroup >= firstLineNumInNeighboringGroup;
  } else {
    const firstLineNumInGroup = parseInt(
      document.querySelector(
        `#results-group-container-${groupNum} .results-line-container:first-of-type .line-number-span`
      ).innerHTML
    );
    const lastLineNumInNeighboringGroup = parseInt(
      document.querySelector(
        `#results-group-container-${neighboringGroupNum} .results-line-container:last-of-type .line-number-span`
      ).innerHTML
    );
    return firstLineNumInGroup <= lastLineNumInNeighboringGroup;
  }
}

function mergeGroups(groupNum, neighboringGroupNum) {
  const group = document.querySelector(`#results-group-container-${groupNum}`);
  const neighboringGroup = document.querySelector(`#results-group-container-${neighboringGroupNum}`);

  let neighboringGroupLines = Array.from(neighboringGroup.querySelectorAll(`.results-line-container`));

  if (groupNum < neighboringGroupNum) {
    const lastLineNumInGroup = group.querySelector(
      `.results-line-container:last-of-type .line-number-span`
    ).innerHTML;
    let currentLineNumInNeighboringGroup = '';
    while (lastLineNumInGroup !== currentLineNumInNeighboringGroup) {
      currentLineNumInNeighboringGroup = neighboringGroupLines[0].querySelector('.line-number-span').innerHTML;
      neighboringGroupLines[0].parentNode.removeChild(neighboringGroupLines[0]); // remove from DOM
      neighboringGroupLines = neighboringGroupLines.splice(1); // remove from array
    }
    const lowerFetchMoreBtn = group.querySelector(`#lower-fetch-more-btn-${groupNum}`);
    for (let i = 0; i < neighboringGroupLines.length; i++) {
      const line = neighboringGroupLines[i];
      lowerFetchMoreBtn.parentNode.insertBefore(line, lowerFetchMoreBtn);
    }
    neighboringGroup.remove();
  } else {
    const firstLineNumInGroup = group.querySelector(
      `.results-line-container:first-of-type .line-number-span`
    ).innerHTML;
    let currentLineNumInNeighboringGroup = '';
    let lastIndex = neighboringGroupLines.length - 1;
    while (firstLineNumInGroup !== currentLineNumInNeighboringGroup) {
      currentLineNumInNeighboringGroup = neighboringGroupLines[lastIndex].querySelector('.line-number-span').innerHTML;
      neighboringGroupLines[lastIndex].parentNode.removeChild(neighboringGroupLines[lastIndex]); // remove from DOM
      neighboringGroupLines.splice(lastIndex, 1); // remove from array
      lastIndex--;
    }
    const upperFetchMoreBtn = group.querySelector(`#upper-fetch-more-btn-${groupNum}`);
    for (let i = lastIndex; i >= 0; i--) {
      const line = neighboringGroupLines[i];
      upperFetchMoreBtn.parentNode.insertBefore(line, upperFetchMoreBtn.nextSibling);
    }
    neighboringGroup.remove();
  }
}

function setLineIdsAndLineCount(groupNum) {
  const lineElements = document.querySelectorAll(`#results-group-container-${groupNum} .results-line-container`);
  for (let i = 0; i < lineElements.length; i++) {
    const line = lineElements[i];
    line.id = `result-line-container-${groupNum}-${i}`;
  }
  const groupDiv = document.querySelector(`#results-group-container-${groupNum}`);
  groupDiv.setAttribute('line-count', lineElements.length);
}

function getLineNumberByIndex(groupNum, lineIndex) {
  if (lineIndex === 'last') {
    const groupContainer = document.querySelector(`#results-group-container-${groupNum}`);
    lineIndex = parseInt(groupContainer.getAttribute('line-count')) - 1;
  }
  const lineElm = document.querySelector(`#result-line-container-${groupNum}-${lineIndex}`);
  return parseInt(lineElm.querySelector('.line-number-span').innerHTML);
}

function createLineDiv(line, groupNum, lineNum, searchString) {
  const lineDiv = document.createElement('div');
  lineDiv.classList.add('results-line-container');

  const numberDiv = document.createElement('div');
  numberDiv.innerHTML = `<span class='line-number-span'>${line.line}</span>`;
  lineDiv.append(numberDiv);

  line.content = highlightSearchString(line.content);

  const contentDiv = document.createElement('div');
  contentDiv.classList.add('line-content-container');
  contentDiv.ondblclick = function(e) { lineContentDblClicked(e.target); };
  contentDiv.innerHTML = `<span class='line-content-span'>${line.content}</span>`;
  lineDiv.append(contentDiv);

  const actionButtonsContainer = document.createElement('div');
  actionButtonsContainer.classList.add('action-btns-container');
  actionButtonsContainer.classList.add('hide');
  lineDiv.append(actionButtonsContainer);

  fillActionButtonsContainer(actionButtonsContainer, line.line);

  lineDiv.addEventListener('mouseover', function() {
    actionButtonsContainer.classList.remove('hide');
  });

  lineDiv.addEventListener('mouseout', function() {
    actionButtonsContainer.classList.add('hide');
  });

  return lineDiv;
}

function fillActionButtonsContainer(actionButtonsContainer, line) {
  var buttonDetails = [
 //   { buttonIcon: 'trash-btn.png', title: 'delete this line', onClick: 'deleteLineClicked' },
   // { buttonIcon: 'trash-btn.png', title: 'delete this line', onClick: 'deleteLineClicked' },
    { buttonIcon: 'copy-btn.png', title: 'copy this line', onClick: 'copyLineClicked' },
    { buttonIcon: 'trash-btn.png', title: 'delete this line!', onClick: 'deleteLineClicked' }
  ];

  for (var i = 0; i < buttonDetails.length; i++) {
    const details = buttonDetails[i];
    const buttonDiv = document.createElement('div');
    buttonDiv.classList.add('action-btn-container');
    buttonDiv.innerHTML = `<img src="assets/images/${details.buttonIcon}" class="action-btn" title="${details.title}" onclick="${details.onClick}(${line})">`;
    actionButtonsContainer.append(buttonDiv);
  }
}

function highlightSearchString(content) {
  const regex = new RegExp(searchString, 'gi');
  return content.replace(regex, `<span class='search-string-instance'>$&</span>`);
}

function lineContentDblClicked(contentDiv) {
  const span = contentDiv.querySelector('span');
  span.classList.add('hide');

  // First, see if there's an input container already active and remove it:
  const inputContainerInstance = document.querySelector('#input-container-instance');
  if (inputContainerInstance) {
    const contentSpan = inputContainerInstance.parentElement.querySelector('.line-content-span');
    inputContainerInstance.remove();
    contentSpan.classList.remove('hide');
  }

  // Copy input container template and append it to contentDiv:
  const inputContainer = document.querySelector('.line-edit-input-container').cloneNode(true);
  inputContainer.classList.remove('hide');
  inputContainer.id = 'input-container-instance';
  contentDiv.append(inputContainer);

  const input = inputContainer.querySelector('input');
  input.value = removeSpanForEdit(span.innerHTML);

  const lineNum = contentDiv.parentElement.querySelector('.line-number-span').innerHTML;
  const actionButtons = inputContainer.querySelectorAll('span');
  actionButtons[0].onclick = function() { commitEdit(lineNum, input.value); };
  actionButtons[1].onclick = function() { cancelEdit(inputContainer, span); };
}

function commitEdit(lineNum, lineContent) {
  const payload = {
    lineNum, lineContent
  };

  ajax(
    'update',
    'patch',
    payload,
    () => {
      doPostEditWork(true, lineNum, lineContent);
    },
    () => {
      doPostEditWork(false, lineNum, lineContent);
    }
  );
}

function cancelEdit(inputContainer, span) {
  inputContainer.remove();
  span.classList.remove('hide');
}

function doPostEditWork(success, lineNum, lineContent) {
  const lineNumSpans = Array.from(document.querySelectorAll('.line-number-span'));
  const lineNumSpan = lineNumSpans.find(s => s.innerHTML === lineNum);
  const resultsLineContainer = lineNumSpan.parentElement.parentElement;
  const contentSpan = resultsLineContainer.querySelector('.line-content-span');

  if (success) {
    contentSpan.innerHTML = highlightSearchString(lineContent);
  }

  const inputContainer = resultsLineContainer.querySelector('.line-edit-input-container');
  inputContainer.remove();
  contentSpan.classList.remove('hide');

  success ? displaySuccessMessage('Line updated successfully') : displayErrorMessage('Could not update line');
}

function removeSpanForEdit(content) {
  let modifiedContent = content.replace('<span class="search-string-instance">', '');
  modifiedContent = modifiedContent.replace('</span>', '');
  return modifiedContent;
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

function displaySuccessMessage(message) {
  const messageContainer = document.querySelector('#message-container');
  const successMessage = document.querySelector('#success-message');

  successMessage.innerHTML = message;
  successMessage.classList.remove('hide');
  messageContainer.classList.add('on-screen');

  setTimeout(function() {
    messageContainer.classList.remove('on-screen');
    setTimeout(function() {
      successMessage.classList.add('hide');
    }, 1000);
  }, 5000);
}

function displayErrorMessage(message) {
  const messageContainer = document.querySelector('#message-container');
  const errorMessage = document.querySelector('#error-message');

  errorMessage.innerHTML = message;
  errorMessage.classList.remove('hide');
  messageContainer.classList.add('on-screen');

  setTimeout(function() {
    messageContainer.classList.remove('on-screen');
    setTimeout(function() {
      errorMessage.classList.add('hide');
    }, 1000);
  }, 5000);
}

function copyLineClicked(lineNum) {
  alert(`Line ${lineNum} copied.`);
}

function deleteLineClicked(lineNum) {
  lineToDelete = lineNum;
  openModal('delete', { lineNum });
}

function deleteLine() {
  ajax(
    'delete',
    'delete',
    { lineToDelete },
    () => {
      displaySuccessMessage('Line deleted Successfully.');
      closeModal('delete');
      deleteLineOnFrontEnd();
    },
    () => {
      displayErrorMessage('An error occurred when attempting to delete the line.');
      closeModal('delete');
    }
  );
}

function deleteLineOnFrontEnd() {
  let found = false;
  const lineSpanElements = document.querySelectorAll('.line-number-span');
  for (let i = 0; i < lineSpanElements.length; i++) {
    if (found) {
      let lineNum = parseInt(lineSpanElements[i].innerHTML, 10);
      lineNum--;
      lineSpanElements[i].innerHTML = lineNum;
    } else if (lineSpanElements[i].innerHTML == lineToDelete) {
      const lineElement = lineSpanElements[i].parentElement.parentElement;
      const lineGroupElement = lineElement.parentElement;
      lineElement.remove();
      const tokens = lineGroupElement.id.split('-');
      const groupNum = tokens[tokens.length - 1];
      setLineIdsAndLineCount(groupNum);
      found = true;
    }
  }
}

function ajax(endpoint, method, payload, callback, errorCallback) {
  showLoadingSpinner();

  const xhttp = new XMLHttpRequest();
  const params = payload ? new URLSearchParams(payload) : null;
  const url = `${getBackend()}/${endpoint}${(params ? `?${params}` : '')}`;

  xhttp.onreadystatechange = function() {
    if (this.readyState === 4) {
      if (this.status === 200) {
        if (callback instanceof Function) {
          callback(this.response);
          hideLoadingSpinner();
        }
      } else {
        console.log('error: ', JSON.stringify(this));
        if (errorCallback) {
          errorCallback(this.response);
          hideLoadingSpinner();
        }
      }
    }  
  };
  xhttp.open(method.toUpperCase(), url, true);
  xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  if (params && method === 'POST') {
    xhttp.send(params);
  } else {
    xhttp.send();
  }
}

function showLoadingSpinner() {
  const spinnerContainer = document.querySelector('.loading-spinner');
  spinnerContainer.style.display = 'flex';
}

function hideLoadingSpinner() {
  const spinnerContainer = document.querySelector('.loading-spinner');
  spinnerContainer.style.display = 'none';
}

function getHostName() {
  const hostname = window.location.hostname;
  return (hostname === '127.0.0.1' || hostname === 'localhost')
    ? `http://localhost:${window.location.port}`
    : 'http://pwv.planetshah.com';
}

function getBackend() {
  const hostname = window.location.hostname;
  return (hostname === '127.0.0.1' || hostname === 'localhost')
    ? `http://localhost:3000`
    : 'http://ec2-18-223-71-133.us-east-2.compute.amazonaws.com:3000';
}