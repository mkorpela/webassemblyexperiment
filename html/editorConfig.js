var Libraries = {};

async function loadLibrary(libFile) {
    await fetch(libFile)
        .then(response => response.json())
        .then(result => {
            Libraries[result.name] = result;
            console.log(`LibDoc of "${result.name}" loaded...`)
        });
}
await loadLibrary('libraries/BuiltIn.json');
await loadLibrary('libraries/Collections.json');
await loadLibrary('libraries/DateTime.json');
await loadLibrary('libraries/String.json');
await loadLibrary('libraries/XML.json');


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

    const SettingsMatcher = /^(?:\* ?)+(?:Settings? ?)(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i
    const TestCasesMatcher = /^(?:\* ?)+(?:Test Cases?|Tasks?) ?(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i
    const KeywordsMatcher = /^(?:\* ?)+(?:Keywords? ?)(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i
    const CommentsMatcher = /^(?:\* ?)+(?:Comments? ?)(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i
    const VariablesMatcher = /^(?:\* ?)+(?:Variables? ?)(?:\* ?)*(?:(?: {2,}| ?\t| ?$).*)?$/i

    const KeywordPosMatcher = /^(?: {2,}| ?\t ?)+([$&%@]\{.*?\} ?=?(?: {2,}| ?\t ?))?.*?(?= {2,}| ?\t ?|$)/


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


    function createKeywordProposals(range, libraries) {
        function getKeywordProp(keyword, library) {
            var args = "";
            var argDoc = "";
            for (let [i, argument] of keyword.args.entries()) {
                if (argument.required) {
                    args += `    \${${i + 1}:${argument.name}}`
                }
                argDoc += ` - \`${argument.name}  ${argument.defaultValue ? "= " + argument.defaultValue : ""}\`\n`
            }
            return {
                label: keyword.name,
                //kind: monaco.languages.CompletionItemKind.Function,
                kind: monaco.languages.CompletionItemKind.Function,
                documentation: {value:`*(${library}):*\n\n**Arguments:**\n` + argDoc + "\n**Documentation:**\n\n" + keyword.doc},
                insertText: `${keyword.name}${args}`,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range: range
            }
        }

        var proposals = [];
        for (let lib of libraries) {
            if (lib in Libraries && lib !== 'BuiltIn') {
                for (let keyword of Libraries[lib].keywords) {
                    proposals.push(getKeywordProp(keyword, lib));
                }
            }
        }
        for (let keyword of Libraries.BuiltIn.keywords) {
            proposals.push(getKeywordProp(keyword, 'BuiltIn'));
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
                    case line.match(SettingsMatcher)?.input:
                        currentTable = Settings;
                        break;
                    case line.match(TestCasesMatcher)?.input:
                        currentTable = TestCases;
                        break;
                    case line.match(KeywordsMatcher)?.input:
                        currentTable = Keywords;
                        break;
                    case line.match(CommentsMatcher)?.input:
                        currentTable = Comments;
                        break;
                    case line.match(VariablesMatcher)?.input:
                        currentTable = Variables;
                        break;
                }
            }
        }
        return currentTable
    }

    function getExistingTables(textLines) {
        var existingTables = [];
        for (let line of textLines) {
            switch (line) {
                case line.match(SettingsMatcher)?.input:
                    existingTables.push(Settings);
                    break;
                case line.match(TestCasesMatcher)?.input:
                    existingTables.push(TestCases);
                    break;
                case line.match(KeywordsMatcher)?.input:
                    existingTables.push(Keywords);
                    break;
                case line.match(CommentsMatcher)?.input:
                    existingTables.push(Comments);
                    break;
                case line.match(VariablesMatcher)?.input:
                    existingTables.push(Variables);
                    break;
            }
        }
        return existingTables
    }

    function getTables(textLines) {
        var tables = {};
        var currentTable = '';
        for (let line of textLines) {
            var tableHeader = '';
            switch (line) {
                case line.match(SettingsMatcher)?.input:
                    tableHeader = Settings;
                    break;
                case line.match(TestCasesMatcher)?.input:
                    tableHeader = TestCases;
                    break;
                case line.match(KeywordsMatcher)?.input:
                    tableHeader = Keywords;
                    break;
                case line.match(CommentsMatcher)?.input:
                    tableHeader = Comments;
                    break;
                case line.match(VariablesMatcher)?.input:
                    tableHeader = Variables;
                    break;
            }
            if (tableHeader) {
                tables[tableHeader] = [];
                currentTable = tableHeader
            }
            else if (currentTable && String(line)) {
                tables[currentTable].push(line)
            }
        }
        return tables
    }

    function isAtKeywordPos(currentLine) {
        var isKeywordCall = currentLine.match(KeywordPosMatcher)
        if (isKeywordCall) {
            return (currentLine === isKeywordCall[0]);
        }
    }

    function getImportedLibraries(settingsTable) {
        var imports = [];
        for (let line of settingsTable) {
            var libMatch = line.match(/^Library(?: {2,}| ?\t ?)+(\w+?)(?:\.py)?(?: {2,}| ?\t ?|$)+/i);
            if (libMatch) {
                imports.push(libMatch[1]);
            }
        }
        return imports;
    }

    monaco.languages.registerCompletionItemProvider('robot', {
        provideCompletionItems: function (model, position) {

            const textUntilPosition = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            });
            const textLinesUntilPosition = textUntilPosition.split('\n');
            const currentLine = textLinesUntilPosition.at(-1);
            const textLines = model.getValue().split('\n')

            const currentTable = getCurrentTable(textLinesUntilPosition);
            const tableContent = getTables(textLines);
            const importedLibraries = (Settings in tableContent) ? getImportedLibraries(tableContent[Settings]) : [];
            const existingTables = getExistingTables(textLines);

            const keyword = isAtKeywordPos(currentLine);

            const linestart = currentLine.match(
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
                var word = model.getWordUntilPosition(position);  //TODO: here search for Keyword with spacces not words...
                var range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };
                return {
                    suggestions: createKeywordProposals(range, importedLibraries)
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

