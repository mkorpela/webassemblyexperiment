"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

require(['vs/editor/editor.main'], () => {

    const Settings = '*** Settings ***';
    const TestCases = '*** Test Cases ***';
    const Variables = '*** Variables ***';
    const Keywords = '*** Keywords ***';
    const Comments = '*** Comment ***';
    const Tables = [
        Settings,
        TestCases,
        Keywords,
        Comments,
        Variables,
    ];


    monaco.editor.defineTheme('rf-dark', {
        base: 'hc-black',
        inherit: true,
        rules: [
            { background: '292f33' },
            { token: 'delimiter', foreground: '3b94d9', fontStyle: 'italic' },
            { token: 'variable', foreground: '77c7f7', fontStyle: 'italic' },
            { token: 'type.robotframework', foreground: 'd0d0d0', fontStyle: 'italic' },


        ],
        colors: {
            'editor.background': '#292f33',
        }
    });
    monaco.editor.setTheme('rf-dark');
    monaco.languages.register({ id: 'robot' });


    function createKeywordProposals(range) {
        // returning a static list of proposals, not even looking at the prefix (filtering is done by the Monaco editor),
        // here you could do a server side lookup
        function getKeywordProp(keyword) {
            var args = "";
            var argDoc = "";
            for (let [i, argument] of keyword.args.entries()){
                if (argument.required){
                    args += `    \${${i+1}:${argument.name}}`
                }
                argDoc += `${argument.name}  ${argument.defaultValue ? "= " + argument.defaultValue : ""}\n`
            }
            console.log(`${keyword.name}${args}`)
            return {
                label: keyword.name,
                //kind: monaco.languages.CompletionItemKind.Function,
                kind: monaco.languages.CompletionItemKind.Function,
                documentation: argDoc + "\n" + keyword.doc,
                insertText: `${keyword.name}${args}`,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range: range
            }
        }

        var proposals = [];
        for (let keyword of BuiltInLibrary.keywords) {
            proposals.push(getKeywordProp(keyword));
        }

        return proposals;
    }

    function createTablesProposals(tablesInValue, range) {
        function getTableProp(name) {
            return {
                label: name,
                kind: monaco.languages.CompletionItemKind.Function,
                documentation: '',
                insertText: name,
                range: {
                    startLineNumber: range.startLineNumber,
                    endLineNumber: range.endLineNumber,
                    startColumn: 1,
                    endColumn: 1
                }
            }
        }

        const propTables = Tables.filter(n => !tablesInValue.includes(n));;
        var proposals = [];
        for (let table of propTables) {
            proposals.push(getTableProp(table));
        }
        return proposals;
    }

    function getCurrentTable(textLinesUntilPosition) {
        var currentTable = null;
        for (let line of textLinesUntilPosition) {
            if (line) {
                switch (line) {
                    case line.match(/^(?:\* ?)+(?:Settings? ?)(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i)?.input:
                        currentTable = Settings;
                        break;
                    case line.match(/^(?:\* ?)+(?:Test Cases?|Tasks?) ?(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i)?.input:
                        currentTable = TestCases;
                        break;
                    case line.match(/^(?:\* ?)+(?:Keywords? ?)(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i)?.input:
                        currentTable = Keywords;
                        break;
                    case line.match(/^(?:\* ?)+(?:Comments? ?)(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i)?.input:
                        currentTable = Comments;
                        break;
                    case line.match(/^(?:\* ?)+(?:Variables? ?)(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i)?.input:
                        currentTable = Variables;
                        break;
                }
            }
        }
        console.log(`Current Table is (${currentTable})`)
        return currentTable
    }

    function getExistingTables(textLines) {
        var existingTables = [];
        for (let line of textLines) {
            switch (line) {
                case line.match(/^(?:\* ?)+(?:Settings? ?)(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i)?.input:
                    existingTables.push(Settings);
                    break;
                case line.match(/^(?:\* ?)+(?:Test Cases?|Tasks?) ?(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i)?.input:
                    existingTables.push(TestCases);
                    break;
                case line.match(/^(?:\* ?)+(?:Keywords? ?)(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i)?.input:
                    existingTables.push(Keywords);
                    break;
                case line.match(/^(?:\* ?)+(?:Comments? ?)(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i)?.input:
                    existingTables.push(Comments);
                    break;
                case line.match(/^(?:\* ?)+(?:Variables? ?)(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i)?.input:
                    existingTables.push(Variables);
                    break;
            }
        }
        console.log(`Existing Tables are [${existingTables}]`)
        return existingTables
    }

    monaco.languages.registerCompletionItemProvider('robot', {
        provideCompletionItems: function (model, position) {

            var textUntilPosition = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            });
            var textLinesUntilPosition = String(textUntilPosition).split('\n');
            var existingTables = getExistingTables(model.getValue().split('\n'));
            var currentTable = getCurrentTable(textLinesUntilPosition);

            var keyword = textLinesUntilPosition.at(-1).match(
                /^(?: {2,}| ?\t ?)+([$&%@]\{.*?\} ?=?(?: {2,}| ?\t ?))?.*?(?= {2,}| ?\t ?|$)/
            );

            var linestart = textLinesUntilPosition.at(-1).match(
                /^(?! {2,}| ?\t ?).*/
            );

            if (!keyword && !linestart) {
                return { suggestions: [] };
            }

            if (linestart) {
                var word = model.getWordUntilPosition(position);
                var range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };
                return {
                    suggestions: createTablesProposals(existingTables, range)
                };
            }

            if (keyword && (currentTable === TestCases || currentTable === Keywords)) {
                var word = model.getWordUntilPosition(position);
                var range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };
                return {
                    suggestions: createKeywordProposals(range)
                };
            }
        }
    });



    monaco.languages.setMonarchTokensProvider('robot', {
        defaultToken: 'string',
        tokenPostfix: '.robotframework',
        ignoreCase: false,
        keywords: [
            'IF',
            'END',
            'FOR',
            'IN',
            'IN RANGE',
            'IN ENUMERATE',
            'IN ZIP',
            'ELSE',
            'TRY',
            'EXCEPT',
            'FINALLY',
            'RETURN',
        ],
        brackets: [
            { open: '{', close: '}', token: 'delimiter.curly' },
            { open: '[', close: ']', token: 'delimiter.bracket' },
            { open: '(', close: ')', token: 'delimiter.parenthesis' }
        ],
        tokenizer: {
            root: [
                { include: '@comment' },
                { include: '@vars' },
                { include: '@tables' },
                { include: '@setting' },
                { include: '@tc_kw_definition' },
                { include: '@keyword' },
                { include: '@numbers' },
                [/[,:;]/, 'delimiter'],
                [/[{}\[\]()]/, '@brackets'],
            ],
            comment: [
                [/(?: {2,}| ?\t ?)#.*/, 'comment'],
                [/^#.*/, 'comment']
            ],
            tables: [
                [
                    /^(\*+ ?(?:[sS]ettings?|[kK]eywords?|[vV]ariables?|[cC]omments?|[dD]ocumentation|[tT]asks?|[tT]est [cC]ases?)[ *]*)(?= {2,}| ?\t| ?$)/,
                    'keyword', '@popall'
                ]
            ],
            setting: [
                [/^(?: {2,}| ?\t ?)+\[.*?\]/, 'tag', '@popall']
            ],
            tc_kw_definition: [
                [/^(?! {2,}| ?\t ?).*?(?= {2,}| ?\t ?|$)/, 'type', '@popall']
            ],
            constant: [
                [
                    /^(?!(?: {2,}| ?\t ?)+(?:(?=[$\\[@&%]|\\.)))(?: {2,}| ?\t ?)+(.*?)(?= {2,}| ?\t ?| ?$)/,
                    'constant'
                ]
            ],
            vars: [
                [/^(?: {2,}| ?\t ?)+[$&%@](?=\{)/, 'delimiter.curly.meta.vars1', '@varBodyAssignment'],
                [/^[$&%@](?=\{)/, 'delimiter.curly.meta.vars1', '@varBodyVariables'],
                [/[$&%@](?=\{)/, 'delimiter.curly.meta.vars1', '@varBody'],
            ],
            varBodyVariables: [
                [/\{/, 'delimiter.curly.meta.varBody2', '@varBody'],
                [/\}=?(?= {2,}| ?\t ?| ?$)/, 'delimiter.curly.meta.varBody4', '@popall'],
                [/\n|  /, 'delimiter.meta.varBody5', '@popall'],
            ],
            varBodyAssignment: [
                [/\{/, 'delimiter.curly.meta.varBody2', '@varBody'],
                [/\}=?/, 'delimiter.curly.meta.varBody4', '@keywordAssignment'],
                [/\n|  /, 'delimiter.meta.varBody5', '@popall'],
            ],
            keywordAssignment: [
                [/ ?=?(?: {2,}| ?\t ?)+[^@$%&]*?(?= {2,}| ?\t ?| ?$)/, 'identifier.keyword1', '@popall'],
            ],
            varBody: [
                [/[$&%@](?=\{)/, 'delimiter.curly.meta.varBody1', '@varBody'],
                [/\{/, 'delimiter.curly.meta.varBody2', '@varBody'],
                [/\}(?=\[)/, 'delimiter.curly.meta.varBody3', '@dictKey'],
                [/\}|\]/, 'delimiter.curly.meta.varBody4', '@pop'],
                [/\n|  /, 'delimiter.meta.varBody5', '@popall'],
                [/.*?(?=  |[$&%@]\{|\})/, 'variable.meta.varBody5', '@pop'],
            ],
            dictKey: [
                [/\[/, 'delimiter.curly.meta.dictKey1'],
                [/\]/, 'delimiter.curly.meta.dictKey2', '@popall'],
                [/[$&%@](?=\{)/, 'delimiter.curly.meta.dictKey3', '@varBody'],
                [/\n|  /, 'delimiter.meta.dictKey4', '@popall'],
                [/.*?(?=  |[$&%@]\{|\])/, 'variable.meta.dictKey4', '@pop']
            ],
            keyword: [
                [/(?: {2,}| ?\t ?)+(IF|END|FOR|IN|IN RANGE|IN ENUMERATE|IN ZIP|ELSE|TRY|EXCEPT|FINALLY|RETURN)(?= {2,}| ?\t ?|$)/, 'keyword', '@popall'],
                [/^(?: {2,}| ?\t ?)+[^@$%&]*?(?= {2,}| ?\t ?| ?$)/, 'identifier.keyword1', '@popall'],
                [/^(?:(?:(?: {2,}| ?\t ?)(?:[$&@]\{(?:.*?)\}(?: ?=)))*(?: {2,}| ?\t ?))(.+?)(?= {2,}| ?\t ?|$)/, 'identifier.keyword2', '@popall'],
            ],
            // Recognize hex, negatives, decimals, imaginaries, longs, and scientific notation
            numbers: [
                [/-?0x([abcdef]|[ABCDEF]|\d)+[lL]?/, 'number.hex'],
                [/-?(\d*\.)?\d+([eE][+\-]?\d+)?[jJ]?[lL]?/, 'number']
            ]
        }
    });
});


class MonacoEditor extends HTMLElement {
    constructor() {
        super();
        this.editor = null;
        this._form = null;
        // keep reference to <form> for cleanup
        this._form = null;
        this._handleFormData = this._handleFormData.bind(this);
    }
    // attributeChangedCallback will be called when the value of one of these attributes is changed in html
    static get observedAttributes() {
        return ['value', 'language'];
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (this.editor) {
            if (name === 'value') {
                this.editor.setValue(newValue);
            }
            if (name === 'language') {
                const currentModel = this.editor.getModel();
                if (currentModel) {
                    currentModel.dispose();
                }
                this.editor.setModel(monaco.editor.createModel(this.getEditorValue(), newValue));
            }
        }
    }
    setEditorValue(newValue) {
        this.editor.setValue(newValue);
    }



    connectedCallback() {
        this._form = this._findContainingForm();
        if (this._form) {
            this._form.addEventListener('formdata', this._handleFormData);
        }
        // editor
        const editor = document.createElement('div');
        editor.className = "editor-container";
        this.appendChild(editor);
        // window.editor is accessible.
        var init = () => {
            require(['vs/editor/editor.main'], () => {
                //console.log(monaco.languages.getLanguages().map(lang => lang.id));
                // Editor
                this.editor = monaco.editor.create(editor, {
                    theme: 'rf-dark', //(window.getComputedStyle(document.querySelector("body")).colorScheme === 'dark') ? "rf-dark" : "vs",
                    //model: monaco.editor.createModel(this.getAttribute("value"), this.getAttribute("language")),
                    value: this.getAttribute("value"),
                    language: this.getAttribute("language"),
                    wordWrap: 'on',
                    automaticLayout: true,
                    minimap: {
                        enabled: false
                    },
                    scrollbar: {
                        vertical: 'auto'
                    },
                });

                this.editor.getModel().updateOptions({ tabSize: 4 });

                var selectedText = this.editor.createContextKey(/*key name*/ 'selectedText', /*default value*/ false);
                this.editor.onDidChangeCursorPosition(() => {
                    selectedText.set(this.editor.getSelection().isEmpty());
                })
                this.editor.addCommand(
                    monaco.KeyCode.Tab, () => {
                        this.editor.trigger('keyboard', 'type', { text: "    " });
                    },
                    'selectedText'
                );
            });
            window.removeEventListener("load", init);
        };
        window.addEventListener("load", init);
    }
    disconnectedCallback() {
        if (this._form) {
            this._form.removeEventListener('formdata', this._handleFormData);
            this._form = null;
        }
    }
    getEditorValue() {
        if (this.editor) {
            return this.editor.getModel().getValue();
        }
        return null;
    }
    _handleFormData(ev) {
        ev.formData.append(this.getAttribute('name'), this.getEditorValue());
    }
    _findContainingForm() {
        // can only be in a form in the same "scope", ShadowRoot or Document
        const root = this.getRootNode();
        if (root instanceof Document || root instanceof Element) {
            const forms = Array.from(root.querySelectorAll('form'));
            // we can only be in one <form>, so the first one to contain us is the correct one
            return forms.find((form) => form.contains(this)) || null;
        }
        return null;
    }
}

const BuiltInLibrary = {
    name: "BuiltIn",
    doc: "An always available standard library with often needed keywords.\n\n``BuiltIn`` is Robot Framework's standard library that provides a set\nof generic keywords needed often. It is imported automatically and\nthus always available. The provided keywords can be used, for example,\nfor verifications (e.g. `Should Be Equal`, `Should Contain`),\nconversions (e.g. `Convert To Integer`) and for various other purposes\n(e.g. `Log`, `Sleep`, `Run Keyword If`, `Set Global Variable`).\n\n== Table of contents ==\n\n- `HTML error messages`\n- `Evaluating expressions`\n- `Boolean arguments`\n- `Pattern matching`\n- `Multiline string comparison`\n- `String representations`\n- `Keywords`\n\n= HTML error messages =\n\nMany of the keywords accept an optional error message to use if the keyword\nfails, and it is possible to use HTML in these messages by prefixing them\nwith ``*HTML*``. See `Fail` keyword for a usage example. Notice that using\nHTML in messages is not limited to BuiltIn library but works with any\nerror message.\n\n= Evaluating expressions =\n\nMany keywords, such as `Evaluate`, `Run Keyword If` and `Should Be True`,\naccept an expression that is evaluated in Python.\n\n== Evaluation namespace ==\n\nExpressions are evaluated using Python's\n[http://docs.python.org/library/functions.html#eval|eval] function so\nthat all Python built-ins like ``len()`` and ``int()`` are available.\nIn addition to that, all unrecognized variables are considered to be\nmodules that are automatically imported. It is possible to use all\navailable Python modules, including the standard modules and the installed\nthird party modules.\n\nExamples:\n| `Should Be True`   | len('${result}') > 3 |\n| `Run Keyword If`   | os.sep == '/'        | Non-Windows Keyword  |\n| ${robot version} = | `Evaluate`           | robot.__version__    |\n\n`Evaluate` also allows configuring the execution namespace with a custom\nnamespace and with custom modules to be imported. The latter functionality\nis useful in special cases where the automatic module import does not work\nsuch as when using nested modules like ``rootmod.submod`` or list\ncomprehensions. See the documentation of the `Evaluate` keyword for mode\ndetails.\n\n*NOTE:* Automatic module import is a new feature in Robot Framework 3.2.\nEarlier modules needed to be explicitly taken into use when using the\n`Evaluate` keyword and other keywords only had access to ``sys`` and\n``os`` modules.\n\n== Using variables ==\n\nWhen a variable is used in the expressing using the normal ``${variable}``\nsyntax, its value is replaced before the expression is evaluated. This\nmeans that the value used in the expression will be the string\nrepresentation of the variable value, not the variable value itself.\nThis is not a problem with numbers and other objects that have a string\nrepresentation that can be evaluated directly, but with other objects\nthe behavior depends on the string representation. Most importantly,\nstrings must always be quoted, and if they can contain newlines, they must\nbe triple quoted.\n\nExamples:\n| `Should Be True` | ${rc} < 10                | Return code greater than 10 |\n| `Run Keyword If` | '${status}' == 'PASS'     | Log | Passed                |\n| `Run Keyword If` | 'FAIL' in '''${output}''' | Log | Output contains FAIL  |\n\nActual variables values are also available in the evaluation namespace.\nThey can be accessed using special variable syntax without the curly\nbraces like ``$variable``. These variables should never be quoted.\n\nExamples:\n| `Should Be True` | $rc < 10          | Return code greater than 10  |\n| `Run Keyword If` | $status == 'PASS' | `Log` | Passed               |\n| `Run Keyword If` | 'FAIL' in $output | `Log` | Output contains FAIL |\n| `Should Be True` | len($result) > 1 and $result[1] == 'OK' |\n| `Should Be True` | $result is not None                     |\n\nUsing the ``$variable`` syntax slows down expression evaluation a little.\nThis should not typically matter, but should be taken into account if\ncomplex expressions are evaluated often and there are strict time\nconstrains.\n\nNotice that instead of creating complicated expressions, it is often better\nto move the logic into a test library. That eases maintenance and can also\nenhance execution speed.\n\n= Boolean arguments =\n\nSome keywords accept arguments that are handled as Boolean values true or\nfalse. If such an argument is given as a string, it is considered false if\nit is an empty string or equal to ``FALSE``, ``NONE``, ``NO``, ``OFF`` or\n``0``, case-insensitively. Keywords verifying something that allow dropping\nactual and expected values from the possible error message also consider\nstring ``no values`` to be false. Other strings are considered true unless\nthe keyword documentation explicitly states otherwise, and other argument\ntypes are tested using the same\n[http://docs.python.org/library/stdtypes.html#truth|rules as in Python].\n\nTrue examples:\n| `Should Be Equal` | ${x} | ${y}  | Custom error | values=True    | # Strings are generally true.    |\n| `Should Be Equal` | ${x} | ${y}  | Custom error | values=yes     | # Same as the above.             |\n| `Should Be Equal` | ${x} | ${y}  | Custom error | values=${TRUE} | # Python ``True`` is true.       |\n| `Should Be Equal` | ${x} | ${y}  | Custom error | values=${42}   | # Numbers other than 0 are true. |\n\nFalse examples:\n| `Should Be Equal` | ${x} | ${y}  | Custom error | values=False     | # String ``false`` is false.   |\n| `Should Be Equal` | ${x} | ${y}  | Custom error | values=no        | # Also string ``no`` is false. |\n| `Should Be Equal` | ${x} | ${y}  | Custom error | values=${EMPTY}  | # Empty string is false.       |\n| `Should Be Equal` | ${x} | ${y}  | Custom error | values=${FALSE}  | # Python ``False`` is false.   |\n| `Should Be Equal` | ${x} | ${y}  | Custom error | values=no values | # ``no values`` works with ``values`` argument |\n\n= Pattern matching =\n\nMany keywords accepts arguments as either glob or regular expression\npatterns.\n\n== Glob patterns ==\n\nSome keywords, for example `Should Match`, support so called\n[http://en.wikipedia.org/wiki/Glob_(programming)|glob patterns] where:\n\n| ``*``        | matches any string, even an empty string                |\n| ``?``        | matches any single character                            |\n| ``[chars]``  | matches one character in the bracket                    |\n| ``[!chars]`` | matches one character not in the bracket                |\n| ``[a-z]``    | matches one character from the range in the bracket     |\n| ``[!a-z]``   | matches one character not from the range in the bracket |\n\nUnlike with glob patterns normally, path separator characters ``/`` and\n``\\`` and the newline character ``\\n`` are matches by the above\nwildcards.\n\n== Regular expressions ==\n\nSome keywords, for example `Should Match Regexp`, support\n[http://en.wikipedia.org/wiki/Regular_expression|regular expressions]\nthat are more powerful but also more complicated that glob patterns.\nThe regular expression support is implemented using Python's\n[http://docs.python.org/library/re.html|re module] and its documentation\nshould be consulted for more information about the syntax.\n\nBecause the backslash character (``\\``) is an escape character in\nRobot Framework test data, possible backslash characters in regular\nexpressions need to be escaped with another backslash like ``\\\\d\\\\w+``.\nStrings that may contain special characters but should be handled\nas literal strings, can be escaped with the `Regexp Escape` keyword.\n\n= Multiline string comparison =\n\n`Should Be Equal` and `Should Be Equal As Strings` report the failures using\n[http://en.wikipedia.org/wiki/Diff_utility#Unified_format|unified diff\nformat] if both strings have more than two lines.\n\nExample:\n| ${first} =  | `Catenate` | SEPARATOR=\\n | Not in second | Same | Differs | Same |\n| ${second} = | `Catenate` | SEPARATOR=\\n | Same | Differs2 | Same | Not in first |\n| `Should Be Equal` | ${first} | ${second} |\n\nResults in the following error message:\n\n| Multiline strings are different:\n| --- first\n| +++ second\n| @@ -1,4 +1,4 @@\n| -Not in second\n|  Same\n| -Differs\n| +Differs2\n|  Same\n| +Not in first\n\n= String representations =\n\nSeveral keywords log values explicitly (e.g. `Log`) or implicitly (e.g.\n`Should Be Equal` when there are failures). By default keywords log values\nusing \"human readable\" string representation, which means that strings\nlike ``Hello`` and numbers like ``42`` are logged as-is. Most of the time\nthis is the desired behavior, but there are some problems as well:\n\n- It is not possible to see difference between different objects that\n  have same string representation like string ``42`` and integer ``42``.\n  `Should Be Equal` and some other keywords add the type information to\n  the error message in these cases, though.\n\n- Non-printable characters such as the null byte are not visible.\n\n- Trailing whitespace is not visible.\n\n- Different newlines (``\\r\\n`` on Windows, ``\\n`` elsewhere) cannot\n  be separated from each others.\n\n- There are several Unicode characters that are different but look the\n  same. One example is the Latin ``a`` (``\\u0061``) and the Cyrillic\n  ``\u0430`` (``\\u0430``). Error messages like ``a != \u0430`` are\n  not very helpful.\n\n- Some Unicode characters can be represented using\n  [https://en.wikipedia.org/wiki/Unicode_equivalence|different forms].\n  For example, ``\u00e4`` can be represented either as a single code point\n  ``\\u00e4`` or using two code points ``\\u0061`` and ``\\u0308`` combined\n  together. Such forms are considered canonically equivalent, but strings\n  containing them are not considered equal when compared in Python. Error\n  messages like ``\u00e4 != a\u0308`` are not that helpful either.\n\n- Containers such as lists and dictionaries are formatted into a single\n  line making it hard to see individual items they contain.\n\nTo overcome the above problems, some keywords such as `Log` and\n`Should Be Equal` have an optional ``formatter`` argument that can be\nused to configure the string representation. The supported values are\n``str`` (default), ``repr``, and ``ascii`` that work similarly as\n[https://docs.python.org/library/functions.html|Python built-in functions]\nwith same names. More detailed semantics are explained below.\n\n== str ==\n\nUse the \"human readable\" string representation. Equivalent to using\n``str()`` in Python 3 and ``unicode()`` in Python 2. This is the default.\n\n== repr ==\n\nUse the \"machine readable\" string representation. Similar to using\n``repr()`` in Python, which means that strings like ``Hello`` are logged\nlike ``'Hello'``, newlines and non-printable characters are escaped like\n``\\n`` and ``\\x00``, and so on. Non-ASCII characters are shown as-is\nlike ``\u00e4`` in Python 3 and in escaped format like ``\\xe4`` in Python 2.\nUse ``ascii`` to always get the escaped format.\n\nThere are also some enhancements compared to the standard ``repr()``:\n- Bigger lists, dictionaries and other containers are pretty-printed so\n  that there is one item per row.\n- On Python 2 the ``u`` prefix is omitted with Unicode strings and\n  the ``b`` prefix is added to byte strings.\n\n== ascii ==\n\nSame as using ``ascii()`` in Python 3 or ``repr()`` in Python 2 where\n``ascii()`` does not exist. Similar to using ``repr`` explained above\nbut with the following differences:\n\n- On Python 3 non-ASCII characters are escaped like ``\\xe4`` instead of\n  showing them as-is like ``\u00e4``. This makes it easier to see differences\n  between Unicode characters that look the same but are not equal. This\n  is how ``repr()`` works in Python 2.\n- On Python 2 just uses the standard ``repr()`` meaning that Unicode\n  strings get the ``u`` prefix and no ``b`` prefix is added to byte\n  strings.\n- Containers are not pretty-printed.",
    version: "4.1.2",
    generated: "2021-12-18 20:52:57",
    type: "LIBRARY",
    scope: "GLOBAL",
    docFormat: "ROBOT",
    source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
    lineno: 3563,
    tags: [],
    inits: [],
    keywords: [
      {
        name: "Call Method",
        args: [
          {
            name: "object",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "object"
          },
          {
            name: "method_name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "method_name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          },
          {
            name: "kwargs",
            types: [],
            defaultValue: null,
            kind: "VAR_NAMED",
            required: false,
            repr: "**kwargs"
          }
        ],
        doc: "Calls the named method of the given object with the provided arguments.\n\nThe possible return value from the method is returned and can be\nassigned to a variable. Keyword fails both if the object does not have\na method with the given name or if executing the method raises an\nexception.\n\nPossible equal signs in arguments must be escaped with a backslash\nlike ``\\=``.\n\nExamples:\n| Call Method      | ${hashtable} | put          | myname  | myvalue |\n| ${isempty} =     | Call Method  | ${hashtable} | isEmpty |         |\n| Should Not Be True | ${isempty} |              |         |         |\n| ${value} =       | Call Method  | ${hashtable} | get     | myname  |\n| Should Be Equal  | ${value}     | myvalue      |         |         |\n| Call Method      | ${object}    | kwargs    | name=value | foo=bar |\n| Call Method      | ${object}    | positional   | escaped\\=equals  |",
        shortdoc: "Calls the named method of the given object with the provided arguments.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3311
      },
      {
        name: "Catenate",
        args: [
          {
            name: "items",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*items"
          }
        ],
        doc: "Catenates the given items together and returns the resulted string.\n\nBy default, items are catenated with spaces, but if the first item\ncontains the string ``SEPARATOR=<sep>``, the separator ``<sep>`` is\nused instead. Items are converted into strings when necessary.\n\nExamples:\n| ${str1} = | Catenate | Hello         | world |       |\n| ${str2} = | Catenate | SEPARATOR=--- | Hello | world |\n| ${str3} = | Catenate | SEPARATOR=    | Hello | world |\n=>\n| ${str1} = 'Hello world'\n| ${str2} = 'Hello---world'\n| ${str3} = 'Helloworld'",
        shortdoc: "Catenates the given items together and returns the resulted string.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2836
      },
      {
        name: "Comment",
        args: [
          {
            name: "messages",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*messages"
          }
        ],
        doc: "Displays the given messages in the log file as keyword arguments.\n\nThis keyword does nothing with the arguments it receives, but as they\nare visible in the log, this keyword can be used to display simple\nmessages. Given arguments are ignored so thoroughly that they can even\ncontain non-existing variables. If you are interested about variable\nvalues, you can use the `Log` or `Log Many` keywords.",
        shortdoc: "Displays the given messages in the log file as keyword arguments.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2985
      },
      {
        name: "Continue For Loop",
        args: [],
        doc: "Skips the current for loop iteration and continues from the next.\n\nSkips the remaining keywords in the current for loop iteration and\ncontinues from the next one. Can be used directly in a for loop or\nin a keyword that the loop uses.\n\nExample:\n| FOR | ${var}         | IN                     | @{VALUES}         |\n|     | Run Keyword If | '${var}' == 'CONTINUE' | Continue For Loop |\n|     | Do Something   | ${var}                 |\n| END |\n\nSee `Continue For Loop If` to conditionally continue a for loop without\nusing `Run Keyword If` or other wrapper keywords.",
        shortdoc: "Skips the current for loop iteration and continues from the next.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2532
      },
      {
        name: "Continue For Loop If",
        args: [
          {
            name: "condition",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "condition"
          }
        ],
        doc: "Skips the current for loop iteration if the ``condition`` is true.\n\nA wrapper for `Continue For Loop` to continue a for loop based on\nthe given condition. The condition is evaluated using the same\nsemantics as with `Should Be True` keyword.\n\nExample:\n| FOR | ${var}               | IN                     | @{VALUES} |\n|     | Continue For Loop If | '${var}' == 'CONTINUE' |\n|     | Do Something         | ${var}                 |\n| END |",
        shortdoc: "Skips the current for loop iteration if the ``condition`` is true.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2551
      },
      {
        name: "Convert To Binary",
        args: [
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          },
          {
            name: "base",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "base=None"
          },
          {
            name: "prefix",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "prefix=None"
          },
          {
            name: "length",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "length=None"
          }
        ],
        doc: "Converts the given item to a binary string.\n\nThe ``item``, with an optional ``base``, is first converted to an\ninteger using `Convert To Integer` internally. After that it\nis converted to a binary number (base 2) represented as a\nstring such as ``1011``.\n\nThe returned value can contain an optional ``prefix`` and can be\nrequired to be of minimum ``length`` (excluding the prefix and a\npossible minus sign). If the value is initially shorter than\nthe required length, it is padded with zeros.\n\nExamples:\n| ${result} = | Convert To Binary | 10 |         |           | # Result is 1010   |\n| ${result} = | Convert To Binary | F  | base=16 | prefix=0b | # Result is 0b1111 |\n| ${result} = | Convert To Binary | -2 | prefix=B | length=4 | # Result is -B0010 |\n\nSee also `Convert To Integer`, `Convert To Octal` and `Convert To Hex`.",
        shortdoc: "Converts the given item to a binary string.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 169
      },
      {
        name: "Convert To Boolean",
        args: [
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          }
        ],
        doc: "Converts the given item to Boolean true or false.\n\nHandles strings ``True`` and ``False`` (case-insensitive) as expected,\notherwise returns item's\n[http://docs.python.org/library/stdtypes.html#truth|truth value]\nusing Python's ``bool()`` method.",
        shortdoc: "Converts the given item to Boolean true or false.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 322
      },
      {
        name: "Convert To Bytes",
        args: [
          {
            name: "input",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "input"
          },
          {
            name: "input_type",
            types: [],
            defaultValue: "text",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "input_type=text"
          }
        ],
        doc: "Converts the given ``input`` to bytes according to the ``input_type``.\n\nValid input types are listed below:\n\n- ``text:`` Converts text to bytes character by character. All\n  characters with ordinal below 256 can be used and are converted to\n  bytes with same values. Many characters are easiest to represent\n  using escapes like ``\\x00`` or ``\\xff``. Supports both Unicode\n  strings and bytes.\n\n- ``int:`` Converts integers separated by spaces to bytes. Similarly as\n  with `Convert To Integer`, it is possible to use binary, octal, or\n  hex values by prefixing the values with ``0b``, ``0o``, or ``0x``,\n  respectively.\n\n- ``hex:`` Converts hexadecimal values to bytes. Single byte is always\n  two characters long (e.g. ``01`` or ``FF``). Spaces are ignored and\n  can be used freely as a visual separator.\n\n- ``bin:`` Converts binary values to bytes. Single byte is always eight\n  characters long (e.g. ``00001010``). Spaces are ignored and can be\n  used freely as a visual separator.\n\nIn addition to giving the input as a string, it is possible to use\nlists or other iterables containing individual characters or numbers.\nIn that case numbers do not need to be padded to certain length and\nthey cannot contain extra spaces.\n\nExamples (last column shows returned bytes):\n| ${bytes} = | Convert To Bytes | hyv\u00e4    |     | # hyv\\xe4        |\n| ${bytes} = | Convert To Bytes | \\xff\\x07 |     | # \\xff\\x07      |\n| ${bytes} = | Convert To Bytes | 82 70      | int | # RF              |\n| ${bytes} = | Convert To Bytes | 0b10 0x10  | int | # \\x02\\x10      |\n| ${bytes} = | Convert To Bytes | ff 00 07   | hex | # \\xff\\x00\\x07 |\n| ${bytes} = | Convert To Bytes | 5246212121 | hex | # RF!!!           |\n| ${bytes} = | Convert To Bytes | 0000 1000  | bin | # \\x08           |\n| ${input} = | Create List      | 1          | 2   | 12                |\n| ${bytes} = | Convert To Bytes | ${input}   | int | # \\x01\\x02\\x0c |\n| ${bytes} = | Convert To Bytes | ${input}   | hex | # \\x01\\x02\\x12 |\n\nUse `Encode String To Bytes` in ``String`` library if you need to\nconvert text to bytes using a certain encoding.",
        shortdoc: "Converts the given ``input`` to bytes according to the ``input_type``.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 338
      },
      {
        name: "Convert To Hex",
        args: [
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          },
          {
            name: "base",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "base=None"
          },
          {
            name: "prefix",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "prefix=None"
          },
          {
            name: "length",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "length=None"
          },
          {
            name: "lowercase",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "lowercase=False"
          }
        ],
        doc: "Converts the given item to a hexadecimal string.\n\nThe ``item``, with an optional ``base``, is first converted to an\ninteger using `Convert To Integer` internally. After that it\nis converted to a hexadecimal number (base 16) represented as\na string such as ``FF0A``.\n\nThe returned value can contain an optional ``prefix`` and can be\nrequired to be of minimum ``length`` (excluding the prefix and a\npossible minus sign). If the value is initially shorter than\nthe required length, it is padded with zeros.\n\nBy default the value is returned as an upper case string, but the\n``lowercase`` argument a true value (see `Boolean arguments`) turns\nthe value (but not the given prefix) to lower case.\n\nExamples:\n| ${result} = | Convert To Hex | 255 |           |              | # Result is FF    |\n| ${result} = | Convert To Hex | -10 | prefix=0x | length=2     | # Result is -0x0A |\n| ${result} = | Convert To Hex | 255 | prefix=X | lowercase=yes | # Result is Xff   |\n\nSee also `Convert To Integer`, `Convert To Binary` and `Convert To Octal`.",
        shortdoc: "Converts the given item to a hexadecimal string.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 213
      },
      {
        name: "Convert To Integer",
        args: [
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          },
          {
            name: "base",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "base=None"
          }
        ],
        doc: "Converts the given item to an integer number.\n\nIf the given item is a string, it is by default expected to be an\ninteger in base 10. There are two ways to convert from other bases:\n\n- Give base explicitly to the keyword as ``base`` argument.\n\n- Prefix the given string with the base so that ``0b`` means binary\n  (base 2), ``0o`` means octal (base 8), and ``0x`` means hex (base 16).\n  The prefix is considered only when ``base`` argument is not given and\n  may itself be prefixed with a plus or minus sign.\n\nThe syntax is case-insensitive and possible spaces are ignored.\n\nExamples:\n| ${result} = | Convert To Integer | 100    |    | # Result is 100   |\n| ${result} = | Convert To Integer | FF AA  | 16 | # Result is 65450 |\n| ${result} = | Convert To Integer | 100    | 8  | # Result is 64    |\n| ${result} = | Convert To Integer | -100   | 2  | # Result is -4    |\n| ${result} = | Convert To Integer | 0b100  |    | # Result is 4     |\n| ${result} = | Convert To Integer | -0x100 |    | # Result is -256  |\n\nSee also `Convert To Number`, `Convert To Binary`, `Convert To Octal`,\n`Convert To Hex`, and `Convert To Bytes`.",
        shortdoc: "Converts the given item to an integer number.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 106
      },
      {
        name: "Convert To Number",
        args: [
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          },
          {
            name: "precision",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "precision=None"
          }
        ],
        doc: "Converts the given item to a floating point number.\n\nIf the optional ``precision`` is positive or zero, the returned number\nis rounded to that number of decimal digits. Negative precision means\nthat the number is rounded to the closest multiple of 10 to the power\nof the absolute precision. If a number is equally close to a certain\nprecision, it is always rounded away from zero.\n\nExamples:\n| ${result} = | Convert To Number | 42.512 |    | # Result is 42.512 |\n| ${result} = | Convert To Number | 42.512 | 1  | # Result is 42.5   |\n| ${result} = | Convert To Number | 42.512 | 0  | # Result is 43.0   |\n| ${result} = | Convert To Number | 42.512 | -1 | # Result is 40.0   |\n\nNotice that machines generally cannot store floating point numbers\naccurately. This may cause surprises with these numbers in general\nand also when they are rounded. For more information see, for example,\nthese resources:\n\n- http://docs.python.org/tutorial/floatingpoint.html\n- http://randomascii.wordpress.com/2012/02/25/comparing-floating-point-numbers-2012-edition\n\nIf you want to avoid possible problems with floating point numbers,\nyou can implement custom keywords using Python's\n[http://docs.python.org/library/decimal.html|decimal] or\n[http://docs.python.org/library/fractions.html|fractions] modules.\n\nIf you need an integer number, use `Convert To Integer` instead.",
        shortdoc: "Converts the given item to a floating point number.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 252
      },
      {
        name: "Convert To Octal",
        args: [
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          },
          {
            name: "base",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "base=None"
          },
          {
            name: "prefix",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "prefix=None"
          },
          {
            name: "length",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "length=None"
          }
        ],
        doc: "Converts the given item to an octal string.\n\nThe ``item``, with an optional ``base``, is first converted to an\ninteger using `Convert To Integer` internally. After that it\nis converted to an octal number (base 8) represented as a\nstring such as ``775``.\n\nThe returned value can contain an optional ``prefix`` and can be\nrequired to be of minimum ``length`` (excluding the prefix and a\npossible minus sign). If the value is initially shorter than\nthe required length, it is padded with zeros.\n\nExamples:\n| ${result} = | Convert To Octal | 10 |            |          | # Result is 12      |\n| ${result} = | Convert To Octal | -F | base=16    | prefix=0 | # Result is -017    |\n| ${result} = | Convert To Octal | 16 | prefix=oct | length=4 | # Result is oct0020 |\n\nSee also `Convert To Integer`, `Convert To Binary` and `Convert To Hex`.",
        shortdoc: "Converts the given item to an octal string.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 191
      },
      {
        name: "Convert To String",
        args: [
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          }
        ],
        doc: "Converts the given item to a Unicode string.\n\nStrings are also [http://www.macchiato.com/unicode/nfc-faq|\nNFC normalized].\n\nUse `Encode String To Bytes` and `Decode Bytes To String` keywords\nin ``String`` library if you need to convert between Unicode and byte\nstrings using different encodings. Use `Convert To Bytes` if you just\nwant to create byte strings.",
        shortdoc: "Converts the given item to a Unicode string.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 305
      },
      {
        name: "Create Dictionary",
        args: [
          {
            name: "items",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*items"
          }
        ],
        doc: "Creates and returns a dictionary based on the given ``items``.\n\nItems are typically given using the ``key=value`` syntax same way as\n``&{dictionary}`` variables are created in the Variable table. Both\nkeys and values can contain variables, and possible equal sign in key\ncan be escaped with a backslash like ``escaped\\=key=value``. It is\nalso possible to get items from existing dictionaries by simply using\nthem like ``&{dict}``.\n\nAlternatively items can be specified so that keys and values are given\nseparately. This and the ``key=value`` syntax can even be combined,\nbut separately given items must be first. If same key is used multiple\ntimes, the last value has precedence.\n\nThe returned dictionary is ordered, and values with strings as keys\ncan also be accessed using a convenient dot-access syntax like\n``${dict.key}``. Technically the returned dictionary is Robot\nFramework's own ``DotDict`` instance. If there is a need, it can be\nconverted into a regular Python ``dict`` instance by using the\n`Convert To Dictionary` keyword from the Collections library.\n\nExamples:\n| &{dict} = | Create Dictionary | key=value | foo=bar | | | # key=value syntax |\n| Should Be True | ${dict} == {'key': 'value', 'foo': 'bar'} |\n| &{dict2} = | Create Dictionary | key | value | foo | bar | # separate key and value |\n| Should Be Equal | ${dict} | ${dict2} |\n| &{dict} = | Create Dictionary | ${1}=${2} | &{dict} | foo=new | | # using variables |\n| Should Be True | ${dict} == {1: 2, 'key': 'value', 'foo': 'new'} |\n| Should Be Equal | ${dict.key} | value | | | | # dot-access |",
        shortdoc: "Creates and returns a dictionary based on the given ``items``.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 446
      },
      {
        name: "Create List",
        args: [
          {
            name: "items",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*items"
          }
        ],
        doc: "Returns a list containing given items.\n\nThe returned list can be assigned both to ``${scalar}`` and ``@{list}``\nvariables.\n\nExamples:\n| @{list} =   | Create List | a    | b    | c    |\n| ${scalar} = | Create List | a    | b    | c    |\n| ${ints} =   | Create List | ${1} | ${2} | ${3} |",
        shortdoc: "Returns a list containing given items.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 432
      },
      {
        name: "Evaluate",
        args: [
          {
            name: "expression",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "expression"
          },
          {
            name: "modules",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "modules=None"
          },
          {
            name: "namespace",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "namespace=None"
          }
        ],
        doc: "Evaluates the given expression in Python and returns the result.\n\n``expression`` is evaluated in Python as explained in the\n`Evaluating expressions` section.\n\n``modules`` argument can be used to specify a comma separated\nlist of Python modules to be imported and added to the evaluation\nnamespace.\n\n``namespace`` argument can be used to pass a custom evaluation\nnamespace as a dictionary. Possible ``modules`` are added to this\nnamespace.\n\nVariables used like ``${variable}`` are replaced in the expression\nbefore evaluation. Variables are also available in the evaluation\nnamespace and can be accessed using the special ``$variable`` syntax\nas explained in the `Evaluating expressions` section.\n\nStarting from Robot Framework 3.2, modules used in the expression are\nimported automatically. There are, however, two cases where they need to\nbe explicitly specified using the ``modules`` argument:\n\n- When nested modules like ``rootmod.submod`` are implemented so that\n  the root module does not automatically import sub modules. This is\n  illustrated by the ``selenium.webdriver`` example below.\n\n- When using a module in the expression part of a list comprehension.\n  This is illustrated by the ``json`` example below.\n\nExamples (expecting ``${result}`` is number 3.14):\n| ${status} =  | Evaluate | 0 < ${result} < 10 | # Would also work with string '3.14' |\n| ${status} =  | Evaluate | 0 < $result < 10   | # Using variable itself, not string representation |\n| ${random} =  | Evaluate | random.randint(0, sys.maxsize) |\n| ${options} = | Evaluate | selenium.webdriver.ChromeOptions() | modules=selenium.webdriver |\n| ${items} =   | Evaluate | [json.loads(item) for item in ('1', '\"b\"')] | modules=json |\n| ${ns} =      | Create Dictionary | x=${4}    | y=${2}              |\n| ${result} =  | Evaluate | x*10 + y           | namespace=${ns}     |\n=>\n| ${status} = True\n| ${random} = <random integer>\n| ${options} = ChromeOptions instance\n| ${items} = [1, 'b']\n| ${result} = 42\n\n*NOTE*: Prior to Robot Framework 3.2 using ``modules=rootmod.submod``\nwas not enough to make the root module itself available in the\nevaluation namespace. It needed to be taken into use explicitly like\n``modules=rootmod, rootmod.submod``.",
        shortdoc: "Evaluates the given expression in Python and returns the result.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3255
      },
      {
        name: "Exit For Loop",
        args: [],
        doc: "Stops executing the enclosing for loop.\n\nExits the enclosing for loop and continues execution after it.\nCan be used directly in a for loop or in a keyword that the loop uses.\n\nExample:\n| FOR | ${var}         | IN                 | @{VALUES}     |\n|     | Run Keyword If | '${var}' == 'EXIT' | Exit For Loop |\n|     | Do Something   | ${var} |\n| END |\n\nSee `Exit For Loop If` to conditionally exit a for loop without\nusing `Run Keyword If` or other wrapper keywords.",
        shortdoc: "Stops executing the enclosing for loop.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2567
      },
      {
        name: "Exit For Loop If",
        args: [
          {
            name: "condition",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "condition"
          }
        ],
        doc: "Stops executing the enclosing for loop if the ``condition`` is true.\n\nA wrapper for `Exit For Loop` to exit a for loop based on\nthe given condition. The condition is evaluated using the same\nsemantics as with `Should Be True` keyword.\n\nExample:\n| FOR | ${var}           | IN                 | @{VALUES} |\n|     | Exit For Loop If | '${var}' == 'EXIT' |\n|     | Do Something     | ${var}             |\n| END |",
        shortdoc: "Stops executing the enclosing for loop if the ``condition`` is true.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2585
      },
      {
        name: "Fail",
        args: [
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "tags",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*tags"
          }
        ],
        doc: "Fails the test with the given message and optionally alters its tags.\n\nThe error message is specified using the ``msg`` argument.\nIt is possible to use HTML in the given error message, similarly\nas with any other keyword accepting an error message, by prefixing\nthe error with ``*HTML*``.\n\nIt is possible to modify tags of the current test case by passing tags\nafter the message. Tags starting with a hyphen (e.g. ``-regression``)\nare removed and others added. Tags are modified using `Set Tags` and\n`Remove Tags` internally, and the semantics setting and removing them\nare the same as with these keywords.\n\nExamples:\n| Fail | Test not ready   |             | | # Fails with the given message.    |\n| Fail | *HTML*<b>Test not ready</b> | | | # Fails using HTML in the message. |\n| Fail | Test not ready   | not-ready   | | # Fails and adds 'not-ready' tag.  |\n| Fail | OS not supported | -regression | | # Removes tag 'regression'.        |\n| Fail | My message       | tag    | -t*  | # Removes all tags starting with 't' except the newly added 'tag'. |\n\nSee `Fatal Error` if you need to stop the whole test execution.",
        shortdoc: "Fails the test with the given message and optionally alters its tags.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 510
      },
      {
        name: "Fatal Error",
        args: [
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          }
        ],
        doc: "Stops the whole test execution.\n\nThe test or suite where this keyword is used fails with the provided\nmessage, and subsequent tests fail with a canned message.\nPossible teardowns will nevertheless be executed.\n\nSee `Fail` if you only want to stop one test case unconditionally.",
        shortdoc: "Stops the whole test execution.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 536
      },
      {
        name: "Get Count",
        args: [
          {
            name: "container",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "container"
          },
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          }
        ],
        doc: "Returns and logs how many times ``item`` is found from ``container``.\n\nThis keyword works with Python strings and lists and all objects\nthat either have ``count`` method or can be converted to Python lists.\n\nExample:\n| ${count} = | Get Count | ${some item} | interesting value |\n| Should Be True | 5 < ${count} < 10 |",
        shortdoc: "Returns and logs how many times ``item`` is found from ``container``.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1287
      },
      {
        name: "Get Length",
        args: [
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          }
        ],
        doc: "Returns and logs the length of the given item as an integer.\n\nThe item can be anything that has a length, for example, a string,\na list, or a mapping. The keyword first tries to get the length with\nthe Python function ``len``, which calls the  item's ``__len__`` method\ninternally. If that fails, the keyword tries to call the item's\npossible ``length`` and ``size`` methods directly. The final attempt is\ntrying to get the value of the item's ``length`` attribute. If all\nthese attempts are unsuccessful, the keyword fails.\n\nExamples:\n| ${length} = | Get Length    | Hello, world! |        |\n| Should Be Equal As Integers | ${length}     | 13     |\n| @{list} =   | Create List   | Hello,        | world! |\n| ${length} = | Get Length    | ${list}       |        |\n| Should Be Equal As Integers | ${length}     | 2      |\n\nSee also `Length Should Be`, `Should Be Empty` and `Should Not Be\nEmpty`.",
        shortdoc: "Returns and logs the length of the given item as an integer.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1400
      },
      {
        name: "Get Library Instance",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "name=None"
          },
          {
            name: "all",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "all=False"
          }
        ],
        doc: "Returns the currently active instance of the specified test library.\n\nThis keyword makes it easy for test libraries to interact with\nother test libraries that have state. This is illustrated by\nthe Python example below:\n\n| from robot.libraries.BuiltIn import BuiltIn\n|\n| def title_should_start_with(expected):\n|     seleniumlib = BuiltIn().get_library_instance('SeleniumLibrary')\n|     title = seleniumlib.get_title()\n|     if not title.startswith(expected):\n|         raise AssertionError(\"Title '%s' did not start with '%s'\"\n|                              % (title, expected))\n\nIt is also possible to use this keyword in the test data and\npass the returned library instance to another keyword. If a\nlibrary is imported with a custom name, the ``name`` used to get\nthe instance must be that name and not the original library name.\n\nIf the optional argument ``all`` is given a true value, then a\ndictionary mapping all library names to instances will be returned.\n\nExample:\n| &{all libs} = | Get library instance | all=True |",
        shortdoc: "Returns the currently active instance of the specified test library.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3528
      },
      {
        name: "Get Time",
        args: [
          {
            name: "format",
            types: [],
            defaultValue: "timestamp",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "format=timestamp"
          },
          {
            name: "time_",
            types: [],
            defaultValue: "NOW",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "time_=NOW"
          }
        ],
        doc: "Returns the given time in the requested format.\n\n*NOTE:* DateTime library contains much more flexible keywords for\ngetting the current date and time and for date and time handling in\ngeneral.\n\nHow time is returned is determined based on the given ``format``\nstring as follows. Note that all checks are case-insensitive.\n\n1) If ``format`` contains the word ``epoch``, the time is returned\n   in seconds after the UNIX epoch (1970-01-01 00:00:00 UTC).\n   The return value is always an integer.\n\n2) If ``format`` contains any of the words ``year``, ``month``,\n   ``day``, ``hour``, ``min``, or ``sec``, only the selected parts are\n   returned. The order of the returned parts is always the one\n   in the previous sentence and the order of words in ``format``\n   is not significant. The parts are returned as zero-padded\n   strings (e.g. May -> ``05``).\n\n3) Otherwise (and by default) the time is returned as a\n   timestamp string in the format ``2006-02-24 15:08:31``.\n\nBy default this keyword returns the current local time, but\nthat can be altered using ``time`` argument as explained below.\nNote that all checks involving strings are case-insensitive.\n\n1) If ``time`` is a number, or a string that can be converted to\n   a number, it is interpreted as seconds since the UNIX epoch.\n   This documentation was originally written about 1177654467\n   seconds after the epoch.\n\n2) If ``time`` is a timestamp, that time will be used. Valid\n   timestamp formats are ``YYYY-MM-DD hh:mm:ss`` and\n   ``YYYYMMDD hhmmss``.\n\n3) If ``time`` is equal to ``NOW`` (default), the current local\n   time is used.\n\n4) If ``time`` is equal to ``UTC``, the current time in\n   [http://en.wikipedia.org/wiki/Coordinated_Universal_Time|UTC]\n   is used.\n\n5) If ``time`` is in the format like ``NOW - 1 day`` or ``UTC + 1 hour\n   30 min``, the current local/UTC time plus/minus the time\n   specified with the time string is used. The time string format\n   is described in an appendix of Robot Framework User Guide.\n\nExamples (expecting the current local time is 2006-03-29 15:06:21):\n| ${time} = | Get Time |             |  |  |\n| ${secs} = | Get Time | epoch       |  |  |\n| ${year} = | Get Time | return year |  |  |\n| ${yyyy}   | ${mm}    | ${dd} =     | Get Time | year,month,day |\n| @{time} = | Get Time | year month day hour min sec |  |  |\n| ${y}      | ${s} =   | Get Time    | seconds and year |  |\n=>\n| ${time} = '2006-03-29 15:06:21'\n| ${secs} = 1143637581\n| ${year} = '2006'\n| ${yyyy} = '2006', ${mm} = '03', ${dd} = '29'\n| @{time} = ['2006', '03', '29', '15', '06', '21']\n| ${y} = '2006'\n| ${s} = '21'\n\nExamples (expecting the current local time is 2006-03-29 15:06:21 and\nUTC time is 2006-03-29 12:06:21):\n| ${time} = | Get Time |              | 1177654467          | # Time given as epoch seconds        |\n| ${secs} = | Get Time | sec          | 2007-04-27 09:14:27 | # Time given as a timestamp          |\n| ${year} = | Get Time | year         | NOW                 | # The local time of execution        |\n| @{time} = | Get Time | hour min sec | NOW + 1h 2min 3s    | # 1h 2min 3s added to the local time |\n| @{utc} =  | Get Time | hour min sec | UTC                 | # The UTC time of execution          |\n| ${hour} = | Get Time | hour         | UTC - 1 hour        | # 1h subtracted from the UTC  time   |\n=>\n| ${time} = '2007-04-27 09:14:27'\n| ${secs} = 27\n| ${year} = '2006'\n| @{time} = ['16', '08', '24']\n| @{utc} = ['12', '06', '21']\n| ${hour} = '11'",
        shortdoc: "Returns the given time in the requested format.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3172
      },
      {
        name: "Get Variable Value",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "default",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "default=None"
          }
        ],
        doc: "Returns variable value or ``default`` if the variable does not exist.\n\nThe name of the variable can be given either as a normal variable name\n(e.g. ``${NAME}``) or in escaped format (e.g. ``\\${NAME}``). Notice\nthat the former has some limitations explained in `Set Suite Variable`.\n\nExamples:\n| ${x} = | Get Variable Value | ${a} | default |\n| ${y} = | Get Variable Value | ${a} | ${b}    |\n| ${z} = | Get Variable Value | ${z} |         |\n=>\n| ${x} gets value of ${a} if ${a} exists and string 'default' otherwise\n| ${y} gets value of ${a} if ${a} exists and value of ${b} otherwise\n| ${z} is set to Python None if it does not exist previously\n\nSee `Set Variable If` for another keyword to set variables dynamically.",
        shortdoc: "Returns variable value or ``default`` if the variable does not exist.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1522
      },
      {
        name: "Get Variables",
        args: [
          {
            name: "no_decoration",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "no_decoration=False"
          }
        ],
        doc: "Returns a dictionary containing all variables in the current scope.\n\nVariables are returned as a special dictionary that allows accessing\nvariables in space, case, and underscore insensitive manner similarly\nas accessing variables in the test data. This dictionary supports all\nsame operations as normal Python dictionaries and, for example,\nCollections library can be used to access or modify it. Modifying the\nreturned dictionary has no effect on the variables available in the\ncurrent scope.\n\nBy default variables are returned with ``${}``, ``@{}`` or ``&{}``\ndecoration based on variable types. Giving a true value (see `Boolean\narguments`) to the optional argument ``no_decoration`` will return\nthe variables without the decoration.\n\nExample:\n| ${example_variable} =         | Set Variable | example value         |\n| ${variables} =                | Get Variables |                      |\n| Dictionary Should Contain Key | ${variables} | \\${example_variable} |\n| Dictionary Should Contain Key | ${variables} | \\${ExampleVariable}  |\n| Set To Dictionary             | ${variables} | \\${name} | value     |\n| Variable Should Not Exist     | \\${name}    |           |           |\n| ${no decoration} =            | Get Variables | no_decoration=Yes |\n| Dictionary Should Contain Key | ${no decoration} | example_variable |",
        shortdoc: "Returns a dictionary containing all variables in the current scope.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1492
      },
      {
        name: "Import Library",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Imports a library with the given name and optional arguments.\n\nThis functionality allows dynamic importing of libraries while tests\nare running. That may be necessary, if the library itself is dynamic\nand not yet available when test data is processed. In a normal case,\nlibraries should be imported using the Library setting in the Setting\nsection.\n\nThis keyword supports importing libraries both using library\nnames and physical paths. When paths are used, they must be\ngiven in absolute format or found from\n[http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#module-search-path|\nsearch path]. Forward slashes can be used as path separators in all\noperating systems.\n\nIt is possible to pass arguments to the imported library and also\nnamed argument syntax works if the library supports it. ``WITH NAME``\nsyntax can be used to give a custom name to the imported library.\n\nExamples:\n| Import Library | MyLibrary |\n| Import Library | ${CURDIR}/../Library.py | arg1 | named=arg2 |\n| Import Library | ${LIBRARIES}/Lib.java | arg | WITH NAME | JavaLib |",
        shortdoc: "Imports a library with the given name and optional arguments.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3029
      },
      {
        name: "Import Resource",
        args: [
          {
            name: "path",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "path"
          }
        ],
        doc: "Imports a resource file with the given path.\n\nResources imported with this keyword are set into the test suite scope\nsimilarly when importing them in the Setting table using the Resource\nsetting.\n\nThe given path must be absolute or found from\n[http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#pythonpath-jythonpath-and-ironpythonpath|\nsearch path]. Forward slashes can be used as path separator regardless\nthe operating system.\n\nExamples:\n| Import Resource | ${CURDIR}/resource.txt |\n| Import Resource | ${CURDIR}/../resources/resource.html |\n| Import Resource | found_from_pythonpath.robot |",
        shortdoc: "Imports a resource file with the given path.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3091
      },
      {
        name: "Import Variables",
        args: [
          {
            name: "path",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "path"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Imports a variable file with the given path and optional arguments.\n\nVariables imported with this keyword are set into the test suite scope\nsimilarly when importing them in the Setting table using the Variables\nsetting. These variables override possible existing variables with\nthe same names. This functionality can thus be used to import new\nvariables, for example, for each test in a test suite.\n\nThe given path must be absolute or found from\n[http://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#pythonpath-jythonpath-and-ironpythonpath|\nsearch path]. Forward slashes can be used as path separator regardless\nthe operating system.\n\nExamples:\n| Import Variables | ${CURDIR}/variables.py   |      |      |\n| Import Variables | ${CURDIR}/../vars/env.py | arg1 | arg2 |\n| Import Variables | file_from_pythonpath.py  |      |      |",
        shortdoc: "Imports a variable file with the given path and optional arguments.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3066
      },
      {
        name: "Keyword Should Exist",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          }
        ],
        doc: "Fails unless the given keyword exists in the current scope.\n\nFails also if there are more than one keywords with the same name.\nWorks both with the short name (e.g. ``Log``) and the full name\n(e.g. ``BuiltIn.Log``).\n\nThe default error message can be overridden with the ``msg`` argument.\n\nSee also `Variable Should Exist`.",
        shortdoc: "Fails unless the given keyword exists in the current scope.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3154
      },
      {
        name: "Length Should Be",
        args: [
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          },
          {
            name: "length",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "length"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          }
        ],
        doc: "Verifies that the length of the given item is correct.\n\nThe length of the item is got using the `Get Length` keyword. The\ndefault error message can be overridden with the ``msg`` argument.",
        shortdoc: "Verifies that the length of the given item is correct.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1448
      },
      {
        name: "Log",
        args: [
          {
            name: "message",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "message"
          },
          {
            name: "level",
            types: [],
            defaultValue: "INFO",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "level=INFO"
          },
          {
            name: "html",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "html=False"
          },
          {
            name: "console",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "console=False"
          },
          {
            name: "repr",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "repr=False"
          },
          {
            name: "formatter",
            types: [],
            defaultValue: "str",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "formatter=str"
          }
        ],
        doc: "Logs the given message with the given level.\n\nValid levels are TRACE, DEBUG, INFO (default), HTML, WARN, and ERROR.\nMessages below the current active log level are ignored. See\n`Set Log Level` keyword and ``--loglevel`` command line option\nfor more details about setting the level.\n\nMessages logged with the WARN or ERROR levels will be automatically\nvisible also in the console and in the Test Execution Errors section\nin the log file.\n\nIf the ``html`` argument is given a true value (see `Boolean\narguments`), the message will be considered HTML and special characters\nsuch as ``<`` are not escaped. For example, logging\n``<img src=\"image.png\">`` creates an image when ``html`` is true, but\notherwise the message is that exact string. An alternative to using\nthe ``html`` argument is using the HTML pseudo log level. It logs\nthe message as HTML using the INFO level.\n\nIf the ``console`` argument is true, the message will be written to\nthe console where test execution was started from in addition to\nthe log file. This keyword always uses the standard output stream\nand adds a newline after the written message. Use `Log To Console`\ninstead if either of these is undesirable,\n\nThe ``formatter`` argument controls how to format the string\nrepresentation of the message. Possible values are ``str`` (default),\n``repr`` and ``ascii``, and they work similarly to Python built-in\nfunctions with same names. When using ``repr``, bigger lists,\ndictionaries and other containers are also pretty-printed so that\nthere is one item per row. For more details see `String\nrepresentations`.\n\nThe old way to control string representation was using the ``repr``\nargument, and ``repr=True`` is still equivalent to using\n``formatter=repr``. The ``repr`` argument will be deprecated in the\nfuture, though, and using ``formatter`` is thus recommended.\n\nExamples:\n| Log | Hello, world!        |          |   | # Normal INFO message.   |\n| Log | Warning, world!      | WARN     |   | # Warning.               |\n| Log | <b>Hello</b>, world! | html=yes |   | # INFO message as HTML.  |\n| Log | <b>Hello</b>, world! | HTML     |   | # Same as above.         |\n| Log | <b>Hello</b>, world! | DEBUG    | html=true | # DEBUG as HTML. |\n| Log | Hello, console!   | console=yes | | # Log also to the console. |\n| Log | Null is \\x00  | formatter=repr | | # Log ``'Null is \\x00'``. |\n\nSee `Log Many` if you want to log multiple messages in one go, and\n`Log To Console` if you only want to write to the console.",
        shortdoc: "Logs the given message with the given level.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2862
      },
      {
        name: "Log Many",
        args: [
          {
            name: "messages",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*messages"
          }
        ],
        doc: "Logs the given messages as separate entries using the INFO level.\n\nSupports also logging list and dictionary variable items individually.\n\nExamples:\n| Log Many | Hello   | ${var}  |\n| Log Many | @{list} | &{dict} |\n\nSee `Log` and `Log To Console` keywords if you want to use alternative\nlog levels, use HTML, or log to the console.",
        shortdoc: "Logs the given messages as separate entries using the INFO level.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2934
      },
      {
        name: "Log To Console",
        args: [
          {
            name: "message",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "message"
          },
          {
            name: "stream",
            types: [],
            defaultValue: "STDOUT",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "stream=STDOUT"
          },
          {
            name: "no_newline",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "no_newline=False"
          }
        ],
        doc: "Logs the given message to the console.\n\nBy default uses the standard output stream. Using the standard error\nstream is possibly by giving the ``stream`` argument value ``STDERR``\n(case-insensitive).\n\nBy default appends a newline to the logged message. This can be\ndisabled by giving the ``no_newline`` argument a true value (see\n`Boolean arguments`).\n\nExamples:\n| Log To Console | Hello, console!             |                 |\n| Log To Console | Hello, stderr!              | STDERR          |\n| Log To Console | Message starts here and is  | no_newline=true |\n| Log To Console | continued without newline.  |                 |\n\nThis keyword does not log the message to the normal log file. Use\n`Log` keyword, possibly with argument ``console``, if that is desired.",
        shortdoc: "Logs the given message to the console.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2962
      },
      {
        name: "Log Variables",
        args: [
          {
            name: "level",
            types: [],
            defaultValue: "INFO",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "level=INFO"
          }
        ],
        doc: "Logs all variables in the current scope with given log level.",
        shortdoc: "Logs all variables in the current scope with given log level.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1546
      },
      {
        name: "No Operation",
        args: [],
        doc: "Does absolutely nothing.",
        shortdoc: "Does absolutely nothing.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2798
      },
      {
        name: "Pass Execution",
        args: [
          {
            name: "message",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "message"
          },
          {
            name: "tags",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*tags"
          }
        ],
        doc: "Skips rest of the current test, setup, or teardown with PASS status.\n\nThis keyword can be used anywhere in the test data, but the place where\nused affects the behavior:\n\n- When used in any setup or teardown (suite, test or keyword), passes\n  that setup or teardown. Possible keyword teardowns of the started\n  keywords are executed. Does not affect execution or statuses\n  otherwise.\n- When used in a test outside setup or teardown, passes that particular\n  test case. Possible test and keyword teardowns are executed.\n\nPossible continuable failures before this keyword is used, as well as\nfailures in executed teardowns, will fail the execution.\n\nIt is mandatory to give a message explaining why execution was passed.\nBy default the message is considered plain text, but starting it with\n``*HTML*`` allows using HTML formatting.\n\nIt is also possible to modify test tags passing tags after the message\nsimilarly as with `Fail` keyword. Tags starting with a hyphen\n(e.g. ``-regression``) are removed and others added. Tags are modified\nusing `Set Tags` and `Remove Tags` internally, and the semantics\nsetting and removing them are the same as with these keywords.\n\nExamples:\n| Pass Execution | All features available in this version tested. |\n| Pass Execution | Deprecated test. | deprecated | -regression    |\n\nThis keyword is typically wrapped to some other keyword, such as\n`Run Keyword If`, to pass based on a condition. The most common case\ncan be handled also with `Pass Execution If`:\n\n| Run Keyword If    | ${rc} < 0 | Pass Execution | Negative values are cool. |\n| Pass Execution If | ${rc} < 0 | Negative values are cool. |\n\nPassing execution in the middle of a test, setup or teardown should be\nused with care. In the worst case it leads to tests that skip all the\nparts that could actually uncover problems in the tested application.\nIn cases where execution cannot continue do to external factors,\nit is often safer to fail the test case and make it non-critical.",
        shortdoc: "Skips rest of the current test, setup, or teardown with PASS status.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2724
      },
      {
        name: "Pass Execution If",
        args: [
          {
            name: "condition",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "condition"
          },
          {
            name: "message",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "message"
          },
          {
            name: "tags",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*tags"
          }
        ],
        doc: "Conditionally skips rest of the current test, setup, or teardown with PASS status.\n\nA wrapper for `Pass Execution` to skip rest of the current test,\nsetup or teardown based the given ``condition``. The condition is\nevaluated similarly as with `Should Be True` keyword, and ``message``\nand ``*tags`` have same semantics as with `Pass Execution`.\n\nExample:\n| FOR | ${var}            | IN                     | @{VALUES}               |\n|     | Pass Execution If | '${var}' == 'EXPECTED' | Correct value was found |\n|     | Do Something      | ${var}                 |\n| END |",
        shortdoc: "Conditionally skips rest of the current test, setup, or teardown with PASS status.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2776
      },
      {
        name: "Regexp Escape",
        args: [
          {
            name: "patterns",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*patterns"
          }
        ],
        doc: "Returns each argument string escaped for use as a regular expression.\n\nThis keyword can be used to escape strings to be used with\n`Should Match Regexp` and `Should Not Match Regexp` keywords.\n\nEscaping is done with Python's ``re.escape()`` function.\n\nExamples:\n| ${escaped} = | Regexp Escape | ${original} |\n| @{strings} = | Regexp Escape | @{strings}  |",
        shortdoc: "Returns each argument string escaped for use as a regular expression.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3342
      },
      {
        name: "Reload Library",
        args: [
          {
            name: "name_or_instance",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name_or_instance"
          }
        ],
        doc: "Rechecks what keywords the specified library provides.\n\nCan be called explicitly in the test data or by a library itself\nwhen keywords it provides have changed.\n\nThe library can be specified by its name or as the active instance of\nthe library. The latter is especially useful if the library itself\ncalls this keyword as a method.",
        shortdoc: "Rechecks what keywords the specified library provides.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3014
      },
      {
        name: "Remove Tags",
        args: [
          {
            name: "tags",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*tags"
          }
        ],
        doc: "Removes given ``tags`` from the current test or all tests in a suite.\n\nTags can be given exactly or using a pattern with ``*``, ``?`` and\n``[chars]`` acting as wildcards. See the `Glob patterns` section\nfor more information.\n\nThis keyword can affect either one test case or all test cases in a\ntest suite similarly as `Set Tags` keyword.\n\nThe current tags are available as a built-in variable ``@{TEST TAGS}``.\n\nExample:\n| Remove Tags | mytag | something-* | ?ython |\n\nSee `Set Tags` if you want to add certain tags and `Fail` if you want\nto fail the test case after setting and/or removing tags.",
        shortdoc: "Removes given ``tags`` from the current test or all tests in a suite.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3500
      },
      {
        name: "Repeat Keyword",
        args: [
          {
            name: "repeat",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "repeat"
          },
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Executes the specified keyword multiple times.\n\n``name`` and ``args`` define the keyword that is executed similarly as\nwith `Run Keyword`. ``repeat`` specifies how many times (as a count) or\nhow long time (as a timeout) the keyword should be executed.\n\nIf ``repeat`` is given as count, it specifies how many times the\nkeyword should be executed. ``repeat`` can be given as an integer or\nas a string that can be converted to an integer. If it is a string,\nit can have postfix ``times`` or ``x`` (case and space insensitive)\nto make the expression more explicit.\n\nIf ``repeat`` is given as timeout, it must be in Robot Framework's\ntime format (e.g. ``1 minute``, ``2 min 3 s``). Using a number alone\n(e.g. ``1`` or ``1.5``) does not work in this context.\n\nIf ``repeat`` is zero or negative, the keyword is not executed at\nall. This keyword fails immediately if any of the execution\nrounds fails.\n\nExamples:\n| Repeat Keyword | 5 times   | Go to Previous Page |\n| Repeat Keyword | ${var}    | Some Keyword | arg1 | arg2 |\n| Repeat Keyword | 2 minutes | Some Keyword | arg1 | arg2 |",
        shortdoc: "Executes the specified keyword multiple times.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2198
      },
      {
        name: "Replace Variables",
        args: [
          {
            name: "text",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "text"
          }
        ],
        doc: "Replaces variables in the given text with their current values.\n\nIf the text contains undefined variables, this keyword fails.\nIf the given ``text`` contains only a single variable, its value is\nreturned as-is and it can be any object. Otherwise this keyword\nalways returns a string.\n\nExample:\n\nThe file ``template.txt`` contains ``Hello ${NAME}!`` and variable\n``${NAME}`` has the value ``Robot``.\n\n| ${template} =   | Get File          | ${CURDIR}/template.txt |\n| ${message} =    | Replace Variables | ${template}            |\n| Should Be Equal | ${message}        | Hello Robot!           |",
        shortdoc: "Replaces variables in the given text with their current values.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1607
      },
      {
        name: "Return From Keyword",
        args: [
          {
            name: "return_values",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*return_values"
          }
        ],
        doc: "Returns from the enclosing user keyword.\n\nThis keyword can be used to return from a user keyword with PASS status\nwithout executing it fully. It is also possible to return values\nsimilarly as with the ``[Return]`` setting. For more detailed information\nabout working with the return values, see the User Guide.\n\nThis keyword is typically wrapped to some other keyword, such as\n`Run Keyword If` or `Run Keyword If Test Passed`, to return based\non a condition:\n\n| Run Keyword If | ${rc} < 0 | Return From Keyword |\n| Run Keyword If Test Passed | Return From Keyword |\n\nIt is possible to use this keyword to return from a keyword also inside\na for loop. That, as well as returning values, is demonstrated by the\n`Find Index` keyword in the following somewhat advanced example.\nNotice that it is often a good idea to move this kind of complicated\nlogic into a test library.\n\n| ***** Variables *****\n| @{LIST} =    foo    baz\n|\n| ***** Test Cases *****\n| Example\n|     ${index} =    Find Index    baz    @{LIST}\n|     Should Be Equal    ${index}    ${1}\n|     ${index} =    Find Index    non existing    @{LIST}\n|     Should Be Equal    ${index}    ${-1}\n|\n| ***** Keywords *****\n| Find Index\n|    [Arguments]    ${element}    @{items}\n|    ${index} =    Set Variable    ${0}\n|    FOR    ${item}    IN    @{items}\n|        Run Keyword If    '${item}' == '${element}'    Return From Keyword    ${index}\n|        ${index} =    Set Variable    ${index + 1}\n|    END\n|    Return From Keyword    ${-1}    # Also [Return] would work here.\n\nThe most common use case, returning based on an expression, can be\naccomplished directly with `Return From Keyword If`. See also\n`Run Keyword And Return` and `Run Keyword And Return If`.",
        shortdoc: "Returns from the enclosing user keyword.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2602
      },
      {
        name: "Return From Keyword If",
        args: [
          {
            name: "condition",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "condition"
          },
          {
            name: "return_values",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*return_values"
          }
        ],
        doc: "Returns from the enclosing user keyword if ``condition`` is true.\n\nA wrapper for `Return From Keyword` to return based on the given\ncondition. The condition is evaluated using the same semantics as\nwith `Should Be True` keyword.\n\nGiven the same example as in `Return From Keyword`, we can rewrite the\n`Find Index` keyword as follows:\n\n| ***** Keywords *****\n| Find Index\n|    [Arguments]    ${element}    @{items}\n|    ${index} =    Set Variable    ${0}\n|    FOR    ${item}    IN    @{items}\n|        Return From Keyword If    '${item}' == '${element}'    ${index}\n|        ${index} =    Set Variable    ${index + 1}\n|    END\n|    Return From Keyword    ${-1}    # Also [Return] would work here.\n\nSee also `Run Keyword And Return` and `Run Keyword And Return If`.",
        shortdoc: "Returns from the enclosing user keyword if ``condition`` is true.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2654
      },
      {
        name: "Run Keyword",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Executes the given keyword with the given arguments.\n\nBecause the name of the keyword to execute is given as an argument, it\ncan be a variable and thus set dynamically, e.g. from a return value of\nanother keyword or from the command line.",
        shortdoc: "Executes the given keyword with the given arguments.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1860
      },
      {
        name: "Run Keyword And Continue On Failure",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the keyword and continues execution even if a failure occurs.\n\nThe keyword name and arguments work as with `Run Keyword`.\n\nExample:\n| Run Keyword And Continue On Failure | Fail | This is a stupid example |\n| Log | This keyword is executed |\n\nThe execution is not continued if the failure is caused by invalid syntax,\ntimeout, or fatal exception.",
        shortdoc: "Runs the keyword and continues execution even if a failure occurs.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2112
      },
      {
        name: "Run Keyword And Expect Error",
        args: [
          {
            name: "expected_error",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "expected_error"
          },
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the keyword and checks that the expected error occurred.\n\nThe keyword to execute and its arguments are specified using ``name``\nand ``*args`` exactly like with `Run Keyword`.\n\nThe expected error must be given in the same format as in Robot Framework\nreports. By default it is interpreted as a glob pattern with ``*``, ``?``\nand ``[chars]`` as wildcards, but that can be changed by using various\nprefixes explained in the table below. Prefixes are case-sensitive and\nthey must be separated from the actual message with a colon and an\noptional space like ``PREFIX: Message`` or ``PREFIX:Message``.\n\n| = Prefix = | = Explanation = |\n| ``EQUALS`` | Exact match. Especially useful if the error contains glob wildcards. |\n| ``STARTS`` | Error must start with the specified error. |\n| ``REGEXP`` | Regular expression match. |\n| ``GLOB``   | Same as the default behavior. |\n\nSee the `Pattern matching` section for more information about glob\npatterns and regular expressions.\n\nIf the expected error occurs, the error message is returned and it can\nbe further processed or tested if needed. If there is no error, or the\nerror does not match the expected error, this keyword fails.\n\nExamples:\n| Run Keyword And Expect Error | My error            | Keyword | arg |\n| Run Keyword And Expect Error | ValueError: *       | Some Keyword  |\n| Run Keyword And Expect Error | STARTS: ValueError: | Some Keyword  |\n| Run Keyword And Expect Error | EQUALS:No match for '//input[@type=\"text\"]' |\n| ...                          | Find Element | //input[@type=\"text\"] |\n| ${msg} =                     | Run Keyword And Expect Error | * |\n| ...                          | Keyword | arg1 | arg2 |\n| Log To Console | ${msg} |\n\nErrors caused by invalid syntax, timeouts, or fatal exceptions are not\ncaught by this keyword.",
        shortdoc: "Runs the keyword and checks that the expected error occurred.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2132
      },
      {
        name: "Run Keyword And Ignore Error",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the given keyword with the given arguments and ignores possible error.\n\nThis keyword returns two values, so that the first is either string\n``PASS`` or ``FAIL``, depending on the status of the executed keyword.\nThe second value is either the return value of the keyword or the\nreceived error message. See `Run Keyword And Return Status` If you are\nonly interested in the execution status.\n\nThe keyword name and arguments work as in `Run Keyword`. See\n`Run Keyword If` for a usage example.\n\nErrors caused by invalid syntax, timeouts, or fatal exceptions are not\ncaught by this keyword. Otherwise this keyword itself never fails.",
        shortdoc: "Runs the given keyword with the given arguments and ignores possible error.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2049
      },
      {
        name: "Run Keyword And Return",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the specified keyword and returns from the enclosing user keyword.\n\nThe keyword to execute is defined with ``name`` and ``*args`` exactly\nlike with `Run Keyword`. After running the keyword, returns from the\nenclosing user keyword and passes possible return value from the\nexecuted keyword further. Returning from a keyword has exactly same\nsemantics as with `Return From Keyword`.\n\nExample:\n| `Run Keyword And Return`  | `My Keyword` | arg1 | arg2 |\n| # Above is equivalent to: |\n| ${result} =               | `My Keyword` | arg1 | arg2 |\n| `Return From Keyword`     | ${result}    |      |      |\n\nUse `Run Keyword And Return If` if you want to run keyword and return\nbased on a condition.",
        shortdoc: "Runs the specified keyword and returns from the enclosing user keyword.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2680
      },
      {
        name: "Run Keyword And Return If",
        args: [
          {
            name: "condition",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "condition"
          },
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the specified keyword and returns from the enclosing user keyword.\n\nA wrapper for `Run Keyword And Return` to run and return based on\nthe given ``condition``. The condition is evaluated using the same\nsemantics as with `Should Be True` keyword.\n\nExample:\n| `Run Keyword And Return If` | ${rc} > 0 | `My Keyword` | arg1 | arg2 |\n| # Above is equivalent to:   |\n| `Run Keyword If`            | ${rc} > 0 | `Run Keyword And Return` | `My Keyword ` | arg1 | arg2 |\n\nUse `Return From Keyword If` if you want to return a certain value\nbased on a condition.",
        shortdoc: "Runs the specified keyword and returns from the enclosing user keyword.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2706
      },
      {
        name: "Run Keyword And Return Status",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the given keyword with given arguments and returns the status as a Boolean value.\n\nThis keyword returns Boolean ``True`` if the keyword that is executed\nsucceeds and ``False`` if it fails. This is useful, for example, in\ncombination with `Run Keyword If`. If you are interested in the error\nmessage or return value, use `Run Keyword And Ignore Error` instead.\n\nThe keyword name and arguments work as in `Run Keyword`.\n\nExample:\n| ${passed} = | `Run Keyword And Return Status` | Keyword | args |\n| `Run Keyword If` | ${passed} | Another keyword |\n\nErrors caused by invalid syntax, timeouts, or fatal exceptions are not\ncaught by this keyword. Otherwise this keyword itself never fails.",
        shortdoc: "Runs the given keyword with given arguments and returns the status as a Boolean value.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2091
      },
      {
        name: "Run Keyword And Warn On Failure",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the specified keyword logs a warning if the keyword fails.\n\nThis keyword is similar to `Run Keyword And Ignore Error` but if the executed\nkeyword fails, the error message is logged as a warning to make it more\nvisible. Returns status and possible return value or error message exactly\nlike `Run Keyword And Ignore Error` does.\n\nErrors caused by invalid syntax, timeouts, or fatal exceptions are not\ncaught by this keyword. Otherwise this keyword itself never fails.\n\nNew in Robot Framework 4.0.",
        shortdoc: "Runs the specified keyword logs a warning if the keyword fails.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2072
      },
      {
        name: "Run Keyword If",
        args: [
          {
            name: "condition",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "condition"
          },
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the given keyword with the given arguments, if ``condition`` is true.\n\n*NOTE:* Robot Framework 4.0 introduced built-in IF/ELSE support and using\nthat is generally recommended over using this keyword.\n\nThe given ``condition`` is evaluated in Python as explained in\n`Evaluating expressions`, and ``name`` and ``*args`` have same\nsemantics as with `Run Keyword`.\n\nExample, a simple if/else construct:\n| ${status} | ${value} = | `Run Keyword And Ignore Error` | `My Keyword` |\n| `Run Keyword If`     | '${status}' == 'PASS' | `Some Action`    | arg |\n| `Run Keyword Unless` | '${status}' == 'PASS' | `Another Action` |\n\nIn this example, only either `Some Action` or `Another Action` is\nexecuted, based on the status of `My Keyword`. Instead of `Run Keyword\nAnd Ignore Error` you can also use `Run Keyword And Return Status`.\n\nVariables used like ``${variable}``, as in the examples above, are\nreplaced in the expression before evaluation. Variables are also\navailable in the evaluation namespace and can be accessed using special\nsyntax ``$variable`` as explained in the `Evaluating expressions`\nsection.\n\nExample:\n| `Run Keyword If` | $result is None or $result == 'FAIL' | `Keyword` |\n\nThis keyword supports also optional ELSE and ELSE IF branches. Both\nof them are defined in ``*args`` and must use exactly format ``ELSE``\nor ``ELSE IF``, respectively. ELSE branches must contain first the\nname of the keyword to execute and then its possible arguments. ELSE\nIF branches must first contain a condition, like the first argument\nto this keyword, and then the keyword to execute and its possible\narguments. It is possible to have ELSE branch after ELSE IF and to\nhave multiple ELSE IF branches. Nested `Run Keyword If` usage is not\nsupported when using ELSE and/or ELSE IF branches.\n\nGiven previous example, if/else construct can also be created like this:\n| ${status} | ${value} = | `Run Keyword And Ignore Error` | `My Keyword` |\n| `Run Keyword If` | '${status}' == 'PASS' | `Some Action` | arg | ELSE | `Another Action` |\n\nThe return value of this keyword is the return value of the actually\nexecuted keyword or Python ``None`` if no keyword was executed (i.e.\nif ``condition`` was false). Hence, it is recommended to use ELSE\nand/or ELSE IF branches to conditionally assign return values from\nkeyword to variables (see `Set Variable If` if you need to set fixed\nvalues conditionally). This is illustrated by the example below:\n\n| ${var1} =   | `Run Keyword If` | ${rc} == 0     | `Some keyword returning a value` |\n| ...         | ELSE IF          | 0 < ${rc} < 42 | `Another keyword` |\n| ...         | ELSE IF          | ${rc} < 0      | `Another keyword with args` | ${rc} | arg2 |\n| ...         | ELSE             | `Final keyword to handle abnormal cases` | ${rc} |\n| ${var2} =   | `Run Keyword If` | ${condition}  | `Some keyword` |\n\nIn this example, ${var2} will be set to ``None`` if ${condition} is\nfalse.\n\nNotice that ``ELSE`` and ``ELSE IF`` control words must be used\nexplicitly and thus cannot come from variables. If you need to use\nliteral ``ELSE`` and ``ELSE IF`` strings as arguments, you can escape\nthem with a backslash like ``\\ELSE`` and ``\\ELSE IF``.\n\nPython's [http://docs.python.org/library/os.html|os] and\n[http://docs.python.org/library/sys.html|sys] modules are\nautomatically imported when evaluating the ``condition``.\nAttributes they contain can thus be used in the condition:\n\n| `Run Keyword If` | os.sep == '/' | `Unix Keyword`        |\n| ...              | ELSE IF       | sys.platform.startswith('java') | `Jython Keyword` |\n| ...              | ELSE          | `Windows Keyword`     |",
        shortdoc: "Runs the given keyword with the given arguments, if ``condition`` is true.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1943
      },
      {
        name: "Run Keyword If All Critical Tests Passed",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "*DEPRECATED.* Use `BuiltIn.Run Keyword If All Tests Passed` instead.",
        shortdoc: "*DEPRECATED.* Use `BuiltIn.Run Keyword If All Tests Passed` instead.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2466
      },
      {
        name: "Run Keyword If All Tests Passed",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the given keyword with the given arguments, if all tests passed.\n\nThis keyword can only be used in a suite teardown. Trying to use it\nanywhere else results in an error.\n\nOtherwise, this keyword works exactly like `Run Keyword`, see its\ndocumentation for more details.",
        shortdoc: "Runs the given keyword with the given arguments, if all tests passed.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2476
      },
      {
        name: "Run Keyword If Any Critical Tests Failed",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "*DEPRECATED.* Use `BuiltIn.Run Keyword If Any Tests Failed` instead.",
        shortdoc: "*DEPRECATED.* Use `BuiltIn.Run Keyword If Any Tests Failed` instead.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2471
      },
      {
        name: "Run Keyword If Any Tests Failed",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the given keyword with the given arguments, if one or more tests failed.\n\nThis keyword can only be used in a suite teardown. Trying to use it\nanywhere else results in an error.\n\nOtherwise, this keyword works exactly like `Run Keyword`, see its\ndocumentation for more details.",
        shortdoc: "Runs the given keyword with the given arguments, if one or more tests failed.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2490
      },
      {
        name: "Run Keyword If Test Failed",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the given keyword with the given arguments, if the test failed.\n\nThis keyword can only be used in a test teardown. Trying to use it\nanywhere else results in an error.\n\nOtherwise, this keyword works exactly like `Run Keyword`, see its\ndocumentation for more details.",
        shortdoc: "Runs the given keyword with the given arguments, if the test failed.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2417
      },
      {
        name: "Run Keyword If Test Passed",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the given keyword with the given arguments, if the test passed.\n\nThis keyword can only be used in a test teardown. Trying to use it\nanywhere else results in an error.\n\nOtherwise, this keyword works exactly like `Run Keyword`, see its\ndocumentation for more details.",
        shortdoc: "Runs the given keyword with the given arguments, if the test passed.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2431
      },
      {
        name: "Run Keyword If Timeout Occurred",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the given keyword if either a test or a keyword timeout has occurred.\n\nThis keyword can only be used in a test teardown. Trying to use it\nanywhere else results in an error.\n\nOtherwise, this keyword works exactly like `Run Keyword`, see its\ndocumentation for more details.",
        shortdoc: "Runs the given keyword if either a test or a keyword timeout has occurred.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2445
      },
      {
        name: "Run Keyword Unless",
        args: [
          {
            name: "condition",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "condition"
          },
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the given keyword with the given arguments if ``condition`` is false.\n\nSee `Run Keyword If` for more information and an example. Notice that\nthis keyword does not support ``ELSE`` or ``ELSE IF`` branches like\n`Run Keyword If` does, though.",
        shortdoc: "Runs the given keyword with the given arguments if ``condition`` is false.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2038
      },
      {
        name: "Run Keywords",
        args: [
          {
            name: "keywords",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*keywords"
          }
        ],
        doc: "Executes all the given keywords in a sequence.\n\nThis keyword is mainly useful in setups and teardowns when they need\nto take care of multiple actions and creating a new higher level user\nkeyword would be an overkill.\n\nBy default all arguments are expected to be keywords to be executed.\n\nExamples:\n| `Run Keywords` | `Initialize database` | `Start servers` | `Clear logs` |\n| `Run Keywords` | ${KW 1} | ${KW 2} |\n| `Run Keywords` | @{KEYWORDS} |\n\nKeywords can also be run with arguments using upper case ``AND`` as\na separator between keywords. The keywords are executed so that the\nfirst argument is the first keyword and proceeding arguments until\nthe first ``AND`` are arguments to it. First argument after the first\n``AND`` is the second keyword and proceeding arguments until the next\n``AND`` are its arguments. And so on.\n\nExamples:\n| `Run Keywords` | `Initialize database` | db1 | AND | `Start servers` | server1 | server2 |\n| `Run Keywords` | `Initialize database` | ${DB NAME} | AND | `Start servers` | @{SERVERS} | AND | `Clear logs` |\n| `Run Keywords` | ${KW} | AND | @{KW WITH ARGS} |\n\nNotice that the ``AND`` control argument must be used explicitly and\ncannot itself come from a variable. If you need to use literal ``AND``\nstring as argument, you can either use variables or escape it with\na backslash like ``\\AND``.",
        shortdoc: "Executes all the given keywords in a sequence.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1873
      },
      {
        name: "Set Global Variable",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "values",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*values"
          }
        ],
        doc: "Makes a variable available globally in all tests and suites.\n\nVariables set with this keyword are globally available in all\nsubsequent test suites, test cases and user keywords. Also variables\nin variable tables are overridden. Variables assigned locally based\non keyword return values or by using `Set Test Variable` and\n`Set Suite Variable` override these variables in that scope, but\nthe global value is not changed in those cases.\n\nIn practice setting variables with this keyword has the same effect\nas using command line options ``--variable`` and ``--variablefile``.\nBecause this keyword can change variables everywhere, it should be\nused with care.\n\nSee `Set Suite Variable` for more information and examples.",
        shortdoc: "Makes a variable available globally in all tests and suites.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1780
      },
      {
        name: "Set Library Search Order",
        args: [
          {
            name: "search_order",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*search_order"
          }
        ],
        doc: "Sets the resolution order to use when a name matches multiple keywords.\n\nThe library search order is used to resolve conflicts when a keyword\nname in the test data matches multiple keywords. The first library\n(or resource, see below) containing the keyword is selected and that\nkeyword implementation used. If the keyword is not found from any library\n(or resource), test executing fails the same way as when the search\norder is not set.\n\nWhen this keyword is used, there is no need to use the long\n``LibraryName.Keyword Name`` notation.  For example, instead of\nhaving\n\n| MyLibrary.Keyword | arg |\n| MyLibrary.Another Keyword |\n| MyLibrary.Keyword | xxx |\n\nyou can have\n\n| Set Library Search Order | MyLibrary |\n| Keyword | arg |\n| Another Keyword |\n| Keyword | xxx |\n\nThis keyword can be used also to set the order of keywords in different\nresource files. In this case resource names must be given without paths\nor extensions like:\n\n| Set Library Search Order | resource | another_resource |\n\n*NOTE:*\n- The search order is valid only in the suite where this keywords is used.\n- Keywords in resources always have higher priority than\n  keywords in libraries regardless the search order.\n- The old order is returned and can be used to reset the search order later.\n- Library and resource names in the search order are both case and space\n  insensitive.",
        shortdoc: "Sets the resolution order to use when a name matches multiple keywords.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3113
      },
      {
        name: "Set Local Variable",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "values",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*values"
          }
        ],
        doc: "Makes a variable available everywhere within the local scope.\n\nVariables set with this keyword are available within the\nlocal scope of the currently executed test case or in the local scope\nof the keyword in which they are defined. For example, if you set a\nvariable in a user keyword, it is available only in that keyword. Other\ntest cases or keywords will not see variables set with this keyword.\n\nThis keyword is equivalent to a normal variable assignment based on a\nkeyword return value.\n\nExample:\n| @{list} =          | Create List | item1     | item2     | item3     |\n\nis equivalent with\n\n| Set Local Variable | @{list} | item1    | item2    | item3    |\n\nThis keyword will provide the option of setting local variables inside keywords\nlike `Run Keyword If`, `Run Keyword And Return If`, `Run Keyword Unless`\nwhich until now was not possible by using `Set Variable`.\n\nIt will also be possible to use this keyword from external libraries\nthat want to set local variables.\n\nNew in Robot Framework 3.2.",
        shortdoc: "Makes a variable available everywhere within the local scope.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1654
      },
      {
        name: "Set Log Level",
        args: [
          {
            name: "level",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "level"
          }
        ],
        doc: "Sets the log threshold to the specified level and returns the old level.\n\nMessages below the level will not logged. The default logging level is\nINFO, but it can be overridden with the command line option\n``--loglevel``.\n\nThe available levels: TRACE, DEBUG, INFO (default), WARN, ERROR and NONE (no\nlogging).",
        shortdoc: "Sets the log threshold to the specified level and returns the old level.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2996
      },
      {
        name: "Set Suite Documentation",
        args: [
          {
            name: "doc",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "doc"
          },
          {
            name: "append",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "append=False"
          },
          {
            name: "top",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "top=False"
          }
        ],
        doc: "Sets documentation for the current test suite.\n\nBy default the possible existing documentation is overwritten, but\nthis can be changed using the optional ``append`` argument similarly\nas with `Set Test Message` keyword.\n\nThis keyword sets the documentation of the current suite by default.\nIf the optional ``top`` argument is given a true value (see `Boolean\narguments`), the documentation of the top level suite is altered\ninstead.\n\nThe documentation of the current suite is available as a built-in\nvariable ``${SUITE DOCUMENTATION}``.",
        shortdoc: "Sets documentation for the current test suite.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3432
      },
      {
        name: "Set Suite Metadata",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "value",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "value"
          },
          {
            name: "append",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "append=False"
          },
          {
            name: "top",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "top=False"
          }
        ],
        doc: "Sets metadata for the current test suite.\n\nBy default possible existing metadata values are overwritten, but\nthis can be changed using the optional ``append`` argument similarly\nas with `Set Test Message` keyword.\n\nThis keyword sets the metadata of the current suite by default.\nIf the optional ``top`` argument is given a true value (see `Boolean\narguments`), the metadata of the top level suite is altered instead.\n\nThe metadata of the current suite is available as a built-in variable\n``${SUITE METADATA}`` in a Python dictionary. Notice that modifying this\nvariable directly has no effect on the actual metadata the suite has.",
        shortdoc: "Sets metadata for the current test suite.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3452
      },
      {
        name: "Set Suite Variable",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "values",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*values"
          }
        ],
        doc: "Makes a variable available everywhere within the scope of the current suite.\n\nVariables set with this keyword are available everywhere within the\nscope of the currently executed test suite. Setting variables with this\nkeyword thus has the same effect as creating them using the Variable\ntable in the test data file or importing them from variable files.\n\nPossible child test suites do not see variables set with this keyword\nby default, but that can be controlled by using ``children=<option>``\nas the last argument. If the specified ``<option>`` given a true value\n(see `Boolean arguments`), the variable is set also to the child\nsuites. Parent and sibling suites will never see variables set with\nthis keyword.\n\nThe name of the variable can be given either as a normal variable name\n(e.g. ``${NAME}``) or in escaped format as ``\\${NAME}`` or ``$NAME``.\nVariable value can be given using the same syntax as when variables\nare created in the Variable table.\n\nIf a variable already exists within the new scope, its value will be\noverwritten. Otherwise a new variable is created. If a variable already\nexists within the current scope, the value can be left empty and the\nvariable within the new scope gets the value within the current scope.\n\nExamples:\n| Set Suite Variable | ${SCALAR} | Hello, world! |\n| Set Suite Variable | ${SCALAR} | Hello, world! | children=true |\n| Set Suite Variable | @{LIST}   | First item    | Second item   |\n| Set Suite Variable | &{DICT}   | key=value     | foo=bar       |\n| ${ID} =            | Get ID    |\n| Set Suite Variable | ${ID}     |\n\nTo override an existing value with an empty value, use built-in\nvariables ``${EMPTY}``, ``@{EMPTY}`` or ``&{EMPTY}``:\n\n| Set Suite Variable | ${SCALAR} | ${EMPTY} |\n| Set Suite Variable | @{LIST}   | @{EMPTY} |\n| Set Suite Variable | &{DICT}   | &{EMPTY} |\n\n*NOTE:* If the variable has value which itself is a variable (escaped\nor not), you must always use the escaped format to set the variable:\n\nExample:\n| ${NAME} =          | Set Variable | \\${var} |\n| Set Suite Variable | ${NAME}      | value | # Sets variable ${var}  |\n| Set Suite Variable | \\${NAME}    | value | # Sets variable ${NAME} |\n\nThis limitation applies also to `Set Test Variable`, `Set Global\nVariable`, `Variable Should Exist`, `Variable Should Not Exist` and\n`Get Variable Value` keywords.",
        shortdoc: "Makes a variable available everywhere within the scope of the current suite.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1716
      },
      {
        name: "Set Tags",
        args: [
          {
            name: "tags",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*tags"
          }
        ],
        doc: "Adds given ``tags`` for the current test or all tests in a suite.\n\nWhen this keyword is used inside a test case, that test gets\nthe specified tags and other tests are not affected.\n\nIf this keyword is used in a suite setup, all test cases in\nthat suite, recursively, gets the given tags. It is a failure\nto use this keyword in a suite teardown.\n\nThe current tags are available as a built-in variable ``@{TEST TAGS}``.\n\nSee `Remove Tags` if you want to remove certain tags and `Fail` if\nyou want to fail the test case after setting and/or removing tags.",
        shortdoc: "Adds given ``tags`` for the current test or all tests in a suite.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3475
      },
      {
        name: "Set Task Variable",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "values",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*values"
          }
        ],
        doc: "Makes a variable available everywhere within the scope of the current task.\n\nThis is an alias for `Set Test Variable` that is more applicable when\ncreating tasks, not tests.",
        shortdoc: "Makes a variable available everywhere within the scope of the current task.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1707
      },
      {
        name: "Set Test Documentation",
        args: [
          {
            name: "doc",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "doc"
          },
          {
            name: "append",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "append=False"
          }
        ],
        doc: "Sets documentation for the current test case.\n\nBy default the possible existing documentation is overwritten, but\nthis can be changed using the optional ``append`` argument similarly\nas with `Set Test Message` keyword.\n\nThe current test documentation is available as a built-in variable\n``${TEST DOCUMENTATION}``. This keyword can not be used in suite\nsetup or suite teardown.",
        shortdoc: "Sets documentation for the current test case.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3413
      },
      {
        name: "Set Test Message",
        args: [
          {
            name: "message",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "message"
          },
          {
            name: "append",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "append=False"
          }
        ],
        doc: "Sets message for the current test case.\n\nIf the optional ``append`` argument is given a true value (see `Boolean\narguments`), the given ``message`` is added after the possible earlier\nmessage by joining the messages with a space.\n\nIn test teardown this keyword can alter the possible failure message,\nbut otherwise failures override messages set by this keyword. Notice\nthat in teardown the message is available as a built-in variable\n``${TEST MESSAGE}``.\n\nIt is possible to use HTML format in the message by starting the message\nwith ``*HTML*``.\n\nExamples:\n| Set Test Message | My message           |                          |\n| Set Test Message | is continued.        | append=yes               |\n| Should Be Equal  | ${TEST MESSAGE}      | My message is continued. |\n| Set Test Message | `*`HTML`*` <b>Hello!</b> |                      |\n\nThis keyword can not be used in suite setup or suite teardown.",
        shortdoc: "Sets message for the current test case.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 3360
      },
      {
        name: "Set Test Variable",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "values",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*values"
          }
        ],
        doc: "Makes a variable available everywhere within the scope of the current test.\n\nVariables set with this keyword are available everywhere within the\nscope of the currently executed test case. For example, if you set a\nvariable in a user keyword, it is available both in the test case level\nand also in all other user keywords used in the current test. Other\ntest cases will not see variables set with this keyword.\nIt is an error to call `Set Test Variable` outside the\nscope of a test (e.g. in a Suite Setup or Teardown).\n\nSee `Set Suite Variable` for more information and examples.",
        shortdoc: "Makes a variable available everywhere within the scope of the current test.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1688
      },
      {
        name: "Set Variable",
        args: [
          {
            name: "values",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*values"
          }
        ],
        doc: "Returns the given values which can then be assigned to a variables.\n\nThis keyword is mainly used for setting scalar variables.\nAdditionally it can be used for converting a scalar variable\ncontaining a list to a list variable or to multiple scalar variables.\nIt is recommended to use `Create List` when creating new lists.\n\nExamples:\n| ${hi} =   | Set Variable | Hello, world! |\n| ${hi2} =  | Set Variable | I said: ${hi} |\n| ${var1}   | ${var2} =    | Set Variable | Hello | world |\n| @{list} = | Set Variable | ${list with some items} |\n| ${item1}  | ${item2} =   | Set Variable  | ${list with 2 items} |\n\nVariables created with this keyword are available only in the\nscope where they are created. See `Set Global Variable`,\n`Set Test Variable` and `Set Suite Variable` for information on how to\nset variables so that they are available also in a larger scope.",
        shortdoc: "Returns the given values which can then be assigned to a variables.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1626
      },
      {
        name: "Set Variable If",
        args: [
          {
            name: "condition",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "condition"
          },
          {
            name: "values",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*values"
          }
        ],
        doc: "Sets variable based on the given condition.\n\nThe basic usage is giving a condition and two values. The\ngiven condition is first evaluated the same way as with the\n`Should Be True` keyword. If the condition is true, then the\nfirst value is returned, and otherwise the second value is\nreturned. The second value can also be omitted, in which case\nit has a default value None. This usage is illustrated in the\nexamples below, where ``${rc}`` is assumed to be zero.\n\n| ${var1} = | Set Variable If | ${rc} == 0 | zero     | nonzero |\n| ${var2} = | Set Variable If | ${rc} > 0  | value1   | value2  |\n| ${var3} = | Set Variable If | ${rc} > 0  | whatever |         |\n=>\n| ${var1} = 'zero'\n| ${var2} = 'value2'\n| ${var3} = None\n\nIt is also possible to have 'else if' support by replacing the\nsecond value with another condition, and having two new values\nafter it. If the first condition is not true, the second is\nevaluated and one of the values after it is returned based on\nits truth value. This can be continued by adding more\nconditions without a limit.\n\n| ${var} = | Set Variable If | ${rc} == 0        | zero           |\n| ...      | ${rc} > 0       | greater than zero | less then zero |\n|          |\n| ${var} = | Set Variable If |\n| ...      | ${rc} == 0      | zero              |\n| ...      | ${rc} == 1      | one               |\n| ...      | ${rc} == 2      | two               |\n| ...      | ${rc} > 2       | greater than two  |\n| ...      | ${rc} < 0       | less than zero    |\n\nUse `Get Variable Value` if you need to set variables\ndynamically based on whether a variable exist or not.",
        shortdoc: "Sets variable based on the given condition.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2359
      },
      {
        name: "Should Be Empty",
        args: [
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          }
        ],
        doc: "Verifies that the given item is empty.\n\nThe length of the item is got using the `Get Length` keyword. The\ndefault error message can be overridden with the ``msg`` argument.",
        shortdoc: "Verifies that the given item is empty.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1460
      },
      {
        name: "Should Be Equal",
        args: [
          {
            name: "first",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "first"
          },
          {
            name: "second",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "second"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "ignore_case",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "ignore_case=False"
          },
          {
            name: "formatter",
            types: [],
            defaultValue: "str",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "formatter=str"
          },
          {
            name: "strip_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "strip_spaces=False"
          },
          {
            name: "collapse_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "collapse_spaces=False"
          }
        ],
        doc: "Fails if the given objects are unequal.\n\nOptional ``msg``, ``values`` and ``formatter`` arguments specify how\nto construct the error message if this keyword fails:\n\n- If ``msg`` is not given, the error message is ``<first> != <second>``.\n- If ``msg`` is given and ``values`` gets a true value (default),\n  the error message is ``<msg>: <first> != <second>``.\n- If ``msg`` is given and ``values`` gets a false value (see\n  `Boolean arguments`), the error message is simply ``<msg>``.\n- ``formatter`` controls how to format the values. Possible values are\n  ``str`` (default), ``repr`` and ``ascii``, and they work similarly\n  as Python built-in functions with same names. See `String\n  representations` for more details.\n\nIf ``ignore_case`` is given a true value (see `Boolean arguments`) and\nboth arguments are strings, comparison is done case-insensitively.\nIf both arguments are multiline strings, this keyword uses\n`multiline string comparison`.\n\nIf ``strip_spaces`` is given a true value (see `Boolean arguments`)\nand both arguments are strings, the comparison is done without leading\nand trailing spaces. If ``strip_spaces`` is given a string value\n``LEADING`` or ``TRAILING`` (case-insensitive), the comparison is done\nwithout leading or trailing spaces, respectively.\n\nIf ``collapse_spaces`` is given a true value (see `Boolean arguments`) and both\narguments are strings, the comparison is done with all white spaces replaced by\na single space character.\n\nExamples:\n| Should Be Equal | ${x} | expected |\n| Should Be Equal | ${x} | expected | Custom error message |\n| Should Be Equal | ${x} | expected | Custom message | values=False |\n| Should Be Equal | ${x} | expected | ignore_case=True | formatter=repr |\n\n``strip_spaces`` is new in Robot Framework 4.0 and\n``collapse_spaces`` is new in Robot Framework 4.1.",
        shortdoc: "Fails if the given objects are unequal.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 599
      },
      {
        name: "Should Be Equal As Integers",
        args: [
          {
            name: "first",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "first"
          },
          {
            name: "second",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "second"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "base",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "base=None"
          }
        ],
        doc: "Fails if objects are unequal after converting them to integers.\n\nSee `Convert To Integer` for information how to convert integers from\nother bases than 10 using ``base`` argument or ``0b/0o/0x`` prefixes.\n\nSee `Should Be Equal` for an explanation on how to override the default\nerror message with ``msg`` and ``values``.\n\nExamples:\n| Should Be Equal As Integers | 42   | ${42} | Error message |\n| Should Be Equal As Integers | ABCD | abcd  | base=16 |\n| Should Be Equal As Integers | 0b1011 | 11  |",
        shortdoc: "Fails if objects are unequal after converting them to integers.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 756
      },
      {
        name: "Should Be Equal As Numbers",
        args: [
          {
            name: "first",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "first"
          },
          {
            name: "second",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "second"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "precision",
            types: [],
            defaultValue: "6",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "precision=6"
          }
        ],
        doc: "Fails if objects are unequal after converting them to real numbers.\n\nThe conversion is done with `Convert To Number` keyword using the\ngiven ``precision``.\n\nExamples:\n| Should Be Equal As Numbers | ${x} | 1.1 | | # Passes if ${x} is 1.1 |\n| Should Be Equal As Numbers | 1.123 | 1.1 | precision=1  | # Passes |\n| Should Be Equal As Numbers | 1.123 | 1.4 | precision=0  | # Passes |\n| Should Be Equal As Numbers | 112.3 | 75  | precision=-2 | # Passes |\n\nAs discussed in the documentation of `Convert To Number`, machines\ngenerally cannot store floating point numbers accurately. Because of\nthis limitation, comparing floats for equality is problematic and\na correct approach to use depends on the context. This keyword uses\na very naive approach of rounding the numbers before comparing them,\nwhich is both prone to rounding errors and does not work very well if\nnumbers are really big or small. For more information about comparing\nfloats, and ideas on how to implement your own context specific\ncomparison algorithm, see\nhttp://randomascii.wordpress.com/2012/02/25/comparing-floating-point-numbers-2012-edition/.\n\nIf you want to avoid possible problems with floating point numbers,\nyou can implement custom keywords using Python's\n[http://docs.python.org/library/decimal.html|decimal] or\n[http://docs.python.org/library/fractions.html|fractions] modules.\n\nSee `Should Not Be Equal As Numbers` for a negative version of this\nkeyword and `Should Be Equal` for an explanation on how to override\nthe default error message with ``msg`` and ``values``.",
        shortdoc: "Fails if objects are unequal after converting them to real numbers.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 793
      },
      {
        name: "Should Be Equal As Strings",
        args: [
          {
            name: "first",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "first"
          },
          {
            name: "second",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "second"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "ignore_case",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "ignore_case=False"
          },
          {
            name: "strip_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "strip_spaces=False"
          },
          {
            name: "formatter",
            types: [],
            defaultValue: "str",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "formatter=str"
          },
          {
            name: "collapse_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "collapse_spaces=False"
          }
        ],
        doc: "Fails if objects are unequal after converting them to strings.\n\nSee `Should Be Equal` for an explanation on how to override the default\nerror message with ``msg``, ``values`` and ``formatter``.\n\nIf ``ignore_case`` is given a true value (see `Boolean arguments`),\ncomparison is done case-insensitively. If both arguments are\nmultiline strings, this keyword uses `multiline string comparison`.\n\nIf ``strip_spaces`` is given a true value (see `Boolean arguments`)\nand both arguments are strings, the comparison is done without leading\nand trailing spaces. If ``strip_spaces`` is given a string value\n``LEADING`` or ``TRAILING`` (case-insensitive), the comparison is done\nwithout leading or trailing spaces, respectively.\n\nIf ``collapse_spaces`` is given a true value (see `Boolean arguments`) and both\narguments are strings, the comparison is done with all white spaces replaced by\na single space character.\n\nStrings are always [http://www.macchiato.com/unicode/nfc-faq| NFC normalized].\n\n``strip_spaces`` is new in Robot Framework 4.0\nand ``collapse_spaces`` is new in Robot Framework 4.1.",
        shortdoc: "Fails if objects are unequal after converting them to strings.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 872
      },
      {
        name: "Should Be True",
        args: [
          {
            name: "condition",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "condition"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          }
        ],
        doc: "Fails if the given condition is not true.\n\nIf ``condition`` is a string (e.g. ``${rc} < 10``), it is evaluated as\na Python expression as explained in `Evaluating expressions` and the\nkeyword status is decided based on the result. If a non-string item is\ngiven, the status is got directly from its\n[http://docs.python.org/library/stdtypes.html#truth|truth value].\n\nThe default error message (``<condition> should be true``) is not very\ninformative, but it can be overridden with the ``msg`` argument.\n\nExamples:\n| Should Be True | ${rc} < 10            |\n| Should Be True | '${status}' == 'PASS' | # Strings must be quoted |\n| Should Be True | ${number}   | # Passes if ${number} is not zero |\n| Should Be True | ${list}     | # Passes if ${list} is not empty  |\n\nVariables used like ``${variable}``, as in the examples above, are\nreplaced in the expression before evaluation. Variables are also\navailable in the evaluation namespace, and can be accessed using\nspecial ``$variable`` syntax as explained in the `Evaluating\nexpressions` section.\n\nExamples:\n| Should Be True | $rc < 10          |\n| Should Be True | $status == 'PASS' | # Expected string must be quoted |\n\n`Should Be True` automatically imports Python's\n[http://docs.python.org/library/os.html|os] and\n[http://docs.python.org/library/sys.html|sys] modules that contain\nseveral useful attributes:\n\n| Should Be True | os.linesep == '\\n'             | # Unixy   |\n| Should Be True | os.linesep == '\\r\\n'          | # Windows |\n| Should Be True | sys.platform == 'darwin'        | # OS X    |\n| Should Be True | sys.platform.startswith('java') | # Jython  |",
        shortdoc: "Fails if the given condition is not true.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 558
      },
      {
        name: "Should Contain",
        args: [
          {
            name: "container",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "container"
          },
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "ignore_case",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "ignore_case=False"
          },
          {
            name: "strip_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "strip_spaces=False"
          },
          {
            name: "collapse_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "collapse_spaces=False"
          }
        ],
        doc: "Fails if ``container`` does not contain ``item`` one or more times.\n\nWorks with strings, lists, and anything that supports Python's ``in``\noperator.\n\nSee `Should Be Equal` for an explanation on how to override the default\nerror message with arguments ``msg`` and ``values``.\n\nIf ``ignore_case`` is given a true value (see `Boolean arguments`) and\ncompared items are strings, it indicates that comparison should be\ncase-insensitive. If the ``container`` is a list-like object, string\nitems in it are compared case-insensitively.\n\nIf ``strip_spaces`` is given a true value (see `Boolean arguments`)\nand both arguments are strings, the comparison is done without leading\nand trailing spaces. If ``strip_spaces`` is given a string value\n``LEADING`` or ``TRAILING`` (case-insensitive), the comparison is done\nwithout leading or trailing spaces, respectively.\n\nIf ``collapse_spaces`` is given a true value (see `Boolean arguments`) and both\narguments are strings, the comparison is done with all white spaces replaced by\na single space character.\n\nExamples:\n| Should Contain | ${output}    | PASS  |\n| Should Contain | ${some list} | value | msg=Failure! | values=False |\n| Should Contain | ${some list} | value | ignore_case=True |\n\n``strip_spaces`` is new in Robot Framework 4.0 and ``collapse_spaces`` is new\nin Robot Framework 4.1.",
        shortdoc: "Fails if ``container`` does not contain ``item`` one or more times.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1056
      },
      {
        name: "Should Contain Any",
        args: [
          {
            name: "container",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "container"
          },
          {
            name: "items",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*items"
          },
          {
            name: "configuration",
            types: [],
            defaultValue: null,
            kind: "VAR_NAMED",
            required: false,
            repr: "**configuration"
          }
        ],
        doc: "Fails if ``container`` does not contain any of the ``*items``.\n\nWorks with strings, lists, and anything that supports Python's ``in``\noperator.\n\nSupports additional configuration parameters ``msg``, ``values``,\n``ignore_case`` and ``strip_spaces``, and ``collapse_spaces``\nwhich have exactly the same semantics as arguments with same\nnames have with `Should Contain`. These arguments must always\nbe given using ``name=value`` syntax after all ``items``.\n\nNote that possible equal signs in ``items`` must be escaped with\na backslash (e.g. ``foo\\=bar``) to avoid them to be passed in\nas ``**configuration``.\n\nExamples:\n| Should Contain Any | ${string} | substring 1 | substring 2 |\n| Should Contain Any | ${list}   | item 1 | item 2 | item 3 |\n| Should Contain Any | ${list}   | item 1 | item 2 | item 3 | ignore_case=True |\n| Should Contain Any | ${list}   | @{items} | msg=Custom message | values=False |",
        shortdoc: "Fails if ``container`` does not contain any of the ``*items``.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1112
      },
      {
        name: "Should Contain X Times",
        args: [
          {
            name: "container",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "container"
          },
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          },
          {
            name: "count",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "count"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "ignore_case",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "ignore_case=False"
          },
          {
            name: "strip_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "strip_spaces=False"
          },
          {
            name: "collapse_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "collapse_spaces=False"
          }
        ],
        doc: "Fails if ``container`` does not contain ``item`` ``count`` times.\n\nWorks with strings, lists and all objects that `Get Count` works\nwith. The default error message can be overridden with ``msg`` and\nthe actual count is always logged.\n\nIf ``ignore_case`` is given a true value (see `Boolean arguments`) and\ncompared items are strings, it indicates that comparison should be\ncase-insensitive. If the ``container`` is a list-like object, string\nitems in it are compared case-insensitively.\n\nIf ``strip_spaces`` is given a true value (see `Boolean arguments`)\nand both arguments are strings, the comparison is done without leading\nand trailing spaces. If ``strip_spaces`` is given a string value\n``LEADING`` or ``TRAILING`` (case-insensitive), the comparison is done\nwithout leading or trailing spaces, respectively.\n\nIf ``collapse_spaces`` is given a true value (see `Boolean arguments`) and both\narguments are strings, the comparison is done with all white spaces replaced by\na single space character.\n\nExamples:\n| Should Contain X Times | ${output}    | hello | 2 |\n| Should Contain X Times | ${some list} | value | 3 | ignore_case=True |\n\n``strip_spaces`` is new in Robot Framework 4.0 and ``collapse_spaces`` is new\nin Robot Framework 4.1.",
        shortdoc: "Fails if ``container`` does not contain ``item`` ``count`` times.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1229
      },
      {
        name: "Should End With",
        args: [
          {
            name: "str1",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "str1"
          },
          {
            name: "str2",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "str2"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "ignore_case",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "ignore_case=False"
          },
          {
            name: "strip_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "strip_spaces=False"
          },
          {
            name: "collapse_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "collapse_spaces=False"
          }
        ],
        doc: "Fails if the string ``str1`` does not end with the string ``str2``.\n\nSee `Should Be Equal` for an explanation on how to override the default\nerror message with ``msg`` and ``values``, as well as for semantics\nof the ``ignore_case``, ``strip_spaces``, and ``collapse_spaces`` options.",
        shortdoc: "Fails if the string ``str1`` does not end with the string ``str2``.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 978
      },
      {
        name: "Should Match",
        args: [
          {
            name: "string",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "string"
          },
          {
            name: "pattern",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "pattern"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "ignore_case",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "ignore_case=False"
          }
        ],
        doc: "Fails if the given ``string`` does not match the given ``pattern``.\n\nPattern matching is similar as matching files in a shell with\n``*``, ``?`` and ``[chars]`` acting as wildcards. See the\n`Glob patterns` section for more information.\n\nIf ``ignore_case`` is given a true value (see `Boolean arguments`) and\ncompared items are strings, it indicates that comparison should be\ncase-insensitive.\n\nSee `Should Be Equal` for an explanation on how to override the default\nerror message with ``msg`` and ``values``.",
        shortdoc: "Fails if the given ``string`` does not match the given ``pattern``.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1325
      },
      {
        name: "Should Match Regexp",
        args: [
          {
            name: "string",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "string"
          },
          {
            name: "pattern",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "pattern"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          }
        ],
        doc: "Fails if ``string`` does not match ``pattern`` as a regular expression.\n\nSee the `Regular expressions` section for more information about\nregular expressions and how to use then in Robot Framework test data.\n\nNotice that the given pattern does not need to match the whole string.\nFor example, the pattern ``ello`` matches the string ``Hello world!``.\nIf a full match is needed, the ``^`` and ``$`` characters can be used\nto denote the beginning and end of the string, respectively.\nFor example, ``^ello$`` only matches the exact string ``ello``.\n\nPossible flags altering how the expression is parsed (e.g.\n``re.IGNORECASE``, ``re.MULTILINE``) must be embedded to the\npattern like ``(?im)pattern``. The most useful flags are ``i``\n(case-insensitive), ``m`` (multiline mode), ``s`` (dotall mode)\nand ``x`` (verbose).\n\nIf this keyword passes, it returns the portion of the string that\nmatched the pattern. Additionally, the possible captured groups are\nreturned.\n\nSee the `Should Be Equal` keyword for an explanation on how to override\nthe default error message with the ``msg`` and ``values`` arguments.\n\nExamples:\n| Should Match Regexp | ${output} | \\\\d{6}   | # Output contains six numbers  |\n| Should Match Regexp | ${output} | ^\\\\d{6}$ | # Six numbers and nothing more |\n| ${ret} = | Should Match Regexp | Foo: 42 | (?i)foo: \\\\d+ |\n| ${match} | ${group1} | ${group2} = |\n| ...      | Should Match Regexp | Bar: 43 | (Foo|Bar): (\\\\d+) |\n=>\n| ${ret} = 'Foo: 42'\n| ${match} = 'Bar: 43'\n| ${group1} = 'Bar'\n| ${group2} = '43'",
        shortdoc: "Fails if ``string`` does not match ``pattern`` as a regular expression.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1344
      },
      {
        name: "Should Not Be Empty",
        args: [
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          }
        ],
        doc: "Verifies that the given item is not empty.\n\nThe length of the item is got using the `Get Length` keyword. The\ndefault error message can be overridden with the ``msg`` argument.",
        shortdoc: "Verifies that the given item is not empty.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1469
      },
      {
        name: "Should Not Be Equal",
        args: [
          {
            name: "first",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "first"
          },
          {
            name: "second",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "second"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "ignore_case",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "ignore_case=False"
          },
          {
            name: "strip_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "strip_spaces=False"
          },
          {
            name: "collapse_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "collapse_spaces=False"
          }
        ],
        doc: "Fails if the given objects are equal.\n\nSee `Should Be Equal` for an explanation on how to override the default\nerror message with ``msg`` and ``values``.\n\nIf ``ignore_case`` is given a true value (see `Boolean arguments`) and\nboth arguments are strings, comparison is done case-insensitively.\n\nIf ``strip_spaces`` is given a true value (see `Boolean arguments`)\nand both arguments are strings, the comparison is done without leading\nand trailing spaces. If ``strip_spaces`` is given a string value\n``LEADING`` or ``TRAILING`` (case-insensitive), the comparison is done\nwithout leading or trailing spaces, respectively.\n\nIf ``collapse_spaces`` is given a true value (see `Boolean arguments`) and both\narguments are strings, the comparison is done with all white spaces replaced by\na single space character.\n\n``strip_spaces`` is new in Robot Framework 4.0 and ``collapse_spaces`` is new\nin Robot Framework 4.1.",
        shortdoc: "Fails if the given objects are equal.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 699
      },
      {
        name: "Should Not Be Equal As Integers",
        args: [
          {
            name: "first",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "first"
          },
          {
            name: "second",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "second"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "base",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "base=None"
          }
        ],
        doc: "Fails if objects are equal after converting them to integers.\n\nSee `Convert To Integer` for information how to convert integers from\nother bases than 10 using ``base`` argument or ``0b/0o/0x`` prefixes.\n\nSee `Should Be Equal` for an explanation on how to override the default\nerror message with ``msg`` and ``values``.\n\nSee `Should Be Equal As Integers` for some usage examples.",
        shortdoc: "Fails if objects are equal after converting them to integers.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 739
      },
      {
        name: "Should Not Be Equal As Numbers",
        args: [
          {
            name: "first",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "first"
          },
          {
            name: "second",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "second"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "precision",
            types: [],
            defaultValue: "6",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "precision=6"
          }
        ],
        doc: "Fails if objects are equal after converting them to real numbers.\n\nThe conversion is done with `Convert To Number` keyword using the\ngiven ``precision``.\n\nSee `Should Be Equal As Numbers` for examples on how to use\n``precision`` and why it does not always work as expected. See also\n`Should Be Equal` for an explanation on how to override the default\nerror message with ``msg`` and ``values``.",
        shortdoc: "Fails if objects are equal after converting them to real numbers.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 776
      },
      {
        name: "Should Not Be Equal As Strings",
        args: [
          {
            name: "first",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "first"
          },
          {
            name: "second",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "second"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "ignore_case",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "ignore_case=False"
          },
          {
            name: "strip_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "strip_spaces=False"
          },
          {
            name: "collapse_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "collapse_spaces=False"
          }
        ],
        doc: "Fails if objects are equal after converting them to strings.\n\nSee `Should Be Equal` for an explanation on how to override the default\nerror message with ``msg`` and ``values``.\n\nIf ``ignore_case`` is given a true value (see `Boolean arguments`),\ncomparison is done case-insensitively.\n\nIf ``strip_spaces`` is given a true value (see `Boolean arguments`)\nand both arguments are strings, the comparison is done without leading\nand trailing spaces. If ``strip_spaces`` is given a string value\n``LEADING`` or ``TRAILING`` (case-insensitive), the comparison is done\nwithout leading or trailing spaces, respectively.\n\nIf ``collapse_spaces`` is given a true value (see `Boolean arguments`) and both\narguments are strings, the comparison is done with all white spaces replaced by\na single space character.\n\nStrings are always [http://www.macchiato.com/unicode/nfc-faq|\nNFC normalized].\n\n``strip_spaces`` is new in Robot Framework 4.0 and ``collapse_spaces`` is new\nin Robot Framework 4.1.",
        shortdoc: "Fails if objects are equal after converting them to strings.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 831
      },
      {
        name: "Should Not Be True",
        args: [
          {
            name: "condition",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "condition"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          }
        ],
        doc: "Fails if the given condition is true.\n\nSee `Should Be True` for details about how ``condition`` is evaluated\nand how ``msg`` can be used to override the default error message.",
        shortdoc: "Fails if the given condition is true.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 549
      },
      {
        name: "Should Not Contain",
        args: [
          {
            name: "container",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "container"
          },
          {
            name: "item",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "item"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "ignore_case",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "ignore_case=False"
          },
          {
            name: "strip_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "strip_spaces=False"
          },
          {
            name: "collapse_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "collapse_spaces=False"
          }
        ],
        doc: "Fails if ``container`` contains ``item`` one or more times.\n\nWorks with strings, lists, and anything that supports Python's ``in``\noperator.\n\nSee `Should Be Equal` for an explanation on how to override the default\nerror message with arguments ``msg`` and ``values``. ``ignore_case``\nhas exactly the same semantics as with `Should Contain`.\n\nIf ``strip_spaces`` is given a true value (see `Boolean arguments`)\nand both arguments are strings, the comparison is done without leading\nand trailing spaces. If ``strip_spaces`` is given a string value\n``LEADING`` or ``TRAILING`` (case-insensitive), the comparison is done\nwithout leading or trailing spaces, respectively.\n\nIf ``collapse_spaces`` is given a true value (see `Boolean arguments`) and both\narguments are strings, the comparison is done with all white spaces replaced by\na single space character.\n\nExamples:\n| Should Not Contain | ${some list} | value  |\n| Should Not Contain | ${output}    | FAILED | ignore_case=True |\n\n``strip_spaces`` is new in Robot Framework 4.0 and ``collapse_spaces`` is new\nin Robot Framework 4.1.",
        shortdoc: "Fails if ``container`` contains ``item`` one or more times.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 999
      },
      {
        name: "Should Not Contain Any",
        args: [
          {
            name: "container",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "container"
          },
          {
            name: "items",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*items"
          },
          {
            name: "configuration",
            types: [],
            defaultValue: null,
            kind: "VAR_NAMED",
            required: false,
            repr: "**configuration"
          }
        ],
        doc: "Fails if ``container`` contains one or more of the ``*items``.\n\nWorks with strings, lists, and anything that supports Python's ``in``\noperator.\n\nSupports additional configuration parameters ``msg``, ``values``,\n``ignore_case`` and ``strip_spaces``, and ``collapse_spaces`` which have exactly\nthe same semantics as arguments with same names have with `Should Contain`.\nThese arguments must always be given using ``name=value`` syntax after all ``items``.\n\nNote that possible equal signs in ``items`` must be escaped with\na backslash (e.g. ``foo\\=bar``) to avoid them to be passed in\nas ``**configuration``.\n\nExamples:\n| Should Not Contain Any | ${string} | substring 1 | substring 2 |\n| Should Not Contain Any | ${list}   | item 1 | item 2 | item 3 |\n| Should Not Contain Any | ${list}   | item 1 | item 2 | item 3 | ignore_case=True |\n| Should Not Contain Any | ${list}   | @{items} | msg=Custom message | values=False |",
        shortdoc: "Fails if ``container`` contains one or more of the ``*items``.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1171
      },
      {
        name: "Should Not End With",
        args: [
          {
            name: "str1",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "str1"
          },
          {
            name: "str2",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "str2"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "ignore_case",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "ignore_case=False"
          },
          {
            name: "strip_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "strip_spaces=False"
          },
          {
            name: "collapse_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "collapse_spaces=False"
          }
        ],
        doc: "Fails if the string ``str1`` ends with the string ``str2``.\n\nSee `Should Be Equal` for an explanation on how to override the default\nerror message with ``msg`` and ``values``, as well as for semantics\nof the ``ignore_case``, ``strip_spaces``, and ``collapse_spaces`` options.",
        shortdoc: "Fails if the string ``str1`` ends with the string ``str2``.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 956
      },
      {
        name: "Should Not Match",
        args: [
          {
            name: "string",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "string"
          },
          {
            name: "pattern",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "pattern"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "ignore_case",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "ignore_case=False"
          }
        ],
        doc: "Fails if the given ``string`` matches the given ``pattern``.\n\nPattern matching is similar as matching files in a shell with\n``*``, ``?`` and ``[chars]`` acting as wildcards. See the\n`Glob patterns` section for more information.\n\nIf ``ignore_case`` is given a true value (see `Boolean arguments`),\nthe comparison is case-insensitive.\n\nSee `Should Be Equal` for an explanation on how to override the default\nerror message with ``msg`` and ``values`.",
        shortdoc: "Fails if the given ``string`` matches the given ``pattern``.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1307
      },
      {
        name: "Should Not Match Regexp",
        args: [
          {
            name: "string",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "string"
          },
          {
            name: "pattern",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "pattern"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          }
        ],
        doc: "Fails if ``string`` matches ``pattern`` as a regular expression.\n\nSee `Should Match Regexp` for more information about arguments.",
        shortdoc: "Fails if ``string`` matches ``pattern`` as a regular expression.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1391
      },
      {
        name: "Should Not Start With",
        args: [
          {
            name: "str1",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "str1"
          },
          {
            name: "str2",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "str2"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "ignore_case",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "ignore_case=False"
          },
          {
            name: "strip_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "strip_spaces=False"
          },
          {
            name: "collapse_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "collapse_spaces=False"
          }
        ],
        doc: "Fails if the string ``str1`` starts with the string ``str2``.\n\nSee `Should Be Equal` for an explanation on how to override the default\nerror message with ``msg`` and ``values``, as well as for semantics\nof the ``ignore_case``, ``strip_spaces``, and ``collapse_spaces`` options.",
        shortdoc: "Fails if the string ``str1`` starts with the string ``str2``.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 913
      },
      {
        name: "Should Start With",
        args: [
          {
            name: "str1",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "str1"
          },
          {
            name: "str2",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "str2"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          },
          {
            name: "values",
            types: [],
            defaultValue: "True",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "values=True"
          },
          {
            name: "ignore_case",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "ignore_case=False"
          },
          {
            name: "strip_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "strip_spaces=False"
          },
          {
            name: "collapse_spaces",
            types: [],
            defaultValue: "False",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "collapse_spaces=False"
          }
        ],
        doc: "Fails if the string ``str1`` does not start with the string ``str2``.\n\nSee `Should Be Equal` for an explanation on how to override the default\nerror message with ``msg`` and ``values``, as well as for semantics\nof the ``ignore_case``, ``strip_spaces``, and ``collapse_spaces`` options.",
        shortdoc: "Fails if the string ``str1`` does not start with the string ``str2``.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 935
      },
      {
        name: "Skip",
        args: [
          {
            name: "msg",
            types: [],
            defaultValue: "Skipped with Skip keyword.",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=Skipped with Skip keyword."
          }
        ],
        doc: "Skips the rest of the current test.\n\nSkips the remaining keywords in the current test and sets the given\nmessage to the test. If the test has teardown, it will be executed.",
        shortdoc: "Skips the rest of the current test.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2512
      },
      {
        name: "Skip If",
        args: [
          {
            name: "condition",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "condition"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          }
        ],
        doc: "Skips the rest of the current test if the ``condition`` is True.\n\nSkips the remaining keywords in the current test and sets the given\nmessage to the test. If ``msg`` is not given, the ``condition`` will\nbe used as the message. If the test has teardown, it will be executed.\n\nIf the ``condition`` evaluates to False, does nothing.",
        shortdoc: "Skips the rest of the current test if the ``condition`` is True.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2520
      },
      {
        name: "Sleep",
        args: [
          {
            name: "time_",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "time_"
          },
          {
            name: "reason",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "reason=None"
          }
        ],
        doc: "Pauses the test executed for the given time.\n\n``time`` may be either a number or a time string. Time strings are in\na format such as ``1 day 2 hours 3 minutes 4 seconds 5milliseconds`` or\n``1d 2h 3m 4s 5ms``, and they are fully explained in an appendix of\nRobot Framework User Guide. Optional `reason` can be used to explain why\nsleeping is necessary. Both the time slept and the reason are logged.\n\nExamples:\n| Sleep | 42                   |\n| Sleep | 1.5                  |\n| Sleep | 2 minutes 10 seconds |\n| Sleep | 10s                  | Wait for a reply |",
        shortdoc: "Pauses the test executed for the given time.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2801
      },
      {
        name: "Variable Should Exist",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          }
        ],
        doc: "Fails unless the given variable exists within the current scope.\n\nThe name of the variable can be given either as a normal variable name\n(e.g. ``${NAME}``) or in escaped format (e.g. ``\\${NAME}``). Notice\nthat the former has some limitations explained in `Set Suite Variable`.\n\nThe default error message can be overridden with the ``msg`` argument.\n\nSee also `Variable Should Not Exist` and `Keyword Should Exist`.",
        shortdoc: "Fails unless the given variable exists within the current scope.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1568
      },
      {
        name: "Variable Should Not Exist",
        args: [
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "msg",
            types: [],
            defaultValue: "None",
            kind: "POSITIONAL_OR_NAMED",
            required: false,
            repr: "msg=None"
          }
        ],
        doc: "Fails if the given variable exists within the current scope.\n\nThe name of the variable can be given either as a normal variable name\n(e.g. ``${NAME}``) or in escaped format (e.g. ``\\${NAME}``). Notice\nthat the former has some limitations explained in `Set Suite Variable`.\n\nThe default error message can be overridden with the ``msg`` argument.\n\nSee also `Variable Should Exist` and `Keyword Should Exist`.",
        shortdoc: "Fails if the given variable exists within the current scope.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 1587
      },
      {
        name: "Wait Until Keyword Succeeds",
        args: [
          {
            name: "retry",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "retry"
          },
          {
            name: "retry_interval",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "retry_interval"
          },
          {
            name: "name",
            types: [],
            defaultValue: null,
            kind: "POSITIONAL_OR_NAMED",
            required: true,
            repr: "name"
          },
          {
            name: "args",
            types: [],
            defaultValue: null,
            kind: "VAR_POSITIONAL",
            required: false,
            repr: "*args"
          }
        ],
        doc: "Runs the specified keyword and retries if it fails.\n\n``name`` and ``args`` define the keyword that is executed similarly\nas with `Run Keyword`. How long to retry running the keyword is\ndefined using ``retry`` argument either as timeout or count.\n``retry_interval`` is the time to wait between execution attempts.\n\nIf ``retry`` is given as timeout, it must be in Robot Framework's\ntime format (e.g. ``1 minute``, ``2 min 3 s``, ``4.5``) that is\nexplained in an appendix of Robot Framework User Guide. If it is\ngiven as count, it must have ``times`` or ``x`` postfix (e.g.\n``5 times``, ``10 x``). ``retry_interval`` must always be given in\nRobot Framework's time format.\n\nBy default ``retry_interval`` is the time to wait _after_ a keyword has\nfailed. For example, if the first run takes 2 seconds and the retry\ninterval is 3 seconds, the second run starts 5 seconds after the first\nrun started. If ``retry_interval`` start with prefix ``strict:``, the\nexecution time of the previous keyword is subtracted from the retry time.\nWith the earlier example the second run would thus start 3 seconds after\nthe first run started. A warning is logged if keyword execution time is\nlonger than a strict interval.\n\nIf the keyword does not succeed regardless of retries, this keyword\nfails. If the executed keyword passes, its return value is returned.\n\nExamples:\n| Wait Until Keyword Succeeds | 2 min | 5 sec | My keyword | argument |\n| ${result} = | Wait Until Keyword Succeeds | 3x | 200ms | My keyword |\n| ${result} = | Wait Until Keyword Succeeds | 3x | strict: 200ms | My keyword |\n\nAll normal failures are caught by this keyword. Errors caused by\ninvalid syntax, test or keyword timeouts, or fatal exceptions (caused\ne.g. by `Fatal Error`) are not caught.\n\nRunning the same keyword multiple times inside this keyword can create\nlots of output and considerably increase the size of the generated\noutput files. It is possible to remove unnecessary keywords from\nthe outputs using ``--RemoveKeywords WUKS`` command line option.\n\nSupport for \"strict\" retry interval is new in Robot Framework 4.1.",
        shortdoc: "Runs the specified keyword and retries if it fails.",
        tags: [],
        source: "/Users/rener/.pyenv/versions/3.10.0/lib/python3.10/site-packages/robot/libraries/BuiltIn.py",
        lineno: 2277
      }
    ],
    dataTypes: {
      enums: [],
      typedDicts: []
    }
  }


customElements.define('monaco-editor', MonacoEditor);



//# sourceMappingURL=editor.js.map