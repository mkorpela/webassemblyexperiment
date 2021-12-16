*** Settings ***
Library           CustomLibrary.py
Resource          keywords.resource
Force Tags        INCL


*** Test Cases ***
Test Keyword
    Hello Keyword

Log Python Keywords
    ${ret}=    My Keyword    WORLD
    Log To Console    ${ret}
