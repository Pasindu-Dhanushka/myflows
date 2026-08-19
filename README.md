# BizFlows
Application engine for automate bussiness workflows.
---
## Main Application Context ( BizFlows )

this main application context should include main workflow running engine. 


## Flow Drawing tool

This tool also be Web application.
this application able to draw application flow.
then download and add to BizFlows Application then run application


## Priority

First Complete Main application with manual Yaml / JSON Format.
Then we can develop some designing tool.

---
### Iteration 1

1. Initialize vite + React Project and .NET backend with .NET Aspire orchestrator. (if this application goes .NET React techstack) ( if you use another techstack then that also support aspire, using aspire you can deploy application resources both locally and cloud) ( I suggest .NET React because I remember that you gonna use it)

2. Initialize Test project with this projects ( both unit tests and integration tests)

3. May be Redis & Kafka will require but we can add those later.


4. Create Sample Json File / Yaml file for how actual configuration should be

```json
{
    "UI":{
        "EntryPoint":"guid-of-welcome"
        "Components":[
            {
                "ID":"some-guid-for-this",
                "Name":"Welcome",
                "Inputs"[],
                "Outputs"["name-field-guid"]
                "SubComponents":[
                    {
                        "ID":"some-guid-this",
                        "Name":"name-field",
                        "Type":"TextBox",
                        "Input":["John doe"]
                    }
                ]
            },
            {
                "ID":"some-guid-for-this",
                "Name":"Say-hello",
                "Inputs"["name"],
                "Outputs"[]
                "SubComponents":[
                    {
                        "ID":"some-guid-this",
                        "Name":"name-field",
                        "Type":"TextLabel",
                        "Input":["Input(name)"]
                    }
                ]
            }
        ]
    },
    "Flows":
}
```
this is incomplete json example.
when creating first manual json you have to care about

1. seperately we should able to define component input and output names
2. under flows there should be way to configure previous one's output to be next one's input transfromation
3. some ui fields like Textbox,Dropdown, like components have default inputs and outputs so you have to manage SET and GET those contents, and prop drilling also have to do in here. ( what you get to input you have to forward it to components)

First Manual Config Should be you type your name -> then next page would say hello to you.

---
### Instructions for BA  & QA for iteration 1

check this align with bussiness requirement and add more requirements to apply.
find edge cases this will not usefull and find a way to align with this application.

---

## Development Guide

1. Don't push direct commits to main branch.
2. do your work in your branch and then create PR by describing what you done.
