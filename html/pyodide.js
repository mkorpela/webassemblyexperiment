
const output = document.getElementById("output");
const robot_file = document.getElementById("robot_file");
const resource_file = document.getElementById("resource_file");
const library = document.getElementById("library");
const logFrame = document.getElementById('iframe');
const ansi_up = new AnsiUp;
var inPageLibrary = new String;
var pythonProgram = new String;
const pyodideWorker = new Worker("./py_worker.js");

function loadFileToPythonProgram() {
    fetch('PythonProgram.py')
        .then(response => response.text())
        .then(result => { pythonProgram = result; });
}

function loadFileToInPageLibrary() {
    fetch('Example/InPageLibrary.py')
        .then(response => response.text())
        .then(result => { inPageLibrary = result; });
}

function loadFileToVar(fileName, variable) {
    fetch(fileName)
        .then(response => response.text())
        .then(result => { variable = result; });
}

function loadFileToValue(fileName, element) {
    fetch(fileName)
        .then(response => response.text())
        .then(result => { element.value = result; });
}

loadFileToPythonProgram();
loadFileToInPageLibrary();
loadFileToValue('Example/test.robot', robot_file);
loadFileToValue('Example/CustomLibrary.py', library);
loadFileToValue('Example/keywords.resource', resource_file);
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
    //const pyodideWorker = new Worker("./py_worker.js");
    //console.log(context);
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
    const { keyword, locator, text } = data;
    switch (keyword) {
        case "type_text":
            window.document.querySelector(locator).value = text;
            break;
        case "click":
            window.document.querySelector(locator).click();
            break;
        case "get_text":
            console.log(window.document.querySelector(locator).value);
            //TO DO: return value
            break;
        default:
            console.log("Unknown keyword: " + keyword);
    }
}

async function runRobot() {
    clearOutput();
    writeToOutput({ std_output: "Starting..\n" });
    clearLogHtml();
    await asyncRun(pythonProgram, {
        robot_file: robot_file.value,
        resource_file: resource_file.value,
        library_py: library.value,
        inPageLibrary: inPageLibrary,
    }, (data) => {
        //console.log(data)
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