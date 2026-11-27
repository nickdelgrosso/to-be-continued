<img src="assets/field-notebooks.svg" width="180" align="right" alt="">

# To Be Continued.

*A field guide to research code handover.*

You know which notebook to open first, why one approach was abandoned and what a trustworthy result looks like. This single-page field guide helps you leave those details for a colleague or your future self.

**[Open the field guide](https://nickdelgrosso.github.io/to-be-continued/)**

### Write a handover

1. Pick a chapter. The twenty starting prompts cover research context, everyday workflow, setup, adapting the code, verification and lessons learned. A single useful answer is enough.
2. Write in your own words. File paths, uncertainties, code blocks and observations are all welcome. Preview shows the exact Markdown you can copy or download.
3. Export **HANDOVER.md** and place it beside your code. To continue later or on another device, drop the file onto the guide or choose **Upload File**.

## Run locally

Install Pixi, then run these commands from this directory. The checked-in lockfile supplies Hugo, Node.js and the GitHub CLI on Windows x64, Linux x64, Intel macOS and Apple Silicon. [Pixi installation](https://pixi.prefix.dev/latest/installation/)

```sh
pixi run serve
pixi run test
pixi run build
```

The first command starts the live preview at [localhost:1313](http://localhost:1313/). Leave it running and use a second terminal for the tests or production build. The build produces a self-contained site in `public/`. Serve that directory over HTTP or HTTPS.

### Developer documentation

Run `pixi run docs` to read the developer guide at [localhost:1314](http://localhost:1314/), or open its [standalone HTML file](docs/index.html) directly. It covers the research purpose, architecture, editorial practices, draft storage, versioned file format and release checks. It has a separate build and stays out of the public website.

The tests use Node’s built-in test runner. They cover the Markdown format, file handling, storage failures, reordered questions, labels and local asset paths. They also build the real site at both a domain root and a nested project URL. To reproduce the CI environment exactly, run `pixi install --locked` and `pixi run --locked test`.

## Work on the questions

Edit **`data/guide.yaml`**. It contains the introduction, optional project fields, chapter definitions and question bank. All chapters appear in the Write tab on one form. The contents list and Markdown preview follow the same order.

- **Move a question.** Cut its ID from one chapter’s `questions` list and paste it into another. Its saved and exported answers follow its ID.
- **Change the order.** Move IDs within a list or move whole entries in `chapters`. Update the displayed Roman numerals when you reorder chapters.
- **Revise the wording.** Edit the question’s `text`, `help`, `example` or `references` in the question bank. Keep its ID when the underlying question is the same.
- **Add a prompt.** Give it an unused, lowercase, hyphen-separated ID in the bank, add its `text`, then list its ID in a chapter. Each displayed question belongs to one chapter.
- **Set a prompt aside.** Remove its ID from the chapter list. Browser drafts retain the value for that ID during ordinary edits. Listing it again restores it. Exports include the questions currently on the form.
- **Change a group.** Edit its title, descriptive `subtitle`, `intro`, `number`, `accent` and optional `icon`. The subtitle becomes the section heading in the handover.

For example, a discussion about the first successful run might move `first-run` into the everyday workflow chapter. Move that one list entry and reload the guide. You can also change its question text during the discussion without moving the answer. The six starting chapters are prompts for iteration with researchers.

The available accents are `mustard`, `orange`, `olive`, `tobacco`, `brick` and `brown`. The chapter symbols are `book`, `cup`, `key`, `compass`, `shield` and `notebook`. A chapter can omit its symbol. Operational labels, dialog text and feedback are in `data/interface.yaml`. The layouts render the data. Browser behavior lives in `assets/js/`, and the type, colors and spacing live in `assets/guide.css`.

## Save and reopen a handover

Writing updates a local draft in the current browser. The storage key includes the deployment path, so two installations on the same origin have independent drafts. Clearing browser data, switching browser profiles or changing the site’s address can make a draft unavailable. Export a copy worth keeping. If browser storage fails, editing, preview and download still work for the open page.

Choose **Upload File** to reopen an exported `HANDOVER.md`, or drop the file onto the page. The guide reads it on the device. Opening a valid file over an existing draft asks for confirmation. **Clear responses** also asks before removing the local draft. Researchers own their responses and exported documents.

### How the Markdown format works

The file starts with a small YAML header. `handover_version` identifies the form’s interchange format. `question_order` records the stable question IDs in the order they appear in this file. There is one copy of each response, in the readable Markdown body. The file contains no timestamp added by the app.

The body uses descriptive chapter headings, question headings and ordinary Markdown thematic breaks between records. The exporter picks a break length that does not occur as a line in any response. This lets the reader preserve code blocks, headings and horizontal rules written by the researcher. A final newline terminates the file. For a file you intend to reimport, you can edit the answer prose directly. Keep the header, record order and record boundaries together.

Keep `formatVersion` in `data/guide.yaml` stable when regrouping, renumbering or rewording questions. Change it for an incompatible interchange change, such as reusing an ID for a different meaning or changing an exported metadata label. The project’s optional date/version field describes the research project separately.

An unsupported or missing format version produces a visible error. A file referring to a removed question also produces an error so the researcher can still recover its text from the original Markdown. Import validates the whole file before replacing the draft. The raw preview treats the researcher’s Markdown and HTML examples as text.

## Deploy with GitLab Pages

Put the project, including `pixi.lock` and `.gitlab-ci.yml`, in a GitLab repository with Pages enabled and a Linux container runner. The runner needs access to the Pixi image and conda-forge packages on its first run. Use GitLab 17.10 or later for the automatic Pages artifact path. [GitLab Pages publishing](https://docs.gitlab.com/ci/yaml/#pagespublish)

The pipeline runs the tests and publishes a successful default-branch build from `public/`. The Pixi image runs the same locked tasks used locally. The build takes its base URL from `CI_PAGES_URL`. Hugo generates each asset link for that path, including the shared SVG symbols. Find the deployed address under **Deploy → Pages** after the pipeline succeeds. [Hugo on GitLab Pages](https://gohugo.io/host-and-deploy/deploy-to-gitlab-pages/) · [Pixi container images](https://pixi.prefix.dev/latest/deployment/container/)

## Deploy with GitHub Pages

Put the project in a GitHub repository and select **Settings → Pages → Build and deployment → Source → GitHub Actions**. Push the files to the default branch, or run **Publish guide to GitHub Pages** manually from that branch. The workflow reads the repository’s configured Pages URL, runs the locked Pixi tests, builds the site with that URL and deploys the contents of `public/`. The deploy job reports the public address. [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) · [Hugo on GitHub Pages](https://gohugo.io/host-and-deploy/deploy-to-github-pages/)

## Build for another host

Pass its full public URL, including any subpath.

```sh
pixi run build --baseURL https://example.org/lab/field-guide/
```

The published files use the local stylesheet, illustrations and vanilla JavaScript. Questionnaire answers, uploaded files and clipboard operations stay client-side. The production page also sets a content security policy that disables outgoing connections and form submissions.

The site source and original illustrations are available under the [MIT license](LICENSE). The repository records Codex’s contributions in [aidecl.yaml](aidecl.yaml) using the [AI Declaration Format](https://ai-declaration.org/).
