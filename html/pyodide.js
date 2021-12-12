const output = document.getElementById("output");
const robot_file = document.getElementById("robot_file");
const resource_file = document.getElementById("resource_file");
const library = document.getElementById("library");
const logFrame = document.getElementById('iframe');
let pyodide = null;
var ansi_up = new AnsiUp;


function loadFile(fileName, element) {
    fetch(fileName)
        .then(response => response.text())
        .then(result => { element.value = result; })
}
async function fetchLogHtml() {
    const response = await fetch('log.html');
    const frameText = await response.text();
    logFrame.src = "data:text/html;charset=utf-8," + escape(frameText);
}

loadFile('test.robot', robot_file);
loadFile('library.py', library);
loadFile('keywords.resource', resource_file);

fetchLogHtml()

function updateLogHtml() {
    iframeContent = escape(pyodide.globals.get("html").replace(/<a href="#"><\/a>/is, ""))
    logFrame.src = "data:text/html;charset=utf-8," + iframeContent;
}

function writeToOutput(con_out) {
    var html = ansi_up.ansi_to_html(con_out);
    output.innerHTML = html;
    //console.log(con_out)
}

async function init() {
    if (pyodide) {
        return;
    }
    output.innerHTML = "Initializing...\n";
    pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.18.1/full/",
    });
    output.innerHTML += "Initializing PiP...\n";
    await pyodide.loadPackage("micropip");
    output.innerHTML += "Installing Robot Framework...\n";
    await pyodide.runPythonAsync(`
    import micropip
    await micropip.install('robotframework')
    `);
    output.innerHTML += "Installing RobotStackTrace...\n";
    await pyodide.runPythonAsync(`
    await micropip.install('robotframework-stacktrace')
    `);
    output.innerHTML += "Importing Libraries...\n";
    await pyodide.runPythonAsync(`
    import js
    from io import StringIO
    from robot import run
    robot_file = ""
    resource_file = ""
    library = ""
    `);
    output.innerHTML += "Ready!\n";
}


const pyodideWorker = new Worker("./py_worker.js");

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
function asyncRun(script, context) {
  return new Promise(function (onSuccess, onError) {
    run(script, context, onSuccess, onError);
  });
}

const pythonProgram = `
import sys
js.writeToOutput("")
import time

def write_file(file_content, file_name):
    with open(file_name,"w") as f:
        f.writelines(file_content)

write_file(robot_file, "test.robot")
write_file(resource_file, "keywords.resource")
write_file(library, "library.py")

sys.__stdout__ = StringIO()
sys.stdout = sys.__stdout__

class Listener:

    ROBOT_LISTENER_API_VERSION = 2

    def end_keyword(self, name, args):
        js.writeToOutput(sys.stdout.getvalue());


run('test.robot', consolecolors="ansi" , listener=["RobotStackTracer", Listener()], loglevel="TRACE:INFO")
std_output = sys.__stdout__.getvalue()

with open("log.html","r") as f:
    html = str(f.read())
`

async function runRobot() {
    await init();

    const result = await asyncRun(pythonProgram, {
        robot_file: robot_file.value,
        resource_file: resource_file.value,
        library: library.value,
    })
    console.log(result);

    writeToOutput(result);
    updateLogHtml();
}