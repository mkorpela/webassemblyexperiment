"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

require(['vs/editor/editor.main'], () => {
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
        return [
            {
                label: 'Log To Console',
                kind: monaco.languages.CompletionItemKind.Function,
                documentation: 'This does what it does',
                insertText: 'Log To Console',
                range: range
            },
            {
                label: 'Log',
                kind: monaco.languages.CompletionItemKind.Function,
                documentation: 'Fast, unopinionated, minimalist web framework',
                insertText: 'Log',
                range: range
            },
            {
                label: 'Should Be Equal',
                kind: monaco.languages.CompletionItemKind.Function,
                documentation: 'Recursively mkdir, like <code>mkdir -p</code>',
                insertText: 'Should Be Equal',
                range: range
            },
            {
                label: 'IF',
                kind: monaco.languages.CompletionItemKind.Function,
                documentation: 'Describe your library here',
                insertText: 'IF    ${1:Condition}\n    ${2:body}\nEND',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range: range
            }
        ];
    }

    function createTablesProposals(value, range) {
        console.log(range)
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
        const tables = [
            '*** Settings ***',
            '*** Test Cases ***',
            '*** Keywords ***',
            '*** Comments ***',
            '*** Tasks ***'
        ];

        var proposals = [];
        for (let table of tables) {
            if (!value.includes(table)) {
                proposals.push(getTableProp(table));
            }
        }
        return proposals;
    }

    monaco.languages.registerCompletionItemProvider('robot', {
        provideCompletionItems: function (model, position) {

            console.log(model);

            var textUntilPosition = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            });
            console.log(textUntilPosition);
            var keyword = textUntilPosition.match(
                /^(?: {2,}| ?\t ?)+([$&%@]\{.*?\} ?=?(?: {2,}| ?\t ?))?.*/
            );
            var linestart = textUntilPosition.match(
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
                    suggestions: createTablesProposals(model.getValue(), range)
                };
            }

            if (keyword) {
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
                this.editor.onDidChangeCursorPosition( () => {
                    selectedText.set(this.editor.getSelection().isEmpty());
                })
                this.editor.addCommand(
                    monaco.KeyCode.Tab, () => {
                        this.editor.trigger('keyboard', 'type', {text: "    "});
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

customElements.define('monaco-editor', MonacoEditor);
;
//# sourceMappingURL=editor.js.map