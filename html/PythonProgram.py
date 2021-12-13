
import micropip
import sys
import js
import json
import os

from importlib import reload
from io import StringIO

try:


    SCRIPT_DIR = os.path.dirname(os.path.abspath(""))
    sys.path.append(os.path.dirname(SCRIPT_DIR))

    try:
        from robot import run, __version__
    except ImportError:
        js.postMessage(json.dumps({"std_output": "Install Robot Framework Stack Trace\n"}))
        js.postMessage(json.dumps({"std_output": f"Install Robot Framework"}))
        await micropip.install('robotframework-stacktrace')
        from robot import run, __version__
        js.postMessage(json.dumps({"std_output": f" = version {__version__}\n"}))

    js.postMessage(json.dumps({"std_output": "\n-- Running Robot Framework --\n"}))

    def write_file(file_content, file_name):
        with open(file_name, "w") as f:
            f.writelines(file_content)

    write_file(robot_file, "test.robot")
    write_file(resource_file, "keywords.resource")
    write_file(library_py, "library.py")
    write_file(inPageLibrary, "InPageLibrary.py")

    import library
    library = reload(library)

    class Listener:

        ROBOT_LISTENER_API_VERSION = 2

        def start_keyword(self, name, args):
            js.postMessage(json.dumps({"std_output": sys.stdout.getvalue() }))
            sys.__stdout__.truncate(0)

        def end_keyword(self, name, args):
            js.postMessage(json.dumps({"std_output": sys.stdout.getvalue() }))
            sys.__stdout__.truncate(0)

    try:
        org_stdout = sys.__stdout__
        sys.__stdout__ = StringIO()
        sys.stdout = sys.__stdout__
        run('test.robot', consolecolors="ansi" , listener=["RobotStackTracer", Listener()], loglevel="TRACE:INFO")
        std_output = sys.__stdout__.getvalue()
    finally:
        sys.__stdout__ = org_stdout
        sys.stdout = sys.__stdout__

    with open("log.html","r") as f:
        html = str(f.read())

    js.postMessage(json.dumps({"html": html, "std_output": std_output, "finished": True}))
except Exception as e:
    print(e)
