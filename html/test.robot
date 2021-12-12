*** Settings ***
Library    library.py
Resource   keywords.resource

*** Variables ***
@{list_key_value}=    hallo=world    test=best    Peter=Seller
&{dict}=              hallo=world    test=best    Peter=Seller
&{one}=    key=value
&{two}=    key2=value2
${strone}=    key=value
${strtwo}=    key2=value2

*** Test Cases ***
Test123
    ${start}   Set Variable    ${{time.time()}}
    FOR   ${i}    IN RANGE   10   0    -1
        Log    ${i}
    END
    ${end}   Set Variable    ${{time.time()}}
    Log To Console    \nDelta is: ${{$end - $start}}

Failing Test Case
    [Setup]    log   This is the Test Setup
    ${ret}=    My Keyword    World
    Log To Console    \n${ret}
    KYWRD
    [Teardown]    log   This is the Teardown...

Test mit For
    FOR    ${item}    IN    @{list_key_value}    Franz=Meier
        Log    ${item}
    END
    FOR    ${item}    IN    &{dict}    Franz=Meier
        Log    ${item}
    END
    FOR    ${item}    IN    hallo=world    test=best    Peter=Seller    Franz=Meier   #Strange
        Log    ${item}
    END
    FOR    ${item}    IN    hallo    test=best    Peter=Seller    Franz=Meier
        Log    ${item}
    END
    FOR    ${item}    IN    hallo=world    test    Peter    Franz
        Log    ${item}
    END
    FOR    ${item}    IN    ${one}    ${two}
        Log    ${item}
    END
    FOR    ${first}   ${second}    IN    hallo  world    test  best    Peter  Seller    Franz  Meier   #Strange
        Log    ${first}
        Log    ${second}
    END
    ${dicdic}    Create Dictionary    key
    ...    value   key2   value2