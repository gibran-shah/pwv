function createLineDiv(line) {
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
        { buttonIcon: 'move-down-btn.png', title: 'move this line down', onClick: 'moveLineDownClicked' },
        { buttonIcon: 'move-up-btn.png', title: 'move this line up', onClick: 'moveLineUpClicked' },
        { buttonIcon: 'add-blank-line-below-btn.png', title: 'add a blank line below this one', onClick: 'addBlankLineBelowClicked' },
        { buttonIcon: 'add-blank-line-above-btn.png', title: 'add a blank line above this one', onClick: 'addBlankLineAboveClicked' },
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

function setLineIdsAndLineCount(groupNum) {
    const lineElements = document.querySelectorAll(`#results-group-container-${groupNum} .results-line-container`);
    for (let i = 0; i < lineElements.length; i++) {
      const line = lineElements[i];
      line.id = `result-line-container-${groupNum}-${i}`;
    }
    const groupDiv = document.querySelector(`#results-group-container-${groupNum}`);
    groupDiv.setAttribute('line-count', lineElements.length);
}

function incrementLineNumbersAt(lineNum) {
    const lineContainers = document.querySelectorAll('.results-line-container');
    let startIncrementing = false;

    for (let i = 0; i < lineContainers.length; i++) {
        const container = lineContainers[i];
        if (!startIncrementing) {
            const containerLineNum = getLineNumber(container);
            startIncrementing = containerLineNum >= lineNum;
        }
        if (startIncrementing) {
            incrementLineNumber(container);
        }
    }
}

function getLineNumber(container) {
    const lineNumberSpan = container.querySelector('.line-number-span');
    return parseInt(lineNumberSpan.innerHTML, 10);
}

function incrementLineNumber(container) {
    const lineNumberSpan = container.querySelector('.line-number-span');
    const number = parseInt(lineNumberSpan.innerHTML, 10);
    lineNumberSpan.innerHTML = number + 1;
}

function getGroupNumber(groupContainer) {
    const idParts = groupContainer.id.split('-');
    const groupNumber = idParts[3];
    return parseInt(groupNumber, 10);
}

function getLineContainer(lineNum) {
    const lineContainers = document.querySelectorAll('.results-line-container');
    for (let i = 0; i < lineContainers.length; i++) {
        const container = lineContainers[i];
        const lineNumSpan = container.querySelector('.line-number-span');
        const domLineNum = parseInt(lineNumSpan.innerHTML, 10);
        if (domLineNum === lineNum) return container;
    }
    return null;
}

function updateActionButtonLineNumbers(lineContainer, lineNum) {
    const actionButtonContainers = lineContainer.querySelectorAll('.action-btn-container');
    for (let i = 0; i < actionButtonContainers.length; i++) {
        const container = actionButtonContainers[i];
        const img = container.querySelector('img');
        let onClickAttr = img.getAttribute('onclick');
        const index = onClickAttr.indexOf('(');
        onClickAttr = `${onClickAttr.substring(0, index)}(${lineNum})`;
        img.setAttribute('onclick', onClickAttr);
    }
}

function getGroupNumber(groupContainer) {
    const groupId = groupContainer.id;
    groupIdParts = groupId.split('-');
    return groupIdParts[groupIdParts.length - 1];
}

