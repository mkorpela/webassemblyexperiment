const fileList = [
    'InPageLibrary.py'
]
var folderName = 'Example'

const output = document.getElementById("output");
const editorElements = document.getElementsByTagName("monaco-editor");
const logFrame = document.getElementById('iframe');
const ansi_up = new AnsiUp;
var pythonProgram = new String;
const pyodideWorker = new Worker("./py_worker.js");
var fileCatalog = new Object();

function updateFolder(el){
    updateEditors(el.value);
}


function updateEditors(folder){
    folderName = folder
    for (let editorElement of editorElements) {
        loadFileToValue(folder, editorElement);
    }
    initializeFileCatalog(folder);
}

function initializeFileCatalog(folder) {
    for (let fileName of fileList) {
        addFileToFileCatalog(folder, fileName);
    }
}

function updateFileCatalog() {
    for (let editorElement of editorElements) {
        fileCatalog[editorElement.getAttribute('file')] = editorElement.getEditorValue()
    }
}

function addFileToFileCatalog(folder, fileName) {
    fetch(folder + "/" + fileName)
        .then(response => response.text())
        .then(result => { fileCatalog[fileName] = result; });
}

function loadFileToPythonProgram() {
    fetch('PythonProgram.py')
        .then(response => response.text())
        .then(result => { pythonProgram = result; });
}

function loadFileToValue(folder, element) {
    const fileName = folder + "/" + element.getAttribute("file");
    console.log(`Loading ${fileName} to element ${element.id}`);
    fetch(fileName)
        .then(response => response.text())
        .then(result => { element.setAttribute("value", result); });
}


loadFileToPythonProgram();
updateEditors(folderName);
clearLogHtml()

function updateLogHtml(html) {
    iframeContent = escape(html
        .replace(/<a href="#"><\/a>/is, "")
        .replace(/\{\{if source\}\}.*?<\/tr>.*?\{\{\/if\}\}/is, ""))
    logFrame.src = "data:text/html;charset=utf-8," + iframeContent;
}

function clearLogHtml() {
    logFrame.src = "data:text/html;charset=utf-8," + escape("<html><body></body></html>");
}

function writeToOutput(con_out) {
    std_output = con_out["std_output"]
    if (!std_output) return;
    const html = ansi_up.ansi_to_html(std_output);
    output.innerHTML += html;
    //console.log(con_out)
}

function clearOutput() {
    output.innerHTML = "";
}

function run(script, context, onSuccess, onError) {
    pyodideWorker.onerror = onError;
    pyodideWorker.onmessage = (e) => onSuccess(e.data);
    pyodideWorker.postMessage({
        ...context,
        python: script,
    });
}

// Transform the run (callback) form to a more modern async form.
// This is what allows to write:
//    const {results, error} = await asyncRun(script, context);
// Instead of:
//    run(script, context, successCallback, errorCallback);
function asyncRun(script, context, onMessage) {
    let finished = false;
    return new Promise((resolve) => {
        run(script, context, (data) => {
            if (data.hasOwnProperty("results")) {
                console.log("FINISHED");
                //console.log(data);
                resolve(data);
            } else {
                //console.log("MESSAGE");
                //console.log(data);
                onMessage(data);
            }
        }, onMessage);
    });
}


const handleKeywordCall = (data) => {
    console.log(data);
    frame = window.document.getElementById("demoApp")
    demoApp = frame.contentDocument

    const selector = {
        xpath: function getElementByXpath(path) {
            return demoApp.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        },
        css: function getElementByCss(selector) {
            return demoApp.querySelector(selector);
        },
        id: function getElementById(id) {
            return demoApp.getElementById(id);
        }
    }
    function getElement(locator) {
        const [  empty, strategy, selectString ] = locator.split(/(.*?)=(.*)/, 3);
        console.log(`strategy: ${strategy}`)
        console.log(`selectString: ${selectString}`)
        return selector[strategy](selectString);
    }


    switch (data.keyword) {
        case "open_browser":
            frame.src = data.url;
            break;
        case "type_text":
            getElement(data.locator).value = data.text;
            //demoApp.querySelector(data.locator).value = data.text;
            break;
        case "click":
            getElement(data.locator).click();
            break;
        case "get_text":
            console.log(getElement(data.locator).value);
            //TO DO: return value
            break;
        default:
            console.log("Unknown keyword: " + data.keyword);
    }
}

async function runRobot() {
    clearOutput();
    writeToOutput({ std_output: "Starting..\n" });
    clearLogHtml();
    updateFileCatalog();
    await asyncRun(pythonProgram, {file_catalog: JSON.stringify(fileCatalog)}, (data) => {
        //console.log(data)   logging all data coming back
        data = JSON.parse(data)
        if (data.hasOwnProperty("keyword")) {
            handleKeywordCall(data);
            return;
        }
        writeToOutput(data);
        if (data.hasOwnProperty("html")) {
            updateLogHtml(data["html"]);
        }
    });
    writeToOutput({ std_output: "\nReady!" });
}