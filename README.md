# dsh-speckit-panel

A Spec Kit status panel for **DeepSeek Harness**. It works in any workspace: it discovers `specs/<feature>/` and `.speckit/features/<feature>/`, shows the spec-driven pipeline, and sends `/speckit-*` actions to the session composer.

## What it shows

- current workspace and git branch;
- feature selector with title and layout (`specs` or `.speckit`);
- pipeline: Constitution, Specify, Clarify, Plan, Tasks, Analyze, Checklist, Implement;
- per-stage ready marker and file name;
- task progress from `tasks.md` checkboxes;
- document viewer for `spec.md`, `plan.md`, `tasks.md`, `checklist.md`, `research.md`, `data-model.md`, `quickstart.md` and `analyze*.md`.

## Actions

Buttons build a `/speckit-… <feature>` prompt, put it into the composer and submit it. They never edit files or run git themselves. `Implement` is the same explicit action: the human pressed the button.

## Install

```sh
dsh plugin --profile web add "link:/absolute/path/to/dsh-speckit-panel"
```

Then restart DSH. The tab appears in the right sidebar guide as **Spec Kit**.

The `/speckit-*` commands come from [`dsh-specify`](https://github.com/904915452/dsh-specify) and require the [`specify` CLI](https://github.com/github/spec-kit):

```sh
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
specify check
```

## Layouts supported

```
specs/<feature>/spec.md, plan.md, tasks.md, checklist.md, analyze*.md
.speckit/features/<feature>/...
.speckit/constitution.md
.specify/memory/constitution.md
```

## Safety

The Host reads bounded Markdown files under the session workspace only, rejects symlinks and paths outside it, and never writes. No git command is executed; the branch is read from `.git/HEAD`.
