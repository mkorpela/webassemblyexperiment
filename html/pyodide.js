const output = document.getElementById("output");
const robot_file = document.getElementById("robot_file");
const resource_file = document.getElementById("resource_file");
const library = document.getElementById("library");
const logFrame = document.getElementById('iframe');
const ansi_up = new AnsiUp;


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

function updateLogHtml(html) {
    iframeContent = escape(html.replace(/<a href="#"><\/a>/is, ""))
    logFrame.src = "data:text/html;charset=utf-8," + iframeContent;
}

function writeToOutput(con_out) {
    std_output = con_out["std_output"]
    if (!std_output) return;
    const html = ansi_up.ansi_to_html(std_output);
    output.innerHTML += "<br>"+html;
    //console.log(con_out)
}

function clearOutput() {
    output.innerHTML = "";
}

const pyodideWorker = new Worker("./py_worker.js");

function run(script, context, onSuccess, onError) {
    console.log(context);
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
                console.log(data);
                resolve(data);
            } else {
                console.log("MESSAGE");
                console.log(data);
                onMessage(data);
            }
        }, onMessage);
      });
}

const pythonProgram = `
import sys
import js
import json
from io import StringIO
from robot import run
js.postMessage(json.dumps({"std_output": "-- Running Robot Framework --"}))
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

    def start_keyword(self, name, args):
        js.postMessage(json.dumps({"std_output": sys.stdout.getvalue() }))
        sys.__stdout__.truncate(0)

    def end_keyword(self, name, args):
        js.postMessage(json.dumps({"std_output": sys.stdout.getvalue() }))
        sys.__stdout__.truncate(0)


run('test.robot', consolecolors="ansi" , listener=["RobotStackTracer", Listener()], loglevel="TRACE:INFO")
std_output = sys.__stdout__.getvalue()

with open("log.html","r") as f:
    html = str(f.read())

js.postMessage(json.dumps({"html": html, "std_output": std_output, "finished": True}))
`

async function runRobot() {
    clearOutput();

    await asyncRun(`
    import sys
    import js
    import json
    import micropip
    await micropip.install('robotframework')
    js.postMessage(json.dumps({"finished": True, "std_output": "Installed Robot Framework"}))
    `, {}, (data) => {
        console.log(data)
        writeToOutput(JSON.parse(data));
    });
    await asyncRun(`
    import sys
    import js
    import json
    await micropip.install('robotframework-stacktrace')
    js.postMessage(json.dumps({"finished": True, "std_output": "Installed Robot Framework Stack Trace"}))
    `, {}, (data) => {
        console.log(data)
        writeToOutput(JSON.parse(data));
    });

    await asyncRun(pythonProgram, {
        robot_file: robot_file.value,
        resource_file: resource_file.value,
        library: library.value,
    }, (data) => {
        console.log(data)
        data = JSON.parse(data)
        writeToOutput(data);
        if (data.hasOwnProperty("html")) {
            updateLogHtml(data["html"]);
        }
    });
}