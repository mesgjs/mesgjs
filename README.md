# Introduction

Mesgjs is officially pronounced like "messages" (but "message J S" works too).

Mesgjs is a relatively simple language in comparison to most other programming languages. It is based on a small number of concepts and minimal syntax. It was envisioned and created by Brian Katzung in 2024 and 2025\.

It is intended to provide a syntax-reducing, security, and control layer between users and pure JavaScript on (potentially multi-tenant) servers and in browsers. Its syntax is partly inspired by aspects of JavaScript and HTML.

It essentially consists of just objects (including object *literals*), sending messages, variables (which are really just sent-for-you messages), and comments. Everything else is built on that foundation.

Objects can store persistent state, and have an immutable type associated with them that determines their behavior in response to messages sent to them via a system of interface definitions and message handlers. Interfaces can be built upon other interfaces by using a multiple-inheritance feature called interface chaining.

Handlers have access to the messaged object's persistent state, scratch space that can be used for transient values that won't be needed after processing the current message dispatch, and any message parameters sent along with the message operation.

Variables in Mesgjs are simply positional or named values within Mesgjs lists, which provide named and numbered ordered storage, and are read or written by messaging the list that contains them. 

Notably, Mesgjs does not have statements in the traditional programming sense (e.g. for flow control, variable or function declarations, etc). It also lacks things like infix operators (such as 2 \+ 3 \* 5), and the issues that come with them (such as, which operations have what precedence, and do they evaluate left-to-right or right-to-left?).

The language transpiles to JavaScript and can therefore easily be run both on servers (e.g. using Node or Deno) and in browsers.
