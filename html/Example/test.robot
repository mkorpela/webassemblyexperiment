*** Settings ***
Library           CustomLibrary.py
Resource          keywords.resource
Force Tags        INCL

*** Variables ***
@{list_key_value}=    hallo=world    test=best    Peter=Seller
&{dict}=          hallo=world    test=best    Peter=Seller
&{one}=           key=value
&{two}=           key2=value2
${strone}=        key=value
${strtwo}=        key2=value2

*** Test Cases ***
Test123
    ${start}    Set Variable    ${{time.time()}}
    FOR    ${i}    IN RANGE    10    0    -1
        Log    ${i}
    END
    ${end}    Set Variable    ${{time.time()}}
    Log To Console    \nDelta is: ${{$end - $start}}

Failing Test Case
    [Setup]    log    This is the Test Setup
    ${ret}=    My Keyword    World
    Log To Console    \n${ret}
    KYWRD
    [Teardown]    log    This is the Teardown...
