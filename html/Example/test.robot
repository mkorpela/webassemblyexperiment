*** Settings ***
Library           CustomLibrary.py
Resource          keywords.resource
Force Tags        INCL


*** Test Cases ***
Test
    Open Demo Page
    Set Username    demo
    Set Password    mode
    Click Login

Failed Test
    Open Demo Page
    Set Username    demo
    Set Password    Wrong
    Click Login
    Fail    faked Fail...