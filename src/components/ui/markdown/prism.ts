import SyntaxHighlighter from "react-syntax-highlighter/dist/esm/prism-light";
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus";

import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import c from "react-syntax-highlighter/dist/esm/languages/prism/c";
import clojure from "react-syntax-highlighter/dist/esm/languages/prism/clojure";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import crystal from "react-syntax-highlighter/dist/esm/languages/prism/crystal";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import dart from "react-syntax-highlighter/dist/esm/languages/prism/dart";
import diff from "react-syntax-highlighter/dist/esm/languages/prism/diff";
import docker from "react-syntax-highlighter/dist/esm/languages/prism/docker";
import elixir from "react-syntax-highlighter/dist/esm/languages/prism/elixir";
import elm from "react-syntax-highlighter/dist/esm/languages/prism/elm";
import erlang from "react-syntax-highlighter/dist/esm/languages/prism/erlang";
import fsharp from "react-syntax-highlighter/dist/esm/languages/prism/fsharp";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import graphql from "react-syntax-highlighter/dist/esm/languages/prism/graphql";
import haskell from "react-syntax-highlighter/dist/esm/languages/prism/haskell";
import http from "react-syntax-highlighter/dist/esm/languages/prism/http";
import ini from "react-syntax-highlighter/dist/esm/languages/prism/ini";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import kotlin from "react-syntax-highlighter/dist/esm/languages/prism/kotlin";
import lua from "react-syntax-highlighter/dist/esm/languages/prism/lua";
import makefile from "react-syntax-highlighter/dist/esm/languages/prism/makefile";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import nginx from "react-syntax-highlighter/dist/esm/languages/prism/nginx";
import nim from "react-syntax-highlighter/dist/esm/languages/prism/nim";
import nix from "react-syntax-highlighter/dist/esm/languages/prism/nix";
import ocaml from "react-syntax-highlighter/dist/esm/languages/prism/ocaml";
import perl from "react-syntax-highlighter/dist/esm/languages/prism/perl";
import powershell from "react-syntax-highlighter/dist/esm/languages/prism/powershell";
import properties from "react-syntax-highlighter/dist/esm/languages/prism/properties";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import r from "react-syntax-highlighter/dist/esm/languages/prism/r";
import ruby from "react-syntax-highlighter/dist/esm/languages/prism/ruby";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import scala from "react-syntax-highlighter/dist/esm/languages/prism/scala";
import scss from "react-syntax-highlighter/dist/esm/languages/prism/scss";
import solidity from "react-syntax-highlighter/dist/esm/languages/prism/solidity";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import swift from "react-syntax-highlighter/dist/esm/languages/prism/swift";
import toml from "react-syntax-highlighter/dist/esm/languages/prism/toml";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import vim from "react-syntax-highlighter/dist/esm/languages/prism/vim";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import zig from "react-syntax-highlighter/dist/esm/languages/prism/zig";

/** The shape a `react-syntax-highlighter` Prism grammar module actually has. */
interface PrismGrammar {
    name: string;
    /** Canonical name; survives minification, unlike `name`. */
    displayName?: string;
    aliases?: string[];
}

// Server-side only: these grammars are ~half a megabyte of JavaScript. They are
// reachable solely through `MarkdownRenderer`, which renders on the server and
// ships finished markup, so importing this from a "use client" file would undo
// that. Uses prism-light to avoid bundling ~300 unused grammars via the barrel
// export. To add a language: import it above and register it in `grammars`.
const grammars = [
    bash, c, clojure, cpp, crystal, csharp, css, dart, diff, docker, elixir,
    elm, erlang, fsharp, go, graphql, haskell, http, ini, java, javascript,
    json, jsx, kotlin, lua, makefile, markdown, markup, nginx, nim, nix,
    ocaml, perl, powershell, properties, python, r, ruby, rust, scala, scss,
    solidity, sql, swift, toml, tsx, typescript, vim, yaml, zig,
];

// Aliases the grammars don't carry themselves.
const extraAliases: Record<string, string> = {
    golang: "go",
    rs: "rust",
    cxx: "cpp",
    "c++": "cpp",
    cc: "cpp",
    hpp: "cpp",
    "c#": "csharp",
    ps1: "powershell",
    pwsh: "powershell",
    env: "properties",
    dotenv: "properties",
    cfg: "ini",
    conf: "ini",
};

const registered = new Set<string>();

/**
 * The name Prism will actually match a fence against.
 *
 * Must be `displayName`, not `name`. `name` is the grammar *function's* name, so
 * a production build's minifier rewrites it to whatever binding it picked
 * (`rust` -> `qi`) and every lookup misses. `displayName` is a string literal
 * property, which minifiers leave alone. `name` is only a fallback for a
 * grammar that somehow lacks `displayName`.
 */
const nameOf = (grammar: PrismGrammar): string => grammar.displayName ?? grammar.name;

// `registerLanguage` keys off the grammar's own `displayName`/`aliases`,
// ignoring its first argument, so mirror both into `registered`.
for (const grammar of grammars) {
    const name = nameOf(grammar);
    SyntaxHighlighter.registerLanguage(name, grammar);
    registered.add(name);
    for (const alias of grammar.aliases ?? []) {
        registered.add(alias);
    }
}

for (const [alias, target] of Object.entries(extraAliases)) {
    SyntaxHighlighter.alias(target, alias);
}

for (const name of Object.keys(extraAliases)) {
    registered.add(name);
}

// Fences we render unstyled, so no grammar is ever requested for them.
const PLAIN = new Set(["plain", "plaintext", "text", "txt", "none", ""]);

/** Resolve a fence name to a grammar, or `null` to render it unstyled. */
export function normalizeLanguage(language: string): string | null {
    const key = language.trim().toLowerCase();
    if (PLAIN.has(key)) {
        return null;
    }
    return registered.has(key) ? key : null;
}

/** The highlighter, with the curated grammars registered. */
export const Prism = SyntaxHighlighter;

/** Prism theme, re-exported so the renderer has one syntax import. */
export { vscDarkPlus };
