"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
                monaco.languages.register({ id: 'robot' });
                monaco.languages.setMonarchTokensProvider('robot', {
                    defaultToken: 'string',
                    tokenPostfix: '.robotframework',
                    ignoreCase: true,
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
                                /^(\*+ ?(?:settings?|keywords?|variables?|comments?|documentation|tasks?|test cases?)[ *]*)(?= {2,}| ?\t| ?$)/,
                                'keyword', '@popall'
                            ]
                        ],
                        setting: [
                            [/^(?: {2,}| ?\t ?)+\[.*?\]/, 'tag', '@popall']
                        ],
                        tc_kw_definition: [
                            [/^(?! {2,}| ?\t ?).*?(?: {2,}| ?\t ?|$)/, 'type', '@popall']
                        ],
                        constant: [
                            [
                                /^(?!(?: {2,}| ?\t ?)+(?:(?=[$\\[@&%]|\\.)))(?: {2,}| ?\t ?)+(.*?)(?= {2,}| ?\t ?| ?$)/,
                                'constant'
                            ]
                        ],
                        vars: [
                            [/[$&%@](?=\{)/, {
                                    token: 'variable.meta.vars1',
                                    next: '@varBody'
                                }]
                        ],
                        varBody: [
                            [/[$&%@](?=\{)/, 'variable.meta.varBody1', '@varBody'],
                            [/\{/, 'variable.meta.varBody2', '@varBody'],
                            [/\}(?=\[)/, 'variable.meta.varBody3', '@dictKey'],
                            [/\}|\]/, 'variable.meta.varBody4', '@pop'],
                            [/\n|  /, 'delimiter.meta.varBody5', '@popall'],
                            [/.*?(?=  |[$&%@]\{|\})/, 'constant.meta.varBody5', '@pop'],
                        ],
                        dictKey: [
                            [/\[/, 'variable.meta.dictKey1'],
                            [/\]/, 'variable.meta.dictKey2', '@popall'],
                            [/[$&%@](?=\{)/, 'variable.meta.dictKey3', '@varBody'],
                            [/\n|  /, 'delimiter.meta.dictKey4', '@popall'],
                            [/.*?(?=  |[$&%@]\{|\])/, 'constant.meta.dictKey4', '@pop']
                        ],
                        keyword: [
                            [/(?: {2,}| ?\t ?)+(IF|END|FOR|IN|IN RANGE|IN ENUMERATE|IN ZIP|ELSE|TRY|EXCEPT|FINALLY|RETURN)(?= {2,}| ?\t ?|$)/, 'keyword', '@popall'],
                            [/^(?: {2,}| ?\t ?)+[^@$%&]*?(?= {2,}| ?\t ?| ?$)/, 'meta.keyword1', '@popall'],
                            [/^(?:(?:(?: {2,}| ?\t ?)(?:[$&@]\{(?:.*?)\}(?: ?=)))*(?: {2,}| ?\t ?))(.+?)(?= {2,}| ?\t ?|$)/, 'meta.keyword2', '@popall'],
                        ],
                        // Recognize hex, negatives, decimals, imaginaries, longs, and scientific notation
                        numbers: [
                            [/-?0x([abcdef]|[ABCDEF]|\d)+[lL]?/, 'number.hex'],
                            [/-?(\d*\.)?\d+([eE][+\-]?\d+)?[jJ]?[lL]?/, 'number']
                        ]
                    }
                });
                console.log(monaco.languages.getLanguages().map(lang => lang.id));
                // Editor
                this.editor = monaco.editor.create(editor, {
                    theme: (window.getComputedStyle(document.querySelector("body")).colorScheme === 'dark') ? "vs-dark" : "vs-light",
                    model: monaco.editor.createModel(this.getAttribute("value"), this.getAttribute("language")),
                    wordWrap: 'on',
                    automaticLayout: true,
                    minimap: {
                        enabled: false
                    },
                    scrollbar: {
                        vertical: 'auto'
                    }
                });
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