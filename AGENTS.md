# Working on To Be Continued.

Start with the [developer guide](docs/index.html) for the project’s purpose, architecture, editing practices, file format and release checks. It is self-contained HTML. `pixi run docs` serves it locally.

Workshop changes to chapter groups and question wording belong in [the questionnaire](data/guide.yaml). Keep question IDs stable across moves. Use `pixi run test` and `pixi run build` to verify changes to the public guide.

Every site build publishes `llms.txt` and the companion authoring guide. When the project’s purpose, interview practice or file format changes, review the [agent guidance](assets/agents/) as part of the same edit. The build takes prompts and version numbers from the questionnaire and publishes the web form’s Markdown writer. Keep this shared data in its source files.
